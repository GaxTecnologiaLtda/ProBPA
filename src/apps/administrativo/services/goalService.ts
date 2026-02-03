import {
    collectionGroup,
    getDocs,
    query,
    where,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { Goal } from '../types';

const COLLECTION_GROUP_NAME = 'goals';

export const goalService = {
    /**
     * Fetch all goals for a specific entity
     */
    // Buscar todas as metas de uma entidade (Admin View)
    fetchAllGoalsByEntity: async (entityId: string): Promise<Goal[]> => {
        try {
            const q = query(
                collectionGroup(db, COLLECTION_GROUP_NAME),
                where('entityId', '==', entityId),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
        } catch (error) {
            console.error('Error fetching goals:', error);
            return [];
        }
    },

    /**
     * Fetch goals for a specific municipality within an entity (Public Entity view)
     */
    // Buscar metas por município (Admin View - Public Entities)
    fetchGoalsByMunicipality: async (entityId: string, municipalityId: string): Promise<Goal[]> => {
        try {
            const q = query(
                collectionGroup(db, COLLECTION_GROUP_NAME),
                where('entityId', '==', entityId),
                where('municipalityId', '==', municipalityId),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
        } catch (error) {
            console.error('Error fetching goals by municipality:', error);
            return [];
        }
    },

    /**
     * Update an existing goal
     * NOTE: This assumes we can find the doc by ID, which is tricky with Collection Group Queries if we don't know the path.
     * Admin updates might need to be restricted or require full path knowledge.
     * For now, we are NOT implementing deep update for Admin to avoid complexity, 
     * as Admin usually just views. If update is needed, we need to find the doc first.
     */
    updateGoal: async (goalId: string, payload: Partial<Goal>, user: any): Promise<void> => {
        try {
            // We need to find the document first to get its reference
            const q = query(
                collectionGroup(db, COLLECTION_GROUP_NAME),
                // We can't easily filter by ID in CGQ without __name__ and full path.
                // But we can try to find it if we have entityId context, which we usually do in Admin.
                // However, the signature here only has goalId.
                // This is a limitation.
            );

            // For now, let's log a warning that Admin Update is not fully supported for nested goals yet.
            console.warn("Admin update of nested goals is not fully supported without path context.");
            throw new Error("Update not supported for nested goals in Admin view yet.");

        } catch (error) {
            console.error('Error updating goal:', error);
            throw error;
        }
    }
};
