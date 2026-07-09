import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

/**
 * Fetch all patients for a specific municipality within an entity
 * Secured via HTTPS Callable (requires authentication and correct entityId).
 */
export const getMunicipalityPatients = functions
    .region("southamerica-east1")
    .runWith({ memory: "512MB", timeoutSeconds: 60 })
    .https.onCall(async (data, context) => {
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated and associated with an entity.'
            );
        }

        const entityId = context.auth.token.entityId;
        const { municipalityId, entityType = 'PRIVATE', lastDocId, searchTerm } = data;
        const limit = data.limit ? Number(data.limit) : 500;

        if (!municipalityId) {
            throw new functions.https.HttpsError('invalid-argument', 'municipalityId is required.');
        }

        try {
            const db = admin.firestore();
            const collectionRef = db.collection(`municipalities/${entityType}/${entityId}/${municipalityId}/patients`);
            
            // Resolve total count globally for the UI
            const countSnap = await collectionRef.count().get();
            const totalCount = countSnap.data().count;

            let query = collectionRef as admin.firestore.Query;
            
            // Motor de Busca
            if (searchTerm) {
                const term = searchTerm.trim().toUpperCase();
                const isNumeric = /^\d+$/.test(term);
                
                if (isNumeric) {
                    // Busca por documento
                    if (term.length > 11) {
                        query = query.orderBy('cns').startAt(term).endAt(term + '\uf8ff');
                    } else {
                        query = query.orderBy('cpf').startAt(term).endAt(term + '\uf8ff');
                    }
                } else {
                    // Busca alfabética
                    query = query.orderBy('name').startAt(term).endAt(term + '\uf8ff');
                }
            } else {
                query = query.orderBy('name'); // Padrão
            }

            // Paginação por Cursor
            if (lastDocId) {
                const docSnap = await collectionRef.doc(lastDocId).get();
                if (docSnap.exists) {
                    query = query.startAfter(docSnap);
                }
            }

            const patientsSnap = await query.limit(limit).get();

            const patients: any[] = [];
            patientsSnap.forEach(doc => {
                // Ensure doc.id always overrides any inner garbage id
                patients.push({ ...doc.data(), id: doc.id });
            });

            return { 
                patients, 
                totalCount, 
                hasMore: patients.length === limit 
            };
        } catch (error: any) {
            console.error('[getMunicipalityPatients] Error:', error);
            throw new functions.https.HttpsError('internal', 'Failed to fetch patients.', error.message);
        }
    });

/**
 * Updates a patient's demographic record
 */
export const updatePatientRecord = functions
    .region("southamerica-east1")
    .runWith({ memory: "256MB" })
    .https.onCall(async (data, context) => {
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
        }

        const entityId = context.auth.token.entityId;
        const { municipalityId, entityType = 'PRIVATE', patientId, patientData } = data;

        console.log("[updatePatientRecord] Payload recebido:", { municipalityId, entityType, patientId, hasPatientData: !!patientData });

        if (!municipalityId || !patientId || !patientData) {
            console.error(`Missing parameters. munId:${municipalityId}, patId:${patientId}`);
            throw new functions.https.HttpsError('invalid-argument', `Missing parameters. munId:${municipalityId}, patId:${patientId}`);
        }

        try {
            const db = admin.firestore();
            const ref = db.doc(`municipalities/${entityType}/${entityId}/${municipalityId}/patients/${patientId}`);
            
            // Remove arbitrary fields that shouldn't be overridden if any
            const { id, ...safeData } = patientData;
            
            await ref.update({
                ...safeData,
                updatedAt: new Date().toISOString()
            });

            return { success: true };
        } catch (error: any) {
            console.error('[updatePatientRecord] Error:', error);
            throw new functions.https.HttpsError('internal', 'Failed to update patient.', error.message);
        }
    });

/**
 * Deletes a patient from the municipality base
 */
export const deletePatientRecord = functions
    .region("southamerica-east1")
    .runWith({ memory: "256MB" })
    .https.onCall(async (data, context) => {
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
        }

        const entityId = context.auth.token.entityId;
        const { municipalityId, entityType = 'PRIVATE', patientId } = data;

        if (!municipalityId || !patientId) {
            console.error(`[deletePatientRecord] Missing parameters. munId:${municipalityId}, patId:${patientId}`);
            throw new functions.https.HttpsError('invalid-argument', `Missing parameters. munId:${municipalityId}, patId:${patientId}`);
        }

        try {
            const db = admin.firestore();
            const ref = db.doc(`municipalities/${entityType}/${entityId}/${municipalityId}/patients/${patientId}`);
            
            await ref.delete();

            return { success: true };
        } catch (error: any) {
            console.error('[deletePatientRecord] Error:', error);
            throw new functions.https.HttpsError('internal', 'Failed to delete patient.', error.message);
        }
    });

/**
 * Imports a batch of patients (up to 500) efficiently using Firestore Batch
 */
export const importPatientsBatch = functions
    .region("southamerica-east1")
    .runWith({ memory: "512MB", timeoutSeconds: 300 })
    .https.onCall(async (data, context) => {
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
        }

        const entityId = context.auth.token.entityId;
        const { municipalityId, entityType = 'PRIVATE', patientsData } = data;

        if (!municipalityId || !patientsData || !Array.isArray(patientsData)) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing parameters or invalid patientsData.');
        }

        if (patientsData.length > 500) {
            throw new functions.https.HttpsError('invalid-argument', 'Batches must be at most 500 records.');
        }

        try {
            const db = admin.firestore();
            const collectionRef = db.collection(`municipalities/${entityType}/${entityId}/${municipalityId}/patients`);

            const extractIds = (field: 'cpf' | 'cns') => Array.from(new Set(patientsData.map(p => p[field]).filter(Boolean)));
            const cpfs = extractIds('cpf');
            const cnss = extractIds('cns');

            const existingIdentifiers = new Set<string>();

            const fetchExisting = async (field: 'cpf' | 'cns', values: string[]) => {
                const chunks: string[][] = [];
                for (let i = 0; i < values.length; i += 30) {
                    chunks.push(values.slice(i, i + 30));
                }
                for (const chunk of chunks) {
                    const snap = await collectionRef.where(field, 'in', chunk).get();
                    snap.forEach(doc => {
                        const data = doc.data();
                        if (data[field]) existingIdentifiers.add(`${field}:${data[field]}`);
                    });
                }
            };

            await Promise.all([
                cpfs.length > 0 ? fetchExisting('cpf', cpfs) : Promise.resolve(),
                cnss.length > 0 ? fetchExisting('cns', cnss) : Promise.resolve()
            ]);

            const batch = db.batch();
            const now = new Date().toISOString();
            let addedCount = 0;
            let duplicateCount = 0;

            for (const p of patientsData) {
                const hasCpf = p.cpf && existingIdentifiers.has(`cpf:${p.cpf}`);
                const hasCns = p.cns && existingIdentifiers.has(`cns:${p.cns}`);

                if (hasCpf || hasCns) {
                    duplicateCount++;
                    continue; // Skip completely if duplicate
                }

                // If adding, push to Set to catch intra-batch localized overlaps
                if (p.cpf) existingIdentifiers.add(`cpf:${p.cpf}`);
                if (p.cns) existingIdentifiers.add(`cns:${p.cns}`);

                const docRef = collectionRef.doc(); // Auto-generate ID if not provided
                batch.set(docRef, {
                    ...p,
                    municipalityId, // Safely enforce
                    createdAt: now,
                    updatedAt: now
                });
                addedCount++;
            }

            if (addedCount > 0) {
                await batch.commit();
            }

            return { success: true, count: addedCount, duplicates: duplicateCount };
        } catch (error: any) {
            console.error('[importPatientsBatch] Error:', error);
            throw new functions.https.HttpsError('internal', 'Failed to import patients batch.', error.message);
        }
    });

