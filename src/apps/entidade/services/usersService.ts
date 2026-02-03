import { functions, db } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, onSnapshot, DocumentData } from 'firebase/firestore';

export interface UserData {
    id: string; // uid
    name: string;
    cpf: string;
    email: string;
    phone: string;
    role: string;
    organizationId: string;
    organizationName: string;
    status: 'active' | 'pending' | 'suspended';
    lastAccess?: any;
    entityId: string;
}

const manageEntityUser = httpsCallable(functions, 'manageEntityUser');
const resetEntityUserPasswordFn = httpsCallable(functions, 'resetEntityUserPassword');

export const subscribeToEntityUsers = (entityId: string, callback: (users: UserData[]) => void) => {
    if (!entityId) return () => { };

    const q = query(collection(db, 'users'), where('entityId', '==', entityId));

    return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Timestamps if needed, e.g. lastAccess
            } as UserData;
        });
        callback(users);
    });
};

export const createUser = async (userData: Partial<UserData>) => {
    const result = await manageEntityUser({ action: 'create', userData });
    return result.data as { success: boolean; uid: string; password?: string };
};

export const updateUser = async (uid: string, userData: Partial<UserData>) => {
    const result = await manageEntityUser({ action: 'update', userData: { uid, ...userData } });
    return result.data as { success: boolean };
};

export const deleteUser = async (uid: string) => {
    const result = await manageEntityUser({ action: 'delete', userData: { uid } });
    return result.data as { success: boolean };
};

export const toggleUserStatus = async (uid: string, status: 'active' | 'suspended') => {
    const result = await manageEntityUser({ action: 'toggleStatus', userData: { uid, status } });
    return result.data as { success: boolean };
};

export const resetUserPassword = async (uid: string) => {
    const result = await resetEntityUserPasswordFn({ uid });
    return result.data as { success: boolean; password?: string };
};
