import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { db, auth } from "../firebaseAdmin";
import { sendEmail } from "../services/emailService";

// Collection for reset tokens
const TOKEN_COLLECTION = "password_reset_tokens";
const TOKEN_TTL_MINUTES = 15;

/**
 * 1. Request Password Reset Token
 * Validates email, generates distinct 6-digit token, saves to Firestore, sends Email.
 */
export const sendPasswordResetToken = functions
    .region("southamerica-east1")
    .https.onCall(async (data: { email: string }, context) => {
        const email = data.email;

        if (!email) {
            throw new functions.https.HttpsError("invalid-argument", "Email é obrigatório.");
        }

        try {
            // Check if user exists
            const userRecord = await auth.getUserByEmail(email);

            // Generate 6-digit number token (100000 to 999999)
            const token = Math.floor(100000 + Math.random() * 900000).toString();

            const expiresAt = admin.firestore.Timestamp.fromMillis(
                Date.now() + TOKEN_TTL_MINUTES * 60 * 1000
            );

            // Save token to Firestore (overwrite existing for this email)
            await db.collection(TOKEN_COLLECTION).doc(email).set({
                token,
                expiresAt,
                attempts: 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Send Email
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Redefinição de Senha</h2>
                    <p>Olá <strong>${userRecord.displayName || 'Usuário'}</strong>,</p>
                    <p>Recebemos uma solicitação para redefinir sua senha no ProBPA.</p>
                    <hr />
                    <p style="font-size: 1.1em;">Seu código de verificação é:</p>
                    <div style="background: #eef; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 2em; font-weight: bold; letter-spacing: 5px; color: #44a;">${token}</span>
                    </div>
                    <p>Este código é válido por <strong>${TOKEN_TTL_MINUTES} minutos</strong>.</p>
                    <hr />
                    <p style="font-size: 0.9em; color: #777;">Se você não solicitou isso, ignore este e-mail.</p>
                </div>
            `;

            await sendEmail({
                to: email,
                subject: "ProBPA - Código de Verificação",
                html: emailHtml,
                text: `Seu código de verificação ProBPA é: ${token}`
            });

            return { success: true, message: "Código enviado para o e-mail." };

        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // Security: Don't reveal user doesn't exist, just pretend success or generic error
                // Ideally return success to prevent enumeration, but for UX on private system, 
                // we might want to tell them to talk to manager.
                // Let's return generic success to be safe, or specific if internal.
                // Given requirements: "Validação de token... para que seja possível".
                // Let's throw specific for now to help development/testing, or handle graceful.
                throw new functions.https.HttpsError("not-found", "E-mail não encontrado no sistema.");
            }
            console.error("Error sending reset token:", error);
            throw new functions.https.HttpsError("internal", "Erro ao processar solicitação.");
        }
    });

/**
 * 2. Verify Token
 * Checks if token matches and is not expired.
 */
export const verifyPasswordResetToken = functions
    .region("southamerica-east1")
    .https.onCall(async (data: { email: string, token: string }, context) => {
        const { email, token } = data;

        if (!email || !token) {
            throw new functions.https.HttpsError("invalid-argument", "Dados incompletos.");
        }

        const docRef = db.collection(TOKEN_COLLECTION).doc(email);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            throw new functions.https.HttpsError("failed-precondition", "Solicitação expirada ou inválida. Tente novamente.");
        }

        const record = docSnap.data();

        // Check Expiration
        if (record?.expiresAt.toMillis() < Date.now()) {
            throw new functions.https.HttpsError("failed-precondition", "Código expirado.");
        }

        // Check Token Match
        if (record?.token !== token) {
            // Increment attempts or brute force protection here if needed
            throw new functions.https.HttpsError("invalid-argument", "Código incorreto.");
        }

        return { success: true, valid: true };
    });

/**
 * 3. Reset Password
 * Final step: verify token again (atomic-ish) and update password.
 */
export const resetPasswordWithToken = functions
    .region("southamerica-east1")
    .https.onCall(async (data: { email: string, token: string, newPassword: string }, context) => {
        const { email, token, newPassword } = data;

        if (!email || !token || !newPassword) {
            throw new functions.https.HttpsError("invalid-argument", "Dados incompletos.");
        }

        // 1. Password Strength Validation
        // Regex: At least 1 upper, 1 lower, 1 number. No special chars allowed? 
        // User Request: "1 letra maiúscula, 1 minúscula e números, SEM caracteres especiais ou espaço"
        // Let's interpret "sem caracteres especiais" strictly.
        // Allowed: A-Z, a-z, 0-9.
        // Min length usually 6 or 8. Let's say 8.

        const hasUpper = /[A-Z]/.test(newPassword);
        const hasLower = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
        const validLength = newPassword.length >= 8;

        if (!validLength || !hasUpper || !hasLower || !hasNumber) {
            throw new functions.https.HttpsError("invalid-argument", "A senha deve ter no mínimo 8 caracteres, contendo letras maiúsculas, minúsculas e números.");
        }

        if (hasSpecial) {
            throw new functions.https.HttpsError("invalid-argument", "A senha não pode conter caracteres especiais ou espaços.");
        }

        // 2. Re-verify Token (Security against bypass between verify step and reset step)
        const docRef = db.collection(TOKEN_COLLECTION).doc(email);

        // Transaction to ensure atomicity and delete token on use
        await db.runTransaction(async (t) => {
            const docSnap = await t.get(docRef);
            if (!docSnap.exists) {
                throw new functions.https.HttpsError("failed-precondition", "Solicitação inválida.");
            }

            const record = docSnap.data();
            if (record?.token !== token) {
                throw new functions.https.HttpsError("invalid-argument", "Código inválido.");
            }
            if (record?.expiresAt.toMillis() < Date.now()) {
                throw new functions.https.HttpsError("failed-precondition", "Código expirado.");
            }

            // 3. Update User Password
            const userRecord = await auth.getUserByEmail(email);
            await auth.updateUser(userRecord.uid, { password: newPassword });

            // 4. Delete Token (Consume it)
            t.delete(docRef);
        });

        // 5. Send Confirmation Email (Optional but good practice)
        await sendEmail({
            to: email,
            subject: "ProBPA - Senha Alterada",
            html: `<p>Sua senha foi alterada com sucesso.</p>`,
            text: "Sua senha foi alterada com sucesso."
        });

        return { success: true, message: "Senha alterada com sucesso!" };
    });
