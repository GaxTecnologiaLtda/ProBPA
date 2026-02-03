import { db } from '../firebase';
import ciapData from './ciap_cid_mapping.json';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    doc,
    getDoc,
    DocumentData
} from 'firebase/firestore';

export interface SigtapProcedureRow {
    id: string;
    code: string;
    name: string;
    procedureType: 'BPA' | 'APAC' | 'AIH';

    registroCodes?: string[];
    cidCodes?: string[];
    serviceCodes?: string[];
    modalityCodes?: string[];
    groupCode?: string;
    subgroupCode?: string;
    formaOrganizacaoCode?: string;

    [key: string]: any;
}

export interface SigtapCidRow {
    code: string;
    name: string;
}

export interface SigtapHistoryDoc {
    id: string;
    competence: string;
    status: 'success' | 'failed' | 'processing' | 'warning';
    importedAt: string;
    importedFiles?: string[];
}

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
            // Check LocalStorage Fallback
            const localComp = localStorage.getItem('probpa_sigtap_competence');
            if (localComp) {
                console.warn("Nenhuma competência encontrada online. Usando cache local.");
                cachedCompetence = localComp;
                return localComp;
            }
            throw new Error("Nenhuma competência SIGTAP importada encontrada.");
        }

        const data = snapshot.docs[0].data() as SigtapHistoryDoc;
        cachedCompetence = data.competence;

        // Save to LocalStorage
        localStorage.setItem('probpa_sigtap_competence', data.competence);

        return data.competence;
    } catch (error) {
        console.error("Erro ao buscar competência atual:", error);

        // LAST RESORT FALLBACK in case of Offline Error
        const localComp = localStorage.getItem('probpa_sigtap_competence');
        if (localComp) {
            console.log("Offline/Erro: Usando competência SIGTAP do cache local:", localComp);
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
            // Format label: "202405" -> "Maio/2024"
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

export const searchProcedures = async (term: string, limitCount = 20, competence?: string, groupCode?: string): Promise<SigtapProcedureRow[]> => {
    if (!term || term.length < 3) return [];

    try {
        const targetCompetence = competence || await getCurrentCompetence();
        const collectionsToSearch = [
            { name: 'bpa_procedures', type: 'BPA' as const },
            { name: 'apac_procedures', type: 'APAC' as const },
            { name: 'aih_procedures', type: 'AIH' as const }
        ];

        let allResults: SigtapProcedureRow[] = [];

        // We run queries in parallel
        const promises = collectionsToSearch.map(async (col) => {
            const colRef = collection(db, `sigtap/${targetCompetence}/${col.name}`);
            let q;
            // Note: Cloud Firestore does not support multiple inequality filters on different fields easily without composite indexes.
            // So we will filter by groupCode locally after fetching, OR use equality if possible.
            // Since we search by term (inequality), we can't easily add where('groupCode', '==', x) unless we have specific index.
            // To ensure safety without requiring new indexes immediately, I will fetch by term and filter in memory.

            if (/^\d+$/.test(term)) {
                // Search by code
                q = query(
                    colRef,
                    where('code', '>=', term),
                    where('code', '<=', term + '\uf8ff'),
                    limit(limitCount * 2) // Fetch more to allow for filtering
                );
            } else {
                // Search by name (uppercase)
                const termUpper = term.toUpperCase();
                q = query(
                    colRef,
                    where('name', '>=', termUpper),
                    where('name', '<=', termUpper + '\uf8ff'),
                    limit(limitCount * 2)
                );
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data() as any;
                return {
                    id: doc.id,
                    code: data.code,
                    name: data.name,
                    procedureType: col.type,
                    registroCodes: data.registroCodes || [],
                    cidCodes: data.cidCodes || [],
                    serviceCodes: data.serviceCodes || [],
                    modalityCodes: data.modalityCodes || [],
                    groupCode: data.groupCode || '',
                    subgroupCode: data.subgroupCode || '',
                    formaOrganizacaoCode: data.formaOrganizacaoCode || '',
                    ...data
                } as SigtapProcedureRow;
            });
        });

        const resultsArrays = await Promise.all(promises);

        // Flatten and merge
        allResults = resultsArrays.flat();

        // Filter by GroupCode if provided
        if (groupCode) {
            allResults = allResults.filter(r => r.groupCode === groupCode);
        }

        // Deduplicate by code
        const uniqueMap = new Map<string, SigtapProcedureRow>();
        allResults.forEach(item => {
            if (!uniqueMap.has(item.code)) {
                uniqueMap.set(item.code, item);
            }
        });

        // Sort by name ASC and slice
        return Array.from(uniqueMap.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, limitCount);

    } catch (error) {
        console.error("Erro ao buscar procedimentos:", error);
        return [];
    }
};

export const getCompatibleCids = async (procedure: SigtapProcedureRow): Promise<SigtapCidRow[]> => {
    if (!procedure.cidCodes || procedure.cidCodes.length === 0) return [];

    try {
        const competence = await getCurrentCompetence();
        const cidCodes = procedure.cidCodes;
        const cidDetails: SigtapCidRow[] = [];
        const cidRef = collection(db, `sigtap/${competence}/lookup_cid`);

        // Batch queries of 10
        for (let i = 0; i < cidCodes.length; i += 10) {
            const batch = cidCodes.slice(i, i + 10);
            const q = query(cidRef, where('code', 'in', batch));
            const snapshot = await getDocs(q);

            snapshot.forEach(doc => {
                const data = doc.data();
                cidDetails.push({
                    code: data.code,
                    name: data.name
                });
            });
        }

        // Sort by code ASC
        return cidDetails.sort((a, b) => a.code.localeCompare(b.code));
    } catch (error) {
        console.error("Erro ao buscar CIDs:", error);
        return [];
    }
};

export const getAttendanceCharacterForProcedure = async (procedure: SigtapProcedureRow): Promise<string | null> => {
    if (!procedure.registroCodes || procedure.registroCodes.length === 0) return null;

    try {
        const competence = await getCurrentCompetence();
        const registroCodes = procedure.registroCodes;
        const lookupRef = collection(db, `sigtap/${competence}/lookup_registros`);

        const registrosFound: any[] = [];

        // Batch fetch details
        for (let i = 0; i < registroCodes.length; i += 10) {
            const batch = registroCodes.slice(i, i + 10);
            const q = query(lookupRef, where('code', 'in', batch));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => registrosFound.push(doc.data()));
        }

        if (registrosFound.length === 0) return null;

        // Prioritization Logic:
        // 1. type === 'BPA'
        const bpaType = registrosFound.find(r => r.type === 'BPA');
        if (bpaType) return bpaType.code;

        // 2. name includes 'BPA'
        const bpaName = registrosFound.find(r => r.name && r.name.toUpperCase().includes('BPA'));
        if (bpaName) return bpaName.code;

        // 3. First available
        return registrosFound[0].code;

    } catch (error) {
        console.error("Erro ao buscar Caráter:", error);
        return null;
    }
};

export const getServicesForProcedure = async (procedure: SigtapProcedureRow): Promise<any[]> => {
    if (!procedure.serviceCodes || procedure.serviceCodes.length === 0) return [];

    try {
        const competence = await getCurrentCompetence();
        const serviceCodes = procedure.serviceCodes;
        const servicesFound: any[] = [];
        const lookupRef = collection(db, `sigtap/${competence}/lookup_services`);

        for (let i = 0; i < serviceCodes.length; i += 10) {
            const batch = serviceCodes.slice(i, i + 10);
            const q = query(lookupRef, where('code', 'in', batch));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => servicesFound.push(doc.data()));
        }

        // Sort by code ASC
        return servicesFound.sort((a, b) => a.code.localeCompare(b.code));
    } catch (error) {
        console.error("Erro ao buscar Serviços:", error);
        return [];
    }
};

export const searchCids = async (term: string, limitCount = 20): Promise<SigtapCidRow[]> => {
    if (!term || term.length < 3) return [];

    try {
        const competence = await getCurrentCompetence();
        const cidRef = collection(db, `sigtap/${competence}/lookup_cid`);
        let q;

        // Determine if search is by Code or Name
        // CID is usually A00.1 (Letter + Numbers) or Description
        // If 3 chars and first is letter, assume partial code
        if (/^[A-Z]\d+/.test(term.toUpperCase())) {
            q = query(
                cidRef,
                where('code', '>=', term.toUpperCase()),
                where('code', '<=', term.toUpperCase() + '\uf8ff'),
                limit(limitCount)
            );
        } else {
            const termUpper = term.toUpperCase();
            q = query(
                cidRef,
                where('name', '>=', termUpper),
                where('name', '<=', termUpper + '\uf8ff'),
                limit(limitCount)
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return {
                code: data.code,
                name: data.name
            };
        });

    } catch (error) {
        console.error("Erro ao buscar CIDs:", error);
        return [];
    }
};


export interface CiapRow {
    ciap: string;
    ciap_desc: string;
    cid: string;
    cid_desc: string;
}

export const searchCiap = async (query: string): Promise<CiapRow[]> => {
    if (!query || query.length < 2) return [];

    const q = query.toLowerCase();

    // Filter locally (dataset is small ~700 items)
    return (ciapData as any[]).filter((item: CiapRow) =>
        item.ciap.toLowerCase().includes(q) ||
        item.ciap_desc.toLowerCase().includes(q) ||
        item.cid.toLowerCase().includes(q) ||
        item.cid_desc.toLowerCase().includes(q)
    ).slice(0, 50); // Limit results
};



// --- PREFETCH LOGIC FOR OFFLINE CACHE ---

export type SyncProgressCallback = (message: string, progress: number) => void;

export const prefetchSigtapData = async (onProgress?: SyncProgressCallback): Promise<void> => {
    try {
        const competence = await getCurrentCompetence();
        onProgress?.(`Competência: ${competence}`, 5);

        // 1. Flat Collections (Critical for text search)
        const flatCollections = [
            { name: 'bpa_procedures', label: 'Procedimentos BPA (Busca)' },
            { name: 'lookup_cid', label: 'Tabela CID-10' },
            { name: 'lookup_registros', label: 'Registros/Caráter' },
            { name: 'lookup_services', label: 'Serviços/CBOs' }
        ];

        let completedSteps = 0;
        const totalSteps = flatCollections.length + 1; // +1 for Tree

        for (const col of flatCollections) {
            onProgress?.(`Baixando ${col.label}...`, 10 + Math.round((completedSteps / totalSteps) * 60));
            const colRef = collection(db, `sigtap/${competence}/${col.name}`);
            const snapshot = await getDocs(colRef);
            console.log(`[Cache] ${col.name}: ${snapshot.size} docs`);
            completedSteps++;
        }

        // 2. Tree Structure (Groups -> SubGroups -> Forms -> Procedures)
        // Needed for SigtapTreeSelector
        onProgress?.(`Baixando Estrutura da Árvore...`, 70);

        // A. Groups
        const groupsRef = collection(db, `sigtap/${competence}/grupos`);
        const groupsSnap = await getDocs(groupsRef);
        console.log(`[Cache] Groups: ${groupsSnap.size}`);

        let processedGroups = 0;

        // B. Recurse (Parallelized)
        // We limit concurrency to avoid overwhelming the browser/network
        const groups = groupsSnap.docs;

        for (const group of groups) {
            processedGroups++;
            const pct = 70 + Math.round((processedGroups / groups.length) * 25);
            onProgress?.(`Baixando Grupo ${group.id}...`, pct);

            const subgroupsRef = collection(db, `sigtap/${competence}/grupos/${group.id}/subgrupos`);
            const subSnap = await getDocs(subgroupsRef);

            // For each SubGroup, fetch Forms
            await Promise.all(subSnap.docs.map(async (sub) => {
                const formsRef = collection(db, `sigtap/${competence}/grupos/${group.id}/subgrupos/${sub.id}/formas`);
                const formSnap = await getDocs(formsRef);

                // For each Form, fetch Procedures (Leaves)
                // This forces the "Tree" view to work offline.
                // NOTE: This duplicates the data from 'bpa_procedures' but is required because 
                // the Tree Component queries these specific paths.
                await Promise.all(formSnap.docs.map(async (form) => {
                    const procsRef = collection(db, `sigtap/${competence}/grupos/${group.id}/subgrupos/${sub.id}/formas/${form.id}/procedimentos`);
                    await getDocs(procsRef); // Trigger cache
                }));
            }));
        }

        onProgress?.(`Sincronização 100% concluída!`, 100);
        localStorage.setItem('probpa_sigtap_competence', competence);
        localStorage.setItem('probpa_sigtap_last_sync', new Date().toISOString());

    } catch (error) {
        console.error("Erro ao sincronizar SIGTAP:", error);
        throw error;
    }
};
