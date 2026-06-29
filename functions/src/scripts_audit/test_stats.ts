import * as admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'probpa-025'
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const compManual = '2026-03';
    const profId = 'HSRxEkd3nBxWrNwooHzC';
    let countManual = 0;
    
    console.log("--- MANUAL Q ---");
    const manualQ = db.collectionGroup('procedures')
        .where('entityId', '==', entityId)
        .where('competenceMonth', '==', compManual)
        .where('professionalId', '==', profId);
        
    const snap = await manualQ.get();
    console.log("Manual records found:", snap.docs.length);
    snap.docs.forEach(d => {
        const row = d.data();
        if (row.status !== 'canceled') {
            countManual += (Number(row.quantity) || 1);
        }
    });
    console.log("Manual quantity sum:", countManual);

    console.log("--- ALL PROCEDURES (NO ENTITY ID FILTER) ---");
    const allQ = db.collectionGroup('procedures')
        .where('competenceMonth', '==', compManual)
        .where('professionalId', '==', profId);
    
    const allSnap = await allQ.get();
    console.log("Total Manual records found without entityId filter:", allSnap.docs.length);
    let countTotal = 0;
    allSnap.docs.forEach(doc => {
        const row = doc.data();
        if (row.status === 'canceled') return;
        countTotal += (Number(row.quantity) || 1);
        if (row.entityId !== entityId) {
            console.log("Record with divergent entityId. Found:", row.entityId, "Unit:", row.unitName);
        }
    });
    console.log("Total Manual quantity without entityId filter:", countTotal);
}

run().catch(console.error);
