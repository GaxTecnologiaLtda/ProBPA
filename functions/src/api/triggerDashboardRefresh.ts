import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { runManualAggregation } from "../aggregation/aggregateManualProduction";
import { runConnectorAggregation } from "../aggregation/aggregateConnectorProduction";
import { logSystemEvent, LogLevel } from '../utils/logger';

export const triggerDashboardRefresh = functions
    .region("southamerica-east1")
    .runWith({ memory: "512MB", timeoutSeconds: 300 })
    .https.onCall(async (data, context) => {
        // 1. Authentication Check
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated and associated with an entity.');
        }

        const entityId = context.auth.token.entityId;
        const year = data.year || String(new Date().getFullYear());
        const db = admin.firestore();

        console.log(`[triggerDashboardRefresh] Manual refresh triggered by ${context.auth.uid} for Entity: ${entityId}, Year: ${year}`);
        await logSystemEvent(LogLevel.INFO, 'Manual Dashboard Refresh Triggered', { entityId, year }, context.auth.uid);

        try {
            // 2. Fetch Entity Context
            const entityDoc = await db.doc(`entities/${entityId}`).get();
            if (!entityDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Entity not found.');
            }
            const entityData = entityDoc.data();
            const entityType = (entityData?.type === 'Privada' || entityData?.type === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';

            // 3. Trigger Manual Aggregation (Scoped)
            console.log(`[triggerDashboardRefresh] Triggering Manual Aggregation scoped to entity ${entityId} for year ${year}`);
            const manualPromises: Promise<any>[] = [];
            for (let i = 1; i <= 12; i++) {
                const monthStr = String(i).padStart(2, '0');
                const targetCompetence = `${year}-${monthStr}`;
                manualPromises.push(
                    runManualAggregation(targetCompetence, entityId).catch(e => {
                        console.error(`[triggerDashboardRefresh] Error aggregating manual data for ${targetCompetence}:`, e);
                    })
                );
            }
            await Promise.all(manualPromises);
            console.log(`[triggerDashboardRefresh] Manual aggregations for ${year} completed.`);

            // 4. Trigger Connector Aggregation for Target Entity's Municipalities
            console.log(`[triggerDashboardRefresh] Fetching municipalities for Connector Sync`);
            const munsQuery = db.collection('municipalities').doc(entityType).collection(entityId);
            const munsSnap = await munsQuery.get();

            const connectorPromises: Promise<any>[] = [];
            munsSnap.forEach(doc => {
                const munId = doc.id;
                console.log(`[triggerDashboardRefresh] Queuing Connector Aggregation for Mun: ${munId}`);
                connectorPromises.push(runConnectorAggregation(entityType, entityId, munId, year));
            });

            if (connectorPromises.length > 0) {
                await Promise.all(connectorPromises);
                console.log(`[triggerDashboardRefresh] Connector aggregations completed.`);
            }

            await logSystemEvent(LogLevel.INFO, 'Manual Dashboard Refresh Completed', { entityId, year }, context.auth.uid);

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
