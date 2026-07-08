import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const ingestUltraData = functions
    .region("southamerica-east1")
    .runWith({ timeoutSeconds: 300, memory: "512MB" })
    .https.onRequest(async (req, res) => {
        // Only accept POST requests
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }

        const apiKey = req.headers["x-api-key"] as string;

        if (!apiKey) {
            res.status(401).send("Unauthorized: Missing x-api-key header");
            return;
        }

        try {
            // 1. Authenticate and find the dedicated database ID
            // In a highly optimized scenario, we could use a memory cache here
            const entityQuery = await db.collection("entities")
                .where("connectorApiKey", "==", apiKey)
                .where("status", "==", "ACTIVE")
                .limit(1)
                .get();

            if (entityQuery.empty) {
                res.status(403).send("Forbidden: Invalid API Key or Inactive Entity");
                return;
            }

            const entityDoc = entityQuery.docs[0];
            const entityData = entityDoc.data();
            const dedicatedDatabaseId = entityData.dedicatedDatabaseId;
            const entityId = entityDoc.id;

            if (!dedicatedDatabaseId) {
                res.status(500).send("Internal Server Error: Entity does not have a dedicated database provisioned");
                return;
            }

            // 2. Parse the payload
            const payload = req.body;
            if (!payload || !payload.collection || !Array.isArray(payload.data)) {
                res.status(400).send("Bad Request: Invalid payload format. Expected { collection: string, data: any[] }");
                return;
            }

            const targetCollection = payload.collection;
            const records = payload.data;

            // 3. Connect to the dedicated database
            const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || admin.app().options.projectId;
            
            const dedicatedDb = new admin.firestore.Firestore({
                projectId: projectId,
                databaseId: dedicatedDatabaseId,
            });

            // 4. Batch write the records
            // Firestore batches allow up to 500 operations
            const batch = dedicatedDb.batch();
            let count = 0;

            for (const record of records) {
                if (count >= 500) {
                    // For now, we restrict payloads to 500. The connector should chunk.
                    break; 
                }
                
                // If the record has an 'id' field, we use it as the doc ID, otherwise auto-generate
                let docRef;
                if (record.id) {
                    docRef = dedicatedDb.collection(targetCollection).doc(String(record.id));
                } else {
                    docRef = dedicatedDb.collection(targetCollection).doc();
                }
                
                // Add timestamp
                const dataToSave = {
                    ...record,
                    _ingestedAt: admin.firestore.FieldValue.serverTimestamp()
                };

                batch.set(docRef, dataToSave, { merge: true });
                count++;
            }

            await batch.commit();

            // 5. Update Sync Status
            await dedicatedDb.collection("config").doc("sync_status").set({
                lastSync: admin.firestore.FieldValue.serverTimestamp(),
                lastCollection: targetCollection,
                recordsIngested: count
            }, { merge: true });

            res.status(200).json({
                success: true,
                message: `Ingested ${count} records into ${targetCollection} for database ${dedicatedDatabaseId}`
            });

        } catch (error: any) {
            console.error("Error ingesting data:", error);
            res.status(500).send("Internal Server Error");
        }
    });
