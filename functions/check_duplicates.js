const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'probpa-025' });
const db = admin.firestore();

async function run() {
  const entityId = 'wfgKMoGlzgf5OKzCK3PJ'; // Instituto Reviver Brasil
  const year = '2026';
  
  const allSummariesSnap = await db.collectionGroup('resumo_producao').get();
  
  let totalManual = 0;
  
  for (const doc of allSummariesSnap.docs) {
      const data = doc.data();
      const pathSegments = doc.ref.path.split('/');
      
      if (pathSegments.length >= 7 && pathSegments[0] === 'municipalities' && pathSegments[2] === entityId) {
          const munId = pathSegments[3];
          const compIndex = pathSegments.indexOf('competencias');
          
          if (compIndex !== -1 && pathSegments.length > compIndex + 1) {
              const competence = pathSegments[compIndex + 1];
              if (competence.startsWith(year)) {
                  console.log(`Path: ${doc.ref.path}, Qty: ${data.totalQuantity}`);
                  totalManual += (Number(data.totalQuantity) || 0);
              }
          }
      }
  }
  
  console.log(`\nTotal Manual Counted: ${totalManual}`);
}
run();
