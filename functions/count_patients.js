const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function count() {
  const coll = db.collection('ultra_ingestion_test').doc('secretaria-de-saude-de-catende').collection('cidadania_base');
  const snap = await coll.count().get();
  console.log("Total patients:", snap.data().count);
}
count().catch(console.error);
