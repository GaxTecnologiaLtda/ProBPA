const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'probpa-025' });

async function check() {
  const db = admin.firestore();
  
  // 1. Manual Procedures
  const manSnap = await db.collection('municipalities/PRIVATE/UiWOuDVIdwoam3BTae8o/2BGe8RORtiVY632OrU2m/procedures')
      .where('competence', 'in', ['03/2026', '2026-03'])
      .get();
  console.log(`Manual procedures count: ${manSnap.size}`);
  
  // 2. Connector Extraction Records
  const extSnap = await db.collection('municipalities/PRIVATE/UiWOuDVIdwoam3BTae8o/2BGe8RORtiVY632OrU2m/extractions/2026/competences/03-2026/extraction_records').get();
  let extCount = 0;
  extSnap.forEach(d => {
    extCount += Number(d.data().quantity) || 1;
  });
  console.log(`Connector Extraction records quantity sum: ${extCount}`);
  
  // 3. Resumo Producao (Dashboard source)
  const rpSnap = await db.collectionGroup('resumo_producao')
      .where('competence', '==', '2026-03')
      .where('municipalityId', '==', '2BGe8RORtiVY632OrU2m')
      .get();
  let rpCount = 0;
  rpSnap.forEach(doc => {
    const data = doc.data();
    if (data.procedures) {
      Object.values(data.procedures).forEach(v => rpCount += Number(v));
    }
  });
  console.log(`Resumo Producao procedures count sum: ${rpCount}`);
}

check().catch(console.error);
