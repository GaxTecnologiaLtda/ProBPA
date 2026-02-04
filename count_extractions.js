
const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function countDocs() {
  const munId = 'Uf062kriogg0ys31zC4M';
  console.log('Searching for municipality document: ' + munId);
  const snapshot = await db.collectionGroup('municipalities').where('id', '==', munId).get();
  
  if (snapshot.empty) {
      // Try fetching by ID directly in known entity types? Or just assume path?
      // Let's assume public_entities... Uf062kriogg0ys31zC4M
      // But we don't know EntityID. 
      // Let's try to query 'municipalities' collection group? Wait, 'municipalities' is the subcollection name usually?
      // No, 'municipalities' is the subcollection under 'public_entities/{entityId}/municipalities'.
      // So collectionGroup('municipalities') should work if that's the name.
      
      console.log('Not found via collectionGroup query.');
      
      // Try root?
      const doc = await db.collection('municipalities').doc(munId).get();
      if(doc.exists) {
          console.log('Found at root: ' + doc.ref.path);
          await countExtractions(doc.ref.path);
          return;
      }
      return;
  }
  
  const munDoc = snapshot.docs[0];
  console.log('Found path: ' + munDoc.ref.path);
  await countExtractions(munDoc.ref.path);
}

async function countExtractions(path) {
    const collRef = db.doc(path).collection('extractions');
    const countSnapshot = await collRef.count().get();
    console.log('TOTAL RECORDS: ' + countSnapshot.data().count);
}

countDocs();

