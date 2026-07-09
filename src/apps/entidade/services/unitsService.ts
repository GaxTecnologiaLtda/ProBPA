import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    QueryDocumentSnapshot,
    DocumentData,
    increment,
    getDoc,
    collectionGroup,
    setDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { Unit, UnitInput } from "../types";

const COLLECTION_NAME = "units";
const MUNICIPALITIES_COLLECTION = "municipalities";

export async function fetchUnitsByEntity(entityId: string): Promise<Unit[]> {
    // Determina o tipo de entidade para montar o path
    const entityDoc = await getDoc(doc(db, "entities", entityId));
    if (!entityDoc.exists()) return [];

    const entityData = entityDoc.data();
    let type = "PUBLIC";
    if (entityData.type === "Privada" || entityData.type === "PRIVATE") type = "PRIVATE";

    // Busca os municípios vinculados à entidade
    const municipalitiesSnap = await getDocs(collection(db, "municipalities", type, entityId));

    const units: Unit[] = [];

    // Busca as unidades de cada município em paralelo
    const promises = municipalitiesSnap.docs.map(async (munDoc) => {
        const unitsSnap = await getDocs(collection(db, `municipalities/${type}/${entityId}/${munDoc.id}/units`));
        unitsSnap.forEach(d => {
            units.push({ id: d.id, ...d.data() } as Unit);
        });
    });

    await Promise.all(promises);
    return units;
}

export async function createUnit(data: UnitInput): Promise<string> {
    if (!data.entityId) throw new Error("entityId é obrigatório para criar unidade.");
    if (!data.municipalityId) throw new Error("municipalityId é obrigatório para criar unidade.");

    let resolvedType = data.entityType || 'PRIVATE';
    if (!data.entityType) {
        try {
            const eSnap = await getDoc(doc(db, 'entities', data.entityId));
            if (eSnap.exists()) {
                const t = eSnap.data().type;
                if (t === 'Pública' || t === 'PUBLIC') resolvedType = 'PUBLIC';
            }
        } catch (e) { }
    }

    const newPath = `municipalities/${resolvedType.toUpperCase()}/${data.entityId}/${data.municipalityId}/units`;
    const docRef = await addDoc(collection(db, newPath), data);

    // Atualiza contador de unidades no município
    try {
        const municipalityRef = doc(db, MUNICIPALITIES_COLLECTION, data.municipalityId);
        await updateDoc(municipalityRef, {
            unitsCount: increment(1)
        });
    } catch (error) {
        console.warn("Não foi possível atualizar o contador de unidades no município (provavelmente sem permissão):", error);
    }

    // Log Action
    try {
        // @ts-ignore
        const { logAction } = await import('./logsService');
        await logAction({
            action: 'CREATE',
            target: 'UNIT',
            description: `Criou a unidade ${data.name}`,
            entityId: data.entityId,
            municipalityId: data.municipalityId
        });
    } catch (e) { console.error(e); }

    return docRef.id;
}

export async function updateUnit(
    id: string,
    data: Partial<UnitInput>,
    previousMunicipalityId?: string
): Promise<void> {
    const { entityId, municipalityId, entityType } = data;
    if (!entityId || (!municipalityId && !previousMunicipalityId)) {
        throw new Error("Missing required fields for nested update.");
    }

    let resolvedType = entityType || 'PRIVATE';
    if (!entityType) {
        try {
            const eSnap = await getDoc(doc(db, 'entities', entityId));
            if (eSnap.exists()) {
                const t = eSnap.data().type;
                if (t === 'Pública' || t === 'PUBLIC') resolvedType = 'PUBLIC';
            }
        } catch (e) { }
    }

    const currentMunId = municipalityId || previousMunicipalityId;
    const newPath = `municipalities/${resolvedType.toUpperCase()}/${entityId}/${currentMunId}/units/${id}`;

    if (municipalityId && previousMunicipalityId && municipalityId !== previousMunicipalityId) {
        // Move document
        const oldPath = `municipalities/${resolvedType.toUpperCase()}/${entityId}/${previousMunicipalityId}/units/${id}`;
        await setDoc(doc(db, newPath), data, { merge: true });
        try {
            await deleteDoc(doc(db, oldPath));
        } catch (e) { }

        try {
            const oldRef = doc(db, MUNICIPALITIES_COLLECTION, previousMunicipalityId);
            const newRef = doc(db, MUNICIPALITIES_COLLECTION, municipalityId);
            await Promise.all([
                updateDoc(oldRef, { unitsCount: increment(-1) }),
                updateDoc(newRef, { unitsCount: increment(1) })
            ]);
        } catch (error) {
            console.warn("Não foi possível atualizar os contadores de unidades nos municípios:", error);
        }
    } else {
        // Just update
        await updateDoc(doc(db, newPath), data);
    }

    // Log Action
    try {
        // @ts-ignore
        const { logAction } = await import('./logsService');
        if (data.entityId) {
            await logAction({
                action: 'UPDATE',
                target: 'UNIT',
                description: `Atualizou a unidade ${data.name || 'ID ' + id}`,
                entityId: data.entityId,
                municipalityId: currentMunId
            });
        }
    } catch (e) { console.error(e); }
}

export async function deleteUnit(unit: Unit): Promise<void> {
    const { id, entityId, municipalityId, entityType, name } = unit;

    let resolvedType = entityType || 'PRIVATE';
    if (!entityType && entityId) {
        try {
            const eSnap = await getDoc(doc(db, 'entities', entityId));
            if (eSnap.exists()) {
                const t = eSnap.data().type;
                if (t === 'Pública' || t === 'PUBLIC') resolvedType = 'PUBLIC';
            }
        } catch (e) { }
    }

    const path = `municipalities/${resolvedType.toUpperCase()}/${entityId}/${municipalityId}/units/${id}`;
    await deleteDoc(doc(db, path));

    if (municipalityId) {
        try {
            const municipalityRef = doc(db, MUNICIPALITIES_COLLECTION, municipalityId);
            await updateDoc(municipalityRef, {
                unitsCount: increment(-1)
            });
        } catch (error) {
            console.warn("Não foi possível atualizar o contador de unidades no município:", error);
        }
    }

    // Log Action
    if (entityId) {
        try {
            // @ts-ignore
            const { logAction } = await import('./logsService');
            await logAction({
                action: 'DELETE',
                target: 'UNIT',
                description: `Excluiu a unidade ${name || 'ID ' + id}`,
                entityId: entityId,
                municipalityId: municipalityId
            });
        } catch (e) { console.error(e); }
    }
}
