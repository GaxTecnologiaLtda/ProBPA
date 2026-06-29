import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'probpa-025' // assuming probpa-025
    });
}

const db = admin.firestore();

async function run() {
    try {
        const cns = "705001681762957";
        const collectionPath = '/municipalities/PRIVATE/UiWOuDVIdwoam3BTae8o/2BGe8RORtiVY632OrU2m/extractions/2026/competences/03-2026/extraction_records';
        
        console.log(`Fetching records from collection ${collectionPath} for CNS ${cns}`);
        
        // We will query the collection directly to save bandwidth
        const snapshot = await db.collection(collectionPath)
            .where('professional.cns', '==', cns)
            .get();
            
        console.log(`Found ${snapshot.size} records.`);
        
        const records: any[] = [];
        snapshot.forEach(doc => {
            records.push({
                docId: doc.id,
                ...doc.data()
            });
        });

        const outputPath = path.join(__dirname, 'catende_joicy_03_2026.json');
        fs.writeFileSync(outputPath, JSON.stringify(records, null, 2), 'utf-8');
        console.log(`\nData successfully written to: ${outputPath}`);

    } catch (e: any) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}

run();
