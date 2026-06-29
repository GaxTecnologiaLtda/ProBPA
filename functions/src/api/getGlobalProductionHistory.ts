
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebaseAdmin";

interface GetHistoryRequest {
    municipalityId: string;
    competenceMonth?: string;
    attendanceDate?: string; // NOVO: Filtro por data
    searchTerm?: string;
}

export const getGlobalProductionHistory = onCall({ region: "southamerica-east1" }, async (request) => {
    const data = request.data as GetHistoryRequest;

    // Auth Validation
    if (!request.auth || !request.auth.token.entityId) {
        throw new HttpsError('unauthenticated', 'User must be authenticated and properly linked to an entity.');
    }

    const { role, entityId } = request.auth.token;
    if (role !== 'MASTER' && role !== 'COORDENACAO') {
        throw new HttpsError('permission-denied', 'Apenas perfis MASTER ou COORDENAÇÃO podem acessar o histórico global.');
    }

    if (!data.municipalityId) {
        throw new HttpsError('invalid-argument', 'O parâmetro municipalityId é obrigatório para reduzir a carga de dados.');
    }

    try {
        let proceduresQuery: any = db.collectionGroup('procedures')
            .where('entityId', '==', entityId)
            .where('municipalityId', '==', data.municipalityId);

        if (data.competenceMonth) {
            let formattedCompetence = data.competenceMonth;
            if (formattedCompetence.length === 6) {
                formattedCompetence = `${formattedCompetence.slice(0, 4)}-${formattedCompetence.slice(4, 6)}`;
            }
            proceduresQuery = proceduresQuery.where('competenceMonth', '==', formattedCompetence);
        }

        // Se tiver competenceMonth ou attendanceDate, aumentamos muito ou removemos o limite,
        // senão colocamos limitação para segurança (fallback alto: 2000 em vez de 150).
        if (data.competenceMonth || data.attendanceDate) {
            proceduresQuery = proceduresQuery.orderBy('createdAt', 'desc').limit(5000); // Teto alto e seguro
        } else {
            proceduresQuery = proceduresQuery.orderBy('createdAt', 'desc').limit(500); 
        }

        const snapshot = await proceduresQuery.get();
        
        // Dedup by ID to handle dual-write of same procedure in Legacy (bpa_records) and New scoped path
        const seen = new Set();
        let results = snapshot.docs.reduce((acc: any[], doc: any) => {
            // Ignorar Legacy: deve ser exclusivamente o path da entidade
            if (!doc.ref.path.startsWith('municipalities')) return acc;

            if (!seen.has(doc.id)) {
                seen.add(doc.id);
                const docData = doc.data();
                acc.push({
                    id: doc.id,
                    ...docData,
                    createdAt: docData.createdAt?.toDate()?.toISOString() || null
                });
            }
            return acc;
        }, []);

        // Filtragem por Data Atendimento (memória p/ evitar múltiplos índices complexos no Firestore)
        if (data.attendanceDate) {
            results = results.filter((r: any) => r.attendanceDate === data.attendanceDate || r.date === data.attendanceDate);
        }

        // Filtro em memória (busca de texto)
        if (data.searchTerm) {
            const term = data.searchTerm.toLowerCase();
            results = results.filter((r: any) => 
                r.patientName?.toLowerCase().includes(term) || 
                r.patientCns?.includes(term) ||
                r.patientCpf?.includes(term) ||
                r.procedureName?.toLowerCase().includes(term)
            );
        }

        // Agrupamento Server-Side
        const groupedHistory: Record<string, Record<string, Record<string, Record<string, any[]>>>> = {};

        results.sort((a: any, b: any) => {
            const dateA = a.date || a.attendanceDate || '';
            const dateB = b.date || b.attendanceDate || '';
            return new Date(dateB + 'T12:00:00').getTime() - new Date(dateA + 'T12:00:00').getTime();
        });

        results.forEach((item: any) => {
            const unitName = item.unitName || 'Unidade Desconhecida';
            const unitKey = `${item.unitId || 'unknown'}|${unitName}`;

            const profName = item.professionalName || 'Profissional Desconhecido';
            const profKey = `${item.professionalId || 'unknown'}|${profName}`;

            const dayKey = item.date || item.attendanceDate || 'Data Desconhecida';

            const identifier = item.patientCns || item.patientCpf || "SEM_DOC";
            const patientKey = item.patientName ? `${item.patientName}|${identifier}` : `SEM_NOME|${identifier}`;

            if (!groupedHistory[unitKey]) groupedHistory[unitKey] = {};
            if (!groupedHistory[unitKey][profKey]) groupedHistory[unitKey][profKey] = {};
            if (!groupedHistory[unitKey][profKey][dayKey]) groupedHistory[unitKey][profKey][dayKey] = {};
            if (!groupedHistory[unitKey][profKey][dayKey][patientKey]) groupedHistory[unitKey][profKey][dayKey][patientKey] = [];

            groupedHistory[unitKey][profKey][dayKey][patientKey].push(item);
        });

        return { success: true, history: results, groupedHistory };
    } catch (error: any) {
        console.error("Erro ao buscar histórico via API:", error);
        throw new HttpsError('internal', `Falha ao recuperar o histórico de produções: ${error.message}`);
    }
});
