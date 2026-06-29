import * as admin from 'firebase-admin';

admin.initializeApp({
    projectId: "probpa-025",
});

// Mock the imported function by essentially copying its execution
import { runConnectorAggregation } from '../aggregation/aggregateConnectorProduction';

async function run() {
    const entityType = 'PRIVATE';
    const entityId = 'wfgKMoGlzgf5OKzCK3PJ';
    const municipalityId = 'NTH6qE46dU2ytddqnmTu';
    const year = '2026';

    console.log(`Running aggregation for ${municipalityId}...`);
    try {
        const result = await runConnectorAggregation(entityType, entityId, municipalityId, year);
        console.log('Result:', result);
    } catch (e) {
        console.error('Aggregation failed:', e);
        process.exit(1);
    }
}

run().then(() => process.exit(0));
