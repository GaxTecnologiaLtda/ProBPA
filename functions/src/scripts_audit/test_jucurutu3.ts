import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const snap = await db.collection('municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/NTH6qE46dU2ytddqnmTu/extractions/2026/competences/01-2026/extraction_records').get();

    snap.forEach(d => {
        const data = d.data();
        if (data.productionDate === '2026-01-27' && (!data.procedure?.code || data.procedure?.code === '-')) {
            console.log(`\nDoc ID: ${d.id}`);
            console.log(`ExternalId: ${data.externalId}`);
            console.log(`Prof: ${data.professional?.name}`);
            console.log(`Unit CNES: ${JSON.stringify(data.unit?.cnes)}`);
        }
    });

}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
