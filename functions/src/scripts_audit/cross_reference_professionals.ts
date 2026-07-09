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
        console.log("Loading extraction records...");
        const recordsPath = path.join(__dirname, 'agua_preta_02_2026.json');
        const records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
        console.log(`Loaded ${records.length} records.`);

        console.log("Fetching registered professionals for Água Preta...");
        const profsRef = db.collection('/municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/HwG1ZsOFSXLEbynV6QXZ/professionals');
        const profsSnap = await profsRef.get();
        console.log(`Found ${profsSnap.size} registered professionals.`);
        
        // Map CNS to Professional Data
        const professionalsMap = new Map<string, any>();
        profsSnap.forEach(doc => {
            const data = doc.data();
            const cns = data.cns?.replace(/\D/g, ''); // Ensure only numbers
            if (cns) {
                professionalsMap.set(cns, {
                    docId: doc.id,
                    name: data.name,
                    cns: cns,
                    isActive: data.isActive !== false,
                    recordCount: 0
                });
            }
        });

        // Count extraction records
        let unmatchedRecords = 0;
        
        for (const record of records) {
            const profCns = record.professional?.cns;
            
            if (profCns) {
                const cnsClean = profCns.replace(/\D/g, '');
                if (professionalsMap.has(cnsClean)) {
                    professionalsMap.get(cnsClean).recordCount++;
                } else {
                    unmatchedRecords++;
                }
            } else {
                unmatchedRecords++;
            }
        }

        // Prepare Output
        const result = Array.from(professionalsMap.values()).sort((a, b) => b.recordCount - a.recordCount);
        
        console.log(`\n-- SUMMARY --`);
        console.log(`Total Records: ${records.length}`);
        console.log(`Unmatched Records (professional not found by CNS): ${unmatchedRecords}`);

        const outPath = path.join(__dirname, 'agua_preta_prof_counts_02_2026.json');
        fs.writeFileSync(outPath, JSON.stringify({
            total_records: records.length,
            unmatched_records: unmatchedRecords,
            matched_professionals_count: result.filter(p => p.recordCount > 0).length,
            zero_record_professionals_count: result.filter(p => p.recordCount === 0).length,
            professionals: result
        }, null, 2), 'utf-8');

        console.log(`Report generated successfully at: ${outPath}`);

    } catch (e: any) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}

run();
