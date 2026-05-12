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

    console.log(`Buscando unidades...`);
    const unitsQuery = await db.collection(`${baseMunPath}/units`).get();
    const unitIds = unitsQuery.docs.map(doc => doc.id);

    const manualPromises = unitIds.map(async (uId) => {
        const manualRef = db.collection(`${baseMunPath}/bpai_records/${uId}/professionals`);
        try {
            const profsDocs = await manualRef.listDocuments();
            const pPromises = profsDocs.map(async (pDoc) => {
                const pId = pDoc.id;
                const sumRef = db.collection(`${baseMunPath}/bpai_records/${uId}/professionals/${pId}/competencias/${compFilter}/resumo_producao`);
                const snap = await sumRef.get();
                return snap.docs;
            });
            const pDocsArrays = await Promise.all(pPromises);
            return pDocsArrays.flat();
        } catch (e) {
            return [];
        }
    });

    const results = await Promise.all(manualPromises);
    const allDocs = results.flat();
    console.log(`Encontrados ${allDocs.length} resumos manuais.`);
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
