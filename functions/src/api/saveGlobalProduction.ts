
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebaseAdmin";
import { decryptPayload } from "../utils/crypto";
import { FieldValue } from "firebase-admin/firestore";

interface SaveGlobalProductionRequest {
    encryptedPayload: string;
}

export const saveGlobalProduction = onCall({ region: "southamerica-east1" }, async (request) => {
    const data = request.data as SaveGlobalProductionRequest;
    
    // Auth Validation
    if (!request.auth || !request.auth.token.entityId) {
        throw new HttpsError('unauthenticated', 'User must be authenticated and properly linked to an entity.');
    }
    
    const { role, entityId } = request.auth.token;
    if (role !== 'MASTER' && role !== 'COORDENACAO') {
        throw new HttpsError('permission-denied', 'Apenas perfis MASTER ou COORDENAÇÃO podem usar este endpoint global.');
    }

    if (!data.encryptedPayload) {
        throw new HttpsError('invalid-argument', 'Payload ausente ou mal formatado.');
    }

    // Attempt Decryption
    let payload;
    try {
        const passphrase = process.env.ENCRYPTION_KEY || 'default_secure_key_123';
        payload = decryptPayload(data.encryptedPayload, passphrase);
    } catch (error) {
        console.error("Decryption error", error);
        throw new HttpsError('invalid-argument', 'Falha na validação criptográfica do lote de produção.');
    }

    // payload contains { dataBase, procedures }
    const { dataBase, procedures } = payload;
    if (!dataBase || !Array.isArray(procedures) || procedures.length === 0) {
        throw new HttpsError('invalid-argument', 'A estrutura do payload decriptado é inválida.');
    }

    // Strict Multi-Tenant Enforcement: Cannot write on behalf of another entity.
    if (dataBase.entityId !== entityId) {
        throw new HttpsError('permission-denied', 'Tentativa de escrita cruzada bloqueada.');
    }

    try {
        const comp = dataBase.competenceMonth;  // ex: "2025-11"
        const [yyyy, mm, dd] = dataBase.attendanceDate.split("-");
        const dayKey = `${dd}-${mm}-${yyyy}`;

        let rawEntityType = dataBase.entityType || "PRIVATE";
        let entityTypeStr = rawEntityType === 'Privada' || rawEntityType === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';

        const recordBaseCollectionRef = db.collection(
            `municipalities/${entityTypeStr}/${dataBase.entityId}/${dataBase.municipalityId}/bpai_records/${dataBase.unitId}/professionals/${dataBase.professionalId}/competencias/${comp}/dates/${dayKey}/pacientes/${dataBase.patientId}/procedures`
        );

        const ids: string[] = [];
        const batch = db.batch();

        for (const proc of procedures) {
            const procDocRef = proc.id ? recordBaseCollectionRef.doc(proc.id) : recordBaseCollectionRef.doc();
            
            let createdAtTimestamp;
            const todayStr = new Date().toISOString().split('T')[0];
            if (dataBase.attendanceDate < todayStr) {
                const [year, month, day] = dataBase.attendanceDate.split('-').map(Number);
                // Creating date adjusted to UTC or local depending on admin config, we'll use js Date for admin Timestamp
                createdAtTimestamp = new Date(year, month - 1, day, 12, 0, 0); 
            } else {
                createdAtTimestamp = FieldValue.serverTimestamp();
            }

            const recordData = {
                ...dataBase,
                ...proc,
                id: procDocRef.id,
                createdAt: createdAtTimestamp,
                status: "pending",
                source: "master_panel", // Updated source flag per business requirement
            };

            // If it's targeted for LEDI
            if (dataBase.careContext?.system === 'LEDI') {
                recordData.integration = { status: 'PENDENTE_ENVIO', attempts: 0 };
            }

            batch.set(procDocRef, recordData);
            ids.push(procDocRef.id);
        }

        await batch.commit();

        return { success: true, ids };
    } catch (error: any) {
        console.error("Erro ao processar batch write de produção global:", error);
        throw new HttpsError('internal', 'Erro interno ao salvar produção global. Verifique os logs do Firebase.');
    }
});
