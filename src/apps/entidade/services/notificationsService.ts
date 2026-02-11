import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    doc,
    updateDoc,
    writeBatch,
    getDocs,
    Timestamp
} from "firebase/firestore";
import { db } from "../firebase";

export interface Notification {
    id?: string;
    type: 'NEW_PROFESSIONAL' | 'SYSTEM' | 'ALERT';
    title: string;
    message: string;
    read: boolean;
    data?: any; // Flexible payload (e.g., professionalId, municipalityId)
    createdAt?: Timestamp;
    entityId: string;
}

const getCollectionPath = (entityId: string) => `entities/${entityId}/notifications`;

export const addNotification = async (entityId: string, notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'entityId'>) => {
    try {
        await addDoc(collection(db, getCollectionPath(entityId)), {
            ...notification,
            entityId,
            read: false,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error adding notification:", error);
    }
};

export const subscribeToNotifications = (entityId: string, callback: (notifications: Notification[]) => void) => {
    const q = query(
        collection(db, getCollectionPath(entityId)),
        orderBy("createdAt", "desc"),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Notification));
        callback(notifications);
    });
};

export const markAsRead = async (entityId: string, notificationId: string) => {
    try {
        const ref = doc(db, getCollectionPath(entityId), notificationId);
        await updateDoc(ref, { read: true });
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
};

export const markAllAsRead = async (entityId: string) => {
    try {
        const q = query(
            collection(db, getCollectionPath(entityId)),
            where("read", "==", false)
        );
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });

        await batch.commit();
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
    }
};
