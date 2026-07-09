import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

async function runTest() {
    // A professional that should have unknown units, e.g., Luiza Pamela
    const profName = "Luiza Pamela Silva da Costa";
    // We know 'wfgKMoGlzgf5OKzCK3PJ' from previous logs

    // Check all extraction_records for this professional in 03-2026
    const cg = db.collectionGroup("extraction_records");
    const snap = await cg.where("professional.name", "==", profName).get();

    console.log(`Encontradas ${snap.size} fichas totais para ${profName}.`);

    for (const doc of snap.docs) {
        const rec = doc.data() as any;
        const pathParts = doc.ref.path.split('/');
        // municipalities/PRIVATE/{entityId}/{munId}/extractions/{year}/competences/{competence}/extraction_records/{docId}
        const type = pathParts[1];
        const entId = pathParts[2];
        const munId = pathParts[3];

        console.log(`\n>> doc ID: ${doc.id}`);
        console.log(`   Path: ${doc.ref.path}`);
        console.log(`   productionDate: ${rec.productionDate}`);
        console.log(`   unit cnes: ${rec.unit?.cnes}`);
        console.log(`   ext Id: ${rec.externalId}`);

        // 1. Fetch valid CNES list
        const unitsRef = db.collection(`municipalities/${type}/${entId}/${munId}/units`);
        const unitsSnap = await unitsRef.get();
        const validCnesList = unitsSnap.docs.map(d => d.data().cnes).filter(c => !!c).map(c => String(c).trim());
        const validCnesSet = new Set(validCnesList);

        console.log(`   Valid CNES for ${entId}/${munId}: ${validCnesSet.size} units`);
        if (validCnesSet.has(String(rec.unit?.cnes).trim())) {
            console.log(`   [!] Unit CNES ${rec.unit?.cnes} IS in valid set.`);
        } else {
            console.log(`   [!] Unit CNES ${rec.unit?.cnes} is NOT in valid set.`);
        }

        // 2. Simulate B
        const recCnesRaw = String(rec.unit?.cnes || '');
        let resolvedCnes = recCnesRaw.trim();
        const extId = String(rec.externalId || '');

        if (!resolvedCnes && extId && !extId.startsWith('_-_') && !extId.startsWith('null-')) {
            const possibleCnes = extId.split('-')[0];
            if (possibleCnes && possibleCnes.length === 7 && !isNaN(Number(possibleCnes))) {
                resolvedCnes = possibleCnes;
                console.log(`   [!] Resolved CNES from externalId: ${resolvedCnes}`);
            }
        }

        // It is a true 'unknown_unit' if the resolved CNES is empty OR not in the valid set
        const isUnknownUnit = !resolvedCnes || !validCnesSet.has(resolvedCnes);
        console.log(`   [!] isUnknownUnit: ${isUnknownUnit}`);
    }
}

runTest().catch((e: any) => console.error(e));
