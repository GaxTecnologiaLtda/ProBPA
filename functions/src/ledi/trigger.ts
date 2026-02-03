import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { LediService } from "./service";
import {
    LediConfig,
    LediOriginadora,
    LediRemetente
} from "./types";
import { processLediRecord } from "./dispatcher";
// import { v4 as uuidv4 } from 'uuid'; // Unused now

const db = admin.firestore();

// --- HELPER: Batch Management ---
async function createBatch(municipalityId: string, type: 'MANUAL' | 'SCHEDULED', recordCount: number) {
    const batchRef = db.collection("ledi_batches").doc();
    // Fetch Mun Name for UI convenience
    const munDoc = await db.collection("municipalities").doc(municipalityId).get();
    const munName = munDoc.data()?.name || "Desconhecido";

    const now = admin.firestore.FieldValue.serverTimestamp();
    const competence = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });

    await batchRef.set({
        batchId: batchRef.id,
        competence: competence,
        municipalityId,
        municipalityName: munName,
        cnes: "MULTIPLE",
        unitName: type === 'MANUAL' ? "Envio Manual" : "Envio Agendado",
        batchType: 'PEC_APS',
        recordsCount: recordCount,
        status: 'GENERATED', // Initial status
        fileName: `BATCH_${type}_${batchRef.id.substring(0, 8).toUpperCase()}`,
        generatedAt: now,
        type: type
    });

    return batchRef;
}

async function closeBatch(batchRef: FirebaseFirestore.DocumentReference, successCount: number, errorCount: number) {
    let status = 'SENT';
    if (errorCount > 0 && successCount === 0) status = 'ERROR';
    else if (errorCount > 0) status = 'PARTIAL';

    await batchRef.update({
        status: status,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        summary: { success: successCount, errors: errorCount }
    });
}
// --------------------------------

/**
 * Callable function for the Admin Panel to test if credentials are valid.
 */
export const testLediConnection = onCall(async (request) => {
    // Only admins can test connections
    const { url, user, password } = request.data;
    if (!url || !user || !password) {
        throw new HttpsError('invalid-argument', 'Missing credentials');
    }

    const config: LediConfig = {
        pecUrl: url,
        pecUser: user,
        pecPassword: password,
        integrationStatus: 'ACTIVE'
    };

    const service = new LediService(config);
    try {
        const result = await service.login();
        return { success: true, message: "Conexão bem sucedida!", session: result.jsessionid };
    } catch (error: any) {
        throw new HttpsError('unavailable', error.message || "Erro ao conectar com PEC");
    }
});

/**
 * Callable function to manually resend pending/error Ledi records for a municipality.
 * Intended for Administrative control.
 */
export const resendPendingLediRecords = onCall(async (request) => {
    // Basic Auth Check (Implicit via Firebase calls, but good to check context)
    // if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in');

    const { municipalityId, forceBypassStatus } = request.data;

    if (!municipalityId) {
        throw new HttpsError('invalid-argument', 'Municipality ID is required');
    }

    // 1. Get Municipality Config
    const munDoc = await db.collection("municipalities").doc(municipalityId).get();
    if (!munDoc.exists) {
        throw new HttpsError('not-found', 'Municipality not found');
    }
    const munData = munDoc.data();
    const config = munData?.lediConfig as LediConfig;

    // Strict check for scheduled/normal runs, lax check if forced
    if (!forceBypassStatus && (!config || config.integrationStatus !== 'ACTIVE' || !config.pecUrl)) {
        throw new HttpsError('failed-precondition', 'LEDI Integration is not ACTIVE for this municipality');
    }

    // Even if forced, we need at least a URL to try sending (or fail gracefully later)
    if (!config?.pecUrl && !forceBypassStatus) {
        throw new HttpsError('failed-precondition', 'LEDI Configuration missing PEC URL');
    }

    // 2. Prepare Credentials
    const contraChave = config.contraChave || "MISSING_CONTRA_CHAVE";
    const senderCnpj = config.cnpjRemetente || munData?.cnpj || "00000000000191";

    const originadora: LediOriginadora = {
        contraChave: contraChave,
        cpfCnpj: senderCnpj
    };
    const remetente: LediRemetente = {
        contraChave: contraChave,
        cnpj: senderCnpj
    };

    // 3. Get Pending/Error Records
    // We retry both PENDENTE_ENVIO and ERRO_ENVIO
    const pendingSnapshot = await db.collectionGroup("procedures")
        .where("careContext.system", "==", "LEDI")
        .where("integration.status", "in", ["PENDENTE_ENVIO", "ERRO_ENVIO"])
        .where("municipalityId", "==", municipalityId)
        .limit(50) // Limit to avoid timeouts
        .get();

    if (pendingSnapshot.empty) {
        return { success: true, count: 0, message: "No pending records found." };
    }

    // --- CREATE BATCH ---
    const batchRef = await createBatch(municipalityId, 'MANUAL', pendingSnapshot.size);
    // --------------------

    const service = new LediService(config);
    let successCount = 0;
    let errorCount = 0;

    for (const recordDoc of pendingSnapshot.docs) {
        if (!recordDoc.ref.path.includes('municipalities')) continue;

        const data = recordDoc.data();

        try {
            // Reprocess (Thrift Generation)
            const { content, uuid, type } = await processLediRecord(
                data,
                originadora,
                remetente,
                municipalityId,
                data.currentUnit?.cnes
            );

            // Send
            const response = await service.sendBatch(content, uuid);

            if (response.success) {
                await recordDoc.ref.update({
                    "integration.status": "ENVIADO_PEC",
                    "integration.sentAt": new Date().toISOString(),
                    "integration.uuidFicha": uuid,
                    "integration.pecResponse": response.data,
                    "integration.sheetType": type
                });

                // Log Success to Batch
                await batchRef.collection("logs").add({
                    type: "SUCCESS",
                    message: `[MANUAL] Ficha ${uuid} enviada. Tipo: ${type}`,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    recordId: recordDoc.id
                });
                successCount++;

            } else {
                await recordDoc.ref.update({
                    "integration.status": "ERRO_ENVIO",
                    "integration.lastError": response.message
                });

                // Log Error to Batch
                await batchRef.collection("logs").add({
                    type: "ERROR",
                    message: `[MANUAL] Erro envio ${uuid}: ${response.message}`,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    payloadDebug: content.toString('base64'), // Log base64 for debug
                    recordId: recordDoc.id
                });
                errorCount++;
            }

        } catch (err: any) {
            console.error(`Error reprocessing record ${recordDoc.id}:`, err);
            await recordDoc.ref.update({
                "integration.status": "ERRO_INTERNO",
                "integration.lastError": err.message
            });
            await batchRef.collection("logs").add({
                type: "ERROR",
                message: `Internal Error Record ${recordDoc.id}: ${err.message}`,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            errorCount++;
        }
    }

    // --- CLOSE BATCH ---
    await closeBatch(batchRef, successCount, errorCount);
    // -------------------

    return {
        success: true,
        count: pendingSnapshot.size,
        successCount,
        errorCount,
        message: `Processed ${pendingSnapshot.size} records. Success: ${successCount}, Error: ${errorCount}`
    };
});

/**
 * Scheduled function (Every night at 00:00) to send pending records.
 */
export const scheduledLediSender = onSchedule({
    schedule: "0 0 * * *",
    timeZone: "America/Sao_Paulo",
    timeoutSeconds: 540,
    region: "southamerica-east1"
}, async (event) => {
    console.log("Starting Scheduled LEDI Sender (Strict XSD Mode)...");

    // 1. Get all Municipalities with ACTIVE integration
    const munSnapshot = await db.collection("municipalities")
        .where("lediConfig.integrationStatus", "==", "ACTIVE")
        .get();

    if (munSnapshot.empty) {
        console.log("No active municipalities found.");
        return;
    }

    for (const doc of munSnapshot.docs) {
        const munData = doc.data();
        const config = munData.lediConfig as LediConfig;
        if (!config || !config.pecUrl) continue;

        const municipalityId = doc.id;
        console.log(`Processing Municipality: ${municipalityId}`);

        // Get Credentials for Envelope
        // Get Credentials for Envelope
        const contraChave = config.contraChave || "MISSING_CONTRA_CHAVE";
        const senderCnpj = config.cnpjRemetente || munData.cnpj || "00000000000191";

        const originadora: LediOriginadora = {
            contraChave: contraChave,
            cpfCnpj: senderCnpj
        };
        const remetente: LediRemetente = {
            contraChave: contraChave,
            cnpj: senderCnpj
        };

        // 3. Get Pending Records
        const pendingSnapshot = await db.collectionGroup("procedures")
            .where("careContext.system", "==", "LEDI")
            .where("integration.status", "==", "PENDENTE_ENVIO")
            .where("municipalityId", "==", municipalityId)
            .limit(50) // Conservative limit for heavy XML generation
            .get();

        if (pendingSnapshot.empty) {
            console.log(`No pending records for ${municipalityId}`);
            continue;
        }

        // --- CREATE BATCH ---
        const batchRef = await createBatch(municipalityId, 'SCHEDULED', pendingSnapshot.size);
        // --------------------

        const service = new LediService(config);
        let successCount = 0;
        let errorCount = 0;

        for (const recordDoc of pendingSnapshot.docs) {
            // CRITICAL: Prevent double sending due to dual-write (Legacy + New Path)
            // We only process records from the new 'municipalities' path structure
            if (!recordDoc.ref.path.includes('municipalities')) {
                console.log(`Skipping legacy path record: ${recordDoc.id}`);
                continue;
            }

            const data = recordDoc.data();

            try {
                // Thrift Generation
                const { content, uuid, type } = await processLediRecord(
                    data,
                    originadora,
                    remetente,
                    municipalityId,
                    data.currentUnit?.cnes
                );

                // Send
                const response = await service.sendBatch(content, uuid);

                if (response.success) {
                    await recordDoc.ref.update({
                        "integration.status": "ENVIADO_PEC",
                        "integration.sentAt": new Date().toISOString(),
                        "integration.uuidFicha": uuid,
                        "integration.pecResponse": response.data,
                        "integration.sheetType": type
                    });

                    // Log Success
                    await batchRef.collection("logs").add({
                        type: "SUCCESS",
                        message: `Ficha ${uuid} enviada. Tipo: ${type}`,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        recordId: recordDoc.id
                    });
                    successCount++;

                } else {
                    await recordDoc.ref.update({
                        "integration.status": "ERRO_ENVIO",
                        "integration.lastError": response.message
                    });

                    // Log Error
                    await batchRef.collection("logs").add({
                        type: "ERROR",
                        message: `Erro envio ${uuid}: ${response.message}`,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        payloadDebug: content.toString('base64'),
                        recordId: recordDoc.id
                    });
                    errorCount++;
                }

            } catch (err: any) {
                console.error(`Error processing record ${recordDoc.id}:`, err);
                await recordDoc.ref.update({
                    "integration.status": "ERRO_INTERNO",
                    "integration.lastError": err.message
                });
                await batchRef.collection("logs").add({
                    type: "ERROR",
                    message: `Internal Error ${recordDoc.id}: ${err.message}`,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
                errorCount++;
            }
        }

        // --- CLOSE BATCH ---
        await closeBatch(batchRef, successCount, errorCount);
        // -------------------
    }
});
