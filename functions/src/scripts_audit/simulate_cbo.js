const admin = require('firebase-admin');
admin.initializeApp({projectId: 'probpa-025'});
const db = admin.firestore();

async function simulateCboStats() {
    const municipalityId = 'W1Tle7q1NUKkQiIgvEFI';
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const startDate = '2026-01-12';
    const endDate = '2026-07-12';
    const unitId = 'GooBrmhoQbv38BooXBND';
    const unitCnes = '0559415';
    const thainaId = '8AMxmxTP7Vv1YvagJSWO';

    const competencesToFetch = [
        { compFilter: '2026-01', connectorCompId: '01-2026', year: '2026' },
        { compFilter: '2026-02', connectorCompId: '02-2026', year: '2026' },
        { compFilter: '2026-03', connectorCompId: '03-2026', year: '2026' },
        { compFilter: '2026-04', connectorCompId: '04-2026', year: '2026' },
        { compFilter: '2026-05', connectorCompId: '05-2026', year: '2026' },
        { compFilter: '2026-06', connectorCompId: '06-2026', year: '2026' },
        { compFilter: '2026-07', connectorCompId: '07-2026', year: '2026' }
    ];

    let totalProductionForThaina = 0;

    for (const comp of competencesToFetch) {
        const baseMunPath = `municipalities/PRIVATE/${entityId}/${municipalityId}`;
        
        // Connector only for now, as it's the most likely source of CNES records
        const connectorPath = `${baseMunPath}/extractions/${comp.year}/competences/${comp.connectorCompId}/resumo_producao`;
        const cSnap = await db.collection(connectorPath).get();
        for (const doc of cSnap.docs) {
            const data = doc.data();
            
            // Date filter logic from original code
            const docId = doc.id;
            const datePartMatch = docId.match(/(\d{2})-(\d{2})-(\d{4})/);
            if (datePartMatch) {
                const [, d, m, y] = datePartMatch;
                const docDateIso = `${y}-${m}-${d}`;
                if (docDateIso < startDate || docDateIso > endDate) continue;
            }

            if (data.units) {
                for (const rUnitId of Object.keys(data.units)) {
                    // Normalization logic from getCBOMunicipalStats
                    let normalizedUnitId = rUnitId;
                    if (rUnitId === unitCnes) normalizedUnitId = unitId;

                    if (normalizedUnitId !== unitId) continue;

                    const unitData = data.units[rUnitId];
                    for (const pIdKey of Object.keys(unitData.professionals)) {
                        const profData = unitData.professionals[pIdKey];
                        
                        // Check if it resolves to Thainá
                        let isThaina = (pIdKey === thainaId);
                        if (!isThaina && profData.professionalName) {
                            const norm = String(profData.professionalName).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            if (norm === "thaina camila andrade xavier") isThaina = true;
                        }

                        if (isThaina) {
                            let docCount = 0;
                            for (const count of Object.values(profData.procedures || {})) docCount += Number(count);
                            totalProductionForThaina += docCount;
                            console.log(`Found Thainá production in: ${doc.ref.path}`);
                            console.log(`  Unit Key: ${rUnitId}`);
                            console.log(`  Prof Key: ${pIdKey}`);
                            console.log(`  Count: ${docCount}, Total: ${totalProductionForThaina}`);
                            console.log(`  Procedures: ${JSON.stringify(profData.procedures)}`);
                        }
                    }
                }
            }
        }
    }

    console.log(`Final Total for Thaina: ${totalProductionForThaina}`);
}

simulateCboStats();
