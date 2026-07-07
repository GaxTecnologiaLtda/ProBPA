import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const ingestPecUltraData = functions
    .region("southamerica-east1")
    .https.onRequest(async (req, res) => {
        // 1. Method Check
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        // 2. Extract Data
        const body = req.body;
        const municipalityId = body.municipio_id || req.headers['x-municipality-id'] as string;
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ') || !municipalityId) {
            res.status(401).send('Unauthorized: Missing credentials');
            return;
        }

        // const apiKey = authHeader.split('Bearer ')[1];
        
        const tipoDado = body.tipo_dado;
        const records = body.registros;

        if (!records || !Array.isArray(records)) {
            res.status(400).send('Bad Request: "registros" array is required');
            return;
        }
        if (!tipoDado) {
            res.status(400).send('Bad Request: "tipo_dado" is required');
            return;
        }

        try {
            // [TEST MODE] For now, we bypass the deep credential checks that were in the old connector.
            // We just dump the data into a test collection for validation.
            // In production, we will verify the API Key against the Municipality doc.

            // const batch = db.batch();
            let count = 0;

            // Cloud Firestore has a limit of 500 writes per batch
            // The Python extractor sends in batches of 500, but we will chunk just in case
            const chunks: any[][] = [];
            for (let i = 0; i < records.length; i += 450) {
                chunks.push(records.slice(i, i + 450));
            }

            for (const chunk of chunks) {
                const chunkBatch = db.batch();
                for (const record of chunk) {
                    // Create a unique ID or let Firestore generate one
                    // Often records have id_paciente, cns, data_atendimento, etc.
                    // We'll let Firestore generate the document ID to avoid overwriting unless we have a clear primary key,
                    // but it's better to store it as a new document for the test phase.
                    
                    const docRef = db.collection('ultra_ingestion_test')
                                     .doc(municipalityId)
                                     .collection(tipoDado)
                                     .doc();

                    const dataToSave = {
                        ...record,
                        municipalityId: municipalityId,
                        ingestedAt: admin.firestore.FieldValue.serverTimestamp()
                    };

                    chunkBatch.set(docRef, dataToSave);
                    count++;
                }
                await chunkBatch.commit();
            }

            console.log(`[UltraIngestion] Saved ${count} records of type '${tipoDado}' for ${municipalityId}`);
            res.status(200).send({ success: true, count, tipo_dado: tipoDado });

        } catch (error) {
            console.error("Error processing Ultra ingestion:", error);
            res.status(500).send('Internal Server Error');
        }
    });
