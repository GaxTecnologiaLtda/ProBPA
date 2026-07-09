import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';

    console.log(`Buscando ALL resumos de produção manuais usando collectionGroup...`);
    const allSummariesSnap = await db.collectionGroup('resumo_producao').get();

    let foundCount = 0;
    allSummariesSnap.forEach(doc => {
        const path = doc.ref.path;
        if (path.includes(`municipalities/PRIVATE/${entityId}/${munId}`) && path.includes('professionals') && !path.includes('extractions')) {
            console.log(`Encontrei um resumo manual em: ${path}`);
            foundCount++;
        }
    });

    console.log(`\nTotal de resumos manuais reais encontrados: ${foundCount}`);
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
