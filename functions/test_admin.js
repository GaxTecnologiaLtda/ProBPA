const admin = require('firebase-admin');

// Try initializing with explicit project ID so the admin SDK doesn't default to pwplay
admin.initializeApp({
    projectId: 'probpa-025'
});

const db = admin.firestore();
async function run() {
    try {
        console.log("Fetching...");
        const snap = await db.collection("municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/W1Tle7q1NUKkQiIgvEFI/extractions/2024/competences").limit(1).get();
        console.log("Success! size:", snap.size);
    } catch(e) {
        console.error("Failed:", e.message);
    }
}
run();
