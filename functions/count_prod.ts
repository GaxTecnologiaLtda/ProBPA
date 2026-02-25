import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

async function countProduction(month: string) {
    const path = `municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/Uf062kriogg0ys31zC4M/extractions/2026/competences/${month}-2026/resumo_producao`;
    console.log(`Checking path: ${path}`);

    try {
        const snap = await db.collection(path).get();
        let total = 0;
        let cboTotal = 0;
        let cnsTotal = 0;

        snap.forEach(doc => {
            const data = doc.data();
            total += Number(data.totalQuantity || 0);
        });

        console.log(`Total records in collection: ${snap.size}`);
        console.log(`Total Quantity for ${month}-2026: ${total}`);
    } catch (e) {
        console.error(e);
    }
}

async function run() {
    await countProduction('01');
    await countProduction('02');
    process.exit(0);
}

run();
