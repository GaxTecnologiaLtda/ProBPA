import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    addDoc,
    writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { License, Installment, EntityType, LicenseStatus } from '../types';

const LICENSES_COLLECTION = 'licenses';

export const fetchAllLicenses = async (): Promise<License[]> => {
    const querySnapshot = await getDocs(collection(db, LICENSES_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as License);
};

export const fetchLicensesByType = async (type: EntityType): Promise<License[]> => {
    const q = query(collection(db, LICENSES_COLLECTION), where('entityType', '==', type));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as License);
};

export const fetchLicenseById = async (id: string): Promise<License | null> => {
    const docRef = doc(db, LICENSES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as License;
    }
    return null;
};

export const createLicense = async (licenseInput: Omit<License, 'id' | 'generatedAt' | 'installments'> & { installments?: Omit<Installment, 'id'>[] }): Promise<License> => {
    const year = new Date().getFullYear();
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    const id = `LIC-${year}-${randomSuffix}`;

    const generatedAt = new Date().toISOString();

    const licenseData: License = {
        ...licenseInput,
        id,
        generatedAt,
        installments: [] // Will be handled as subcollection
    };

    // Create License Doc
    await setDoc(doc(db, LICENSES_COLLECTION, id), licenseData);

    // Create Installments Subcollection if present
    if (licenseInput.installments && licenseInput.installments.length > 0) {
        const batch = writeBatch(db);
        licenseInput.installments.forEach((inst, index) => {
            const installmentId = `INST-${id}-${index + 1}`;
            const installmentRef = doc(db, LICENSES_COLLECTION, id, 'installments', installmentId);
            batch.set(installmentRef, { ...inst, id: installmentId });
        });
        await batch.commit();
    }

    return licenseData;
};

export const updateLicense = async (id: string, data: Partial<License>): Promise<void> => {
    const docRef = doc(db, LICENSES_COLLECTION, id);
    await updateDoc(docRef, { ...data, lastModified: new Date().toISOString() });
};

export const deleteLicense = async (id: string): Promise<void> => {
    // Note: Subcollections are not automatically deleted in Firestore. 
    // For a proper cleanup, we should delete subcollections too, but client-side deletion is limited.
    // We will delete the main doc.
    await deleteDoc(doc(db, LICENSES_COLLECTION, id));
};

export const fetchInstallments = async (licenseId: string): Promise<Installment[]> => {
    const querySnapshot = await getDocs(collection(db, LICENSES_COLLECTION, licenseId, 'installments'));
    return querySnapshot.docs.map(doc => doc.data() as Installment).sort((a, b) => a.number - b.number);
};

export const addInstallments = async (licenseId: string, installments: Omit<Installment, 'id'>[]): Promise<void> => {
    const batch = writeBatch(db);
    installments.forEach((inst, index) => {
        // We need a unique ID, maybe timestamp based or random if not sequential
        const installmentId = `INST-${licenseId}-${Date.now()}-${index}`;
        const installmentRef = doc(db, LICENSES_COLLECTION, licenseId, 'installments', installmentId);
        batch.set(installmentRef, { ...inst, id: installmentId });
    });
    await batch.commit();
};

export const markInstallmentAsPaid = async (licenseId: string, installmentId: string): Promise<void> => {
    const docRef = doc(db, LICENSES_COLLECTION, licenseId, 'installments', installmentId);
    await updateDoc(docRef, {
        paid: true,
        paidAt: new Date().toISOString()
    });
};

export const updateInstallment = async (licenseId: string, installmentId: string, data: Partial<Installment>): Promise<void> => {
    const docRef = doc(db, LICENSES_COLLECTION, licenseId, 'installments', installmentId);
    await updateDoc(docRef, data);
};

export const deleteInstallment = async (licenseId: string, installmentId: string): Promise<void> => {
    const docRef = doc(db, LICENSES_COLLECTION, licenseId, 'installments', installmentId);
    await deleteDoc(docRef);
};
