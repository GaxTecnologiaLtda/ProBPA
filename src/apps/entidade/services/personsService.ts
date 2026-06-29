import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Person {
    id?: string;
    entityId: string;
    municipalityId: string;
    actionId: string;
    source: 'actionsEntity' | string;
    name: string;
    cpf?: string;
    cns?: string;
    birthDate?: string; // YYYY-MM-DD
    createdAt?: any;
    updatedAt?: any;
}

/**
 * Creates a new Person record under /entities/{entityId}/persons
 */
export const createPerson = async (entityId: string, personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
        const personsRef = collection(db, 'entities', entityId, 'persons');
        const docRef = await addDoc(personsRef, {
            ...personData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error creating person:", error);
        throw error;
    }
};

/**
 * Searches for persons within the entity by a search term (matches Name, CPF, or CNS).
 * Firestore doesn't support full-text search easily, but we can search exactly by CPF/CNS
 * or apply a basic prefix search. A robust search might pull a limited list and filter client-side,
 * or use a sequence of queries since the dataset might not be huge.
 */
export const searchPersons = async (entityId: string, searchTerm: string, municipalityId?: string): Promise<Person[]> => {
    try {
        if (!searchTerm) return [];

        const term = searchTerm.trim().toLowerCase();
        // Remove non-numeric characters for CPF/CNS comparison
        const cleanNumber = term.replace(/\D/g, '');
        const isNumericSearch = cleanNumber.length > 0 && /^[0-9.-]+$/.test(term);

        const personsRef = collection(db, 'entities', entityId, 'persons');

        // Fetch up to 5000 records to filter client-side since Firestore lacks full-text search
        const q = query(
            personsRef,
            orderBy('name'),
            limit(5000)
        );

        const snapshot = await getDocs(q);
        const results: Person[] = [];
        const uniqueKeys = new Set<string>();

        snapshot.forEach(doc => {
            const data = doc.data() as Person;
            if (municipalityId && data.municipalityId !== municipalityId) return;
            
            data.id = doc.id;

            const nameMatch = data.name.toLowerCase().includes(term);
            const cpfMatch = (cleanNumber.length > 0 && data.cpf) ? data.cpf.replace(/\D/g, '').includes(cleanNumber) : false;
            const cnsMatch = (cleanNumber.length > 0 && data.cns) ? data.cns.replace(/\D/g, '').includes(cleanNumber) : false;

            let isMatch = false;
            if (isNumericSearch) {
                // If the user typed numbers, prioritize CPF/CNS matching
                if (cpfMatch || cnsMatch || nameMatch) {
                    isMatch = true;
                }
            } else {
                // If it's pure text, match by name (or fallback if it was a weird mix)
                if (nameMatch || cpfMatch || cnsMatch) {
                    isMatch = true;
                }
            }

            if (isMatch) {
                const cleanCpf = data.cpf ? data.cpf.replace(/\D/g, '') : '';
                const cleanCns = data.cns ? data.cns.replace(/\D/g, '') : '';
                const nameDobKey = `${data.name.trim().toLowerCase()}_${data.birthDate || ''}`;

                let isDuplicate = false;
                if (cleanCpf && uniqueKeys.has(`cpf:${cleanCpf}`)) isDuplicate = true;
                else if (cleanCns && uniqueKeys.has(`cns:${cleanCns}`)) isDuplicate = true;
                else if (uniqueKeys.has(`name:${nameDobKey}`)) isDuplicate = true;

                if (!isDuplicate) {
                    if (cleanCpf) uniqueKeys.add(`cpf:${cleanCpf}`);
                    if (cleanCns) uniqueKeys.add(`cns:${cleanCns}`);
                    uniqueKeys.add(`name:${nameDobKey}`);
                    
                    results.push(data);
                }
            }
        });

        return results;
    } catch (error) {
        console.error("Error searching persons:", error);
        throw error;
    }
};
