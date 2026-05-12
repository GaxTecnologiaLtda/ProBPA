const admin = require('firebase-admin');
admin.initializeApp({projectId: 'probpa-025'});
const db = admin.firestore();

async function findThainaRecords() {
    const municipalityId = 'W1Tle7q1NUKkQiIgvEFI';
    const unitId = 'GooBrmhoQbv38BooXBND';
    const unitCnes = '0559415';
    
    console.log("Looking for Thainá's records...");

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
                const name = String(profData.professionalName || '').toUpperCase();
                
                if (name.includes('THAINA') || name.includes('ANDRADE XAVIER')) {
                    let total = 0;
                    for (const count of Object.values(profData.procedures || {})) total += Number(count);
                    console.log(`\nFound Thainá in: ${path}`);
                    console.log(`  Unit Key: ${uId}`);
                    console.log(`  Prof Key: ${pId}`);
                    console.log(`  Total Production: ${total}`);
                    console.log(`  Procedures: ${JSON.stringify(profData.procedures)}`);
                }
            }
        }
    }
}

findThainaRecords();
