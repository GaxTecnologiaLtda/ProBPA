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
        const profId = "HSRxEkd3nBxWrNwooHzC";
        console.log(`\n--- EXTRACTING ALL DATA FOR INGRID BEATRIZ (${profId}) ---\n`);

        const result: any = {
            professional: null,
            procedures: []
        };

        const profDoc = await db.doc(`professionals/${profId}`).get();
        if (profDoc.exists) {
            result.professional = { id: profDoc.id, path: profDoc.ref.path, ...profDoc.data() };
        }

        const snapshot = await db.collectionGroup('procedures')
            .where('professionalId', '==', profId)
            .get();
        
        console.log(`Found ${snapshot.size} procedures.`);

        snapshot.forEach(d => {
            const data = d.data();
            result.procedures.push({
                docId: d.id,
                path: d.ref.path,
                ...data
            });
        });

        const outputPath = path.join(__dirname, 'ingrid_data.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
        console.log(`\nData successfully written to: ${outputPath}`);

    } catch (e: any) {
        console.error("\nError reading Firestore:", e.message);
    }
    process.exit(0);
}

run();
