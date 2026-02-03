import * as functions from "firebase-functions/v1";

import { db, auth } from "./firebaseAdmin";

export const professionalOnUpdate = functions
    .region("southamerica-east1")
    .firestore
    .document("professionals/{professionalId}")
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Check if active status OR assignments changed
        const activeChanged = before.active !== after.active;
        const assignmentsChanged = JSON.stringify(before.assignments) !== JSON.stringify(after.assignments);

        if (!activeChanged && !assignmentsChanged) return null;

        const professionalId = context.params.professionalId;
        const entityId = after.entityId;

        if (!entityId) {
            console.error(`Professional ${professionalId} has no entityId.`);
            return null;
        }

        try {
            // Buscar o UID do usuário Auth associado
            const accessRef = db.collection(`entities/${entityId}/professionalsAccess`).doc(professionalId);
            const accessDoc = await accessRef.get();

            if (!accessDoc.exists) {
                console.log(`No access record found for professional ${professionalId}.`);
                return null;
            }

            const { uid } = accessDoc.data() as { uid: string };
            if (!uid) return null;

            const newStatus = after.active;

            // Atualizar Custom Claims
            const userRecord = await auth.getUser(uid);
            const currentClaims = userRecord.customClaims || {};

            await auth.setCustomUserClaims(uid, {
                ...currentClaims,
                active: newStatus,
                assignments: after.assignments || []
            });

            console.log(`Updated custom claims for user ${uid}: active=${newStatus}`);

            // Se foi desativado, revogar tokens para forçar logout/revalidação
            if (!newStatus) {
                await auth.revokeRefreshTokens(uid);
                console.log(`Revoked refresh tokens for user ${uid}`);
            }

            return null;

        } catch (error) {
            console.error("Error in professionalOnUpdate:", error);
            return null;
        }
    });
