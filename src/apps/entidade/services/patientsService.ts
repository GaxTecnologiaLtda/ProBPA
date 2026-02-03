import { db } from "../firebase";
import { collection, query, where, getDocs, limit, orderBy, collectionGroup } from "firebase/firestore";

export interface Patient {
    id: string;
    name: string;
    cns: string;
    cpf?: string;
    dob?: string;
    sex?: string;
}

export interface PatientHistoryItem {
    id: string;
    date: string;
    procedureCode: string;
    procedureName: string;
    professionalName: string;
    unitName?: string;
    cbo: string;
}

export const patientsService = {
    /**
     * Search patients by Name, CNS or CPF
     */
    searchPatients: async (term: string): Promise<Patient[]> => {
        const patientsRef = collection(db, 'patients');
        const results: Patient[] = [];
        const cleanTerm = term.replace(/\D/g, ''); // Numbers only for CNS/CPF

        try {
            // Strategy: Try CNS/CPF first if numeric, else Name
            if (cleanTerm.length >= 3) {
                // Try CNS
                const qCns = query(patientsRef, where('cns', '>=', cleanTerm), where('cns', '<=', cleanTerm + '\uf8ff'), limit(5));
                const snapCns = await getDocs(qCns);
                snapCns.forEach(doc => results.push({ id: doc.id, ...doc.data() } as Patient));

                // Try CPF
                if (results.length < 5) {
                    const qCpf = query(patientsRef, where('cpf', '>=', cleanTerm), where('cpf', '<=', cleanTerm + '\uf8ff'), limit(5));
                    const snapCpf = await getDocs(qCpf);
                    snapCpf.forEach(doc => {
                        if (!results.find(r => r.id === doc.id)) {
                            results.push({ id: doc.id, ...doc.data() } as Patient);
                        }
                    });
                }
            }

            // If text search (Name)
            if (results.length < 5 && term.length >= 3) {
                // Note: Firestore doesn't support substring search well natively. 
                // We heavily rely on exact prefix or need a third-party search.
                // For MVP, case-sensitive prefix search on 'name' or 'patientName'
                const qName = query(patientsRef, where('name', '>=', term.toUpperCase()), where('name', '<=', term.toUpperCase() + '\uf8ff'), limit(5));
                const snapName = await getDocs(qName);
                snapName.forEach(doc => {
                    if (!results.find(r => r.id === doc.id)) {
                        results.push({ id: doc.id, ...doc.data() } as Patient);
                    }
                });
            }

            return results;
        } catch (error) {
            console.error("Error searching patients:", error);
            return [];
        }
    },

    /**
     * Get patient attendance history
     */
    getPatientHistory: async (patientId: string): Promise<PatientHistoryItem[]> => {
        try {
            const q = query(
                collectionGroup(db, 'procedures'),
                where('patientId', '==', patientId),
                orderBy('attendanceDate', 'desc'),
                limit(50)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    date: data.attendanceDate,
                    procedureCode: data.procedureCode,
                    procedureName: data.procedureName,
                    professionalName: data.professionalName,
                    unitName: data.unitName || 'Unidade Desconhecida',
                    cbo: data.cbo
                };
            });
        } catch (error) {
            console.error("Error fetching patient history:", error);
            // Fallback: sometimes index is missing for orderBy. Try without orderBy if it fails?
            // Or just return empty and log.
            return [];
        }
    }
};
