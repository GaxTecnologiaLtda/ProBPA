import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const compRef = db.collection('municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/NTH6qE46dU2ytddqnmTu/extractions/2026/competences/02-2026/extraction_records');

    console.log("Searching for Michael Rodrigues da Silva...");
    // Let's get his records for 03/02 and 06/02
    // We can filter by professionalName or cns
    const snap = await compRef.where('professional.cns', '==', '708000867086424').get();

    console.log(`Found ${snap.size} records.`);

    snap.forEach(doc => {
        const data = doc.data();
        console.log(`\n--- Record ID: ${doc.id} ---`);
        console.log(`Date: ${data.productionDate}`);
        console.log(`Procedure: ${data.procedureCode} | ${data.procedure?.name}`);
        console.log(`Patient: CNS=${data.patient?.cns} CPF=${data.patient?.cpf}`);
        console.log(`RecordType: ${data.recordType}`);

        // Let's apply our glosa logic to see what it would do:
        const rawCode = String(data.procedureCode || data.procedure?.code || '').toUpperCase();
        const rawName = String(data.procedureName || data.procedure?.name || '').toUpperCase();

        const isCollective = String(data.recordType).toUpperCase().includes('COLETIVA') ||
            rawName.includes('COLETIVA') ||
            rawCode.startsWith('0101');
        const isDomiciliar = String(data.recordType).toUpperCase().includes('DOMICILIAR') ||
            rawName.includes('DOMICILIAR') ||
            rawCode === '0301010137';

        const hasPatientId = !!(data.patient?.cns || data.patient?.cpf);
        const isEmptyCode = rawCode === '-' || rawCode === '';

        console.log(`\nEval: isEmptyCode=${isEmptyCode}, hasPatientId=${hasPatientId}, isCollective=${isCollective}, isDomiciliar=${isDomiciliar}`);

        if (isEmptyCode) {
            console.log(">> WOULD BE DISCARDED (Empty Code)");
        } else if (!hasPatientId && !isCollective && !isDomiciliar) {
            console.log(">> WOULD BE DISCARDED (No Patient ID)");
        } else {
            console.log(">> WOULD BE KEPT");
        }
    });

}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
