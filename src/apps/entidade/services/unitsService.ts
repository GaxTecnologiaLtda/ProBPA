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
    getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { Unit, UnitInput } from "../types";

const COLLECTION_NAME = "units";
const MUNICIPALITIES_COLLECTION = "municipalities";

export async function fetchUnitsByEntity(entityId: string): Promise<Unit[]> {
    const q = query(
        collection(db, COLLECTION_NAME),
        where("entityId", "==", entityId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
        (d: QueryDocumentSnapshot<DocumentData>) =>
            ({ id: d.id, ...d.data() } as Unit)
    );
}

export async function createUnit(data: UnitInput): Promise<string> {
    if (!data.entityId) {
        throw new Error("entityId é obrigatório para criar unidade.");
    }
    if (!data.municipalityId) {
        throw new Error("municipalityId é obrigatório para criar unidade.");
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), data);

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
    const unitRef = doc(db, COLLECTION_NAME, id);

    // Atualiza o documento da unidade
    await updateDoc(unitRef, data);

    // Se o município mudou, ajusta contadores
    if (
        data.municipalityId &&
        previousMunicipalityId &&
        data.municipalityId !== previousMunicipalityId
    ) {
        try {
            const oldRef = doc(db, MUNICIPALITIES_COLLECTION, previousMunicipalityId);
            const newRef = doc(db, MUNICIPALITIES_COLLECTION, data.municipalityId);

            await Promise.all([
                updateDoc(oldRef, { unitsCount: increment(-1) }),
                updateDoc(newRef, { unitsCount: increment(1) })
            ]);
        } catch (error) {
            console.warn("Não foi possível atualizar os contadores de unidades nos municípios:", error);
        }
    }

    // Log Action
    try {
        // @ts-ignore
        const { logAction } = await import('./logsService');
        // Retrieve entityId if not in data... assuming data is partial.
        // For accurate logging we might need to fetch the doc if entityId is missing, but let's skip for perf if missing.
        if (data.entityId) {
            await logAction({
                action: 'UPDATE',
                target: 'UNIT',
                description: `Atualizou a unidade ${data.name || 'ID ' + id}`,
                entityId: data.entityId,
                municipalityId: data.municipalityId || previousMunicipalityId
            });
        }
    } catch (e) { console.error(e); }
}

export async function deleteUnit(id: string, municipalityId: string): Promise<void> {
    const unitRef = doc(db, COLLECTION_NAME, id);
    // Get doc to know entityId and name before deleting
    let entityId = '';
    let name = '';
    try {
        const snap = await getDoc(unitRef);
        if (snap.exists()) {
            const d = snap.data();
            entityId = d.entityId;
            name = d.name;
        }
    } catch (e) { }

    await deleteDoc(unitRef);

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
