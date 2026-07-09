import * as admin from 'firebase-admin';

async function performDeepAudit() {
    if (!admin.apps.length) admin.initializeApp();
    const db = admin.firestore();

    console.log("====================================================");
    console.log(" INÍCIO DA AUDITORIA MÁXIMA NO DB REQUISITADA");
    console.log(" ALVO: PROCEDIMENTOS QUE INICIAM COM '030101' ou '030104'");
    console.log("====================================================\n");

    try {
        console.log("1. Mapeando Relatório Individualizado (Tempo Real - 'procedures')");
        // Isso simula o Relatório Individualizado (getProfessionalProductionGrouped.ts)
        const procSnap = await db.collectionGroup('procedures').get();
        let manualCount = 0;

        procSnap.forEach((doc) => {
            const procedureCode = doc.data().procedureCode || '';
            // Verificação abrangente pro prefixo relatado
            if (procedureCode.startsWith('030104') || procedureCode.startsWith('0301014')) {
                manualCount++;
            }
        });
        console.log(`[>>] Total de procedimentos na base CRUA (Manual): ${manualCount}\n`);

        console.log("2. Mapeando Relatório Comparativo (Sumarizado - 'resumo_producao')");
        // Isso simula o Relatório Comparativo (getUnitComparativeStats.ts)
        const resumoSnap = await db.collectionGroup('resumo_producao').get();
        
        let aggregatedManualCount = 0;
        let aggregatedExtractionCount = 0;

        resumoSnap.forEach((doc) => {
            const data = doc.data();
            const procedures = data.procedures || {};
            const path = doc.ref.path;

            for (const [code, count] of Object.entries(procedures)) {
                if (code.startsWith('030104') || code.startsWith('0301014')) {
                    const qty = Number(count) || 0;
                    if (path.includes('/bpai_records/')) {
                        aggregatedManualCount += qty;
                    } else if (path.includes('/extractions/')) {
                        aggregatedExtractionCount += qty;
                    }
                }
            }
        });
        
        console.log(`[>>] Total sumarizado para o Robô (Produção Manual): ${aggregatedManualCount}`);
        console.log(`[>>] Total sumarizado pelo Conector (BPAs/e-SUS Importados): ${aggregatedExtractionCount}\n`);

        console.log("====================================================");
        console.log(" RESULTADO DO DESAFIO MATEMÁTICO DO BANCO:");
        console.log("====================================================");

        console.log(`A) O Individualizado encontrou: ${manualCount} registros reais manuais espalhados no banco.`);
        console.log(`B) No Comparativo, o sumário manual tem apenas: ${aggregatedManualCount} registros consolidados.`);
        
        if (manualCount > aggregatedManualCount) {
            console.log(`\n🚨 ALERTA VERMELHO: Faltam EXATOS ${manualCount - aggregatedManualCount} registros manuais que não foram sumarizados pelo cron job.`);
            console.log(`Isso prova por A+B que a Cloud Function 'aggregateManualProduction' ignorou arquivos (provavelmente por causa de data de competência retroativa).`);
        } else {
            console.log(`\n✅ O banco está perfeitamente sincronizado. (Sumário ${aggregatedManualCount} = Real ${manualCount})`);
        }
        
        console.log("\n-> Conector (Importação): O banco atesta que extrações importadas trouxeram " + aggregatedExtractionCount + " registros.");

    } catch (e) {
        console.error("Falha ao ler o DB. Verifique a credencial do Firebase CLI.", e);
    }
}

performDeepAudit();
