const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'probpa-025' });

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const fakePatientId = 'h5Og8UYehjUuxtLQfTPg'; // The one from user screen

    console.log("Searching productions for patient:", fakePatientId);
    
    try {
        const querySnap = await db.collectionGroup('production').where('patientId', '==', fakePatientId).get();
        console.log(`Collection Group query found ${querySnap.size} records.`);
        
        querySnap.forEach(docSnap => {
            console.log("Found at Path:", docSnap.ref.path);
            if (docSnap.ref.path.includes(`entities/${entityId}/actions/`)) {
                console.log("Path matches entity constraint!");
                const existingData = docSnap.data();
                console.log("Existing data patient object:", existingData.patient);
            } else {
                console.log("Path did NOT match entity constraint.");
            }
        });
    } catch (e) {
        console.error("Collection Group query failed:", e);
    }
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
