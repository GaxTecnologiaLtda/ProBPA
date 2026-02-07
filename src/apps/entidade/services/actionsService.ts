import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

export interface ActionProfessional {
    id?: string;
    name: string;
    cns: string;
    occupation: string;
}

export interface ActionProcedure {
    code: string;
    name: string;
}

export interface Action {
    id?: string;
    entityId: string;
    name: string;
    date: string; // YYYY-MM-DD
    municipalityId?: string; // Optional: If linked to a registered municipality
    municipalityName: string;
    professionals: ActionProfessional[];
    procedures: ActionProcedure[];
    createdAt?: any;
}

export interface ProductionPatient {
    name: string;
    cns?: string;
    cpf?: string;
    birthDate?: string;
    sex?: string;
}

export interface ActionProduction {
    id?: string;
    entityId?: string;
    actionId: string;
    patient: ProductionPatient;
    procedureCode: string;
    competence: string; // YYYYMM
    createdAt?: any;
}

// Helper to get collection ref based on context
// We primarily read from the Entity's collection for the list view
const getEntityActionsRef = (entityId: string) => collection(db, 'entities', entityId, 'actions');

// --- ACTIONS MANAGEMENT ---

export const fetchActionsByEntity = async (entityId: string) => {
    try {
        const q = query(getEntityActionsRef(entityId), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Action));
    } catch (error) {
        console.error("Error fetching actions:", error);
        throw error;
    }
};

export const createAction = async (data: Action) => {
    try {
        const batch = writeBatch(db);

        // 1. Create wrapper ref in Entity collection to get an ID
        const entityActionRef = doc(getEntityActionsRef(data.entityId));
        const actionId = entityActionRef.id;

        const payload = { ...data, createdAt: new Date() };

        // 2. Set data in Entity Collection
        batch.set(entityActionRef, payload);

        // 3. Dual Write: If municipalityId is present (Registered Municipality)
        if (data.municipalityId) {
            const muniActionRef = doc(db, 'municipalities', data.municipalityId, 'actions', actionId);
            batch.set(muniActionRef, payload);
        }

        await batch.commit();
        return actionId;
    } catch (error) {
        console.error("Error creating action:", error);
        throw error;
    }
};

export const updateAction = async (actionId: string, data: Partial<Action>, originalAction: Action) => {
    try {
        const batch = writeBatch(db);

        // 1. Update Entity Collection
        const entityActionRef = doc(db, 'entities', originalAction.entityId, 'actions', actionId);
        batch.update(entityActionRef, data);

        // 2. Handle Dual Write logic for Municipality

        // Scenario A: Municipality didn't change, just update existing Linked Doc if it exists
        if (originalAction.municipalityId && data.municipalityId === originalAction.municipalityId) {
            const muniActionRef = doc(db, 'municipalities', originalAction.municipalityId, 'actions', actionId);
            batch.update(muniActionRef, data);
        }

        // Scenario B: Municipality Changed (Old -> New)
        // We need to DELETE from Old and CREATE in New
        else if (originalAction.municipalityId && data.municipalityId && data.municipalityId !== originalAction.municipalityId) {
            const oldMuniRef = doc(db, 'municipalities', originalAction.municipalityId, 'actions', actionId);
            batch.delete(oldMuniRef);

            const newMuniRef = doc(db, 'municipalities', data.municipalityId, 'actions', actionId);
            batch.set(newMuniRef, { ...originalAction, ...data }); // Need full data for set
        }

        // Scenario C: Changed from Linked -> Unlinked
        else if (originalAction.municipalityId && !data.municipalityId && data.municipalityId !== undefined) {
            const oldMuniRef = doc(db, 'municipalities', originalAction.municipalityId, 'actions', actionId);
            batch.delete(oldMuniRef);
        }

        // Scenario D: Changed from Unlinked -> Linked
        else if (!originalAction.municipalityId && data.municipalityId) {
            const newMuniRef = doc(db, 'municipalities', data.municipalityId, 'actions', actionId);
            batch.set(newMuniRef, { ...originalAction, ...data });
        }

        await batch.commit();
    } catch (error) {
        console.error("Error updating action:", error);
        throw error;
    }
};

export const deleteAction = async (actionId: string, entityId: string, municipalityId?: string) => {
    try {
        const batch = writeBatch(db);

        // 1. Delete from Entity
        const entityActionRef = doc(db, 'entities', entityId, 'actions', actionId);
        batch.delete(entityActionRef);

        // 2. Delete from Municipality if linked
        if (municipalityId) {
            const muniActionRef = doc(db, 'municipalities', municipalityId, 'actions', actionId);
            batch.delete(muniActionRef);
        }

        await batch.commit();
    } catch (error) {
        console.error("Error deleting action:", error);
        throw error;
    }
};

// --- PRODUCTION REGISTRATION ---

export const registerProduction = async (actionId: string, entityId: string, municipalityId: string | undefined, data: ActionProduction) => {
    try {
        const batch = writeBatch(db);
        const payload = { ...data, entityId, createdAt: new Date() };

        // 1. Add to Entity Subcollection
        // We generate a custom ID or let Firestore generate it. Let's start with a doc ref to get ID.
        const entityProdRef = doc(collection(db, 'entities', entityId, 'actions', actionId, 'production'));
        const prodId = entityProdRef.id;

        batch.set(entityProdRef, payload);

        // 2. Add to Municipality Subcollection if linked
        if (municipalityId) {
            const muniProdRef = doc(db, 'municipalities', municipalityId, 'actions', actionId, 'production', prodId);
            batch.set(muniProdRef, payload);
        }

        await batch.commit();
        return prodId;
    } catch (error) {
        console.error("Error registering production:", error);
        throw error;
    }
};

export const fetchActionProduction = async (entityId: string, actionId: string) => {
    try {
        const q = query(collection(db, 'entities', entityId, 'actions', actionId, 'production'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActionProduction));
    } catch (error) {
        console.error("Error fetching production:", error);
        throw error;
    }
};
