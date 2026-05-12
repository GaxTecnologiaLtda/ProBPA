import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'probpa-025' });
const db = admin.firestore();

async function run() {
    const q = db.collectionGroup('procedures')
        .where('competenceMonth', '==', '2026-03');
        
    const snap = await q.get();
    let count = 0;
    
    snap.docs.forEach(d => {
        const row = d.data();
        if (row.professionalName && row.professionalName.toUpperCase().includes('INGRID')) {
            count++;
            console.log(`- Entity: ${row.entityId} | Unit: ${row.unitName} | ProfId: ${row.professionalId} | Path: ${d.ref.path}`);
        }
    });
    console.log(`\nTotal global Ingrid procedures in 2026-03: ${count}`);
}
run().catch(console.error);
