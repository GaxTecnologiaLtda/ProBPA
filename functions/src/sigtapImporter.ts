import * as admin from 'firebase-admin';
import * as api from './sigtapApi';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

type ProgressCallback = (status: string) => void;

interface Counts {
    groups: number;
    subgroups: number;
    forms: number;
    procedures: number;
}

export async function importSigtap(competence: string, progressCallback?: ProgressCallback): Promise<{ success: boolean; competence: string; counts: Counts }> {
    const counts: Counts = {
        groups: 0,
        subgroups: 0,
        forms: 0,
        procedures: 0,
    };

    try {
        log(progressCallback, `Iniciando importação (v3 Strict SOAP) - Competência ${competence}...`);

        // 1. Grupos
        log(progressCallback, 'Buscando grupos...');
        const grupos = await api.requestListarGrupos();
        counts.groups = grupos.length;
        await saveBatch(grupos, `sigtap/${competence}/lookup_grupos`, 'codigoGrupo');

        // 2. Iterate Groups -> Subgroups
        const allPendingProcedures: any[] = []; // Store basic info

        for (const grupo of grupos) {
            const codGrupo = grupo.codigoGrupo || grupo.codigo;
            if (!codGrupo) continue;

            // log(progressCallback, `Grupo ${codGrupo}: Buscando subgrupos...`);
            const subgrupos = await api.requestListarSubGrupos(codGrupo);
            counts.subgroups += subgrupos.length;
            await saveBatch(subgrupos, `sigtap/${competence}/lookup_subgrupos`, 'codigoSubgrupo');

            for (const sub of subgrupos) {
                const codSub = sub.codigoSubgrupo || sub.codigo;
                if (!codSub) continue;

                // 3. Subgroups -> Formas
                // log(progressCallback, `  > Sub ${codSub}: Buscando formas...`);
                // Note: Modified API only takes codSub
                const formas = await api.requestListarFormas(codSub);
                counts.forms += formas.length;
                await saveBatch(formas, `sigtap/${competence}/lookup_formas`, 'codigoFormaOrganizacao');

                // Determine iteration list: if no forms, try one search with undefined form?
                // Or assume standard structure implies forms.
                // We'll iterate the array. If empty array, we do one pass with null form.
                const formasToIterate = (formas.length > 0) ? formas : [{ codigoFormaOrganizacao: null, codigo: null }];

                for (const forma of formasToIterate) {
                    const codForma = forma.codigoFormaOrganizacao || forma.codigo; // can be null/undefined

                    // 4. Search Procedures (Pagination)
                    let page = 1;
                    const pageSize = 20;

                    do {
                        // log(progressCallback, `    >> Forma ${codForma || 'N/A'}: Buscando pág ${page}...`);
                        const res = await api.requestPesquisarProcedimentos(
                            competence,
                            codGrupo,
                            codSub,
                            codForma,
                            page,
                            pageSize
                        );

                        // Break if no items
                        if (res.procedimentos.length === 0) break;

                        allPendingProcedures.push(...res.procedimentos);

                        // Check if we reached end
                        const loaded = (page - 1) * pageSize + res.procedimentos.length;
                        if (loaded >= res.totalRegistros) break;

                        page++;

                        // Safety break for infinite loops if API reports wrong total
                        if (page > 500) break;

                    } while (true);
                }
            }
            log(progressCallback, `Grupo ${codGrupo} processado. Total parcial proc: ${allPendingProcedures.length}`);
        }

        // Remove duplicates (same procedure might appear if logic overlaps, though unlikely with strict hierarchy)
        const uniqueProceduresMap = new Map();
        for (const p of allPendingProcedures) {
            const code = p.codigoProcedimento;
            if (code) uniqueProceduresMap.set(code, p);
        }
        const uniqueProcedures = Array.from(uniqueProceduresMap.values());

        counts.procedures = uniqueProcedures.length;
        log(progressCallback, `Total de procedimentos únicos: ${counts.procedures}. Iniciando detalhamento...`);

        // 5. Detalhar Procedimentos
        const chunked = chunkArray(uniqueProcedures, 10); // 10 parallel requests
        let processed = 0;

        for (const chunk of chunked) {

            const detailPromises = chunk.map(p => {
                const code = p.codigoProcedimento;
                return api.requestDetalharProcedimento(code, competence);
            });

            const results = await Promise.all(detailPromises);
            const validResults = results.filter(r => r !== null);

            // Save to Firestore
            await saveProcedures(validResults, competence);

            processed += chunk.length;
            // Update progress every 50
            if (processed % 50 === 0) {
                log(progressCallback, `Processados ${processed}/${counts.procedures}...`);
            }
        }

        // 6. History
        await db.collection('sigtap_import_history').add({
            competence,
            importedAt: new Date().toISOString(),
            status: 'success',
            counts
        });

        log(progressCallback, 'Importação Finalizada!');
        return { success: true, competence, counts };

    } catch (error: any) {
        console.error('Erro Importador:', error);
        log(progressCallback, `Erro CRÍTICO: ${error.message}`);

        await db.collection('sigtap_import_history').add({
            competence,
            importedAt: new Date().toISOString(),
            status: 'error',
            error: error.message
        });
        throw error;
    }
}

// --- Helpers ---

function log(callback: ProgressCallback | undefined, message: string) {
    if (callback) callback(message);
    console.log(`[SIGTAP] ${message}`);
}

function chunkArray(array: any[], size: number) {
    const results: any[] = [];
    for (let i = 0; i < array.length; i += size) {
        results.push(array.slice(i, i + size));
    }
    return results;
}

async function saveBatch(items: any[], collectionPath: string, idField: string) {
    if (!items || items.length === 0) return;
    let batch = db.batch();
    let count = 0;

    for (const item of items) {
        // Correct keys based on manual XML mapping
        // grupos -> codigoGrupo
        // subgrupos -> codigoSubgrupo
        // formas -> codigoFormaOrganizacao
        let id = item[idField];

        // Fallback if parser simplified differently, though we set removeNSPrefix.
        // If undefined, try looking for just 'codigo' if API sometimes returns that.
        if (!id && item.codigo) id = item.codigo;

        if (!id) continue;

        const ref = db.collection(collectionPath).doc(String(id));
        batch.set(ref, item);
        count++;

        if (count >= 400) {
            await batch.commit();
            batch = db.batch();
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
    }
}

async function saveProcedures(procedures: any[], competence: string) {
    if (!procedures.length) return;
    const batch = db.batch();
    let opCount = 0;

    for (const proc of procedures) {
        const id = proc.codigoProcedimento;
        if (!id) continue;

        // Extract Instruments from Detailed Response
        // Structure should be in proc.instrumentoRegistro or inside detalhe filters
        // The API returns details merged or in specific keys?
        // Usually parsing merges repeated tags into arrays.
        // We look for 'INSTRUMENTO_REGISTRO' or just 'instrumentoRegistro' field.

        // Note: The detail request asks for category INSTRUMENTO_REGISTRO.
        // The response usually puts them in a list.
        // We need to parse robustly.

        let instrumentos: any[] = [];
        // Attempt 1: Direct property
        if (proc.instrumentoRegistro) {
            instrumentos = Array.isArray(proc.instrumentoRegistro) ? proc.instrumentoRegistro : [proc.instrumentoRegistro];
        }
        // Attempt 2: Look inside 'DetalhesAdicionais' if structured that way
        // (Assuming fast-xml-parser flattens it if configured, or we check)

        const instCodes = instrumentos.map((i: any) => i.codigo);

        // Classification
        const isBpa = instCodes.includes('01') || instCodes.includes('02');
        const isApac = instCodes.includes('04');
        const isAih = instCodes.includes('03');

        // Save to appropriate collections
        if (isBpa) {
            batch.set(db.collection(`sigtap/${competence}/bpa_procedures`).doc(id), proc);
            opCount++;
        }
        if (isApac) {
            batch.set(db.collection(`sigtap/${competence}/apac_procedures`).doc(id), proc);
            opCount++;
        }
        if (isAih) {
            batch.set(db.collection(`sigtap/${competence}/aih_procedures`).doc(id), proc);
            opCount++;
        }
    }

    if (opCount > 0) {
        await batch.commit();
    }
}
