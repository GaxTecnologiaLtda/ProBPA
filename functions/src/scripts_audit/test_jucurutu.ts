import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    let fixable = 0;
    let unfixable = 0;
    const snap = await db.collection('municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/NTH6qE46dU2ytddqnmTu/extractions/2026/competences/01-2026/extraction_records').get();

    snap.forEach(d => {
        const data = d.data();
        if (!data.unit || !data.unit.cnes) {
            const extId = String(data.externalId || '');
            if (!extId.startsWith('_-_') && !extId.startsWith('null-') && extId.split('-')[0].length === 7) {
                fixable++;
            } else {
                unfixable++;
                console.log(`Unfixable externalId in ${d.id}:`, extId, data.procedure?.code);
            }
        }
    });

    console.log(`01-2026 Fixable: ${fixable}, Unfixable: ${unfixable}`);
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
