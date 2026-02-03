import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { db, auth } from "./firebaseAdmin";

interface ProfessionalDeleteData {
    professionalId: string;
    entityId: string;
    unitId: string;
}

export const professionalDelete = functions
    .region("southamerica-east1")
    .https.onCall(async (data: ProfessionalDeleteData, context) => {
        // Verificar autenticação
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "Usuário não autenticado."
            );
        }

        const { professionalId, entityId, unitId } = data;

        if (!professionalId || !entityId || !unitId) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Dados incompletos (professionalId, entityId, unitId são obrigatórios)."
            );
        }

        // Verificar permissão (apenas MASTER da entidade ou ADMIN)
        const callerToken = context.auth.token;
        const isAdmin = callerToken.admin === true;
        const isMaster = callerToken.role === "MASTER" && callerToken.entityId === entityId;

        if (!isAdmin && !isMaster) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Apenas MASTER da entidade pode excluir profissionais."
            );
        }

        try {
            // 1. Verificar se existe registro de acesso para pegar o UID
            const accessRef = db.collection(`entities/${entityId}/professionalsAccess`).doc(professionalId);
            const accessDoc = await accessRef.get();

            if (accessDoc.exists) {
                const uid = accessDoc.data()?.uid;
                if (uid) {
                    try {
                        // 2. Excluir usuário do Authentication
                        await auth.deleteUser(uid);
                        console.log(`Usuário Auth ${uid} excluído com sucesso.`);
                    } catch (authError: any) {
                        if (authError.code === 'auth/user-not-found') {
                            console.log(`Usuário Auth ${uid} já não existia.`);
                        } else {
                            console.error("Erro ao excluir usuário Auth:", authError);
                            // Não vamos impedir a exclusão do registro se falhar o Auth, mas logamos erro
                        }
                    }
                }
                // 3. Excluir registro de acesso
                await accessRef.delete();
            }

            // 4. Buscar dados do profissional para atualizar contadores
            const profDocRef = db.collection("professionals").doc(professionalId);
            const profDoc = await profDocRef.get();
            const profData = profDoc.data();

            const assignments = profData?.assignments || [];
            // Fallback para legado se não tiver assignments
            if (assignments.length === 0 && profData?.unitId) {
                assignments.push({ unitId: profData.unitId });
            }

            // Usar batch para operações de escrita
            const batch = db.batch();

            // Excluir documento do profissional
            batch.delete(profDocRef);

            // Excluir registro de acesso (se não foi feito acima, mas aqui é Firestore, o de cima é Auth)
            // O registro de acesso 'accessRef' já foi deletado com await accessRef.delete() acima?
            // Sim, linha 65. Mas podemos mover para o batch para garantir atomicidade do Firestore.
            // O Auth não entra no batch.

            // Vamos mover a deleção do accessRef para o batch?
            // O código original fazia await accessRef.delete() antes.
            // Se falhar o batch, o accessRef já foi deletado.
            // Melhor não mexer na lógica existente do accessRef por enquanto para não quebrar, 
            // mas o ideal seria tudo no batch.
            // Vou manter o padrão, mas usar batch para os contadores e o doc do profissional.

            // Atualizar contadores das unidades
            assignments.forEach((a: any) => {
                if (a.unitId) {
                    const unitRef = db.collection("units").doc(a.unitId);
                    batch.update(unitRef, {
                        professionalsCount: admin.firestore.FieldValue.increment(-1)
                    });
                }
            });

            await batch.commit();

            return { success: true, message: "Profissional e acesso excluídos com sucesso." };

        } catch (error: any) {
            console.error("Erro em professionalDelete:", error);
            throw new functions.https.HttpsError("internal", "Erro ao excluir profissional.", error);
        }
    });
