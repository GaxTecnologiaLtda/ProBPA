import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

// We will copy the exact getGoalsProgress logic here to see what it is counting.
async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';

    const vigencyYear = '2026';

    const goalsSnap = await db.collectionGroup('goals').where('entityId', '==', entityId).get();
    const goalsToProcess: any[] = [];
    goalsSnap.forEach(g => {
        const d = g.data();
        if (d.municipalityId === munId) {
            goalsToProcess.push({ id: g.id, ...d });
        }
    });

    console.log(`[getGoalsProgress Mock] Fetching progress for Entity: ${entityId}, Year: ${vigencyYear}, Goals: ${goalsToProcess.length}`);

    const results: Record<string, { total: number, byMonth: Record<string, number> }> = {};
    for (const g of goalsToProcess) {
        const byMonth: Record<string, number> = {};
        for (let i = 1; i <= 12; i++) byMonth[i.toString().padStart(2, '0')] = 0;
        results[g.id] = { total: 0, byMonth };
    }

    const relevantMunicipalities = new Set<string>();
    for (const g of goalsToProcess) {
        if (g.municipalityId) {
            relevantMunicipalities.add(g.municipalityId);
        }
    }

    const activeProfIds = new Set<string>();
    for (const mId of relevantMunicipalities) {
        const profsSnap = await db.collection(`municipalities/PRIVATE/${entityId}/${mId}/professionals`).get();
        profsSnap.forEach(d => activeProfIds.add(d.id));
    }

    const allSummariesSnap = await db.collectionGroup('resumo_producao').get();
    console.log(`Docs found in collectionGroup: ${allSummariesSnap.size}`);

    let totalRawQtyInAllRelevant = 0;
    let countedInGoals = 0;

    for (const doc of allSummariesSnap.docs) {
        const summaryData = doc.data();
        const pathSegments = doc.ref.path.split('/');

        let isRelevant = false;
        let p_munId = '';
        let competence = ''; // YYYY-MM

        if (pathSegments.length >= 7 && pathSegments[0] === 'municipalities' && pathSegments[2] === entityId) {
            p_munId = pathSegments[3];

            const compIndex = pathSegments.indexOf('competencias');
            const compsInd = pathSegments.indexOf('competences');
            const recordsIndex = pathSegments.indexOf('bpai_records');
            const extIndex = pathSegments.indexOf('extractions');

            if (recordsIndex !== -1 && compIndex !== -1 && pathSegments.length > compIndex + 1) {
                competence = pathSegments[compIndex + 1];
                if (competence.startsWith(vigencyYear)) {
                    isRelevant = true;
                }
            }
            else if (extIndex !== -1 && compsInd !== -1 && pathSegments.length > compsInd + 1) {
                const pathYear = pathSegments[extIndex + 1];
                if (pathYear === vigencyYear) {
                    let rawComp = pathSegments[compsInd + 1];
                    const parts = rawComp.split('-');
                    if (parts.length === 2 && parts[0].length === 2) {
                        competence = `${parts[1]}-${parts[0]}`;
                    } else {
                        competence = rawComp;
                    }
                    isRelevant = true;
                }
            }
        }

        if (!isRelevant || !summaryData.units) continue;

        const monthStr = competence.split('-')[1];
        if (!monthStr || monthStr.length !== 2) continue;

        // Let's only look at 02-2026 to figure out the 6506 figure!
        if (competence !== '2026-02') continue;

        // Wait, does the Pedro Avelino user see 6506 IN TOTAL or IN 02-2026? 
        // User: "em fevereiro/2026 temos uma marcaçã total de 6506"

        for (const uFromDoc of Object.keys(summaryData.units)) {
            const unitData = summaryData.units[uFromDoc];
            if (!unitData.professionals) continue;

            for (const pFromDoc of Object.keys(unitData.professionals)) {
                if (pathSegments.indexOf('extractions') !== -1 && activeProfIds.size > 0 && !activeProfIds.has(pFromDoc)) {
                    continue;
                }

                const profData = unitData.professionals[pFromDoc];
                if (!profData.procedures) continue;
                const proceduresMap = profData.procedures;

                for (const [pCodeRaw, pQty] of Object.entries(proceduresMap)) {
                    if (isNaN(Number(pQty))) continue;
                    totalRawQtyInAllRelevant += Number(pQty);

                    for (const g of goalsToProcess) {
                        let contextMatch = true;
                        if (g.goalType === 'municipal') {
                            if (g.municipalityId && p_munId && g.municipalityId !== p_munId) contextMatch = false;
                        } else if (g.goalType === 'unit') {
                            if (g.unitId && g.unitId !== uFromDoc) contextMatch = false;
                        } else if (g.goalType === 'professional') {
                            if (g.professionalId && g.professionalId !== 'team') {
                                if (g.professionalId !== pFromDoc) contextMatch = false;
                            } else {
                                if (g.unitId && g.unitId !== uFromDoc) contextMatch = false;
                            }
                        }

                        if (!contextMatch) continue;

                        const gCode = String(g.procedureCode || '').replace(/\D/g, '');
                        if (!gCode) continue;

                        const isMacro = (g.sigtapTargetType && ['Group', 'SubGroup', 'Form', 'Grupo', 'Subgrupo', 'Forma'].includes(g.sigtapTargetType)) || gCode.length < 10;

                        const pCode = String(pCodeRaw).replace(/\D/g, '');
                        let addedQty = 0;
                        if (isMacro) {
                            if (pCode.startsWith(gCode)) addedQty = Number(pQty);
                        } else {
                            if (pCode === gCode) addedQty = Number(pQty);
                        }

                        if (addedQty > 0) {
                            results[g.id].total += addedQty;
                            results[g.id].byMonth[monthStr] = (results[g.id].byMonth[monthStr] || 0) + addedQty;
                            countedInGoals += addedQty;
                        }
                    }
                }
            }
        }
    }

    console.log(`Total in 02-2026 for entity & goals: ${countedInGoals}`);
    // Also let's print the actual values by month for 02:
    let febTotal = 0;
    for (const goalId in results) {
        febTotal += results[goalId].byMonth['02'];
    }
    console.log(`Exactly mapped to Feb: ${febTotal}`);
    console.log(`Total raw procedures passed thru relevant data in Feb: ${totalRawQtyInAllRelevant}`);
}

run().then(() => process.exit(0));
