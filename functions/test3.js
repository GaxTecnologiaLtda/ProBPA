const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function run() {
    try {
        const snap = await db.collection("municipalities").limit(1).get();
        console.log("Size:", snap.size);
    } catch (e) {
        console.error("ERROR:", e);
    }
}
run();
