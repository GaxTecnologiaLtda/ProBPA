import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';

    console.log(`Buscando extrações do Polo (Polo ID: in0QeFoPZxzpP1kqQlwn, CNES: 9065792)...`);

    // We can search extraction_records where unit.cnes == 9065792, or just check the unknown_unit records.
    const extRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/02-2026/extraction_records`);
    const snap = await extRef.limit(100).get(); // Let's just find some unknown_unit records and see their raw data


    snap.forEach(d => {
        const data = d.data();
        if (data.mappedUnitId === 'unknown_unit' || !data.mappedUnitId) { // aggregate might only set this on raw if we updated it? No, aggregate sets it on resumo...
            // the raw records have `unit` object from connector
            if (data.unit?.cnes === '9065792' || String(data.externalId).includes('9065792')) {
                console.log(`Achei um registro bruto que deveria ir pro Polo: ${d.id}`);
                console.log(`CNES bruto: ${data.unit?.cnes || 'N/A'}, ExtID: ${data.externalId}`);
            } else if (!data.unit?.cnes) {
                // maybe it's completely missing
                // console.log(`Registro sem CNES: ExtID = ${data.externalId}`);
            }
        }
    });

    console.log("Checando resumo de produção...");
    const resumoSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/02-2026/resumo_producao`).get();
    resumoSnap.forEach(r => {
        const data = r.data();
        console.log(`Resumo: ${r.id}`);
        console.log(`Unidades presentes nas extrações: ${Object.keys(data.units || {}).join(', ')}`);
    });

    console.log("Checando resumos manuais do Polo...");
    const profs = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/professionals`).get();
    for (const p of profs.docs) {
        const manSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/professionals/${p.id}/competencias/2026-02/resumo_producao`).get();
        manSnap.forEach(r => {
            const data = r.data();
            if (data.units && data.units['in0QeFoPZxzpP1kqQlwn']) {
                console.log(`Encontrado resumo manual pro Polo no profissional ${p.id}!`);
            }
        });
    }
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
