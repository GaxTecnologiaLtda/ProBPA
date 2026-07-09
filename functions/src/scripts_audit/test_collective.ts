import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const compRef = db.collection('municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/NTH6qE46dU2ytddqnmTu/extractions/2026/competences/02-2026/extraction_records');

    console.log("Scanning 02-2026 for Collective Activities and Domiciliary Visits...");
    const stream = compRef.stream();

    let totalCollective = 0;
    let totalVisits = 0;

    let sampleCollective: any = null;
    let sampleVisit: any = null;

    for await (const chunk of stream) {
        const doc = chunk as unknown as admin.firestore.QueryDocumentSnapshot;
        const data = doc.data();

        let rawCode = String(data.procedureCode || data.procedure?.code || '').toUpperCase();
        const rawName = String(data.procedureName || data.procedure?.name || '').toUpperCase();

        if (!rawCode || rawCode === '-' || rawCode === 'NULL') {
            const parts = doc.id.split('_');
            const suffix = parts[parts.length - 1];
            if (suffix && suffix.length === 10 && !isNaN(Number(suffix))) {
                rawCode = suffix;
            }
        }

        const recType = String(data.recordType).toUpperCase();

        const isCollective = recType.includes('COLETIVA') || rawName.includes('COLETIVA') || rawCode.startsWith('0101');
        const isDomiciliar = recType.includes('DOMICILIAR') || rawName.includes('DOMICILIAR') || rawCode === '0301010137';

        if (isCollective) {
            totalCollective++;
            if (!sampleCollective) sampleCollective = { id: doc.id, ...data };
        }
        if (isDomiciliar) {
            totalVisits++;
            if (!sampleVisit) sampleVisit = { id: doc.id, ...data };
        }
    }

    console.log(`\n=== GRAND TOTAL ===`);
    console.log(`Total Atividades Coletivas em 02-2026: ${totalCollective}`);
    console.log(`Total Visitas Domiciliares em 02-2026: ${totalVisits}`);

    console.log(`\n=== SCHEMA SAMPLES ===`);
    if (sampleCollective) {
        console.log(`\n[SAMPLE] ATIVIDADE COLETIVA (ID: ${sampleCollective.id}):`);
        console.log(`RecordType: ${sampleCollective.recordType}`);
        console.log(`Procedure: ${sampleCollective.procedureCode} | ${sampleCollective.procedureName} | ${sampleCollective.procedure?.name}`);
        console.log(`Patient: CNS=${sampleCollective.patient?.cns} CPF=${sampleCollective.patient?.cpf}`);
        console.log(`Professional: ${sampleCollective.professionalName} | ${sampleCollective.professional?.name}`);
        console.log(`Quantity: ${sampleCollective.quantity}`);
    }

    if (sampleVisit) {
        console.log(`\n[SAMPLE] VISITA DOMICILIAR (ID: ${sampleVisit.id}):`);
        console.log(`RecordType: ${sampleVisit.recordType}`);
        console.log(`Procedure: ${sampleVisit.procedureCode} | ${sampleVisit.procedureName} | ${sampleVisit.procedure?.name}`);
        console.log(`Patient: CNS=${sampleVisit.patient?.cns} CPF=${sampleVisit.patient?.cpf}`);
        console.log(`Professional: ${sampleVisit.professionalName} | ${sampleVisit.professional?.name}`);
        console.log(`Quantity: ${sampleVisit.quantity}`);
    }

}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
