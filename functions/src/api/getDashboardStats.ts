import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { logSystemEvent, LogLevel } from '../utils/logger';

export const getDashboardStats = functions
    .region("southamerica-east1")
    .runWith({ memory: "512MB", timeoutSeconds: 300 })
    .https.onCall(async (data, context) => {
        // 1. Authentication and Authorization Check
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated and associated with an entity.');
        }

        const entityId = context.auth.token.entityId;
        const year = data.year || String(new Date().getFullYear());
        const db = admin.firestore();

        console.log(`[getDashboardStats] Fetching stats for Entity: ${entityId}, Year: ${year}`);

        try {
            // 2. Fetch Entity Context
            const entityDoc = await db.doc(`entities/${entityId}`).get();
            if (!entityDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Entity not found.');
            }
            const entityData = entityDoc.data();
            const entityType = (entityData?.type === 'Privada' || entityData?.type === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';

            // 3. Parallel fetch of Contextual Counts (Professionals & Municipalities & Goals)
            const profsQuery = db.collection('professionals').where('entityId', '==', entityId);
            const munsQuery = db.collection('municipalities').doc(entityType).collection(entityId);
            const goalsQuery = db.collectionGroup('goals').where('entityId', '==', entityId);

            const [profsSnap, munsSnap, goalsSnap] = await Promise.all([
                profsQuery.get(),
                munsQuery.get(),
                goalsQuery.get()
            ]);

            const totalProfessionals = profsSnap.size;
            const totalMunicipalities = munsSnap.size;

            const activeProfIds = new Set<string>();
            profsSnap.forEach(doc => {
                activeProfIds.add(doc.id);
            });

            const municipalitiesMap = new Map<string, string>();
            munsSnap.forEach(doc => {
                municipalitiesMap.set(doc.id, doc.data().name || 'Desconhecido');
            });

            // 4. Calculate Goals
            let globalTarget = 0;
            goalsSnap.forEach(doc => {
                const g = doc.data();
                globalTarget += (g.annualTargetQuantity || Math.max((g.targetQuantity || 0) * 12, 0));
            });

            // 5. Aggregate Production Summaries
            let totalProductionYear = 0;
            const aggregatedByMonth: Record<string, number> = {};
            const procAggregation: Record<string, number> = {};
            const productionByMun: Record<string, number> = {};

            // 5a. Manual Production Summaries
            // We search for all 'resumo_producao' subcollections under this entity's professionals
            // Because manual is structured as: municipalities/TYPE/ENT_ID/MUN_ID/professionals/PROF_ID/competencias/COMP_ID/resumo_producao/DATE
            // We can optimize by using collectionGroup('resumo_producao') and filtering in memory or with prefix matching.
            // Since we don't have a direct entityId field in resumo_producao, we must parse the path.
            const allSummariesSnap = await db.collectionGroup('resumo_producao').get();

            for (const doc of allSummariesSnap.docs) {
                const data = doc.data();
                const pathSegments = doc.ref.path.split('/');

                // We must verify if this summary belongs to the requested entity AND year
                let isRelevant = false;
                let munId = '';
                let competence = ''; // YYYY-MM

                // Manual Path: municipalities/{TYPE}/{ENT_ID}/{MUN_ID}/professionals/{PROF_ID}/competencias/{YYYY-MM}/resumo_producao/{DATE}
                // Connector Path: municipalities/{TYPE}/{ENT_ID}/{MUN_ID}/extractions/{YYYY}/competences/{YYYY-MM}/resumo_producao/{DATE_PROFID}

                if (pathSegments.length >= 7 && pathSegments[0] === 'municipalities' && pathSegments[2] === entityId) {
                    munId = pathSegments[3];

                    const compIndex = pathSegments.indexOf('competencias');
                    const extIndex = pathSegments.indexOf('extractions');

                    if (compIndex !== -1 && pathSegments.length > compIndex + 1) {
                        // Manual Record
                        competence = pathSegments[compIndex + 1];
                        if (competence.startsWith(year)) isRelevant = true;
                    } else if (extIndex !== -1 && pathSegments.length > extIndex + 2) {
                        // Connector Record
                        const pathYear = pathSegments[extIndex + 1];
                        if (pathYear === year) {
                            // In extractions, 'competences' is the next folder
                            const compsInd = pathSegments.indexOf('competences', extIndex);
                            if (compsInd !== -1 && pathSegments.length > compsInd + 1) {
                                competence = pathSegments[compsInd + 1];
                                isRelevant = true;
                            }
                        }
                    }
                }

                if (!isRelevant) continue;

                if (!data.units) continue;

                let docTotalQty = 0;

                for (const uId of Object.keys(data.units)) {
                    const unitData = data.units[uId];
                    if (!unitData.professionals) continue;

                    for (const pId of Object.keys(unitData.professionals)) {
                        // Active professional filter for connector records (which have extIndex)
                        if (pathSegments.indexOf('extractions') !== -1 && !activeProfIds.has(pId)) {
                            continue;
                        }

                        const profData = unitData.professionals[pId];
                        if (!profData.procedures) continue;

                        for (const [code, count] of Object.entries(profData.procedures)) {
                            const procQty = Number(count) || 0;
                            if (procQty === 0) continue;

                            docTotalQty += procQty;

                            // Aggregate Top Procedures
                            procAggregation[code] = (procAggregation[code] || 0) + procQty;
                        }
                    }
                }

                if (docTotalQty === 0) continue;

                // Aggregate Total
                totalProductionYear += docTotalQty;

                // Normalize competence to YYYY-MM to prevent chart duplicity
                if (competence) {
                    let normalizedCompetence = competence;
                    const parts = competence.split('-');
                    if (parts.length === 2) {
                        if (parts[0].length === 2 && parts[1].length === 4) {
                            normalizedCompetence = `${parts[1]}-${parts[0]}`; // MM-YYYY to YYYY-MM
                        }
                    }
                    aggregatedByMonth[normalizedCompetence] = (aggregatedByMonth[normalizedCompetence] || 0) + docTotalQty;
                }

                // Aggregate by Municipality
                if (munId) {
                    productionByMun[munId] = (productionByMun[munId] || 0) + docTotalQty;
                }
            }

            // 6. Format Final Payload Struct

            // Build Chart Data
            const sortedMonths = Object.keys(aggregatedByMonth).sort();
            const chartData = sortedMonths.map(m => ({
                month: m,
                procedures: aggregatedByMonth[m]
            }));

            // Build Top Procedures
            const topProcedures = Object.entries(procAggregation)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10);

            // Build Top Municipalities
            const topList = Object.entries(productionByMun)
                .map(([id, value]) => ({
                    name: municipalitiesMap.get(id) || 'Desconhecido',
                    value
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);

            // Calculate Goal Percentage
            const globalAchievementPercent = globalTarget > 0 ? (totalProductionYear / globalTarget) * 100 : 0;

            const finalStats = {
                production: {
                    total: totalProductionYear,
                    trend: 0, // Placeholder
                    trendUp: true,
                    chartData,
                    topProcedures
                },
                professionals: {
                    value: totalProfessionals,
                    trend: 0, // Placeholder
                    trendUp: true
                },
                municipalities: {
                    value: totalMunicipalities,
                    trendUp: true,
                    topList
                },
                goals: {
                    value: `${Math.min(Math.round(globalAchievementPercent), 100)}%`,
                    trend: 0, // Placeholder
                    trendUp: true
                }
            };

            // await logSystemEvent(LogLevel.INFO, 'Dashboard Stats Fetched', { entityId, year, recordsFound: allSummariesSnap.size }, context.auth.uid);
            // Skipping INFO level on fetch to avoid log spam, keeping only ERROR logs. But let's log with a lighter payload if requested.
            // Actually, we'll log it since the user explicitly requested "LOGS de registro de cada execução das funções".
            await logSystemEvent(LogLevel.INFO, 'Dashboard Stats Fetched', { entityId, year, productionTotal: totalProductionYear }, context.auth.uid);

            return finalStats;

        } catch (error: any) {
            console.error('[getDashboardStats] Error:', error);
            await logSystemEvent(LogLevel.ERROR, 'Dashboard Stats Fetched Failed', { entityId: context.auth?.token?.entityId, error: error.message }, context.auth?.uid);
            throw new functions.https.HttpsError('internal', 'Failed to aggregate dashboard statistics.', error.message);
        }
    }
    );
