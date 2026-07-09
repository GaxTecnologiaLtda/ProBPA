import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'probpa-025'
    });
}

const db = admin.firestore();

async function run() {
    try {
        const collectionPath = '/municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/HwG1ZsOFSXLEbynV6QXZ/extractions/2026/competences/02-2026/extraction_records';
        console.log(`Fetching records from collection ${collectionPath}`);
        
        const snapshot = await db.collection(collectionPath).get();
        console.log(`Found ${snapshot.size} records.`);
        
        const records: any[] = [];
        snapshot.forEach(doc => {
            records.push({
                docId: doc.id,
                ...doc.data()
            });
        });

        const outputPath = path.join(__dirname, 'agua_preta_02_2026.json');
        fs.writeFileSync(outputPath, JSON.stringify(records, null, 2), 'utf-8');
        console.log(`\nData successfully written to: ${outputPath}`);

    } catch (e: any) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}

run();
