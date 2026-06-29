import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function run() {
    const targetId = 'qUDkofwjTa3XVddMraAD';
    const currentId = 'wfgKMoGlzgf5OKzCK3PJ_09945677403';
    
    console.log(`Moving professional from ${currentId} to ${targetId}...`);
    
    const docRef = db.collection('professionals').doc(currentId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
        console.error(`Professional ${currentId} not found!`);
        return;
    }
    
    const data = docSnap.data()!;
    data.id = targetId; // Update internal ID field
    
    // Create new document in professionals
    await db.collection('professionals').doc(targetId).set(data);
    console.log(`Created root professional doc with ID: ${targetId}`);
    
    // Get entity type
    let pathType = 'PUBLIC';
    const entDoc = await db.collection('entities').doc(data.entityId).get();
    if (entDoc.exists && entDoc.data()?.type?.toUpperCase().includes('PRIV')) {
        pathType = 'PRIVATE';
    }
    
    // Create in municipality subcollections
    if (data.assignments && Array.isArray(data.assignments)) {
        for (const assignment of data.assignments) {
            if (assignment.municipalityId) {
                const subPath = `municipalities/${pathType}/${data.entityId}/${assignment.municipalityId}/professionals`;
                await db.collection(subPath).doc(targetId).set(data);
                console.log(`Created in ${subPath}/${targetId}`);
                
                // delete the old wrong one from subcollection
                await db.collection(subPath).doc(currentId).delete();
                console.log(`Deleted from ${subPath}/${currentId}`);
            }
        }
    }
    
    // Delete the root document of the wrong ID
    await db.collection('professionals').doc(currentId).delete();
    console.log(`Deleted root professional doc: ${currentId}`);
    
    console.log('Operation completed successfully!');
}

run().catch(console.error);
