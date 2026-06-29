import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const rosaId = 'kAh1ibXZW2J6vuWRTfqM'; // Assuming this is her ID from previous logs
    const postoUnitId = '1pLxTu0VSvmrfHEZVAV3'; // POSTO DE SAUDE RIO DO FEIJÃO

    console.log(`Buscando procedimentos BRUTOS para a Rosa...`);

    const proceduresRef = db.collectionGroup('procedures');
    const query = proceduresRef
        .where('entityId', '==', entityId)
        .where('professionalId', '==', rosaId);

    const snapshot = await query.get();

    let totalQtyPosto = 0;
    let countInFevPosto = 0;
    let countTotalForUnitPosto = 0;

    let totalQtyHospital = 0;
    let countInFevHospital = 0;

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

        const isFev = (rComp === '2026-02' || rComp === '02-2026');

        if (data.unitId === postoUnitId) {
            countTotalForUnitPosto++;
            if (isFev) {
                countInFevPosto++;
                totalQtyPosto += (Number(data.quantity) || 1);
            }
        } else if (data.unitId === 'bFPvDAD3uXFVV5eCy4OH') { // Hospital
            if (isFev) {
                countInFevHospital++;
                totalQtyHospital += (Number(data.quantity) || 1);
            }
        }
    });

    console.log(`Encontrados ${snapshot.size} procedimentos no total para a Rosa em *todas* unidades (qualquer mês).`);
    console.log(`============= POSTO DE SAÚDE =============`);
    console.log(`Desses, ${countTotalForUnitPosto} foram lançados no POSTO DE SAÚDE (qualquer mês).`);
    console.log(`Desses, ${countInFevPosto} procedimentos no POSTO DE SAÚDE são da competência 2026-02.`);
    console.log(`Quantidade total de procedimentos (SOMA das QTDs) em 2026-02 no Posto de Saúde: ${totalQtyPosto}`);
    console.log(`============= HOSPITAL =============`);
    console.log(`Desses, ${countInFevHospital} procedimentos no HOSPITAL são da competência 2026-02.`);
    console.log(`Quantidade total de procedimentos (SOMA das QTDs) em 2026-02 no Hospital: ${totalQtyHospital}`);
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
