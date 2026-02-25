const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'probpa-025' });
const db = admin.firestore();

async function run() {
    const allSummariesSnap = await db.collectionGroup('resumo_producao').get();
    let deleted = 0;

    const batchArray = [];
    let batch = db.batch();
    let opCount = 0;

    for (const doc of allSummariesSnap.docs) {
        if (doc.ref.path.includes('municipalities/UNKNOWN')) {
            console.log('Deleting:', doc.ref.path);
            batch.delete(doc.ref);
            opCount++;
            deleted++;

            if (opCount === 500) {
                batchArray.push(batch.commit());
                batch = db.batch();
                opCount = 0;
            }
        }
    }

    if (opCount > 0) {
        batchArray.push(batch.commit());
    }

    await Promise.all(batchArray);
    console.log(`\nDeleted ${deleted} orphaned UNKNOWN summary documents.`);
}
run();
