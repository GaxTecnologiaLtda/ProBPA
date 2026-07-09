const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'probpa-025' });

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const fakePatientId = 'h5Og8UYehjUuxtLQfTPg'; 

    console.log("Checking persons doc...");
    const personDoc = await db.collection('entities').doc(entityId).collection('persons').doc(fakePatientId).get();
    console.log("Persons Name:", personDoc.exists ? personDoc.data().name : 'Not found');
    
    console.log("Checking production doc...");
    const prodDocs = await db.collectionGroup('production').where('patientId', '==', fakePatientId).get();
    prodDocs.forEach(doc => {
        console.log("Production Path:", doc.ref.path);
        console.log("Production Patient Name:", doc.data().patient.name);
    });
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
