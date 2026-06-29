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
    role?: string;
}

export interface LogEntry {
    id?: string;
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'SEND' | 'RECEIVE' | 'LOGIN' | 'LOGOUT' | 'CONFIG' | 'SUPPORT' | 'BLOCK';
    target: 'PROFESSIONAL' | 'UNIT' | 'MUNICIPALITY' | 'GOAL' | 'SYSTEM' | 'USER' | 'DOCUMENT' | 'ACTION_PROGRAM';
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

        const data = {
            ...entry,
            user,
            timestamp: serverTimestamp()
        };

        if (entry.target === 'ACTION_PROGRAM') {
            const logActionsRef = collection(db, 'entities', entry.entityId, 'logActions');
            await addDoc(logActionsRef, data);
        } else {
            const path = await getLogsCollectionPath(entry.entityId, entry.municipalityId);
            await addDoc(collection(db, path), data);
        }
    } catch (error) {
        console.error("Failed to log action:", error);
    }
};

export const fetchLogs = async (entityId: string, municipalityId?: string, limitCount = 100, targetDate?: string): Promise<LogEntry[]> => {
    try {
        let q;
        let queryConstraints: any[] = [];
        
        if (targetDate) {
            const [y, m, d] = targetDate.split('-').map(Number);
            const start = new Date(y, m - 1, d, 0, 0, 0, 0);
            const end = new Date(y, m - 1, d, 23, 59, 59, 999);
            
            queryConstraints.push(where("timestamp", ">=", Timestamp.fromDate(start)));
            queryConstraints.push(where("timestamp", "<=", Timestamp.fromDate(end)));
        }

        queryConstraints.push(orderBy("timestamp", "desc"));
        queryConstraints.push(limit(limitCount));

        let logsQuery1;
        if (municipalityId && municipalityId !== 'all') {
            const path = await getLogsCollectionPath(entityId, municipalityId);
            logsQuery1 = query(
                collection(db, path),
                ...queryConstraints
            );
        } else {
            // Lazy import to avoid top breaking if not needed
            const { collectionGroup } = await import("firebase/firestore");

            logsQuery1 = query(
                collectionGroup(db, 'logs'),
                where("entityId", "==", entityId),
                ...queryConstraints
            );
        }

        // New Query for logActions
        let logActionsQueryConstraints = [...queryConstraints];
        if (municipalityId && municipalityId !== 'all') {
            logActionsQueryConstraints.unshift(where("municipalityId", "==", municipalityId));
        }

        const logActionsRef = collection(db, 'entities', entityId, 'logActions');
        const logsQuery2 = query(logActionsRef, ...logActionsQueryConstraints);

        const [snapshot1, snapshot2] = await Promise.all([getDocs(logsQuery1), getDocs(logsQuery2)]);
        
        let allLogs = [
            ...snapshot1.docs.map(d => ({ id: d.id, ...(d.data() as any) } as LogEntry)),
            ...snapshot2.docs.map(d => ({ id: d.id, ...(d.data() as any) } as LogEntry))
        ];

        // Sort by timestamp desc locally
        allLogs.sort((a, b) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
        });

        // Slice to the requested limit
        return allLogs.slice(0, limitCount);

    } catch (error) {
        console.error("Error fetching logs:", error);
        return [];
    }
};
