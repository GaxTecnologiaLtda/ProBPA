const admin = require('./node_modules/firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    const snap = await db.collection("municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/W1Tle7q1NUKkQiIgvEFI/extractions/2025/competences").get();
    console.log("2025 competences:", snap.docs.map(d => d.id));
    for (const doc of snap.docs) {
       const recs = await doc.ref.collection("extraction_records").limit(1).get();
       console.log("has records?", doc.id, recs.size);
       const resumos = await doc.ref.collection("resumo_producao").limit(1).get();
       console.log("has resumo?", doc.id, resumos.size);
    }
}
run().then(() => process.exit(0)).catch(console.error);
