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
    serverTimestamp,
    Timestamp,
    writeBatch,
    getDoc,
    setDoc as firebaseSetDoc,
    onSnapshot
} from "firebase/firestore";
import { db, functions } from "../firebase";
import { Professional, ProfessionalAssignment } from "../types";
import { httpsCallable } from "firebase/functions";

const COLLECTION_NAME = "professionals";

import { fetchUnitsByEntity } from "./unitsService";

// Estrutura de dados hierárquica para o frontend
export type HierarchicalData = {
    municipalityId: string;
    municipalityName: string;
    units: {
        unitId: string;
        unitName: string;
        cnes: string;
        professionals: Professional[];
    }[];
};

export async function fetchProfessionalsByEntity(entityId: string): Promise<Professional[]> {
    const q = query(
        collection(db, COLLECTION_NAME),
        where("entityId", "==", entityId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
        (d: QueryDocumentSnapshot<DocumentData>) =>
            ({ id: d.id, ...d.data() } as Professional)
    );
}

export async function fetchProfessionalsGrouped(entityId: string): Promise<HierarchicalData[]> {
    // 1. Buscar todos os profissionais da entidade
    const professionals = await fetchProfessionalsByEntity(entityId);

    // 2. Agrupar
    const result: Record<string, HierarchicalData> = {};

    // Buscar unidades para enriquecer dados (CNES)
    const unitsData = await fetchUnitsByEntity(entityId);
    const unitsMap = new Map(unitsData.map(u => [u.id, u]));

    console.log(`[DEBUG] Found ${professionals.length} professionals for entity ${entityId}`);


    professionals.forEach(prof => {
        // Normalizar assignments (suporte a legado)
        const assignments: ProfessionalAssignment[] = prof.assignments && prof.assignments.length > 0
            ? prof.assignments
            : (prof.unitId && prof.municipalityId ? [{
                unitId: prof.unitId,
                unitName: prof.unitName || 'Desconhecida',
                municipalityId: prof.municipalityId,
                municipalityName: prof.municipalityName || 'Desconhecido',
                occupation: prof.occupation || '',
                registerClass: prof.registerClass || '',
                active: prof.active ?? true
            }] : []);

        assignments.forEach(assignment => {
            const munId = assignment.municipalityId;
            if (!munId) return;

            if (!result[munId]) {
                result[munId] = {
                    municipalityId: munId,
                    municipalityName: assignment.municipalityName || 'Desconhecido',
                    units: []
                };
            }

            let unitEntry = result[munId].units.find(u => u.unitId === assignment.unitId);
            if (!unitEntry) {
                const unitData = unitsMap.get(assignment.unitId);
                unitEntry = {
                    unitId: assignment.unitId,
                    unitName: assignment.unitName || 'Desconhecida',
                    cnes: unitData ? unitData.cnes : 'N/A',
                    professionals: []
                };
                result[munId].units.push(unitEntry);
            }

            // Adiciona o profissional à lista desta unidade
            // Nota: O mesmo profissional pode aparecer em múltiplas unidades
            unitEntry.professionals.push(prof);
        });
    });

    return Object.values(result).sort((a, b) => a.municipalityName.localeCompare(b.municipalityName));
}

export async function subscribeToProfessionalsGrouped(
    entityId: string,
    municipalityId: string | null | undefined,
    onUpdate: (data: HierarchicalData[]) => void
): Promise<() => void> {
    // 1. Fetch units to enrich data
    const unitsData = await fetchUnitsByEntity(entityId);
    const unitsMap = new Map(unitsData.map(u => [u.id, u]));

    // 2. Setup subscription
    let q;
    if (municipalityId) {
        // Assume PRIVATE path based on app structure for SUBSEDE
        q = collection(db, `municipalities/PRIVATE/${entityId}/${municipalityId}/professionals`);
    } else {
        // Root query
        q = query(collection(db, COLLECTION_NAME), where("entityId", "==", entityId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const professionals = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Professional));
        const result: Record<string, HierarchicalData> = {};

        professionals.forEach(prof => {
            const assignments: ProfessionalAssignment[] = prof.assignments && prof.assignments.length > 0
                ? prof.assignments
                : (prof.unitId && prof.municipalityId ? [{
                    unitId: prof.unitId,
                    unitName: prof.unitName || 'Desconhecida',
                    municipalityId: prof.municipalityId,
                    municipalityName: prof.municipalityName || 'Desconhecido',
                    occupation: prof.occupation || '',
                    registerClass: prof.registerClass || '',
                    active: prof.active ?? true
                }] : []);

            assignments.forEach(assignment => {
                const munId = assignment.municipalityId;
                if (!munId) return;

                if (municipalityId && munId !== municipalityId) return;

                if (!result[munId]) {
                    result[munId] = {
                        municipalityId: munId,
                        municipalityName: assignment.municipalityName || 'Desconhecido',
                        units: []
                    };
                }

                let unitEntry = result[munId].units.find(u => u.unitId === assignment.unitId);
                if (!unitEntry) {
                    const unitData = unitsMap.get(assignment.unitId);
                    unitEntry = {
                        unitId: assignment.unitId,
                        unitName: assignment.unitName || 'Desconhecida',
                        cnes: unitData ? unitData.cnes : 'N/A',
                        professionals: []
                    };
                    result[munId].units.push(unitEntry);
                }

                unitEntry.professionals.push(prof);
            });
        });

        const finalData = Object.values(result).sort((a, b) => a.municipalityName.localeCompare(b.municipalityName));
        onUpdate(finalData);
    }, (error) => {
        console.error("Error subscribing to professionals:", error);
    });

    return unsubscribe;
}

export async function createProfessional(data: Omit<Professional, 'id'>): Promise<string> {
    if (!data.entityId) throw new Error("entityId é obrigatório.");

    // Garantir assignments
    if (!data.assignments || data.assignments.length === 0) {
        if (data.unitId && data.municipalityId) {
            data.assignments = [{
                unitId: data.unitId,
                unitName: data.unitName || '',
                municipalityId: data.municipalityId,
                municipalityName: data.municipalityName || '',
                occupation: data.occupation || '',
                registerClass: data.registerClass || '',
                active: data.active ?? true
            }];
        } else {
            throw new Error("Pelo menos um vínculo (assignment) é obrigatório.");
        }
    }

    const docData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        active: data.active ?? true,
        accessGranted: data.accessGranted ?? false
    };

    const batch = writeBatch(db);
    const docRef = doc(collection(db, COLLECTION_NAME));
    batch.set(docRef, docData);

    let resolvedType = "PRIVATE";
    try {
        const eSnap = await getDoc(doc(db, 'entities', data.entityId));
        if (eSnap.exists()) {
            const t = eSnap.data().type;
            if (t === 'Pública' || t === 'PUBLIC') resolvedType = 'PUBLIC';
        }
    } catch (e) { }

    // Atualiza contadores nas unidades
    data.assignments.forEach(assignment => {
        if (!assignment.municipalityId || !assignment.unitId) return;
        const unitRef = doc(db, `municipalities/${resolvedType}/${data.entityId}/${assignment.municipalityId}/units`, assignment.unitId);
        batch.update(unitRef, { professionalsCount: increment(1) });
    });

    await batch.commit();

    // 3. New Architecture: Sync to Municipality Context
    if (data.entityId && data.assignments) {
        try {
            await syncProfessionalToContext(docRef.id, { ...docData, id: docRef.id } as Professional);
        } catch (err) {
            console.error("Warning: Failed to sync professional to municipality context", err);
        }
    }

    // Log Action
    try {
        // @ts-ignore
        const { logAction } = await import('./logsService');
        await logAction({
            action: 'CREATE',
            target: 'PROFESSIONAL',
            description: `Criou o profissional ${data.name}`,
            entityId: data.entityId,
            municipalityId: data.assignments[0]?.municipalityId
        });
    } catch (e) { console.error(e); }

    return docRef.id;
}

export async function updateProfessional(
    id: string,
    data: Partial<Professional>
): Promise<void> {
    const profRef = doc(db, COLLECTION_NAME, id);
    const profSnap = await getDoc(profRef);

    if (!profSnap.exists()) throw new Error("Profissional não encontrado.");

    const currentData = profSnap.data() as Professional;
    const currentAssignments = currentData.assignments || [];
    const newAssignments = data.assignments || currentAssignments;

    const batch = writeBatch(db);

    const updateData = {
        ...data,
        updatedAt: serverTimestamp()
    };
    batch.update(profRef, updateData);

    // Calcular diff de unidades para atualizar contadores
    const currentUnitIds = new Set(currentAssignments.map(a => a.unitId));
    const newUnitIds = new Set(newAssignments.map(a => a.unitId));

    let resolvedType = "PRIVATE";
    if (currentData.entityId) {
        try {
            const eSnap = await getDoc(doc(db, 'entities', currentData.entityId));
            if (eSnap.exists()) {
                const t = eSnap.data().type;
                if (t === 'Pública' || t === 'PUBLIC') resolvedType = 'PUBLIC';
            }
        } catch (e) { }
    }

    const getUnitPath = (unitId: string) => {
        // Find the municipality for this unit taking assignments
        const assignment = newAssignments.find(a => a.unitId === unitId) || currentAssignments.find(a => a.unitId === unitId);
        if (!assignment || !assignment.municipalityId) return null;
        return `municipalities/${resolvedType}/${currentData.entityId}/${assignment.municipalityId}/units`;
    };

    // Decrementar removidas
    currentUnitIds.forEach(unitId => {
        if (!newUnitIds.has(unitId)) {
            const path = getUnitPath(unitId);
            if (path) {
                const unitRef = doc(db, path, unitId);
                batch.update(unitRef, { professionalsCount: increment(-1) });
            }
        }
    });

    // Incrementar novas
    newUnitIds.forEach(unitId => {
        if (!currentUnitIds.has(unitId)) {
            const path = getUnitPath(unitId);
            if (path) {
                const unitRef = doc(db, path, unitId);
                batch.update(unitRef, { professionalsCount: increment(1) });
            }
        }
    });

    await batch.commit();

    // 3. Sync to Municipality Context
    try {
        // We merge old data with new data to have complete object for context
        const mergedData = { ...currentData, ...data, id };
        await syncProfessionalToContext(id, mergedData);
    } catch (err) {
        console.error("Warning: Failed to sync professional update to context", err);
    }

    // Log Action
    try {
        if (currentData.entityId) {
            // @ts-ignore
            const { logAction } = await import('./logsService');
            await logAction({
                action: 'UPDATE',
                target: 'PROFESSIONAL',
                description: `Atualizou o profissional ${data.name || currentData.name}`,
                entityId: currentData.entityId,
                municipalityId: newAssignments[0]?.municipalityId
            });
        }
    } catch (e) { console.error(e); }
}

// Helper to sync professional to municipality subcollections
async function syncProfessionalToContext(id: string, professional: Professional) {
    if (!professional.entityId || !professional.assignments || professional.assignments.length === 0) return;

    // We need Entity Type. If missing, we must fetch it.
    let entityType = professional.entityType;
    let pathType = 'PUBLIC'; // Default

    // Logic: If input contains "Priv", "PRIV", "priv" -> PRIVATE
    // Otherwise -> PUBLIC (unless we fetch and confirm)

    if (entityType) {
        const norm = (entityType as string).toString().toUpperCase();
        if (norm.includes('PRIV')) {
            pathType = 'PRIVATE';
        } else if (norm.includes('PUB')) {
            pathType = 'PUBLIC';
        } else {
            console.warn(`[DEBUG] Ambiguous entity type "${entityType}", defaulting to PUBLIC`);
            pathType = 'PUBLIC';
        }
    } else {
        // Fetch entity to get type
        const entDoc = await getDoc(doc(db, 'entities', professional.entityId));
        if (entDoc.exists()) {
            const data = entDoc.data();
            const rawType = (data.type || '').toString().toUpperCase();
            if (rawType.includes('PRIV')) pathType = 'PRIVATE';
            else pathType = 'PUBLIC';
        } else {
            console.warn(`[DEBUG] Entity ${professional.entityId} not found, defaulting path to PRIVATE fallback`);
            pathType = 'PRIVATE'; // Fallback
        }
    }

    // DEBUG: Confirm path resolution
    console.log(`[DEBUG] Syncing Professional ${id}. EntityType Input: ${entityType}, Resolved PathType: ${pathType}`);

    const uniqueMunicipalities = new Set(professional.assignments.map(a => a.municipalityId));

    // Write to each municipality
    const promises = Array.from(uniqueMunicipalities).map(async (munId) => {
        if (!munId) {
            console.warn("[DEBUG] Skipping sync for assignment without municipalityId");
            return;
        }

        const subPath = `municipalities/${pathType}/${professional.entityId}/${munId}/professionals`;
        console.log(`[DEBUG] Context Save Path: ${subPath}/${id}`);

        const subRef = doc(db, subPath, id);

        // We save the full snapshot or a subset? Full snapshot is better for read performance.
        await firebaseSetDoc(subRef, { ...professional, updatedAt: serverTimestamp() }, { merge: true });
    });

    await Promise.all(promises);
}

export async function deleteProfessional(id: string, unitId: string, entityId: string): Promise<void> {
    // 1. Fetch Data First (needed for Log and Context Cleanup)
    let professionalData: Professional | undefined;
    try {
        const snap = await getDoc(doc(db, COLLECTION_NAME, id));
        if (snap.exists()) {
            professionalData = { id: snap.id, ...snap.data() } as Professional;
        }
    } catch (e) {
        console.error("Error fetching professional before delete:", e);
    }

    // 2. Cleanup Context (Subcollections)
    if (professionalData && professionalData.assignments) {
        try {
            // Determine Path Type (same logic as sync)
            let entityType = professionalData.entityType;
            let pathType = 'PUBLIC';

            if (entityType) {
                const norm = (entityType as string).toString().toUpperCase();
                if (norm.includes('PRIV')) pathType = 'PRIVATE';
            } else {
                // Fallback fetch if finding proper type is critical, but usually we can infer or it defaults
                // For safety/speed, we might try both or default to PUBLIC if mostly public usage
                // But let's reuse the logic if possible or just try to delete from the known path if we can resolve it.
                // Simplification: Try to match what sync does.
                // NOTE: We don't have async fetchEntity here easily without importing. 
                // Let's rely on entityId and maybe try both paths if unsure? 
                // Or better: fetch the entity type if missing.
                const entDoc = await getDoc(doc(db, 'entities', entityId));
                if (entDoc.exists()) {
                    const d = entDoc.data();
                    if (d.type && d.type.toUpperCase().includes('PRIV')) pathType = 'PRIVATE';
                }
            }

            const uniqueMunicipalities = new Set(professionalData.assignments.map(a => a.municipalityId));
            const cleanupPromises = Array.from(uniqueMunicipalities).map(async (munId) => {
                if (!munId) return;
                const subPath = `municipalities/${pathType}/${entityId}/${munId}/professionals`;
                console.log(`[DEBUG] Deleting from Context: ${subPath}/${id}`);
                await deleteDoc(doc(db, subPath, id));
            });
            await Promise.all(cleanupPromises);

        } catch (err) {
            console.error("Warning: Failed to cleanup professional context", err);
        }
    }

    // 3. Call Cloud Function (Deletes root doc + Auth user)
    const deleteFn = httpsCallable(functions, 'professionalDelete');
    await deleteFn({
        professionalId: id,
        unitId,
        entityId
    });

    // 4. Log Action
    try {
        // @ts-ignore
        const { logAction } = await import('./logsService');
        await logAction({
            action: 'DELETE',
            target: 'PROFESSIONAL',
            description: `Excluiu o profissional ${professionalData?.name || 'ID ' + id}`,
            entityId: entityId
        });
    } catch (e) { console.error(e); }
}

export async function toggleAccess(id: string, newStatus: boolean): Promise<void> {
    const profRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(profRef, {
        accessGranted: newStatus,
        updatedAt: serverTimestamp()
    });
}
