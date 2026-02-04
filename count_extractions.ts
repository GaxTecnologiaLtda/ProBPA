
import * as admin from 'firebase-admin';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function countDocs() {
  const munId = 'Uf062kriogg0ys31zC4M';
  // Assuming 'public_entities' for now based on previous context, but user provided specific ID.
  // Path: municipalities/{entityType}/... oh wait, we don't know the exact path structure perfectly without checking 
  // 'municipalities' collection structure. But likely: municipalities > {entityType} > {entityId} > {munId} > extractions
  // Since we don't know entityId/Type, let's use collectionGroup to find the subcollection by ID? No, collectionGroup queries by collection NAME.
  // Let's search for the municipality document first to get the path.
  
  console.log('Searching for municipality document...');
  const snapshot = await db.collectionGroup('municipalities').where('id', '==', munId).get();
  
  if (snapshot.empty) {
      // Maybe it is a root collection?
      const doc = await db.collection('municipalities').doc(munId).get();
      if(doc.exists) {
          console.log('Found at root: ' + doc.ref.path);
          await countExtractions(doc.ref.path);
          return;
      }
      console.log('Municipality not found via collectionGroup or root.');
      return;
  }
  
  const munDoc = snapshot.docs[0];
  console.log('Found path: ' + munDoc.ref.path);
  await countExtractions(munDoc.ref.path);
}

async function countExtractions(path: string) {
    const collRef = db.doc(path).collection('extractions');
    const countSnapshot = await collRef.count().get();
    console.log('TOTAL RECORDS: ' + countSnapshot.data().count);
}

countDocs();

