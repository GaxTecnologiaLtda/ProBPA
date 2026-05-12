const admin = require('firebase-admin');
admin.initializeApp({projectId: 'probpa-025'});
const db = admin.firestore();

async function simulateIndividualized() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const municipalityId = 'W1Tle7q1NUKkQiIgvEFI';
    const unitId = 'GooBrmhoQbv38BooXBND';
    
    const path = `municipalities/PRIVATE/${entityId}/${municipalityId}/extractions/2026/competences/05-2026/resumo_producao`;
    const snap = await db.collection(path).get();
    
    const profTotals = new Map();
    snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.units && data.units[unitId]) {
            const uData = data.units[unitId];
            Object.entries(uData.professionals).forEach(([pId, pData]) => {
                let total = 0;
                Object.values(pData.procedures).forEach(v => total += Number(v));
                profTotals.set(pData.professionalName, (profTotals.get(pData.professionalName) || 0) + total);
            });
        }
    });

    console.log("Production per Professional in UBS I (May 2026):");
    for (const [name, total] of profTotals) {
        console.log(`${name}: ${total}`);
    }
}

simulateIndividualized();
