import * as admin from 'firebase-admin';
import { runConnectorAggregation } from '../aggregation/aggregateConnectorProduction';

admin.initializeApp({
    projectId: "probpa-025",
});

async function run() {
    console.log("Forçando agregação local limpa com a nova lógica fallback de CNES e Glosas...");
    await runConnectorAggregation('PRIVATE', 'wfgKMoGlzgf5OKzCK3PJ', 'NTH6qE46dU2ytddqnmTu', '2026', '02-2026');
    console.log("Agregação finalizada.");
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
