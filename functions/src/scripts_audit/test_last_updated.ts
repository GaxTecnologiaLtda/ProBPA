import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = "wfgKMoGlzgf5OKzCK3PJ";
    const municipalityId = "NTH6qE46dU2ytddqnmTu";
    const basePath = `municipalities/PRIVATE/${entityId}/${municipalityId}/extractions/2026/competences`;

    const compDocs = await db.collection(`${basePath}/01-2026/resumo_producao`).limit(1).get();
    compDocs.forEach(d => {
        const data = d.data();
        console.log(`01-2026 Sample doc ${d.id} lastUpdated:`, data.lastUpdated ? data.lastUpdated.toDate() : 'N/A');
    });

}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
