import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

interface GoalPayload {
    id: string;
    procedureCode: string;
    sigtapTargetType?: string;
    startMonth?: string;
    endMonth?: string;
    municipalityId?: string;
    unitId?: string;
    professionalId?: string;
    goalType?: string;
}

export const getGoalsProgress = functions
    .region("southamerica-east1")
    .runWith({ memory: "1GB", timeoutSeconds: 540 })
    .https.onCall(async (data, context) => {
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated and associated with an entity.');
        }

        const entityId = context.auth.token.entityId;
        const vigencyYear = data.year || String(new Date().getFullYear());
        const goalsToProcess: GoalPayload[] = data.goals || [];

        if (goalsToProcess.length === 0) {
            return {};
        }

        const db = admin.firestore();
        console.log(`[getGoalsProgress] Fetching progress for Entity: ${entityId}, Year: ${vigencyYear}, Goals: ${goalsToProcess.length}`);

        try {
            // Calculate global bounds for fetching
            let minComp = "9999-12";
            let maxComp = "0000-00";

            for (const g of goalsToProcess) {
                if (g.startMonth) {
                    let s = g.startMonth.substring(0, 7);
                    if (s < minComp) minComp = s;
                }
                if (g.endMonth) {
                    let e = g.endMonth.substring(0, 7);
                    if (e > maxComp) maxComp = e;
                }
            }
            if (minComp === "9999-12" || maxComp === "0000-00") {
                minComp = `${vigencyYear}-01`;
                maxComp = `${vigencyYear}-12`;
            }

            // Map to store results: { goalId: { total: 0, byMonth: { 'YYYY-MM': 0, ... } } }
            const results: Record<string, { total: number, byMonth: Record<string, number> }> = {};

            // Initialize results dynamically
            for (const g of goalsToProcess) {
                const byMonth: Record<string, number> = {};
                
                const sY = parseInt(g.startMonth ? g.startMonth.substring(0, 4) : vigencyYear);
                const eY = parseInt(g.endMonth ? g.endMonth.substring(0, 4) : vigencyYear);
                const sM = g.startMonth ? g.startMonth.substring(0, 7) : `${vigencyYear}-01`;
                const eM = g.endMonth ? g.endMonth.substring(0, 7) : `${vigencyYear}-12`;
                
                for (let y = sY; y <= eY; y++) {
                    for (let m = 1; m <= 12; m++) {
                        const mStr = String(m).padStart(2, '0');
                        const compKey = `${y}-${mStr}`;
                        if (compKey >= sM && compKey <= eM) {
                            byMonth[compKey] = 0;
                        }
                    }
                }
                results[g.id] = { total: 0, byMonth };
            }

            // 1. Pre-fetch Active Professionals for each relevant municipality
            // This mirrors the Dashboard logic to compute ONLY for currently listed/active professionals
            const relevantMunicipalities = new Set<string>();
            for (const g of goalsToProcess) {
                if (g.municipalityId) {
                    relevantMunicipalities.add(g.municipalityId);
                }
            }

            // If we have global goals with no specific municipalityId, we might need all municipalities.
            // But usually the Request comes from a specific Entity Context, so we pull all for the Entity.
            const activeProfIds = new Set<string>();
            const activeUnitIds = new Set<string>();
            const cnsMap = new Map<string, string>();
            const cpfMap = new Map<string, string>();
            const nameMap = new Map<string, string>();
            let didFetchActiveProfs = false;
            let didFetchActiveUnits = false;

            try {
                // If there are specific municipalities, fetch for them. Otherwise, fetch all for entity.
                const processProfSnap = (snap: admin.firestore.QuerySnapshot) => {
                    snap.forEach(d => {
                        const pId = d.id;
                        const pData = d.data();
                        activeProfIds.add(pId);

                        // Normalizer helper inline
                        const norm = (str: any) => String(str || '').replace(/\D/g, '');

                        const cns = norm(pData.cns);
                        if (cns.length === 15) cnsMap.set(cns, pId);

                        const cpf = norm(pData.cpf);
                        if (cpf.length === 11) cpfMap.set(cpf, pId);

                        if (pData.name) nameMap.set(String(pData.name).trim().toLowerCase(), pId);
                    });
                    didFetchActiveProfs = true;
                };

                if (relevantMunicipalities.size > 0) {
                    for (const munId of relevantMunicipalities) {
                        const profsSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/professionals`).get();
                        processProfSnap(profsSnap);

                        const unitsSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/units`).get();
                        unitsSnap.forEach(d => activeUnitIds.add(d.id));
                    }
                    didFetchActiveUnits = true;
                } else {
                    const profsSnap = await db.collectionGroup('professionals').get();
                    // We need to filter manually since we can't query by path prefix easily in collectionGroup
                    const entityProfsDocs = profsSnap.docs.filter(d => d.ref.path.includes(`/PRIVATE/${entityId}/`));
                    // Create a pseudo-snapshot or just iterate
                    entityProfsDocs.forEach(d => {
                        const pId = d.id;
                        const pData = d.data();
                        activeProfIds.add(pId);

                        const norm = (str: any) => String(str || '').replace(/\D/g, '');

                        const cns = norm(pData.cns);
                        if (cns.length === 15) cnsMap.set(cns, pId);

                        const cpf = norm(pData.cpf);
                        if (cpf.length === 11) cpfMap.set(cpf, pId);

                        if (pData.name) nameMap.set(String(pData.name).trim().toLowerCase(), pId);
                    });
                    if (entityProfsDocs.length > 0) didFetchActiveProfs = true;

                    // Fetch all units for entity
                    const unitsSnap = await db.collectionGroup('units').get();
                    const entityUnitsDocs = unitsSnap.docs.filter(d => d.ref.path.includes(`/PRIVATE/${entityId}/`));
                    entityUnitsDocs.forEach(d => activeUnitIds.add(d.id));
                    if (entityUnitsDocs.length > 0) didFetchActiveUnits = true;
                }
            } catch (err) {
                console.error("[getGoalsProgress] Failed to fetch active professionals. Progress will compute all.", err);
            }

            // 2. We search for all 'resumo_producao' subcollections under this entity's professionals
            const allSummariesSnap = await db.collectionGroup('resumo_producao').get();

            // We might have thousands of summaries. We must map them efficiently.
            for (const doc of allSummariesSnap.docs) {
                const summaryData = doc.data();
                const pathSegments = doc.ref.path.split('/');

                let isRelevant = false;
                let munId = '';
                let unitId = summaryData.unitId || ''; // To be extracted if possible, might need parent doc info if manual
                let profId = summaryData.professionalId || '';
                let competence = ''; // YYYY-MM

                // Identify if it belongs to Entity
                if (pathSegments.length >= 7 && pathSegments[0] === 'municipalities' && pathSegments[2] === entityId) {
                    munId = pathSegments[3];

                    const compIndex = pathSegments.indexOf('competencias');
                    const compsInd = pathSegments.indexOf('competences');
                    const recordsIndex = pathSegments.indexOf('bpai_records');
                    const extIndex = pathSegments.indexOf('extractions');

                    // MANUAL PATH
                    if (recordsIndex !== -1 && compIndex !== -1 && pathSegments.length > compIndex + 1) {
                        competence = pathSegments[compIndex + 1];
                        if (competence >= minComp && competence <= maxComp) {
                            isRelevant = true;
                            if (!unitId) unitId = pathSegments[recordsIndex + 1]; // unitId or recordId
                            if (!profId && pathSegments[recordsIndex + 2] === 'professionals') {
                                profId = pathSegments[recordsIndex + 3];
                            }
                        }
                    }
                    // EXTRACTIONS PATH
                    else if (extIndex !== -1 && compsInd !== -1 && pathSegments.length > compsInd + 1) {
                        let rawComp = pathSegments[compsInd + 1];
                        // Normalize to YYYY-MM
                        const parts = rawComp.split('-');
                        if (parts.length === 2 && parts[0].length === 2) {
                            competence = `${parts[1]}-${parts[0]}`;
                        } else {
                            competence = rawComp;
                        }
                        if (competence >= minComp && competence <= maxComp) {
                            isRelevant = true;
                        }
                    }
                }

                if (!isRelevant || !summaryData.units) continue;

                // No longer restricting monthStr to 2 length, as competence is YYYY-MM

                for (const uFromDoc of Object.keys(summaryData.units)) {
                    // Filter unregistered units (allow entity itself if it appears)
                    if (didFetchActiveUnits && !activeUnitIds.has(uFromDoc) && uFromDoc !== entityId) continue;
                    
                    const unitData = summaryData.units[uFromDoc];
                    if (!unitData.professionals) continue;

                    for (const pFromDoc of Object.keys(unitData.professionals)) {
                        const profData = unitData.professionals[pFromDoc];

                        // Strict Professional Filter:
                        // Find if this professional from the summary actually belongs to the Entity's Roster
                        if (didFetchActiveProfs) {
                            let isFound = false;

                            // 1. Check ID directly
                            if (activeProfIds.has(pFromDoc)) {
                                isFound = true;
                            }
                            // 2. Check if pFromDoc is a CNS or CPF
                            else if (pFromDoc.length === 15 && cnsMap.has(pFromDoc)) {
                                isFound = true;
                            } else if (pFromDoc.length === 11 && cpfMap.has(pFromDoc)) {
                                isFound = true;
                            }
                            // 3. Check Name
                            else if (profData.professionalName) {
                                const normName = String(profData.professionalName).trim().toLowerCase();
                                if (nameMap.has(normName)) {
                                    isFound = true;
                                }
                            }

                            if (!isFound) {
                                continue; // Skip this unlinked professional
                            }
                        }

                        if (!profData.procedures) continue;
                        const proceduresMap = profData.procedures;

                        for (const [pCodeRaw, pQty] of Object.entries(proceduresMap)) {
                            const pCode = String(pCodeRaw).replace(/\D/g, '');
                            const qty = Number(pQty) || 0;
                            if (qty <= 0) continue;

                            const matchedGlobalKeys = new Set<string>();

                            for (const g of goalsToProcess) {
                                // 1. Check Vigency Match (Global Range)
                                if (g.startMonth && g.endMonth) {
                                    const startRaw = g.startMonth.substring(0, 7);
                                    const endRaw = g.endMonth.substring(0, 7);
                                    if (competence < startRaw || competence > endRaw) continue;
                                    
                                    // 1.1 Check exact day boundaries if the document ID reveals the day
                                    // Summaries could be 'DD-MM-YYYY' or 'DD-MM-YYYY_CNS'
                                    const docId = doc.id;
                                    const datePartMatch = docId.match(/(\d{2})-(\d{2})-(\d{4})/);
                                    if (datePartMatch) {
                                        const [, d, m, y] = datePartMatch;
                                        const docDateIso = `${y}-${m}-${d}`;

                                        if (docDateIso < g.startMonth || docDateIso > g.endMonth) {
                                            continue; // Omit production purely outside exact days
                                        }
                                    }
                                }

                                // 2. Check Context Match (Municipality, Unit, Professional)
                                let contextMatch = true;
                                if (g.goalType === 'municipal') {
                                    if (g.municipalityId && munId && g.municipalityId !== munId) contextMatch = false;
                                } else if (g.goalType === 'unit') {
                                    if (g.unitId && g.unitId !== uFromDoc) contextMatch = false;
                                } else if (g.goalType === 'professional') {
                                    if (g.professionalId && g.professionalId !== 'team') {
                                        if (g.professionalId !== pFromDoc) contextMatch = false;
                                    } else {
                                        // team goal
                                        if (g.unitId && g.unitId !== uFromDoc) contextMatch = false;
                                    }
                                }

                                if (!contextMatch) continue;

                                // 3. SIGTAP Match
                                const gCode = String(g.procedureCode || '').replace(/\D/g, '');
                                if (!gCode) continue;

                                const isMacro = (g.sigtapTargetType && ['Group', 'SubGroup', 'Form', 'Grupo', 'Subgrupo', 'Forma'].includes(g.sigtapTargetType)) || gCode.length < 10;

                                let matchesGoal = false;
                                if (isMacro) {
                                    if (pCode.startsWith(gCode)) matchesGoal = true;
                                } else {
                                    if (pCode === gCode) matchesGoal = true;
                                }

                                if (matchesGoal) {
                                    results[g.id].total += qty;
                                    results[g.id].byMonth[competence] = (results[g.id].byMonth[competence] || 0) + qty;
                                    const gSYear = g.startMonth ? g.startMonth.substring(0, 4) : '0000';
                                    const gEYear = g.endMonth ? g.endMonth.substring(0, 4) : '9999';
                                    matchedGlobalKeys.add(`GLOBAL_STATS_${munId}_${gSYear}_${gEYear}`);
                                }
                            }

                            for (const globalKey of matchedGlobalKeys) {
                                if (!results[globalKey]) {
                                    results[globalKey] = { total: 0, byMonth: {} };
                                }
                                results[globalKey].total += qty;
                                results[globalKey].byMonth[competence] = (results[globalKey].byMonth[competence] || 0) + qty;
                            }
                        }
                    }
                }
            }

            return { success: true, results };

        } catch (error: any) {
            console.error('[getGoalsProgress] Error:', error);
            throw new functions.https.HttpsError('internal', 'Failed to calculate goals progress.', error.message);
        }
    });
