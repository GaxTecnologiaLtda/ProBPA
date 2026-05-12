import * as admin from 'firebase-admin';

async function inspectDiscrepancy() {
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: 'probpa-025'
        });
    }
    const db = admin.firestore();

    const compFilter = '2026-05';
    
    // First, find the unit ID for "UBS I CENTRO BOA SAUDE"
    const unitsSnap = await db.collectionGroup('units').get();
    const unitDoc = unitsSnap.docs.find(d => d.data().name?.includes('UBS I CENTRO BOA SAUDE'));
    
    if (!unitDoc) {
        console.log("Unit not found");
        return;
    }
    const realUnitId = unitDoc.id;
    const munPath = unitDoc.ref.path.split('/units/')[0];
    
    console.log(`Unit: ${unitDoc.data().name} (${realUnitId})`);
    console.log(`Path: ${munPath}`);

    // Fetch goals for this municipality
    const goalsSnap = await db.collection(`${munPath}/goals`).get();
    const allowedCodes = goalsSnap.docs.map(d => d.data().procedureCode).filter(Boolean);
    console.log(`Goals: ${allowedCodes.length}`);

    // Fetch summaries for this unit
    const summariesSnap = await db.collectionGroup('resumo_producao').get();
    const relevantSummaries = summariesSnap.docs.filter(d => d.ref.path.includes(realUnitId) && d.ref.path.includes(compFilter));
    
    console.log(`Summaries found: ${relevantSummaries.length}`);

    let totalWithGoals = 0;
    let totalAll = 0;
    let fonoProduction = 0;

    for (const doc of relevantSummaries) {
        const data = doc.data();
        if (!data.units) continue;
        
        for (const uId of Object.keys(data.units)) {
            if (uId !== realUnitId) continue;
            
            const unitData = data.units[uId];
            for (const pId of Object.keys(unitData.professionals)) {
                const profData = unitData.professionals[pId];
                for (const [code, count] of Object.entries(profData.procedures)) {
                    const qty = Number(count);
                    totalAll += qty;
                    
                    let isAllowed = false;
                    for (const gCode of allowedCodes) {
                        if (code.startsWith(gCode)) {
                            isAllowed = true;
                            break;
                        }
                    }
                    
                    if (isAllowed) totalWithGoals += qty;
                    
                    // Check if this professional is a Fonoaudiólogo
                    if (profData.professionalName?.toUpperCase().includes('FONO')) {
                         fonoProduction += qty;
                    }
                }
            }
        }
    }

    console.log(`Total All: ${totalAll}`);
    console.log(`Total With Goals: ${totalWithGoals}`);
    console.log(`Fono Production: ${fonoProduction}`);
}

inspectDiscrepancy();
