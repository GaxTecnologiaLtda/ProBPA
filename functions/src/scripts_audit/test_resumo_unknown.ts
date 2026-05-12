import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';

    console.log(`Verificando os resumos de produção gerados na Extração...`);
    const resumoSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/02-2026/resumo_producao`).get();

    let unknownUnitPresent = false;
    resumoSnap.forEach(d => {
        const data = d.data();
        if (data.units && data.units['unknown_unit']) {
            unknownUnitPresent = true;
            console.log(`[ALERTA] unknown_unit encontrado no documento: ${d.id}`);
            const profs = data.units['unknown_unit'].professionals;
            console.log(`Profissionais envolvidos em unknown_unit:`, Object.keys(profs));
        }
    });

    if (!unknownUnitPresent) {
        console.log(`NENHUM unknown_unit presente na base conectora gerada.`);
    }

    console.log(`\nVerificando os resumos de produção gerados na Manual...`);
    const profsSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/professionals`).get();
    let manualUnknownPresent = false;
    for (const p of profsSnap.docs) {
        const manSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/professionals/${p.id}/competencias/2026-02/resumo_producao`).get();
        manSnap.forEach(d => {
            const data = d.data();
            if (data.units && data.units['unknown_unit']) {
                manualUnknownPresent = true;
                console.log(`[ALERTA] unknown_unit encontrado no documento manual PId: ${p.id}`);
            }
        });
    }

    if (!manualUnknownPresent) {
        console.log(`NENHUM unknown_unit presente na base manual.`);
    }

}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
