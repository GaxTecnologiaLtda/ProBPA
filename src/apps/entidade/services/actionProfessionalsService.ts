import {
    collection,
    doc,
    setDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    deleteDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export interface ActionProfessionalBase {
    id?: string;
    entityId: string;
    municipalityId: string; // The primary municipality they act in for actions
    name: string;
    cpf: string;
    cns?: string;
    occupation: string; // CBO principal
    occupations?: string[]; // Array of CBOs (optional for backward compatibility)
    conselho?: string;
    email?: string;
    phone?: string;
    signatureUrl?: string; // URL da assinatura digitalizada
    signatureBase64?: string; // Base64 para embed em PDF
    createdAt?: Timestamp | any;
    updatedAt?: Timestamp | any;
}

// Collection reference helper
const getActionProfessionalsRef = (entityId: string) =>
    collection(db, 'entities', entityId, 'professionalsActions');

/**
 * Creates or updates an action professional.
 * Uses CPF or a generated ID as the document ID to prevent duplicates if CPF is provided.
 */
export const saveActionProfessional = async (entityId: string, data: Omit<ActionProfessionalBase, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> => {
    try {
        const collRef = getActionProfessionalsRef(entityId);
        
        // If updating an existing OR if we have CPF, use it as ID to avoid dupes where possible
        let docId = data.id;
        if (!docId && data.cpf) {
            // Remove punctation from CPF for a clean ID
            const cleanCpf = data.cpf.replace(/\D/g, '');
            if (cleanCpf.length === 11) {
                docId = cleanCpf;
            }
        }
        
        const docRef = docId ? doc(collRef, docId) : doc(collRef);
        const actualDocId = docRef.id;

        const timestamp = serverTimestamp();
        
        const docSnap = await getDoc(docRef);
        const payload: Partial<ActionProfessionalBase> = { ...data };
        
        if (!docSnap.exists()) {
            payload.createdAt = timestamp;
            payload.id = actualDocId;
        }
        payload.updatedAt = timestamp;
        
        await setDoc(docRef, payload, { merge: true });
        
        return actualDocId;
    } catch (error) {
        console.error("Error saving action professional:", error);
        throw error;
    }
};

/**
 * Updates specific fields of an existing action professional (e.g. adding signature).
 */
export const updateActionProfessionalStatus = async (entityId: string, professionalId: string, data: Partial<ActionProfessionalBase>): Promise<void> => {
    try {
        const docRef = doc(getActionProfessionalsRef(entityId), professionalId);
        
        const payload = {
            ...data,
            updatedAt: serverTimestamp()
        };
        
        await setDoc(docRef, payload, { merge: true });
    } catch (error) {
        console.error("Error updating action professional:", error);
        throw error;
    }
};

/**
 * Fetches all action professionals for an entity, optionally filtered by municipality.
 */
export const fetchActionProfessionals = async (entityId: string, municipalityId?: string): Promise<ActionProfessionalBase[]> => {
    try {
        const collRef = getActionProfessionalsRef(entityId);
        let q = query(collRef, orderBy('name', 'asc'));
        
        if (municipalityId) {
            q = query(collRef, where('municipalityId', '==', municipalityId), orderBy('name', 'asc'));
        }
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActionProfessionalBase));
    } catch (error) {
        console.error("Error fetching action professionals:", error);
        throw error;
    }
};

/**
 * Searches action professionals by exact CPF or partial Name prefix
 */
export const searchActionProfessionals = async (entityId: string, searchTerm: string): Promise<ActionProfessionalBase[]> => {
    try {
        const collRef = getActionProfessionalsRef(entityId);
        const cleanSearch = searchTerm.trim();
        
        if (cleanSearch.length < 3) return [];

        let snapshotName;
        let snapshotCpf;

        // Try exact CPF search first if it looks like numbers
        const numbersOnly = cleanSearch.replace(/\D/g, '');
        if (numbersOnly.length >= 3) {
            // Partial text search on CPF field (prefix) is hard in firestore, we'll fetch exact matches if complete,
            // or we do standard getDocs caching locally if DB grows.
            // For now, let's just query on name >= search <= search + "\uf8ff" 
            // since CPF is formatted in DB (e.g., 000.000.000-00).
            const qCpf = query(
                collRef, 
                where('cpf', '>=', cleanSearch), 
                where('cpf', '<=', cleanSearch + '\uf8ff')
            );
            snapshotCpf = await getDocs(qCpf);
        }

        // Capitalize for basic name search
        const upperSearch = cleanSearch.toUpperCase();
        
        // Basic prefix search for name
        const qNameUpper = query(
            collRef, 
            where('name', '>=', upperSearch), 
            where('name', '<=', upperSearch + '\uf8ff')
        );
        const qNameNormal = query(
            collRef, 
            where('name', '>=', cleanSearch), 
            where('name', '<=', cleanSearch + '\uf8ff')
        );

        const [snapUpper, snapNormal] = await Promise.all([
            getDocs(qNameUpper),
            getDocs(qNameNormal)
        ]);

        const resultsMap = new Map<string, ActionProfessionalBase>();
        
        const addDocsToMap = (snap: any) => {
            if (snap && !snap.empty) {
                snap.docs.forEach((doc: any) => {
                    resultsMap.set(doc.id, { id: doc.id, ...doc.data() } as ActionProfessionalBase);
                });
            }
        };

        addDocsToMap(snapshotCpf);
        addDocsToMap(snapUpper);
        addDocsToMap(snapNormal);

        return Array.from(resultsMap.values()).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 15);
    } catch (error) {
        console.error("Error searching action professionals:", error);
        throw error;
    }
};

export const deleteActionProfessional = async (entityId: string, professionalId: string): Promise<void> => {
    try {
        const docRef = doc(getActionProfessionalsRef(entityId), professionalId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting action professional:", error);
        throw error;
    }
};
