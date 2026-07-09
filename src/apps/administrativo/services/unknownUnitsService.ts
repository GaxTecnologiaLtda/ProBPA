import { collectionGroup, getDocs, doc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export interface UnknownUnitRecord {
    entityId: string;
    municipalityId: string;
    competence: string;
    date: string;
    professionalId: string;
    professionalName: string;
    procedures: Record<string, number>;
}

export const unknownUnitsService = {
    /**
     * Fetches all aggregated unknown units from all 'resumo_producao' subcollections.
     * Note: This might be heavy, in a large scale production it should be filtered by entity or date.
     */
    async fetchAggregatedUnknowns(): Promise<UnknownUnitRecord[]> {
        const results: UnknownUnitRecord[] = [];

        // This queries all 'resumo_producao' subcollections across the entire database
        const summariesSnap = await getDocs(collectionGroup(db, 'resumo_producao'));

        summariesSnap.forEach(docSnap => {
            const data = docSnap.data();

            // Check if there is any 'unknown_unit' key in the units map
            if (data.units && data.units['unknown_unit']) {
                const unknownUnitData = data.units['unknown_unit'];

                if (unknownUnitData.professionals) {
                    const pathParts = docSnap.ref.path.split('/');

                    // Path parsing based on aggregate connector logic:
                    // municipalities/{entityType}/{entityId}/{munId}/extractions/{year}/competences/{compId}/resumo_producao/{dateStr}
                    let entityId = 'Unknown Entity';
                    let municipalityId = 'Unknown Municipality';
                    let competence = 'Unknown Competence';
                    const dateStr = docSnap.id;

                    if (pathParts.length >= 10 && pathParts[0] === 'municipalities') {
                        entityId = pathParts[2];
                        municipalityId = pathParts[3];

                        // Extract competence
                        const compIndex = pathParts.indexOf('competences');
                        if (compIndex !== -1 && pathParts.length > compIndex + 1) {
                            competence = pathParts[compIndex + 1];
                        }
                    }

                    for (const [profId, profData] of Object.entries(unknownUnitData.professionals)) {
                        const profRecord = profData as any;
                        results.push({
                            entityId,
                            municipalityId,
                            competence,
                            date: dateStr,
                            professionalId: profId,
                            professionalName: profRecord.professionalName || 'Não Identificado',
                            procedures: profRecord.procedures || {}
                        });
                    }
                }
            }
        });

        return results;
    },

    /**
     * Fetches the raw records from 'extraction_records' for a specific professional on a specific date in a specific competence.
     */
    async fetchRawUnknownRecords(
        entityId: string,
        municipalityId: string,
        competence: string, // format MM-YYYY
        professionalId: string,
        professionalName: string, // Added to augment match
        dateStr: string // DD-MM-YYYY or similar mapped in productionDate
    ): Promise<any[]> {
        // Build the path to extraction_records
        // Path: municipalities/PRIVATE/{entityId}/{munId}/extractions/{year}/competences/{competence}/extraction_records
        // Warning: entityType might be PUBLIC or other, but PRIVATE is most common. We can try PRIVATE first.
        // Also the year is derived from the competence (MM-YYYY).
        const parts = competence.split('-');
        if (parts.length !== 2) return [];
        const year = parts[1];

        const possibleEntityTypes = ['PRIVATE', 'PUBLIC']; // Can expand if needed
        let rawDocs: any[] = [];

        for (const type of possibleEntityTypes) {
            const recordsRef = collection(db, 'municipalities', type, entityId, municipalityId, 'extractions', year, 'competences', competence, 'extraction_records');

            try {
                // To fetch efficiently, we ideally want to query by professionalId/professional.cns/professional.cpf 
                // However, 'unknown_units' usually mean unit.cnes is empty. 
                // We'll query by professionalId roughly or just fetch records missing units if we can.
                // Since Firestore doesn't easily support querying "where unit.cnes is empty", 
                // we might need to fetch a chunk and filter, OR query by date string.

                // Construct date string equivalent to YYYY-MM-DD
                const dParts = dateStr.split('-');
                let targetDatePrefix = '';
                if (dParts.length === 3) {
                    targetDatePrefix = `${dParts[2]}-${dParts[1]}-${dParts[0]}`; // YYYY-MM-DD
                }

                // First try to check if path exists
                let q;
                if (targetDatePrefix) {
                    // Try to filter by date prefix universally using \uf8ff character
                    q = query(
                        recordsRef,
                        where('productionDate', '>=', targetDatePrefix),
                        where('productionDate', '<=', targetDatePrefix + '\uf8ff')
                    );
                } else {
                    q = query(recordsRef, limit(500));
                }

                const snap = await getDocs(q);
                if (!snap.empty) {
                    let filtered = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));

                    // Extract actual ID if it is a compound key (like entityId_profId)
                    let baseProfId = String(professionalId);
                    if (professionalId.includes('_')) {
                        const parts = professionalId.split('_');
                        baseProfId = parts[parts.length - 1]; // Assume the last part is the actual ID (CNS/CPF)
                    }

                    // 1. First, isolate all records for on this date for the professional
                    let profRecords = snap.docs.map(d => ({ id: d.id, ...d.data() as any })).filter(rec => {
                        const prof = rec.professional || {};
                        const profNameRaw = String(prof.name || '').toUpperCase().trim();
                        const targetNameRaw = String(professionalName || '').toUpperCase().trim();

                        const pId = String(rec.professionalId || '').trim();
                        const pCns = String(prof.cns || '').trim();
                        const pCpf = String(prof.cpf || '').trim();
                        const tgtId = baseProfId.trim();

                        const matchesProf =
                            pId === tgtId ||
                            pCns === tgtId ||
                            pCpf === tgtId ||
                            (profNameRaw && profNameRaw === targetNameRaw) ||
                            pId === professionalId ||
                            pCns === professionalId;

                        return matchesProf;
                    });

                    // 2. Identify strictly broken records (NO cnes in unit, AND NO valid cnes in externalId)
                    const strictlyUnknown = profRecords.filter(rec => {
                        const recCnesRaw = String(rec.unit?.cnes || '').trim();
                        const extId = String(rec.externalId || '');
                        let hasExtCnes = false;

                        if (extId && !extId.startsWith('_-_') && !extId.startsWith('null-')) {
                            const possibleCnes = extId.split('-')[0];
                            if (possibleCnes && possibleCnes.length === 7 && !isNaN(Number(possibleCnes))) {
                                hasExtCnes = true;
                            }
                        }

                        const isNullCnes = !recCnesRaw || recCnesRaw === 'null' || recCnesRaw === 'undefined';
                        return isNullCnes && !hasExtCnes;
                    });

                    // 3. Fallback logic: If strictly broken records exist, return ONLY them.
                    // If none exist, return ALL of the professional's records to let the user see them (meaning the aggregator flagged them because the CNES wasn't registered, not because it was null).
                    if (strictlyUnknown.length > 0) {
                        rawDocs = rawDocs.concat(strictlyUnknown);
                    } else if (profRecords.length > 0) {
                        rawDocs = rawDocs.concat(profRecords);
                    } else {
                        // Edge case fallback: no records for this professional on this date at all. Let's return any strict unknowns for ANY professional on this date
                        console.warn(`[UnknownUnits] No professional match found for ${professionalName}. Falling back to ANY strictly orphaned records in this date.`);
                        const anyStrictUnknown = snap.docs.map(d => ({ id: d.id, ...d.data() as any })).filter(rec => {
                            const isNullCnes = !rec.unit?.cnes || String(rec.unit.cnes).trim() === '' || String(rec.unit.cnes) === 'null';
                            return isNullCnes;
                        });
                        rawDocs = rawDocs.concat(anyStrictUnknown);
                    }
                }
            } catch (err) {
                console.error(`Error fetching raw records from type ${type}:`, err);
            }
        }

        return rawDocs;
    }
};
