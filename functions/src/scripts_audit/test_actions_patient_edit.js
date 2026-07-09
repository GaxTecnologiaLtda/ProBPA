const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'probpa-025' });

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    
    // Pick any random patient that has production
    console.log("Searching for recent productions...");
    const prodSnap = await db.collectionGroup('production').limit(1).get();
    
    if (prodSnap.empty) {
        console.log("No production found.");
        return;
    }
    
    const prodDoc = prodSnap.docs[0];
    const patientId = prodDoc.data().patientId;
    console.log("Found production for patient:", patientId);
    console.log("Production data:", prodDoc.data());
    
    // Check patient in persons
    const personSnap = await db.collection('entities').doc(entityId).collection('persons').doc(patientId).get();
    if (personSnap.exists) {
        console.log("Person data:", personSnap.data());
    } else {
        console.log("Person does not exist in /persons!");
    }
    
    // Check collection group query
    try {
        const querySnap = await db.collectionGroup('production').where('patientId', '==', patientId).get();
        console.log(`Collection Group query found ${querySnap.size} records.`);
    } catch (e) {
        console.error("Collection Group query failed:", e);
    }
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
