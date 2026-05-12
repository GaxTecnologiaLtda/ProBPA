import * as admin from 'firebase-admin';
admin.initializeApp();
const db = admin.firestore();
async function run() {
    const goalsRef = await db.collection('municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/W1Tle7q1NUKkQiIgvEFI/goals/2026/goals').get();
    console.log("Goals size:", goalsRef.docs.length);
    
    // Check competence folders
    const comps = await db.collection('municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/W1Tle7q1NUKkQiIgvEFI/extractions/2024/competences').get();
    console.log("Competences size:", comps.docs.length);
    console.log("Competences ids:", comps.docs.map(d => d.id));
}
run().catch(console.error);
