import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { db, auth } from "./firebaseAdmin";

export const grantEntityMasterAccess = functions.https.onCall(async (data, context) => {
    // 1. Verify if the requester is an admin
    if (!context.auth?.token.admin) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Apenas administradores podem realizar esta ação."
        );
    }

    const { entityId, type, email, name, phoneNumber } = data;

    if (!entityId || !type || !email || !name) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados incompletos: entityId, type, email e name são obrigatórios."
        );
    }

    try {
        let userRecord;
        let password = "";
        let isNewUser = false;

        // 2. Check if user exists
        try {
            userRecord = await auth.getUserByEmail(email);
            // Update display name if provided
            if (name && userRecord.displayName !== name) {
                await auth.updateUser(userRecord.uid, { displayName: name });
            }
            // Update phone number if provided and different (Note: Phone must be unique)
            if (phoneNumber && userRecord.phoneNumber !== phoneNumber) {
                // Handling phone updates can be tricky due to uniqueness constraints. 
                // For now, we'll try to update it if provided.
                try {
                    await auth.updateUser(userRecord.uid, { phoneNumber: phoneNumber });
                } catch (phoneError) {
                    console.warn("Could not update phone number:", phoneError);
                    // Proceed without failing the whole request
                }
            }
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // 3. Create user if not exists
                password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
                const createData: any = {
                    email: email,
                    password: password,
                    displayName: name || `Master - ${email}`,
                };
                if (phoneNumber) {
                    createData.phoneNumber = phoneNumber;
                }
                userRecord = await auth.createUser(createData);
                isNewUser = true;
            } else {
                throw error;
            }
        }

        // 4. Set Custom Claims
        // entityType: "PUBLIC" or "PRIVATE" (matches the EntityType enum on frontend)
        const claims = {
            role: "MASTER",
            entityId: entityId,
            entityType: type === "PUBLIC" ? "PUBLIC" : "PRIVATE"
        };

        await auth.setCustomUserClaims(userRecord.uid, claims);

        // 5. Save reference in Firestore
        await db.collection(`entities/${entityId}/masters`).doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: email,
            displayName: name,
            phoneNumber: phoneNumber || null,
            grantedAt: admin.firestore.FieldValue.serverTimestamp(),
            grantedBy: context.auth.uid
        }, { merge: true });

        // 6. Return credentials (if new user) or just success
        return {
            uid: userRecord.uid,
            email: email,
            displayName: name,
            password: isNewUser ? password : "Senha existente mantida",
            isNewUser
        };

    } catch (error: any) {
        console.error("Error granting master access:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Erro ao processar a solicitação: " + error.message
        );
    }
});

export const toggleMasterAccessStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth?.token.admin) {
        throw new functions.https.HttpsError("permission-denied", "Apenas administradores.");
    }
    const { uid, disabled } = data;
    try {
        await auth.updateUser(uid, { disabled });
        return { success: true, disabled };
    } catch (error: any) {
        throw new functions.https.HttpsError("internal", error.message);
    }
});

export const resetMasterUserPassword = functions.https.onCall(async (data, context) => {
    if (!context.auth?.token.admin) {
        throw new functions.https.HttpsError("permission-denied", "Apenas administradores.");
    }
    const { uid } = data;
    try {
        const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        await auth.updateUser(uid, { password });
        return { success: true, password };
    } catch (error: any) {
        throw new functions.https.HttpsError("internal", error.message);
    }
});

export const deleteMasterUser = functions.https.onCall(async (data, context) => {
    if (!context.auth?.token.admin) {
        throw new functions.https.HttpsError("permission-denied", "Apenas administradores.");
    }
    const { uid, entityId } = data;
    try {
        // Delete from Auth
        await auth.deleteUser(uid);
        // Delete from Firestore
        await db.collection(`entities/${entityId}/masters`).doc(uid).delete();
        return { success: true };
    } catch (error: any) {
        throw new functions.https.HttpsError("internal", error.message);
    }
});
