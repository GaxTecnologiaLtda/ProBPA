import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

async function runTest() {
    const profName = "Luiza Pamela Silva da Costa";
    const entityId = "wfgKMoGlzgf5OKzCK3PJ";
    const munId = "2BGe8RORtiVY632OrU2m"; // Not needed if we use collectionGroup

    console.log(`Buscando por professional name: ${profName} (Entity: ${entityId}, Mun: ${munId})`);

    const cg = db.collectionGroup("extraction_records");
    const snap = await cg.where("professional.name", "==", profName).get();

    console.log(`Encontradas ${snap.size} fichas totais para ela.`);

    snap.forEach((doc: any) => {
        const d = doc.data();
        console.log(`>> doc ID: ${doc.id}`);
        console.log(`   Path: ${doc.ref.path}`);
        console.log(`   productionDate: ${d.productionDate}`);
        console.log(`   competence: ${d._competence}`);
        console.log(`   unit cnes: ${d.unit?.cnes}`);
        console.log(`   ext Id: ${d.externalId}`);
        console.log(`   prof cns: ${d.professional?.cns}`);
        console.log(`   prof cpf: ${d.professional?.cpf}`);
        console.log(`   prof name: ${d.professional?.name}`);
        console.log(`   professionalId: ${d.professionalId}`);
    });
}

runTest().catch((e: any) => console.error(e));
