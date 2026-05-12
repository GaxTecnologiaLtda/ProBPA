const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'probpa-025' });

const db = admin.firestore();

async function run() {
    const fakePatientId = 'h5Og8UYehjUuxtLQfTPg'; 
    const querySnap = await db.collectionGroup('production').where('patientId', '==', fakePatientId).get();
    
    const batch = db.batch();
    
    querySnap.forEach(docSnap => {
        const existingData = docSnap.data();
        try {
            batch.update(docSnap.ref, {
                'patient.name': 'KELIANNE DOS SANTOS GUILHE',
                'patient.cns': existingData.patient?.cns || '',
                'patient.cpf': existingData.patient?.cpf || '',
                'patient.birthDate': existingData.patient?.birthDate || '',
                'patient.sex': existingData.patient?.sex || ''
            });
            console.log("Batch update drafted successfully.");
        } catch (e) {
            console.error("Batch update draft failed:", e);
        }
    });
    
    try {
        await batch.commit();
        console.log("Committed.");
    } catch (e) {
        console.error("Commit failed:", e);
    }
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
