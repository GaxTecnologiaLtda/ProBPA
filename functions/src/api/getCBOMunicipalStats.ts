import * as functions from 'firebase-functions/v1';
import { db } from '../firebaseAdmin';
import { cboDictionary } from '../utils/cboDictionary';

export const getCBOMunicipalStats = functions
    .region('southamerica-east1')
    .runWith({
        timeoutSeconds: 540,
        memory: '2GB',
    })
    .https.onCall(async (data, context) => {
        console.log("[CBO Stats] FUNCTION STARTED - TRIGGERED BY CLIENT");
        try {
            if (!context.auth) {
                throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
            }

            const {
                municipalityId,
                competence,
                startDate,
                endDate,
                units = [],
                allowedProcedureCodes = [],
                professionals = []
            } = data;

            if (!municipalityId || (!competence && (!startDate || !endDate))) {
                throw new functions.https.HttpsError('invalid-argument', 'Missing municipalityId or period');
            }

            const allowedCodes = (allowedProcedureCodes && allowedProcedureCodes.length > 0) ? allowedProcedureCodes.map((c: string) => String(c).replace(/\D/g, '')) : null;

            // Build active roster maps
            const activeProfIds = new Set<string>();
            const cnsMap = new Map<string, string>();
            const cpfMap = new Map<string, string>();
            const nameMap = new Map<string, string>();

            if (professionals && Array.isArray(professionals)) {
                professionals.forEach((p: any) => {
                    activeProfIds.add(p.id);
                    if (p.cns) cnsMap.set(String(p.cns).replace(/\D/g, ''), p.id);
                    if (p.cpf) cpfMap.set(String(p.cpf).replace(/\D/g, ''), p.id);
                    if (p.name) nameMap.set(String(p.name).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), p.id);
                });
            }

            // Entity Identification
            const tokenEntityId = context.auth.token.entityId;
            let entityId = tokenEntityId;

            const entityDoc = await db.doc(`entities/${entityId}`).get();
            let entityType = 'PUBLIC';
            if (entityDoc.exists) {
                const entityData = entityDoc.data();
                entityType = (entityData?.type === 'Privada' || entityData?.type === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';
            }

            // 1. Build Lookups
            const unitMap = new Map<string, string>(); // unitId -> name
            const unitCnesMap = new Map<string, string>(); // cnes -> name
            const unitCnesToIdMap = new Map<string, string>(); // cnes -> unitId

            units.forEach((u: any) => {
                const uName = String(u.name || 'Desconhecida').trim();
                if (u.id) unitMap.set(u.id, uName);
                if (u.cnes) {
                    const cleanCnes = String(u.cnes).trim().padStart(7, '0');
                    unitCnesMap.set(cleanCnes, uName);
                    unitCnesToIdMap.set(cleanCnes, u.id);
                }
            });

            // profId_unitId -> CBO Data (from injected assignments)
            const profUnitCboMap = new Map<string, { code: string, name: string }>();
            const profMainCboMap = new Map<string, { code: string, name: string }>();
            const authorizedUnits = new Set<string>();

            const mapCbo = (pId: string, unitId: string | null, code: string, occ: string) => {
                let clean = String(code || '').replace(/\D/g, '');
                if (!clean && occ) {
                    const match = occ.match(/\b\d{6}\b/);
                    if (match) clean = match[0];
                    else clean = String(occ).replace(/\D/g, '').substring(0, 6);
                }

                const name = String(occ || 'Desconhecido').replace(' - Desconhecido', '');
                
                if (unitId) {
                    authorizedUnits.add(`${pId}_${unitId}`);
                    if (clean) {
                        profUnitCboMap.set(`${pId}_${unitId}`, { code: clean, name: name });
                    }
                } else {
                    // Main CBO for fallback
                    if (clean) {
                        profMainCboMap.set(pId, { code: clean, name: name });
                    }
                }
            };

            if (professionals && Array.isArray(professionals)) {
                professionals.forEach((p: any) => {
                    // Map main CBO
                    mapCbo(p.id, null, p.cbo, p.occupation);

                    if (p.unitId) {
                        mapCbo(p.id, p.unitId, p.cbo, p.occupation);
                    }
                    if (p.assignments && Array.isArray(p.assignments)) {
                        p.assignments.forEach((a: any) => {
                            if (a.unitId) mapCbo(p.id, a.unitId, a.cbo, a.occupation);
                        });
                    }
                });
            }

            const getCboData = (pId: string, pName: string, rowCbo?: string, rowOcc?: string, rUnitId?: string) => {
                let mappedCode = '';
                let mappedName = '';

                let trueProfId = '';
                if (pId && activeProfIds.has(pId)) trueProfId = pId;
                else if (pId && pId.length === 15 && cnsMap.has(pId)) trueProfId = cnsMap.get(pId)!;
                else if (pId && pId.length === 11 && cpfMap.has(pId)) trueProfId = cpfMap.get(pId)!;

                if (trueProfId && rUnitId) {
                    if (authorizedUnits.has(`${trueProfId}_${rUnitId}`)) {
                        if (profUnitCboMap.has(`${trueProfId}_${rUnitId}`)) {
                            const data = profUnitCboMap.get(`${trueProfId}_${rUnitId}`)!;
                            mappedCode = data.code;
                            mappedName = data.name;
                        }
                    } else {
                        // Fallback 1: Try CNES to ID mapping
                        const uuid = unitCnesToIdMap.get(rUnitId);
                        if (uuid && authorizedUnits.has(`${trueProfId}_${uuid}`)) {
                            const data = profUnitCboMap.get(`${trueProfId}_${uuid}`);
                            if (data) {
                                mappedCode = data.code;
                                mappedName = data.name;
                            }
                        }
                        
                        // Fallback 2: Main CBO if unit-specific is missing
                        if (!mappedCode && profMainCboMap.has(trueProfId)) {
                            const data = profMainCboMap.get(trueProfId)!;
                            mappedCode = data.code;
                            mappedName = data.name;
                        }
                    }
                } else if (trueProfId && !mappedCode) {
                    // Global fallback for records without unit context
                    if (profMainCboMap.has(trueProfId)) {
                        const data = profMainCboMap.get(trueProfId)!;
                        mappedCode = data.code;
                        mappedName = data.name;
                    }
                }

                const finalCode = (mappedCode && mappedCode.length > 3)
                    ? mappedCode
                    : ((rowCbo && String(rowCbo).length > 3) ? String(rowCbo).replace(/\D/g, '') : 'N/I');

                let finalName = '';
                const cleanRowOcc = String(rowOcc || '').replace(' - Desconhecido', '').trim();

                if (cboDictionary[finalCode]) {
                    finalName = cboDictionary[finalCode];
                } else if (mappedName && mappedName !== 'Desconhecido' && mappedName !== 'Cargo Não Informado') {
                    finalName = mappedName;
                } else if (cleanRowOcc && cleanRowOcc !== 'Desconhecido' && cleanRowOcc !== 'Cargo Não Informado' && cleanRowOcc !== 'undefined') {
                    finalName = cleanRowOcc;
                } else {
                    finalName = 'Cargo Não Informado';
                }

                if (finalCode === 'N/I') {
                    console.warn(`[CBO Stats] Could not resolve CBO for Professional: ${pId} (${pName}) at Unit: ${rUnitId}`);
                }

                return {
                    code: finalCode,
                    name: finalName.toUpperCase()
                };
            };


            // --- Audit Logic for Fono ---
            const auditResults: any[] = [];
            try {
                const auditYears = ['2024', '2025', '2026'];
                for (const aYear of auditYears) {
                    const extractionsPath = `municipalities/PRIVATE/${entityId}/${municipalityId}/extractions/${aYear}/competences`;
                    const compsSnap = await db.collection(extractionsPath).get();
                    for (const compDoc of compsSnap.docs) {
                        const resumoSnap = await db.collection(`${compDoc.ref.path}/resumo_producao`).get();
                        for (const doc of resumoSnap.docs) {
                            const d = doc.data();
                            if (d.units && (d.units['GooBrmhoQbv38BooXBND'] || d.units['0559415'])) {
                                const uData = d.units['GooBrmhoQbv38BooXBND'] || d.units['0559415'];
                                auditResults.push({ year: aYear, comp: compDoc.id, doc: doc.id, profs: uData.professionals });
                            }
                        }
                    }
                }
            } catch (ae) {
                console.error("Audit failed", ae);
            }

            // Calculate Competence Formats & Ranges
            let competencesToFetch: { compFilter: string, connectorCompId: string, year: string }[] = [];

            if (startDate && endDate) {
                let start = new Date(`${startDate}T12:00:00Z`);
                let end = new Date(`${endDate}T12:00:00Z`);
                let loopCount = 0;
                let currentMonth = new Date(start);
                currentMonth.setDate(1);

                while (currentMonth <= end && loopCount < 24) {
                    const y = String(currentMonth.getFullYear());
                    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
                    competencesToFetch.push({
                        compFilter: `${y}-${m}`,
                        connectorCompId: `${m}-${y}`,
                        year: y
                    });
                    currentMonth.setMonth(currentMonth.getMonth() + 1);
                    loopCount++;
                }
                const lastY = String(end.getFullYear());
                const lastM = String(end.getMonth() + 1).padStart(2, '0');
                if (!competencesToFetch.find(c => c.compFilter === `${lastY}-${lastM}`)) {
                    competencesToFetch.push({ compFilter: `${lastY}-${lastM}`, connectorCompId: `${lastM}-${lastY}`, year: lastY });
                }
            } else {
                let compFilter = competence;
                let connectorCompId = competence;
                let year = new Date().getFullYear().toString();
                if (competence && competence.includes('/')) {
                    const parts = competence.split('/');
                    compFilter = `${parts[1]}-${parts[0]}`;
                    connectorCompId = `${parts[0]}-${parts[1]}`;
                    year = parts[1];
                }
                competencesToFetch.push({ compFilter, connectorCompId, year });
            }

            console.log(`[CBO Stats] Req Mun: ${municipalityId}, Start: ${startDate}, End: ${endDate}`);
            console.log(`[CBO Stats] Units count: ${units.length}, Profs count: ${professionals.length}, ActiveProfIds: ${activeProfIds.size}`);
            console.log(`[CBO Stats] AllowedCodes size: ${allowedCodes ? allowedCodes.length : 'NULL (ALL)'}`);
            console.log(`[CBO Stats] Competences to fetch: ${JSON.stringify(competencesToFetch)}`);

            const aggregatedMap = new Map<string, Map<string, { name: string, quantity: number }>>();

            const ensureCboEntry = (uId: string, cCode: string, cName: string, qty: number) => {
                let normalizedId = uId;
                if (unitCnesToIdMap.has(uId)) {
                    normalizedId = unitCnesToIdMap.get(uId)!;
                }

                if (!unitMap.has(normalizedId)) return;

                if (!aggregatedMap.has(normalizedId)) {
                    aggregatedMap.set(normalizedId, new Map());
                }
                const unitDataMap = aggregatedMap.get(normalizedId)!;

                if (!unitDataMap.has(cCode)) {
                    unitDataMap.set(cCode, { name: cName, quantity: 0 });
                }
                const current = unitDataMap.get(cCode)!;
                current.quantity += qty;
            };

            // 2. Fetch Summaries
            for (const comp of competencesToFetch) {
                const year = comp.compFilter.split('-')[0];
                const connectorCompId = comp.connectorCompId;

                // --- 2a. Fetch Manual Summaries ---
                // Stored at: municipalities/{type}/{entityId}/{municipalityId}/bpai_records/{unitId}/professionals/{profId}/competencias/{compFilter}/resumo_producao/{date}
                const baseMunPath = `municipalities/${entityType}/${entityId}/${municipalityId}`;
                
                const manualPromises = Array.from(unitMap.keys()).map(async (uId) => {
                    const manualRef = db.collection(`${baseMunPath}/bpai_records/${uId}/professionals`);
                    try {
                        const profsDocs = await manualRef.listDocuments();
                        const pPromises = profsDocs.map(async (pDoc) => {
                            const pId = pDoc.id;
                            const sumRef = db.collection(`${baseMunPath}/bpai_records/${uId}/professionals/${pId}/competencias/${comp.compFilter}/resumo_producao`);
                            const snap = await sumRef.get();
                            return snap.docs.map(d => ({ doc: d, source: 'manual', uId, pId }));
                        });
                        const pDocsArrays = await Promise.all(pPromises);
                        return pDocsArrays.flat();
                    } catch (e) {
                        return [];
                    }
                });

                // --- 2b. Fetch Connector Summaries ---
                // Stored at: municipalities/{type}/{entityId}/{municipalityId}/extractions/{year}/competences/{connectorCompId}/resumo_producao/{date_profId}
                const connectorPath = `${baseMunPath}/extractions/${year}/competences/${connectorCompId}/resumo_producao`;
                const connectorPromise = db.collection(connectorPath).get().then(snap => snap.docs.map(d => ({ doc: d, source: 'connector' }))).catch(() => []);

                const [manualItemsArrays, connectorItems] = await Promise.all([
                    Promise.all(manualPromises),
                    connectorPromise
                ]);

                const allItems = [...manualItemsArrays.flat(), ...connectorItems];

                for (const item of allItems) {
                    const doc = item.doc;
                    const data = doc.data();

                    if (!data.units) continue;

                    // Filtering by dates
                    if (startDate && endDate) {
                        const docId = doc.id;
                        const datePartMatch = docId.match(/(\d{2})-(\d{2})-(\d{4})/);
                        if (datePartMatch) {
                            const [, d, m, y] = datePartMatch;
                            const docDateIso = `${y}-${m}-${d}`;
                            if (docDateIso < startDate || docDateIso > endDate) continue;
                        }
                    }

                    for (const rUnitId of Object.keys(data.units)) {
                        // Strict Unit Filter: Discard units not in the authorized list
                        let normalizedUnitId = rUnitId;
                        if (unitCnesToIdMap.has(rUnitId)) {
                            normalizedUnitId = unitCnesToIdMap.get(rUnitId)!;
                        }

                        if (!unitMap.has(normalizedUnitId)) continue;

                        const unitData = data.units[rUnitId];
                        if (!unitData.professionals) continue;

                        for (const pIdKey of Object.keys(unitData.professionals)) {
                            const profData = unitData.professionals[pIdKey];

                            // Strict Professional Filter
                            let truePId = '';
                            if (activeProfIds.has(pIdKey)) truePId = pIdKey;
                            else if (pIdKey.length === 15 && cnsMap.has(pIdKey)) truePId = cnsMap.get(pIdKey)!;
                            else if (pIdKey.length === 11 && cpfMap.has(pIdKey)) truePId = cpfMap.get(pIdKey)!;
                            else if (profData.professionalName) {
                                const normName = String(profData.professionalName).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                if (nameMap.has(normName)) truePId = nameMap.get(normName)!;
                            }

                            if (!truePId || !activeProfIds.has(truePId)) continue;

                            if (!profData.procedures) continue;

                            const cboData = getCboData(truePId, profData.professionalName, profData.cbo, profData.occupation, rUnitId);
                            if (!cboData) continue;

                            for (const [rawCode, count] of Object.entries(profData.procedures)) {
                                const procQty = Number(count) || 0;
                                if (procQty <= 0) continue;

                                const cleanCode = String(rawCode).replace(/\D/g, '');

                                // Allowed Codes Filter (supports prefix/macro-goals)
                                if (allowedCodes) {
                                    let isAllowed = false;
                                    for (const authCode of allowedCodes) {
                                        if (cleanCode.startsWith(authCode)) {
                                            isAllowed = true;
                                            break;
                                        }
                                    }
                                    if (!isAllowed) continue;
                                }
                                ensureCboEntry(rUnitId, cboData.code, cboData.name, procQty);
                            }
                        }
                    }
                }
            }

            const output: any[] = [];
            for (const [uId] of aggregatedMap.entries()) {
                let resolvedUnitName = unitMap.get(uId);
                if (!resolvedUnitName) {
                    const cnesLookupId = unitCnesToIdMap.get(uId);
                    if (cnesLookupId) resolvedUnitName = unitMap.get(cnesLookupId);
                    if (!resolvedUnitName) resolvedUnitName = unitCnesMap.get(uId);
                }
                if (!resolvedUnitName) {
                    resolvedUnitName = uId === 'unknown' ? 'Unidade Desconhecida' : uId;
                }

                const uMap = aggregatedMap.get(uId)!;
                const cboArray: any[] = [];
                let unitTotal = 0;

                for (const [cCode, data] of uMap.entries()) {
                    cboArray.push({ code: cCode, name: data.name, quantity: data.quantity });
                    unitTotal += data.quantity;
                }
                cboArray.sort((a, b) => b.quantity - a.quantity);

                output.push({
                    unitId: uId,
                    unitName: resolvedUnitName,
                    cbos: cboArray,
                    totalQuantity: unitTotal
                });
            }

            output.sort((a: any, b: any) => b.totalQuantity - a.totalQuantity || a.unitName.localeCompare(b.unitName));

            console.log(`[CBO Stats] Finished. Units matched: ${output.length}.`);
            return output;

        } catch (error: any) {
            console.error('[getCBOMunicipalStats] Error:', error);
            throw new functions.https.HttpsError('internal', error.message);
        }
    }
    );

