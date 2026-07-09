import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function findUnknownProcedures() {
    try {
        console.log("Searching for procedure names in extraction_records...");
        const targetCodes = ['010', '018', 'PROCEDIMENTO 010', 'PROCEDIMENTO 018', '010', '018'];

        const recordsRef = db.collection('extraction_records');
        const snap = await recordsRef
            .where('_year', '==', '2026')
            .where('_month', '==', '03')
            .limit(1000)
            .get();

        console.log(`Scanning ${snap.size} recent extraction_records...`);

        const foundProcedures = new Map<string, Set<string>>();

        snap.forEach(doc => {
            const data = doc.data();
            const procCode = data.procedureCode || data.procedure?.code || '';
            const cleanCode = String(procCode).replace(/\D/g, '') || String(procCode);

            if (targetCodes.includes(procCode) || targetCodes.includes(cleanCode) || cleanCode.length <= 5 || cleanCode === 'ABPG010' || cleanCode === 'ABPO010') {
                if (!foundProcedures.has(cleanCode)) {
                    foundProcedures.set(cleanCode, new Set());
                }
                const name = data.procedure?.name || data.procedureName || data.name || 'Desconhecido';
                foundProcedures.get(cleanCode)!.add(name);
            }
        });

        console.log("\n--- Findings ---");
        if (foundProcedures.size === 0) {
            console.log("No short/target procedure codes found in this sample of extraction_records.");
        } else {
            for (const [code, namesSet] of foundProcedures.entries()) {
                console.log(`\nCode: ${code}`);
                namesSet.forEach(name => console.log(`  Name: ${name}`));
            }
        }

    } catch (error) {
        console.error("Error finding procedures:", error);
    }
}

findUnknownProcedures();
