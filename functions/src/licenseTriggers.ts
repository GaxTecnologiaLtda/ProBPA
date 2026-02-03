import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { db } from "./firebaseAdmin";
import { License, LicenseStatus, LicenseEvent } from "./types";


export const onMunicipalityChange = functions.region("southamerica-east1").firestore
    .document("municipalities/{municipalityId}")
    .onWrite(async (change, context) => {
        const after = change.after.exists ? change.after.data() : null;
        const before = change.before.exists ? change.before.data() : null;

        // Determine Entity ID (either from new data or old data)
        const entityId = after?.linkedEntityId || before?.linkedEntityId;

        if (!entityId) {
            console.log("No entity linked to this municipality change.");
            return null;
        }

        // Fetch the active license for this entity
        const licensesSnapshot = await db.collection("licenses")
            .where("entityId", "==", entityId)
            .where("status", "==", LicenseStatus.ACTIVE)
            .limit(1)
            .get();

        if (licensesSnapshot.empty) {
            console.log(`No active license found for entity ${entityId}`);
            return null;
        }

        const licenseDoc = licensesSnapshot.docs[0];
        const licenseData = licenseDoc.data() as License;

        // Calculate new municipality count
        const municipalitiesSnapshot = await db.collection("municipalities")
            .where("linkedEntityId", "==", entityId)
            .get();

        const newCount = municipalitiesSnapshot.size;

        // Calculate new values
        const valuePerMunicipality = licenseData.valuePerMunicipality || 0;
        const newMonthlyValue = valuePerMunicipality * (newCount > 0 ? newCount : 1); // Minimum 1 for base calculation if needed, or 0? 
        // Logic in frontend was: const monthlyTotal = value * (count > 0 ? count : 1);
        // Let's stick to that logic.
        const newAnnualValue = newMonthlyValue * 12;

        // Create History Event
        let eventType: 'ADD_MUNICIPALITY' | 'REMOVE_MUNICIPALITY' | 'OTHER' = 'OTHER';
        let description = '';

        if (!before && after) {
            eventType = 'ADD_MUNICIPALITY';
            description = `Município adicionado: ${after.name}`;
        } else if (before && !after) {
            eventType = 'REMOVE_MUNICIPALITY';
            description = `Município removido: ${before.name}`;
        } else if (before && after && before.linkedEntityId !== after.linkedEntityId) {
            // Changed linkage
            if (after.linkedEntityId === entityId) {
                eventType = 'ADD_MUNICIPALITY';
                description = `Município vinculado: ${after.name}`;
            } else {
                eventType = 'REMOVE_MUNICIPALITY';
                description = `Município desvinculado: ${before.name}`;
            }
        } else {
            // Just an update, maybe status change?
            // If status changed to inactive, it effectively removes it from the count if we filter by active.
            // But currently we just count all linked.
            // Let's assume just linkage changes affect price for now.
            console.log("Municipality update did not affect linkage.");
            return null;
        }

        const newEvent: LicenseEvent = {
            date: new Date().toISOString().split('T')[0],
            description: description,
            type: eventType,
            details: `Novo valor mensal: R$ ${newMonthlyValue.toFixed(2)}`
        };

        // Update License
        await licenseDoc.ref.update({
            totalMunicipalities: newCount,
            monthlyValue: newMonthlyValue,
            annualValue: newAnnualValue,
            lastModified: new Date().toISOString(),
            history: admin.firestore.FieldValue.arrayUnion(newEvent)
        });

        console.log(`License ${licenseDoc.id} updated. New count: ${newCount}, New Monthly: ${newMonthlyValue}`);
        return null;
    });
