const admin = require('./node_modules/firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// Manually load the compiled JS to test 2025 aggregation
const { runConnectorAggregation } = require('./lib/aggregation/aggregateConnectorProduction.js');

async function testAgg() {
    try {
        console.log("Running aggregation manually for W1Tle7q1NUKkQiIgvEFI / 2025");
        const res = await runConnectorAggregation("PRIVATE", "wfgKMoGlzgf5OKzCK3PJ", "W1Tle7q1NUKkQiIgvEFI", "2025");
        console.log("Result:", res);
    } catch (e) {
        console.error("Aggregation Failed!", e);
    }
}

testAgg().then(() => process.exit(0));
