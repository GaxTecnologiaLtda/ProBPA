import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * API para consumo de dados de produção de sistemas ambulatoriais externos (Fora do PEC).
 * Endpoint: POST /api/v1/external-integration/production
 */
export const ingestExternalProduction = functions
    .runWith({ 
        timeoutSeconds: 300, 
        memory: '1GB' 
    })
    .region("southamerica-east1")
    .https.onRequest(async (req, res) => {
        // 1. Method Check
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        // 2. Auth Check
        const token = req.query.token as string;
        const secret = req.headers['x-api-key'] as string;

        if (!token || !secret) {
            res.status(401).send('Unauthorized: Missing Token (URL) or Secret (Header)');
            return;
        }

        try {
            // 3. Identificar Município pelo Token e validar pela Senha
            let munDoc: admin.firestore.QueryDocumentSnapshot | null = null;
            let entityType: string = '';
            let entityId: string = '';
            
            const roots = ['municipalities/PUBLIC', 'municipalities/PRIVATE'];
            
            for (const rootPath of roots) {
                if (munDoc) break;
                
                const rootRef = db.doc(rootPath);
                const entityCollections = await rootRef.listCollections();
                
                for (const entityCol of entityCollections) {
                    const q = await entityCol.where('externalIntegrationToken', '==', token).limit(1).get();
                    if (!q.empty) {
                        const candidate = q.docs[0];
                        const storedSecret = candidate.data()?.externalIntegrationSecret;
                        
                        if (storedSecret === secret) {
                            munDoc = candidate;
                            entityType = rootPath.split('/')[1]; // PUBLIC or PRIVATE
                            entityId = entityCol.id;
                        } else {
                            console.warn(`[External Integration] Senha inválida para o token: ${token}`);
                            res.status(403).send('Forbidden: Invalid Authentication Secret');
                            return;
                        }
                        break;
                    }
                }
            }

            if (!munDoc) {
                console.warn(`[External Integration] Token não encontrado: ${token}`);
                res.status(403).send('Forbidden: Invalid Integration Token');
                return;
            }

            const munData = munDoc.data();
            const municipalityId = munDoc.id;

            // 4. Mapeamento de Unidades (Cache Local para a requisição)
            const unitsSnap = await munDoc.ref.collection('units').get();
            const unitsMap: Record<string, string> = {}; // cnes -> unitId
            unitsSnap.forEach(d => {
                const data = d.data();
                if (data.cnes) {
                    unitsMap[data.cnes] = d.id;
                }
            });

            // 5. Validação do Payload
            const records = req.body.records;
            if (!records || !Array.isArray(records)) {
                res.status(400).send('Bad Request: "records" array is required');
                return;
            }

            // Aumentando o limite para suportar faturamentos de larga escala
            if (records.length > 10000) {
                res.status(400).send('Bad Request: Maximum of 10,000 records per request allowed');
                return;
            }

            // 6. Gravação Hierárquica com suporte a múltiplos Batches
            let totalProcessed = 0;
            let currentBatch = db.batch();
            let operationsInCurrentBatch = 0;

            for (const record of records) {
                const unitId = record.unitCnes ? unitsMap[record.unitCnes] : 'UNKNOWN_UNIT';
                
                let competence = record.competence;
                if (!competence && record.attendanceDate) {
                    const parts = record.attendanceDate.split('-');
                    if (parts.length >= 2) competence = `${parts[0]}-${parts[1]}`;
                }
                if (!competence) competence = 'UNKNOWN_COMPETENCE';

                let formattedDate = 'UNKNOWN_DATE';
                if (record.attendanceDate) {
                    const parts = record.attendanceDate.split('-');
                    if (parts.length === 3) formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }

                const cleanDate = formattedDate.replace(/-/g, '');
                const cleanComp = competence.replace(/-/g, '');
                const patientId = (record.patient?.cns || record.patient?.cpf || 'UNKNOWN_PATIENT').replace(/\D/g, '');

                const procedures = record.procedures || [];
                for (const proc of procedures) {
                    const sigtap = proc.sigtapCode || '0000000000';
                    const docId = `${record.municipalityIbge}_${record.unitCnes}_${cleanComp}_${cleanDate}_${patientId}_${sigtap}`;

                    const docRef = munDoc.ref
                        .collection('importApiProductions')
                        .doc(unitId)
                        .collection('competences')
                        .doc(competence)
                        .collection('days')
                        .doc(formattedDate)
                        .collection('records')
                        .doc(docId);

                    const dataToSave = {
                        ...record,
                        procedures: [proc],
                        municipalityId: municipalityId,
                        entityId: entityId,
                        entityType: entityType,
                        unitId: unitId,
                        _competence: competence,
                        _day: formattedDate,
                        ingestedAt: admin.firestore.FieldValue.serverTimestamp(),
                        status: 'VALIDATED',
                        source: 'external_api'
                    };

                    currentBatch.set(docRef, dataToSave, { merge: true });
                    totalProcessed++;
                    operationsInCurrentBatch++;

                    // Se atingir 500 operações, envia o batch e cria um novo
                    if (operationsInCurrentBatch >= 500) {
                        await currentBatch.commit();
                        currentBatch = db.batch();
                        operationsInCurrentBatch = 0;
                    }
                }
            }

            // Envia o último batch se houver operações pendentes
            if (operationsInCurrentBatch > 0) {
                await currentBatch.commit();
            }

            // 7. Atualizar Status de Sincronização no Município
            await munDoc.ref.update({
                lastExternalIngestion: admin.firestore.FieldValue.serverTimestamp()
            });

            // Extrair metadados para o log (Competências e Datas)
            const uniqueCompetences = [...new Set(records.map((r: any) => r.competence))];
            const allDates = records.map((r: any) => r.attendanceDate).sort();
            const dateRange = allDates.length > 0 
                ? `${allDates[0].split('-').reverse().join('/')} - ${allDates[allDates.length-1].split('-').reverse().join('/')}`
                : 'N/A';

            // 8. Gravar Log de Auditoria Centralizado
            await db.collection('externalApiIntegrationLogs').add({
                municipalityId: municipalityId,
                municipalityName: munData?.name,
                entityId: entityId,
                entityType: entityType,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                recordCount: totalProcessed,
                status: 'SUCCESS',
                clientIp: req.ip || req.headers['x-forwarded-for'] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                competencies: uniqueCompetences,
                dateRange: dateRange
            });

            console.log(`[External Integration] Processados ${totalProcessed} registros individuais para o município ${municipalityId}.`);
            res.status(200).send({ 
                success: true, 
                message: `Successfully received and processed ${totalProcessed} individual records`,
                municipality: munData?.name,
                count: totalProcessed 
            });

        } catch (error: any) {
            console.error("Error processing external integration ingestion:", error);
            
            // Gravar Log de Erro se possível
            try {
                await db.collection('externalApiIntegrationLogs').add({
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'ERROR',
                    errorMessage: error.message || 'Internal Server Error',
                    clientIp: req.ip || req.headers['x-forwarded-for'] || 'unknown'
                });
            } catch (e) {}

            res.status(500).send('Internal Server Error');
        }
    });
