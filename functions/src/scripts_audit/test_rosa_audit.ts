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

    // Find Professional Rosa de Lima Araújo Pereira
    console.log("Buscando a profissional Rosa de Lima Araújo Pereira...");
    const profsSnap = await db.collection(`${baseMunPath}/professionals`).get();
    let rosaId = '';
    profsSnap.forEach(d => {
        const p = d.data();
        if (p.name && p.name.toUpperCase().includes('ROSA DE LIMA')) {
            rosaId = d.id;
            console.log(`Encontrada! ID: ${rosaId} | Nome: ${p.name}`);
        }
    });

    if (!rosaId) {
        console.log("Profissional não encontrada.");
        return;
    }

    const unitIds = ['bFPvDAD3uXFVV5eCy4OH', '1pLxTu0VSvmrfHEZVAV3']; // Hospital, Rio do Feijao

    // Check manual records
    console.log("\n--- AUDITORIA MANUAL (bpai_records) ---");
    for (const uId of unitIds) {
        console.log(`Unidade ID: ${uId}`);
        const sumRef = db.collection(`${baseMunPath}/bpai_records/${uId}/professionals/${rosaId}/competencias/${compFilter}/resumo_producao`);
        const sums = await sumRef.get();
        console.log(`  Encontrados ${sums.size} resumos de produção para Fev 2026.`);
        sums.forEach(d => {
            console.log(`  Doc: ${d.id}`);
            console.log(`  Dados:`, JSON.stringify(d.data(), null, 2));
        });
    }

    // Check connector extractions
    console.log("\n--- AUDITORIA CONECTOR (extractions) ---");
    const connectorRef = db.collection(`${baseMunPath}/extractions/2026/competences/02-2026/resumo_producao`);
    const connSums = await connectorRef.get();
    let rosaConnCount = 0;
    connSums.forEach(d => {
        const data = d.data();
        if (data.units) {
            for (const uId of Object.keys(data.units)) {
                if (data.units[uId].professionals && data.units[uId].professionals[rosaId]) {
                    rosaConnCount++;
                    console.log(`  Encontrado no conector! Data: ${d.id} | Unidade: ${uId}`);
                    console.log(`  Dados Prof:`, JSON.stringify(data.units[uId].professionals[rosaId], null, 2));
                }
            }
        }
    });
    console.log(`  Total de dias no conector: ${rosaConnCount}`);
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
