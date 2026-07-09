import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';

    console.log(`=== AUDITORIA PEDRO AVELINO ===\n`);

    // 1. Manual Production (bpai_records -> procedures)
    console.log(`1. Consultando Produção Manual detalhada (bpai_records)...`);

    // We will use collectionGroup('procedures') to find all procedures across the db
    // and filter them by the specific path pattern provided by the user.
    // Path pattern: municipalities/PRIVATE/{entityId}/{munId}/bpai_records/{unit}/professionals/{prof}/competencias/{comp}/dates/{date}/pacientes/{pat}/procedures/{proc}

    const proceduresSnap = await db.collectionGroup('procedures').get();

    let manualByComp: Record<string, number> = {};
    let totalManual = 0;

    proceduresSnap.forEach(doc => {
        const path = doc.ref.path;
        if (path.includes(`municipalities/PRIVATE/${entityId}/${munId}/bpai_records`)) {
            const parts = path.split('/');
            const compIndex = parts.indexOf('competencias');
            if (compIndex !== -1 && parts.length > compIndex + 1) {
                const comp = parts[compIndex + 1]; // e.g. 2026-03
                if (!manualByComp[comp]) manualByComp[comp] = 0;

                // Usually the 'quantity' field specifies how many were done, if not, we count as 1.
                const data = doc.data();
                const qty = Number(data.quantity) || 1;

                manualByComp[comp] += qty;
                totalManual += qty;
            }
        }
    });

    console.log(`-> Resumo Produção Manual (Procedimentos) por Competência:`);
    for (const comp in manualByComp) {
        console.log(`   - ${comp}: ${manualByComp[comp]} procedimentos registrados manualmente`);
    }
    if (Object.keys(manualByComp).length === 0) {
        console.log(`   - Nenhuma produção manual encontrada no path especificado.`);
    }
    console.log(`-> TOTAL MANUAL GERAL: ${totalManual}\n`);


    // 2. Extracted Production (extractions) - All Competences
    console.log(`2. Consultando Produção Bruta do Conector (extractions) por competência...`);

    // Let's crawl through 2025 and 2026 just to be thorough and find everything available
    const yearsToAudit = ['2025', '2026'];

    for (const year of yearsToAudit) {
        for (let month = 1; month <= 12; month++) {

            const compMY = `${month.toString().padStart(2, '0')}-${year}`;

            // Connectors typically save as MM-YYYY in extractions/YYYY/competences/MM-YYYY
            const extRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/${year}/competences/${compMY}/extraction_records`);
            const countSnap = await extRef.count().get();
            const cnt = countSnap.data().count;

            if (cnt > 0) {
                console.log(`   - ${compMY}: ${cnt} fichas recebidas no Conector`);
            }
        }
    }

}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
