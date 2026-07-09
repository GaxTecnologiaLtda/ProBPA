import * as admin from 'firebase-admin';

async function findFonoProduction() {
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: 'probpa-025'
        });
    }
    const db = admin.firestore();

    const municipalityId = 'W1Tle7q1NUKkQiIgvEFI'; 
    const unitId = 'GooBrmhoQbv38BooXBND'; // UBS I CENTRO BOA SAUDE
    const unitCnes = '0559415';
    
    console.log("Searching for Fono (223810) production...");

    // Search in all resumo_producao for this municipality
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
                
                // Check CBO in the data
                const cbo = String(profData.cbo || '').replace(/\D/g, '');
                if (cbo === '223810') {
                    let totalProc = 0;
                    for (const count of Object.values(profData.procedures || {})) {
                        totalProc += Number(count);
                    }
                    if (totalProc > 0) {
                        console.log(`Found ${totalProc} records in:`);
                        console.log(`Path: ${path}`);
                        console.log(`Unit Key: ${uId}`);
                        console.log(`Prof Key: ${pId}`);
                        console.log(`Prof Name: ${profData.professionalName}`);
                        console.log(`Competence: ${path.includes('competencias/') ? path.split('competencias/')[1].split('/')[0] : 'Unknown'}`);
                        console.log('---');
                    }
                }
            }
        }
    }
}

findFonoProduction().catch(console.error);
