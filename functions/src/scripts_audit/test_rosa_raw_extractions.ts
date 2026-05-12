import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';
    const compFilter = '02-2026';
    const rosaId = 'kAh1ibXZW2J6vuWRTfqM';

    console.log(`Buscando fichas brutas no Conector (extraction_records) para a Rosa...`);
    console.log(`Caminho: /municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/${compFilter}/extraction_records`);

    const recordsRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/${compFilter}/extraction_records`);
    const snapshot = await recordsRef.get();

    console.log(`Total de registros brutos de extração (extraction_records) para ${compFilter}: ${snapshot.size}`);

    let matchCount = 0;

    snapshot.forEach(doc => {
        const data = doc.data();

        // Fichas can have the professional name in various places depending on the type
        let profName = '';

        // Determine the location of the professional name in the extraction record
        if (data.professional && typeof data.professional === 'object') {
            profName = (data.professional.name || '').toUpperCase();
        } else if (data.professionalName) {
            profName = String(data.professionalName).toUpperCase();
        } else if (data.nomeProfissional) {
            profName = String(data.nomeProfissional).toUpperCase();
        } else if (data.header && data.header.profissionalName) {
            profName = String(data.header.profissionalName).toUpperCase();
        } else if (data.header && data.header.profissional && data.header.profissional.nome) {
            profName = String(data.header.profissional.nome).toUpperCase();
        } else if (data.professionalNameStr) {
            profName = String(data.professionalNameStr).toUpperCase();
        }

        // Strict match or partial match for Professional Name
        const hasRosaName = profName.includes('ROSA') && profName.includes('LIMA');
        let rawJson = JSON.stringify(data).toUpperCase(); // rawJson is still needed for ID check
        const hasRosaId = rawJson.includes(rosaId); // Check if her ProBPA ID is anywhere in the doc

        if (hasRosaName || hasRosaId) {
            matchCount++;
            console.log(`[MATCH ENCONTRADO] Doc ID: ${doc.id}`);
            console.log(`   Profissional: ${profName || 'Sem Nome'}`);
            console.log(`   CNES/Unidade: ${data.cnes || data.unitCnes || (data.header && data.header.cnes) || 'Não especificado'}`);
            console.log(`   Por Nome: ${hasRosaName} | Por ID: ${hasRosaId}`);
            console.log(`-------------------------------------------------`);
        }
    });

    console.log(`\n============== RESULTADO FINAL ==============`);
    console.log(`Total de fichas brutas encontradas para Rosa (FEV 2026): ${matchCount}`);
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
