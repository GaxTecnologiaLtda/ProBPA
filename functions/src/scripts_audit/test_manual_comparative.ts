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

    console.log(`Buscando profs em ${baseMunPath}/professionals...`);
    const profsQuery = await db.collection(`${baseMunPath}/professionals`).get();
    const profIds = profsQuery.docs.map(doc => doc.id);
    console.log(`Encontrados ${profIds.length} profissionais ativos/cadastrados.`);

    let totalDocsFound = 0;

    const manualPromises = profIds.map(async (profId) => {
        const manualRef = db.collection(`${baseMunPath}/professionals/${profId}/competencias/${compFilter}/resumo_producao`);
        try {
            const snap = await manualRef.get();
            if (!snap.empty) {
                console.log(`Profissional ${profId} tem ${snap.size} documentos de resumo!`);
                snap.forEach(d => {
                    const data = d.data();
                    console.log(`  -> Unidades: ${Object.keys(data.units || {}).join(', ')}`);
                });
            }
            return snap.docs;
        } catch (e) {
            console.error(`Erro buscando ${profId}:`, e);
            return [];
        }
    });

    const results = await Promise.all(manualPromises);
    results.forEach(docsArray => {
        totalDocsFound += docsArray.length;
    });

    console.log(`\nNo final das Promises, encontrei um total de ${totalDocsFound} documentos de resumo manual.`);
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
