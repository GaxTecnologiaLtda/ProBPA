import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';

    console.log(`Buscando extrações brutas que foram agregadas como unknown_unit...`);
    const extRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/02-2026/extraction_records`);
    const snap = await extRef.get();

    console.log(`Buscando unidades registradas...`);
    const unitsRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/units`);
    const unitsSnap = await unitsRef.get();
    const cnesMap = new Map<string, string>();
    unitsSnap.forEach(d => {
        const u = d.data();
        if (u.cnes) cnesMap.set(String(u.cnes).trim(), d.id);
    });

    // We will simulate the aggregator's unit resolution to find which records become unknown_unit
    let unknownUnitCount = 0;

    snap.forEach(d => {
        const data = d.data();
        const recCnesRaw = String(data.unit?.cnes || '');
        let recCnes = recCnesRaw.trim();

        const extId = String(data.externalId || '');
        if (!recCnes && extId && !extId.startsWith('_-_') && !extId.startsWith('null-')) {
            const possibleCnes = extId.split('-')[0];
            if (possibleCnes && possibleCnes.length === 7 && !isNaN(Number(possibleCnes))) {
                recCnes = possibleCnes;
            }
        }

        const unitMatch = cnesMap.get(recCnes);
        const uId = unitMatch || (recCnes ? `cnes_${recCnes}` : 'unknown_unit');

        if (uId === 'unknown_unit') {
            unknownUnitCount++;
            console.log(`[UNKNOWN_UNIT] ExtID: ${data.externalId} | recCnesRaw: ${recCnesRaw}`);
        }
    });

    console.log(`\nTotal de registros que cairam em unknown_unit (antes da glosa): ${unknownUnitCount}`);

}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
