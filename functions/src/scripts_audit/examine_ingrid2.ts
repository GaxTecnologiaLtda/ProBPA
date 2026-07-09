import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'probpa-025'
    });
}

const db = admin.firestore();

async function run() {
    try {
        const profId = "HSRxEkd3nBxWrNwooHzC";
        console.log(`\n========================================`);
        console.log(`--- SCOPED PRODUCTION AUDIT FOR INGRID BEATRIZ ---`);
        console.log(`========================================\n`);

        const basePath = `/municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/NTH6qE46dU2ytddqnmTu/bpai_records`;

        const pathsToCheck = [
            `${basePath}/1vsLDL6709hXT8pbQjo8/professionals/${profId}/competencias/2026-02`,
            `${basePath}/1vsLDL6709hXT8pbQjo8/professionals/${profId}/competencias/2026-03`,
            `${basePath}/DDYOdqgyDCxyfNr3yoKr/professionals/${profId}/competencias/2026-02`,
            `${basePath}/IYWJ0Ewilb7kpTIp8ha6/professionals/${profId}/competencias/2026-02`,
            `${basePath}/K1v3pwFsaVddABCXsWeD/professionals/${profId}/competencias/2026-02`
        ];

        for (const p of pathsToCheck) {
            console.log(`\n\n>>> Checking Path: \n${p}`);
            
            // 1. Check if the root competence doc exists
            const compDoc = await db.doc(p).get();
            if (compDoc.exists) {
                console.log(`  [+] Competence Document EXISTS. Data:`, JSON.stringify(compDoc.data(), null, 2));
            } else {
                console.log(`  [-] Competence Document DOES NOT EXIST.`);
            }

            // 2. Fetch all nested procedures using collectionGroup but restricted to this path
            // The REST API / Admin SDK doesn't natively support path-prefix in collectionGroup easily, 
            // so we'll do a subcollection query if we know the structure, or fetch all procedures and filter.
            // Since we want exactly what's under here, let's fetch all procedures for the user and filter by path prefix.
            const allProcs = await db.collectionGroup('procedures')
                .where('professionalId', '==', profId)
                .get();
                
            const matchingProcs: any[] = [];
            allProcs.forEach(doc => {
                if (doc.ref.path.startsWith(p.replace(/^\//, ''))) {  // Remove leading slash for matching
                    matchingProcs.push({
                        docId: doc.id,
                        path: doc.ref.path,
                        data: doc.data()
                    });
                }
            });

            console.log(`  -> Found ${matchingProcs.length} procedures nested under this path.`);
            
            if (matchingProcs.length > 0) {
                const summary: Record<string, number> = {}; 
                
                // Just log the first 2 as an example, and summarize
                matchingProcs.slice(0, 2).forEach((proc, idx) => {
                    console.log(`    Procedure Example ${idx + 1}: Path: ${proc.path}`);
                    console.log(`      Code: ${proc.data.procedureCode}, Date: ${proc.data.attendanceDate}, Unit: ${proc.data.unitName}`);
                });
                
                matchingProcs.forEach(proc => {
                    const unit = proc.data.unitName || 'UNKNOWN';
                    summary[unit] = (summary[unit] || 0) + 1;
                });
                console.log(`    Summary of Units for these ${matchingProcs.length} procedures:`, summary);
            }
            
            // 3. Let's explicitly check `resumo_producao` if it exists here
            const resumoCol = await db.collection(p + '/resumo_producao').get();
            if (!resumoCol.empty) {
                console.log(`  -> Found ${resumoCol.size} documents in 'resumo_producao' subcollection.`);
                resumoCol.forEach(doc => {
                    console.log(`    [Resumo Doc] ID: ${doc.id}`);
                    console.log(`      Data:`, JSON.stringify(doc.data(), null, 2));
                });
            } else {
                 console.log(`  -> No 'resumo_producao' subcollection found.`);
            }
        }

    } catch (e: any) {
        console.error("\nError reading Firestore:", e.message);
    }
    process.exit(0);
}

run();
