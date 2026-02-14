
import { db } from "../firebase";
import { collection, getDocs, getDoc, query, where, collectionGroup } from "firebase/firestore";

interface ConnectorRecord {
    id: string;
    professionalId?: string;
    professionalName?: string;
    procedureCode?: string;
    procedureName?: string;
    competenceMonth?: string; // YYYY-MM
    quantity: number;
    productionDate?: string;
    municipalityId?: string;
    source: 'connector' | 'connector_fallback';
    // Patient Data
    patient?: any;
    patientName?: string;
    patientCns?: string;
    patientAge?: number;
}

const normalize = (str: string) => String(str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Simple hash for generating consistent IDs for unknown professionals
const simpleHash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return String(Math.abs(h));
}
const onlyNumbers = (text: string) => String(text).replace(/\D/g, '');

export const connectorService = {

    /**
     * Fetches aggregated connector data for the dashboard.
     * Applies duplicate filtering and professional matching.
     */
    async fetchAggregateConnectorData(
        entityId: string,
        year: string,
        municipalities: any[],
        professionals: any[],
        forceEntityType?: string
    ): Promise<ConnectorRecord[]> {
        console.log(`[ConnectorService] Fetching for ${entityId}, Year ${year}`);

        if (!municipalities || municipalities.length === 0) return [];
        if (!professionals) return [];

        // 1. Build Lookup Maps for Professionals
        const cnsMap = new Map<string, string>();
        const cpfMap = new Map<string, string>();
        const nameMap = new Map<string, string>();

        professionals.forEach((p: any) => {
            if (p.cns) cnsMap.set(onlyNumbers(p.cns), p.id);
            if (p.cpf) cpfMap.set(onlyNumbers(p.cpf), p.id);
            if (p.name) nameMap.set(normalize(p.name), p.id);
        });

        let allRecords: ConnectorRecord[] = [];

        // 2. Iterate Municipalities
        const promises = municipalities.map(async (mun) => {
            let munRecords: ConnectorRecord[] = [];

            try {
                // Resolve Path Context
                const ctx = mun._pathContext || {};

                // Priority: Force Type > Context > Property > Default
                let mEntityType = forceEntityType;

                if (!mEntityType) {
                    mEntityType = ctx.entityType || mun.entityType || 'PUBLIC';
                    if (mEntityType === 'public_entities') mEntityType = 'PUBLIC';
                    if (mEntityType === 'private_entities') mEntityType = 'PRIVATE';
                }

                // Ensure standardization
                mEntityType = (mEntityType?.toUpperCase() === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';

                const mEntityId = mun.entityId || ctx.entityId || entityId;

                // Instead of listing competences (which fails if docs are phantom), we iterate expected MM-YYYY
                // We assume Standard MM-YYYY format based on ingestion script.
                // If needed, we can try MMYYYY too, but let's stick to MM-YYYY first.

                const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
                const compPromises = months.map(async (mm) => {
                    const compId = `${mm}-${year}`;

                    const path = `municipalities/${mEntityType}/${mEntityId}/${mun.id}/extractions/${year}/competences/${compId}/extraction_records`;
                    // console.log(`[ConnectorService] Accessing: ${path}`);

                    try {
                        const recordsRef = collection(db, path);
                        const recSnap = await getDocs(recordsRef);

                        if (recSnap.empty) return [];

                        return recSnap.docs.map(d => {
                            const data = d.data();
                            const rawCode = String(data.procedureCode || data.procedure?.code || '').toUpperCase();
                            const rawName = String(data.procedureName || data.procedure?.name || '').toUpperCase();

                            // A. FILTER DUPLICATES (Logic from ConnectorDashboard)
                            if (rawCode === 'CONSULTA' && rawName.includes('ATENDIMENTO INDIVIDUAL')) {
                                return null;
                            }

                            // B. MATCH PROFESSIONAL
                            let pId = data.professionalId;
                            let pName = data.professionalName;

                            if (!pId) {
                                const pData = data.professional || {};
                                const cns = onlyNumbers(pData.cns);
                                const cpf = onlyNumbers(pData.cpf);
                                const name = normalize(pData.name);

                                if (cns) pId = cnsMap.get(cns);
                                if (!pId && cpf) pId = cpfMap.get(cpf);
                                if (!pId && name) pId = nameMap.get(name);

                                if (pId) {
                                    const match = professionals.find((p: any) => p.id === pId);
                                    if (match) pName = match.name;
                                }
                                if (!pName) pName = pData.name;
                            }

                            // C. VALIDATE PROFESSIONAL (Must be registered in Entity)
                            if (!pId) return null;

                            const isValidProf = professionals.some((p: any) => p.id === pId);
                            if (!isValidProf) return null;

                            return {
                                id: d.id,
                                professionalId: pId,
                                professionalName: pName,
                                procedureCode: rawCode,
                                procedureName: rawName || data.procedureName,
                                competenceMonth: compId, // Use MM-YYYY
                                quantity: Number(data.quantity) || 1,
                                productionDate: data.productionDate,
                                municipalityId: mun.id,
                                source: 'connector',
                                // Fixed: Include Patient Data
                                patient: data.patient,
                                patientName: data.patient?.name || data.patientName,
                                patientCns: data.patient?.cns || data.patient?.cpf,
                                patientAge: data.patientAge, // If pre-calc
                            } as ConnectorRecord;
                        }).filter(r => r !== null) as ConnectorRecord[];
                    } catch (e) {
                        // Ignore empty/missing collections
                        return [];
                    }
                });

                const results = await Promise.all(compPromises);
                munRecords = results.flat();


            } catch (err) {
                console.warn(`[ConnectorService] Error fetching for mun ${mun.id}:`, err);
            }

            return munRecords;
        });

        const results = await Promise.all(promises);
        allRecords = results.flat();

        console.log(`[ConnectorService] Total Valid Records: ${allRecords.length}`);
        return allRecords;
    },

    /**
     * Fetches connector data for a specific competence (MM-YYYY).
     * Used for Reports and detailed views.
     */
    async fetchConnectorDataForCompetence(
        entityId: string,
        competence: string, // "MM-YYYY" or "MM/YYYY"
        municipalities: any[],
        professionals: any[],
        forceEntityType?: string
    ): Promise<ConnectorRecord[]> {
        console.log(`[ConnectorService] Fetching competence ${competence} for ${entityId}`);

        if (!municipalities || municipalities.length === 0) return [];

        // 1. Build Lookup Maps
        const cnsMap = new Map<string, string>();
        const cpfMap = new Map<string, string>();
        const nameMap = new Map<string, string>();

        if (professionals) {
            professionals.forEach((p: any) => {
                if (p.cns) cnsMap.set(onlyNumbers(p.cns), p.id);
                if (p.cpf) cpfMap.set(onlyNumbers(p.cpf), p.id);
                if (p.name) nameMap.set(normalize(p.name), p.id);
            });
        }

        // 2. Parse Competence to YYYY and MM-YYYY
        let compId = competence.replace('/', '-');
        let year = '';

        if (compId.includes('-')) {
            const parts = compId.split('-');
            if (parts[0].length === 4) {
                // YYYY-MM -> MM-YYYY
                year = parts[0];
                compId = `${parts[1]}-${parts[0]}`;
            } else {
                // MM-YYYY
                year = parts[1];
            }
        } else {
            // Assume MMYYYY
            year = compId.substring(2);
            compId = `${compId.substring(0, 2)}-${year}`;
        }

        let allRecords: ConnectorRecord[] = [];

        const promises = municipalities.map(async (mun) => {
            try {
                // Resolve Entity Type
                const ctx = mun._pathContext || {};
                let mEntityType = forceEntityType;
                if (!mEntityType) {
                    mEntityType = ctx.entityType || mun.entityType || 'PUBLIC';
                    if (mEntityType === 'public_entities') mEntityType = 'PUBLIC';
                    if (mEntityType === 'private_entities') mEntityType = 'PRIVATE';
                }
                mEntityType = (mEntityType?.toUpperCase() === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';

                const mEntityId = mun.entityId || ctx.entityId || entityId;

                // Path: municipalities/{type}/{entity}/{mun}/extractions/{YYYY}/competences/{MM-YYYY}/extraction_records
                const path = `municipalities/${mEntityType}/${mEntityId}/${mun.id}/extractions/${year}/competences/${compId}/extraction_records`;

                // console.log(`[ConnectorService] Querying: ${path}`);
                const recordsRef = collection(db, path);
                const snapshot = await getDocs(recordsRef);

                if (snapshot.empty) return [];

                return snapshot.docs.map(d => {
                    const data = d.data();
                    const rawCode = String(data.procedureCode || data.procedure?.code || '').toUpperCase();
                    const rawName = String(data.procedureName || data.procedure?.name || '').toUpperCase();

                    // A. FILTER DUPLICATES
                    if (rawCode === 'CONSULTA' && rawName.includes('ATENDIMENTO INDIVIDUAL')) {
                        return null;
                    }

                    // B. MATCH PROFESSIONAL
                    let pId = data.professionalId;
                    let pName = data.professionalName;

                    if (!pId) {
                        const pData = data.professional || {};
                        const cns = onlyNumbers(pData.cns);
                        const cpf = onlyNumbers(pData.cpf);
                        const name = normalize(pData.name);

                        // 1. CNS Match
                        if (cns) pId = cnsMap.get(cns);

                        // 2. CPF Match (including CNS as CPF fallback logic from Dashboard)
                        if (!pId) {
                            if (cpf) pId = cpfMap.get(cpf);

                            // Fallback: Check if CNS is actually a CPF (11 digits)
                            if (!pId && cns && cns.length === 11) {
                                pId = cpfMap.get(cns);
                            }
                        }

                        // 3. Name Match
                        if (!pId && name) pId = nameMap.get(name);

                        // 4. Resolve Name if ID found
                        if (pId && professionals) {
                            const match = professionals.find((p: any) => p.id === pId);
                            if (match) pName = match.name;
                        }

                        if (!pName) pName = pData.name;

                        // 5. FINAL FALLBACK: Generate ID if still missing (for Reports)
                        // This ensures we don't drop the record even if we can't link to a system professional.
                        if (!pId) {
                            if (cns) pId = `ext_${cns}`;
                            else if (cpf) pId = `ext_${cpf}`;
                            else if (pName) pId = `ext_${simpleHash(pName)}`; // Need simpleHash helper or just use name
                            else pId = `ext_unknown_${d.id}`;
                        }
                    }

                    if (!pId) return null; // Should be impossible now unless empty record

                    // RELAXED VALIDATION FOR REPORTING:
                    // If 'professionals' list is provided, we TRY to validate, but if not found, we still return the record 
                    // if it has a valid ID (CNS/CPF based).
                    // This ensures reports show ALL production, even if the professional is not in the current 'professionals' list snapshot.

                    // const isValidProf = professionals ? professionals.some((p: any) => p.id === pId) : true;
                    // if (!isValidProf) return null; 

                    // Instead, we just ensure pId is something valid-ish.
                    // The report service will have to handle "Unknown Professional" or mapped names.


                    return {
                        id: d.id,
                        professionalId: pId,
                        professionalName: pName,
                        procedureCode: rawCode,
                        procedureName: rawName || data.procedureName,
                        competenceMonth: compId,
                        quantity: Number(data.quantity) || 1,
                        productionDate: data.productionDate,
                        municipalityId: mun.id,
                        source: 'connector',
                        // Fixed: Include Patient Data for Reports
                        patient: data.patient,
                        patientName: data.patient?.name || data.patientName,
                        patientCns: data.patient?.cns || data.patient?.cpf,
                        patientAge: data.patientAge
                    } as ConnectorRecord;
                }).filter(r => r !== null) as ConnectorRecord[];

            } catch (err) {
                console.warn(`[ConnectorService] Failed to fetch competence ${compId} for mun ${mun.id}`, err);
                return [];
            }
        });

        const results = await Promise.all(promises);
        allRecords = results.flat();
        return allRecords;
    }
};
