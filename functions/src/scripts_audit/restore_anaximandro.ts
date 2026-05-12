import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'probpa-025' });
}

const db = admin.firestore();

async function run() {
    console.log("Starting audit to restore professional: Anaximandro Antonio Sarmento");
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'nbXlyOu61viHJJxuV6IA'; // Alexandria

    // 1. Scan the global logs for the exact payload
    console.log(`\nScanning global logs...`);
    const logsRef = db.collection(`municipalities/PRIVATE/${entityId}/global/logs`);
    const logsSnap = await logsRef.orderBy('timestamp', 'desc').limit(200).get();
    
    let targetProfId: string | null = null;
    let recoveredProfile: any = null;

    for (const doc of logsSnap.docs) {
        const logData = doc.data();
        const desc = logData.description || '';
        if (logData.action === 'DELETE' && desc.includes('Anaximandro')) {
            recoveredProfile = logData.previousData || null;
            if (logData.documentPath) {
                const parts = logData.documentPath.split('/');
                targetProfId = parts[parts.length - 1];
            } else if (logData.professionalId || logData.id || logData.recordId) {
                targetProfId = logData.professionalId || logData.id || logData.recordId;
            } else if (recoveredProfile && recoveredProfile.id) {
                targetProfId = recoveredProfile.id;
            }
            console.log(`\n--- FOUND EXACT DELETION LOG: ${doc.id} ---`);
            console.log(`Raw log payload:`, JSON.stringify(logData, null, 2));
            console.log(`Professional ID: ${targetProfId}`);
            break;
        }
    }

    if (!targetProfId || !recoveredProfile) {
        console.error("Critical: Could not find 'Anaximandro' in the BPA-I target cache.");
        return;
    }

    // 2. RESTORE THE PROFESSIONAL
    console.log(`\nRestoring Professional ${targetProfId}...`);
    const profRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/professionals`).doc(targetProfId);
    
    // Check if he already exists
    const existing = await profRef.get();
    if (existing.exists) {
        console.log(`⚠️ He currently exists in the DB! We don't need to restore him!`);
    } else {
        await profRef.set(recoveredProfile);
        console.log(`✅ Successfully restored payload to: municipalities/PRIVATE/${entityId}/${munId}/professionals/${targetProfId}`);
    }
}

run().catch(console.error);
