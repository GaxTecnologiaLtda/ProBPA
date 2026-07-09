import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { logSystemEvent, LogLevel } from '../utils/logger';

export const getUnitComparativeStats = functions
    .region("southamerica-east1")
    .runWith({ memory: "1GB", timeoutSeconds: 540 })
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

                while (currentMonth <= end && loopCount < 240) {
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
            const breakdown: Record<string, Record<string, any>> = {};

            const baseMunPath = `municipalities/${entityType}/${entityId}/${municipalityId}`;

            // --- Fetch Active Professionals for Filtering ---
            const activeProfIds = new Set<string>();
            const cnsMap = new Map<string, string>();
            const cpfMap = new Map<string, string>();
            const nameMap = new Map<string, string>();
            let didFetchActiveProfs = false;

            try {
                const profsSnap = await db.collection(`${baseMunPath}/professionals`).get();
                profsSnap.forEach(d => {
                    const id = d.id;
                    const pData = d.data();
                    activeProfIds.add(id);

                    const norm = (str: any) => String(str || '').replace(/\D/g, '');

                    const cns = norm(pData.cns);
                    if (cns.length === 15) cnsMap.set(cns, id);

                    const cpf = norm(pData.cpf);
                    if (cpf.length === 11) cpfMap.set(cpf, id);

                    const normalize = (val: string) => String(val || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                    if (pData.name) nameMap.set(normalize(pData.name), id);
                });
                didFetchActiveProfs = true;
                console.log(`[getUnitComparativeStats] Loaded ${profsSnap.size} active professionals for filtering.`);
            } catch (err) {
                console.error("[getUnitComparativeStats] Failed to fetch active professionals.", err);
            }

            // Fetch Units to iterate manual summaries (since manual is grouped by unit)
            const unitsQuery = await db.collection(`${baseMunPath}/units`).get();
            const unitIds = unitsQuery.docs.map(doc => doc.id);
            const unitIdsSet = new Set(unitIds);
            const unitCnesToIdMap = new Map<string, string>();
            unitsQuery.docs.forEach(d => {
                const u = d.data();
                if (u.cnes) {
                    const cleanCnes = String(u.cnes).trim().padStart(7, '0');
                    unitCnesToIdMap.set(cleanCnes, d.id);
                }
            });

            let totalRecordsParsed = 0;

            const allPromises: Promise<FirebaseFirestore.DocumentData[]>[] = [];

            for (const compFilter of competencesToFetch) {
                const year = compFilter.split('-')[0];
                const connectorCompId = `${compFilter.split('-')[1]}-${compFilter.split('-')[0]}`; // MM-YYYY

                // Fetch Manual Summaries (Stored under bpai_records/{unitId}/professionals/{profId}/competencias/{comp}/resumo_producao/{date})
                const manualPromises = unitIds.map(async (uId) => {
                    const manualRef = db.collection(`${baseMunPath}/bpai_records/${uId}/professionals`);
                    try {
                        const profsDocs = await manualRef.listDocuments();
                        const pPromises = profsDocs.map(async (pDoc) => {
                            const pId = pDoc.id;
                            const sumRef = db.collection(`${baseMunPath}/bpai_records/${uId}/professionals/${pId}/competencias/${compFilter}/resumo_producao`);
                            const snap = await sumRef.get();
                            return snap.docs.map(d => ({ doc: d, source: 'manual' }));
                        });
                        const pDocsArrays = await Promise.all(pPromises);
                        return pDocsArrays.flat();
                    } catch (e) {
                        return [];
                    }
                });

                allPromises.push(...manualPromises);

                // Fetch Connector Summaries
                const connectorRef = db.collection(`${baseMunPath}/extractions/${year}/competences/${connectorCompId}/resumo_producao`);
                allPromises.push(connectorRef.get().then(snap => snap.docs.map(d => ({ doc: d, source: 'connector' }))).catch(() => []));
            }

            const docsArrays = await Promise.all(allPromises);
            const allItems = docsArrays.flat() as any[];

            for (const item of allItems) {
                const doc = item.doc;
                const source = item.source; // 'manual' | 'connector'
                
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
                    // Filter unregistered units (allow entity itself if it appears)
                    let normalizedUnitId = uId;
                    if (unitCnesToIdMap.has(uId)) {
                        normalizedUnitId = unitCnesToIdMap.get(uId)!;
                    }

                    if (!unitIdsSet.has(normalizedUnitId) && normalizedUnitId !== entityId) continue;
                    
                    const unitData = data.units[uId];
                    if (!unitData.professionals) continue;

                    if (!result[normalizedUnitId]) {
                        result[normalizedUnitId] = {};
                        breakdown[normalizedUnitId] = {};
                    }

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
                                const normalize = (val: string) => String(val || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                const normName = normalize(profData.professionalName);
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
                                result[normalizedUnitId][code] = (result[normalizedUnitId][code] || 0) + procQty;
                                if (!breakdown[normalizedUnitId][code]) breakdown[normalizedUnitId][code] = { manual: 0, connector: 0, professionals: {} };
                                breakdown[normalizedUnitId][code][source] += procQty;
                                const profName = String(profData.professionalName || profData.name || pId).trim();
                                if (!breakdown[normalizedUnitId][code].professionals[pId]) {
                                    breakdown[normalizedUnitId][code].professionals[pId] = { name: profName, qty: 0 };
                                }
                                breakdown[normalizedUnitId][code].professionals[pId].qty += procQty;
                            }
                        }
                    }
                }
            }

            // --- Fetch Entity Actions & Programs Production ---
            let totalActionProdsParsed = 0;
            for (const compFilter of competencesToFetch) {
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

                        // Filtering by dates
                        if (startDate && endDate) {
                            const attendanceIso = data.attendanceDate || prod.actionDate;
                            if (attendanceIso && (attendanceIso < startDate || attendanceIso > endDate)) {
                                continue;
                            }
                        }

                        if (!data.procedures || !Array.isArray(data.procedures)) continue;
                        totalActionProdsParsed++;

                        if (!result[entityId]) {
                            result[entityId] = {};
                            if (!breakdown[entityId]) breakdown[entityId] = {};
                        }

                        for (const proc of data.procedures) {
                            if (proc.code) {
                                result[entityId][proc.code] = (result[entityId][proc.code] || 0) + 1;
                                if (!breakdown[entityId][proc.code]) breakdown[entityId][proc.code] = { manual: 0, connector: 0, actions: 0, professionals: {} };
                                breakdown[entityId][proc.code].actions = (breakdown[entityId][proc.code].actions || 0) + 1;
                                
                                const pId = data.professionalId || 'unknown';
                                const profName = String(data.professionalName || pId).trim();
                                if (!breakdown[entityId][proc.code].professionals[pId]) {
                                    breakdown[entityId][proc.code].professionals[pId] = { name: profName, qty: 0 };
                                }
                                breakdown[entityId][proc.code].professionals[pId].qty += 1;
                            }
                        }
                    }
                } catch (e) {
                    console.error("[getUnitComparativeStats] Failed to fetch Actions Production", compFilter, e);
                }
            }
            console.log(`[getUnitComparativeStats] Found ${totalActionProdsParsed} action production records for entity.`);

            console.log(`[getUnitComparativeStats] Found ${totalRecordsParsed} summary docs, aggregated into ${Object.keys(result).length} units.`);

            // --- 6. Bulk Fetch Sigtap Details ---
            const uniqueCodes = new Set<string>();
            for (const uId of Object.keys(result)) {
                for (const code of Object.keys(result[uId])) {
                    uniqueCodes.add(code);
                }
            }

            const procedureDetails: Record<string, any> = {};
            const codesArray = Array.from(uniqueCodes);

            console.log(`[getUnitComparativeStats] Resolving details for ${codesArray.length} unique procedures...`);

            if (codesArray.length > 0) {
                // Split into chunks of 30 for the 'in' query
                const chunks: string[][] = [];
                for (let i = 0; i < codesArray.length; i += 30) {
                    chunks.push(codesArray.slice(i, i + 30));
                }

                // We will also cache the Group/Sub/Forma names to avoid redundant queries if we wanted it perfectly, 
                // but for now, we'll extract group strings or just provide the procedure names.
                // Wait, users want grouping by Subgroup/Group. The document in 'procedimentos' might not contain the group Name, only the group code in its path.
                // Let's fetch the procedures first.
                const procPromises = chunks.map(chunk =>
                    db.collectionGroup('procedimentos').where('code', 'in', chunk).get()
                );

                const procSnapshots = await Promise.all(procPromises);

                // Track which group/sub/form names we need to fetch
                const groupRefsToFetch = new Set<string>();

                for (const snap of procSnapshots) {
                    for (const doc of snap.docs) {
                        const data = doc.data();
                        const code = data.code || doc.id;

                        if (!procedureDetails[code]) {
                            const pathSegments = doc.ref.path.split('/');
                            // sigtap/{compId}/grupos/{g}/subgrupos/{s}/formas/{f}/procedimentos/{p}
                            const compIdIdx = pathSegments.indexOf('sigtap') + 1;
                            const compId = pathSegments[compIdIdx];

                            const gIdx = pathSegments.indexOf('grupos');
                            const sIdx = pathSegments.indexOf('subgrupos');
                            const fIdx = pathSegments.indexOf('formas');

                            const groupCode = gIdx !== -1 ? pathSegments[gIdx + 1] : code.substring(0, 2);
                            const subGroupCode = sIdx !== -1 ? pathSegments[sIdx + 1] : code.substring(2, 4);
                            const formCode = fIdx !== -1 ? pathSegments[fIdx + 1] : code.substring(4, 6);

                            procedureDetails[code] = {
                                procedureCode: code,
                                procedureName: data.name || 'Nome Desconhecido',
                                groupCode,
                                subGroupCode,
                                formCode,
                                compId
                            };

                            if (gIdx !== -1) {
                                groupRefsToFetch.add(`sigtap/${compId}/grupos/${groupCode}`);
                                groupRefsToFetch.add(`sigtap/${compId}/grupos/${groupCode}/subgrupos/${subGroupCode}`);
                                groupRefsToFetch.add(`sigtap/${compId}/grupos/${groupCode}/subgrupos/${subGroupCode}/formas/${formCode}`);
                            }
                        }
                    }
                }

                // We'll leave group names slightly bare unless we need them strictly, to save 100s of reads. 
                // Actually, doing a few dozen reads for groups is fine.
                const nameMap = new Map<string, string>();
                if (groupRefsToFetch.size > 0 && groupRefsToFetch.size < 300) { // Safety limit
                    const refsArray = Array.from(groupRefsToFetch);
                    const refsChunks: string[][] = [];
                    for (let i = 0; i < refsArray.length; i += 100) {
                        refsChunks.push(refsArray.slice(i, i + 100)); // Firebase getAll max is 100
                    }

                    for (const chunk of refsChunks) {
                        const docRefs = chunk.map(path => db.doc(path));
                        const snaps = await db.getAll(...docRefs);
                        snaps.forEach(snap => {
                            if (snap.exists) {
                                nameMap.set(snap.ref.path, snap.data()?.name || 'Desconhecido');
                            }
                        });
                    }
                }

                // Enrich procedureDetails with Group Names
                for (const code of Object.keys(procedureDetails)) {
                    const pd = procedureDetails[code];
                    const baseGroupPath = `sigtap/${pd.compId}/grupos/${pd.groupCode}`;
                    const baseSubPath = `${baseGroupPath}/subgrupos/${pd.subGroupCode}`;
                    const baseFormPath = `${baseSubPath}/formas/${pd.formCode}`;

                    pd.groupName = nameMap.get(baseGroupPath) || `Grupo ${pd.groupCode}`;
                    pd.subGroupName = nameMap.get(baseSubPath) || `Subgrupo ${pd.subGroupCode}`;
                    pd.formName = nameMap.get(baseFormPath) || `Forma ${pd.formCode}`;

                    // Cleanup compId to keep payload small
                    delete pd.compId;
                }

                // Any codes not found in Sigtap get a dummy entry
                for (const code of codesArray) {
                    if (!procedureDetails[code]) {
                        procedureDetails[code] = {
                            procedureCode: code,
                            procedureName: `PROCEDIMENTO ${code}`,
                            groupCode: code.substring(0, 2) || 'XX',
                            groupName: 'GRUPO DESCONHECIDO',
                            subGroupCode: code.substring(2, 4) || 'XX',
                            subGroupName: 'SUBGRUPO DESCONHECIDO',
                            formCode: code.substring(4, 6) || 'XX',
                            formName: 'FORMA DESCONHECIDA'
                        };
                    }
                }
            }

            return {
                success: true,
                data: result,
                breakdown,
                procedureDetails
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
