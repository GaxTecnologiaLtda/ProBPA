const admin = require('firebase-admin');
admin.initializeApp({projectId: 'probpa-025'});
const db = admin.firestore();

async function find36() {
    const unitId = 'GooBrmhoQbv38BooXBND';
    const path = 'municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/W1Tle7q1NUKkQiIgvEFI/extractions/2026/competences/05-2026/resumo_producao';
    
    const snap = await db.collection(path).get();
    const profTotals = new Map();
    
    snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.units && data.units[unitId]) {
            const uData = data.units[unitId];
            Object.entries(uData.professionals).forEach(([pId, pData]) => {
                let total = 0;
                Object.values(pData.procedures).forEach(v => total += Number(v));
                
                const current = profTotals.get(pId) || { name: pData.professionalName, total: 0 };
                current.total += total;
                profTotals.set(pId, current);
            });
        }
    });
    
    console.log("Professional totals for May 2026 in UBS I CENTRO BOA SAUDE:");
    for (const [id, data] of profTotals) {
        console.log(`${data.name} (${id}): ${data.total}`);
    }
}

find36();
