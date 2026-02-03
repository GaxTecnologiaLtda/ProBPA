import {
    collection,
    getDocs,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { Municipality, MunicipalityInput, LicenseStatus } from "../types";

const getMunicipalityCollection = (entityType: string, entityId: string) => {
    return collection(db, "municipalities", entityType, entityId);
};

export async function fetchAllMunicipalities(): Promise<Municipality[]> {
    return [];
}

export async function fetchMunicipalitiesByEntity(entityId: string, municipalityId?: string): Promise<Municipality[]> {
    const entityDoc = await getDoc(doc(db, "entities", entityId));
    if (!entityDoc.exists()) return [];

    const entityData = entityDoc.data();
    let type = "PUBLIC";
    if (entityData.type === "Privada" || entityData.type === "PRIVATE") type = "PRIVATE";

    const colRef = getMunicipalityCollection(type, entityId);

    // If municipalityId is provided (e.g. for SUBSEDE scope), fetch only that specific doc
    if (municipalityId) {
        const docRef = doc(colRef, municipalityId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return [{ id: docSnap.id, ...docSnap.data() } as Municipality];
        } else {
            return [];
        }
    }

    const querySnapshot = await getDocs(colRef);
    const collectionName = type === "PUBLIC" ? "public_entities" : "private_entities";

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any),
        entityType: collectionName // Inject for service usage
    } as Municipality));
}

export async function createMunicipality(data: MunicipalityInput): Promise<string> {
    if (!data.linkedEntityId) throw new Error("Linked Entity ID is required");

    let type = "PUBLIC";
    const entityDoc = await getDoc(doc(db, "entities", data.linkedEntityId));
    if (entityDoc.exists()) {
        const entData = entityDoc.data();
        if (!data.linkedEntityName) data.linkedEntityName = entData.name;
        if (entData.type === "Privada" || entData.type === "PRIVATE") type = "PRIVATE";
    }

    if (data.active && data.status !== LicenseStatus.ACTIVE) {
        data.status = LicenseStatus.ACTIVE;
    } else if (!data.active && data.status === LicenseStatus.ACTIVE) {
        data.status = LicenseStatus.SUSPENDED;
    }

    const colRef = getMunicipalityCollection(type, data.linkedEntityId);
    const docRef = await addDoc(colRef, data);

    // Log Action
    try {
        // @ts-ignore
        const { logAction } = await import('./logsService');
        await logAction({
            action: 'CREATE',
            target: 'MUNICIPALITY',
            description: `Criou o município ${data.name}`,
            entityId: data.linkedEntityId,
            municipalityId: docRef.id
        });
    } catch (e) { console.error(e); }

    return docRef.id;
}

export async function updateMunicipality(
    id: string,
    data: Partial<MunicipalityInput>,
    context?: { linkedEntityId: string, entityType?: string }
): Promise<void> {
    if (data.active !== undefined) {
        if (data.active) {
            data.status = LicenseStatus.ACTIVE;
        } else {
            data.status = LicenseStatus.SUSPENDED;
        }
    } else if (data.status !== undefined) {
        data.active = data.status === LicenseStatus.ACTIVE;
    }

    let entityId = context?.linkedEntityId || data.linkedEntityId;
    let type = context?.entityType;

    if (!entityId) {
        throw new Error("Cannot update municipality without linkedEntityId context");
    }

    if (!type) {
        const entDoc = await getDoc(doc(db, "entities", entityId));
        if (entDoc.exists()) {
            const entData = entDoc.data();
            type = (entData.type === "Privada" || entData.type === "PRIVATE") ? "PRIVATE" : "PUBLIC";
        } else {
            type = "PUBLIC";
        }
    }

    const docRef = doc(db, "municipalities", type!, entityId, id);
    await updateDoc(docRef, data);

    // Log Action
    try {
        // @ts-ignore
        const { logAction } = await import('./logsService');
        await logAction({
            action: 'UPDATE',
            target: 'MUNICIPALITY',
            description: `Atualizou o município ${data.name || 'ID ' + id}`,
            entityId: entityId,
            municipalityId: id
        });
    } catch (e) { console.error(e); }
}

export async function deleteMunicipality(
    id: string,
    context?: { linkedEntityId: string, entityType?: string }
): Promise<void> {

    let entityId = context?.linkedEntityId;
    let type = context?.entityType;

    if (!entityId) throw new Error("Entity ID context required for deletion");

    if (!type) {
        const entDoc = await getDoc(doc(db, "entities", entityId));
        if (entDoc.exists()) {
            const entData = entDoc.data();
            type = (entData.type === "Privada" || entData.type === "PRIVATE") ? "PRIVATE" : "PUBLIC";
        } else {
            type = "PUBLIC";
        }
    }

    const docRef = doc(db, "municipalities", type!, entityId, id);

    // Fetch Name for Log
    let name = '';
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) name = snap.data().name;
    } catch (e) { }

    await deleteDoc(docRef);

    // Log Action
    try {
        // @ts-ignore
        const { logAction } = await import('./logsService');
        await logAction({
            action: 'DELETE',
            target: 'MUNICIPALITY',
            description: `Excluiu o município ${name || 'ID ' + id}`,
            entityId: entityId,
            municipalityId: id
        });
    } catch (e) { console.error(e); }
}
