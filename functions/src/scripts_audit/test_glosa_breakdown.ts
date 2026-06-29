import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';
    const compMY = '02-2026'; // For extractions
    const compYM = '2026-02'; // For manual

    console.log(`=== AUDITORIA DE GLOSAS E METAS (FEV/2026) ===\n`);

    // 1. Fetch Goals
    const goalsSnap = await db.collectionGroup('goals').where('entityId', '==', entityId).get();
    const goals: any[] = [];
    goalsSnap.forEach(g => {
        const d = g.data();
        if (d.municipalityId === munId) goals.push({ id: g.id, ...d });
    });

    let totalBruto = 0;

    // Contadores de Glosa
    let glosaDuplicataConsulta = 0;
    let glosaSemCodigo = 0;
    let glosaSemPaciente = 0;

    // Contadores Pós-Glosa
    let sobrouParaResumo = 0;

    // Contadores de Metas
    let entrouEmAlgumaMeta = 0;
    let validosForaDasMetas = 0;

    // --- FUNÇÃO PARA TESTAR SE BATE NAS METAS ---
    const checkGoals = (pCodeRaw: string, pQty: number) => {
        const pCodeClean = String(pCodeRaw).replace(/\D/g, '');
        let matched = false;
        for (const g of goals) {
            const gCode = String(g.sigtapCode || g.procedureCode || '').replace(/\D/g, '');
            if (!gCode) continue;

            const isMacro = (g.sigtapTargetType && ['Group', 'SubGroup', 'Form', 'Grupo', 'Subgrupo', 'Forma'].includes(g.sigtapTargetType)) || gCode.length < 10;
            if (isMacro && pCodeClean.startsWith(gCode)) matched = true;
            else if (!isMacro && pCodeClean === gCode) matched = true;

            if (matched) break; // Basta pontuar em 1 meta para considerar "útil" para os relatórios gerais
        }

        if (matched) {
            entrouEmAlgumaMeta += pQty;
        } else {
            validosForaDasMetas += pQty;
        }
    };

    // --- ANALISAR EXTRAÇÕES (5.169 Fichas) ---
    console.log(`Analisando Extrações do Conector...`);
    const extRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/${compMY}/extraction_records`);
    const extSnap = await extRef.get();

    extSnap.forEach(doc => {
        const data = doc.data();
        let pQty = 1; // Fichas do conector geralmente representam 1 procedimento principal por linha, ou tem qty
        if (data.quantity) pQty = Number(data.quantity);
        totalBruto += pQty;

        const rawCode = String(data.procedureCode || data.procedure?.code || '').toUpperCase();
        const rawName = String(data.procedureName || data.procedure?.name || '').toUpperCase();

        // Regra 1: Descarte de Duplicatas de Consulta
        if (rawCode === 'CONSULTA' && rawName.includes('ATENDIMENTO INDIVIDUAL')) {
            glosaDuplicataConsulta += pQty;
            return;
        }

        // Regra 2: Atendimento Individual sem Código
        if (rawCode === '-' || rawCode === '') {
            glosaSemCodigo += pQty;
            return;
        }

        // Regra 3: Ausência de Identificação
        const isCollective = String(data.recordType).toUpperCase().includes('COLETIVA') || rawName.includes('COLETIVA') || rawCode.startsWith('0101');
        const isDomiciliar = String(data.recordType).toUpperCase().includes('DOMICILIAR') || rawName.includes('DOMICILIAR') || rawCode === '0301010137';
        const hasPatientId = !!(data.patient?.cns || data.patient?.cpf);

        if (!hasPatientId && !isCollective && !isDomiciliar) {
            glosaSemPaciente += pQty;
            return;
        }

        // Passou por todas as glosas!
        sobrouParaResumo += pQty;
        checkGoals(rawCode, pQty);
    });

    // --- ANALISAR PRODUÇÃO MANUAL (4.540 procedimentos) ---
    console.log(`Analisando Produção Manual...`);
    const proceduresSnap = await db.collectionGroup('procedures').get();
    proceduresSnap.forEach(doc => {
        const path = doc.ref.path;
        if (path.includes(`municipalities/PRIVATE/${entityId}/${munId}/bpai_records`) && path.includes(`competencias/${compYM}`)) {
            const data = doc.data();
            const pQty = Number(data.quantity) || 1;
            totalBruto += pQty;

            // A produção manual (BPA-I) por padrão JÁ É limpa (o formulário obriga CNS, Código validado, etc).
            // Dificilmente cairá em glosa primária de falta de paciente, pois o patientId tá na URL!
            // Mas vamos considerar que entra no resumo:
            sobrouParaResumo += pQty;

            checkGoals(String(data.code || data.procedureCode || ''), pQty);
        }
    });

    // --- RESULTADOS ---
    console.log(`\n=========================================`);
    console.log(`1. PRODUÇÃO TOTAL BRUTA: ${totalBruto} procedimentos encontrados no banco.`);
    console.log(`\n2. DESCARTES (GLOSAS DO CONECTOR):`);
    console.log(`   - Consultas Duplicadas (Evita contagem dupla de prontuário): ${glosaDuplicataConsulta}`);
    console.log(`   - Sem Código do Procedimento (Fichas em branco): ${glosaSemCodigo}`);
    console.log(`   - Sem CNS/CPF (Não validação E-SUS, exceto coletiva): ${glosaSemPaciente}`);
    console.log(`   --------------------------------`);
    console.log(`   - TOTAL GLOSADO: ${glosaDuplicataConsulta + glosaSemCodigo + glosaSemPaciente}`);

    console.log(`\n3. PRODUÇÃO LIMPA (Vai para o Resumo e Contabiliza P/ Faturamento):`);
    console.log(`   - TOTAL LIMPO: ${sobrouParaResumo}`);

    console.log(`\n4. ESTRANGULAMENTO DAS METAS (Por que só ${entrouEmAlgumaMeta} aparece no painel?):`);
    console.log(`   Dos ${sobrouParaResumo} procedimentos válidos...`);
    console.log(`   - BATERAM COM ALGUMA META PACTUADA: ${entrouEmAlgumaMeta}`);
    console.log(`   - PRODUÇÃO VÁLIDA, MAS O MUNICÍPIO NÃO TEM META PARA O CÓDIGO DELA: ${validosForaDasMetas}`);
    console.log(`=========================================\n`);
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
