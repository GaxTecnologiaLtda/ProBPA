import { db } from '../firebase';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    doc,
    getDoc,
    collectionGroup,
    DocumentData
} from 'firebase/firestore';

// --- Types ---

export interface SigtapProcedureRow {
    id: string;
    code: string;
    name: string;
    procedureType: 'BPA' | 'APAC' | 'AIH' | string;

    registroCodes?: string[];
    cidCodes?: string[];
    serviceCodes?: string[];
    modalityCodes?: string[];
    groupCode?: string;
    subgroupCode?: string;
    formaOrganizacaoCode?: string;

    [key: string]: any;
}

export interface SigtapHistoryDoc {
    id: string;
    competence: string;
    status: 'success' | 'failed' | 'processing' | 'warning';
    importedAt: string;
    importedFiles?: string[];
}

// --- Lookup Service Logic ---

let cachedCompetence: string | null = null;

export const getCurrentCompetence = async (): Promise<string> => {
    if (cachedCompetence) return cachedCompetence;

    try {
        const historyRef = collection(db, 'sigtap_import_history');
        const q = query(
            historyRef,
            where('status', 'in', ['success', 'warning']),
            orderBy('importedAt', 'desc'),
            limit(1)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            const localComp = localStorage.getItem('probpa_sigtap_competence');
            if (localComp) {
                cachedCompetence = localComp;
                return localComp;
            }
            throw new Error("Nenhuma competência SIGTAP importada encontrada.");
        }

        const data = snapshot.docs[0].data() as SigtapHistoryDoc;
        cachedCompetence = data.competence;
        localStorage.setItem('probpa_sigtap_competence', data.competence);
        return data.competence;
    } catch (error) {
        console.error("Erro ao buscar competência atual:", error);
        const localComp = localStorage.getItem('probpa_sigtap_competence');
        if (localComp) {
            cachedCompetence = localComp;
            return localComp;
        }
        throw error;
    }
};

export const getAvailableCompetences = async (): Promise<{ competence: string; label: string }[]> => {
    try {
        const historyRef = collection(db, 'sigtap_import_history');
        const q = query(
            historyRef,
            where('status', 'in', ['success', 'warning']),
            orderBy('importedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data() as SigtapHistoryDoc;
            const year = data.competence.slice(0, 4);
            const month = data.competence.slice(4, 6);
            const date = new Date(parseInt(year), parseInt(month) - 1);
            const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);

            return {
                competence: data.competence,
                label: formattedLabel
            };
        });
    } catch (error) {
        console.error("Erro ao buscar competências:", error);
        return [];
    }
};

export const searchProcedures = async (term: string, limitCount = 20, competence?: string, groupCode?: string, onDebug?: (msg: string) => void): Promise<SigtapProcedureRow[]> => {
    onDebug?.(`Iniciando busca ROBUSTA por: "${term}" (limit: ${limitCount})`);
    if (!term || term.length < 3) {
        onDebug?.("Termo muito curto. Retornando vazio.");
        return [];
    }

    try {
        const targetCompetence = competence || await getCurrentCompetence();
        onDebug?.(`Competência alvo: ${targetCompetence}`);

        const cleanTerm = term.replace(/\D/g, '');

        // 1. Search by Code (Deterministic Optimization)
        if (cleanTerm.length === 10) {
            onDebug?.(`Detectado código específico: ${cleanTerm}`);
            // Reconstruct logic: Group: chars 0-2, SubGroup: 2-4, Form: 4-6
            const g = cleanTerm.substring(0, 2);
            const s = cleanTerm.substring(2, 4);
            const f = cleanTerm.substring(4, 6);

            const ref = doc(db, `sigtap/${targetCompetence}/grupos/${g}/subgrupos/${s}/formas/${f}/procedimentos/${cleanTerm}`);
            const snap = await getDoc(ref);

            if (snap.exists()) {
                onDebug?.("Documento encontrado por ID direto.");
                const data = snap.data();
                return [{
                    id: snap.id,
                    code: data.code,
                    name: data.name,
                    procedureType: 'BPA', // Default fallback
                    ...data,
                    groupCode: g,
                    subgroupCode: s,
                    formaOrganizacaoCode: f
                } as SigtapProcedureRow];
            }
            onDebug?.("Documento não encontrado por ID direto.");
        }

        // 2. Search by Name (CollectionGroup Strategy)
        // Used by Producao app successfully. Scans 'procedimentos' collection group.

        const proceduresRef = collectionGroup(db, 'procedimentos');

        const runQuery = async (variant: string) => {
            onDebug?.(`Tentando variante: "${variant}"`);
            const q = query(
                proceduresRef,
                where('name', '>=', variant),
                where('name', '<=', variant + '\uf8ff'),
                limit(50)
            );
            return await getDocs(q);
        };

        // A) Try UPPERCASE
        let snapshot = await runQuery(term.toUpperCase());

        // B) Try Title Case
        if (snapshot.empty) {
            const titleCase = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
            if (titleCase !== term.toUpperCase()) {
                snapshot = await runQuery(titleCase);
            }
        }

        // C) Try Lowercase
        if (snapshot.empty) {
            const lowerCase = term.toLowerCase();
            if (lowerCase !== term.toUpperCase()) {
                snapshot = await runQuery(lowerCase);
            }
        }

        onDebug?.(`Snapshot bruto: ${snapshot.size} docs encontrados (global)`);

        // Filter by Competence Path
        const results = snapshot.docs
            .filter(d => {
                const match = d.ref.path.includes(`/${targetCompetence}/`);
                if (!match) {
                    // onDebug?.(`Ignorado doc de outra competência: ${d.ref.path.split('/')[1]}`);
                }
                return match;
            })
            .map(d => {
                const data = d.data();
                const pathSegments = d.ref.path.split('/');
                // Path: sigtap/{comp}/grupos/{g}/subgrupos/{s}/formas/{f}/procedimentos/{proc}
                const gIndex = pathSegments.indexOf('grupos');

                return {
                    id: d.id,
                    code: data.code,
                    name: data.name,
                    procedureType: 'BPA', // Default
                    registroCodes: data.registroCodes || [],
                    cidCodes: data.cidCodes || [],
                    groupCode: gIndex > -1 ? pathSegments[gIndex + 1] : '',
                    subgroupCode: gIndex > -1 ? pathSegments[gIndex + 3] : '',
                    formaOrganizacaoCode: gIndex > -1 ? pathSegments[gIndex + 5] : '',
                    ...data
                } as SigtapProcedureRow;
            });

        onDebug?.(`Resultados após filtro de competência: ${results.length}`);

        // Deduplicate
        const uniqueMap = new Map<string, SigtapProcedureRow>();
        results.forEach(item => {
            if (!uniqueMap.has(item.code)) uniqueMap.set(item.code, item);
        });

        return Array.from(uniqueMap.values()).slice(0, limitCount);

    } catch (err: any) {
        console.warn(`Erro na busca:`, err);
        onDebug?.(`CRITICAL ERROR: ${err.message}`);

        // Check for Missing Index
        if (err.message && err.message.includes('index')) {
            onDebug?.("MISSING INDEX: Requires CollectionGroup Index on 'procedimentos' field 'name'.");
        }

        return [];
    }
};

// --- Tree Service Logic ---

export const sigtapService = {
    getGroups: async (competence: string) => {
        const colRef = collection(db, `sigtap/${competence}/grupos`);
        const snapshot = await getDocs(query(colRef, orderBy('code')));
        return snapshot.docs.map(d => d.data());
    },

    getSubGroups: async (competence: string, groupCode: string) => {
        const colRef = collection(db, `sigtap/${competence}/grupos/${groupCode}/subgrupos`);
        const snapshot = await getDocs(query(colRef, orderBy('code')));
        return snapshot.docs.map(d => d.data());
    },

    getForms: async (competence: string, groupCode: string, subGroupCode: string) => {
        const colRef = collection(db, `sigtap/${competence}/grupos/${groupCode}/subgrupos/${subGroupCode}/formas`);
        const snapshot = await getDocs(query(colRef, orderBy('code')));
        return snapshot.docs.map(d => d.data());
    },

    getProcedures: async (competence: string, groupCode: string, subGroupCode: string, formCode: string) => {
        const colRef = collection(db, `sigtap/${competence}/grupos/${groupCode}/subgrupos/${subGroupCode}/formas/${formCode}/procedimentos`);
        const snapshot = await getDocs(query(colRef, orderBy('code')));
        return snapshot.docs.map(d => d.data());
    }
};
