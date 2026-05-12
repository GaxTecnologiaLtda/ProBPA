import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';

    console.log(`Buscando extrações desconhecidas em Fev 2026...`);
    const extRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/02-2026/extraction_records`);
    const snap = await extRef.get();

    const unknownProfiles = new Map<string, number>();
    const unknownExIds = new Map<string, number>();

    snap.forEach(d => {
        const data = d.data();
        if (data.mappedUnitId === 'unknown_unit' || !data.mappedUnitId) {
            const profile = `CNES: ${data.unit?.cnes || 'Vazio'} | ExtID_Prefix: ${String(data.externalId).substring(0, 15)} | Inep: ${data.unit?.inep || 'Vazio'}`;
            unknownProfiles.set(profile, (unknownProfiles.get(profile) || 0) + 1);

            // Collect the first part of externalId (which often has the CNES)
            const parts = String(data.externalId).split('-');
            const firstPart = parts[0];
            unknownExIds.set(firstPart, (unknownExIds.get(firstPart) || 0) + 1);
        }
    });

    console.log(`\nPerfis de Unidades Desconhecidas encontradas:`);
    for (const [prof, count] of unknownProfiles.entries()) {
        console.log(`- ${count} registros -> ${prof}`);
    }

    console.log(`\nPrefixos de External ID nas desconhecidas:`);
    for (const [prefix, count] of unknownExIds.entries()) {
        console.log(`- ${prefix}: ${count} registros`);
    }
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
