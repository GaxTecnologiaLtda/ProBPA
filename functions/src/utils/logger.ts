import * as admin from 'firebase-admin';

export enum LogLevel {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical'
}

export enum LogSource {
    ADMIN_PANEL = 'Admin Panel',
    ENTITY_PANEL = 'Entity Panel',
    PRODUCTION_PANEL = 'Production Panel',
    CLOUD_FUNCTIONS = 'Cloud Functions'
}

export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    source: LogSource;
    event: string;
    user: string;
    ip: string;
    userAgent?: string;
    details?: any;
}

export const logSystemEvent = async (
    level: LogLevel,
    event: string,
    details?: any,
    user: string = 'System / Trigger'
) => {
    try {
        const db = admin.firestore();
        const logRef = db.collection('system_logs').doc();

        const logData: LogEntry = {
            id: logRef.id,
            timestamp: new Date().toISOString(),
            level,
            source: LogSource.CLOUD_FUNCTIONS,
            event,
            user,
            ip: '127.0.0.1 (Firebase)',
            details: details || null
        };

        await logRef.set(logData);

        // Also log to the default Firebase console out so it remains visible there
        const consoleMsg = `[${level.toUpperCase()}] ${event}`;
        if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
            console.error(consoleMsg, details || '');
        } else if (level === LogLevel.WARNING) {
            console.warn(consoleMsg, details || '');
        } else {
            console.log(consoleMsg, details || '');
        }

    } catch (error) {
        console.error('Failed to write system log to Firestore:', error);
    }
};
