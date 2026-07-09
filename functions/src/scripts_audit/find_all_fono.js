const admin = require('firebase-admin');
admin.initializeApp({projectId: 'probpa-025'});
const db = admin.firestore();

async function findAllFonoProduction() {
    const municipalityId = 'W1Tle7q1NUKkQiIgvEFI';
    const unitId = 'GooBrmhoQbv38BooXBND';
    const unitCnes = '0559415';
    
    console.log("Searching for ALL Fono (223810) production for this unit...");

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
            
            for (const pId of Object.keys(unitData.professionals)) {
                const profData = unitData.professionals[pId];
                
                const cbo = String(profData.cbo || '').replace(/\D/g, '');
                if (cbo === '223810') {
                    let total = 0;
                    for (const count of Object.values(profData.procedures || {})) total += Number(count);
                    if (total > 0) {
                        console.log(`\nFound Fono: ${path}`);
                        console.log(`  Unit: ${uId}, Prof: ${profData.professionalName} (${pId})`);
                        console.log(`  Total: ${total}`);
                    }
                }
            }
        }
    }
}

findAllFonoProduction();
