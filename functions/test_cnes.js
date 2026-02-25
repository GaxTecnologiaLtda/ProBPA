const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

async function run() {
    console.log("Fetching units...");
    try {
        const snap = await db.collection('municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/Uf062kriogg0ys31zC4M/units').get();
        console.log(`Grabbed ${snap.size} units`);
        snap.forEach(doc => {
            const d = doc.data();
            if(d.cnes && typeof d.cnes === 'string' && d.cnes.includes('2636247')) {
                console.log(`FOUND UNIT IN DB: ID=${doc.id}, Name=${d.name}, CNES="${d.cnes}", CNES Length=${d.cnes.length}`);
            }
        });

        console.log("\nFetching one extraction record...");
        const recs = await db.collection('municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/Uf062kriogg0ys31zC4M/extractions/2026/competences/01-2026/extraction_records').limit(300).get();
        console.log(`Grabbed ${recs.size} recs`);
        recs.forEach(doc => {
            const d = doc.data();
            if(d.unit && d.unit.cnes && typeof d.unit.cnes === 'string' && d.unit.cnes.includes('2636247')) {
                 console.log(`FOUND RECORD: ID=${doc.id}, Unit CNES="${d.unit.cnes}", CNES Length=${d.unit.cnes.length}, Type=${typeof d.unit.cnes}`);
            }
        });
    } catch (e) { console.error(e) }

    process.exit(0);
}
run().catch(console.error);
