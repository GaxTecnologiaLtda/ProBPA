import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';
    const targetYear = '2026';

    console.log(`=== AUDITORIA PEDRO AVELINO (${targetYear}) ===\n`);

    // 1. Manual Production (bpai_records) using collectionGroup strategy to bypass phantom docs
    console.log(`1. Consultando Produção Manual detalhada (bpai_records)...`);

    // As "dates" are subcollections under "competencias"
    const datesSnap = await db.collectionGroup('dates').get();

    let totalManualByComp: Record<string, number> = {};
    let matchedPaths = 0;

    for (const doc of datesSnap.docs) {
        const path = doc.ref.path;
        // Format: municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/NTH6qE46dU2ytddqnmTu/bpai_records/.../competencias/{comp}/dates/{date}
        if (path.includes(`municipalities/PRIVATE/${entityId}/${munId}/bpai_records`)) {
            const pathParts = path.split('/');
            const compIndex = pathParts.indexOf('competencias');
            if (compIndex !== -1 && pathParts.length > compIndex + 1) {
                const comp = pathParts[compIndex + 1]; // e.g., '2026-03'
                if (comp.startsWith(targetYear)) {
                    if (!totalManualByComp[comp]) totalManualByComp[comp] = 0;
                    totalManualByComp[comp]++;
                    matchedPaths++;
                }
            }
        }
    }

    console.log(`   [DEBUG] Found ${matchedPaths} valid date sheets in bpai_records for ${targetYear}.`);

    console.log(`\n-> Resumo Produção Manual por Competência (${targetYear}):`);
    for (const comp in totalManualByComp) {
        console.log(`   - ${comp}: ${totalManualByComp[comp]} dias de atendimento registrados`);
    }
    if (Object.keys(totalManualByComp).length === 0) {
        console.log(`   - Nenhuma produção manual encontrada para ${targetYear}.`);
    }
    console.log('');

    // 2. Extracted Production (extractions) - Fix for Phantom Docs
    console.log(`2. Consultando Produção do Conector (extractions/${targetYear})...`);
    for (let month = 1; month <= 12; month++) {
        const comp = `${month.toString().padStart(2, '0')}-${targetYear}`;
        const extRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/${targetYear}/competences/${comp}/extraction_records`);
        const countSnap = await extRef.count().get();
        const cnt = countSnap.data().count;
        if (cnt > 0) {
            console.log(`   - ${comp}: ${cnt} fichas recebidas no Conector`);
        }
    }

}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
