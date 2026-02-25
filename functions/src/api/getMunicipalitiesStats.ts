import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { logSystemEvent, LogLevel } from '../utils/logger';

export const getMunicipalitiesStats = functions
    .region("southamerica-east1")
    .runWith({ memory: "512MB", timeoutSeconds: 120 })
    .https.onCall(async (data, context) => {
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated and associated with an entity.');
        }

        const entityId = context.auth.token.entityId;
        const year = data.year || String(new Date().getFullYear());
        const db = admin.firestore();

        try {
            // Fetch Active Professionals to filter Connector data
            // Use standard collection to avoid missing composite index on collectionGroup
            const professionalsSnap = await db.collection('professionals')
                .where('entityId', '==', entityId)
                .get();

            const activeProfIds = new Set<string>();
            professionalsSnap.forEach(doc => {
                const p = doc.data();
                if (p.active !== false) { // Default to active if undefined
                    activeProfIds.add(doc.id);
                }
            });

            const allSummariesSnap = await db.collectionGroup('resumo_producao').get();

            const productionByMun: Record<string, number> = {};

            for (const doc of allSummariesSnap.docs) {
                const data = doc.data();
                const pathSegments = doc.ref.path.split('/');

                let isRelevant = false;
                let munId = '';

                // Manual Path: municipalities/{TYPE}/{ENT_ID}/{MUN_ID}/professionals/{PROF_ID}/competencias/{YYYY-MM}/resumo_producao/{DATE}
                // Connector Path: municipalities/{TYPE}/{ENT_ID}/{MUN_ID}/extractions/{YYYY}/competences/{YYYY-MM}/resumo_producao/{DATE_PROFID}

                if (pathSegments.length >= 7 && pathSegments[0] === 'municipalities' && pathSegments[2] === entityId) {
                    munId = pathSegments[3];

                    const compIndex = pathSegments.indexOf('competencias');
                    const extIndex = pathSegments.indexOf('extractions');

                    if (compIndex !== -1 && pathSegments.length > compIndex + 1) {
                        // Manual Record
                        const competence = pathSegments[compIndex + 1];
                        if (competence.startsWith(year)) isRelevant = true;
                    } else if (extIndex !== -1 && pathSegments.length > extIndex + 2) {
                        // Connector Record

                        const pathYear = pathSegments[extIndex + 1];
                        if (pathYear === year) {
                            isRelevant = true;
                        }
                    }
                }

                if (!isRelevant || !munId) continue;

                if (!data.units) continue;

                let docTotalQty = 0;

                for (const uId of Object.keys(data.units)) {
                    const unitData = data.units[uId];
                    if (!unitData.professionals) continue;

                    for (const pId of Object.keys(unitData.professionals)) {
                        // Active professional filter for connector records
                        if (pathSegments.indexOf('extractions') !== -1 && !activeProfIds.has(pId)) {
                            continue;
                        }

                        const profData = unitData.professionals[pId];
                        if (!profData.procedures) continue;

                        for (const count of Object.values(profData.procedures)) {
                            const procQty = Number(count) || 0;
                            if (procQty > 0) docTotalQty += procQty;
                        }
                    }
                }

                if (docTotalQty === 0) continue;

                productionByMun[munId] = (productionByMun[munId] || 0) + docTotalQty;
            }

            await logSystemEvent(LogLevel.INFO, 'Municipalities Stats Fetched', { entityId, year }, context.auth.uid);

            return {
                statsByMun: productionByMun
            };

        } catch (error: any) {
            console.error('[getMunicipalitiesStats] Error:', error);
            await logSystemEvent(LogLevel.ERROR, 'Municipalities Stats Fetched Failed', { entityId: context.auth?.token?.entityId, error: error.message }, context.auth?.uid);
            throw new functions.https.HttpsError('internal', 'Failed to calculate municipality stats.', error.message);
        }
    });
