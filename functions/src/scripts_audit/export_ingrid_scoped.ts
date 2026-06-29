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
        console.log(`\n--- EXTRACTING SCOPED DATA FOR INGRID BEATRIZ (${profId}) ---\n`);

        const result: any = {
            professional: null,
            scoped_paths_checked: [],
            total_procedures_found: 0,
            procedures: [],
            resumo_producao: []
        };

        const profDoc = await db.doc(`/municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/NTH6qE46dU2ytddqnmTu/professionals/${profId}`).get();
        if (profDoc.exists) {
            result.professional = { id: profDoc.id, path: profDoc.ref.path, ...profDoc.data() };
        }

        const basePath = `/municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/NTH6qE46dU2ytddqnmTu/bpai_records`;

        const pathsToCheck = [
            `${basePath}/1vsLDL6709hXT8pbQjo8/professionals/${profId}/competencias/2026-02`,
            `${basePath}/1vsLDL6709hXT8pbQjo8/professionals/${profId}/competencias/2026-03`,
            `${basePath}/DDYOdqgyDCxyfNr3yoKr/professionals/${profId}/competencias/2026-02`,
            `${basePath}/IYWJ0Ewilb7kpTIp8ha6/professionals/${profId}/competencias/2026-02`,
            `${basePath}/K1v3pwFsaVddABCXsWeD/professionals/${profId}/competencias/2026-02`
        ];

        result.scoped_paths_checked = pathsToCheck;

        const allProcs = await db.collectionGroup('procedures')
            .where('professionalId', '==', profId)
            .get();

        for (const p of pathsToCheck) {
            allProcs.forEach(doc => {
                if (doc.ref.path.startsWith(p.replace(/^\//, ''))) {
                    result.procedures.push({
                        docId: doc.id,
                        path: doc.ref.path,
                        ...doc.data()
                    });
                }
            });

            const resumoCol = await db.collection(p.replace(/^\//, '') + '/resumo_producao').get();
            if (!resumoCol.empty) {
                resumoCol.forEach(doc => {
                    result.resumo_producao.push({
                        docId: doc.id,
                        path: doc.ref.path,
                        ...doc.data()
                    });
                });
            }
        }
        
        result.total_procedures_found = result.procedures.length;

        const outputPath = path.join(__dirname, 'ingrid_scoped_data.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
        console.log(`\nScoped Data successfully written to: ${outputPath}`);

    } catch (e: any) {
        console.error("\nError reading Firestore:", e.message);
    }
    process.exit(0);
}

run();
