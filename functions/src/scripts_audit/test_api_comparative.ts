import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const municipalityId = 'NTH6qE46dU2ytddqnmTu';
    const compFilter = '2026-02';
    const year = '2026';
    const connectorCompId = '02-2026';

    const baseMunPath = `municipalities/PRIVATE/${entityId}/${municipalityId}`;

    const uIds = ['bFPvDAD3uXFVV5eCy4OH', '1pLxTu0VSvmrfHEZVAV3']; // Hospital, Rio do Feijao
    const result: Record<string, Record<string, number>> = {};

    // We will do exactly what getUnitComparativeStats does
    const unitsQuery = await db.collection(`${baseMunPath}/units`).get();
    const unitIds = unitsQuery.docs.map(doc => doc.id);

    const allPromises: Promise<FirebaseFirestore.DocumentData[]>[] = [];

    const manualPromises = unitIds.map(async (uId) => {
        const manualRef = db.collection(`${baseMunPath}/bpai_records/${uId}/professionals`);
        try {
            const profsDocs = await manualRef.listDocuments();
            const pPromises = profsDocs.map(async (pDoc) => {
                const pId = pDoc.id;
                const sumRef = db.collection(`${baseMunPath}/bpai_records/${uId}/professionals/${pId}/competencias/${compFilter}/resumo_producao`);
                const snap = await sumRef.get();
                return snap.docs;
            });
            const pDocsArrays = await Promise.all(pPromises);
            return pDocsArrays.flat();
        } catch (e) {
            return [];
        }
    });

    allPromises.push(...manualPromises);

    const connectorRef = db.collection(`${baseMunPath}/extractions/${year}/competences/${connectorCompId}/resumo_producao`);
    allPromises.push(connectorRef.get().then(snap => snap.docs).catch(() => []));

    const docsArrays = await Promise.all(allPromises);
    const allDocs = docsArrays.flat();

    for (const doc of allDocs) {
        const data = doc.data();
        if (!data.units) continue;

        for (const uId of Object.keys(data.units)) {
            const unitData = data.units[uId];
            if (!unitData.professionals) continue;

            if (!result[uId]) {
                result[uId] = {};
            }

            for (const pId of Object.keys(unitData.professionals)) {
                const profData = unitData.professionals[pId];
                if (!profData.procedures) continue;

                for (const [code, count] of Object.entries(profData.procedures)) {
                    const procQty = Number(count) || 0;
                    if (procQty > 0) {
                        result[uId][code] = (result[uId][code] || 0) + procQty;
                    }
                }
            }
        }
    }

    console.log(`\n--- RESULTADOS DA API COMPARATIVO ---`);
    for (const id of uIds) {
        console.log(`Unidade ID: ${id}`);
        console.log(`Total de Procedimento Diferentes: ${Object.keys(result[id] || {}).length}`);
        let totalVal = 0;
        for (const k of Object.keys(result[id] || {})) {
            totalVal += result[id][k];
        }
        console.log(`Soma de todos os procedimentos: ${totalVal}`);
        console.log(`Detalhe:`, JSON.stringify(result[id] || {}, null, 2));
    }
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
