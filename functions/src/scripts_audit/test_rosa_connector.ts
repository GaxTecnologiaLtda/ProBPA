import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';
    const compFilter = '02-2026'; // format used in connector path
    const rosaId = 'kAh1ibXZW2J6vuWRTfqM';
    const postoUnitId = '1pLxTu0VSvmrfHEZVAV3';

    console.log(`Buscando produção extraída pelo Conector para a Rosa...`);
    console.log(`Competência: ${compFilter}`);
    console.log(`Unidade Foco: Posto de Saúde Rio do Feijão (${postoUnitId})`);

    const resumoRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/${compFilter}/resumo_producao`);
    const snapshot = await resumoRef.get();

    console.log(`Encontrados ${snapshot.size} dias de extração na competência ${compFilter}.`);

    let foundInPosto = 0;
    let foundInOtherUnits = 0;
    let qtyPosto = 0;
    let qtyOtherUnits = 0;

    snapshot.forEach(doc => {
        const dateKey = doc.id;
        const data = doc.data();

        if (data && data.units) {
            // Check specific unit (Posto)
            const postoData = data.units[postoUnitId];
            if (postoData && postoData.professionals && postoData.professionals[rosaId]) {
                foundInPosto++;
                const profData = postoData.professionals[rosaId];
                console.log(`[POSTO DE SAÚDE] Data: ${dateKey} | Produção Encontrada!`);

                // Sum details if any
                if (profData.details) {
                    for (const procCode of Object.keys(profData.details)) {
                        qtyPosto += profData.details[procCode];
                        // console.log(`   - Código ${procCode}: ${profData.details[procCode]}`);
                    }
                }
            }

            // Check other units just in case
            for (const uId of Object.keys(data.units)) {
                if (uId !== postoUnitId) {
                    const otherUnitData = data.units[uId];
                    if (otherUnitData && otherUnitData.professionals && otherUnitData.professionals[rosaId]) {
                        foundInOtherUnits++;
                        const profData = otherUnitData.professionals[rosaId];
                        console.log(`[OUTRA UNIDADE: ${uId}] Data: ${dateKey} | Produção Encontrada!`);
                        if (profData.details) {
                            for (const procCode of Object.keys(profData.details)) {
                                qtyOtherUnits += profData.details[procCode];
                            }
                        }
                    }
                }
            }
        }
    });

    console.log(`\n============== RESULTADOS DO CONECTOR (FEV 2026) ==============`);
    console.log(`POSTO DE SAÚDE (${postoUnitId}):`);
    console.log(` - Dias c/ produção extraída: ${foundInPosto}`);
    console.log(` - Total de procedimentos extraídos: ${qtyPosto}`);

    console.log(`\nOUTRAS UNIDADES (ex: Hospital):`);
    console.log(` - Dias c/ produção extraída: ${foundInOtherUnits}`);
    console.log(` - Total de procedimentos extraídos: ${qtyOtherUnits}`);
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
