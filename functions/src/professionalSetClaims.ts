import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { db, auth } from "./firebaseAdmin";
import { ProfessionalAccessData } from "./types";
import { sendEmail } from "./services/emailService";

export const professionalSetClaims = functions
    .region("southamerica-east1")
    .https.onCall(async (data: ProfessionalAccessData, context) => {
        // Verificar se quem chama é MASTER da entidade ou ADMIN
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "Usuário não autenticado."
            );
        }

        const {
            professionalId,
            email,
            entityId,
            entityName,
            name
        } = data;

        // Validações básicas
        if (!email || !entityId || !professionalId) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Dados incompletos (email, entityId, professionalId são obrigatórios)."
            );
        }

        // Verificar permissão (apenas MASTER da entidade ou ADMIN)
        const callerUid = context.auth.uid;
        const callerToken = context.auth.token;

        const isAdmin = callerToken.admin === true;
        const isMaster = callerToken.role === "MASTER" && callerToken.entityId === entityId;

        if (!isAdmin && !isMaster) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Apenas MASTER da entidade pode liberar acesso."
            );
        }

        try {
            let uid = "";
            let isNew = false;
            let password = "";

            // 1. Verificar se usuário já existe
            try {
                const userRecord = await auth.getUserByEmail(email);
                uid = userRecord.uid;
                // Atualizar nome se necessário
                if (userRecord.displayName !== name) {
                    await auth.updateUser(uid, { displayName: name });
                }

                // Se solicitado reset de senha
                if (data.resetPassword) {
                    password = Math.random().toString(36).slice(-8) + "Aa1@";
                    await auth.updateUser(uid, { password });
                    isNew = true; // Tratamos como "novo" para retornar a senha no frontend
                }

            } catch (error: any) {
                if (error.code === 'auth/user-not-found') {
                    // 2. Criar usuário se não existir
                    isNew = true;
                    password = Math.random().toString(36).slice(-8) + "Aa1@"; // Senha forte aleatória
                    const newUser = await auth.createUser({
                        email,
                        password,
                        displayName: name,
                        emailVerified: true // Assumimos verificado pois foi criado pelo gestor
                    });
                    uid = newUser.uid;
                } else {
                    throw error;
                }
            }

            // 5. Atualizar documento do profissional com os assignments (GARANTIA para o frontend)
            await db.collection("professionals").doc(professionalId).update({
                accessGranted: true,
                assignments: data.assignments || [], // Persistir no banco para o frontend ler
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 3. Definir Custom Claims (MINIMALISTA para evitar erro de 1000 bytes)
            // Removemos 'assignments' e campos legados do token. 
            // O frontend obtém os detalhes via Firestore (context.tsx).
            const claims = {
                role: "PROFESSIONAL",
                professionalId,
                entityId,
                entityName,
                name,
                email,
                active: true,
                access: "PRODUCTION"
                // assignments: REMOVIDO para economizar espaço
                // legacy fields: REMOVIDOS
            };

            await auth.setCustomUserClaims(uid, claims);

            // 4. Registrar log de acesso
            await db.collection(`entities/${entityId}/professionalsAccess`).doc(professionalId).set({
                uid,
                email,
                grantedAt: admin.firestore.FieldValue.serverTimestamp(),
                grantedBy: callerUid,
                claims // Logamos as claims geradas (simplificadas)
            });

            // 6. [NEW] Enviar e-mail com as credenciais (Simulado se SMTP off)
            if (isNew) {
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Bem-vindo ao ProBPA!</h2>
                        <p>Olá <strong>${name}</strong>,</p>
                        <p>Seu acesso ao <strong>Painel de Produção</strong> foi liberado com sucesso.</p>
                        <hr />
                        <p><strong>Suas credenciais de acesso:</strong></p>
                        <ul>
                            <li><strong>Link:</strong> <a href="https://probpa-producao.web.app">https://probpa-producao.web.app</a></li>
                            <li><strong>E-mail:</strong> ${email}</li>
                            <li><strong>Senha Temporária:</strong> <code style="background: #eee; padding: 4px; font-size: 1.2em;">${password}</code></li>
                        </ul>
                        <hr />
                        <p>Recomendamos que você altere sua senha no primeiro acesso.</p>
                        <p>Atenciosamente,<br/>Equipe GAX Tecnologia</p>
                    </div>
                `;

                await sendEmail({
                    to: email,
                    subject: "ProBPA - Credenciais de Acesso",
                    html: emailHtml,
                    text: `Olá ${name}. Sua senha de acesso ao ProBPA é: ${password}`
                });
            }

            return {
                success: true,
                isNew,
                password: isNew ? password : null,
                message: isNew ? "Usuário criado, senha enviada por e-mail." : "Acesso liberado para usuário existente."
            };

        } catch (error: any) {
            console.error("Erro em professionalSetClaims:", error);
            throw new functions.https.HttpsError("internal", "Erro ao processar liberação de acesso.", error);
        }
    });
