const admin = require('firebase-admin');
admin.initializeApp({projectId: 'probpa-025'});
const db = admin.firestore();

async function debugCboDrift() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const municipalityId = 'W1Tle7q1NUKkQiIgvEFI';
    const baseMunPath = `municipalities/PRIVATE/${entityId}/${municipalityId}`;
    
    const profsSnap = await db.collection(`${baseMunPath}/professionals`).get();
    const profMap = new Map();
    profsSnap.forEach(d => profMap.set(d.id, { id: d.id, name: d.data().name, cbo: d.data().cbo, assignments: d.data().assignments }));

    const months = ['01', '02', '03', '04', '05', '06', '07'];
    for (const m of months) {
        const path = `${baseMunPath}/extractions/2026/competences/${m}-2026/resumo_producao`;
        const snap = await db.collection(path).get();
        
        snap.docs.forEach(doc => {
            const data = doc.data();
            if (!data.units) return;
            Object.entries(data.units).forEach(([uId, uData]) => {
                if (!uData.professionals) return;
                Object.entries(uData.professionals).forEach(([pId, pData]) => {
                    const prof = profMap.get(pId);
                    if (prof) {
                        // Check if Noemia is being counted for anything other than Nurse
                        if (prof.name.includes('Noemia') || prof.name.includes('THAINÁ')) {
                            let total = 0;
                            Object.values(pData.procedures).forEach(v => total += Number(v));
                            console.log(`[DRIFT] ${prof.name} in unit ${uId} has ${total} records in ${m}-2026`);
                        }
                    }
                });
            });
        });
    }
}

debugCboDrift();
