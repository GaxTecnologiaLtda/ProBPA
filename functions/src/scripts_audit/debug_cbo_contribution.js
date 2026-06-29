const admin = require('firebase-admin');
admin.initializeApp({projectId: 'probpa-025'});
const db = admin.firestore();

async function debugCboContribution() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const municipalityId = 'W1Tle7q1NUKkQiIgvEFI';
    const unitId = 'GooBrmhoQbv38BooXBND';
    const baseMunPath = `municipalities/PRIVATE/${entityId}/${municipalityId}`;
    
    // 1. Load Professionals
    const profsSnap = await db.collection(`${baseMunPath}/professionals`).get();
    const profUnitCboMap = new Map();
    const profMainCboMap = new Map();
    const nameMap = new Map();
    
    const normalize = (val) => String(val || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    profsSnap.forEach(d => {
        const p = d.data();
        if (p.assignments) {
            p.assignments.forEach(a => {
                let clean = String(a.cbo || a.occupation || '').replace(/\D/g, '').substring(0, 6);
                if (clean) profUnitCboMap.set(`${d.id}_${a.unitId}`, { code: clean, name: a.occupation });
            });
        }
        let cleanMain = String(p.cbo || p.occupation || '').replace(/\D/g, '').substring(0, 6);
        if (cleanMain) profMainCboMap.set(d.id, { code: cleanMain, name: p.occupation });
        if (p.name) nameMap.set(normalize(p.name), d.id);
    });

    const getCboData = (pId, uId, rowCbo, rowOcc) => {
        if (profUnitCboMap.has(`${pId}_${uId}`)) return profUnitCboMap.get(`${pId}_${uId}`);
        if (profMainCboMap.has(pId)) return profMainCboMap.get(pId);
        return null;
    };

    // 2. Fetch Summaries for Jan-Jul 2026
    const months = ['01', '02', '03', '04', '05', '06', '07'];
    const cboCounts = new Map();

    for (const m of months) {
        const path = `${baseMunPath}/extractions/2026/competences/${m}-2026/resumo_producao`;
        const snap = await db.collection(path).get();
        
        snap.docs.forEach(doc => {
            const data = doc.data();
            if (data.units && (data.units[unitId] || data.units['8015015'])) {
                const uData = data.units[unitId] || data.units['8015015'];
                Object.entries(uData.professionals).forEach(([pId, pData]) => {
                    let truePId = pId;
                    if (!profsSnap.docs.some(d => d.id === pId)) {
                        const norm = normalize(pData.professionalName);
                        if (nameMap.has(norm)) truePId = nameMap.get(norm);
                    }
                    
                    const cbo = getCboData(truePId, unitId, '', '');
                    if (cbo && cbo.code === '223810') {
                        let total = 0;
                        Object.values(pData.procedures).forEach(v => total += Number(v));
                        console.log(`[DEBUG] Professional ${pData.professionalName} (${truePId}) in ${m}-2026 contributed ${total} to FONO`);
                    }
                });
            }
        });
    }
}

debugCboContribution();
