import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';
    const targetMonth = '02';
    const targetYear = '2026';
    const competence = `${targetMonth}-${targetYear}`;
    const competenceYMD = `${targetYear}-${targetMonth}`;

    console.log(`=== AUDITORIA PEDRO AVELINO (${competence}) ===\n`);

    // 1. Manual Production (bpai_records)
    console.log(`1. Consultando Produção Manual (bpai_records)...`);
    const bpaiSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/bpai_records`).get();
    let manualFebCount = 0;

    // As fichas manuais tem 'competence' 'YYYY-MM' ou date
    bpaiSnap.forEach(doc => {
        const data = doc.data();
        if (data.competence === competenceYMD || data.competence === competence) {
            manualFebCount++;
        }
    });
    console.log(`-> Total de Fichas Manuais em Fev/2026: ${manualFebCount} (de um total geral de ${bpaiSnap.size} fichas)\n`);

    // 2. Extracted Production (extractions)
    console.log(`2. Consultando Produção do Conector (extractions/${targetYear})...`);
    const extRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/${targetYear}/competences/${competence}/extraction_records`);
    const extSnap = await extRef.count().get();
    console.log(`-> Total de Fichas do Conector em Fev/2026: ${extSnap.data().count}\n`);

    // 3. Goals Progress
    console.log(`3. Calculando progresso exato de cada Meta em Fev/2026...`);
    const goalsSnap = await db.collectionGroup('goals')
        .where('entityId', '==', entityId)
        .get();

    const goals: any[] = [];
    goalsSnap.forEach(g => {
        const data = g.data();
        if (data.municipalityId === munId) {
            goals.push({ id: g.id, ...data });
        }
    });

    console.log(`-> Metas Ativas Encontradas: ${goals.length}`);

    // Fetching summaries
    const resumoSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/${targetYear}/competences/${competence}/resumo_producao`).get();

    // Fetch active profs to mimic backend logic
    const profsSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/professionals`).get();
    const activeProfIds = new Set<string>();
    profsSnap.forEach(p => activeProfIds.add(p.id));

    // Fetch Manual Summaries
    const manualSummaries: any[] = [];
    for (const pId of activeProfIds) {
        const manSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/professionals/${pId}/competencias/${competence}/resumo_producao`).get();
        manSnap.forEach(d => manualSummaries.push(d.data()));
    }

    const allSummaries = [
        ...resumoSnap.docs.map(d => ({ data: d.data(), type: 'extractions' })),
        ...manualSummaries.map(data => ({ data, type: 'manual' }))
    ];

    const results: Record<string, { name: string, qty: number, goalQty: number, sigtap: string }> = {};
    for (const g of goals) {
        let monthlyTarget = 0;
        if (g.chartData && Array.isArray(g.chartData)) {
            const febData = g.chartData.find((c: any) => c.month === targetMonth);
            if (febData) monthlyTarget = febData.value || 0;
        }

        results[g.id] = {
            name: String(g.procedureName || g.sigtapName || 'Unknown'),
            sigtap: String(g.procedureCode || g.sigtapCode || '').replace(/\D/g, ''),
            qty: 0,
            goalQty: monthlyTarget
        };
    }

    for (const item of allSummaries) {
        const summaryData = item.data;
        if (!summaryData.units) continue;

        for (const uFromDoc of Object.keys(summaryData.units)) {
            const unitData = summaryData.units[uFromDoc];
            if (!unitData.professionals) continue;

            for (const pFromDoc of Object.keys(unitData.professionals)) {
                let isProfActive = activeProfIds.has(pFromDoc);

                const profData = unitData.professionals[pFromDoc];
                if (!profData.procedures) continue;

                for (const [pCodeRaw, pQtyRaw] of Object.entries(profData.procedures)) {
                    const pQty = Number(pQtyRaw);
                    if (isNaN(pQty)) continue;

                    const pCodeClean = String(pCodeRaw).replace(/\D/g, '');

                    if (item.type === 'manual' || isProfActive) {
                        for (const g of goals) {
                            let contextMatch = true;
                            if (g.type === 'municipal') {
                                // Match municipal
                            } else if (g.type === 'unit') {
                                if (g.unitId !== uFromDoc) contextMatch = false;
                            } else if (g.type === 'professional') {
                                if (g.professionalId !== 'team' && g.professionalId !== pFromDoc) contextMatch = false;
                                if (g.professionalId === 'team' && g.unitId !== uFromDoc) contextMatch = false;
                            }

                            if (!contextMatch) continue;

                            const gCode = results[g.id].sigtap;
                            if (!gCode) continue;

                            const isMacro = (g.sigtapTargetType && ['Group', 'SubGroup', 'Form', 'Grupo', 'Subgrupo', 'Forma'].includes(g.sigtapTargetType)) || gCode.length < 10;

                            let added = false;
                            if (isMacro) {
                                if (pCodeClean.startsWith(gCode)) added = true;
                            } else {
                                if (pCodeClean === gCode) added = true;
                            }

                            if (added) {
                                results[g.id].qty += pQty;
                            }
                        }
                    }
                }
            }
        }
    }

    let metasGlobaisAtingidas = 0;

    console.log(`\n--- DETALHAMENTO DE CADA META EM FEV/2026 ---`);
    for (const gId in results) {
        const r = results[gId];
        console.log(`Procedimento: ${r.name.substring(0, 50).padEnd(50)} | Realizou: ${String(r.qty).padStart(4)} | Meta Prevista: ${r.goalQty}`);
        metasGlobaisAtingidas += r.qty;
    }

    console.log(`\n=================================================`);
    console.log(`TOTAL CALCULADO NAS METAS (FEV/2026): ${metasGlobaisAtingidas}`);

}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
