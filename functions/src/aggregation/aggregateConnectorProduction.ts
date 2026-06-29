import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logSystemEvent, LogLevel } from '../utils/logger';
import { resolveSigtapCode, normalizeCns } from '../utils/sigtapNormalization';

import * as functions from 'firebase-functions/v1';

export const runConnectorAggregation = async (
    entityType: string,
    entityId: string,
    municipalityId: string,
    year: string,
    competenceMonthQuery?: string
) => {
    const db = admin.firestore();
    console.log(`[ConnectorAggregation] Starting for ${municipalityId} | Year: ${year}`);

    await logSystemEvent(LogLevel.INFO, `Connector Aggregation Started (${municipalityId})`, {
        entityId,
        municipalityId,
        year,
        competenceMonthQuery
    });

    // --- 0. Pre-fetch Registered Professionals to match Real IDs ---
    console.log(`[ConnectorAggregation] Fetching registered professionals for ID matching...`);
    const profsRef = db.collection(`municipalities/${entityType}/${entityId}/${municipalityId}/professionals`);
    const profsSnap = await profsRef.get();

    const cnsMap = new Map<string, string>();
    const cpfMap = new Map<string, string>();
    const nameMap = new Map<string, string>();

    profsSnap.forEach(doc => {
        const p = doc.data();
        const pId = doc.id;

        if (p.cns) cnsMap.set(normalizeCns(p.cns), pId);
        if (p.cpf) cpfMap.set(normalizeCns(p.cpf), pId);
        if (p.name) nameMap.set(String(p.name).trim().toLowerCase(), pId);
    });
    console.log(`[ConnectorAggregation] Loaded ${profsSnap.size} professionals into maps.`);

    console.log(`[ConnectorAggregation] Fetching registered units for CNES matching...`);
    const unitsRef = db.collection(`municipalities/${entityType}/${entityId}/${municipalityId}/units`);
    const unitsSnap = await unitsRef.get();
    const cnesMap = new Map<string, { id: string, name: string }>();
    unitsSnap.forEach(doc => {
        const u = doc.data();
        if (u.cnes) {
            cnesMap.set(String(u.cnes).trim(), { id: doc.id, name: u.name });
        }
    });
    console.log(`[ConnectorAggregation] Loaded ${unitsSnap.size} units into maps.`);
    // ----------------------------------------------------------------

    const extractionsRef = db.doc(`municipalities/${entityType}/${entityId}/${municipalityId}/extractions/${year}`);
    const competencesRef = extractionsRef.collection("competences");

    // Allow processing specific month or ALL months in the year
    let competencesToProcess: string[] = [];

    if (competenceMonthQuery) {
        competencesToProcess.push(String(competenceMonthQuery));
    } else {
        const compDocs = await competencesRef.listDocuments();
        competencesToProcess = compDocs.map(d => d.id);
    }

    if (competencesToProcess.length === 0) {
        console.log(`[ConnectorAggregation] No competences found for ${year}`);
        return { success: true, recordsProcessed: 0, summariesCreated: 0 };
    }

    let globalTotalProcessed = 0;
    let globalSummariesCreated = 0;

    const processMonthPromises = competencesToProcess.map(async (compId) => {
        console.log(`[ConnectorAggregation] Processing Competence: ${compId}`);
        const competenceDocRef = competencesRef.doc(compId);
        const recordsRef = competenceDocRef.collection("extraction_records");

        // Using .stream() instead of .get() to avoid "Memory limit exceeded" on 30k+ documents
        const stream = recordsRef.stream();
        const aggregations = new Map<string, any>();
        let processedInThisComp = 0;

        for await (const chunk of stream) {
            const doc = chunk as unknown as admin.firestore.QueryDocumentSnapshot;
            const data = doc.data();
            processedInThisComp++;

            // Duplicate filter
            let rawCode = String(data.procedureCode || data.procedure?.code || '').toUpperCase();
            let rawName = String(data.procedureName || data.procedure?.name || '').toUpperCase();

            // Resgate heroico do SIGTAP pelo ID do documento (para Atividades Coletivas e Visitas que vêm sem procedureCode)
            if (!rawCode || rawCode === '-' || rawCode === 'NULL') {
                const parts = doc.id.split('_');
                const suffix = parts[parts.length - 1];
                if (suffix && suffix.length === 10 && !isNaN(Number(suffix))) {
                    rawCode = suffix;
                }
            }

            const pDataFallback = data.professional || {};
            const pCbo = String(pDataFallback.cbo || '').trim();

            if (pCbo === '251605' && rawCode === 'CONSULTA' && rawName.includes('ATENDIMENTO INDIVIDUAL')) {
                rawCode = '0301010030';
                rawName = 'CONSULTA DE PROFISSIONAIS DE NÍVEL SUPERIOR NA ATENÇÃO PRIMÁRIA (EXCETO MÉDICO)';
                data.procedureCode = rawCode;
                data.procedureName = rawName;
                if (data.procedure) {
                    data.procedure.code = rawCode;
                    data.procedure.name = rawName;
                }
            } else if (rawCode === 'CONSULTA' && rawName.includes('ATENDIMENTO INDIVIDUAL')) {
                continue;
            }

            // Glosa: Procedimento inválido
            if (!rawCode || rawCode === '-' || rawCode === 'NULL' || rawName.includes('NÃO ENCONTRADO')) {
                continue;
            }

            const isCollective = String(data.recordType).toUpperCase().includes('COLETIVA') ||
                rawName.includes('COLETIVA') ||
                rawCode.startsWith('0101');
            const isDomiciliar = String(data.recordType).toUpperCase().includes('DOMICILIAR') ||
                rawName.includes('DOMICILIAR') ||
                rawCode === '0301010137';

            const hasPatientId = !!(data.patient?.cns || data.patient?.cpf);

            // Glosa: Paciente não identificado
            const pNameStr = String(data.patient?.name || data.patientName || '').trim().toUpperCase();
            const hasPatientName = pNameStr && pNameStr !== 'NÃO IDENTIFICADO' && pNameStr !== 'NULL' && pNameStr !== '-';

            if ((!hasPatientId || !hasPatientName) && !isCollective && !isDomiciliar) {
                continue;
            }

            // Apply sigtap normalizations
            const resolved = resolveSigtapCode(data);

            // Match Professional ID (Using Frontend Heuristics)
            const pData = data.professional || {};
            const recCns = normalizeCns(pData.cns);
            const recCpfRaw = normalizeCns(pData.cpf);
            const recRealCpf = recCpfRaw || ((recCns.length === 11) ? recCns : '');
            const recName = (data.professionalName || pData.name || '').trim().toLowerCase();

            // Priority: CNS > CPF > Name
            let trueProfId = cnsMap.get(recCns);
            if (!trueProfId && recRealCpf) {
                trueProfId = cpfMap.get(recRealCpf);
            }
            if (!trueProfId && recName) {
                trueProfId = nameMap.get(recName);
            }

            // Fallback to the extracted ID or CNS if not found in database yet
            const fallbackId = data.professionalId || pData.cns || pData.cpf || pData.name || "unknown_prof";
            let pId = trueProfId || fallbackId;

            let pName = data.professionalName || pData.name || "Unknown Professional";

            // Date
            let dateStr = 'unknown_date';
            if (data.productionDate) {
                const [ymd] = data.productionDate.split(' ');
                const [y, m, d] = ymd.split('-');
                if (y && m && d) {
                    dateStr = `${d}-${m}-${y}`;
                }
            }

            const key = dateStr;

            // Resolve Unit
            const recCnesRaw = String(data.unit?.cnes || '');
            let recCnes = recCnesRaw.trim();

            const extId = String(data.externalId || '');
            if (!recCnes && extId && !extId.startsWith('_-_') && !extId.startsWith('null-')) {
                const possibleCnes = extId.split('-')[0];
                if (possibleCnes && possibleCnes.length === 7 && !isNaN(Number(possibleCnes))) {
                    recCnes = possibleCnes;
                }
            }

            const unitMatch = cnesMap.get(recCnes);

            if (recCnes.includes('2636247') || recCnesRaw.includes('2636247')) {
                console.log(`[DEBUG CNES] Raw: "${recCnesRaw}" (len: ${recCnesRaw.length}), Trimmed: "${recCnes}" (len: ${recCnes.length}). Found in Map? ${!!unitMatch}`);
                if (!unitMatch) {
                    console.log(`[DEBUG CNES] Map keys: `, Array.from(cnesMap.keys()).filter(k => k.includes('2636247')));
                }
            }

            const uId = unitMatch?.id || (recCnes ? `cnes_${recCnes}` : 'unknown_unit');
            const uName = unitMatch?.name || (recCnes ? `CNES ${recCnes}` : 'Unknown Unit');

            if (!aggregations.has(key)) {
                aggregations.set(key, {
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                    units: {}
                });
            }

            const dailyDoc = aggregations.get(key)!;

            if (!dailyDoc.units[uId]) {
                dailyDoc.units[uId] = {
                    unitName: uName,
                    professionals: {}
                };
            }

            if (!dailyDoc.units[uId].professionals[pId]) {
                dailyDoc.units[uId].professionals[pId] = {
                    professionalName: pName,
                    procedures: {}
                };
            }

            const profStats = dailyDoc.units[uId].professionals[pId];
            const finalCode = resolved.code;
            const qty = Number(data.quantity) || 1;

            profStats.procedures[finalCode] = (profStats.procedures[finalCode] || 0) + qty;
        }

        if (processedInThisComp === 0) {
            console.log(`[ConnectorAggregation] No records found in ${compId}.`);
            return;
        }

        globalTotalProcessed += processedInThisComp;

        // Clean up old summaries to avoid stale data
        console.log(`[ConnectorAggregation] Wiping old summaries for ${compId}...`);
        const summaryColRef = competenceDocRef.collection('resumo_producao');
        const oldSummaries = await summaryColRef.get();

        const batchLimit = 500;
        let batch = db.batch();
        let opCount = 0;

        for (const d of oldSummaries.docs) {
            batch.delete(d.ref);
            opCount++;
            if (opCount >= batchLimit) {
                await batch.commit();
                batch = db.batch();
                opCount = 0;
            }
        }

        // Write new updates
        console.log(`[ConnectorAggregation] Writing ${aggregations.size} new summaries for ${compId}...`);

        for (const [key, stats] of aggregations) {
            const summaryDocRef = summaryColRef.doc(key);

            batch.set(summaryDocRef, stats);
            opCount++;
            globalSummariesCreated++;

            if (opCount >= batchLimit) {
                await batch.commit();
                batch = db.batch();
                opCount = 0;
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        console.log(`[ConnectorAggregation] Finished ${compId}.`);
    });

    await Promise.all(processMonthPromises);

    const finalResult = { success: true, recordsProcessed: globalTotalProcessed, summariesCreated: globalSummariesCreated };

    await logSystemEvent(LogLevel.INFO, `Connector Aggregation Completed (${municipalityId})`, {
        ...finalResult,
        entityId,
        municipalityId,
        year
    });

    return finalResult;
};

/**
 * HTTP Trigger for aggregating Connector Production data.
 */
export const aggregateConnectorProduction = onRequest(
    {
        region: "southamerica-east1",
        timeoutSeconds: 540,
        memory: "4GiB",
        cors: true,
    },
    async (req, res) => {
        const entityType = req.method === "POST" ? req.body.entityType : req.query.entityType;
        const entityId = req.method === "POST" ? req.body.entityId : req.query.entityId;
        const municipalityId = req.method === "POST" ? req.body.municipalityId : req.query.municipalityId;
        const year = req.method === "POST" ? req.body.year : req.query.year;
        const competenceMonthQuery = req.method === "POST" ? req.body.competenceMonth : req.query.competenceMonth;

        if (!entityType || !entityId || !municipalityId || !year) {
            res.status(400).json({ error: "Missing required parameters: entityType, entityId, municipalityId, year" });
            return;
        }

        try {
            const result = await runConnectorAggregation(String(entityType), String(entityId), String(municipalityId), String(year), competenceMonthQuery ? String(competenceMonthQuery) : undefined);
            res.status(200).json({ message: "Aggregation completed", ...result });
        } catch (error: any) {
            console.error("[ConnectorAggregation] Error:", error);
            res.status(500).json({ error: "Aggregation failed", details: error.message });
        }
    }
);

/**
 * Scheduled job for Connector Aggregation
 * Runs daily at 10:00 UTC-3 (BRT)
 */
export const scheduledConnectorAggregation = functions.runWith({ memory: "2GB", timeoutSeconds: 540 }).pubsub.schedule('0 10 * * *')
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
        const db = admin.firestore();
        const now = new Date();
        const currentYear = String(now.getFullYear());

        console.log(`[ScheduledConnector] Starting daily aggregation for Year: ${currentYear}`);
        await logSystemEvent(LogLevel.INFO, 'Scheduled Connector Aggregation Job Started', { year: currentYear });

        // Scan ALL municipalities dynamically by looking for 'extractions' collections
        const extractionsSnap = await db.collectionGroup('extractions').get();

        const scheduledPromises = extractionsSnap.docs.map(async (doc) => {
            if (doc.id !== currentYear) return; // Only process current year's extractions

            const pathSegments = doc.ref.path.split('/');
            // Expecting: municipalities / TYPE / ENT_ID / MUN_ID / extractions / YEAR
            if (pathSegments.length >= 6) {
                const entityType = pathSegments[1];
                const entityId = pathSegments[2];
                const municipalityId = pathSegments[3];

                try {
                    console.log(`[ScheduledConnector] Dispatching scheduled aggregation for Municipality: ${municipalityId}`);
                    await runConnectorAggregation(entityType, entityId, municipalityId, currentYear);
                } catch (error: any) {
                    console.error(`[ScheduledConnector] Error processing ${municipalityId}:`, error);
                    await logSystemEvent(LogLevel.ERROR, `Connector Aggregation Failed (${municipalityId})`, {
                        error: error.message,
                        entityId,
                        municipalityId,
                        year: currentYear
                    });
                }
            }
        });

        await Promise.allSettled(scheduledPromises);

        console.log(`[ScheduledConnector] Daily run completed.`);
        await logSystemEvent(LogLevel.INFO, 'Scheduled Connector Aggregation Job Completed', { year: currentYear });
        return null;
    });
