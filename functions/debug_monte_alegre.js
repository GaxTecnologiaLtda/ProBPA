const admin = require('./node_modules/firebase-admin');
const path = require('path');
const serviceAccountKeyPath = './serviceAccountKey.json';

try {
  const serviceAccount = require(serviceAccountKeyPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch(e) {
  admin.initializeApp();
}

const db = admin.firestore();

async function run() {
    const entityId = '2BGe8RORtiVY632OrU2m'; // ID da Gax
    const competenceConnector = '03-2026';
    const rawRecords = [];

    const munData = await db.collection(`municipalities/PRIVATE/${entityId}`).get();
    let catendeId = null;
    munData.forEach(d => {
        if(d.data().name && d.data().name.toUpperCase().includes('CATENDE')) catendeId = d.id;
    });

    if (catendeId) {
        const qExt = db.collection(`municipalities/PRIVATE/${entityId}/${catendeId}/extractions/2026/competences/${competenceConnector}/extraction_records`);
        const snapExt = await qExt.get();
        snapExt.forEach(d => rawRecords.push({ ...d.data(), id: d.id, source: 'connector' }));
    }

    let profMap = {};

    rawRecords.forEach(row => {
        let rUnitId = row.unitId || (row.unit && row.unit.cnes) || row.unitCnes;
        
        let hasPatient = true;
        let cbo = row.professional?.cbo || row.cbo;
        let pName = String(row.patient?.name || row.patientName || '').trim().toUpperCase();
        if (!pName || pName === 'NÃO IDENTIFICADO' || pName === 'NULL' || pName === '-') hasPatient = false;

        let rawCode = String(row.procedureCode || row.procedure?.code || '').toUpperCase();
        let rawName = String(row.procedureName || row.procedure?.name || '').toUpperCase();
        if (!rawCode || rawCode === '-' || rawCode === 'NULL' || rawName.includes('NÃO ENCONTRADO')) return;

        if (rUnitId === '5674468' || String(rUnitId).includes('MONTE ALEGRE')) {
            if (!hasPatient) return;

            let profId = row.professionalId || row.professional?.name || row.professionalName;
            let finalCbo = String(cbo || '').replace(/\D/g, '');
            if (finalCbo === '322245' || finalCbo === '322205') {
                if (!profMap[profId]) profMap[profId] = 0;
                profMap[profId] += (Number(row.quantity) || 1);
            }
        }
    });

    console.log("Productions for CBO 322245 or 322205 at Monte Alegre WITH IDENTIFIED PATIENTS:");
    console.log(profMap);
    process.exit(0);
}

run().catch(console.error);
