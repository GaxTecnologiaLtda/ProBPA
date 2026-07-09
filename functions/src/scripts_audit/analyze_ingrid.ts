import * as fs from 'fs';
import * as path from 'path';

function summarizeData(filePath: string, type: 'Global' | 'Scoped') {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    console.log(`\n========================================`);
    console.log(`--- SUMMARY FOR ${type} DATA ---`);
    console.log(`========================================\n`);

    console.log(`Total Procedures: ${data.procedures.length}`);

    const compSums: Record<string, Record<string, number>> = {};

    data.procedures.forEach((p: any) => {
        let comp = "UNKNOWN";
        if (p.path.includes('/competencias/')) {
            const parts = p.path.split('/');
            const idx = parts.indexOf('competencias');
            if (idx !== -1 && idx + 1 < parts.length) {
                comp = parts[idx + 1];
            }
        }
        
        let unit = p.unitName || 'UNKNOWN_UNIT';

        if (!compSums[comp]) compSums[comp] = {};
        compSums[comp][unit] = (compSums[comp][unit] || 0) + 1;
    });

    for (const [comp, units] of Object.entries(compSums)) {
        console.log(`\n[Competência ${comp}]`);
        for (const [unit, count] of Object.entries(units)) {
            console.log(`  - ${unit}: ${count} procedimentos`);
        }
    }

    if (type === 'Scoped' && data.resumo_producao) {
        console.log(`\n--- RESUMO PRODUCAO (Totalizadores da UI) ---`);
        const resumoSums: Record<string, Record<string, number>> = {};

        data.resumo_producao.forEach((r: any) => {
            let comp = "UNKNOWN";
            if (r.path.includes('/competencias/')) {
                const parts = r.path.split('/');
                const idx = parts.indexOf('competencias');
                if (idx !== -1 && idx + 1 < parts.length) {
                    comp = parts[idx + 1];
                }
            }
            if (!resumoSums[comp]) resumoSums[comp] = {};

            if (r.units) {
                for (const unitData of Object.values(r.units)) {
                    const u = unitData as any;
                    const uName = u.unitName;
                    
                    if (u.professionals && u.professionals['HSRxEkd3nBxWrNwooHzC']) {
                        const profRecord = u.professionals['HSRxEkd3nBxWrNwooHzC'];
                        
                        let totalProcsInDay = 0;
                        if (profRecord.procedures) {
                            for (const amount of Object.values(profRecord.procedures)) {
                                totalProcsInDay += (amount as number);
                            }
                        }
                        resumoSums[comp][uName] = (resumoSums[comp][uName] || 0) + totalProcsInDay;
                    }
                }
            }
        });

        for (const [comp, units] of Object.entries(resumoSums)) {
            console.log(`\n[Resumo - Competência ${comp}]`);
            for (const [unit, count] of Object.entries(units)) {
                console.log(`  - ${unit}: ${count} procedimentos sumarizados`);
            }
        }
    }
}

const globalFile = path.join(__dirname, 'ingrid_data.json');
const scopedFile = path.join(__dirname, 'ingrid_scoped_data.json');

summarizeData(globalFile, 'Global');
summarizeData(scopedFile, 'Scoped');
