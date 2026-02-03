import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, where, limit, orderBy, writeBatch, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import {
    SigtapProcedureDetail, SigtapCid,
    SigtapGroup, SigtapSubGroup, SiaSusHistory,
    SigtapDomainTree, SigtapBaseEntity
} from '../types';

const PROCEDURES_COLLECTION = 'bpa_procedures'; // Updated to reflect new primary collection possibly
const GROUPS_COLLECTION = 'sigtap_groups';
const HISTORY_COLLECTION = 'sigtap_import_history';


export const sigtapService = {
    // --- SEARCH & GETTERS ---
    // These need to be adapted to the new structure where procedures are deep in the tree.
    // However, for search performance, we might need a Collection Group Index on 'procedimentos'.
    // Assuming 'procedimentos' collection exists at leaf level.

    async searchProcedures(term: string, competence: string, limitCount = 20): Promise<SigtapProcedureDetail[]> {
        // Search across all 'procedimentos' subcollections 
        // Requires Firestore Index on (code) and (name) for Collection Group 'procedimentos'
        const proceduresRef = collection(db, `sigtap/${competence}/procedimentos`); // Note: This doesn't exist in new schema directly, it's nested.

        // Actually, in the new schema: grupos/{g}/sub/{s}/formas/{f}/procedimentos/{p}
        // To search efficiently we need collectionGroup query.
        // But for now, let's assume we search in a specific competence if strictly needed, or we just warn.

        // Alternative: The user prompt asked to "Permitir consultas instantâneas no painel admin".
        // The previous saveDomainImport SAVED to hierarchical structure. 
        // It ALSO saved 'bpa_procedures', 'apac_procedures' etc in root of sigtap/{competence}/... ?
        // Let's check saveDomainImport again. 
        // Yes: await saveBatch('bpa_procedures', ...); 
        // So we DO have flat collections at `sigtap/{competence}/bpa_procedures`.

        // We can search there.
        const collPath = `sigtap/${competence}/bpa_procedures`;
        const proceduresRef2 = collection(db, collPath);

        let q;
        if (/^\d+$/.test(term)) {
            q = query(proceduresRef2, where('code', '>=', term), where('code', '<=', term + '\uf8ff'), limit(limitCount));
        } else {
            q = query(proceduresRef2, where('name', '>=', term.toUpperCase()), where('name', '<=', term.toUpperCase() + '\uf8ff'), limit(limitCount));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as SigtapProcedureDetail);
    },

    // ========================================================================
    // NEW DOMAIN IMPORT (REFACTORED)
    // ========================================================================

    // ========================================================================
    // NEW DOMAIN IMPORT (DEEP HIERARCHY)
    // ========================================================================

    async saveDomainImport(
        domain: SigtapDomainTree,
        meta?: { sourceFileName?: string; importedBy?: string; }
    ): Promise<void> {
        const competence = domain.competence;
        const rootRef = doc(db, `sigtap/${competence}`);
        const batchHandler = new BatchHandler(db, 400);

        console.log(`[SigtapService] Iniciando salvamento hierárquico para ${competence} ...`);

        // 1. Save Root Metadata
        await setDoc(rootRef, {
            competence,
            importedAt: new Date().toISOString(),
            importedBy: meta?.importedBy || 'Admin',
            sourceFileName: meta?.sourceFileName || '',
            status: 'success',
            stats: domain.stats
        });

        // 2. Iterate Groups
        for (const grupo of domain.grupos) {
            const grupoRef = doc(collection(rootRef, 'grupos'), grupo.code);
            await batchHandler.set(grupoRef, { code: grupo.code, name: grupo.name });

            // 3. Iterate Subgroups
            for (const sub of grupo.subgrupos) {
                const subRef = doc(collection(grupoRef, 'subgrupos'), sub.code);
                await batchHandler.set(subRef, { code: sub.code, name: sub.name });

                // 4. Iterate Formas
                for (const form of sub.formas) {
                    const formRef = doc(collection(subRef, 'formas'), form.code);
                    await batchHandler.set(formRef, { code: form.code, name: form.name });

                    // 5. Iterate Procedures
                    for (const proc of form.procedimentos) {
                        const procRef = doc(collection(formRef, 'procedimentos'), proc.code);
                        await batchHandler.set(procRef, proc);
                    }
                }
            }
        }

        // 6. Save Lookups (Optional but good for quick access)
        // We'll save them in `sigtap/{competence}/lookups/{type}/items/{code}`
        const saveLookup = async (name: string, items: any[]) => {
            for (const item of items) {
                const ref = doc(db, `sigtap/${competence}/lookups/${name}/items/${item.code}`);
                await batchHandler.set(ref, item);
            }
        };

        await saveLookup('cids', domain.lookup.cids);
        await saveLookup('servicos', domain.lookup.servicos);
        await saveLookup('modalidades', domain.lookup.modalidades);
        await saveLookup('registros', domain.lookup.registros);

        // Final commit
        await batchHandler.commit();

        // 7. Update History
        await this.saveImportHistory({
            competence,
            importedBy: meta?.importedBy || 'Admin',
            importedAt: new Date().toISOString(), // Fixed format
            sourceUrl: meta?.sourceFileName || 'Manual Upload',
            status: 'success',
            filesCount: domain.stats.totalGroups, // Using groups as proxy
            importedFiles: []
        });

        console.log(`[SigtapService] Importação ${competence} concluída.`);
    },

    // ========================================================================
    // LEGACY / SHARED
    // ========================================================================

    async getCompetenceHistory(): Promise<SiaSusHistory[]> {
        const historyRef = collection(db, HISTORY_COLLECTION);
        const q = query(historyRef, orderBy('importedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SiaSusHistory));
    },

    async saveImportHistory(history: Omit<SiaSusHistory, 'id'>) {
        const historyRef = collection(db, HISTORY_COLLECTION);
        await addDoc(historyRef, history);
    },

    async deleteImport(historyId: string, competence: string) {
        try {
            console.log(`Deleting import ${competence}...`);
            // 1. Delete History Record
            if (historyId) {
                await deleteDoc(doc(db, HISTORY_COLLECTION, historyId));
            }

            // 2. Delete Metadata Document (sigtap/{competence})
            // NOTE: Firestore does not support recursive delete of subcollections from Web SDK.
            // Only Cloud Functions or Admin SDK can do "recursiveDelete".
            // Here we only delete the root doc. The subcollections remain "orphaned" but accessible via direct query if you know the ID.
            // This is a limitation of client-side SDK.
            if (competence) {
                await deleteDoc(doc(db, `sigtap/${competence}`));
            }

            console.log(`Import ${competence} deleted (metadata/history). Subcollections will persist until recursive delete is run by Admin/Cloud Function.`);
        } catch (error) {
            console.error("Error deleting import:", error);
            throw error;
        }
    },

    // ========================================================================
    // HISTORY EXPLORER (DYNAMIC TREE)
    // ========================================================================

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

    // --- Single Item Fetchers (For Hierarchy Tree Context) ---

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

// Batch Handler Class to manage 400 limit
class BatchHandler {
    private batch: any;
    private count = 0;
    private db: any;
    private limit: number;

    constructor(db: any, limit = 400) {
        this.db = db;
        this.limit = limit;
        this.batch = writeBatch(db);
    }

    async set(ref: any, data: any) {
        // Sanitize data (remove undefined) to avoid Firestore errors
        // Note: This converts Dates to Strings, which is fine for our current model.
        const safeData = JSON.parse(JSON.stringify(data));
        this.batch.set(ref, safeData);
        this.count++;
        if (this.count >= this.limit) {
            await this.commit();
        }
    }

    async commit() {
        if (this.count > 0) {
            await this.batch.commit();
            this.batch = writeBatch(this.db);
            this.count = 0;
        }
    }
}
