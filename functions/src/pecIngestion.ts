import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const ingestPecData = functions
    .region("southamerica-east1")
    .https.onRequest(async (req, res) => {
        // 1. Method Check
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        // 2. Auth Headers
        const authHeader = req.headers.authorization;
        const municipalityId = req.headers['x-municipality-id'] as string;

        if (!authHeader || !authHeader.startsWith('Bearer ') || !municipalityId) {
            res.status(401).send('Unauthorized: Missing credentials');
            return;
        }

        const apiKey = authHeader.split('Bearer ')[1];

        try {
            // 3. Verify Creds against Firestore
            // Schema: municipalities/{PUBLIC|PRIVATE}/{ENTITY_ID}/{MUNICIPALITY_ID}
            // Since {ENTITY_ID} is dynamic, we must scan or know it. We don't know it.
            // Using Admin SDK to list all Entities and check.

            let munDoc: admin.firestore.DocumentSnapshot | null = null;

            // Define roots to scan
            const roots = ['municipalities/PUBLIC', 'municipalities/PRIVATE'];

            for (const rootPath of roots) {
                if (munDoc) break;

                const rootRef = db.doc(rootPath);
                try {
                    const entityCollections = await rootRef.listCollections();

                    // Optimization: Check in parallel batches for this root
                    const checks = entityCollections.map(col => col.doc(municipalityId).get());
                    const results = await Promise.all(checks);

                    const found = results.find(d => d.exists);
                    if (found) {
                        munDoc = found;
                    }
                } catch (e) {
                    console.log(`Scanning skipped for ${rootPath}:`, e);
                }
            }

            if (!munDoc || !munDoc.exists) {
                res.status(404).send('Municipality not found (Scanning failed)');
                return;
            }

            const munData = munDoc.data();
            // Check both root location (legacy) and lediConfig (new)
            const storedKey = munData?.lediConfig?.apiKey || munData?.apiKey;

            if (!storedKey || storedKey !== apiKey) {
                console.warn(`[Security] Invalid API Key attempt for MunID: ${municipalityId}`);
                res.status(403).send('Forbidden: Invalid API Key');
                return;
            }

            // 4. Process Records
            const records = req.body.records;
            if (!records || !Array.isArray(records)) {
                res.status(400).send('Bad Request: "records" array is required');
                return;
            }

            const batch = db.batch();
            let count = 0;

            // TODO: Handle batches > 500 (Firestore limit). 
            // For now, assuming the Python script sends chunks of 100 as coded.
            // If API receives more, we might need multiple commits.

            for (const record of records) {
                if (!record.externalId) continue;

                // NEW SCHEMA: municipalities/{type}/{entId}/{munId}/extractions/{docId}
                // munDoc.ref is the reference to the municipality document found in the scan
                const docRef = munDoc.ref.collection('extractions').doc(record.externalId);

                const dataToSave = {
                    ...record,
                    municipalityId: municipalityId, // Keep redundant ID for ease, though implicit in path
                    ingestedAt: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'PENDING'
                };

                batch.set(docRef, dataToSave, { merge: true }); // Merge updates existing
                count++;
            }

            await batch.commit();

            console.log(`[Ingestion] Saved ${count} records for ${municipalityId}`);
            res.status(200).send({ success: true, count });

        } catch (error) {
            console.error("Error processing ingestion:", error);
            res.status(500).send('Internal Server Error');
        }
    });
