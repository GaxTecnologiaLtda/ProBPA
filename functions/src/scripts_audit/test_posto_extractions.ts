import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

const db = admin.firestore();

async function run() {
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const munId = 'NTH6qE46dU2ytddqnmTu';
    const compFilter = '03-2026';
    const targetCnes = '4013832'; // Posto Rio do Feijão

    console.log(`Buscando fichas brutas no Conector (extraction_records) para o CNES ${targetCnes}...`);
    console.log(`Caminho: /municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/${compFilter}/extraction_records`);

    const recordsRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/${compFilter}/extraction_records`);
    const snapshot = await recordsRef.get();

    console.log(`Total de registros brutos de extração (extraction_records) para ${compFilter}: ${snapshot.size}`);

    let matchCountByCnes = 0;
    let matchCountById = 0;

    // Track unique professionals seen in this CNES to help the user
    const professionalsSeen = new Set<string>();

    snapshot.forEach(doc => {
        const data = doc.data();
        const docIdStr = String(doc.id);

        let found = false;

        // 1. Verificando o ID do documento (se os primeiros dígitos forem o CNES)
        if (docIdStr.startsWith(targetCnes) || docIdStr.includes(targetCnes)) {
            matchCountById++;
            found = true;
        }

        // 2. Verificando os campos internos (CNES explícito da unidade)
        const unitCnes = data.cnes || data.unitCnes || (data.header && data.header.cnes) || '';
        if (String(unitCnes) === targetCnes) {
            matchCountByCnes++;
            found = true;
        }

        if (found) {
            // Who is the professional?
            let profName = 'Desconhecido';
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

            if (profName && profName !== 'DESCONHECIDO') {
                professionalsSeen.add(profName);
            }
        }
    });

    console.log(`\n============== RESULTADO FINAL ==============`);
    console.log(`Fichas encontradas onde o campo 'CNES' da ficha é o Posto de Saúde: ${matchCountByCnes}`);
    console.log(`Fichas encontradas onde o ID do Documento contém o CNES do Posto: ${matchCountById}`);
    console.log(`\nProfissionais diferentes que registraram algo neste CNES em Fevereiro via Conector:`);
    if (professionalsSeen.size > 0) {
        professionalsSeen.forEach(p => console.log(` - ${p}`));
    } else {
        console.log(` (Nenhum profissional listado/encontrado)`);
    }
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
