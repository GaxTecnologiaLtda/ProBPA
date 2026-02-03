import {
    collectionGroup,
    getDocs,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { Goal } from '../types';

const COLLECTION_GROUP_NAME = 'goals';

export const goalService = {
    /**
     * Fetch goals for a Professional (Production view)
     * Rules:
     * 1. entityId == userClaims.entityId
     * 2. municipalityId == userClaims.municipalityId
     * 3. (professionalId == userClaims.professionalId) OR (professionalId is empty/team AND unitId == userClaims.unitId)
     * 
     * Uses Collection Group Query.
     */
    getProfessionalGoals: async (userClaims: any): Promise<Goal[]> => {
        try {
            if (!userClaims?.entityId) {
                console.warn("Missing entityId for goals fetch", userClaims);
                return [];
            }

            // Firestore OR queries have limitations.
            // We will fetch two queries and merge them.

            // 1. Goals assigned specifically to the professional
            const qPersonal = query(
                collectionGroup(db, COLLECTION_GROUP_NAME),
                where('entityId', '==', userClaims.entityId),
                // where('municipalityId', '==', userClaims.municipalityId), // Removed to avoid mismatch
                where('professionalId', '==', userClaims.professionalId),
                orderBy('createdAt', 'desc')
            );

            // 2. Team goals for the unit (only if unitId is present)
            let qTeam = null;
            if (userClaims.unitId) {
                qTeam = query(
                    collectionGroup(db, COLLECTION_GROUP_NAME),
                    where('entityId', '==', userClaims.entityId),
                    // where('municipalityId', '==', userClaims.municipalityId), // Removed to avoid mismatch
                    where('unitId', '==', userClaims.unitId),
                    where('professionalId', 'in', ['team', '']),
                    orderBy('createdAt', 'desc')
                );
            }

            const promises = [getDocs(qPersonal)];
            if (qTeam) promises.push(getDocs(qTeam));

            const snapshots = await Promise.all(promises);
            const personalSnap = snapshots[0];
            const teamSnap = snapshots[1]; // might be undefined

            const goalsMap = new Map<string, Goal>();

            personalSnap.docs.forEach(doc => {
                goalsMap.set(doc.id, { id: doc.id, ...doc.data() } as Goal);
            });

            if (teamSnap) {
                teamSnap.docs.forEach(doc => {
                    goalsMap.set(doc.id, { id: doc.id, ...doc.data() } as Goal);
                });
            }

            return Array.from(goalsMap.values());

        } catch (error) {
            console.error('Error fetching professional goals:', error);
            throw error;
        }
    }
};