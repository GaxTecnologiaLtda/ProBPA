import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { runManualAggregation } from "../aggregation/aggregateManualProduction";
import { runConnectorAggregation } from "../aggregation/aggregateConnectorProduction";
import { logSystemEvent, LogLevel } from '../utils/logger';

export const triggerDashboardSubsedeRefresh = functions
    .region("southamerica-east1")
    .runWith({ memory: "1GB", timeoutSeconds: 540 })
    .https.onCall(async (data, context) => {
        // 1. Authentication Check
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated and associated with an entity.');
        }

        const entityId = context.auth.token.entityId;
        const municipalityId = data.municipalityId || context.auth.token.municipalityId;
        const year = data.year || String(new Date().getFullYear());
        const db = admin.firestore();

        if (!municipalityId) {
            throw new functions.https.HttpsError('invalid-argument', 'Municipality ID is required for Subsede refresh.');
        }

        console.log(`[triggerDashboardSubsedeRefresh] Manual refresh triggered by ${context.auth.uid} for Entity: ${entityId}, Municipality: ${municipalityId}, Year: ${year}`);
        await logSystemEvent(LogLevel.INFO, 'Manual Dashboard Subsede Refresh Triggered', { entityId, municipalityId, year }, context.auth.uid);

        try {
            // 2. Fetch Entity Context
            const entityDoc = await db.doc(`entities/${entityId}`).get();
            if (!entityDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Entity not found.');
            }
            const entityData = entityDoc.data();
            const entityType = (entityData?.type === 'Privada' || entityData?.type === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';

            // 3. Trigger Manual Aggregation
            // runManualAggregation currently scopes to entityId, which handles everything.
            // That's fine, it will refresh all manual data for the entity, not just the municipality, 
            // but the fetch function will naturally only read the municipality data.
            console.log(`[triggerDashboardSubsedeRefresh] Triggering Manual Aggregation scoped to entity ${entityId} for year ${year}`);
            const manualPromises: Promise<any>[] = [];
            for (let i = 1; i <= 12; i++) {
                const monthStr = String(i).padStart(2, '0');
                const targetCompetence = `${year}-${monthStr}`;
                manualPromises.push(
                    runManualAggregation(targetCompetence, entityId).catch(e => {
                        console.error(`[triggerDashboardSubsedeRefresh] Error aggregating manual data for ${targetCompetence}:`, e);
                    })
                );
            }
            await Promise.all(manualPromises);
            console.log(`[triggerDashboardSubsedeRefresh] Manual aggregations for ${year} completed.`);

            // 4. Trigger Connector Aggregation for Specific Municipality
            console.log(`[triggerDashboardSubsedeRefresh] Queuing Connector Aggregation for Mun: ${municipalityId}`);
            await runConnectorAggregation(entityType, entityId, municipalityId, year);
            console.log(`[triggerDashboardSubsedeRefresh] Connector aggregations completed.`);

            await logSystemEvent(LogLevel.INFO, 'Manual Dashboard Subsede Refresh Completed', { entityId, municipalityId, year }, context.auth.uid);

            return {
                success: true,
                message: "Dashboard subsede data synced successfully."
            };

        } catch (error: any) {
            console.error('[triggerDashboardSubsedeRefresh] Error:', error);
            await logSystemEvent(LogLevel.ERROR, 'Manual Dashboard Subsede Refresh Failed', { entityId: context.auth?.token?.entityId, error: error.message }, context.auth?.uid);
            throw new functions.https.HttpsError('internal', 'Failed to refresh dashboard subsede statistics manually.', error.message);
        }
    });
