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
    collectionGroup,
    getCountFromServer
} from "firebase/firestore";
import { db } from "../firebase";
import { Municipality, MunicipalityInput, LicenseStatus } from "../types";
import { fetchAllEntities } from "./entitiesService";

// Helper to get collection reference based on Entity Type and ID
const getMunicipalityCollection = (entityType: string, entityId: string) => {
    return collection(db, "municipalities", entityType, entityId);
};

export async function fetchAllMunicipalities(): Promise<Municipality[]> {
    try {
        const entities = await fetchAllEntities();
        const promises = entities.map(async (entity) => {
            const type = entity.type; // "PUBLIC" or "PRIVATE"
            const entityId = entity.id;

            const colRef = getMunicipalityCollection(type, entityId);
            const snapshot = await getDocs(colRef);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                _pathContext: { entityType: type, entityId: entityId }
            } as unknown as Municipality));
        });

        const results = await Promise.all(promises);
        return results.flat();

    } catch (e) {
        console.error("Error fetching all municipalities:", e);
        return [];
    }
}

export async function fetchMunicipalitiesByEntity(entityId: string): Promise<Municipality[]> {
    const entityDoc = await getDoc(doc(db, "entities", entityId));
    if (!entityDoc.exists()) return [];

    const entityData = entityDoc.data();

    let type = "PUBLIC";
    if (entityData.type === "Privada" || entityData.type === "PRIVATE") type = "PRIVATE";

    const colRef = getMunicipalityCollection(type, entityId);
    const querySnapshot = await getDocs(colRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Municipality));
}

export async function createMunicipality(data: MunicipalityInput): Promise<string> {
    if (!data.linkedEntityId) throw new Error("Linked Entity ID is required");

    let type = "PUBLIC"; // Default

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
    return docRef.id;
}

export async function updateMunicipality(
    id: string,
    data: Partial<MunicipalityInput>,
    context?: { linkedEntityId: string, entityType?: string }
): Promise<void> {

    if (data.active !== undefined) {
        data.status = data.active ? LicenseStatus.ACTIVE : LicenseStatus.SUSPENDED;
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

    const docRef = doc(db, "municipalities", type!, entityId!, id);
    await updateDoc(docRef, data);
}

export async function deleteMunicipality(
    id: string,
    context?: { linkedEntityId: string, entityType?: string }
): Promise<void> {

    let entityId = context?.linkedEntityId;
    let type = context?.entityType;

    if (!entityId) {
        throw new Error("Cannot delete municipality without linkedEntityId context");
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
    await deleteDoc(docRef);
}

/**
 * Fetches LEDI observability stats for a municipality.
 * Returns count of pending and error records.
 */
export async function fetchLediStatusStats(municipalityId: string): Promise<{ pending: number, errors: number }> {
    try {
        const proceduresRef = collectionGroup(db, "procedures");

        // Count Pending
        const pendingQuery = query(
            proceduresRef,
            where("municipalityId", "==", municipalityId),
            where("integration.status", "==", "PENDENTE_ENVIO")
        );
        const pendingSnapshot = await getCountFromServer(pendingQuery);

        // Count Errors
        const errorQuery = query(
            proceduresRef,
            where("municipalityId", "==", municipalityId),
            where("integration.status", "==", "ERRO_ENVIO")
        );
        const errorSnapshot = await getCountFromServer(errorQuery);

        return {
            pending: pendingSnapshot.data().count,
            errors: errorSnapshot.data().count
        };

    } catch (error) {
        console.error("Error fetching LEDI stats:", error);
        return { pending: 0, errors: 0 };
    }
}
