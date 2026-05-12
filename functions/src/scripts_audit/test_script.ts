import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const path = "municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/NTH6qE46dU2ytddqnmTu/extractions/2026/competences/02-2026/extraction_records";
    console.log("Querying:", path);

    const ref = db.collection(path);
    const snap = await ref.limit(5).get();

    console.log(`Found ${snap.size} records limit 5`);
    snap.forEach(doc => {
        console.log(doc.id, JSON.stringify(doc.data(), null, 2));
    });
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
