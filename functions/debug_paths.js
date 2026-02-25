const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  const snap = await db.collectionGroup('resumo_producao').limit(10).get();
  snap.docs.forEach(d => {
      console.log(d.ref.path);
      // Determine if it's manual or connector
      if (d.ref.path.includes('competencias')) {
          console.log("-> Manual format detected");
      } else if (d.ref.path.includes('extractions')) {
          console.log("-> Connector format detected");
      }
  });
  console.log("Total found in sample:", snap.size);
}

check().catch(console.error);
