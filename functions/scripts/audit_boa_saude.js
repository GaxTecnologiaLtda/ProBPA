const admin = require('firebase-admin');
const fs = require('fs');

// Se você estiver logado no Firebase CLI com permissões default ou rodando isso 
// em um ambiente já autorizado, não precisa do serviceAccountKey.
try {
    const serviceAccount = require('./serviceAccountKey.json');
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
    if (!admin.apps.length) admin.initializeApp();
}

const db = admin.firestore();

const ENTITY_ID = 'wfgKMoGlzgf5OKzCK3PJ';
const MUN_ID = 'W1Tle7q1NUKkQiIgvEFI';
const BASE_PATH = `municipalities/PRIVATE/${ENTITY_ID}/${MUN_ID}`;

// Vamos cruzar contra estas macros para Boa Saúde especificamente.
const BOA_SAUDE_MACROS = [
    '010101', '010102', '010104', '020102', '020502', 
    '021102', '021401', '030101', '030104', '030106', 
    '030108', '030110', '030202', '030205', '030206', 
    '030701', '030702', '030703', '040101', '041402'
];

async function run() {
    try {
        console.log("Iniciando varredura integral para Boa Saúde (Extrator de Produção)...");

        let finalReport = {
            totalProceduresMatched: 0,
            competences: {}
        };

        const years = ['2024', '2025'];
        
        for (const year of years) {
            console.log(`\nVarrendo Extrações do Conector para ${year}...`);
            const compsSnap = await db.collection(`${BASE_PATH}/extractions/${year}/competences`).get();
            
            for (const compDoc of compsSnap.docs) {
                const comp = compDoc.id; // Ex: 03-2024
                console.log(` -> Analisando a competência: ${comp}`);
                
                finalReport.competences[comp] = {
                    totalQty: 0,
                    unitsFound: {},
                    items: []
                };

                const resumosSnap = await db.collection(`${compDoc.ref.path}/resumo_producao`).get();
                
                for (const resumoDoc of resumosSnap.docs) {
                    const docId = resumoDoc.id; 
                    const data = resumoDoc.data();
                    
                    // Conector Data via PIDs soltos.
                    if (data.professionals) {
                        for (const pId of Object.keys(data.professionals)) {
                            const profData = data.professionals[pId];
                            if (!profData.procedures) continue;

                            for (const [procCode, qty] of Object.entries(profData.procedures)) {
                                const cleanProc = procCode.replace(/\D/g, '');
                                const matchedMacro = BOA_SAUDE_MACROS.find(m => cleanProc.startsWith(m));
                                
                                if (matchedMacro) {
                                    const qtyNum = Number(qty) || 0;
                                    finalReport.competences[comp].totalQty += qtyNum;
                                    finalReport.totalProceduresMatched += qtyNum;
                                    
                                    const unidade = data.unitId || docId;
                                    if (!finalReport.competences[comp].unitsFound[unidade]) {
                                        finalReport.competences[comp].unitsFound[unidade] = 0;
                                    }
                                    finalReport.competences[comp].unitsFound[unidade] += qtyNum;

                                    // Guardando a linha exata se era uma unidade desconhecida ou válida
                                    finalReport.competences[comp].items.push({
                                        professionalId: pId,
                                        procedure: procCode,
                                        matchedGoalMacro: matchedMacro,
                                        quantity: qtyNum,
                                        storedInUnit: unidade
                                    });
                                }
                            }
                        }
                    }
                    // O Conector também pode usar '.units' dependendo do extrator
                    else if (data.units) {
                        for (const uId of Object.keys(data.units)) {
                            const unitData = data.units[uId];
                            if (!unitData.professionals) continue;
                            
                            for (const pId of Object.keys(unitData.professionals)) {
                                const profData = unitData.professionals[pId];
                                if (!profData.procedures) continue;
                                
                                for (const [procCode, qty] of Object.entries(profData.procedures)) {
                                    const cleanProc = procCode.replace(/\D/g, '');
                                    const matchedMacro = BOA_SAUDE_MACROS.find(m => cleanProc.startsWith(m));
                                    
                                    if (matchedMacro) {
                                        const qtyNum = Number(qty) || 0;
                                        finalReport.competences[comp].totalQty += qtyNum;
                                        finalReport.totalProceduresMatched += qtyNum;
                                        
                                        if (!finalReport.competences[comp].unitsFound[uId]) {
                                            finalReport.competences[comp].unitsFound[uId] = 0;
                                        }
                                        finalReport.competences[comp].unitsFound[uId] += qtyNum;

                                        finalReport.competences[comp].items.push({
                                            professionalId: pId,
                                            procedure: procCode,
                                            matchedGoalMacro: matchedMacro,
                                            quantity: qtyNum,
                                            storedInUnit: uId
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        fs.writeFileSync('boa_saude_debug_report.json', JSON.stringify(finalReport, null, 2));
        console.log(`\n✅ Relatório gerado! Exportado em 'boa_saude_debug_report.json'.`);
        console.log(`Total encontrado nos dois anos: ${finalReport.totalProceduresMatched}`);

    } catch (e) {
        console.error("Erro fatal na query:", e);
    }
}

run().then(() => process.exit(0)).catch(console.error);
