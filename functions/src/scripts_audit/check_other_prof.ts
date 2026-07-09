import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'probpa-025' });
const db = admin.firestore();

async function run() {
    const q = db.collectionGroup('procedures')
        .where('professionalId', '==', 'kAh1ibXZW2J6vuWRTfqM');
        
    const snap = await q.get();
    
    let summary: any = {};
    snap.docs.forEach(d => {
        const row = d.data();
        const key = `comp:${row.competence} | unit:${row.unitName}`;
        summary[key] = (summary[key] || 0) + 1;
    });
    console.log("Total for kAh1ibXZW2J6vuWRTfqM:", snap.docs.length);
    console.log(summary);
}
run().catch(console.error);
