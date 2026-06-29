import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'probpa-025' });
const db = admin.firestore();

async function run() {
    const q = db.collectionGroup('procedures')
        .where('competenceMonth', '==', '2026-03')
        .where('entityId', '==', 'wfgKMoGlzgf5OKzCK3PJ');
        
    const snap = await q.get();
    let count = 0;
    let feijaoCount = 0;
    let ingrids = new Set();
    
    snap.docs.forEach(d => {
        const row = d.data();
        if (row.professionalName && row.professionalName.toUpperCase().includes('INGRID')) {
            count++;
            if (row.unitName && row.unitName.toUpperCase().includes('FEIJ')) {
                feijaoCount++;
                ingrids.add(row.professionalId + " | " + row.professionalName);
            }
        }
    });
    console.log(`Total Ingrid procedures in 2026-03: ${count}`);
    console.log(`Ingrid procedures in FEIJÃO: ${feijaoCount}`);
    console.log(`Associated Profiles in Feijão:`, Array.from(ingrids));
}
run().catch(console.error);
