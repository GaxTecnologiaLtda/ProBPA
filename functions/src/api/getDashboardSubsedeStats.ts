import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { logSystemEvent, LogLevel } from '../utils/logger';

export const getDashboardSubsedeStats = functions
    .region("southamerica-east1")
    .runWith({ memory: "512MB", timeoutSeconds: 300 })
    .https.onCall(async (data, context) => {
        // 1. Authentication and Authorization Check
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated and associated with an entity.');
        }

        const entityId = context.auth.token.entityId;
        const municipalityId = data.municipalityId || context.auth.token.municipalityId;
        const year = data.year || String(new Date().getFullYear());
        const rawCompetence = data.competence || 'Global';

        let targetCompetence = '';
        if (rawCompetence !== 'Global') {
            const parts = rawCompetence.split('/');
            if (parts.length === 2) {
                targetCompetence = `${parts[1]}-${parts[0]}`; // Converts MM/YYYY to YYYY-MM
            }
        }

        const db = admin.firestore();

        if (!municipalityId) {
            throw new functions.https.HttpsError('invalid-argument', 'Municipality ID is required for Subsede stats.');
        }

        console.log(`[getDashboardSubsedeStats] Fetching stats for Entity: ${entityId}, Municipality: ${municipalityId}, Year: ${year}`);

        try {
            // 2. Fetch Entity Context
            const entityDoc = await db.doc(`entities/${entityId}`).get();
            if (!entityDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Entity not found.');
            }

            // 3. Parallel fetch of Contextual Counts (Professionals & Units & Goals)
            // Note: Since professional paths might differ slightly based on PUBLIC vs PRIVATE, we can just query root and filter the array by assignment.
            // But since SUBSEDE has them securely mirrored at `municipalities/PRIVATE/{entId}/{munId}/professionals`, we can just query that!
            // Wait, what if it's PUBLIC? Let's query root and filter by municipalityId assignment or just try both.
            // Actually, we can fetch from root `professionals` where `entityId == entityId` and filter in memory since auth rules allow.
            const allProfsQuery = db.collection('professionals').where('entityId', '==', entityId);

            const unitsQuery = db.collection('units').where('entityId', '==', entityId).where('municipalityId', '==', municipalityId);

            // Goals mapped to municipality
            const goalsQuery = db.collectionGroup('goals').where('entityId', '==', entityId);

            const [profsSnap, unitsSnap, goalsSnap] = await Promise.all([
                allProfsQuery.get(),
                unitsQuery.get(),
                goalsQuery.get()
            ]);

            const activeProfIds = new Set<string>();
            let totalProfessionals = 0;

            profsSnap.forEach(doc => {
                const p = doc.data();
                const assignments = p.assignments || [];
                const isLinked = assignments.some((a: any) => a.municipalityId === municipalityId);
                if (isLinked) {
                    activeProfIds.add(doc.id);
                    totalProfessionals++;
                }
            });

            const totalUnits = unitsSnap.size;

            // 4. Calculate Goals
            let globalTarget = 0;
            goalsSnap.forEach(doc => {
                const g = doc.data();
                // Check if goal is linked to the municipality
                if (g.municipalityId === municipalityId) {
                    globalTarget += (g.annualTargetQuantity || Math.max((g.targetQuantity || 0) * 12, 0));
                }
            });

            // 5. Aggregate Production Summaries
            let totalProductionYear = 0;
            const aggregatedByMonth: Record<string, number> = {};
            const procAggregation: Record<string, number> = {};

            // We search for all 'resumo_producao' subcollections under this entity's professionals
            const allSummariesSnap = await db.collectionGroup('resumo_producao').get();

            for (const doc of allSummariesSnap.docs) {
                const data = doc.data();
                const pathSegments = doc.ref.path.split('/');

                let isRelevant = false;
                let munId = '';
                let competence = ''; // YYYY-MM

                // Manual Path: municipalities/{TYPE}/{ENT_ID}/{MUN_ID}/professionals/{PROF_ID}/competencias/{YYYY-MM}/resumo_producao/{DATE}
                // Connector Path: municipalities/{TYPE}/{ENT_ID}/{MUN_ID}/extractions/{YYYY}/competences/{YYYY-MM}/resumo_producao/{DATE_PROFID}

                if (pathSegments.length >= 7 && pathSegments[0] === 'municipalities' && pathSegments[2] === entityId) {
                    munId = pathSegments[3];

                    // Filter specifically for this municipality!
                    if (munId !== municipalityId) continue;

                    const compIndex = pathSegments.indexOf('competencias');
                    const extIndex = pathSegments.indexOf('extractions');

                    if (compIndex !== -1 && pathSegments.length > compIndex + 1) {
                        // Manual Record
                        competence = pathSegments[compIndex + 1];
                    } else if (extIndex !== -1 && pathSegments.length > extIndex + 2) {
                        // Connector Record

                        // In extractions, 'competences' is the next folder
                        const compsInd = pathSegments.indexOf('competences', extIndex);
                        if (compsInd !== -1 && pathSegments.length > compsInd + 1) {
                            competence = pathSegments[compsInd + 1];
                        }
                    }
                }

                if (!competence) continue;

                // Normalize competence to YYYY-MM 
                let normalizedCompetence = competence;
                const cparts = competence.split('-');
                if (cparts.length === 2) {
                    if (cparts[0].length === 2 && cparts[1].length === 4) {
                        normalizedCompetence = `${cparts[1]}-${cparts[0]}`; // MM-YYYY to YYYY-MM
                    }
                }

                // Filter Logic:
                // If a specific competence is requested, match it exactly.
                // Otherwise ("Global"), match the requested year.
                if (targetCompetence) {
                    if (normalizedCompetence !== targetCompetence) isRelevant = false;
                    else isRelevant = true;
                } else {
                    if (normalizedCompetence.startsWith(year)) isRelevant = true;
                    else isRelevant = false;
                }

                if (!isRelevant) continue;

                if (!data.units) continue;

                let docTotalQty = 0;

                for (const uId of Object.keys(data.units)) {
                    const unitData = data.units[uId];
                    if (!unitData.professionals) continue;

                    for (const pId of Object.keys(unitData.professionals)) {
                        // Active professional filter for connector records
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

                // Aggregate for Chart (Monthly breakdown)
                aggregatedByMonth[normalizedCompetence] = (aggregatedByMonth[normalizedCompetence] || 0) + docTotalQty;
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
                units: {
                    value: totalUnits,
                    trendUp: true,
                },
                goals: {
                    value: `${Math.min(Math.round(globalAchievementPercent), 100)}%`,
                    trend: 0, // Placeholder
                    trendUp: true
                }
            };

            await logSystemEvent(LogLevel.INFO, 'Dashboard Subsede Stats Fetched', { entityId, municipalityId, year, productionTotal: totalProductionYear }, context.auth.uid);

            return finalStats;

        } catch (error: any) {
            console.error('[getDashboardSubsedeStats] Error:', error);
            await logSystemEvent(LogLevel.ERROR, 'Dashboard Subsede Stats Fetched Failed', { entityId: context.auth?.token?.entityId, error: error.message }, context.auth?.uid);
            throw new functions.https.HttpsError('internal', 'Failed to aggregate dashboard subsede statistics.', error.message);
        }
    }
    );
