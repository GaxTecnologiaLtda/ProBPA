import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { runManualAggregation } from "../aggregation/aggregateManualProduction";
import { runConnectorAggregation } from "../aggregation/aggregateConnectorProduction";
import { logSystemEvent, LogLevel } from '../utils/logger';

export const triggerDashboardRefresh = functions
    .region("southamerica-east1")
    .runWith({ memory: "4GB", timeoutSeconds: 540 })
    .https.onCall(async (data, context) => {
        // 1. Authentication Check
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated and associated with an entity.');
        }

        const entityId = context.auth.token.entityId;
        const targetYears = ['2024', '2025', '2026'];
        const db = admin.firestore();

        console.log(`[triggerDashboardRefresh] Global manual refresh triggered by ${context.auth.uid} for Entity: ${entityId}, Years: ${targetYears.join(', ')}`);
        await logSystemEvent(LogLevel.INFO, 'Global Dashboard Refresh Triggered', { entityId, targetYears }, context.auth.uid);

        try {
            // 2. Fetch Entity Context
            const entityDoc = await db.doc(`entities/${entityId}`).get();
            if (!entityDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Entity not found.');
            }
            const entityData = entityDoc.data();
            const entityType = (entityData?.type === 'Privada' || entityData?.type === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';

            // 3. Trigger Global Aggregations Sequentially by Year (to respect memory limits)
            for (const year of targetYears) {
                console.log(`[triggerDashboardRefresh] ===== Processing Year ${year} =====`);
                
                // Manual Aggregation (Scoped)
                console.log(`[triggerDashboardRefresh] Triggering Manual Aggregation scoped to entity ${entityId} for year ${year} concurrently`);
                const manualPromises = Array.from({ length: 12 }, (_, i) => {
                    const monthStr = String(i + 1).padStart(2, '0');
                    const targetCompetence = `${year}-${monthStr}`;
                    return runManualAggregation(targetCompetence, entityId).catch(e => {
                        console.error(`[triggerDashboardRefresh] Error aggregating manual data for ${targetCompetence}:`, e);
                    });
                });
                await Promise.all(manualPromises);
                console.log(`[triggerDashboardRefresh] Manual aggregations for ${year} completed.`);

                // Connector Aggregation for Target Entity's Municipalities
                console.log(`[triggerDashboardRefresh] Fetching municipalities for Connector Sync`);
                const munsQuery = db.collection('municipalities').doc(entityType).collection(entityId);
                const munsSnap = await munsQuery.get();

                const munPromises = munsSnap.docs.map(doc => {
                    const munId = doc.id;
                    console.log(`[triggerDashboardRefresh] Processing Connector Aggregation for Mun: ${munId}`);
                    return runConnectorAggregation(entityType, entityId, munId, year).catch(e => {
                        console.error(`[triggerDashboardRefresh] Error running Connector Aggregation for Mun ${munId}:`, e);
                    });
                });
                await Promise.all(munPromises);

                console.log(`[triggerDashboardRefresh] Connector aggregations for ${year} completed.`);
            }

            console.log(`[triggerDashboardRefresh] Global aggregations completed.`);

            await logSystemEvent(LogLevel.INFO, 'Global Dashboard Refresh Completed', { entityId }, context.auth.uid);

            return {
                success: true,
                message: "Dashboard data synced successfully."
            };

        } catch (error: any) {
            console.error('[triggerDashboardRefresh] Error:', error);
            await logSystemEvent(LogLevel.ERROR, 'Manual Dashboard Refresh Failed', { entityId: context.auth?.token?.entityId, error: error.message }, context.auth?.uid);
            throw new functions.https.HttpsError('internal', 'Failed to refresh dashboard statistics manually.', error.message);
        }
    });
