import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

interface GroupedZeros {
    [municipalityName: string]: {
        [unitName: string]: any[];
    };
}

export const getZeroProductionProfessionals = functions
    .region('southamerica-east1')
    .runWith({
        timeoutSeconds: 540,
        memory: '2GB',
    })
    .https.onCall(async (data, context) => {
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'Requer autenticação e vínculo de entidade.');
        }

        const entityId: string = context.auth.token.entityId;
        const { year, month, municipalityName } = data;

        if (!entityId || !year) {
            throw new functions.https.HttpsError('invalid-argument', 'entityId e year são obrigatórios');
        }

        const db = admin.firestore();

        // 1. Fetch Units
        const unitsSnap = await db.collection('units').where('entityId', '==', entityId).get();
        const units = unitsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        // 2. Fetch Professionals
        const profsSnap = await db.collection('professionals')
            .where('entityId', '==', entityId)
            .get();

        let professionals = profsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((p: any) => p.active !== false) as any[];

        // 3. Early Abort filter (reduce professionals array if single municipality chosen)
        if (municipalityName && municipalityName !== 'all') {
            professionals = professionals.filter(prof => {
                const assigns = prof.assignments?.length 
                    ? prof.assignments 
                    : [{ municipalityName: prof.municipality }];
                return assigns.some((a: any) => a.municipalityName === municipalityName);
            });
        }

        // --- Build Professional Lookups ---
        const cnsMap = new Map<string, string>();
        const cpfMap = new Map<string, string>();
        const nameMap = new Map<string, string>();

        const normalize = (str: string) => String(str || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const onlyNumbers = (text: string) => String(text || '').replace(/\D/g, '');

        professionals.forEach(p => {
            if (p.cns) cnsMap.set(onlyNumbers(p.cns), p.id);
            if (p.cpf) cpfMap.set(onlyNumbers(p.cpf), p.id);
            if (p.name) nameMap.set(normalize(p.name), p.id);
        });

        // hasProduction trap map
        const hasProduction: Record<string, boolean> = {};

        // --- Format Competence ---
        const compManual = month ? `${year}-${month.padStart(2, '0')}` : '';
        const compConnector = month ? `${month.padStart(2, '0')}-${year}` : '';

        const competencesToSearchManual = month ? [compManual] : Array.from({length: 12}, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
        const competencesToSearchConnector = month ? [compConnector] : Array.from({length: 12}, (_, i) => `${String(i + 1).padStart(2, '0')}-${year}`);

        // --- MANUAl QUERY ---
        const manualPromises = competencesToSearchManual.map(async (compM) => {
            let manualQ = db.collectionGroup('procedures')
                .where('entityId', '==', entityId)
                .where('competenceMonth', '==', compM)
                .select('status', 'professionalId');

            const manualSnap = await manualQ.get();
            manualSnap.docs.forEach(doc => {
                try {
                    if (!doc.ref.path.startsWith('municipalities/')) return;
                    const row = doc.data();
                    if (row.status === 'canceled') return; 

                    const pId = row.professionalId;
                    if (pId) {
                        hasProduction[pId] = true;
                    }
                } catch (errInner) {
                    console.error("Error processing manual row", doc.id, errInner);
                }
            });
        });
        await Promise.all(manualPromises);

        // --- CONNECTOR QUERY ---
        let targetMunis = data.municipalities || [];
        if (!targetMunis || targetMunis.length === 0) {
            const munisSnap = await db.collection('municipalities').where('entityId', '==', entityId).get();
            targetMunis = munisSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        // Removed Tunnel Vision filter. We must scan all targetMunis for connector records 
        // because extractions might be consolidated into a Headquarters or Master municipality's path.

        const compPromises = targetMunis.flatMap((mun: any) => {
            let mEntityType = 'PUBLIC';
            const ctx = mun._pathContext || {};
            if (ctx.entityType) mEntityType = ctx.entityType;
            if (mun.entityType) mEntityType = mun.entityType;
            mEntityType = (mEntityType.toUpperCase() === 'PRIVATE' || mEntityType === 'private_entities') ? 'PRIVATE' : 'PUBLIC';

            const mEntityId = mun.entityId || ctx.entityId || entityId;

            return competencesToSearchConnector.map(async (comp) => {
                try {
                    const path = `municipalities/${mEntityType}/${mEntityId}/${mun.id}/extractions/${year}/competences/${comp}/extraction_records`;

                    const recSnap = await db.collection(path)
                        .select('unit', 'unitCnes', 'date', 'productionDate', 'attendanceDate', 'procedureCode', 'procedure', 'procedureName', 'patient', 'patientName', 'professional', 'cbo', 'professionalCns', 'professionalName', 'professionalId', 'quantity')
                        .get();
                    if (recSnap.empty) return;

                    recSnap.docs.forEach(d => {
                        try {
                            const row = d.data();

                            let rawCode = String(row.procedureCode || row.procedure?.code || '').toUpperCase();
                            let rawName = String(row.procedureName || row.procedure?.name || '').toUpperCase();

                            // Glosa: Procedimento inválido
                            if (!rawCode || rawCode === '-' || rawCode === 'NULL' || rawName.includes('NÃO ENCONTRADO')) return;

                            // Glosa: Paciente não identificado
                            const pName = String(row.patient?.name || row.patientName || '').trim().toUpperCase();
                            if (!pName || pName === 'NÃO IDENTIFICADO' || pName === 'NULL' || pName === '-') return;

                            const cbo = String(row.professional?.cbo || row.cbo || '').trim();

                            if (cbo === '251605' && rawCode === 'CONSULTA' && rawName.includes('ATENDIMENTO INDIVIDUAL')) {
                                rawCode = '0301010030';
                                rawName = 'CONSULTA DE PROFISSIONAIS DE NÍVEL SUPERIOR NA ATENÇÃO PRIMÁRIA (EXCETO MÉDICO)';
                            } else if (rawCode === 'CONSULTA' && rawName.includes('ATENDIMENTO INDIVIDUAL')) {
                                return; // Filter duplicate
                            }

                            let pId = row.professionalId;
                            if (!pId) {
                                const pData = row.professional || {};
                                const cns = onlyNumbers(pData.cns || row.professionalCns);
                                const cpf = onlyNumbers(pData.cpf);
                                const name = normalize(pData.name || row.professionalName);

                                if (cns) pId = cnsMap.get(cns);
                                if (!pId && cpf) pId = cpfMap.get(cpf);
                                if (!pId && cns && cns.length === 11) pId = cpfMap.get(cns);
                                if (!pId && name) pId = nameMap.get(name);

                                if (!pId) {
                                    if (cns) pId = `ext_${cns}`;
                                    else if (cpf) pId = `ext_${cpf}`;
                                    else if (name) pId = `ext_name_${name.replace(/\s/g, '')}`;
                                    else pId = `ext_unknown_${d.id}`;
                                }
                            }

                            const finalId = pId || row.professionalCns || row.professionalId;
                            if (finalId) {
                                hasProduction[finalId] = true;
                            }
                        } catch (errInner) {
                            console.error("Error processing connector row", d.id, errInner);
                        }
                    });
                } catch (e) {
                    // Ignore missing collections
                }
            });
        });
        await Promise.all(compPromises);

        // --- GROUP ZEROED PROFESSIONALS ---
        const groupedZeros: GroupedZeros = {};
        const uniqueZeroIds = new Set<string>();

        professionals.forEach(prof => {
            const rawCns = prof.cns ? onlyNumbers(prof.cns) : '';
            const rawCpf = prof.cpf ? onlyNumbers(prof.cpf) : '';
            const rawName = prof.name ? normalize(prof.name).replace(/\s/g, '') : '';

            // Evaluates global 0 traps
            const isProduced = hasProduction[prof.id] 
                || (rawCns && (hasProduction[rawCns] || hasProduction[`ext_${rawCns}`]))
                || (rawCpf && (hasProduction[rawCpf] || hasProduction[`ext_${rawCpf}`]))
                || (rawName && hasProduction[`ext_name_${rawName}`])
                // plus the old variations just in case
                || (prof.cns && (hasProduction[prof.cns] || hasProduction[`ext_${prof.cns}`]))
                || (prof.cpf && (hasProduction[prof.cpf] || hasProduction[`ext_${prof.cpf}`]))
                || (prof.name && hasProduction[`ext_name_${prof.name.replace(/\s/g, '')}`]);

            if (!isProduced) {
                uniqueZeroIds.add(prof.id);
                let assignmentsToUse = prof.assignments?.length 
                    ? prof.assignments 
                    : [{ municipalityName: prof.municipality || 'Não Atribuído', unitName: prof.unitName || 'Não Atribuído', unitId: prof.unitId }];

                assignmentsToUse.forEach((assig: any) => {
                    const muniName = assig.municipalityName || 'Não Atribuído';
                    let unitName = assig.unitName || 'Não Atribuído';
                    
                    if (assig.unitId) {
                        const u = units.find(unit => unit.id === assig.unitId || (unit as any).cnes === assig.unitId);
                        if (u) unitName = u.name;
                    }

                    if (municipalityName && municipalityName !== 'all' && muniName !== municipalityName) {
                        return; // Skip 
                    }

                    if (!groupedZeros[muniName]) groupedZeros[muniName] = {};
                    if (!groupedZeros[muniName][unitName]) groupedZeros[muniName][unitName] = [];
                    
                    if (!groupedZeros[muniName][unitName].some(p => p.id === prof.id)) {
                        // Deliver clean data
                        groupedZeros[muniName][unitName].push({
                            id: prof.id,
                            name: prof.name,
                            cns: prof.cns,
                            cpf: prof.cpf,
                            cbo: prof.cbo || prof.occupation || '',
                        });
                    }
                });
            }
        });

        console.log(`ZERO PROD DEBUG: Found ${Object.keys(hasProduction).length} ids with production. Resulting in ${uniqueZeroIds.size} zeroed. EntityId: ${entityId}, Month: ${month}`);

        return { groupedZeros, totalZerosUnique: uniqueZeroIds.size, totalProfessionalsEvaluated: professionals.length };
    });
