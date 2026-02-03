
import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
    setDoc,
    query,
    where,
    getDocs,
    orderBy
} from "firebase/firestore";
import { db } from "../firebase";
import { SupportTicket, User } from "../types";

const COLLECTION_NAME = "support_tickets";

export interface CreateTicketDTO {
    category: string;
    subject: string;
    description: string;
    user: User; // We need context like entityId, municipalityId from the user/assignment
    file?: File | null; // Placeholder for now, file upload logic usually separate
}

export async function createSupportTicket(data: CreateTicketDTO): Promise<string> {
    const { user } = data;

    // 1. Prepare Base Ticket Data
    const ticketData = {
        category: data.category,
        subject: data.subject,
        description: data.description,
        status: 'open',
        userId: user.id || user.professionalId,
        userName: user.name,
        userEmail: user.email,
        entityId: user.entityId,
        entityName: user.entityName,
        createdAt: serverTimestamp(),
        lastUpdate: serverTimestamp(),
        source: 'PRODUCTION_PANEL',
        // Attempt to capture location context
        municipalityId: user.units?.[0]?.municipalityId || '', // First unit as fallback ctx
        municipalityName: user.units?.[0]?.municipalityName || '',
    };

    // 2. Save into Root Collection
    const docRef = await addDoc(collection(db, COLLECTION_NAME), ticketData);
    const ticketId = docRef.id;

    // 3. Dual Write: Save to Municipality Context Subcollection
    if (user.entityId && ticketData.municipalityId) {
        try {
            await syncTicketToMunicipality(ticketId, { ...ticketData, id: ticketId }, user.entityId, ticketData.municipalityId);
        } catch (error) {
            console.error("Failed to sync ticket to municipality context:", error);
            // Non-blocking
        }
    }

    return ticketId;
}

// Helper to sync to municipality subcollections (reusing logic from professionalsService)
async function syncTicketToMunicipality(ticketId: string, ticketData: any, entityId: string, municipalityId: string) {
    if (!entityId || !municipalityId) return;

    // We need Entity Type to determine path (PUBLIC vs PRIVATE)
    // Since we don't have it handy in the user object usually, we fetch or allow pass-in.
    // For now, let's fetch the entity doc to be safe and accurate.
    let pathType = 'PUBLIC'; // Default

    try {
        const entDoc = await getDoc(doc(db, 'entities', entityId));
        if (entDoc.exists()) {
            const data = entDoc.data();
            const rawType = (data.type || '').toString().toUpperCase();
            if (rawType.includes('PRIV')) pathType = 'PRIVATE';
            else pathType = 'PUBLIC';
        } else {
            console.warn(`[DEBUG] Entity ${entityId} not found for ticket sync, defaulting to PUBLIC`);
        }
    } catch (e) {
        console.error("Error fetching entity type:", e);
    }

    const subPath = `municipalities/${pathType}/${entityId}/${municipalityId}/support_tickets`;
    console.log(`[DEBUG] Syncing Support Ticket to: ${subPath}/${ticketId}`);


    const subRef = doc(db, subPath, ticketId);
    await setDoc(subRef, ticketData);
}

export async function fetchUserTickets(userId: string): Promise<any[]> {
    if (!userId) return [];

    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Ensure dates are serializable or Date objects as needed by component
            date: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            lastUpdate: doc.data().lastUpdate?.toDate?.()?.toISOString() || new Date().toISOString()
        }));
    } catch (error) {
        console.error("Error fetching user tickets:", error);
        return [];
    }
}
