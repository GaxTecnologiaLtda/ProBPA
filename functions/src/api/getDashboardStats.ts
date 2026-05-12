import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { logSystemEvent, LogLevel } from '../utils/logger';

export const getDashboardStats = functions
    .region("southamerica-east1")
    .runWith({ memory: "1GB", timeoutSeconds: 540 })
    .https.onCall(async (data, context) => {
        // 1. Authentication and Authorization Check
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated and associated with an entity.');
        }

        const entityId = context.auth.token.entityId;
        const year = data.year || String(new Date().getFullYear());
        const month = data.month; // Optional YYYY-MM
        const day = data.day; // Optional DD
        const reqMunicipalityId = data.municipalityId; // Optional Municipality ID
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
            const cnsMap = new Map<string, string>();
            const cpfMap = new Map<string, string>();
            const nameMap = new Map<string, string>();

            profsSnap.forEach(doc => {
                const id = doc.id;
                const pData = doc.data();
                activeProfIds.add(id);

                const norm = (str: any) => String(str || '').replace(/\D/g, '');
                
                const cns = norm(pData.cns);
                if (cns.length === 15) cnsMap.set(cns, id);
                
                const cpf = norm(pData.cpf);
                if (cpf.length === 11) cpfMap.set(cpf, id);
                
                if (pData.name) nameMap.set(String(pData.name).trim().toLowerCase(), id);
            });

            const municipalitiesMap = new Map<string, string>();
            munsSnap.forEach(doc => {
                municipalitiesMap.set(doc.id, doc.data().name || 'Desconhecido');
            });

            // Fetch Units to filter production
            const activeUnitIds = new Set<string>();
            const unitsSnap = await db.collectionGroup('units').get();
            const entityUnitsDocs = unitsSnap.docs.filter(d => d.ref.path.includes(`/${entityId}/`));
            entityUnitsDocs.forEach(d => activeUnitIds.add(d.id));

            // 4. Calculate Goals and Extract Pactuated Rules
            let globalTarget = 0;
            const pactuatedRules: Array<{ code: string; isMacro: boolean; municipalityId?: string }> = [];

            goalsSnap.forEach(doc => {
                const g = doc.data();
                const target = g.annualTargetQuantity || Math.max((g.targetQuantity || 0) * 12, 0);
                globalTarget += target;

                // Extract rule for pactuated check
                if (g.procedureCode) {
                    const gCode = String(g.procedureCode).replace(/\D/g, '');
                    if (gCode) {
                        const isMacro = (g.sigtapTargetType && ['Group', 'SubGroup', 'Form', 'Grupo', 'Subgrupo', 'Forma'].includes(g.sigtapTargetType)) || gCode.length < 10;
                        pactuatedRules.push({
                            code: gCode,
                            isMacro,
                            municipalityId: g.goalType === 'municipal' ? g.municipalityId : undefined // If not municipal, it applies to the entity generally (or we assume it's pactuated for the entity's network)
                        });
                    }
                }
            });

            // 5. Aggregate Production Summaries
            let totalPactuatedYear = 0;
            let totalNonPactuatedYear = 0;
            const aggregatedByMonth: Record<string, { pactuated: number, nonPactuated: number }> = {};
            const procAggregation: Record<string, number> = {};
            const productionByMun: Record<string, { pactuated: number, nonPactuated: number }> = {};

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

                    if (reqMunicipalityId && munId !== reqMunicipalityId) {
                        continue; // Skip if filtering by a specific municipality
                    }

                    const compIndex = pathSegments.indexOf('competencias');
                    const extIndex = pathSegments.indexOf('extractions');

                    if (compIndex !== -1 && pathSegments.length > compIndex + 1) {
                        // Manual Record
                        competence = pathSegments[compIndex + 1];

                        // Normalize early to YYYY-MM
                        const parts = competence.split('-');
                        if (parts.length === 2 && parts[0].length === 2 && parts[1].length === 4) {
                            competence = `${parts[1]}-${parts[0]}`;
                        }

                        if (competence.startsWith(year)) {
                            if (month) {
                                if (competence === month) isRelevant = true;
                            } else {
                                isRelevant = true;
                            }
                        }
                    } else if (extIndex !== -1 && pathSegments.length > extIndex + 2) {
                        // Connector Record
                        const pathYear = pathSegments[extIndex + 1];
                        if (pathYear === year) {
                            // In extractions, 'competences' is the next folder
                            const compsInd = pathSegments.indexOf('competences', extIndex);
                            if (compsInd !== -1 && pathSegments.length > compsInd + 1) {
                                competence = pathSegments[compsInd + 1];

                                // Normalize early to YYYY-MM
                                const parts = competence.split('-');
                                if (parts.length === 2 && parts[0].length === 2 && parts[1].length === 4) {
                                    competence = `${parts[1]}-${parts[0]}`;
                                }

                                if (month) {
                                    if (competence === month) isRelevant = true;
                                } else {
                                    isRelevant = true;
                                }
                            }
                        }
                    }
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
                        const profData = unitData.professionals[pId];

                        // Strict Professional Filter:
                        // Find if this professional from the summary actually belongs to the Entity's Roster
                        let isFound = false;

                        // 1. Check ID directly
                        if (activeProfIds.has(pId)) {
                            isFound = true;
                        } 
                        // 2. Check if pId is a CNS or CPF
                        else if (pId.length === 15 && cnsMap.has(pId)) {
                            isFound = true;
                        } else if (pId.length === 11 && cpfMap.has(pId)) {
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

                        if (!profData.procedures) continue;

                        for (const [rawCode, count] of Object.entries(profData.procedures)) {
                            const procQty = Number(count) || 0;
                            if (procQty === 0) continue;
                            
                            const cleanCode = String(rawCode).replace(/\D/g, '');

                            // Check Pactuation
                            let isPactuated = false;
                            for (const rule of pactuatedRules) {
                                // If rule is specific to a municipality, and we are in a different municipality, skip this rule
                                if (rule.municipalityId && rule.municipalityId !== munId) continue;

                                if (rule.isMacro) {
                                    if (cleanCode.startsWith(rule.code)) {
                                        isPactuated = true;
                                        break;
                                    }
                                } else {
                                    if (cleanCode === rule.code) {
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

                            // Aggregate Top Procedures (combines both for overall volume)
                            procAggregation[rawCode] = (procAggregation[rawCode] || 0) + procQty;
                        }
                    }
                }

                const docTotalQty = docPactuatedQty + docNonPactuatedQty;
                if (docTotalQty === 0) continue;

                // Aggregate Totals
                totalPactuatedYear += docPactuatedQty;
                totalNonPactuatedYear += docNonPactuatedQty;

                // Normalize competence to YYYY-MM to prevent chart duplicity
                if (competence) {
                    let normalizedCompetence = competence;
                    const parts = competence.split('-');
                    if (parts.length === 2) {
                        if (parts[0].length === 2 && parts[1].length === 4) {
                            normalizedCompetence = `${parts[1]}-${parts[0]}`; // MM-YYYY to YYYY-MM
                        }
                    }
                    if (!aggregatedByMonth[normalizedCompetence]) {
                        aggregatedByMonth[normalizedCompetence] = { pactuated: 0, nonPactuated: 0 };
                    }
                    aggregatedByMonth[normalizedCompetence].pactuated += docPactuatedQty;
                    aggregatedByMonth[normalizedCompetence].nonPactuated += docNonPactuatedQty;
                }

                // Aggregate by Municipality
                if (munId) {
                    if (!productionByMun[munId]) {
                        productionByMun[munId] = { pactuated: 0, nonPactuated: 0 };
                    }
                    productionByMun[munId].pactuated += docPactuatedQty;
                    productionByMun[munId].nonPactuated += docNonPactuatedQty;
                }
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

            // Build Top Municipalities (Ranked by Total Volume, but split visually)
            const topList = Object.entries(productionByMun)
                .map(([id, stats]) => ({
                    name: municipalitiesMap.get(id) || 'Desconhecido',
                    value: stats.pactuated,
                    nonPactuated: stats.nonPactuated,
                    totalVolume: stats.pactuated + stats.nonPactuated
                }))
                .sort((a, b) => b.totalVolume - a.totalVolume)
                .map(({ totalVolume, ...rest }) => rest) // Clean up totalVolume
                .slice(0, 5);

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
                municipalities: {
                    value: reqMunicipalityId ? 1 : totalMunicipalities,
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
            await logSystemEvent(LogLevel.INFO, 'Dashboard Stats Fetched', { entityId, year, pactuated: totalPactuatedYear, nonPactuated: totalNonPactuatedYear }, context.auth.uid);

            return finalStats;

        } catch (error: any) {
            console.error('[getDashboardStats] Error:', error);
            await logSystemEvent(LogLevel.ERROR, 'Dashboard Stats Fetched Failed', { entityId: context.auth?.token?.entityId, error: error.message }, context.auth?.uid);
            throw new functions.https.HttpsError('internal', 'Failed to aggregate dashboard statistics.', error.message);
        }
    }
    );
