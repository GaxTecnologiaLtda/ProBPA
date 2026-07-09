import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'probpa-025'
    });
}

const db = admin.firestore();

async function run() {
    try {
        console.log(`\n========================================`);
        console.log(`--- DEEP AUDIT FOR INGRID BEATRIZ ---`);
        console.log(`========================================\n`);

        console.log(`1. BUSCANDO A PROFISSIONAL POR NOME (collectionGroup('professionals'))`);
        
        const profSnap = await db.collectionGroup('professionals').get();
        const matches: any[] = [];
        
        profSnap.forEach((doc) => {
             const d = doc.data();
             if (d.name && d.name.toLowerCase().includes('ingrid beatriz')) {
                 matches.push({
                     path: doc.ref.path,
                     id: doc.id,
                     name: d.name,
                     cns: d.cns,
                     entityId: d.entityId,
                     units: d.units || d.assignments,
                     active: d.active
                 });
             }
        });

        console.log(`-> Encontrados ${matches.length} perfis com o nome contendo "Ingrid Beatriz".`);
        console.log(JSON.stringify(matches, null, 2));

        if (matches.length === 0) {
            console.log("Nenhum profissional encontrado com esse nome.");
            process.exit(0);
        }

        const uniqueIds = [...new Set(matches.map(m => m.id))];

        console.log(`\n----------------------------------------`);
        console.log(`2. BUSCANDO PRODUÇÕES (collectionGroup('procedures')) PARA OS IDs: ${uniqueIds.join(', ')}`);
        
        for (const profId of uniqueIds) {
            console.log(`\n>>> Buscando produções do ID: ${profId}`);
            const snapshot = await db.collectionGroup('procedures')
                .where('professionalId', '==', profId)
                .get();
            
            console.log(`-> Encontrados ${snapshot.size} procedimentos para ${profId}.\n`);
            
            const summary: Record<string, any[]> = {};
            const rawRecords: any[] = [];

            snapshot.forEach(d => {
                const data = d.data();
                const path = d.ref.path;
                
                let pathComp = "DESCONHECIDO";
                if (path.includes('/competencias/')) {
                    const parts = path.split('/');
                    const idx = parts.indexOf('competencias');
                    if (idx !== -1 && idx + 1 < parts.length) {
                        pathComp = parts[idx + 1];
                    }
                }
                
                if (!summary[pathComp]) summary[pathComp] = [];
                
                const rec = {
                    docId: d.id,
                    path: path,
                    attendanceDate: data.attendanceDate,
                    procedureCode: data.procedureCode,
                    unitId: data.unitId,
                    unitName: data.unitName,
                    entityId: data.entityId,
                    status: data.status
                };
                summary[pathComp].push(rec);
                rawRecords.push(rec);
            });

            console.log(`=== RAW JSON DATA FOR ID ${profId} ===`);
            console.log(JSON.stringify(rawRecords.slice(0, 10), null, 2));
            if (rawRecords.length > 10) console.log(`... and ${rawRecords.length - 10} more records.`);

            console.log(`\n=== SUMMARY FOR ID ${profId} ===`);
            for (const [comp, records] of Object.entries(summary)) {
                console.log(`\n*** COMPETÊNCIA: ${comp} (${records.length} registros) ***`);
                const uniqueUnits = [...new Set(records.map(r => r.unitName))];
                console.log(`    Unidades afetadas: ${uniqueUnits.join(', ')}`);
                
                console.log(`    Exemplos:`);
                records.slice(0, 3).forEach(r => {
                    console.log(`      - [${r.attendanceDate}] Proc: ${r.procedureCode} | Unidade: ${r.unitName} (ID: ${r.unitId}) | Entity: ${r.entityId}`);
                    console.log(`        Path: ${r.path}`);
                });
            }
        }

    } catch (e: any) {
        console.error("\nError reading Firestore:", e.message);
    }
    process.exit(0);
}

run();
