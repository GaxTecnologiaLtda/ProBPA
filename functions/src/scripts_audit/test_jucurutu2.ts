import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const snap = await db.collection('municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/NTH6qE46dU2ytddqnmTu/extractions/2026/competences/01-2026/extraction_records').get();

    snap.forEach(d => {
        const data = d.data();
        if (!data.unit || !data.unit.cnes) {
            console.log(`\nDoc: ${d.id}`);
            console.log(`ExternalId: ${data.externalId}`);

            const extId = String(data.externalId || '');
            let recCnes = '';

            if (!recCnes && extId && !extId.startsWith('_-_') && !extId.startsWith('null-')) {
                const possibleCnes = extId.split('-')[0];
                if (possibleCnes && possibleCnes.length === 7 && !isNaN(Number(possibleCnes))) {
                    recCnes = possibleCnes;
                }
            }
            console.log(`Fallback Result recCnes: "${recCnes}"`);
        }
    });
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
