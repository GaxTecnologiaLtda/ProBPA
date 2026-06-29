import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';

    console.log(`Buscando as fichas do Polo Academia...`);
    const extRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/02-2026/extraction_records`);
    const snap = await extRef.get();

    snap.forEach(d => {
        const data = d.data();
        if (String(data.externalId).startsWith('9065792')) {
            console.log(`Ficha Polo: ${d.id}`);
            console.log(JSON.stringify(data, null, 2));
        }
    });

}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
