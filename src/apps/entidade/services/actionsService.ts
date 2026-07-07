import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    getDoc,
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
    cpf?: string;
    conselho?: string;
    occupation: string;
    occupations?: string[];
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
    professionalId: string;
    occupation?: string;
    patientId: string;
    patient: ProductionPatient;
    procedures: { code: string; name: string }[];
    competence: string; // YYYYMM
    attendanceDate?: string; // YYYY-MM-DD
    createdAt?: any;
    updatedAt?: any;
    isDeleted?: boolean;
}

// Helper to get collection ref based on context
const getEntityActionsRef = (entityId: string, competence: string) =>
    collection(db, 'entities', entityId, 'actions', competence, 'actions');

// --- ACTIONS MANAGEMENT ---

export const fetchActionsByEntity = async (entityId: string, competence: string) => {
    try {
        const q = query(getEntityActionsRef(entityId, competence), orderBy('date', 'desc'));
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

        // Derive competence from date (YYYY-MM-DD -> YYYY-MM)
        const competence = data.date.substring(0, 7);

        // 1. Create wrapper ref in Entity collection to get an ID
        const entityActionRef = doc(getEntityActionsRef(data.entityId, competence));
        const actionId = entityActionRef.id;

        const payload = { ...data, createdAt: new Date() };

        // 2. Set data in Entity Collection
        batch.set(entityActionRef, payload);

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
        const originalCompetence = originalAction.date.substring(0, 7);

        // 1. Update Entity Collection
        const entityActionRef = doc(db, 'entities', originalAction.entityId, 'actions', originalCompetence, 'actions', actionId);
        batch.update(entityActionRef, data);

        // 2. Se a data mudou, atualizar a data de todas as produções desta ação
        if (data.date && data.date !== originalAction.date) {
            const newCompetence = data.date.substring(0, 7).replace('-', '');
            const productionsQuery = query(collection(db, `entities/${originalAction.entityId}/actions/${originalCompetence}/actions/${actionId}/production`));
            const productionsSnapshot = await getDocs(productionsQuery);
            
            productionsSnapshot.forEach((prodDoc) => {
                batch.update(prodDoc.ref, { 
                    attendanceDate: data.date,
                    competence: newCompetence
                });
            });
        }

        await batch.commit();
    } catch (error) {
        console.error("Error updating action:", error);
        throw error;
    }
};

export const deleteAction = async (actionId: string, entityId: string, date: string, municipalityId?: string) => {
    try {
        const batch = writeBatch(db);
        const competence = date.substring(0, 7);

        // 1. Delete from Entity
        const entityActionRef = doc(db, 'entities', entityId, 'actions', competence, 'actions', actionId);
        batch.delete(entityActionRef);

        await batch.commit();
    } catch (error) {
        console.error("Error deleting action:", error);
        throw error;
    }
};

// --- PRODUCTION REGISTRATION ---

export const registerProduction = async (actionId: string, entityId: string, competence: string, municipalityId: string | undefined, data: ActionProduction) => {
    try {
        const batch = writeBatch(db);
        const actionRefPath = `entities/${entityId}/actions/${competence}/actions/${actionId}/production`;

        if (!data.patientId) {
            throw new Error("patientId is required to register production");
        }

        const entityProdRef = doc(db, actionRefPath, data.patientId);

        // Ensure createdAt is set for the orderBy query to work
        const existingDoc = await getDoc(entityProdRef);
        let finalProcedures = [...data.procedures];

        if (existingDoc.exists()) {
            const existingData = existingDoc.data() as ActionProduction;
            if (existingData.isDeleted) {
                // If it was deleted, DO NOT merge. Start fresh with the new procedures only!
                finalProcedures = [...data.procedures];
            } else if (existingData.procedures && Array.isArray(existingData.procedures)) {
                // Merge old and new procedures
                finalProcedures = [...existingData.procedures, ...data.procedures];
            }
        }

        const payload = {
            ...data,
            procedures: finalProcedures, // Save the merged or fresh procedures
            entityId,
            competence,
            isDeleted: false, // Ensure it is explicitly NOT deleted!
            updatedAt: new Date(),
            createdAt: existingDoc.exists() && existingDoc.data()?.createdAt ? existingDoc.data().createdAt : new Date()
        };

        batch.set(entityProdRef, payload, { merge: true });

        await batch.commit();
        return data.patientId;
    } catch (error) {
        console.error("Error registering production:", error);
        throw error;
    }
};

export const updateActionProduction = async (entityId: string, actionId: string, competence: string, patientId: string, data: Partial<ActionProduction>) => {
    try {
        const docRef = doc(db, `entities/${entityId}/actions/${competence}/actions/${actionId}/production`, patientId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: new Date(),
            isDeleted: false
        });
    } catch (error) {
        console.error("Error updating production:", error);
        throw error;
    }
};

export const fetchActionProduction = async (entityId: string, actionId: string, competence: string) => {
    try {
        // We remove orderBy from the query to ensure we get ALL documents, 
        // even those that might have been accidentally saved without a 'createdAt' field.
        const q = query(collection(db, `entities/${entityId}/actions/${competence}/actions/${actionId}/production`));
        const snapshot = await getDocs(q);

        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActionProduction));

        // Sort in memory (newest first)
        results.sort((a, b) => {
            const timeA = a.createdAt?.seconds ? a.createdAt.seconds : (a.createdAt?.toMillis ? a.createdAt.toMillis() / 1000 : 0);
            const timeB = b.createdAt?.seconds ? b.createdAt.seconds : (b.createdAt?.toMillis ? b.createdAt.toMillis() / 1000 : 0);
            return timeB - timeA;
        });

        return results;
    } catch (error) {
        console.error("Error fetching production:", error);
        throw error;
    }
};

export const deleteActionProduction = async (entityId: string, actionId: string, competence: string, patientId: string) => {
    try {
        const docRef = doc(db, `entities/${entityId}/actions/${competence}/actions/${actionId}/production`, patientId);
        await updateDoc(docRef, {
            isDeleted: true,
            updatedAt: new Date()
        });
    } catch (error) {
        console.error("Error soft-deleting production:", error);
        throw error;
    }
};
