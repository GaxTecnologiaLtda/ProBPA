import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const targetCnes = '9065792';
    const basePath = "municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/NTH6qE46dU2ytddqnmTu/extractions/2026/competences";
    console.log(`Searching for CNES ${targetCnes} in ${basePath}`);

    const competences = ['01-2026', '02-2026', '03-2026'];

    for (const comp of competences) {
        console.log(`\n--- Competence: ${comp} ---`);

        const recordsPath = `${basePath}/${comp}/extraction_records`;
        const recordsSnap = await db.collection(recordsPath).get();
        let cnesCount = 0;
        let prefixMatchCount = 0;

        // check CNES match purely by string serialization to catch nested fields
        recordsSnap.forEach(d => {
            const dataStr = JSON.stringify(d.data());
            const data = d.data();

            if (dataStr.includes(targetCnes)) {
                cnesCount++;
            }
            if (data.externalId && typeof data.externalId === 'string' && data.externalId.startsWith(`${targetCnes}-`)) {
                prefixMatchCount++;
            }
        });

        console.log(`Records containing CNES ${targetCnes} anywhere: ${cnesCount}`);
        console.log(`Records where externalId starts with ${targetCnes}-: ${prefixMatchCount}`);

        if (cnesCount > 0) {
            // Find a sample record
            const sampleDoc = recordsSnap.docs.find(d => JSON.stringify(d.data()).includes(targetCnes));
            if (sampleDoc) {
                const data = sampleDoc.data();
                console.log(`Sample extraction record full data for ${targetCnes}:`, JSON.stringify(data, null, 2));
            }
        }

        // Check resumo_producao
        const resumoPath = `${basePath}/${comp}/resumo_producao`;
        const resumoSnap = await db.collection(resumoPath).get();
        resumoSnap.forEach(r => {
            const rData = r.data();
            let hasCnes = JSON.stringify(rData).includes(targetCnes);
            let hasUnknown = rData.units && Object.keys(rData.units).includes('unknown_unit');
            console.log(`> resumo_producao / ${r.id}: has_cnes_string=${hasCnes}, has_unknown_unit=${!!hasUnknown}`);
        });
    }
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
