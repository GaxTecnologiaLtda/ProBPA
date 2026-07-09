import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';


    // IDs 
    const rosaId = 'kAh1ibXZW2J6vuWRTfqM';
    const postoUnitId = '1pLxTu0VSvmrfHEZVAV3';

    // Names
    const rosaNameParts = ['ROSA', 'LIMA', 'ARAUJO', 'PEREIRA'];
    const postoNameParts = ['POSTO', 'SAUDE', 'RIO', 'FEIJAO'];

    console.log(`Iniciando Auditoria Extrema - Fevereiro 2026...`);

    // 1. Audit Manual Procedures (All for Municipality in Feb)
    console.log(`\n============== 1. BUSCA MANUAL (bpai_records / procedures) ==============`);
    const proceduresRef = db.collectionGroup('procedures');
    const query = proceduresRef
        .where('entityId', '==', entityId);
    // Not filtering by ID here to catch name variations

    const snapshot = await query.get();

    let matchesExtremos = 0;

    snapshot.forEach(doc => {
        const data = doc.data();

        let rComp = data.competenceMonth || data.competence || (data.productionDate ? data.productionDate.slice(0, 7) : '');
        if (rComp) {
            rComp = rComp.replace('/', '-');
            if (rComp.includes('-')) {
                const parts = rComp.split('-');
                if (parts[0].length === 2 && parts[1].length === 4) {
                    rComp = `${parts[1]}-${parts[0]}`;
                }
            }
        }

        if (rComp !== '2026-02' && rComp !== '02-2026') return;

        const profId = data.professionalId || '';
        const profName = (data.professionalName || '').toUpperCase();
        const uId = data.unitId || '';
        const uName = (data.unitName || '').toUpperCase();

        const isRosa = profId === rosaId || rosaNameParts.some(p => profName.includes(p));
        const isPosto = uId === postoUnitId || postoNameParts.some(p => uName.includes(p));

        if (isRosa && isPosto) {
            matchesExtremos++;
            console.log(`[ALERTA - MATCH ENCONTRADO NO MANUAL]`);
            console.log(` Doc ID: ${doc.id}`);
            console.log(` Prof: ID=${profId} | Nome=${profName}`);
            console.log(` Unit: ID=${uId}   | Nome=${uName}`);
            console.log(` Qtd: ${data.quantity}`);
            console.log(`-----------------------------------`);
        }
    });

    if (matchesExtremos === 0) {
        console.log(`--> NENHUM registro manual encontrado para Rosa + Posto de Saúde (buscando por IDs e strings de nome).`);
    }

    // 2. Audit Connector Extractions (Looking through all units and professionals)
    console.log(`\n============== 2. BUSCA NO CONECTOR (extractions) ==============`);
    const resumoRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/02-2026/resumo_producao`);
    const connSnap = await resumoRef.get();

    let connMatches = 0;

    connSnap.forEach(doc => {
        const dateKey = doc.id;
        const data = doc.data();

        if (data && data.units) {
            for (const uId of Object.keys(data.units)) {
                const unitData = data.units[uId];
                const uName = (unitData.name || '').toUpperCase();

                const isPosto = uId === postoUnitId || postoNameParts.some(p => uName.includes(p));

                if (unitData.professionals) {
                    for (const profId of Object.keys(unitData.professionals)) {
                        const profData = unitData.professionals[profId];
                        const profName = (profData.name || '').toUpperCase();

                        const isRosa = profId === rosaId || rosaNameParts.some(p => profName.includes(p));

                        if (isRosa && isPosto) {
                            connMatches++;
                            console.log(`[ALERTA - MATCH ENCONTRADO NO CONECTOR]`);
                            console.log(` Data: ${dateKey}`);
                            console.log(` Prof: ID=${profId} | Nome=${profName}`);
                            console.log(` Unit: ID=${uId}   | Nome=${uName}`);
                            console.log(`-----------------------------------`);
                        }
                    }
                }
            }
        }
    });

    if (connMatches === 0) {
        console.log(`--> NENHUM registro no conector encontrado para Rosa + Posto de Saúde (buscando por IDs e strings de nome).`);
    }
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
