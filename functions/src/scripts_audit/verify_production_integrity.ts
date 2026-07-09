import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'probpa-025' });
}

const db = admin.firestore();

async function run() {
    console.log("Checking exact node provided by user...");
    const exactPath = `municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/nbXlyOu61viHJJxuV6IA/bpai_records/HR2hbn0eKVx3MLfhOXGp/professionals/wfgKMoGlzgf5OKzCK3PJ_00927502496/competencias/2026-02/dates/24-02-2026/pacientes/1AofpzmgyipAVBDu4fRN/procedures/kbUzOM1R6Wo2XnssJIsp`;

    const docRef = db.doc(exactPath);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
        console.log(`✅ EXACT NODE FOUND! Data:`);
        console.log(JSON.stringify(docSnap.data(), null, 2));

        // Now let's try to query the upper collections!
        const profRef = db.doc(`municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/nbXlyOu61viHJJxuV6IA/bpai_records/HR2hbn0eKVx3MLfhOXGp/professionals/wfgKMoGlzgf5OKzCK3PJ_00927502496`);
        const comps = await profRef.collection('competencias').get();
        console.log(`Competencias count: ${comps.size}`);
        
        let totalRawProc = 0;
        for (const c of comps.docs) {
             const dates = await c.ref.collection('dates').get();
             for (const d of dates.docs) {
                 const pacs = await d.ref.collection('pacientes').get();
                 for (const p of pacs.docs) {
                     const procs = await p.ref.collection('procedures').get();
                     totalRawProc += procs.size;
                 }
             }
        }
        console.log(`TOTAL PROCEDURES CASCADED FOR ANAXIMANDRO: ${totalRawProc}`);

    } else {
        console.log(`⚠️ EXACT NODE NOT FOUND!`);
    }

    // How about the global production_records collection?
    const globalRef = db.collection('municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/nbXlyOu61viHJJxuV6IA/production_records');
    const q1 = await globalRef.where('professionalId', '==', 'wfgKMoGlzgf5OKzCK3PJ_00927502496').get();
    const q2 = await globalRef.where('professional.id', '==', 'wfgKMoGlzgf5OKzCK3PJ_00927502496').get();
    console.log(`Global Production Records: ${q1.size} (using professionalId), ${q2.size} (using professional.id)`);
}

run().catch(console.error);
