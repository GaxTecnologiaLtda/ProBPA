import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { logSystemEvent, LogLevel } from '../utils/logger';

export const getGoalsFulfillmentStats = functions
    .region("southamerica-east1")
    .runWith({ memory: "1GB", timeoutSeconds: 540 })
    .https.onCall(async (data, context) => {
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated and associated with an entity.');
        }

        const entityId = context.auth.token.entityId;
        const municipalityId = data.municipalityId;
        const startYear = parseInt(data.startYear || data.year || new Date().getFullYear());
        const endYear = parseInt(data.endYear || data.startYear || data.year || new Date().getFullYear());
        const startMonthBound = data.startMonth || `${startYear}-01`;
        const endMonthBound = data.endMonth || `${endYear}-12`;
        const startDate = data.startDate; // YYYY-MM-DD
        const endDate = data.endDate; // YYYY-MM-DD
        const includeEntity = data.includeEntity === true;

        if (!municipalityId) {
            throw new functions.https.HttpsError('invalid-argument', 'municipalityId is required.');
        }

        const db = admin.firestore();

        console.log(`[getGoalsFulfillmentStats] Fetching for Entity: ${entityId}, Mun: ${municipalityId}, Period: ${startMonthBound} to ${endMonthBound}`);

        try {
            const entityDoc = await db.doc(`entities/${entityId}`).get();
            if (!entityDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Entity not found.');
            }
            const entityData = entityDoc.data();
            const entityType = (entityData?.type === 'Privada' || entityData?.type === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';

            // We need to fetch from Jan to Dec for the given year(s)
            const competencesToFetch: string[] = [];
            for (let y = startYear; y <= endYear; y++) {
                for (let i = 1; i <= 12; i++) {
                    const m = String(i).padStart(2, '0');
                    const compKey = `${y}-${m}`;
                    if (compKey >= startMonthBound && compKey <= endMonthBound) {
                        competencesToFetch.push(compKey);
                    }
                }
            }

            // Result accumulator
            // { [YYYY-MM]: { [procedureCode]: quantity } }
            const result: Record<string, Record<string, number>> = {};
            const breakdown: Record<string, Record<string, any>> = {};
            for (const compFilter of competencesToFetch) {
                result[compFilter] = {};
                breakdown[compFilter] = {};
            }

            const baseMunPath = `municipalities/${entityType}/${entityId}/${municipalityId}`;

            // Fetch Units to iterate manual summaries
            const unitsQuery = await db.collection(`${baseMunPath}/units`).get();
            const unitIds = unitsQuery.docs.map(doc => doc.id);
            const unitIdsSet = new Set(unitIds);

            // --- Fetch Active Professionals (Strict Filter) ---
            const activeProfIds = new Set<string>();
            const cnsMap = new Map<string, string>();
            const cpfMap = new Map<string, string>();
            const nameMap = new Map<string, string>();
            let didFetchActiveProfs = false;

            try {
                const profsSnap = await db.collection(`${baseMunPath}/professionals`).get();
                profsSnap.forEach(d => {
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
                didFetchActiveProfs = true;
                console.log(`[getGoalsFulfillmentStats] Fetched ${activeProfIds.size} active profs for strict filtering.`);
            } catch (err) {
                console.error("[getGoalsFulfillmentStats] Failed to fetch active professionals.", err);
            }

            let totalRecordsParsed = 0;
            const allPromises: Promise<FirebaseFirestore.DocumentData[]>[] = [];

            for (const compFilter of competencesToFetch) {
                const [yearStr, monthStr] = compFilter.split('-');
                const connectorCompId = `${monthStr}-${yearStr}`;
                const monthKey = compFilter;

                // Fetch Manual Summaries
                const manualPromises = unitIds.map(async (uId) => {
                    const manualRef = db.collection(`${baseMunPath}/bpai_records/${uId}/professionals`);
                    try {
                        const profsDocs = await manualRef.listDocuments();
                        const pPromises = profsDocs.map(async (pDoc) => {
                            const sumRef = db.collection(`${baseMunPath}/bpai_records/${uId}/professionals/${pDoc.id}/competencias/${compFilter}/resumo_producao`);
                            const snap = await sumRef.get();
                            return snap.docs.map(d => ({ doc: d, monthKey, source: 'manual' }));
                        });
                        const pDocsArrays = await Promise.all(pPromises);
                        return pDocsArrays.flat();
                    } catch (e) {
                        return [];
                    }
                });

                allPromises.push(...manualPromises);

                // Fetch Connector Summaries
                const connectorRef = db.collection(`${baseMunPath}/extractions/${yearStr}/competences/${connectorCompId}/resumo_producao`);
                allPromises.push(connectorRef.get().then(snap => snap.docs.map(d => ({ doc: d, monthKey, source: 'connector' }))).catch(() => []));
            }

            const docsArrays = await Promise.all(allPromises);
            const allItems = docsArrays.flat() as any[];

            for (const item of allItems) {
                const doc = item.doc;
                const monthKey = item.monthKey;

                // Se houver limite exato de datas, descartar se estivar fora do Range
                if (startDate && endDate) {
                    const docId = doc.id;
                    const datePartMatch = docId.match(/(\d{2})-(\d{2})-(\d{4})/);

                    if (datePartMatch) {
                        const [, d, m, y] = datePartMatch;
                        const docDateIso = `${y}-${m}-${d}`;

                        if (docDateIso < startDate || docDateIso > endDate) {
                            continue; // Pular documento fora do limite de dias
                        }
                    }
                }

                const data = doc.data();
                
                if (!data.units) continue;
                totalRecordsParsed++;

                for (const uId of Object.keys(data.units)) {
                    // Filter unregistered units (allow entity itself if it appears)
                    if (!unitIdsSet.has(uId) && uId !== entityId) continue;
                    
                    const unitData = data.units[uId];
                    if (!unitData.professionals) continue;

                    for (const pId of Object.keys(unitData.professionals)) {
                        const profData = unitData.professionals[pId];

                        // Strict Professional Filter
                        if (didFetchActiveProfs) {
                            let isFound = false;
                            
                            if (activeProfIds.has(pId)) {
                                isFound = true;
                            } else if (pId.length === 15 && cnsMap.has(pId)) {
                                isFound = true;
                            } else if (pId.length === 11 && cpfMap.has(pId)) {
                                isFound = true;
                            } else if (profData.professionalName) {
                                const normName = String(profData.professionalName).trim().toLowerCase();
                                if (nameMap.has(normName)) {
                                    isFound = true;
                                }
                            }

                            if (!isFound) {
                                continue;
                            }
                        }

                        if (!profData.procedures) continue;

                        for (const [code, count] of Object.entries(profData.procedures)) {
                            const procQty = Number(count) || 0;
                            if (procQty > 0) {
                                result[monthKey][code] = (result[monthKey][code] || 0) + procQty;

                                if (!breakdown[monthKey][code]) {
                                    breakdown[monthKey][code] = { manual: 0, connector: 0, actions: 0, professionals: {} };
                                }
                                breakdown[monthKey][code][item.source] += procQty;

                                const profName = String(profData.professionalName || profData.name || pId).trim();
                                if (!breakdown[monthKey][code].professionals[pId]) {
                                    breakdown[monthKey][code].professionals[pId] = { name: profName, qty: 0 };
                                }
                                breakdown[monthKey][code].professionals[pId].qty += procQty;
                            }
                        }
                    }
                }
            }

            if (includeEntity) {
                let totalActionProdsParsed = 0;
                for (const compFilter of competencesToFetch) {
                    const monthKey = compFilter;
                    try {
                        const actionsSnap = await db.collection(`entities/${entityId}/actions/${compFilter}/actions`)
                            .where('municipalityId', '==', municipalityId)
                            .get();

                        const prodPromises = actionsSnap.docs.map(async (actionDoc) => {
                            const actionData = actionDoc.data();
                            const prodSnap = await db.collection(actionDoc.ref.path + '/production').get();
                            return prodSnap.docs.map(d => ({ docId: d.id, data: d.data(), actionDate: actionData.date }));
                        });

                        const prodDocsArrays = await Promise.all(prodPromises);
                        const allProdDocs = prodDocsArrays.flat();

                        for (const prod of allProdDocs) {
                            const data = prod.data;

                            if (startDate && endDate) {
                                const attendanceIso = data.attendanceDate || prod.actionDate;
                                if (attendanceIso && (attendanceIso < startDate || attendanceIso > endDate)) continue;
                            }

                            if (!data.procedures || !Array.isArray(data.procedures)) continue;
                            totalActionProdsParsed++;

                            for (const proc of data.procedures) {
                                if (proc.code) {
                                    result[monthKey][proc.code] = (result[monthKey][proc.code] || 0) + 1;

                                    if (!breakdown[monthKey][proc.code]) {
                                        breakdown[monthKey][proc.code] = { manual: 0, connector: 0, actions: 0, professionals: {} };
                                    }
                                    breakdown[monthKey][proc.code].actions = (breakdown[monthKey][proc.code].actions || 0) + 1;

                                    const pId = data.professionalId || 'unknown';
                                    const profName = String(data.professionalName || pId).trim();
                                    if (!breakdown[monthKey][proc.code].professionals[pId]) {
                                        breakdown[monthKey][proc.code].professionals[pId] = { name: profName, qty: 0 };
                                    }
                                    breakdown[monthKey][proc.code].professionals[pId].qty += 1;
                                }
                            }
                        }
                    } catch (e) {
                        console.error("[getGoalsFulfillmentStats] Failed to fetch Actions Production", compFilter, e);
                    }
                }
                console.log(`[getGoalsFulfillmentStats] Found ${totalActionProdsParsed} action production records for entity.`);
            } else {
                console.log(`[getGoalsFulfillmentStats] Skipped Entity Actions per user request.`);
            }

            console.log(`[getGoalsFulfillmentStats] Found ${totalRecordsParsed} summary docs.`);

            return {
                success: true,
                data: result,
                breakdown: breakdown
            };

        } catch (error: any) {
            console.error('[getGoalsFulfillmentStats] Error:', error);
            await logSystemEvent(LogLevel.ERROR, 'getGoalsFulfillmentStats Error', {
                error: error.message,
                entityId,
                municipalityId,
                period: `${startYear}-${endYear}`
            });
            throw new functions.https.HttpsError('internal', 'Ocorreu um erro ao buscar os dados do cumprimento de metas.');
        }
    });
