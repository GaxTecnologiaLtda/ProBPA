const admin = require('firebase-admin');
admin.initializeApp({projectId: 'probpa-025'});
const db = admin.firestore();

async function findUnit() {
    const s = await db.collectionGroup('units').get();
    s.docs.forEach(d => {
        if(d.data().name && d.data().name.includes('BOA SAUDE')) {
            console.log(`ID: ${d.id}, Name: ${d.data().name}, Path: ${d.ref.path}`);
        }
    });
}

findUnit();
