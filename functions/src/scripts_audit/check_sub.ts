import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});
const db = admin.firestore();

async function run() {
    const p = `municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/W1Tle7q1NUKkQiIgvEFI/extractions/2024`;
    console.log("Checking:", p);
    const doc = await db.doc(p).get();
    console.log("2024 doc exists:", doc.exists);
    const cols = await db.doc(p).listCollections();
    console.log("collections:", cols.map(c => c.id));
}

run().catch(console.error);
