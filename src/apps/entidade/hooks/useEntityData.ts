import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface EntityData {
    name: string;
    type: string;
    address?: string;
    cep?: string;
    cnpj?: string;
    createdAt?: string;
    email?: string;
    entityKind?: string;
    healthUnits?: number;
    location?: string;
    managerRole?: string;
    phone?: string;
    responsible?: string;
    status?: string;
}

export function useEntityData(entityId: string | undefined) {
    const [entity, setEntity] = useState<EntityData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchEntity() {
            if (!entityId) {
                setLoading(false);
                return;
            }

            try {
                const docRef = doc(db, 'entities', entityId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setEntity(docSnap.data() as EntityData);
                } else {
                    setError('Entidade não encontrada.');
                }
            } catch (err: any) {
                console.error("Error fetching entity:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchEntity();
    }, [entityId]);

    return { entity, loading, error };
}
