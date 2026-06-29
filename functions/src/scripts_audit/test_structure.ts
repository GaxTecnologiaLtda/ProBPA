import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const munRef = db.doc('municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/NTH6qE46dU2ytddqnmTu');
    const cols = await munRef.listCollections();

    console.log("Subcollections of Pedro Avelino:");
    for (const col of cols) {
        console.log(`- ${col.id}`);
        // Let's get the first doc
        const first = await col.limit(1).get();
        if (!first.empty) console.log(`  -> Contains ${first.size} docs visible at root`);
        else console.log(`  -> Empty root docs (phantom structure)`);
    }

    // Since bpai_records might be phantom root, let's explicitly list subcollections of '1pLxTu0VSvmrfHEZVAV3'
    const unitRef = db.doc('municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/NTH6qE46dU2ytddqnmTu/bpai_records/1pLxTu0VSvmrfHEZVAV3');
    const unitCols = await unitRef.listCollections();
    console.log("\nSubcollections of bpai_records/1pLxTu0VSvmrfHEZVAV3:");
    for (const col of unitCols) {
        console.log(`- ${col.id}`);
        const first = await col.limit(1).get();
        if (!first.empty) console.log(`  -> Contains ${first.size} docs visible at root`);
        else console.log(`  -> Empty root docs`);
    }
}

run().then(() => process.exit(0));
