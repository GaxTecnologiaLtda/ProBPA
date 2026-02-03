// services/entitiesService.ts
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    updateDoc,
    doc,
    addDoc,
    deleteDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";

export type EntityType = "PUBLIC" | "PRIVATE";
export type LicenseStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED" | "INACTIVE";

export interface AdminEntity {
    id: string;
    name: string;
    cnpj: string;
    type: EntityType;
    location: string;
    status: LicenseStatus;
    createdAt: string;
    healthUnits?: number;
    privateType?: string;
    municipalityCount?: number;
    responsible: string;
    email: string;

    // Campos adicionais de cadastro (opcionais)
    phone?: string;
    cep?: string;
    address?: string;
    managerRole?: string;
    entityKind?: string; // tipo detalhado: prefeitura, OSC, instituto etc.
}

export type NewEntityInput = {
    name: string;
    cnpj: string;
    type: EntityType;
    location: string;
    status: LicenseStatus;
    createdAt?: string;
    healthUnits?: number;
    privateType?: string;
    municipalityCount?: number;
    responsible: string;
    email: string;
    phone?: string;
    cep?: string;
    address?: string;
    managerRole?: string;
    entityKind?: string;
};

function mapFirestoreTypeToEntityType(type: string): EntityType {
    if (type === "Pública") return "PUBLIC";
    if (type === "Privada") return "PRIVATE";
    // fallback
    return type.toUpperCase() === "PRIVATE" ? "PRIVATE" : "PUBLIC";
}

function mapStatusToEnum(status: string): LicenseStatus {
    switch (status) {
        case "Ativa":
            return "ACTIVE";
        case "Suspensa":
            return "SUSPENDED";
        case "Expirada":
            return "EXPIRED";
        case "Inativa":
            return "INACTIVE";
        default:
            return "ACTIVE";
    }
}

function mapEnumToStatusText(status: LicenseStatus): string {
    switch (status) {
        case "ACTIVE":
            return "Ativa";
        case "SUSPENDED":
            return "Suspensa";
        case "EXPIRED":
            return "Expirada";
        case "INACTIVE":
            return "Inativa";
    }
}

export async function fetchEntitiesByType(type: EntityType): Promise<AdminEntity[]> {
    const colRef = collection(db, "entities");

    // No banco: "Pública" / "Privada"
    const typeText = type === "PUBLIC" ? "Pública" : "Privada";

    const q = query(colRef, where("type", "==", typeText), orderBy("name"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data() as any;
        return {
            id: d.id,
            name: data.name,
            cnpj: data.cnpj,
            type: mapFirestoreTypeToEntityType(data.type),
            location: data.location,
            status: mapStatusToEnum(data.status),
            createdAt: data.createdAt ?? "",
            healthUnits: data.healthUnits,
            privateType: data.privateType,
            municipalityCount: data.municipalityCount,
            responsible: data.responsible,
            email: data.email,
            phone: data.phone,
            cep: data.cep,
            address: data.address,
            managerRole: data.managerRole,
            entityKind: data.entityKind,
        } satisfies AdminEntity;
    });
}

export async function fetchAllEntities(): Promise<AdminEntity[]> {
    const colRef = collection(db, "entities");
    const q = query(colRef, orderBy("name"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data() as any;
        return {
            id: d.id,
            name: data.name,
            cnpj: data.cnpj,
            type: mapFirestoreTypeToEntityType(data.type),
            location: data.location,
            status: mapStatusToEnum(data.status),
            createdAt: data.createdAt ?? "",
            healthUnits: data.healthUnits,
            privateType: data.privateType,
            municipalityCount: data.municipalityCount,
            responsible: data.responsible,
            email: data.email,
            phone: data.phone,
            cep: data.cep,
            address: data.address,
            managerRole: data.managerRole,
            entityKind: data.entityKind,
        } satisfies AdminEntity;
    });
}

export async function toggleEntityStatus(
    entityId: string,
    currentStatus: LicenseStatus
): Promise<void> {
    const ref = doc(db, "entities", entityId);

    let next: LicenseStatus = currentStatus;
    if (currentStatus === "ACTIVE") next = "SUSPENDED";
    else if (currentStatus === "SUSPENDED") next = "ACTIVE";

    await updateDoc(ref, {
        status: mapEnumToStatusText(next),
    });
}

export async function createEntity(input: NewEntityInput): Promise<void> {
    const colRef = collection(db, "entities");
    const createdAt = input.createdAt ?? new Date().toISOString();

    await addDoc(colRef, {
        ...input,
        createdAt,
        status: mapEnumToStatusText(input.status),
        type: input.type === "PUBLIC" ? "Pública" : "Privada",
    });
}

export async function updateEntity(
    id: string,
    data: Partial<NewEntityInput>
): Promise<void> {
    const ref = doc(db, "entities", id);

    const payload: any = { ...data };

    if (data.status) {
        payload.status = mapEnumToStatusText(data.status);
    }
    if (data.type) {
        payload.type = data.type === "PUBLIC" ? "Pública" : "Privada";
    }

    await updateDoc(ref, payload);
}

export async function deleteEntity(id: string): Promise<void> {
    const ref = doc(db, "entities", id);
    await deleteDoc(ref);
}

export async function grantMasterAccess(entityId: string, type: EntityType, email: string, name: string, phoneNumber: string) {
    const functions = getFunctions();
    const grantFn = httpsCallable(functions, "grantEntityMasterAccess");
    return await grantFn({ entityId, type, email, name, phoneNumber });
}

export async function getMasters(entityId: string) {
    const q = query(collection(db, `entities/${entityId}/masters`));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function toggleMasterAccess(uid: string, disabled: boolean) {
    const functions = getFunctions();
    const toggleFn = httpsCallable(functions, "toggleMasterAccessStatus");
    return await toggleFn({ uid, disabled });
}

export async function resetMasterPassword(uid: string) {
    const functions = getFunctions();
    const resetFn = httpsCallable(functions, "resetMasterUserPassword");
    return await resetFn({ uid });
}

export async function deleteMasterUser(uid: string, entityId: string) {
    const functions = getFunctions();
    const deleteFn = httpsCallable(functions, "deleteMasterUser");
    return await deleteFn({ uid, entityId });
}