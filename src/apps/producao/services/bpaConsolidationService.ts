import { db } from '../firebase';
import {
    collection,
    doc,
    getDocs,
    query,
    where,
    writeBatch,
    serverTimestamp,
    collectionGroup,
    Timestamp,
    orderBy
} from 'firebase/firestore';

export interface BpaConsolidatedRecord {
    id?: string;
    procedureCode: string;
    procedureName: string;
    cbo: string;
    age: number;
    quantity: number;
    competenceMonth: string;
    generatedAt?: any;
}

// Helper to calculate age from DOB and Attendance Date
const calculateAge = (dob: string, attendanceDate: string): number => {
    const birthDate = new Date(dob);
    const attendDate = new Date(attendanceDate);

    let age = attendDate.getFullYear() - birthDate.getFullYear();
    const m = attendDate.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && attendDate.getDate() < birthDate.getDate())) {
        age--;
    }

    return age < 0 ? 0 : age;
};

export const loadBpaIRecords = async (competenceMonth: string, user: any): Promise<any[]> => {
    try {
        // We need to query all procedures for a specific competence.
        // Since the structure is: bpa_records/BPA-I/competencias/{competence}/registros/{day}/pacientes/{patient}/procedures/{proc}
        // And we want ALL procedures for that competence, we can use a collectionGroup query 
        // BUT collectionGroup queries are global. We need to filter by competence.
        // However, the 'procedures' documents might not have 'competenceMonth' directly on them if it was only on the parent.
        // Let's check bpaService.ts... 
        // In saveMultipleBpaRecords, we do: ...sanitizedBase, ...sanitizedProc.
        // sanitizedBase includes competenceMonth. So yes, each procedure doc has competenceMonth.

        const constraints: any[] = [
            where('competenceMonth', '==', competenceMonth)
        ];

        // Apply Security Filters based on User Role
        if (user.role === 'MASTER') {
            constraints.push(where('entityId', '==', user.entityId));
        } else if (user.role === 'PROFESSIONAL') {
            constraints.push(where('professionalId', '==', user.professionalId || user.id));
        }
        // Admin sees all (no extra filter needed, assuming Admin has bypass rules or we rely on competence)

        const proceduresQuery = query(
            collectionGroup(db, 'procedures'),
            ...constraints
        );

        const snapshot = await getDocs(proceduresQuery);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error loading BPA-I records:", error);
        throw error;
    }
};

export const clearPreviousConsolidated = async (competenceMonth: string) => {
    try {
        const consolidatedRef = collection(
            db,
            'bpa_records',
            'BPA-C',
            'competencias',
            competenceMonth,
            'consolidados'
        );

        const snapshot = await getDocs(consolidatedRef);

        if (snapshot.empty) return;

        // Batch delete (max 500 per batch)
        const batch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            count++;
        });

        await batch.commit();
        console.log(`Deleted ${count} previous consolidated records.`);
    } catch (error) {
        console.error("Error clearing previous consolidated records:", error);
        throw error;
    }
};

export const generateConsolidated = async (records: any[], competenceMonth: string) => {
    try {
        // 1. Group and Sum
        const groups: Record<string, BpaConsolidatedRecord> = {};

        records.forEach(record => {
            const age = calculateAge(record.patientDob, record.attendanceDate);
            const key = `${record.procedureCode}-${record.cbo}-${age}`;

            if (!groups[key]) {
                groups[key] = {
                    procedureCode: record.procedureCode,
                    procedureName: record.procedureName,
                    cbo: record.cbo,
                    age: age,
                    quantity: 0,
                    competenceMonth: competenceMonth
                };
            }

            groups[key].quantity += Number(record.quantity);
        });

        // 2. Save to Firestore
        const batch = writeBatch(db);
        const consolidatedRef = collection(
            db,
            'bpa_records',
            'BPA-C',
            'competencias',
            competenceMonth,
            'consolidados'
        );

        Object.values(groups).forEach(group => {
            const newDoc = doc(consolidatedRef);
            batch.set(newDoc, {
                ...group,
                generatedAt: serverTimestamp()
            });
        });

        await batch.commit();
        return Object.values(groups);

    } catch (error) {
        console.error("Error generating consolidated records:", error);
        throw error;
    }
};

export const getConsolidated = async (competenceMonth: string): Promise<BpaConsolidatedRecord[]> => {
    try {
        const consolidatedRef = collection(
            db,
            'bpa_records',
            'BPA-C',
            'competencias',
            competenceMonth,
            'consolidados'
        );

        // Order by procedure code for better display
        const q = query(consolidatedRef, orderBy('procedureCode', 'asc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as BpaConsolidatedRecord));
    } catch (error) {
        console.error("Error fetching consolidated records:", error);
        return [];
    }
};
