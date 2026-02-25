import { onRequest } from "firebase-functions/v2/https";
import { runManualAggregation } from "./aggregateManualProduction";

/**
 * HTTP Trigger for debugging Manual Aggregation logic.
 * Invoke via browser or CURL to force aggregation immediately.
 */
export const debugManualAggregation = onRequest(
    {
        region: "southamerica-east1",
        timeoutSeconds: 300,
        cors: true,
    },
    async (req, res) => {
        try {
            const competence = req.query.competence ? String(req.query.competence) : undefined;
            console.log(`[DebugTrigger] Manually invoking aggregateManualProduction logic. Competence: ${competence || 'auto (current month)'}...`);
            const result = await runManualAggregation(competence);

            res.status(200).json({
                message: `Aggregation executed successfully for ${competence || 'current month'}.`,
                details: result
            });
        } catch (error: any) {
            console.error("[DebugTrigger] Failed:", error);
            res.status(500).json({
                error: "Aggregation failed",
                message: error.message
            });
        }
    }
);
