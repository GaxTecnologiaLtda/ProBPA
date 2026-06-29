import * as admin from 'firebase-admin';

admin.initializeApp();

async function testBackend() {
  const db = admin.firestore();
  const entityId = 'UiWOuDVIdwoam3BTae8o'; // Gax
  const munId = '2BGe8RORtiVY632OrU2m'; // Catende
  const competence = '03/2026';
  const cId = '03-2026';
  
  // 1. Fetch professionals
  const profsSnap = await db.collection('professionals').where('entityId', '==', entityId).get();
  const professionals = profsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const activeProfIds = new Set<string>();
  const cnsMap = new Map<string, string>();
  const cpfMap = new Map<string, string>();
  const nameMap = new Map<string, string>();

  professionals.forEach((p: any) => {
      activeProfIds.add(p.id);
      if (p.cns) cnsMap.set(String(p.cns).replace(/\D/g, ''), p.id);
      if (p.cpf) cpfMap.set(String(p.cpf).replace(/\D/g, ''), p.id);
      if (p.name) nameMap.set(String(p.name).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), p.id);
  });
  
  console.log(`Loaded ${professionals.length} active professionals for entity ${entityId}`);
  
  let connectorCount = 0;
  let manualCount = 0;
  
  // 2. Fetch Connector
  const connectorPath = `municipalities/PRIVATE/${entityId}/${munId}/extractions/2026/competences/${cId}/extraction_records`;
  const connectorSnap = await db.collection(connectorPath).get();
  
  let acceptedC = 0, droppedC_Glosa = 0, droppedC_Prof = 0;
  
  connectorSnap.docs.forEach(d => {
      const row = d.data();
      let rawCode = String(row.procedureCode || row.procedure?.code || '').toUpperCase();
      let rawName = String(row.procedureName || row.procedure?.name || '').toUpperCase();

      // Glosa: Procedimento inválido
      if (!rawCode || rawCode === '-' || rawCode === 'NULL' || rawName.includes('NÃO ENCONTRADO')) {
          droppedC_Glosa++; return;
      }

      // Glosa: Paciente não identificado
      const pName = String(row.patient?.name || row.patientName || '').trim().toUpperCase();
      if (!pName || pName === 'NÃO IDENTIFICADO' || pName === 'NULL' || pName === '-') {
          droppedC_Glosa++; return;
      }

      const rowCboStr = String(row.professional?.cbo || row.cbo || '').trim();
      if (rowCboStr === '251605' && rawCode === 'CONSULTA' && rawName.includes('ATENDIMENTO INDIVIDUAL')) {
          rawCode = '0301010030';
          rawName = 'CONSULTA DE PROFISSIONAIS DE NÍVEL SUPERIOR NA ATENÇÃO PRIMÁRIA (EXCETO MÉDICO)';
      } else if (rawCode === 'CONSULTA' && rawName.includes('ATENDIMENTO INDIVIDUAL')) {
          droppedC_Glosa++; return; // Filter duplicate logic specific to connector
      }

      let pId = row.professionalId;
      const pData = row.professional || {};
      const cns = String(pData.cns || row.professionalCns || '').replace(/\D/g, '');
      const cpf = String(pData.cpf || '').replace(/\D/g, '');
      const nameNorm = String(pData.name || row.professionalName || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (!pId) {
          if (cns) pId = cnsMap.get(cns);
          if (!pId && cpf) pId = cpfMap.get(cpf);
          if (!pId && cns && cns.length === 11) pId = cpfMap.get(cns);
          if (!pId && nameNorm) pId = nameMap.get(nameNorm);
      }

      if (!pId || !activeProfIds.has(pId)) {
          droppedC_Prof++; return; // Omit if unlinked / external / deleted
      }

      const qty = Number(row.quantity) || 1;
      acceptedC += qty;
  });
  
  console.log(`Connector: Accepted: ${acceptedC}, Dropped Glosa: ${droppedC_Glosa}, Dropped Prof: ${droppedC_Prof}`);
  
  // 3. Fetch Manual
  const manualPath = `municipalities/PRIVATE/${entityId}/${munId}/procedures`;
  const manualSnap = await db.collection(manualPath).where('competence', '==', competence).get();
  
  let acceptedM = 0, droppedM_Prof = 0;
  
  manualSnap.docs.forEach(d => {
      const row = d.data();
      if (row.status === 'canceled') return; 

      let pId = row.professionalId;
      if (!pId || !activeProfIds.has(pId)) {
          droppedM_Prof++; return; // Omit if professional is deleted or deactivated
      }
      
      const qty = Number(row.quantity) || 1;
      acceptedM += qty;
  });
  
  console.log(`Manual: Accepted: ${acceptedM}, Dropped Prof: ${droppedM_Prof}`);
  console.log(`Total CBO Report would show: ${acceptedC + acceptedM}`);
  
}

testBackend().catch(console.error);
