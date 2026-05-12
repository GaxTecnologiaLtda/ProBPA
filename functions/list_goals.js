const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function run() {
    const snap = await db.collection("municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/W1Tle7q1NUKkQiIgvEFI/goals/2026/goals").get();
    console.log("Goals length:", snap.docs.length);
    snap.docs.forEach(d => {
        const data = d.data();
        console.log(d.id, " - ", data.name, data.title, data.scope);
    });
}
run().catch(console.error);
