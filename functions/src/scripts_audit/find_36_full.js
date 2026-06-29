const admin = require('firebase-admin');
admin.initializeApp({projectId: 'probpa-025'});
const db = admin.firestore();

async function find36() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const municipalityId = 'W1Tle7q1NUKkQiIgvEFI';
    const unitId = 'GooBrmhoQbv38BooXBND';
    
    const baseMunPath = `municipalities/PRIVATE/${entityId}/${municipalityId}`;
    const months = ['01', '02', '03', '04', '05', '06', '07'];
    const profTotals = new Map();

    for (const m of months) {
        const path = `${baseMunPath}/extractions/2026/competences/${m}-2026/resumo_producao`;
        const snap = await db.collection(path).get();
        
        snap.docs.forEach(doc => {
            const data = doc.data();
            if (data.units && data.units[unitId]) {
                const uData = data.units[unitId];
                Object.entries(uData.professionals).forEach(([pId, pData]) => {
                    let total = 0;
                    Object.values(pData.procedures).forEach(v => total += Number(v));
                    
                    const key = `${pId}|${pData.professionalName}`;
                    profTotals.set(key, (profTotals.get(key) || 0) + total);
                });
            }
        });
    }
    
    console.log("Professional totals for Jan-Jul 2026 in UBS I CENTRO BOA SAUDE:");
    for (const [key, total] of profTotals) {
        if (total === 36) console.log(`!!! FOUND 36: ${key} !!!`);
        console.log(`${key}: ${total}`);
    }
}

find36();
