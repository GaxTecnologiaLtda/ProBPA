import { onRequest } from "firebase-functions/v2/https";
import { admin, db } from "../firebaseAdmin";

export const generateSigtapCache = onRequest(
    {
        region: "southamerica-east1",
        timeoutSeconds: 540, // 9 minutes max
        memory: "1GiB",
        cors: true, 
    },
    async (req, res) => {
        const competence = req.query.competence as string;

        if (!competence || !/^\d{6}$/.test(competence)) {
            res.status(400).send({ error: "Invalid competence. Format: YYYYMM" });
            return;
        }

        try {
            console.log(`[generateSigtapCache] Iniciando extração para: ${competence}`);
            
            const proceduresRef = db.collectionGroup('procedimentos');
            const snapshot = await proceduresRef.where('competencia', '==', competence).get();
            
            if (snapshot.empty) {
                console.log(`[generateSigtapCache] Nenhum procedimento encontrado para: ${competence}`);
                res.status(404).send({ error: "No procedures found for this competence." });
                return;
            }

            console.log(`[generateSigtapCache] Encontrados ${snapshot.size} procedimentos. Processando...`);

            const flatProcedures = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // Mapeia para um formato ultraleve que atende às buscas do Frontend
                // Para economia de memória/banda, apenas dados chaves. Se o front precisar de mais, inclua aqui.
                return {
                    id: doc.id,
                    code: data.code,
                    name: data.name,
                    grupoCode: data.grupoCode || '',
                    subgroupCode: data.subgroupCode || '',
                    formaCode: data.formaCode || '',
                    // Alguns serviços usam formaOrganizacaoCode em vez de formaCode
                    formaOrganizacaoCode: data.formaCode || data.formaOrganizacaoCode || '',
                };
            });

            const bucket = admin.storage().bucket();
            const filePath = `sigtap_cache/${competence}.json`;
            const file = bucket.file(filePath);

            const jsonString = JSON.stringify(flatProcedures);

            console.log(`[generateSigtapCache] Salvando ${jsonString.length} bytes no Storage em gs://${bucket.name}/${filePath}`);

            await file.save(jsonString, {
                metadata: {
                    contentType: 'application/json',
                    cacheControl: 'public, max-age=2592000', // 30 dias de cache opcional
                },
                gzip: true // Auto compress
            });

            // Torna o arquivo público (caso o bucket não seja por padrão ou se quisermos leitura via HTTP direta sem token complexo)
            await file.makePublic();
            
            // Pega URL pública
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

            console.log(`[generateSigtapCache] Sucesso! URL: ${publicUrl}`);
            
            res.status(200).send({ 
                success: true, 
                competence, 
                count: flatProcedures.length,
                url: publicUrl
            });
            
        } catch (error: any) {
            console.error(`[generateSigtapCache] Erro:`, error);
            res.status(500).send({ error: error.message || "Internal Server Error" });
        }
    }
);
