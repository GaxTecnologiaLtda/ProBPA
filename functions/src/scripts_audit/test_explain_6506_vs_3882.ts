import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';
    const compKey = '02-2026';
    const compKeyMY = '2026-02';

    console.log(`=== AUDITORIA DE DISCREPÂNCIA: 6506 vs 3882 (FEV/2026) ===\n`);

    // 1. Fetch Goals
    const goalsSnap = await db.collectionGroup('goals').where('entityId', '==', entityId).get();
    const goals: any[] = [];
    goalsSnap.forEach(g => {
        const d = g.data();
        if (d.municipalityId === munId) {
            goals.push({ id: g.id, ...d });
        }
    });

    // 2. Fetch Active Profs
    const profsSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/professionals`).get();
    const activeProfIds = new Set<string>();
    profsSnap.forEach(d => activeProfIds.add(d.id));

    // 3. Fetch Active Units
    const unitsSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/units`).get();
    const activeUnitIds = new Set<string>();
    unitsSnap.forEach(d => activeUnitIds.add(d.id));

    // 4. Fetch Resumos (Extraction + Manual)
    const extRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/${compKey}/resumo_producao`);
    const extSnap = await extRef.get();

    const manualSummaries: any[] = [];
    for (const pId of activeProfIds) {
        const manSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/professionals/${pId}/competencias/${compKeyMY}/resumo_producao`).get();
        manSnap.forEach(d => manualSummaries.push(d.data()));
    }

    const allSummaries = [
        ...extSnap.docs.map(d => ({ data: d.data(), type: 'extractions', date: d.id })),
        ...manualSummaries.map(data => ({ data, type: 'manual', date: 'manual' }))
    ];

    let metasGlobaisTotal = 0;
    let comparativoTotal = 0;

    let procedimentosNoComparativoMasNaoNasMetas: any[] = [];
    let procedimentosNasMetasMasNaoNoComparativo: any[] = [];

    // Simulate BOTH logics
    for (const item of allSummaries) {
        const summaryData = item.data;
        if (!summaryData.units) continue;

        for (const uFromDoc of Object.keys(summaryData.units)) {
            const unitData = summaryData.units[uFromDoc];
            if (!unitData.professionals) continue;

            const isUnitActive = activeUnitIds.has(uFromDoc);

            for (const pFromDoc of Object.keys(unitData.professionals)) {

                // Logic Meta: se for extraction, prof DEVE estar ativo
                const isProfActive = activeProfIds.has(pFromDoc);
                const isMetaValidProf = (item.type === 'manual') || isProfActive;

                const profData = unitData.professionals[pFromDoc];
                if (!profData.procedures) continue;

                for (const [pCodeRaw, pQtyRaw] of Object.entries(profData.procedures)) {
                    const pQty = Number(pQtyRaw);
                    if (isNaN(pQty)) continue;

                    const pCodeClean = String(pCodeRaw).replace(/\D/g, '');

                    // === LÓGICA METAS GLOBAIS ===
                    let addedToMetas = 0;
                    if (isMetaValidProf) {
                        for (const g of goals) {
                            let contextMatch = true;
                            if (g.goalType === 'municipal' || g.type === 'municipal') {
                            } else if (g.goalType === 'unit' || g.type === 'unit') {
                                if (g.unitId !== uFromDoc) contextMatch = false;
                            } else if (g.goalType === 'professional' || g.type === 'professional') {
                                if (g.professionalId !== 'team' && g.professionalId !== pFromDoc) contextMatch = false;
                                if (g.professionalId === 'team' && g.unitId !== uFromDoc) contextMatch = false;
                            }

                            if (!contextMatch) continue;

                            const gCode = String(g.sigtapCode || g.procedureCode || '').replace(/\D/g, '');
                            if (!gCode) continue;

                            const isMacro = (g.sigtapTargetType && ['Group', 'SubGroup', 'Form', 'Grupo', 'Subgrupo', 'Forma'].includes(g.sigtapTargetType)) || gCode.length < 10;

                            if (isMacro) {
                                if (pCodeClean.startsWith(gCode)) addedToMetas += pQty;
                            } else {
                                if (pCodeClean === gCode) addedToMetas += pQty;
                            }
                        }
                    }

                    // === LÓGICA COMPARATIVO DE UNIDADES ===
                    let addedToComparativo = 0;
                    if (isUnitActive) {
                        // Comparativo filtra se o procedimento existe NAS METAS
                        let isGoal = false;
                        for (const g of goals) {
                            const gCode = String(g.sigtapCode || g.procedureCode || '').replace(/\D/g, '');
                            if (!gCode) continue;


                            // Comparativo UI bug: it uses startsWith on the RAW code (with punctuation!) because `Object.keys()` doesn't strip punctuation.
                            if (String(pCodeRaw).startsWith(gCode) || pCodeClean.startsWith(gCode)) {
                                isGoal = true;
                            }
                        }
                        if (isGoal) {
                            addedToComparativo = pQty;
                        }
                    }

                    metasGlobaisTotal += addedToMetas;
                    comparativoTotal += addedToComparativo;

                    if (addedToMetas > 0 && addedToComparativo === 0) {
                        procedimentosNasMetasMasNaoNoComparativo.push({
                            code: pCodeRaw, qty: addedToMetas, unit: uFromDoc, prof: pFromDoc, type: item.type
                        });
                    }
                    if (addedToComparativo > 0 && addedToMetas === 0) {
                        procedimentosNoComparativoMasNaoNasMetas.push({
                            code: pCodeRaw, qty: addedToComparativo, unit: uFromDoc, prof: pFromDoc, type: item.type
                        });
                    }
                }
            }
        }
    }

    console.log(`[+] Total Calculado Metas Globais (Simulação): ${metasGlobaisTotal}`);
    console.log(`[+] Total Calculado Comparativo (Simulação): ${comparativoTotal}`);

    console.log(`\n=> Diferença de Registros Contados nas Metas e ignorados no Comparativo:`);
    let diffMetas = 0;
    for (const p of procedimentosNasMetasMasNaoNoComparativo) {
        diffMetas += p.qty;
    }
    console.log(`   (Soma: ${diffMetas}) -> Motivos prováveis: Unidade do procedimento é "unknown_unit" (e o comparativo antigo escondia), ou falha da unidade estar inativa.`);

    // Agrupar por unidade para analisar
    const uMap: any = {};
    for (const p of procedimentosNasMetasMasNaoNoComparativo) {
        if (!uMap[p.unit]) uMap[p.unit] = 0;
        uMap[p.unit] += p.qty;
    }
    console.log(`   Por Unidade: ${JSON.stringify(uMap)}`);

    console.log(`\n=> Diferença de Registros Contados no Comparativo e ignorados nas Metas:`);
    let diffComp = 0;
    for (const p of procedimentosNoComparativoMasNaoNasMetas) {
        diffComp += p.qty;
    }
    console.log(`   (Soma: ${diffComp}) -> Motivos prováveis: O profissional estava nas extrações mas não tem ID ativo mapeado, ou incompatibilidade estrita do contexto de meta (ex: Meta é de uma equipe, e o profissional era de outra).`);

}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
