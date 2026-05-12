import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { logSystemEvent, LogLevel } from '../utils/logger';

/**
 * Reusable logic for Manual Aggregation.
 * Can be called by Scheduled Trigger or HTTP Debug Trigger.
 */
export const runManualAggregation = async (targetCompetence?: string, entityId?: string) => {
    const db = admin.firestore();

    // By default, if no targetCompetence is specified, we fetch EVERYTHING (Global aggregation)
    // as requested by the user, to avoid the "End of Month Abyss" where retroactive records are lost.
    let targetCompStr = targetCompetence ? targetCompetence : 'ALL';

    console.log(`[ManualAggregation] Starting for competence: ${targetCompStr}`);
    await logSystemEvent(LogLevel.INFO, 'Manual Aggregation Started', { competence: targetCompStr, entityId });

    try {
        // 1. Query procedures
        // If targetCompetence is provided, filter. Otherwise, fetch all procedures.
        let queryRef: admin.firestore.Query = db.collectionGroup('procedures');

        if (targetCompetence) {
            queryRef = queryRef.where('competenceMonth', '==', targetCompetence);
        }

        if (entityId) {
            queryRef = queryRef.where('entityId', '==', entityId);
        }

        const snapshot = await queryRef.get();

        if (snapshot.empty) {
            console.log(`[ManualAggregation] No manual production found for ${targetCompStr}`);
            await logSystemEvent(LogLevel.INFO, 'Manual Aggregation Skipped (No Data)', { competence: targetCompStr, entityId });
            return { success: true, message: `No records found for ${targetCompStr}`, count: 0 };
        }

        console.log(`[ManualAggregation] Found ${snapshot.size} procedure records to aggregate.`);

        // 2. Aggregate Data in Memory
        // Map<CompetenceDocPath, Map<DateStr, Stats>>
        const aggregations = new Map<string, Map<string, any>>();
        let mismatchedPaths = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // --- PATH PARSING HELPER ---
            const segments = doc.ref.path.split('/');

            // EXACT PATH FILTER: 
            // The collectionGroup('procedures') grabs from everywhere. We ONLY want records inside 'municipalities/'
            if (segments[0] !== 'municipalities') {
                mismatchedPaths++;
                continue;
            }

            // Also skip if it is inside legacy bpa_records path which does not belong to municipalities structure directly at root
            if (doc.ref.path.includes('/bpa_records/') && !doc.ref.path.startsWith('municipalities/')) {
                mismatchedPaths++;
                continue;
            }

            // Strategy: Find 'professionals' segment and extract the ID.
            // Then CONSTRUCT the target path instead of relying on it being present.
            // Canonical Path: .../professionals/{profId}/...

            const profIndex = segments.lastIndexOf('professionals');
            if (profIndex === -1 || segments.length < profIndex + 2) {
                console.warn(`[ManualAggregation] Could not find professional context for: ${doc.ref.path}`);
                mismatchedPaths++;
                continue;
            }

            // Extract Professional Path parts
            const professionalDocPath = segments.slice(0, profIndex + 2).join('/');

            // Use the document's own competenceMonth if available, otherwise fallback to the current/target one
            const docCompetence = data.competenceMonth || (data.competence ? `${data.competence.substring(0, 4)}-${data.competence.substring(4, 6)}` : null);
            
            // Se o documento não tiver competência, ignoramos ou usamos um fallback? Melhor pular pois compromete os relatórios.
            if (!docCompetence) {
                console.warn(`[ManualAggregation] Doc missing competenceMonth: ${doc.ref.path}`);
                mismatchedPaths++;
                continue;
            }

            // Construct Target Competence Path
            const competenceDocPath = `${professionalDocPath}/competencias/${docCompetence}`;

            // Date Doc ID
            let dateStr = 'unknown';

            // Try to find 'dates' segment if it exists (legacy/specific structure)
            const dateIndex = segments.lastIndexOf('dates');
            if (dateIndex !== -1 && segments.length > dateIndex + 1) {
                dateStr = segments[dateIndex + 1];
            } else {
                // Fallback: Use data.productionDate (Standard)
                if (data.productionDate) {
                    // "2026-02-11 10:00:00" -> "11-02-2026"
                    const [ymd] = data.productionDate.split(' ');
                    const [y, m, d] = ymd.split('-');
                    dateStr = `${d}-${m}-${y}`;
                }
            }

            // Initialize Map
            if (!aggregations.has(competenceDocPath)) {
                aggregations.set(competenceDocPath, new Map());
            }
            const dateMap = aggregations.get(competenceDocPath)!;

            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, {
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                    units: {}
                });
            }

            // Aggregate
            const dailyDoc = dateMap.get(dateStr)!;
            const qty = Number(data.quantity) || 1;
            const code = data.procedureCode || data.code || 'UNKNOWN';
            const uId = data.unitId || 'unknown_unit';
            const uName = data.unitName || 'Unknown Unit';
            const pId = data.professionalId || 'unknown_prof';
            const pName = data.professionalName || 'Unknown Professional';

            if (!dailyDoc.units[uId]) {
                dailyDoc.units[uId] = {
                    unitName: uName,
                    professionals: {}
                };
            }

            if (!dailyDoc.units[uId].professionals[pId]) {
                dailyDoc.units[uId].professionals[pId] = {
                    professionalName: pName,
                    procedures: {},
                    canceledProcedures: {}
                };
            }

            const profStats = dailyDoc.units[uId].professionals[pId];
            if (data.status === 'canceled') {
                profStats.canceledProcedures = profStats.canceledProcedures || {};
                profStats.canceledProcedures[code] = (profStats.canceledProcedures[code] || 0) + qty;
            } else {
                profStats.procedures[code] = (profStats.procedures[code] || 0) + qty;
            }
        }

        console.log(`[ManualAggregation] Aggregation complete. Mismatched/Skipped paths: ${mismatchedPaths}`);

        // 3. Write updates to Firestore
        const batchLimit = 500;
        let batch = db.batch();
        let opCount = 0;
        let totalUpdated = 0;

        for (const [compPath, dateMap] of aggregations) {
            const compRef = db.doc(compPath);

            // Ensure competence doc exists (optional, but good practice)
            // batch.set(compRef, { lastAggregation: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            // opCount++; 

            for (const [dateStr, stats] of dateMap) {
                const summaryDocRef = compRef.collection('resumo_producao').doc(dateStr);

                // Overwrite the document completely instead of merging so subsequent runs don't compound totals with old data if things were deleted/changed
                batch.set(summaryDocRef, stats);
                opCount++;
                totalUpdated++;

                if (opCount >= batchLimit) {
                    await batch.commit();
                    batch = db.batch();
                    opCount = 0;
                }
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        console.log(`[ManualAggregation] DB Write Completed. Updated ${totalUpdated} summary documents.`);

        await logSystemEvent(LogLevel.INFO, 'Manual Aggregation Completed', {
            competence: targetCompStr,
            entityId: entityId || 'all',
            recordsFound: snapshot.size,
            mismatchedPaths,
            summariesUpdated: totalUpdated
        });

        return { success: true, count: totalUpdated, skipped: mismatchedPaths };

    } catch (error: any) {
        console.error('[ManualAggregation] Failed:', error);
        if (error.code === 9 || error.message?.includes('FAILED_PRECONDITION')) {
            console.error('[ManualAggregation] INDEX REQUIRED. Details:', error.details);
            console.error('[ManualAggregation] INDEX REQUIRED. Message:', error.message);
        }
        await logSystemEvent(LogLevel.ERROR, 'Manual Aggregation Failed', {
            error: error.message,
            code: error.code,
            competence: targetCompStr,
            entityId
        });
        throw error;
    }
};

/**
 * Aggregates manual production data daily.
 * Triggered at 10:00 UTC-3 (BRT) daily.
 */
export const aggregateManualProduction = functions.pubsub.schedule('0 10 * * *')
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
        await runManualAggregation();
        return null;
    });
