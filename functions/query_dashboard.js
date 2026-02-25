const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'probpa-025' });
const db = admin.firestore();

async function run() {
  const entityId = 'Ba7DcEYtrBRIBAK8oOdF'; // Example entityId from earlier
  const year = '2026';
  
  const allSummariesSnap = await db.collectionGroup('resumo_producao').get();
  
  const muns = {};
  
  for (const doc of allSummariesSnap.docs) {
      const data = doc.data();
      const pathSegments = doc.ref.path.split('/');
      
      let isRelevant = false;
      let munId = '';
      
      if (pathSegments.length >= 7 && pathSegments[0] === 'municipalities' && pathSegments[2] === entityId) {
          munId = pathSegments[3];
          const compIndex = pathSegments.indexOf('competencias');
          
          if (compIndex !== -1 && pathSegments.length > compIndex + 1) {
              const competence = pathSegments[compIndex + 1];
              if (competence.startsWith(year)) isRelevant = true;
          }
      }
      
      if (isRelevant && munId) {
          muns[munId] = (muns[munId] || 0) + (Number(data.totalQuantity) || 0);
      }
  }
  
  console.log('Production By Mun ID:', muns);
  
  // Resolve Names
  const munSnapshot = await db.collection('municipalities').doc('PRIVATE').collection(entityId).get();
  const munMap = new Map();
  munSnapshot.docs.forEach(doc => munMap.set(doc.id, doc.data().name));
  
  console.log('Mun Map:', Object.fromEntries(munMap));
  
  const topList = Object.entries(muns).map(([id, val]) => ({
      name: munMap.get(id) || 'Desconhecido',
      value: val
  })).sort((a,b) => b.value - a.value);
  
  console.log('Top List:', topList);
}
run();
