import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'probpa-025'
    });
}

const db = admin.firestore();

function normalizeString(str: string | null | undefined): string {
    if (!str) return '';
    return str.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cleanNumber(str: string | null | undefined): string {
    if (!str) return '';
    return str.replace(/\D/g, '');
}

async function run() {
    try {
        console.log("Loading extraction records...");
        const recordsPath = path.join(__dirname, 'agua_preta_02_2026.json');
        const records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
        console.log(`Loaded ${records.length} records.`);

        console.log("Fetching registered professionals for Água Preta...");
        const profsRef = db.collection('/municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/HwG1ZsOFSXLEbynV6QXZ/professionals');
        const profsSnap = await profsRef.get();
        console.log(`Found ${profsSnap.size} registered professionals.`);
        
        const registeredProfessionals: any[] = [];
        
        profsSnap.forEach(doc => {
            const data = doc.data();
            registeredProfessionals.push({
                docId: doc.id,
                name: data.name,
                normalizedName: normalizeString(data.name),
                cns: cleanNumber(data.cns),
                cpf: cleanNumber(data.cpf),
                isActive: data.isActive !== false,
                recordCount: 0
            });
        });

        const unregisteredProfessionalsMap = new Map<string, any>();
        let unmatchedRecords = 0;
        
        for (const record of records) {
            const recProf = record.professional;
            if (!recProf) {
                unmatchedRecords++;
                continue;
            }

            const recCns = cleanNumber(recProf.cns);
            const recCpf = cleanNumber(recProf.cpf);
            const recName = normalizeString(recProf.name);

            // Try to find a match
            let matchedProf = registeredProfessionals.find(p => 
                (recCns && p.cns === recCns) ||
                (recCpf && p.cpf === recCpf) ||
                (recName && p.normalizedName === recName)
            );

            if (matchedProf) {
                matchedProf.recordCount++;
            } else {
                // Track unregistered professional
                const key = recCns || recCpf || recName || 'UNKNOWN';
                
                if (unregisteredProfessionalsMap.has(key)) {
                    unregisteredProfessionalsMap.get(key).recordCount++;
                } else {
                    unregisteredProfessionalsMap.set(key, {
                        name: recProf.name || 'UNKNOWN',
                        cns: recProf.cns || null,
                        cpf: recProf.cpf || null,
                        cbo: recProf.cbo || null,
                        recordCount: 1
                    });
                }
            }
        }

        const registeredResult = registeredProfessionals
            .map(p => ({
                docId: p.docId,
                name: p.name,
                cns: p.cns,
                cpf: p.cpf,
                isActive: p.isActive,
                recordCount: p.recordCount
            }))
            .sort((a, b) => b.recordCount - a.recordCount);

        const unregisteredResult = Array.from(unregisteredProfessionalsMap.values())
            .sort((a, b) => b.recordCount - a.recordCount);

        const totalRegisteredRecords = registeredResult.reduce((sum, p) => sum + p.recordCount, 0);
        const totalUnregisteredRecords = unregisteredResult.reduce((sum, p) => sum + p.recordCount, 0);

        console.log(`\n-- SUMMARY --`);
        console.log(`Total Records: ${records.length}`);
        console.log(`Records from Registered Professionals: ${totalRegisteredRecords}`);
        console.log(`Records from Unregistered Professionals: ${totalUnregisteredRecords}`);
        console.log(`Records with no professional data at all: ${unmatchedRecords}`);

        const outPath = path.join(__dirname, 'agua_preta_prof_enhanced_counts_02_2026.json');
        fs.writeFileSync(outPath, JSON.stringify({
            summary: {
                total_extraction_records: records.length,
                records_from_registered: totalRegisteredRecords,
                records_from_unregistered: totalUnregisteredRecords,
                records_missing_professional_data: unmatchedRecords
            },
            registered_professionals_summary: {
                total_count: registeredResult.length,
                active_with_production: registeredResult.filter(p => p.recordCount > 0 && p.isActive).length,
                inactive_with_production: registeredResult.filter(p => p.recordCount > 0 && !p.isActive).length,
                zero_production: registeredResult.filter(p => p.recordCount === 0).length,
            },
            unregistered_professionals_count: unregisteredResult.length,
            registered_professionals: registeredResult,
            unregistered_professionals: unregisteredResult
        }, null, 2), 'utf-8');

        console.log(`Report generated successfully at: ${outPath}`);

    } catch (e: any) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}

run();
