import { db, storage } from '../firebase';
import { collection, doc, getDoc, getDocs, writeBatch, collectionGroup, query, where, limit, orderBy } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';

// Types (Adapted locally if needed, or imported if shared types exist)
// Using 'any' for now or minimal interfaces to avoid complex type dependencies if 'types.ts' is administrative specific.
// However, 'SigtapProcedureDetail' seems useful. Let's try to import from standard location or redefine.
// Given strict separation request, I will redefine minimal types here or import from a shared location if one exists.
// 'src/apps/entidade/types.ts' exists. 'src/apps/producao/types.ts' likely exists or should.
// For now, I'll inline interfaces or use 'any' where safe, to speed up.
// Actually, I should check if there are shared types.
// The file I read (admin) imported from '../types'.
// I will just copy the methods I need for the TREE explorer.

// --- Types ---
export interface SigtapGroup {
    code: string;
    name: string;
    subgrupos: SigtapSubGroup[];
}

export interface SigtapSubGroup {
    code: string;
    name: string;
    formas: SigtapForm[];
}

export interface SigtapForm {
    code: string;
    name: string;
    procedimentos: any[];
}

export interface SigtapProcedureDetail {
    code: string;
    name: string;
    // ... add more if needed
    [key: string]: any;
}

// --- Global Cache for Flat Procedures Search via HTTPS ---
let _flatProceduresCache: any[] = [];
let _flatProceduresCompetence: string = '';
let _flatProceduresError: boolean = false;

async function loadFlatProceduresCache(compId: string) {
    if (_flatProceduresCompetence === compId && _flatProceduresCache.length > 0) return;
    if (_flatProceduresCompetence === compId && _flatProceduresError) return;

    try {
        const fileRef = ref(storage, `sigtap_cache/${compId}.json`);
        const url = await getDownloadURL(fileRef);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        _flatProceduresCache = data;
        _flatProceduresCompetence = compId;
        _flatProceduresError = false;
        console.log(`[sigtapService] Flat Cache (JSON) loaded with ${data.length} procedures for ${compId}`);
    } catch (e) {
        console.warn(`[sigtapService] Cache estático não localizado ou indisponível pro competência ${compId}:`, e);
        _flatProceduresError = true;
        _flatProceduresCompetence = compId;
        _flatProceduresCache = [];
    }
}

// Helper
export const sigtapService = {
    _sanitizeCompetence(competence: string): string {
        if (!competence) return '';
        // If MM/YYYY, convert to YYYYMM
        if (competence.includes('/')) {
            const parts = competence.split('/');
            if (parts.length === 2) {
                return `${parts[1]}${parts[0]}`;
            }
        }
        return competence;
    },

    async getAvailableCompetences(): Promise<{ competence: string, label: string }[]> {
        const ref = collection(db, 'sigtap');
        const snap = await getDocs(ref);
        return snap.docs.map(d => {
            const c = d.id;
            const label = c.length === 6 ? `${c.substring(4, 6)}/${c.substring(0, 4)}` : c;
            return { competence: c, label };
        });
    },

    // --- TREE GETTERS ---

    async getGroups(competence: string): Promise<SigtapGroup[]> {
        const compId = this._sanitizeCompetence(competence);
        const ref = collection(db, `sigtap/${compId}/grupos`);
        const snapshot = await getDocs(ref);
        return snapshot.docs.map(d => ({ code: d.id, name: d.data().name, subgrupos: [] }));
    },

    async getSubGroups(competence: string, groupCode: string): Promise<SigtapSubGroup[]> {
        const compId = this._sanitizeCompetence(competence);
        const ref = collection(db, `sigtap/${compId}/grupos/${groupCode}/subgrupos`);
        const snapshot = await getDocs(ref);
        return snapshot.docs.map(d => ({ code: d.id, name: d.data().name, formas: [] }));
    },

    async getForms(competence: string, groupCode: string, subGroupCode: string): Promise<any[]> {
        const compId = this._sanitizeCompetence(competence);
        const ref = collection(db, `sigtap/${compId}/grupos/${groupCode}/subgrupos/${subGroupCode}/formas`);
        const snapshot = await getDocs(ref);
        return snapshot.docs.map(d => ({ code: d.id, name: d.data().name, procedimentos: [] }));
    },

    async getProcedures(competence: string, groupCode: string, subGroupCode: string, formCode: string): Promise<SigtapProcedureDetail[]> {
        const compId = this._sanitizeCompetence(competence);
        const ref = collection(db, `sigtap/${compId}/grupos/${groupCode}/subgrupos/${subGroupCode}/formas/${formCode}/procedimentos`);
        const snapshot = await getDocs(ref);
        return snapshot.docs.map(d => d.data() as SigtapProcedureDetail);
    },

    // --- SEARCH & VALIDATION ---

    _formatCbo(cbo: string): string {
        if (!cbo) return '';
        // "2251-25 - Médico" -> "225125"
        // remove all non-digits
        // If "2251-25" -> "225125"
        const digits = cbo.replace(/\D/g, '');
        // Usually CBO is 6 chars.
        return digits.slice(0, 6);
    },

    checkCboCompatibility(procedure: any, userCbo: string): { compatible: boolean; message?: string } {
        if (!userCbo) return { compatible: true }; // No CBO to check (maybe admin or not required)

        const procOcupacoes = procedure.ocupacoes as any[];
        // If procedure has no occupations linked, usually it means restricted? Or open?
        // In SIGTAP, empty usually means NO restriction (or everyone).
        // BUT for BPA-I, usually specifically linked.
        // Let's assume if empty, it's compatible (or we can't block).
        if (!procOcupacoes || procOcupacoes.length === 0) return { compatible: true };

        const normalizedUserCbo = this._formatCbo(userCbo);

        // Check if normalizedUserCbo is in the list
        const match = procOcupacoes.find((o: any) => o.code === normalizedUserCbo);

        if (match) return { compatible: true };

        return {
            compatible: false,
            message: `CBO do profissional (${userCbo}) não é compatível com este procedimento.`
        };
    },

    async searchProcedures(term: string, competence: string): Promise<any[]> {
        const compId = this._sanitizeCompetence(competence);

        // 1. Search by Code (Deterministic Path Optimization)
        // Code format: 0301010072 (10 digits)
        const cleanTerm = term.replace(/\D/g, '');
        if (cleanTerm.length === 10) {
            // Reconstruct logic: 
            // Group: chars 0-2 (03)
            // SubGroup: chars 2-4 (01)
            // Form: chars 4-6 (01)
            const g = cleanTerm.substring(0, 2);
            const s = cleanTerm.substring(2, 4);
            const f = cleanTerm.substring(4, 6);

            // Fetch directly
            const ref = doc(db, `sigtap/${compId}/grupos/${g}/subgrupos/${s}/formas/${f}/procedimentos/${cleanTerm}`);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                // We need to enrich with Group/Sub/Form names if needed by UI
                // For now, return what we have. UI might need parent info.
                // We can fetch parents in parallel if strict.
                const data = snap.data();
                return [{
                    ...data,
                    // Add context helpers if they exist in doc or we can infer
                    groupCode: g,
                    subGroupCode: s,
                    formCode: f
                }];
            }
            return [];
        }

        // 2. Search by Name (Multi-Case) or Partial Code (via CollectionGroup)
        console.log(`[sigtapService] Searching: "${term}" in competence: "${compId}"`);
        const proceduresRef = collectionGroup(db, 'procedimentos');

        // Helper for queries
        const runQuery = async (variant: string, field: 'name' | 'code' = 'name') => {
            console.log(`[sigtapService] Trying ${field} variant: "${variant}"`);
            const q = query(
                proceduresRef,
                where(field, '>=', variant),
                where(field, '<=', variant + '\uf8ff'),
                limit(50)
            );
            return await getDocs(q);
        };

        try {
            let snapshot;
            const cleanTerm = term.replace(/[^a-zA-Z0-9]/g, '');
            const isNumericSearch = term.trim() === cleanTerm && cleanTerm.length > 0 && /^\d+$/.test(cleanTerm);
            
            // Try downloading and using the lightweight flat JSON cache first for ALL searches (super fast and supports partial matching!)
            await loadFlatProceduresCache(compId);
            
            if (!_flatProceduresError && _flatProceduresCache.length > 0) {
                const termUpper = term.toUpperCase();
                const normalizedTerm = termUpper.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const searchWords = normalizedTerm.split(' ').filter(w => w.trim().length > 0);
                
                const results = _flatProceduresCache
                    .filter(p => {
                        if (!p.code || !p.name) return false;
                        
                        if (isNumericSearch) {
                            const strCode = p.code.toString();
                            return strCode.startsWith(cleanTerm) || strCode.includes(cleanTerm) || strCode.endsWith(cleanTerm);
                        } else {
                            // Partial Name Auto-search (Accent Insensitive):
                            const normalizedName = p.name.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                            for (const word of searchWords) {
                                if (!normalizedName.includes(word)) return false;
                            }
                            return true;
                        }
                    })
                    // Map to expected UI keys
                    .map(p => ({
                        ...p,
                        groupCode: p.grupoCode || p.groupCode,
                        subGroupCode: p.subgroupCode,
                        formCode: p.formaCode || p.formaOrganizacaoCode
                    }))
                    .slice(0, 150); // Increased limit so the scroll shows everything relevant!
                
                return results;
            }

            // --- FALLBACK (Firestore) ---
            if (isNumericSearch) {
                snapshot = await runQuery(cleanTerm, 'code');
            } else {
                // A) Try UPPERCASE (Standard)
                snapshot = await runQuery(term.toUpperCase(), 'name');

                // B) Try Title Case
                if (snapshot.empty) {
                    const titleCase = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
                    if (titleCase !== term.toUpperCase()) {
                        snapshot = await runQuery(titleCase, 'name');
                    }
                }

                // C) Try Lowercase
                if (snapshot.empty) {
                    const lowerCase = term.toLowerCase();
                    if (lowerCase !== term.toUpperCase() && lowerCase !== (term.charAt(0).toUpperCase() + term.slice(1).toLowerCase())) {
                        snapshot = await runQuery(lowerCase, 'name');
                    }
                }
            }

            console.log(`[sigtapService] Raw snapshot size: ${snapshot?.size}`);

            // Filter by Competence in Memory
            const rawDocs = snapshot?.docs || [];
            const results = rawDocs
                .filter(d => d.ref.path.includes(`/${compId}/`))
                .map(d => {
                    const data = d.data();
                    const pathSegments = d.ref.path.split('/');
                    return {
                        ...data,
                        groupCode: pathSegments[pathSegments.indexOf('grupos') + 1],
                        subGroupCode: pathSegments[pathSegments.indexOf('subgrupos') + 1],
                        formCode: pathSegments[pathSegments.indexOf('formas') + 1]
                    };
                });

            console.log(`[sigtapService] Filtered results: ${results.length}`);
            return results.slice(0, 150);
        } catch (e: any) {
            console.error("SEARCH ERROR (CRITICAL):", e);
            const errString = JSON.stringify(e, Object.getOwnPropertyNames(e));
            alert(`ERRO NA BUSCA: ${e.message}\n\nVerifique o console para resolver.`);

            // Detect Missing Index Error
            if (e.message && (e.message.includes('index') || e.code === 'failed-precondition')) {
                console.error(">>> LINK PARA CRIAR ÍNDICE (CLIQUE ABAIXO) <<<");
                // We can't easily generate the exact link without the query hash, but we can point to console.
            }
            return [];
        }
    },

    async getGroup(competence: string, code: string): Promise<any> {
        const compId = this._sanitizeCompetence(competence);
        const ref = doc(db, `sigtap/${compId}/grupos/${code}`);
        const snap = await getDoc(ref);
        return snap.exists() ? { code: snap.id, name: snap.data().name } : null;
    },

    async getSubGroup(competence: string, groupCode: string, code: string): Promise<any> {
        const compId = this._sanitizeCompetence(competence);
        const ref = doc(db, `sigtap/${compId}/grupos/${groupCode}/subgrupos/${code}`);
        const snap = await getDoc(ref);
        return snap.exists() ? { code: snap.id, name: snap.data().name } : null;
    },

    async getForm(competence: string, groupCode: string, subGroupCode: string, code: string): Promise<any> {
        const compId = this._sanitizeCompetence(competence);
        const ref = doc(db, `sigtap/${compId}/grupos/${groupCode}/subgrupos/${subGroupCode}/formas/${code}`);
        const snap = await getDoc(ref);
        return snap.exists() ? { code: snap.id, name: snap.data().name } : null;
    }
};
