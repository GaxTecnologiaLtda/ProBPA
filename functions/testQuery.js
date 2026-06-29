const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function run() {
    console.log("Starting test...");
    const year = "2026";
    const comp = "03-2026";
    // I need the exact municipality ID from the user.
    // the user used "UiWOuDVIdwoam3BTae8o" (PRIVATE) and munId "2BGe8RORtiVY632OrU2m".
    const entityId = 'UiWOuDVIdwoam3BTae8o';
    const munId = '2BGe8RORtiVY632OrU2m';
    
    console.log("Checking Connector summaries...");
    const connRef = db.collection(`municipalities/PRIVATE/${entityId}/${munId}/extractions/${year}/competences/${comp}/resumo_producao`);
    const snap = await connRef.get();
    console.log(`Connector docs: ${snap.size}`);
    snap.docs.forEach(d => console.log('Doc ID:', d.id));

    process.exit(0);
}

run().catch(console.error);
