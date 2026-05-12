import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const munId = 'NTH6qE46dU2ytddqnmTu';
    console.log("Searching for dates collections globally...");
    const datesSnap = await db.collectionGroup('dates').get();

    let count = 0;
    for (const doc of datesSnap.docs) {
        if (doc.ref.path.includes(munId)) {
            console.log(`Found: ${doc.ref.path}`);
            count++;
        }
    }
    console.log(`Total dates found for Pedro Avelino: ${count}`);
}

run().then(() => process.exit(0));
