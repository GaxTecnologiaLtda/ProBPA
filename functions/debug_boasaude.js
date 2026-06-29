const admin = require('firebase-admin');
const fs = require('fs');

// Se você tiver a Key na raiz da functions, ele já vai carregar. 
// Caso contrario, substitua pelo caminho correto ou login default.
try {
    const serviceAccount = require('./serviceAccountKey.json');
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
    console.log("Aviso: Iniciando sem serviceAccountKey.json (depende de permissões de ambiente).");
    if (!admin.apps.length) admin.initializeApp();
}

const db = admin.firestore();

const ENTITY_ID = 'wfgKMoGlzgf5OKzCK3PJ';
const MUN_ID = 'W1Tle7q1NUKkQiIgvEFI';
const BASE_PATH = `municipalities/PRIVATE/${ENTITY_ID}/${MUN_ID}`;

async function run() {
    try {
        console.log("1. Carregando as Metas de Boa Saúde...");
        // Carrega todas as metas de 2026 (onde você mencionou estarem salvas as plurianuais)
        const goalsSnap = await db.collection(`${BASE_PATH}/goals/2026/goals`).get();
        // Filtra para manter somente "Boa Saúde"
        const boaSaudeGoals = goalsSnap.docs
                                .map(d => ({id: d.id, ...d.data()}))
                                .filter(g => g.name === 'Boa Saúde' || (g.title && g.title.includes('Boa Saúde')) || (g.scope === 'Boa Saúde'));
        
        console.log(`Encontradas ${boaSaudeGoals.length} metas de Boa Saúde para mapeamento.`);
        
        // Mapeia macros vs códigos limpos
        const macros = boaSaudeGoals.map(g => g.procedureCode.replace(/\D/g, ''));
        console.log("Macros a buscar: ", macros);

        let finalReport = {
            metadata: {
                totalGoals: boaSaudeGoals.length,
                macrosTracked: macros,
            },
            competences: {}
        };

        const years = ['2024', '2025'];
        
        for (const year of years) {
            console.log(`\n2. Varrendo Extrações do Conector para ${year}...`);
            const compsSnap = await db.collection(`${BASE_PATH}/extractions/${year}/competences`).get();
            
            for (const compDoc of compsSnap.docs) {
                const comp = compDoc.id; // Ex: 03-2024
                console.log(` -> Analisando a competência: ${comp}`);
                
                finalReport.competences[comp] = {
                    totalProceduresMatched: 0,
                    unitsFound: {},
                    rawMatches: []
                };

                const resumosSnap = await db.collection(`${compDoc.ref.path}/resumo_producao`).get();
                
                for (const resumoDoc of resumosSnap.docs) {
                    // ID do doc pode ser unitId ou profId no conector.
                    const docId = resumoDoc.id; 
                    const data = resumoDoc.data();
                    
                    // Se as extrações do conector guardam tudo em "professionals" soltos:
                    if (data.professionals) {
                        for (const pId of Object.keys(data.professionals)) {
                            const profData = data.professionals[pId];
                            if (!profData.procedures) continue;

                            for (const [procCode, qty] of Object.entries(profData.procedures)) {
                                const cleanProc = procCode.replace(/\D/g, '');
                                const matchedMacro = macros.find(m => cleanProc.startsWith(m));
                                
                                if (matchedMacro) {
                                    const qtyNum = Number(qty) || 0;
                                    finalReport.competences[comp].totalProceduresMatched += qtyNum;
                                    
                                    // Adiciona a "Unidade" se constar no documento, senao é "Desconhecida/sem_unidade"
                                    const unidade = data.unitId || docId;
                                    if (!finalReport.competences[comp].unitsFound[unidade]) {
                                        finalReport.competences[comp].unitsFound[unidade] = 0;
                                    }
                                    finalReport.competences[comp].unitsFound[unidade] += qtyNum;

                                    finalReport.competences[comp].rawMatches.push({
                                        professionalId: pId,
                                        professionalName: profData.name || profData.professionalName || 'Sem Nome',
                                        procedure: procCode,
                                        matchedGoalMacro: matchedMacro,
                                        quantity: qtyNum,
                                        storedInUnit: unidade
                                    });
                                }
                            }
                        }
                    }
                    // Se o conector guarda com ".units" na base
                    else if (data.units) {
                        for (const uId of Object.keys(data.units)) {
                            const unitData = data.units[uId];
                            if (!unitData.professionals) continue;
                            
                            for (const pId of Object.keys(unitData.professionals)) {
                                const profData = unitData.professionals[pId];
                                if (!profData.procedures) continue;
                                
                                for (const [procCode, qty] of Object.entries(profData.procedures)) {
                                    const cleanProc = procCode.replace(/\D/g, '');
                                    const matchedMacro = macros.find(m => cleanProc.startsWith(m));
                                    
                                    if (matchedMacro) {
                                        const qtyNum = Number(qty) || 0;
                                        finalReport.competences[comp].totalProceduresMatched += qtyNum;
                                        
                                        if (!finalReport.competences[comp].unitsFound[uId]) {
                                            finalReport.competences[comp].unitsFound[uId] = 0;
                                        }
                                        finalReport.competences[comp].unitsFound[uId] += qtyNum;

                                        finalReport.competences[comp].rawMatches.push({
                                            professionalId: pId,
                                            professionalName: profData.name || profData.professionalName || 'Sem Nome',
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

        // Output exactly what we found.
        fs.writeFileSync('boa_saude_report.json', JSON.stringify(finalReport, null, 2));
        console.log("\n✅ Script finalizado! Relatório exportado em 'boa_saude_report.json'.");
        console.log("Pode abrir o json e ver exatamente (linha por linha, sem filtro nenhum) tudo o que foi contado pelo conector e pra que métrica foi atrelado.");

    } catch (e) {
        console.error("Erro fatal na query:", e);
    }
}

run().then(() => process.exit(0)).catch(console.error);
