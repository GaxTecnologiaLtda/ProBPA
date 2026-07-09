const admin = require('firebase-admin');
admin.initializeApp({projectId: 'probpa-025'});
const db = admin.firestore();

async function inspectUnitSummaries() {
    const municipalityId = 'W1Tle7q1NUKkQiIgvEFI';
    const unitId = 'GooBrmhoQbv38BooXBND';
    const unitCnes = '0559415';
    
    console.log("Inspecting all summaries for unit...");

    const summariesSnap = await db.collectionGroup('resumo_producao').get();
    
    for (const doc of summariesSnap.docs) {
        const path = doc.ref.path;
        if (!path.includes(municipalityId)) continue;
        
        const data = doc.data();
        if (!data.units) continue;
        
        for (const uId of Object.keys(data.units)) {
            if (uId !== unitId && uId !== unitCnes) continue;
            
            const unitData = data.units[uId];
            if (!unitData.professionals) continue;
            
            console.log(`\nDocument: ${path} (Key: ${uId})`);
            
            for (const pId of Object.keys(unitData.professionals)) {
                const profData = unitData.professionals[pId];
                let total = 0;
                for (const count of Object.values(profData.procedures || {})) total += Number(count);
                
                if (total > 0) {
                    console.log(`  Prof: ${profData.professionalName} (${pId}), CBO: ${profData.cbo}, Total: ${total}`);
                }
            }
        }
    }
}

inspectUnitSummaries();
