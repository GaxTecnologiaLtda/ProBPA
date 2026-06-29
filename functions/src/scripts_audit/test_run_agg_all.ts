import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

// Mock the imported function by essentially copying its execution
import { runConnectorAggregation } from '../aggregation/aggregateConnectorProduction';

async function run() {
    const entityType = 'PRIVATE';
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const year = '2026';

    const municipalities = [
        'NTH6qE46dU2ytddqnmTu', // Jucurutu/Pedro Avelino
        'AfF1O2pVaDF5C6HJ3NYn'  // Touros
    ];

    for (const mun of municipalities) {
        console.log(`Running aggregation for ${mun}...`);
        try {
            await runConnectorAggregation(entityType, entityId, mun, year);
            console.log(`Aggregation finished for ${mun}.`);
        } catch (e) {
            console.error(`Aggregation failed for ${mun}:`, e);
        }
    }
}

run().then(() => process.exit(0));
