import * as admin from 'firebase-admin';

// Initialize default app using environment credentials context
if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'probpa-025' });
}

const db = admin.firestore();

const cpfToMatch = '11850633401';
const cnsToMatch = '706906166392031';

async function auditMarcela() {
    const competences = ['02-2026', '03-2026'];
    const basePath = 'municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/T92WcR5hIBt34eR8KxF1/extractions/2026/competences';

    let foundCount = 0;

    for (const comp of competences) {
        console.log(`\n--- Searching in Competence: ${comp} ---`);
        // I'll check both extraction_records and extractions_records in case of a typo in the user's message
        for (const colName of ['extraction_records', 'extractions_records']) {
            const collectionPath = `${basePath}/${comp}/${colName}`;
            const snap = await db.collection(collectionPath).get();

            if (snap.size > 0) {
                console.log(`Found ${snap.size} records in ${colName}`);
                
                snap.forEach(doc => {
                    const data = doc.data();
                    const prof = data.professional || {};
                    
                    const pName = (prof.name || '').toLowerCase();
                    const pCpf = String(prof.cpf || '').replace(/\D/g, '');
                    const pCns = String(prof.cns || '').replace(/\D/g, '');

                    // Safe fuzzy match over Rozelli Figuerêdo
                    const matchesName = pName.includes('rozelli') || pName.includes('figuerêdo') || pName.includes('rozeli');
                    const matchesCpf = pCpf === cpfToMatch;
                    const matchesCns = pCns === cnsToMatch;

                    if (matchesName || matchesCpf || matchesCns) {
                        foundCount++;
                        console.log(`\n>>> MATCH FOUND in ${comp} / ${colName} (Doc ID: ${doc.id})`);
                        console.log('- Row Raw Profile:', JSON.stringify(prof));
                        console.log('- Procedure:', JSON.stringify(data.procedure));
                        console.log('- Date:', data.productionDate);
                        console.log('- Extracted Name:', data.professionalName);
                    }
                });
            }
        }
    }

    console.log(`\nTarget Audit Completed. Total Matches Found: ${foundCount}`);
}

auditMarcela().catch(console.error);
