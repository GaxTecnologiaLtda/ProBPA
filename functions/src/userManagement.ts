import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { db, auth } from "./firebaseAdmin";

// Helper to check if caller has permission
const checkPermissions = (context: functions.https.CallableContext) => {
    const { token } = context.auth || {};
    if (!token) {
        throw new functions.https.HttpsError("unauthenticated", "Usuário não autenticado.");
    }

    // Roles allowed to manage users
    const allowedRoles = ["MASTER", "COORDENAÇÃO"];
    if (!allowedRoles.includes(token.role)) {
        throw new functions.https.HttpsError("permission-denied", "Acesso negado. Apenas MASTER ou COORDENAÇÃO.");
    }

    return token;
};

const formatPhoneNumber = (phone: string | undefined | null): string | undefined => {
    if (!phone) return undefined;
    const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
    if (!cleaned) return undefined;

    // Assume Brazil if not specified? Or just sanitize if it looks somewhat valid.
    // If it has 10 or 11 digits (DD + Number), add +55
    if (cleaned.length === 10 || cleaned.length === 11) {
        return `+55${cleaned}`;
    }
    // If it already has country code (e.g. 551199...), add +
    if (cleaned.length > 11 && cleaned.startsWith('55')) {
        return `+${cleaned}`;
    }

    // If user typed +, it's handled by regex? No, we stripped it.
    // If original had +, we might want to keep it.
    if (phone.includes('+') && cleaned.length >= 12) {
        return `+${cleaned}`;
    }

    // Fallback: If it's too short or weird, return undefined to avoid "malformed" error, 
    // OR return it as is and let Auth fail if invalid, but +55 is the safest default for this app context.
    // Let's go with the +55 default for standard mobile/landline lengths.
    return undefined;
};

export const manageEntityUser = functions.region("southamerica-east1").https.onCall(async (data, context) => {
    const token = checkPermissions(context);
    const { action, userData } = data; // action: 'create' | 'update' | 'delete' | 'toggleStatus'

    // Validate Entity Context
    // Users can only manage users within their own entity
    const callerEntityId = token.entityId;
    if (!callerEntityId) {
        throw new functions.https.HttpsError("failed-precondition", "Claim 'entityId' ausente no token do solicitante.");
    }

    // Role-specific restriction: Coordenação can ONLY manage 'Coordenador Local' (SubSede)
    if (token.role === "COORDENAÇÃO") {
        // Create/Update checks
        if (['create', 'update'].includes(action)) {
            if (userData.role !== "Coordenador Local" && userData.role !== "SUBSEDE") {
                throw new functions.https.HttpsError("permission-denied", "Coordenação só pode gerenciar usuários 'Coordenador Local' (SUBSEDE).");
            }
        }
        // For delete/toggle, we effectively trust the ID passed belongs to a valid user, 
        // but ideally we should verify the target user's role before action.
        // We do this check below after fetching the user if needed.
    }

    try {
        if (action === 'create') {
            const { email, name, cpf, phone, role, organizationId, organizationName } = userData;

            if (!email || !name || !role) { // Minimum required
                throw new functions.https.HttpsError("invalid-argument", "Dados obrigatórios (email, nome, cargo) ausentes.");
            }

            // 1. Create in Firebase Auth
            const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const userRecord = await auth.createUser({
                email,
                password,
                displayName: name,
                phoneNumber: formatPhoneNumber(phone),
            });

            // 2. Set Claims
            const isCoordinationRole = role === "COORDENAÇÃO";
            const claims = {
                role: isCoordinationRole ? "COORDENAÇÃO" : ((role === "Coordenador Local" || role === "SUBSEDE") ? "SUBSEDE" : (role === "Administrador Geral" ? "ADMIN" : "USER")),
                coordenation: isCoordinationRole ? true : undefined,
                entityId: callerEntityId,
                // Add specific organization ID if it's a SubSede/Municipality level user
                municipalityId: organizationId !== 'matriz' ? organizationId : null
            };
            await auth.setCustomUserClaims(userRecord.uid, claims);

            // 3. Save to Firestore (Root 'users' collection with entityId filter)
            const newUserDoc = {
                uid: userRecord.uid,
                name,
                email,
                cpf,
                phone,
                role,
                organizationId,
                organizationName, // Denormalized for easier display
                status: 'active',
                entityId: callerEntityId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: context.auth?.uid
            };

            await db.collection("users").doc(userRecord.uid).set(newUserDoc);

            return { success: true, uid: userRecord.uid, password }; // Return password for initial sharing

        } else if (action === 'update') {
            const { uid, name, cpf, phone, role, organizationId, organizationName } = userData;

            // Verify target user logic (security check)
            const targetUserDoc = await db.collection("users").doc(uid).get();
            if (!targetUserDoc.exists) throw new functions.https.HttpsError("not-found", "Usuário não encontrado.");
            const targetData = targetUserDoc.data();

            if (targetData?.entityId !== callerEntityId) {
                throw new functions.https.HttpsError("permission-denied", "Você não pode editar usuários de outra entidade.");
            }
            if (token.role === "COORDENAÇÃO" && targetData?.role !== "Coordenador Local" && targetData?.role !== "SUBSEDE") {
                throw new functions.https.HttpsError("permission-denied", "Coordenação só pode editar 'Coordenador Local' (SUBSEDE).");
            }

            // Update Auth (DisplayName/Phone)
            const updateAuthData: any = {};
            if (name) updateAuthData.displayName = name;
            const fmtPhone = formatPhoneNumber(phone);
            if (fmtPhone && fmtPhone !== targetData?.formattedPhone) updateAuthData.phoneNumber = fmtPhone;

            if (Object.keys(updateAuthData).length > 0) {
                await auth.updateUser(uid, updateAuthData);
            }

            // Update Claims if role/org changed
            if (role || organizationId) {
                const currentClaims = (await auth.getUser(uid)).customClaims || {};
                const isCoordinationRole = role === "COORDENAÇÃO";
                const newClaims = {
                    ...currentClaims,
                    role: isCoordinationRole ? "COORDENAÇÃO" : ((role === "Coordenador Local" || role === "SUBSEDE") ? "SUBSEDE" : (role === "Administrador Geral" ? "ADMIN" : "USER")),
                    coordenation: isCoordinationRole ? true : null, // Set to null to remove if demoted
                    municipalityId: organizationId !== 'matriz' ? organizationId : null
                };
                await auth.setCustomUserClaims(uid, newClaims);
            }

            // Update Firestore
            await db.collection("users").doc(uid).update({
                name, cpf, phone, role, organizationId, organizationName,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: true };

        } else if (action === 'delete') {
            const { uid } = userData;

            // Security check
            const targetUserDoc = await db.collection("users").doc(uid).get();
            if (!targetUserDoc.exists) throw new functions.https.HttpsError("not-found", "Usuário não encontrado.");
            if (targetUserDoc.data()?.entityId !== callerEntityId) throw new functions.https.HttpsError("permission-denied", "Acesso negado.");
            if (token.role === "COORDENAÇÃO" && targetUserDoc.data()?.role !== "Coordenador Local" && targetUserDoc.data()?.role !== "SUBSEDE") {
                throw new functions.https.HttpsError("permission-denied", "Permissão insuficiente.");
            }

            await auth.deleteUser(uid);
            await db.collection("users").doc(uid).delete();
            return { success: true };

        } else if (action === 'toggleStatus') {
            const { uid, status } = userData; // 'active' | 'suspended'

            // Security check
            const targetUserDoc = await db.collection("users").doc(uid).get();
            if (!targetUserDoc.exists) throw new functions.https.HttpsError("not-found", "Usuário não encontrado.");
            if (targetUserDoc.data()?.entityId !== callerEntityId) throw new functions.https.HttpsError("permission-denied", "Acesso negado.");
            if (token.role === "COORDENAÇÃO" && targetUserDoc.data()?.role !== "Coordenador Local" && targetUserDoc.data()?.role !== "SUBSEDE") {
                throw new functions.https.HttpsError("permission-denied", "Permissão insuficiente.");
            }

            const disabled = status === 'suspended';
            await auth.updateUser(uid, { disabled });
            await db.collection("users").doc(uid).update({ status });
            return { success: true };
        }

        return { success: false, message: "Ação inválida" };

    } catch (error: any) {
        console.error("Error in manageEntityUser:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

export const resetEntityUserPassword = functions.region("southamerica-east1").https.onCall(async (data, context) => {
    const token = checkPermissions(context);
    const { uid } = data;

    // Security check
    const targetUserDoc = await db.collection("users").doc(uid).get();
    if (!targetUserDoc.exists) throw new functions.https.HttpsError("not-found", "Usuário não encontrado.");
    const targetData = targetUserDoc.data();
    if (targetData?.entityId !== token.entityId) throw new functions.https.HttpsError("permission-denied", "Acesso negado.");

    if (token.role === "COORDENAÇÃO" && targetData?.role !== "Coordenador Local" && targetData?.role !== "SUBSEDE") {
        throw new functions.https.HttpsError("permission-denied", "Permissão insuficiente.");
    }

    try {
        const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8); // Generate 16 char temp password
        await auth.updateUser(uid, { password });
        // Optionally trigger email sending here if email service exists, otherwise return to UI to display
        return { success: true, password };
    } catch (error: any) {
        throw new functions.https.HttpsError("internal", error.message);
    }
});
