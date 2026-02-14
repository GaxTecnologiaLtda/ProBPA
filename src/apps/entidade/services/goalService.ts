import {
    collection,
    getDocs,
    query,
    where,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    orderBy,
    collectionGroup,
    getDoc,
    setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Goal } from '../types';
import { normalizeVaccine } from './municipalityReportService';

const COLLECTION_GROUP_NAME = 'goals';

export const calculateGoalStatus = (current: number, target: number): 'pending' | 'risk' | 'attention' | 'on_track' | 'completed' => {
    if (!target || target === 0) return 'pending';

    const percentage = current / target;

    if (current === 0) return 'pending';
    if (percentage < 0.40) return 'risk';
    if (percentage < 0.70) return 'attention';
    if (percentage < 1.0) return 'on_track';
    return 'completed';
};

export const matchProfessional = (goal: any, p: any) => {
    // Meta de equipe
    if (goal.professionalId === 'team') {
        return p.unitId === goal.unitId;
    }

    // Meta individual
    return p.professionalId === goal.professionalId;
};

export const goalService = {
    /**
     * Fetch goals for Private Entity view
     * Filter: entityId == userClaims.entityId
     * Uses Collection Group Query because goals are now nested deep.
     */
    getGoalsForEntityPrivate: async (userClaims: any): Promise<Goal[]> => {
        try {
            if (!userClaims?.entityId) throw new Error('Entity ID missing in claims');

            let q = query(
                collectionGroup(db, COLLECTION_GROUP_NAME),
                where('entityId', '==', userClaims.entityId),
                orderBy('createdAt', 'desc')
            );

            if (userClaims.municipalityId) {
                q = query(
                    collectionGroup(db, COLLECTION_GROUP_NAME),
                    where('entityId', '==', userClaims.entityId),
                    where('municipalityId', '==', userClaims.municipalityId),
                    orderBy('createdAt', 'desc')
                );
            }

            const snapshot = await getDocs(q);
            const goals = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Goal));

            // Deduplicate by ID (Handle dual-write legacy + new paths)
            const uniqueGoalsMap = new Map();
            goals.forEach(g => uniqueGoalsMap.set(g.id, g));

            return Array.from(uniqueGoalsMap.values());
        } catch (error) {
            console.error('Error fetching private entity goals:', error);
            throw error;
        }
    },

    /**
     * Fetch goals for Public Entity view (Municipality)
     * Filter: entityId == userClaims.entityId AND municipalityId == userClaims.municipalityId (or override)
     * If municipalityId is missing, falls back to fetching all entity goals.
     */
    getGoalsForMunicipalityPublic: async (userClaims: any, municipalityIdOverride?: string): Promise<Goal[]> => {
        try {
            if (!userClaims?.entityId) {
                throw new Error('Entity ID missing in claims');
            }

            const munId = municipalityIdOverride || userClaims.municipalityId;

            let q;
            if (munId) {
                q = query(
                    collectionGroup(db, COLLECTION_GROUP_NAME),
                    where('entityId', '==', userClaims.entityId),
                    where('municipalityId', '==', munId),
                    orderBy('createdAt', 'desc')
                );
            } else {
                // Fallback: Fetch all for entity if no municipality context
                q = query(
                    collectionGroup(db, COLLECTION_GROUP_NAME),
                    where('entityId', '==', userClaims.entityId),
                    orderBy('createdAt', 'desc')
                );
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Goal));
        } catch (error) {
            console.error('Error fetching public municipality goals:', error);
            throw error;
        }
    },

    /**
     * Save (Create or Update) a goal from Entity Panel
     * Implements deep nesting structure:
     * goals/{entityTypeDoc}/entities/{entityId}/municipalities/{municipalityId}/units/{unitId}/professionals/{professionalId}/goals/{goalId}
     */
    saveGoalFromEntity: async (payload: Partial<Goal>, userClaims: any): Promise<string> => {
        try {
            if (!userClaims?.entityId) throw new Error('Entity ID missing in claims');

            // 1. Determine Municipality ID
            let municipalityId = payload.municipalityId;

            // If Private Entity and municipalityId is missing, try to fetch from Unit
            const rawType = (userClaims.entityType || payload.entityType || '').toLowerCase();
            const isPrivate = rawType === 'private' || rawType === 'privada';

            if (isPrivate) {
                if (!municipalityId && payload.unitId) {
                    const unitRef = doc(db, 'units', payload.unitId);
                    const unitSnap = await getDoc(unitRef);
                    if (unitSnap.exists()) {
                        municipalityId = unitSnap.data().municipalityId;
                    }
                }
            } else {
                // Public entity usually has municipalityId in claims
                municipalityId = municipalityId || userClaims.municipalityId;
            }

            if (!municipalityId) throw new Error('Municipality ID is required for saving a goal.');

            // 2. Prepare Data
            // Normalize competence to YYYY-MM using strict logic
            let competenceMonth = '';
            const rawComp = (payload.competenceMonth || payload.competence || '').trim();

            if (rawComp.includes('/')) {
                // MM/YYYY -> YYYY-MM
                const [mm, yyyy] = rawComp.split('/');
                competenceMonth = `${yyyy}-${mm}`;
            } else if (/^\d{6}$/.test(rawComp)) {
                // YYYYMM -> YYYY-MM
                competenceMonth = `${rawComp.slice(0, 4)}-${rawComp.slice(4)}`;
            } else {
                // Assume already YYYY-MM or empty
                competenceMonth = rawComp;
            }

            // PART 5: Ensure defaults and trimming
            const goalPayload = { ...payload };
            goalPayload.currentQuantity = goalPayload.currentQuantity || 0;
            // NEW: Initialize dual progress fields
            (goalPayload as any).currentQuantityUnit = 0;
            (goalPayload as any).currentQuantityProfessional = 0;

            if (goalPayload.procedureCode) {
                goalPayload.procedureCode = goalPayload.procedureCode.trim();
            }

            const entityType = userClaims.entityType || payload.entityType || 'private';
            const normalizedEntityType = (entityType || '').toLowerCase() === 'private' || (entityType || '').toLowerCase() === 'privada' ? 'PRIVATE' : 'PUBLIC';

            // Legacy Types for Path
            const isPrivateType = normalizedEntityType === 'PRIVATE';
            const entityTypeDoc = isPrivateType ? 'entityPrivate' : 'entityPublic';
            const professionalId = payload.professionalId || 'team';

            // Determine Goal Type if not present
            if (!goalPayload.goalType) {
                if (payload.unitId) {
                    goalPayload.goalType = professionalId === 'team' ? 'unit' : 'professional';
                } else {
                    goalPayload.goalType = 'municipal';
                }
            }

            const goalData: any = {
                ...goalPayload,
                entityId: userClaims.entityId,
                entityName: userClaims.entityName || payload.entityName,
                entityType: entityType,
                municipalityId: municipalityId, // Ensure it's saved
                competenceMonth, // Ensure it's saved
                updatedAt: serverTimestamp(),
                updatedBy: userClaims.uid || userClaims.user_id
            };

            // 3. Construct Paths
            // Path 1 (Legacy): goals/{entityTypeDoc}/entities/{entityId}/municipalities/{municipalityId}/units/{unitId}/professionals/{professionalId}/goals
            // Note: If 'municipal' type, unitId might be undefined. Legacy structure heavily relies on unit. 
            // We might need a dummy unit or put it at municipality level if legacy supports it. 
            // Assuming legacy structure requires unit, we might skip legacy write for 'municipal' if no unit, OR assign to a default unit.
            // However, the prompt implies "duplicar", so we should try to maintain both.
            // If unitId is missing, legacy path breaks. We will proceed with legacy ONLY if unitId exists.

            const legacyCollectionPath = payload.unitId
                ? `goals/${entityTypeDoc}/entities/${userClaims.entityId}/municipalities/${municipalityId}/units/${payload.unitId}/professionals/${professionalId}/goals`
                : null;

            // Path 2 (New): municipalities/{entityType}/{entityId}/{municipalityId}/goals/{competenceMonth}/goals
            const newCollectionPath = `municipalities/${normalizedEntityType}/${userClaims.entityId}/${municipalityId}/goals/${competenceMonth}/goals`;

            // 4. Save
            if (!payload.id) {
                // Create
                goalData.createdAt = serverTimestamp();
                goalData.createdBy = userClaims.uid || userClaims.user_id;
                goalData.currentQuantity = 0;
                goalData.status = 'pending';

                // Remove undefined
                Object.keys(goalData).forEach(key => goalData[key] === undefined && delete goalData[key]);

                // Generate ID
                const newDocRef = doc(collection(db, newCollectionPath)); // Generate ID from new path
                goalData.id = newDocRef.id;

                const promises = [];

                // Write to New Path
                promises.push(setDoc(newDocRef, goalData));

                // Write to Legacy Path (if valid)
                if (legacyCollectionPath) {
                    const legacyDocRef = doc(db, legacyCollectionPath, newDocRef.id);
                    promises.push(setDoc(legacyDocRef, goalData));
                }

                await Promise.all(promises);

                // Log Action
                try {
                    // @ts-ignore
                    const { logAction } = await import('./logsService');
                    await logAction({
                        action: 'CREATE',
                        target: 'GOAL',
                        description: `Criou meta (${goalData.procedureCode || 'Geral'})`,
                        entityId: userClaims.entityId,
                        municipalityId: municipalityId
                    });
                } catch (e) { console.error(e); }

                return newDocRef.id;
            } else {
                // Update
                // Strategy: Update both paths.
                Object.keys(goalData).forEach(key => goalData[key] === undefined && delete goalData[key]);

                const promises = [];

                // Update New Path
                // NOTE: If competence changes, the path changes! This is tricky for updates. 
                // For now, assuming competence doesn't change OR we are just updating the doc in place. 
                // If competence CAN change, we would need to delete from old path and create in new.
                // Assuming ID is stable, we use the *current* competence from payload to address the doc.
                // If the user *changed* the competence in the UI, this will create a NEW doc in the new competence folder
                // and leave the old one as "orphan" or duplicate. Ideally we should have the 'oldCompetence' to delete.
                // Given the scope, we will just write to the destination path.

                const newDocRef = doc(db, newCollectionPath, payload.id);
                promises.push(setDoc(newDocRef, goalData, { merge: true }));

                // Update Legacy Path (if valid)
                if (legacyCollectionPath) {
                    const legacyDocRef = doc(db, legacyCollectionPath, payload.id);
                    promises.push(setDoc(legacyDocRef, goalData, { merge: true }));
                }

                await Promise.all(promises);

                // Log Action
                try {
                    // @ts-ignore
                    const { logAction } = await import('./logsService');
                    await logAction({
                        action: 'UPDATE',
                        target: 'GOAL',
                        description: `Atualizou meta (${goalData.procedureCode || 'Geral'})`,
                        entityId: userClaims.entityId,
                        municipalityId: municipalityId
                    });
                } catch (e) { console.error(e); }

                return payload.id;
            }
        } catch (error) {
            console.error('Error saving goal:', error);
            throw error;
        }
    },

    /**
     * Fetch all production records for an entity to calculate progress on frontend.
     */
    /**
     * Fetch production records for an entity, optimally filtered by year.
     * Use to avoid loading entire history.
     */
    getEntityProductionStats: async (entityId: string, year?: string, municipalityId?: string, municipalitiesList?: any[], professionalsList?: any[]): Promise<EntityProductionRecord[]> => {
        return goalService.getEntityProductionStatsRange(entityId, year, year, municipalityId, municipalitiesList, professionalsList);
    },

    /**
     * Fetch production stats for a custom year range (inclusive).
     * e.g. startYear="2025", endYear="2026" -> Fetches 2025-01 to 2026-12
     */
    getEntityProductionStatsRange: async (entityId: string, startYear?: string, endYear?: string, municipalityId?: string, municipalitiesList?: any[], professionalsList?: any[]): Promise<EntityProductionRecord[]> => {
        try {
            if (!entityId) return [];

            const sYear = startYear || new Date().getFullYear().toString();
            const eYear = endYear || sYear;

            // Range Filter for YYYY-MM
            const startKey = `${sYear}-01`;
            const endKey = `${eYear}-12\uf8ff`; // Unicode high character for inclusive end
            // Date String for Extractions (YYYY-MM-DD)
            const startDateDt = `${sYear}-01-01`;
            const endDateDt = `${eYear}-12-31 23:59:59`;

            // Helper for normalization
            const normalize = (str: string) => String(str || '').replace(/\D/g, '');
            const normalizeName = (str: string) => String(str || '').trim().toLowerCase();

            // Prepare Professional Lookup Maps (if list provided)
            const cnsMap = new Map<string, string>();
            const cpfMap = new Map<string, string>();
            const nameMap = new Map<string, string>();

            if (professionalsList && professionalsList.length > 0) {
                professionalsList.forEach(p => {
                    if (p.cns) cnsMap.set(normalize(p.cns), p.id);
                    if (p.cpf) cpfMap.set(normalize(p.cpf), p.id);
                    if (p.name) nameMap.set(normalizeName(p.name), p.id);
                });
            }

            // 1. Fetch Manual Production
            let q = query(
                collectionGroup(db, 'procedures'),
                where('entityId', '==', entityId),
                where('competenceMonth', '>=', startKey),
                where('competenceMonth', '<=', endKey)
            );

            if (municipalityId) {
                q = query(
                    collectionGroup(db, 'procedures'),
                    where('entityId', '==', entityId),
                    where('municipalityId', '==', municipalityId),
                    where('competenceMonth', '>=', startKey),
                    where('competenceMonth', '<=', endKey)
                );
            }

            const manualPromise = getDocs(q).then(snap => snap.docs.map(d => {
                const data = d.data();
                const id = data.id || d.id;
                const pathParts = d.ref.path.split('/');
                const isNewPath = pathParts[0] === 'municipalities';

                // FIX: Ensure municipalityId, unitId, professionalId is present. 
                if (isNewPath && pathParts.length >= 4) {
                    if (!data.municipalityId) data.municipalityId = pathParts[3];
                    if (!data.unitId && pathParts.length >= 6) data.unitId = pathParts[5];
                    if (!data.professionalId && pathParts.length >= 8) data.professionalId = pathParts[7];
                }
                return { ...data, id, _isNewPath: isNewPath, source: 'manual' };
            }));

            // 2. Fetch Extracted Production (Connector) - Direct Path Approach
            const extractedPromise = (async () => {
                try {
                    console.log('[CONNECTOR] Starting connector data fetch...');

                    // Get all municipalities for this entity
                    let municipalities = municipalitiesList || [];
                    if (!municipalities || municipalities.length === 0) {
                        // Fetch municipalities if not provided
                        const munSnap = await getDocs(
                            query(collection(db, 'municipalities'), where('linkedEntityId', '==', entityId))
                        );
                        municipalities = munSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    }

                    console.log(`[CONNECTOR] Found ${municipalities.length} municipalities`);

                    if (municipalities.length === 0) {
                        console.warn('[CONNECTOR] No municipalities found for entity');
                        return [];
                    }

                    // Determine entity type from first municipality
                    const firstMun: any = municipalities[0];
                    const entityType = firstMun.entityType || 'public_entities';

                    // Extract years from date range
                    const startYearNum = parseInt(sYear);
                    const endYearNum = parseInt(eYear);
                    const years = [];
                    for (let y = startYearNum; y <= endYearNum; y++) {
                        years.push(y.toString());
                    }

                    console.log(`[CONNECTOR] Searching years: ${years.join(', ')}`);
                    console.log(`[CONNECTOR] Entity type: ${entityType}`);

                    // Fetch records from each municipality's hierarchical path
                    const allRecordsPromises = municipalities.map(async (mun: any) => {
                        const munId = mun.id;
                        const records: any[] = [];

                        // Resolve Entity Type/ID specific to this municipality context
                        const ctx = mun._pathContext || {};
                        const mEntityType = mun.entityType || ctx.entityType || entityType || 'public_entities';
                        const mEntityId = mun.entityId || ctx.entityId || entityId;

                        console.log(`[GOAL_SERVICE] Fetching Mun: ${mun.name} (${munId}) Type: ${mEntityType} EntID: ${mEntityId}`);

                        for (const year of years) {
                            try {
                                // Path: municipalities/{entityType}/{entityId}/{munId}/extractions/{YYYY}/competences
                                const competencesPath = `municipalities/${mEntityType}/${mEntityId}/${munId}/extractions/${year}/competences`;
                                console.log(`[GOAL_SERVICE] Path: ${competencesPath}`);

                                const competencesRef = collection(db, competencesPath);

                                const competencesSnap = await getDocs(competencesRef);
                                console.log(`[GOAL_SERVICE] Year ${year}: found ${competencesSnap.size} competences`);

                                for (const compDoc of competencesSnap.docs) {
                                    const competence = compDoc.id; // e.g., "01-2026" (MM-YYYY)

                                    // Normalize competence to YYYY-MM for comparison
                                    const [cMonth, cYear] = competence.split('-');
                                    const compYm = `${cYear}-${cMonth}`;

                                    // Check if competence is in range
                                    // console.log(`[GOAL_SERVICE] Comp: ${competence} (${compYm}) Range: ${startKey}-${endKey}`);
                                    if (compYm < startKey || compYm > endKey) {
                                        continue;
                                    }

                                    // Fetch extraction_records for this competence
                                    const recordsRef = collection(compDoc.ref, 'extraction_records');
                                    const recordsSnap = await getDocs(recordsRef);

                                    recordsSnap.docs.forEach(doc => {
                                        const data = doc.data();

                                        // Filter by productionDate (optional double check)
                                        // if (data.productionDate && (data.productionDate < startDateDt || data.productionDate > endDateDt)) return;

                                        records.push({ id: doc.id, ...data });
                                    });
                                }
                            } catch (err) {
                                console.warn(`[CONNECTOR] Error fetching from ${munId}/${year}:`, err);
                            }
                        }

                        return records;
                    });

                    const allRecordsArrays = await Promise.all(allRecordsPromises);
                    const flatRecords = allRecordsArrays.flat();

                    console.log(`[CONNECTOR] Total raw records fetched: ${flatRecords.length}`);

                    // Process and normalize records
                    const processedRecords = flatRecords.map(data => {
                        // Normalize Date to Competence (YYYY-MM)
                        let compMonth = '';
                        if (data.productionDate) {
                            const [yyyy, mm] = data.productionDate.split(' ')[0].split('-');
                            compMonth = `${yyyy}-${mm}`;
                        }

                        // Normalize properties
                        const proc = data.procedure || {};
                        let procedureCode = data.procedureCode || proc.code || '';
                        let procedureName = data.procedureName || proc.name || 'Procedimento sem nome';
                        const procedureType = data.procedureType || proc.type || '';

                        // --- IGNORE INTERNAL PEC PROCEDURES ---
                        const rawCodeUpper = String(procedureCode).toUpperCase();
                        const rawNameUpper = String(procedureName).toUpperCase();

                        const hasValidCode = /^\d+$/.test(procedureCode) && procedureCode.length >= 7;

                        // Check if it's a vaccine (by Type or Name) to allow small codes
                        const isVaccine = procedureType === 'VACCINATION' || rawNameUpper.includes('VACINA') || rawNameUpper.includes('IMUNIZA');

                        if (!hasValidCode && !isVaccine) {
                            if (rawCodeUpper.includes('CONSULTA') && rawNameUpper.includes('ATENDIMENTO INDIVIDUAL')) {
                                return null;
                            }
                            // Also ignore completely invalid things that are NOT vaccines
                            if (procedureCode.length < 3) return null;
                        }

                        // Case 2: Code=ODONTO, Name=ATENDIMENTO ODONTOLOGICO -> MAP to 0301010030
                        if (rawCodeUpper.includes('ODONTO') && rawNameUpper.includes('ATENDIMENTO ODONTOLOGICO')) {
                            procedureCode = '0301010030';
                            procedureName = 'CONSULTA DE PROFISSIONAIS DE NÍVEL SUPERIOR NA ATENÇÃO PRIMÁRIA (EXCETO MÉDICO)';
                        }

                        // Case 3: VACCINE Normalization
                        const vacNorm = normalizeVaccine(procedureName, procedureType);
                        if (vacNorm) {
                            procedureCode = vacNorm.code;
                            procedureName = vacNorm.name;
                        }

                        // Map professional CNS to professionalId for report aggregation
                        let professionalId = data.professionalId; // May already exist from manual data
                        let professionalName = data.professionalName;

                        const pData = data.professional || {};
                        const pCns = String(pData.cns || '').replace(/\D/g, '');
                        const pCpf = String(pData.cpf || '').replace(/\D/g, '');
                        const pName = String(pData.name || '').trim().toLowerCase();

                        if (!professionalId) {
                            // 1. CNS Match
                            if (pCns) professionalId = cnsMap.get(pCns);

                            // 2. CPF Match
                            if (!professionalId && pCpf) professionalId = cpfMap.get(pCpf);

                            // 3. Name Match
                            if (!professionalId && pName) professionalId = nameMap.get(pName);

                            // Get name from professionalsList if mapped
                            if (professionalId && professionalsList) {
                                const matchedProf = professionalsList.find((p: any) => p.id === professionalId);
                                if (matchedProf) {
                                    professionalName = matchedProf.name;
                                }
                            }
                        }

                        // Fallback to professional data from connector
                        if (!professionalName && pData.name) {
                            professionalName = pData.name;
                        }

                        return {
                            id: data.id,
                            ...data,
                            source: 'connector',
                            municipalityId: data.municipalityId,
                            professionalId, // CRITICAL: Added for report aggregation
                            professionalName, // Added for display
                            competenceMonth: compMonth,
                            quantity: 1,
                            _isNewPath: true,
                            procedureCode: String(procedureCode).replace(/\D/g, ''),
                            procedureName,
                            procedureType
                        };
                    }).filter(item => item !== null) as any[];

                    console.log(`[CONNECTOR] Processed records (after filtering): ${processedRecords.length}`);

                    return processedRecords;

                } catch (e) {
                    console.error(`[CONNECTOR] Failed to fetch connector data:`, e);
                    return [];
                }
            })();

            const [manualRecords, extractedRecords] = await Promise.all([manualPromise, extractedPromise]);

            // Deduplicate (Prioritizing 'municipalities' path for manual, keeping all unique extracted)
            const uniqueMap = new Map();

            // Process Manual
            manualRecords.forEach((r: any) => {
                if (r.status === 'canceled') return;
                const id = r.id;

                if (!uniqueMap.has(id)) {
                    uniqueMap.set(id, r);
                } else {
                    if (!uniqueMap.get(id)._isNewPath && r._isNewPath) {
                        uniqueMap.set(id, r);
                    }
                }
            });

            // Process Extracted (Add them in)
            extractedRecords.forEach((r: any) => {
                // Extracted IDs are usually unique UUIDs from connector or local DB.
                // We add them. If collision is possible with manual, we might need prefix, 
                // but typically they are distinct sets.
                uniqueMap.set(r.id, r as EntityProductionRecord);
            });

            return Array.from(uniqueMap.values()) as EntityProductionRecord[];
        } catch (err) {
            console.error('Error fetching entity production range:', err);
            return [];
        }
    },

    /**
     * Calculate and persist progress for goals.
     * Scopes queries based on user permissions (Masters see Entity/Municipality, Professionals see own).
     */
    calculateGoalProgress: async (userClaims: any, competenceMonth: string): Promise<number> => {
        try {
            const entityId = userClaims.entityId;
            if (!entityId) throw new Error('Entity ID missing');

            console.log(`[calculateGoalProgress] Starting for User=${userClaims.uid}, Role=${userClaims.role}, Comp=${competenceMonth}`);

            // 1. Fetch Goals (Scoped)
            let goalsQuery;

            // Helper to build safe query
            if (userClaims.role === 'PROFESSIONAL') {
                if (!userClaims.professionalId) {
                    console.warn('[calculateGoalProgress] Professional role but no professionalId. Returning 0.');
                    return 0;
                }
                goalsQuery = query(
                    collectionGroup(db, COLLECTION_GROUP_NAME),
                    where('entityId', '==', entityId),
                    where('professionalId', '==', userClaims.professionalId)
                );
            } else if (userClaims.role === 'MASTER' && userClaims.municipalityId) {
                goalsQuery = query(
                    collectionGroup(db, COLLECTION_GROUP_NAME),
                    where('entityId', '==', entityId),
                    where('municipalityId', '==', userClaims.municipalityId)
                );
            } else {
                // Admin or Entity-level Master
                goalsQuery = query(
                    collectionGroup(db, COLLECTION_GROUP_NAME),
                    where('entityId', '==', entityId)
                );
            }

            const goalsSnap = await getDocs(goalsQuery);

            // Normalize and Filter Goals by Competence
            const goals = goalsSnap.docs.map(doc => {
                const data = doc.data() as any;
                let goalCompMonth = data.competenceMonth;
                if (!goalCompMonth && data.competence) {
                    // Normalize legacy competence
                    if (data.competence.includes('/')) {
                        goalCompMonth = data.competence.split('/').reverse().join('-');
                    } else if (data.competence.length === 6) {
                        goalCompMonth = `${data.competence.substring(0, 4)}-${data.competence.substring(4, 6)}`;
                    } else {
                        goalCompMonth = data.competence;
                    }
                }
                return { id: doc.id, ref: doc.ref, ...data, _normalizedCompetenceMonth: goalCompMonth } as Goal & { ref: any, _normalizedCompetenceMonth: string };
            }).filter(g => {
                // 3. Match Period (Start/End Range or Year Fallback)
                // 3. Match Period (Start/End Range or Year Fallback)
                if (g.startMonth && g.endMonth) {
                    // Check if current 'competenceMonth' is within range [startMonth, endMonth] inclusive
                    // Format of competenceMonth is YYYY-MM
                    // Format of g.startMonth/endMonth might be YYYY-MM OR YYYY-MM-DD
                    const startRaw = g.startMonth.substring(0, 7);
                    const endRaw = g.endMonth.substring(0, 7);

                    return competenceMonth >= startRaw && competenceMonth <= endRaw;
                }

                // strict match (e.g. 2025-01 === 2025-01)
                if (g._normalizedCompetenceMonth === competenceMonth) return true;
                // Annual Goal match (e.g. Goal=2025 matches Production=2025-01)
                if (g._normalizedCompetenceMonth.length === 4 && competenceMonth.startsWith(g._normalizedCompetenceMonth)) return true;

                return false;
            });

            // Deduplicate Goals
            const uniqueGoals = new Map();
            goals.forEach(g => uniqueGoals.set(g.id, g));
            const processedGoals = Array.from(uniqueGoals.values());

            console.log(`[calculateGoalProgress] Found ${processedGoals.length} goals for competence ${competenceMonth}`);
            if (processedGoals.length === 0) return 0;

            // 2. Fetch Production (Scoped)
            let productionQuery;

            if (userClaims.role === 'PROFESSIONAL') {
                productionQuery = query(
                    collectionGroup(db, 'procedures'),
                    where('entityId', '==', entityId),
                    where('professionalId', '==', userClaims.professionalId)
                );
            } else if (userClaims.role === 'MASTER' && userClaims.municipalityId) {
                productionQuery = query(
                    collectionGroup(db, 'procedures'),
                    where('entityId', '==', entityId),
                    where('municipalityId', '==', userClaims.municipalityId)
                );
            } else {
                productionQuery = query(
                    collectionGroup(db, 'procedures'),
                    where('entityId', '==', entityId)
                );
            }

            const productionSnap = await getDocs(productionQuery);
            const allProduction = productionSnap.docs.map(doc => ({ ...(doc.data() as any), _id: doc.id } as EntityProductionRecord));

            // Deduplicate Production (Handle dual-write)
            const uniqueProductionMap = new Map();
            allProduction.forEach(p => uniqueProductionMap.set(p._id, p));
            const uniqueProduction = Array.from(uniqueProductionMap.values());

            // Filter production by competence
            const production = uniqueProduction.filter(p => {
                const pComp = p.competenceMonth || p.competence;
                return pComp === competenceMonth;
            });

            console.log(`[calculateGoalProgress] Found ${production.length} production records`);

            // 3. Aggregate and Update
            let updatedCount = 0;

            for (const goal of processedGoals) {
                const goalProcCode = String(goal.procedureCode).trim();
                const goalMunId = goal.municipalityId;
                const goalUnitId = goal.unitId;
                const goalProfId = goal.professionalId;
                const goalType = goal.goalType;

                let matchedProduction: EntityProductionRecord[] = [];

                // Hierarchical Matching Logic
                // Hierarchical Matching Logic
                const baseProduction = production.filter(p => {
                    const pCode = String(p.procedureCode || '').trim();
                    const gCode = goalProcCode;

                    // Check if Goal is Macro (Group/SubGroup/Form) based on stored type or code length
                    // If SigtapTargetType is available, use it. Else, infer from code length (<10)
                    const isMacro = (goal.sigtapTargetType && ['Group', 'SubGroup', 'Form', 'Grupo', 'Subgrupo', 'Forma'].includes(goal.sigtapTargetType)) || gCode.length < 10;

                    if (isMacro) {
                        if (gCode.length === 2 && (p as any).groupCode === gCode) return true;
                        if (gCode.length === 4 && (p as any).groupCode + (p as any).subGroupCode === gCode) return true;
                        if (gCode.length === 6 && (p as any).groupCode + (p as any).subGroupCode + (p as any).formCode === gCode) return true;
                        return pCode.startsWith(gCode);
                    }
                    return pCode === gCode;
                });

                if (goalType === 'municipal') {
                    matchedProduction = baseProduction.filter(p => !goalMunId || !p.municipalityId || String(p.municipalityId).trim() === String(goalMunId).trim());
                } else if (goalType === 'unit') {
                    matchedProduction = baseProduction.filter(p => p.unitId === goalUnitId);
                } else if (goalType === 'professional') {
                    if (goalProfId && goalProfId !== 'team') {
                        matchedProduction = baseProduction.filter(p => p.professionalId === goalProfId);
                    } else {
                        matchedProduction = baseProduction.filter(p => p.unitId === goalUnitId);
                    }
                } else {
                    // Legacy Fallback
                    matchedProduction = baseProduction.filter(p => {
                        const matchUnit = String(p.unitId).trim() === String(goalUnitId).trim();
                        if (goalProfId && goalProfId !== 'team') {
                            return matchUnit && p.professionalId === goalProfId;
                        }
                        return matchUnit;
                    });
                }

                // Note: If Professional is running this, 'matchedProduction' will only contain THEIR production.
                // This might under-report Unit goals. 
                // Ideally, progress updates for Unit/Municipal goals should be done by Master or Cloud Function.
                // But we will proceed with what is visible.

                const currentQuantity = matchedProduction.reduce((acc, curr) => acc + (Number(curr.quantity) || 1), 0);

                // 4. Update Goal Document
                if (goal.currentQuantity !== currentQuantity) {
                    await updateDoc(goal.ref, {
                        currentQuantity: currentQuantity,
                        updatedAt: serverTimestamp(),
                        status: calculateGoalStatus(currentQuantity, goal.targetQuantity)
                    });
                    updatedCount++;

                    // 5. Write to Progress Subcollection
                    const progressCollectionRef = collection(goal.ref, 'progress');

                    const progressData: any = {
                        capturedAt: serverTimestamp(),
                        quantity: currentQuantity,
                        value: currentQuantity * (goal.unitValue || 0),
                        target: goal.targetQuantity,
                        percentage: goal.targetQuantity > 0 ? (currentQuantity / goal.targetQuantity) * 100 : 0,
                        status: calculateGoalStatus(currentQuantity, goal.targetQuantity),
                        competenceMonth: competenceMonth,
                        entityId: entityId,
                        municipalityId: goalMunId || null,
                        unitId: goal.unitId || null,
                        // FIX: If goal doesn't have professionalId (e.g. Unit goal) but a Professional is calculating, 
                        // we record WHO calculated it as the professionalId for this specific progress entry, 
                        // OR we keep it null if we want to strictly represent the Goal's owner.
                        // Given the user expectation ("production has ID"), we favor identifying the actor if they are a Professional.
                        professionalId: goal.professionalId || (userClaims.role === 'PROFESSIONAL' ? userClaims.professionalId : null),
                        procedureCode: goal.procedureCode,
                        calculatedBy: userClaims.uid || userClaims.user_id || 'system',
                        calculatedByRole: userClaims.role || 'unknown'
                    };

                    // Remove undefined keys to prevent Firestore errors
                    Object.keys(progressData).forEach(key => progressData[key] === undefined && delete progressData[key]);

                    await addDoc(progressCollectionRef, progressData);
                }


            }

            console.log(`[calculateGoalProgress] Updated ${updatedCount} goals.`);
            return updatedCount;

        } catch (error) {
            console.error('Error calculating goal progress:', error);
            throw error;
        }
    }
};

export interface EntityProductionRecord {
    procedureCode: string;
    competenceMonth: string;
    unitId: string;
    quantity: number;
    professionalId?: string;
    professionalProfileId?: string;
    userId?: string;
    professionalName?: string;
    entityId: string;
    [key: string]: any;
}
