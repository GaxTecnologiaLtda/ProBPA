import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';
    const compFilter = '2026-02';
    const baseMunPath = `municipalities/PRIVATE/${entityId}/${munId}`;
    const uId = 'bFPvDAD3uXFVV5eCy4OH'; // HOSPITAL GOVERNADOR JOSÉ VARELA

    console.log(`Buscando profs do hospital...`);
    const manRef = db.collection(`${baseMunPath}/bpai_records/${uId}/professionals`);
    const profsSnap = await manRef.get();

    console.log(`Qtd: ${profsSnap.size}`);

    // Fallback: listDocuments to deal with phantom docs?
    const docs = await manRef.listDocuments();
    console.log(`List Qtd: ${docs.length}`);

    for (const d of docs) {
        console.log(`Prof: ${d.id}`);
        // let's grab the competencias list
        const comps = await db.collection(`${baseMunPath}/bpai_records/${uId}/professionals/${d.id}/competencias`).listDocuments();
        console.log(`  Comps: ${comps.map(c => c.id).join(', ')}`);

        const sumRef = db.collection(`${baseMunPath}/bpai_records/${uId}/professionals/${d.id}/competencias/${compFilter}/resumo_producao`);
        const sums = await sumRef.get();
        console.log(`  Resumos Fev: ${sums.size}`);
    }
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
