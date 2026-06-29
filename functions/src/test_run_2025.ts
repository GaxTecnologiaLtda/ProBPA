import * as admin from "firebase-admin";

const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

import { runConnectorAggregation } from "./aggregation/aggregateConnectorProduction";

async function run() {
    try {
        console.log("Locally testing Connector Aggregation for 2025...");
        const result = await runConnectorAggregation("PRIVATE", "wfgKMoGlzgf5OKzCK3PJ", "W1Tle7q1NUKkQiIgvEFI", "2025");
        console.log("Result:", result);
    } catch (e) {
        console.error("Failed:", e);
    }
}

run().then(() => process.exit(0));
