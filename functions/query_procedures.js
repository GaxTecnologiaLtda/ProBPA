const admin = require('firebase-admin');
admin.initializeApp({
  projectId: 'probpa-025'
});
const db = admin.firestore();

async function run() {
  const snap = await db.collectionGroup('procedures').where('entityId', '==', 'x0eK7TItAowrAEMt4b5K').limit(5).get();
  snap.docs.forEach(doc => {
      console.log('Path:', doc.ref.path);
      console.log('Data:', JSON.stringify(doc.data()).substring(0, 100));
  });
}
run();
