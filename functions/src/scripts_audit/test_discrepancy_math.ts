import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ'; // Entity
    const munId = 'NTH6qE46dU2ytddqnmTu'; // Pedro Avelino
    const vigencyYear = '2026';
    const compKey = '02-2026';

    console.log(`Analyzing Pedro Avelino (${munId}) for ${compKey}`);

    // 1. Fetch Goals for Pedro Avelino
    console.log(`Fetching goals via collectionGroup...`);
    const goalsSnap = await db.collectionGroup('goals').where('entityId', '==', entityId).get();
    const goalsToProcess: any[] = [];
    goalsSnap.forEach(g => {
        const d = g.data();
        if (d.municipalityId === munId) {
            goalsToProcess.push({ id: g.id, ...d });
        }
    });
    console.log(`Found ${goalsToProcess.length} goals.`);

    // 2. Mock 'getGoalsProgress' logic
    let metasGlobaisTotal = 0;

    // 3. Mock 'getUnitComparativeStats' logic
    let comparativoTotal = 0;
    let comparativoTotalConsiderandoMetas = 0;

    // 4. Mock 'Profissional Individualizado' logic (Total raw)
    let profissionalTotal = 0;

    // We process only extractions for now (to see if discrepancy is there)
    // Both Metas and Comparativo read from resumo_producao
    const resumoSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/${vigencyYear}/competences/${compKey}/resumo_producao`).get();

    // Also read manual production
    const profsSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/professionals`).get();
    const activeProfIds = new Set<string>();
    profsSnap.forEach(p => activeProfIds.add(p.id));

    // Get units to simulate the comparative report frontend logic
    const unitsSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/units`).get();
    const activeUnitIds = new Set<string>();
    unitsSnap.forEach(u => activeUnitIds.add(u.id));

    console.log(`Active Profs: ${activeProfIds.size}, Active Units: ${activeUnitIds.size}`);

    // Fetch Manual Production (resumo_producao under professionals)
    const manualSummaries: any[] = [];
    for (const pId of activeProfIds) {
        const manSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${munId}/professionals/${pId}/competencias/${compKey}/resumo_producao`).get();
        manSnap.forEach(d => manualSummaries.push(d.data()));
    }

    // Process both extraction and manual summaries
    const allSummaries = [
        ...resumoSnap.docs.map(d => ({ data: d.data(), type: 'extractions', date: d.id, path: d.ref.path })),
        ...manualSummaries.map(data => ({ data, type: 'manual', path: 'manual' }))
    ];

    let goalHits: Record<string, number> = {};

    for (const item of allSummaries) {
        const summaryData = item.data;
        if (!summaryData.units) continue;

        for (const uFromDoc of Object.keys(summaryData.units)) {
            const unitData = summaryData.units[uFromDoc];
            if (!unitData.professionals) continue;

            for (const pFromDoc of Object.keys(unitData.professionals)) {

                // Metas Globais active prof logic
                let isProfActive = activeProfIds.has(pFromDoc);

                const profData = unitData.professionals[pFromDoc];
                if (!profData.procedures) continue;

                for (const [pCodeRaw, pQtyRaw] of Object.entries(profData.procedures)) {
                    const pQty = Number(pQtyRaw);
                    if (isNaN(pQty)) continue;

                    profissionalTotal += pQty; // Total raw for Profissional Individualizado

                    const pCodeClean = String(pCodeRaw).replace(/\D/g, '');

                    // --- METAS GLOBAIS LOGIC ---
                    if (item.type === 'manual' || isProfActive) { // Metas Globais extractions filter
                        for (const g of goalsToProcess) {
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

                            const gCode = String(g.sigtapCode || g.procedureCode || '').replace(/\D/g, '');
                            if (!gCode) continue;

                            const isMacro = (g.sigtapTargetType && ['Group', 'SubGroup', 'Form', 'Grupo', 'Subgrupo', 'Forma'].includes(g.sigtapTargetType)) || gCode.length < 10;

                            let added = false;
                            if (isMacro) {
                                if (pCodeClean.startsWith(gCode)) added = true;
                            } else {
                                if (pCodeClean === gCode) added = true;
                            }

                            if (added) {
                                metasGlobaisTotal += pQty;
                                goalHits[gCode] = (goalHits[gCode] || 0) + pQty;
                            }
                        }
                    }

                    // --- COMPARATIVO DE UNIDADES LOGIC ---
                    // The backend sends everything, but the FRONTEND filters out procedures that don't match the units list or the goals list.
                    // Let's assume the frontend logic from UnitComparativeReport.tsx
                    // Frontend loops through active Units:
                    if (activeUnitIds.has(uFromDoc)) {
                        comparativoTotal += pQty; // Total for units that are active

                        // BUT Comparative ALSO filters by goals! Let's mimic the frontend 'does this procedure exist in goals' check.
                        let isGoal = false;
                        for (const g of goalsToProcess) {
                            const gCode = String(g.sigtapCode || g.procedureCode || '').replace(/\D/g, '');
                            if (!gCode) continue;

                            // WARNING: The frontend does NOT strip punctuation from the summary keys!
                            // `getUnitComparativeStats` sends keys with punctuation if they were manual.
                            // The frontend logic: procedureCode.startsWith(rawGoalCode)
                            if (String(pCodeRaw).startsWith(gCode)) {
                                isGoal = true;
                            } else if (pCodeClean.startsWith(gCode)) {
                                isGoal = true;
                            }
                        }

                        if (isGoal) {
                            comparativoTotalConsiderandoMetas += pQty;
                        }
                    }
                }
            }
        }
    }

    console.log(`\n=== METAS GLOBAIS ===`);
    console.log(`Total (Mocked): ${metasGlobaisTotal}`);

    console.log(`\n=== COMPARATIVO DE UNIDADES ===`);
    console.log(`Total in Active Units (Raw): ${comparativoTotal}`);
    console.log(`Total in Active Units (Matching Goals): ${comparativoTotalConsiderandoMetas}`);

    console.log(`\n=== PROFISSIONAL INDIVIDUALIZADO ===`);
    console.log(`Total (Raw all units, all procedures): ${profissionalTotal}`);

    // Let's find why Metas Globais diverges from Comparativo
    console.log(`\nDiff between Metas Globais and Comparativo (Goal Matched): ${metasGlobaisTotal - comparativoTotalConsiderandoMetas}`);
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
