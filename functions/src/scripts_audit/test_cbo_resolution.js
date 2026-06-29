const admin = require('firebase-admin');
admin.initializeApp({projectId: 'probpa-025'});
const db = admin.firestore();

async function simulateCboResolution() {
    const pId = 'wfgKMoGlzgf5OKzCK3PJ_70979687454'; // Noemia
    const unitId = 'GooBrmhoQbv38BooXBND';
    
    const profDoc = await db.doc(`municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/W1Tle7q1NUKkQiIgvEFI/professionals/${pId}`).get();
    const pData = profDoc.data();
    
    console.log("Professional Data for Noemia:", pData.name);
    console.log("Assignments:", JSON.stringify(pData.assignments));
    
    // Simulate getCboData logic
    const profUnitCboMap = new Map();
    const profMainCboMap = new Map();
    
    const mapCbo = (pId, unitId, code, occ) => {
        let clean = String(code || '').replace(/\D/g, '');
        if (!clean && occ) {
            const match = occ.match(/\b\d{6}\b/);
            if (match) clean = match[0];
            else clean = String(occ).replace(/\D/g, '').substring(0, 6);
        }
        const name = String(occ || 'Desconhecido');
        if (unitId) profUnitCboMap.set(`${pId}_${unitId}`, { code: clean, name: name });
        else profMainCboMap.set(pId, { code: clean, name: name });
    };

    if (pData.assignments) {
        pData.assignments.forEach(a => mapCbo(pId, a.unitId, a.cbo, a.occupation));
    }
    mapCbo(pId, null, pData.cbo, pData.occupation);
    
    const getCboData = (pId, unitId, rowCbo, rowOcc) => {
        if (profUnitCboMap.has(`${pId}_${unitId}`)) return profUnitCboMap.get(`${pId}_${unitId}`);
        if (profMainCboMap.has(pId)) return profMainCboMap.get(pId);
        return { code: 'UNDEFINED', name: 'UNDEFINED' };
    };

    const res = getCboData(pId, unitId, '', '');
    console.log("Resolved CBO for Noemia in UBS I:", res);
}

simulateCboResolution();
