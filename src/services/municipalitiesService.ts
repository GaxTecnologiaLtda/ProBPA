import {
    collection,
    getDocs,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    getDoc,
    QueryDocumentSnapshot,
    DocumentData
} from "firebase/firestore";
import { db } from "../firebase";
import { Municipality, MunicipalityInput, LicenseStatus } from "../types";

const getMunicipalityCollection = (entityType: string, entityId: string) => {
    return collection(db, "municipalities", entityType, entityId);
};

export async function fetchAllMunicipalities(): Promise<Municipality[]> {
    try {
        const entitiesQuery = query(collection(db, "entities"));
        const entitiesSnap = await getDocs(entitiesQuery);

        const promises = entitiesSnap.docs.map(async (entDoc) => {
            const entData = entDoc.data();
            const type = (entData.type === "Privada" || entData.type === "PRIVATE") ? "PRIVATE" : "PUBLIC";
            const colRef = getMunicipalityCollection(type, entDoc.id);
            const subSnap = await getDocs(colRef);
            return subSnap.docs.map(d => ({ id: d.id, ...d.data() } as Municipality));
        });

        const results = await Promise.all(promises);
        return results.flat();
    } catch (e) {
        console.error("Error fetching municipalities:", e);
        return [];
    }
}

export async function fetchMunicipalitiesByEntity(entityId: string): Promise<Municipality[]> {
    const entDoc = await getDoc(doc(db, "entities", entityId));
    if (!entDoc.exists()) return [];

    const entData = entDoc.data();
    const type = (entData.type === "Privada" || entData.type === "PRIVATE") ? "PRIVATE" : "PUBLIC";

    const colRef = getMunicipalityCollection(type, entityId);
    const qSnapshot = await getDocs(colRef);
    return qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Municipality));
}

export async function createMunicipality(data: MunicipalityInput): Promise<string> {
    if (!data.linkedEntityId) throw new Error("Linked Entity ID needed");

    let type = "PUBLIC";
    const entDoc = await getDoc(doc(db, "entities", data.linkedEntityId));
    if (entDoc.exists()) {
        const entData = entDoc.data();
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

    if (!entityId) throw new Error("Update requires linkedEntityId context");

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
}

export async function deleteMunicipality(
    id: string,
    context?: { linkedEntityId: string, entityType?: string }
): Promise<void> {

    let entityId = context?.linkedEntityId;
    let type = context?.entityType;

    if (!entityId) throw new Error("Delete requires linkedEntityId context");

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
    await deleteDoc(docRef);
}
