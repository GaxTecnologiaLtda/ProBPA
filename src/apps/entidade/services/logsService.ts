import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    getDocs,
    limit,
    Timestamp,
    doc,
    getDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";

export interface LogUser {
    uid: string;
    email: string;
    name: string;
}

export interface LogEntry {
    id?: string;
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'SEND' | 'RECEIVE' | 'LOGIN' | 'LOGOUT' | 'CONFIG' | 'SUPPORT';
    target: 'PROFESSIONAL' | 'UNIT' | 'MUNICIPALITY' | 'GOAL' | 'SYSTEM' | 'USER' | 'DOCUMENT';
    description: string;
    user: LogUser;
    municipalityId?: string; // Optional, some actions are global
    entityId: string;
    timestamp?: Timestamp;
    metadata?: any;
}

// Helper to determine path based on entity type (cached or best-effort)
const getLogsCollectionPath = async (entityId: string, municipalityId: string | undefined): Promise<string> => {
    let type = 'PUBLIC';

    try {
        const entDoc = await getDoc(doc(db, 'entities', entityId));
        if (entDoc.exists()) {
            const data = entDoc.data();
            if (data.type?.toUpperCase().includes('PRIV')) type = 'PRIVATE';
        }
    } catch (e) {
        console.warn("Could not fetch entity type for logging", e);
    }

    if (municipalityId) {
        return `municipalities/${type}/${entityId}/${municipalityId}/logs`;
    } else {
        return `municipalities/${type}/${entityId}/global/logs`;
    }
};

export const logAction = async (entry: Omit<LogEntry, 'timestamp' | 'user'> & { user?: LogUser }) => {
    try {
        let user = entry.user;
        if (!user && auth.currentUser) {
            user = {
                uid: auth.currentUser.uid,
                email: auth.currentUser.email || '',
                name: auth.currentUser.displayName || auth.currentUser.email || ''
            };
        }

        if (!user) {
            // console.warn("Log action attempted without user context");
            return;
        }

        const path = await getLogsCollectionPath(entry.entityId, entry.municipalityId);

        const data = {
            ...entry,
            user,
            timestamp: serverTimestamp()
        };

        await addDoc(collection(db, path), data);
    } catch (error) {
        console.error("Failed to log action:", error);
    }
};

export const fetchLogs = async (entityId: string, municipalityId?: string, limitCount = 100): Promise<LogEntry[]> => {
    try {
        let q;

        if (municipalityId && municipalityId !== 'all') {
            const path = await getLogsCollectionPath(entityId, municipalityId);
            q = query(
                collection(db, path),
                orderBy("timestamp", "desc"),
                limit(limitCount)
            );
        } else {
            // Lazy import to avoid top breaking if not needed
            const { collectionGroup } = await import("firebase/firestore");

            const logsQuery = query(
                collectionGroup(db, 'logs'),
                where("entityId", "==", entityId),
                orderBy("timestamp", "desc"),
                limit(limitCount)
            );

            const snapshot = await getDocs(logsQuery);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LogEntry));
        }

    } catch (error) {
        console.error("Error fetching logs:", error);
        return [];
    }
};
