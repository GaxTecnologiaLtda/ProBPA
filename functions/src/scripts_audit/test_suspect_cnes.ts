import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';

    console.log(`Buscando as fichas suspeitas...`);
    const extRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/02-2026/extraction_records`);
    const snap = await extRef.where('productionDate', '==', '2026-02-03').get();

    snap.forEach(d => {
        const data = d.data();
        if (data.professional?.cns === '706906107366038' || String(data.professionalId).includes('706906107366038')) {
            console.log(`Ficha Suspeita: ${d.id}`);
            console.log(`CNES: ${data.unit?.cnes}`);
            console.log(`ExtId: ${data.externalId}`);
        }
    });

}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
