import * as functions from "firebase-functions/v1";
import "./firebaseAdmin";   // inicialização centralizada do Admin SDK
import { seedDatabase } from "./seed";

export {
    grantEntityMasterAccess,
    toggleMasterAccessStatus,
    resetMasterUserPassword,
    deleteMasterUser
} from './rbac';

export { manageEntityUser, resetEntityUserPassword } from './userManagement';


// Função de seed
export const seed = functions
    .region("southamerica-east1")   // <<< REGIÃO CERTA
    .https.onRequest(async (req, res) => {
        try {
            await seedDatabase();
            res.send("Database seeded successfully!");
        } catch (err) {
            console.error(err);
            res.status(500).send("Error seeding database");
        }
    });

export * from "./rbac";
export { onMunicipalityChange } from "./licenseTriggers";
export { professionalSetClaims } from "./professionalSetClaims";
export { professionalDelete } from "./professionalDelete";
export { professionalOnUpdate } from "./professionalOnUpdate";
export {
    sendPasswordResetToken,
    verifyPasswordResetToken,
    resetPasswordWithToken
} from "./auth/passwordReset";

import { onRequest } from "firebase-functions/v2/https";
import { importSigtap } from "./sigtapImporter";

export const importSigtapCompetence = onRequest(
    {
        region: "southamerica-east1",
        timeoutSeconds: 3600, // 1 hour
        memory: "512MiB",
        cors: true, // Enable CORS
    },
    async (req, res) => {
        const competence = req.query.competence as string;

        if (!competence || !/^\d{6}$/.test(competence)) {
            res.status(400).send({ error: "Invalid competence. Format: YYYYMM" });
            return;
        }

        try {
            // Progress logging to stdout (Cloud Logging)
            const progressCallback = (status: string) => {
                console.log(`[Progress ${competence}]: ${status}`);
                // In a real async trigger, we'd write to Firestore, but user asked for HTTP response.
            };

            const result = await importSigtap(competence, progressCallback);
            res.json(result);
        } catch (error: any) {
            console.error(error);
            res.status(500).send({ error: error.message || "Internal Server Error" });
        }
    }
);

// LEDI Integrations
export { testLediConnection, scheduledLediSender, resendPendingLediRecords } from "./ledi/trigger";

// PEC Connector Ingestion
export { ingestPecData } from "./pecIngestion";