import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = "wfgKMoGlzgf5OKzCK3PJ"; // Assuming same entity
    const municipalityId = "AfF1O2pVaDF5C6HJ3NYn"; // Pedro Avelino
    const basePath = `municipalities/PRIVATE/${entityId}/${municipalityId}/extractions/2026/competences`;
    console.log(`Analyzing Pedro Avelino in ${basePath}\n`);

    const competences = ['01-2026', '02-2026', '03-2026'];

    let totalRecords = 0;
    let unknownUnitCount = 0;
    let fixableByExternalId = 0;
    let externalIdHasNoCnesButUnitHas = 0;
    let proceduresWithoutCode = 0;

    for (const comp of competences) {
        console.log(`\n--- Competence: ${comp} ---`);

        const recordsPath = `${basePath}/${comp}/extraction_records`;
        const recordsSnap = await db.collection(recordsPath).get();

        let compTotal = 0;
        let compUnknown = 0;
        let compFixable = 0;
        let compCnesInUnitNoExtId = 0;
        let compProcNoCode = 0;

        recordsSnap.forEach(d => {
            const data = d.data();
            compTotal++;

            const extId = String(data.externalId || '');
            const unitCnes = data.unit?.cnes || null;

            // Check procedure code
            const pCode = data.procedure?.code || data.procedureCode || '';
            if (!pCode || pCode === '-') {
                compProcNoCode++;
            }

            // Check CNES logic
            if (!unitCnes) {
                compUnknown++;
                // Check if externalId has a CNES (usually doesn't start with '_-')
                if (extId && !extId.startsWith('_-_') && !extId.startsWith('null-')) {
                    const possibleCnes = extId.split('-')[0];
                    if (possibleCnes && possibleCnes.length === 7) {
                        compFixable++;
                    }
                }
            } else {
                // Has unit.cnes, check if externalId explicitly omits it (starts with _-_ or something without 7 digits)
                const extPrefix = extId.split('-')[0];
                if (extPrefix.length !== 7 || extPrefix === '_') {
                    compCnesInUnitNoExtId++;
                }
            }
        });

        console.log(`Total Records: ${compTotal}`);
        console.log(`Unknown Units (unit.cnes is null): ${compUnknown}`);
        console.log(`Fixable from externalId: ${compFixable}`);
        console.log(`Has unit.cnes but externalId omitted it: ${compCnesInUnitNoExtId}`);
        console.log(`Procedures with no valid code (-): ${compProcNoCode}`);

        totalRecords += compTotal;
        unknownUnitCount += compUnknown;
        fixableByExternalId += compFixable;
        externalIdHasNoCnesButUnitHas += compCnesInUnitNoExtId;
        proceduresWithoutCode += compProcNoCode;
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total Records: ${totalRecords}`);
    console.log(`Total Unknown Units: ${unknownUnitCount}`);
    console.log(`Total Fixable by externalId: ${fixableByExternalId}`);
    console.log(`Total with CNES in unit but not in externalId: ${externalIdHasNoCnesButUnitHas}`);
    console.log(`Total Procedures without code (-): ${proceduresWithoutCode}`);

    // Let's also verify how many `unknown_unit` exist in resumo_producao exactly
    let resumoUnknown = 0;
    for (const comp of competences) {
        const resumoPath = `${basePath}/${comp}/resumo_producao`;
        const resumoSnap = await db.collection(resumoPath).get();
        resumoSnap.forEach(r => {
            const data = r.data();
            if (data.units && data.units['unknown_unit']) {
                resumoUnknown++;
            }
        });
    }
    console.log(`Total daily documents in resumo_producao containing "unknown_unit": ${resumoUnknown}`);
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
