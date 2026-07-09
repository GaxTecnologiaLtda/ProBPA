import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { GoogleAuth } from "google-auth-library";
import { randomUUID } from "crypto";

const db = admin.firestore();

function sanitizeDatabaseId(name: string): string {
    let sanitized = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-") // Replace non-alphanumeric with hyphen
        .replace(/-+/g, "-") // Replace multiple hyphens with single
        .replace(/^-+/, "") // Trim leading hyphens
        .replace(/-+$/, ""); // Trim trailing hyphens

    if (sanitized.length < 4) {
        sanitized = sanitized.padEnd(4, "0");
    }
    if (sanitized.length > 63) {
        sanitized = sanitized.substring(0, 63);
    }
    
    // Must start with letter
    if (!/^[a-z]/.test(sanitized)) {
        sanitized = "db-" + sanitized;
    }
    
    // Ensure length again just in case
    if (sanitized.length > 63) {
        sanitized = sanitized.substring(0, 63);
    }

    if (sanitized === "default") {
        sanitized = "default-db";
    }

    return sanitized;
}

export const createPublicEntity = functions
    .region("southamerica-east1")
    .runWith({ timeoutSeconds: 120 })
    .https.onCall(async (data, context) => {
        // Validate authentication
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "Você precisa estar autenticado para realizar esta ação."
            );
        }

        const { name, cnpj, type, location, responsible, email, phone, cep, address, managerRole, entityKind } = data;

        if (!name || !cnpj) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Nome e CNPJ são obrigatórios."
            );
        }

        const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || admin.app().options.projectId;
        if (!projectId) {
            throw new functions.https.HttpsError("internal", "Project ID not found.");
        }

        const databaseId = sanitizeDatabaseId(name);
        const apiKey = randomUUID();

        try {
            // 1. Trigger Firestore DB Creation via Google API
            const auth = new GoogleAuth({
                scopes: ["https://www.googleapis.com/auth/cloud-platform"]
            });
            const client = await auth.getClient();

            let finalDatabaseId = databaseId;

            try {
                const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases?databaseId=${finalDatabaseId}`;
                await client.request({
                    url,
                    method: "POST",
                    data: {
                        type: "FIRESTORE_NATIVE",
                        locationId: "southamerica-east1",
                        concurrencyMode: "OPTIMISTIC",
                        pointInTimeRecoveryEnablement: "POINT_IN_TIME_RECOVERY_DISABLED",
                        appEngineIntegrationMode: "DISABLED",
                        deleteProtectionState: "DELETE_PROTECTION_DISABLED"
                    }
                });
            } catch (err: any) {
                if (err.response && err.response.status === 409) {
                    finalDatabaseId = `${databaseId}-${Math.floor(Math.random() * 1000)}`;
                    const urlRetry = `https://firestore.googleapis.com/v1/projects/${projectId}/databases?databaseId=${finalDatabaseId}`;
                    await client.request({
                        url: urlRetry,
                        method: "POST",
                        data: {
                            type: "FIRESTORE_NATIVE",
                            locationId: "southamerica-east1",
                            concurrencyMode: "OPTIMISTIC",
                            pointInTimeRecoveryEnablement: "POINT_IN_TIME_RECOVERY_DISABLED",
                            appEngineIntegrationMode: "DISABLED",
                            deleteProtectionState: "DELETE_PROTECTION_DISABLED"
                        }
                    });
                } else {
                    console.error("Error creating database:", err.response?.data || err);
                    throw new functions.https.HttpsError("internal", `Erro ao provisionar banco de dados dedicado. Detalhes: ${JSON.stringify(err.response?.data || err.message)}`);
                }
            }

            // 2. Save Entity in Default DB
            const entityRef = db.collection("entities").doc();
            
            const newEntity = {
                name,
                cnpj,
                type: type === "PUBLIC" ? "Pública" : "Privada",
                location,
                status: "Ativa",
                createdAt: new Date().toISOString(),
                healthUnits: 0,
                responsible,
                email,
                phone: phone || null,
                cep: cep || null,
                address: address || null,
                managerRole: managerRole || null,
                entityKind: entityKind || null,
                connectorUltraEnabled: true,
                dedicatedDatabaseId: finalDatabaseId,
                connectorApiKey: apiKey
            };

            await entityRef.set(newEntity);

            // 3. Save initial metadata in the Dedicated DB
            try {
                const dedicatedDb = new admin.firestore.Firestore({
                    projectId: projectId,
                    databaseId: finalDatabaseId,
                });
                
                await dedicatedDb.collection("config").doc("connector").set({
                    entityId: entityRef.id,
                    apiKey: apiKey,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } catch (dbErr) {
                console.error("Failed to write to new database (it might still be initializing)", dbErr);
            }

            return {
                success: true,
                id: entityRef.id,
                databaseId: finalDatabaseId,
                apiKey: apiKey,
                entity: newEntity
            };

        } catch (error: any) {
            console.error("Error in createPublicEntity:", error);
            throw new functions.https.HttpsError("internal", error.message || "Erro desconhecido");
        }
    });
