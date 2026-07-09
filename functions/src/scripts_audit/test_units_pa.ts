import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';

    console.log(`Buscando unidades em Pedro Avelino...`);
    const unitsSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/units`).get();

    unitsSnap.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id} | Name: ${data.name} | CNES: ${data.cnes} | Inative: ${data.inactivatedAt ? 'YES' : 'NO'}`);
    });
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
