import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { logSystemEvent, LogLevel } from '../utils/logger';

export const getUnitComparativeStats = functions
    .region("southamerica-east1")
    .runWith({ memory: "512MB", timeoutSeconds: 300 })
    .https.onCall(async (data, context) => {
        // 1. Authentication and Authorization Check
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated and associated with an entity.');
        }

        const entityId = context.auth.token.entityId;
        const municipalityId = data.municipalityId;
        const competence = data.competence; // Expected format YYYY-MM or MM-YYYY
        const startDate = data.startDate; // Optional YYYY-MM-DD
        const endDate = data.endDate; // Optional YYYY-MM-DD

        if (!municipalityId || (!competence && !(startDate && endDate))) {
            throw new functions.https.HttpsError('invalid-argument', 'municipalityId and either competence or a date range (startDate/endDate) are required.');
        }

        const db = admin.firestore();

        console.log(`[getUnitComparativeStats] Fetching for Entity: ${entityId}, Mun: ${municipalityId}, Comp: ${competence}, StartDate: ${startDate}, EndDate: ${endDate}`);

        try {
            // 2. Fetch Entity Context
            const entityDoc = await db.doc(`entities/${entityId}`).get();
            if (!entityDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Entity not found.');
            }
            const entityData = entityDoc.data();
            const entityType = (entityData?.type === 'Privada' || entityData?.type === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';

            let competenceFilterBase = competence; // Expected standard for manual might be YYYY-MM
            if (competence) {
                if (competence.includes('/')) {
                    const parts = competence.split('/');
                    competenceFilterBase = `${parts[1]}-${parts[0]}`; // YYYY-MM
                } else if (competence.length === 6 && !competence.includes('-')) {
                    const year = competence.substring(0, 4);
                    competenceFilterBase = `${year}-${competence.substring(4, 6)}`;
                } else if (competence.split('-')[0].length === 2) {
                    // MM-YYYY
                    const year = competence.split('-')[1];
                    competenceFilterBase = `${year}-${competence.split('-')[0]}`;
                }
            }

            let competencesToFetch: string[] = []; // Array of YYYY-MM

            if (startDate && endDate) {
                // Generate all months between startDate and endDate
                let start = new Date(`${startDate}T12:00:00Z`);
                let end = new Date(`${endDate}T12:00:00Z`);

                // Safety net to prevent infinite loops (max 12 months)
                let loopCount = 0;
                let currentMonth = new Date(start);
                currentMonth.setDate(1); // Set to 1st of month to avoid overflow

                while (currentMonth <= end && loopCount < 12) {
                    const y = currentMonth.getFullYear();
                    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
                    competencesToFetch.push(`${y}-${m}`);

                    currentMonth.setMonth(currentMonth.getMonth() + 1);
                    loopCount++;
                }

                // Make sure the last month specifically is included if the end date is within a month not hit by the logic above
                const lastY = end.getFullYear();
                const lastM = String(end.getMonth() + 1).padStart(2, '0');
                if (!competencesToFetch.includes(`${lastY}-${lastM}`)) {
                    competencesToFetch.push(`${lastY}-${lastM}`);
                }

            } else {
                competencesToFetch.push(competenceFilterBase);
            }

            // Result accumulator
            // { [unitId]: { [procedureCode]: quantity } }
            const result: Record<string, Record<string, number>> = {};

            const baseMunPath = `municipalities/${entityType}/${entityId}/${municipalityId}`;

            // Fetch Professionals to iterate manual summaries
            const profsQuery = await db.collection('professionals').where('entityId', '==', entityId).get();
            const profIds = profsQuery.docs.map(doc => doc.id);

            let totalRecordsParsed = 0;

            const allPromises: Promise<FirebaseFirestore.DocumentData[]>[] = [];

            for (const compFilter of competencesToFetch) {
                const year = compFilter.split('-')[0];
                const connectorCompId = `${compFilter.split('-')[1]}-${compFilter.split('-')[0]}`; // MM-YYYY

                // Fetch Manual Summaries
                const manualPromises = profIds.map(async (profId) => {
                    const manualRef = db.collection(`${baseMunPath}/professionals/${profId}/competencias/${compFilter}/resumo_producao`);
                    try {
                        const snap = await manualRef.get();
                        return snap.docs;
                    } catch (e) {
                        return [];
                    }
                });

                allPromises.push(...manualPromises);

                // Fetch Connector Summaries
                const connectorRef = db.collection(`${baseMunPath}/extractions/${year}/competences/${connectorCompId}/resumo_producao`);
                allPromises.push(connectorRef.get().then(snap => snap.docs).catch(() => []));
            }

            const docsArrays = await Promise.all(allPromises);
            const allDocs = docsArrays.flat();

            for (const doc of allDocs) {
                // If filtering by dates, check if document ID falls within range
                if (startDate && endDate) {
                    // Possible Doc IDs: 'DD-MM-YYYY' or 'DD-MM-YYYY_CNS'
                    const docId = doc.id;
                    const datePartMatch = docId.match(/(\d{2})-(\d{2})-(\d{4})/);

                    if (datePartMatch) {
                        const [, d, m, y] = datePartMatch;
                        const docDateIso = `${y}-${m}-${d}`;

                        if (docDateIso < startDate || docDateIso > endDate) {
                            continue; // Skip document out of range
                        }
                    }
                }

                const data = doc.data();
                if (!data.units) continue;
                totalRecordsParsed++;

                for (const uId of Object.keys(data.units)) {
                    const unitData = data.units[uId];
                    if (!unitData.professionals) continue;

                    if (!result[uId]) {
                        result[uId] = {};
                    }

                    for (const pId of Object.keys(unitData.professionals)) {
                        const profData = unitData.professionals[pId];
                        if (!profData.procedures) continue;

                        for (const [code, count] of Object.entries(profData.procedures)) {
                            const procQty = Number(count) || 0;
                            if (procQty > 0) {
                                result[uId][code] = (result[uId][code] || 0) + procQty;
                            }
                        }
                    }
                }
            }

            console.log(`[getUnitComparativeStats] Found ${totalRecordsParsed} summary docs, aggregated into ${Object.keys(result).length} units.`);

            return {
                success: true,
                data: result
            };

        } catch (error: any) {
            console.error('[getUnitComparativeStats] Error:', error);
            await logSystemEvent(LogLevel.ERROR, 'getUnitComparativeStats Error', {
                error: error.message,
                entityId,
                municipalityId,
                competence
            });
            throw new functions.https.HttpsError('internal', 'Ocorreu um erro ao buscar os dados do comparativo.');
        }
    });
