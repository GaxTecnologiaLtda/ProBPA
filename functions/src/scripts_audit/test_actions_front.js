const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'probpa-025' });

const db = admin.firestore();

async function run() {
    const fakePatientId = 'h5Og8UYehjUuxtLQfTPg'; 
    const claims = { entityId: 'wfgKMoGlzgf5OKzCK3PJ' };

    console.log("Running EXACT front-end query...");
    try {
        const prodGroupQuery = db.collectionGroup('production')
            .where('patientId', '==', fakePatientId)
            .where('entityId', '==', claims.entityId);
            
        const querySnap = await prodGroupQuery.get();
        console.log(`Query succeeded! Found ${querySnap.size} records.`);
    } catch (e) {
        console.error("Query failed with error:", e);
    }
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
