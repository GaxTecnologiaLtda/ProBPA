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
    .runWith({ memory: "512MB", timeoutSeconds: 300 })
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
            // Map to store results: { goalId: { total: 0, byMonth: { '01': 0, '02': 0... } } }
            const results: Record<string, { total: number, byMonth: Record<string, number> }> = {};

            // Initialize results
            for (const g of goalsToProcess) {
                const byMonth: Record<string, number> = {};
                for (let i = 1; i <= 12; i++) byMonth[i.toString().padStart(2, '0')] = 0;
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
            try {
                // If there are specific municipalities, fetch for them. Otherwise, fetch all for entity.
                if (relevantMunicipalities.size > 0) {
                    for (const munId of relevantMunicipalities) {
                        const profsSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/professionals`).get();
                        profsSnap.forEach(d => activeProfIds.add(d.id));
                    }
                } else {
                    const profsSnap = await db.collectionGroup('professionals').get();
                    profsSnap.forEach(d => {
                        if (d.ref.path.includes(`/PRIVATE/${entityId}/`)) {
                            activeProfIds.add(d.id);
                        }
                    });
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
                        if (competence.startsWith(vigencyYear)) {
                            isRelevant = true;
                            if (!unitId) unitId = pathSegments[recordsIndex + 1]; // unitId or recordId
                            if (!profId && pathSegments[recordsIndex + 2] === 'professionals') {
                                profId = pathSegments[recordsIndex + 3];
                            }
                        }
                    }
                    // EXTRACTIONS PATH
                    else if (extIndex !== -1 && compsInd !== -1 && pathSegments.length > compsInd + 1) {
                        const pathYear = pathSegments[extIndex + 1];
                        if (pathYear === vigencyYear) {
                            let rawComp = pathSegments[compsInd + 1];
                            // Normalize to YYYY-MM
                            const parts = rawComp.split('-');
                            if (parts.length === 2 && parts[0].length === 2) {
                                competence = `${parts[1]}-${parts[0]}`;
                            } else {
                                competence = rawComp;
                            }
                            isRelevant = true;
                        }
                    }
                }

                if (!isRelevant || !summaryData.units) continue;

                // Extract month from YYYY-MM
                const monthStr = competence.split('-')[1];
                if (!monthStr || monthStr.length !== 2) continue;

                for (const uFromDoc of Object.keys(summaryData.units)) {
                    const unitData = summaryData.units[uFromDoc];
                    if (!unitData.professionals) continue;

                    for (const pFromDoc of Object.keys(unitData.professionals)) {
                        // Apply active professional filter for Extractions ONLY
                        if (pathSegments.indexOf('extractions') !== -1 && activeProfIds.size > 0 && !activeProfIds.has(pFromDoc)) {
                            continue;
                        }

                        const profData = unitData.professionals[pFromDoc];
                        if (!profData.procedures) continue;
                        const proceduresMap = profData.procedures;

                        for (const g of goalsToProcess) {
                            // 1. Check Vigency Match
                            if (g.startMonth && g.endMonth) {
                                const startRaw = g.startMonth.substring(0, 7);
                                const endRaw = g.endMonth.substring(0, 7);
                                if (competence < startRaw || competence > endRaw) continue;
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

                            let addedQty = 0;

                            for (const [pCodeRaw, pQty] of Object.entries(proceduresMap)) {
                                const pCode = String(pCodeRaw).replace(/\D/g, '');
                                if (isMacro) {
                                    if (pCode.startsWith(gCode)) addedQty += Number(pQty);
                                } else {
                                    if (pCode === gCode) addedQty += Number(pQty);
                                }
                            }

                            if (addedQty > 0) {
                                results[g.id].total += addedQty;
                                results[g.id].byMonth[monthStr] = (results[g.id].byMonth[monthStr] || 0) + addedQty;
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
