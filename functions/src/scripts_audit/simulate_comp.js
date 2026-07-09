const admin = require('firebase-admin');
admin.initializeApp({projectId: 'probpa-025'});
const db = admin.firestore();

async function simulateComparativeStats() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const municipalityId = 'W1Tle7q1NUKkQiIgvEFI';
    const startDate = '2026-01-12';
    const endDate = '2026-07-12';
    const unitId = 'GooBrmhoQbv38BooXBND';
    const competence = '03-2026';

    const baseMunPath = `municipalities/PRIVATE/${entityId}/${municipalityId}`;

    // Load active professionals
    const activeProfIds = new Set();
    const profsSnap = await db.collection(`${baseMunPath}/professionals`).get();
    profsSnap.forEach(d => activeProfIds.add(d.id));
    console.log(`Loaded ${activeProfIds.size} active professionals.`);

    // Load units
    const unitsSnap = await db.collection(`${baseMunPath}/units`).get();
    const unitIdsSet = new Set(unitsSnap.docs.map(d => d.id));
    console.log(`Loaded ${unitIdsSet.size} units.`);

    // Fetch the specific document we know has the 36 records
    const docPath = `${baseMunPath}/extractions/2026/competences/03-2026/resumo_producao/19-03-2026`;
    const doc = await db.doc(docPath).get();
    
    if (!doc.exists) {
        console.log("Document not found!");
        return;
    }

    const data = doc.data();
    let count = 0;

    for (const uId of Object.keys(data.units)) {
        // Filter unregistered units
        if (!unitIdsSet.has(uId)) {
            console.log(`Skipping unit ${uId} because it's not in unitIdsSet.`);
            continue;
        }
        
        const unitData = data.units[uId];
        for (const pId of Object.keys(unitData.professionals)) {
            const profData = unitData.professionals[pId];
            
            // Strict Professional Filter
            if (!activeProfIds.has(pId)) {
                console.log(`Skipping professional ${pId} (${profData.professionalName}) because not in activeProfIds.`);
                continue;
            }

            for (const [code, qty] of Object.entries(profData.procedures)) {
                if (uId === unitId) {
                    count += Number(qty);
                    console.log(`Found ${qty} for ${profData.professionalName} (${pId}) - Proc: ${code}`);
                }
            }
        }
    }

    console.log(`Total for this doc in Comparative Simulation: ${count}`);
}

simulateComparativeStats();
