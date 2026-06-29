import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { logSystemEvent, LogLevel } from '../utils/logger';

export const getDashboardSubsedeStats = functions
    .region("southamerica-east1")
    .runWith({ memory: "1GB", timeoutSeconds: 540 })
    .https.onCall(async (data, context) => {
        // 1. Authentication and Authorization Check
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated and associated with an entity.');
        }

        const entityId = context.auth.token.entityId;
        const municipalityId = data.municipalityId || context.auth.token.municipalityId;
        const year = data.year || String(new Date().getFullYear());
        const month = data.month; // Optional YYYY-MM
        const day = data.day; // Optional DD

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

            const entityData = entityDoc.data();
            const entityType = (entityData?.type === 'Privada' || entityData?.type === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';

            // 3. Parallel fetch of Contextual Counts (Professionals & Units & Goals)
            const allProfsQuery = db.collection('professionals').where('entityId', '==', entityId);

            const unitsQuery = db.collection(`municipalities/${entityType}/${entityId}/${municipalityId}/units`);

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
            const activeUnitIds = new Set(unitsSnap.docs.map(d => d.id));

            // 4. Calculate Goals and Extract Pactuated Rules
            let globalTarget = 0;
            const pactuatedRules: Array<{ codeType?: 'macro' | 'specific'; value?: string; code?: string; isMacro?: boolean; municipalityId?: string }> = [];

            goalsSnap.forEach(doc => {
                const g = doc.data();
                if (g.status === 'Inativa') return; // Skip inactive goals for pactuated count

                // Check if goal is linked to the municipality
                const isGoalForMun = g.municipalityId === municipalityId || g.municipalityId === 'all' || !g.municipalityId;

                if (isGoalForMun) {
                    globalTarget += (g.annualTargetQuantity || Math.max((g.targetQuantity || 0) * 12, 0));

                    // Extract rule for pactuated check
                    if (g.procedureCode) {
                        let codes = g.procedureCode;
                        if (typeof codes === 'string') {
                            codes = [codes];
                        }
                        if (Array.isArray(codes)) {
                            for (const c of codes) {
                                const trimC = String(c).trim();
                                if (trimC.length === 2) {
                                    pactuatedRules.push({ codeType: 'macro', value: trimC });
                                } else if (trimC.length === 10) {
                                    pactuatedRules.push({ codeType: 'specific', value: trimC });
                                }
                            }
                        }
                    } else if (g.procedures && Array.isArray(g.procedures)) {
                         g.procedures.forEach((proc: any) => {
                            const code = String(proc.code || proc).trim();
                            if (code.length === 10) {
                                pactuatedRules.push({ codeType: 'specific', value: code });
                            } else if (code.length === 2) {
                                pactuatedRules.push({ codeType: 'macro', value: code });
                            }
                        });
                    }
                }
            });

            // 5. Aggregate Production Summaries
            let totalPactuatedYear = 0;
            let totalNonPactuatedYear = 0;
            const aggregatedByMonth: Record<string, { pactuated: number, nonPactuated: number }> = {};
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
                // If a specific month is requested, match it exactly.
                // Otherwise match the requested year.
                if (month) {
                    if (normalizedCompetence === month) isRelevant = true;
                } else if (normalizedCompetence.startsWith(year)) {
                    isRelevant = true;
                }

                if (!isRelevant) continue;

                if (day) {
                    // doc.id is typically DD-MM-YYYY
                    if (!doc.id.startsWith(`${day}-`)) {
                        continue;
                    }
                }

                if (!data.units) continue;

                let docPactuatedQty = 0;
                let docNonPactuatedQty = 0;

                for (const uId of Object.keys(data.units)) {
                    // Filter unregistered units (allow entity itself if it appears)
                    if (!activeUnitIds.has(uId) && uId !== entityId) continue;
                    
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

                            // Check Pactuation Rule
                            let isPactuated = false;
                            for (const rule of pactuatedRules) {
                                if (rule.municipalityId && rule.municipalityId !== municipalityId) {
                                    continue;
                                }

                                if (rule.codeType === 'macro' && rule.value) {
                                    if (code.startsWith(rule.value)) {
                                        isPactuated = true;
                                        break;
                                    }
                                } else if (rule.codeType === 'specific' && rule.value) {
                                    if (code === rule.value) {
                                        isPactuated = true;
                                        break;
                                    }
                                } else if (rule.isMacro && rule.code) { // Fallback to old property if codeType not set
                                     if (code.startsWith(rule.code)) {
                                        isPactuated = true;
                                        break;
                                    }
                                } else if (rule.code) {
                                     if (code === rule.code) {
                                        isPactuated = true;
                                        break;
                                    }
                                }
                            }

                            if (isPactuated) {
                                docPactuatedQty += procQty;
                            } else {
                                docNonPactuatedQty += procQty;
                            }

                            // Aggregate Top Procedures
                            procAggregation[code] = (procAggregation[code] || 0) + procQty;
                        }
                    }
                }

                if (docPactuatedQty === 0 && docNonPactuatedQty === 0) continue;

                // Aggregate Total
                totalPactuatedYear += docPactuatedQty;
                totalNonPactuatedYear += docNonPactuatedQty;

                if (!aggregatedByMonth[normalizedCompetence]) {
                    aggregatedByMonth[normalizedCompetence] = { pactuated: 0, nonPactuated: 0 };
                }

                // Aggregate for Chart (Monthly breakdown)
                aggregatedByMonth[normalizedCompetence].pactuated += docPactuatedQty;
                aggregatedByMonth[normalizedCompetence].nonPactuated += docNonPactuatedQty;
            }

            // 6. Format Final Payload Struct

            // Build Chart Data
            const sortedMonths = Object.keys(aggregatedByMonth).sort();
            const chartData = sortedMonths.map(m => ({
                month: m,
                procedures: aggregatedByMonth[m].pactuated,
                nonPactuated: aggregatedByMonth[m].nonPactuated
            }));

            // Build Top Procedures
            const topProcedures = Object.entries(procAggregation)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10);

            // Calculate Goal Percentage
            const globalAchievementPercent = globalTarget > 0 ? (totalPactuatedYear / globalTarget) * 100 : 0;

            const finalStats = {
                production: {
                    total: totalPactuatedYear,
                    totalNonPactuated: totalNonPactuatedYear,
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

            await logSystemEvent(LogLevel.INFO, 'Dashboard Subsede Stats Fetched', { entityId, municipalityId, year, productionTotal: totalPactuatedYear + totalNonPactuatedYear }, context.auth.uid);

            return finalStats;

        } catch (error: any) {
            console.error('[getDashboardSubsedeStats] Error:', error);
            await logSystemEvent(LogLevel.ERROR, 'Dashboard Subsede Stats Fetched Failed', { entityId: context.auth?.token?.entityId, error: error.message }, context.auth?.uid);
            throw new functions.https.HttpsError('internal', 'Failed to aggregate dashboard subsede statistics.', error.message);
        }
    }
    );
