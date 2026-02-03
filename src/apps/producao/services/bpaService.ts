import { db, storage } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit, serverTimestamp, writeBatch, collectionGroup, startAt, endAt } from 'firebase/firestore';

export interface BpaSharedData {
    // Operational Data
    unitId: string;
    unitName?: string;
    cbo: string;
    professionalId: string;
    professionalName: string;
    entityId: string;
    municipalityId: string;
    municipalityName: string;
    entityType?: string; // Added for Offline Path Resolution

    // Patient Data
    patientId?: string;
    patientCns: string;
    patientName: string;
    patientDob: string;
    patientAge?: string; // Added
    patientSex: string;
    patientRace: string;
    patientNationality: string;
    patientPhone: string;
    isHomeless: boolean;
    address?: {
        cep: string;
        municipalityCode: string;
        street: string;
        number: string;
        complement: string;
        district: string;
    };

    // Shared Procedure Data
    competence: string;        // YYYYMM
    competenceMonth: string;   // YYYY-MM
    attendanceDate: string;
    originFicha?: string;      // Explicit Ficha Type (INDIVIDUAL, ODONTO, PROCEDIMENTOS, VACINACAO, DOMICILIAR, COLETIVA)
    careContext?: {
        level: 'APS' | 'MAC';
        system: 'LEDI' | 'SIA';
    };

    // LEDI/APS Specifics
    shift?: string; // 'M' | 'T' | 'N'
    attendanceType?: string; // '01', '02', '03'...
    localAtendimento?: string; // '1' (UBS) | '4' (Domicílio)
    weight?: string;
    height?: string;
    // Vitals (LEDI FAI)
    pressaoArterialSistolica?: string;
    pressaoArterialDiastolica?: string;
    frequenciaRespiratoria?: string; // 0-200
    frequenciaCardiaca?: string; // 0-999
    temperatura?: string; // 20.0-45.0
    saturacaoO2?: string; // 0-100
    glicemiaCapilar?: string; // 0-800
    tipoGlicemiaCapilar?: string; // 1-Jejum, 2-Pos, 3-Outro
    perimetroCefalico?: string; // cm
    perimetroPanturrilha?: string; // cm
    circunferenciaAbdominal?: string; // cm
    // Domiciliar Fields
    desfechoVisita?: string;
    motivosVisita?: string[];

    // Prenatal Fields
    isPregnant?: boolean;
    dumDaGestante?: string; // YYYY-MM-DD
    idadeGestacional?: string;
    stGravidezPlanejada?: boolean;
    nuGestasPrevias?: string; // Added: FAI Requirement
    nuPartos?: string;

    // Misc FAI Root Fields
    ficouEmObservacao?: boolean;
    vacinaEmDia?: boolean; // Moved from evaluation? Keeping logic flexible.
    nasfs?: string[]; // 1, 2, 3 (Renamed from nasfCodes)
    emultis?: string[]; // Added: v7.3.3 e-Multi (ID 38)
    atencaoDomiciliarModalidade?: string; // 01-03
    racionalidadeSaude?: string; // Code for PICs (Legacy ID 26)
    pic?: string; // Added: FAI v7.3.3 (ID 19)
    tipoParticipacaoCidadao?: string; // Added: FAI v7.3.3 (ID 36)
    tipoParticipacaoProfissionalConvidado?: string; // Added: FAI v7.3.3 (ID 37)
    finalizadorObservacao?: { cbo: string; cns: string; cnes: string; ine?: string }; // Added: FAI v7.3.3 (ID 35)

    // Phase 2.5: Medical/Nursing Extensions
    medicamentos?: {
        codigoCatmat: string;
        viaAdministracao: string;
        dose: string;
        doseUnica: boolean;
        usoContinuo: boolean;
        doseFrequenciaTipo: string;
        doseFrequencia: string;
        dtInicioTratamento: string;
        duracaoTratamento: string;
        quantidadeReceitada: string;
    }[];
    encaminhamentos?: {
        especialidade: string;
        hipoteseDiagnosticoCID10?: string;
        hipoteseDiagnosticoCIAP2?: string;
        classificacaoRisco: string;
    }[];
    resultadosExames?: {
        exame: string;
        dataSolicitacao?: string;
        dataRealizacao?: string;
        dataResultado?: string;
        resultado?: { tipoResultado: string; valorResultado: string }[];
    }[];
    ivcf?: {
        resultado: number;
        dataResultado: string;
        hasSgIdade?: boolean;
        hasSgPercepcaoSaude?: boolean;
        hasSgAvdInstrumental?: boolean;
        hasSgAvdBasica?: boolean;
        hasSgCognicao?: boolean;
        hasSgHumor?: boolean;
        hasSgAlcancePreensaoPinca?: boolean;
        hasSgCapAerobicaMuscular?: boolean;
        hasSgMarcha?: boolean;
        hasSgContinencia?: boolean;
        hasSgVisao?: boolean;
        hasSgAudicao?: boolean;
        hasSgComorbidade?: boolean;
    };
    solicitacoesOci?: {
        codigoSigtap: string;
    }[];

    // FAD (Home Care) Specifics
    fadData?: {
        condicoesAvaliadas?: number[];
        tipoAtendimento?: number;
        atencaoDomiciliarModalidade?: number;
        condutaDesfecho?: number;
        procedimentos?: string[];
    };

    // CDS Individual (SOAP) Fields
    soaps?: {
        objective?: string; // Antropometria summary or raw text
        subjective?: string;
        evaluation?: {
            problemConditions?: {
                ciap?: string;
                cid10?: string;
                // Legacy support if needed? No, standardizing.
                situacao?: string; // FAI Logic (0=Ativo, 1=Latente, 2=Resolvido)
                isAvaliado?: boolean; // FAI Logic
                // Evolution Fields
                uuidProblema?: string;
                uuidEvolucaoProblema?: string;
                coSequencialEvolucao?: number;
                dataInicioProblema?: number; // Epoch
                dataFimProblema?: number; // Epoch
                isHistory?: boolean; // UI Flag
                // UI Helpers (Optional)
                label?: string;
                code?: string; // Optional legacy
                type?: 'CIAP2' | 'CID10'; // Optional legacy
            }[];
            // Deprecated/Moved to root: vaccinationUpToDate, ficouEmObservacao, nasfCodes
        };
        plan?: {
            conduct?: string[]; // Desfecho
            // Refined Exams Structure
            exames?: {
                codigoExame: string;
                nomeExame?: string;
                solicitadoAvaliado: string[]; // ['S'] or ['A'] or ['S', 'A']
            }[];
        };
    };

    // CDS Odonto Fields
    consultationType?: string; // '1' (Primeira), '2' (Retorno), '3' (Manutenção)
    oralHealthVigilance?: string[]; // ['01' (Abscesso), '02' (Fendas)...]
    odontoConduct?: string[]; // ['01' (Tratamento Concluído)...]

    // CDS Child Fields
    breastfeedingType?: string; // '1' (AME), '2' (Misto)...

    // Vaccination Fields (If single procedure involves vaccine)
    // Note: Usually vaccines are arrays in the procedure, but keeping flat if 1 record = 1 vaccine for simplicity initially
    vaccinationData?: {
        imunobiologico: string;
        estrategia: string;
        dose: string;
        lote: string;
        fabricante: string;
    };

    // CDS Atividade Coletiva Data
    coletivaData?: {
        inep?: string;
        numParticipantes?: number;
        tbCdsOrigem?: number;
        atividadeTipo?: string;
        temasParaReuniao?: string[];
        publicoAlvo?: string[];
        praticasEmSaude?: string[];
        procedimentos?: string[]; // Added: Supports multiple SIGTAP codes for 'Outros Procedimentos' (30)
        temasParaSaude?: string[];
        pseEducacao?: boolean; // New
        pseSaude?: boolean;    // New
        profissionais?: { cns: string; cbo: string }[];
        participantes: {
            cns?: string;
            dataNascimento?: string;
            sexo?: string;
            avaliacaoAlterada?: boolean;
            peso?: number;
            altura?: number;
            cessouHabitoFumar?: boolean;
            abandonouGrupo?: boolean;
            name?: string; // Display helper
        }[];
    };
}

export interface BpaRecordInput extends BpaSharedData {
    // Procedure Data (Legacy / Single Record)
    procedureCode: string;
    procedureName: string;
    cidCodes: string[];
    attendanceCharacter: string;
    attendanceType?: string;
    authNumber?: string;
    serviceCode?: string;
    classCode?: string;
    quantity: number;
    obs?: string;
    groupCode?: string;
    subGroupCode?: string;
    formCode?: string;
}

export interface ProcedureFormItem {
    procedureCode: string;
    procedureName: string;
    cidCodes: string[];
    attendanceCharacter: string;
    attendanceType?: string;
    authNumber?: string;
    serviceCode?: string;
    classCode?: string;
    quantity: number;
    obs?: string;
    requiresCid?: boolean;
    groupCode?: string;
    subGroupCode?: string;
    formCode?: string;
    // Collective Activity Fields
    isCollectiveActivity?: boolean;
    activityType?: string; // Educativa (01) | Grupo (02)...
    targetAudience?: string[];
    participantsCount?: number;
    activityTopics?: string[]; // Temas para reunião
    healthThemes?: string[]; // Temas em saúde
    healthPractices?: string[]; // Práticas em saúde
    // Vaccination Data
    vaccinationData?: {
        imunobiologico: string;
        estrategia: string;
        dose: string;
        lote: string;
        fabricante: string;
        viaAdministracao?: string;
        localAplicacao?: string;
        especialidadeProfissionalPrescritor?: string;
        motivoIndicacao?: string;
    };
}

// Helper to remove undefined values recursively
const deepRemoveUndefined = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => deepRemoveUndefined(v)).filter(v => v !== undefined);
    }
    if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        Object.entries(obj).forEach(([key, val]) => {
            const cleanVal = deepRemoveUndefined(val);
            if (cleanVal !== undefined) {
                result[key] = cleanVal;
            }
        });
        return result;
    }
    return obj;
};

// HELPER: Safe Write (Optimistic)
const safeWrite = async (promise: Promise<any>, label: string) => {
    if (!navigator.onLine) {
        console.log(`[Offline Protection] ${label} - Assuming write queued locally.`);
        return;
    }
    const timeout = new Promise((resolve) => setTimeout(() => {
        console.warn(`[Offline Protection] ${label} write timed out. Assuming queued.`);
        resolve("timeout");
    }, 2500));
    try {
        await Promise.race([promise, timeout]);
    } catch (err) {
        console.error(`[Offline Protection] ${label} write error:`, err);
        if ((err as any).code === 'permission-denied') throw err;
    }
};

// HELPER: Safe Query
const safeGetDocs = async (queryRef: any, label: string) => {
    if (!navigator.onLine) {
        console.log(`[Offline Protection] Skipping ${label} query due to offline status.`);
        return { empty: true, docs: [] };
    }
    // Race against timeout
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Query Timeout")), 1500));
    try {
        // Explicit cast to avoid lint errors about unknown type
        const result = await Promise.race([getDocs(queryRef), timeout]);
        return result as any;
    } catch (err) {
        console.warn(`[Offline Protection] Query ${label} failed or timed out:`, err);
        return { empty: true, docs: [] };
    }
};

export const saveMultipleBpaRecords = async (
    dataBase: BpaSharedData,
    procedures: ProcedureFormItem[]
) => {
    try {
        const comp = dataBase.competenceMonth;  // ex: "2025-11"
        const [yyyy, mm, dd] = dataBase.attendanceDate.split("-");
        const dayKey = `${dd}-${mm}-${yyyy}`;

        // 1. Root (Legacy Path)
        const rootRef = doc(db, "bpa_records", "BPA-I");
        const compRef = doc(collection(rootRef, "competencias"), comp);
        const dayRef = doc(collection(compRef, "registros"), dayKey);
        const patientRef = doc(collection(dayRef, "pacientes"), dataBase.patientId);
        const proceduresCol = collection(patientRef, "procedures");

        // 2. Fetch Entity Type
        let entityType = dataBase.entityType || "PUBLIC";
        if (dataBase.entityId && !dataBase.entityType) {
            if (navigator.onLine) {
                try {
                    const entDocPromise = getDoc(doc(db, "entities", dataBase.entityId));
                    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Entity Fetch Timeout")), 2000));
                    const entDoc = await Promise.race([entDocPromise, timeout]) as any;
                    if (entDoc.exists()) {
                        const entData = entDoc.data();
                        if (entData.type === "Privada" || entData.type === "PRIVATE") entityType = "PRIVATE";
                    }
                } catch (err) {
                    console.warn("Could not fetch entity type (timeout/error), assuming PUBLIC.", err);
                }
            } else {
                console.log("[Offline] Skipping entity type fetch, defaulting to PUBLIC.");
            }
        }

        // New Path
        const newPathRef = collection(
            db,
            "municipalities", entityType, dataBase.entityId, dataBase.municipalityId,
            "bpai_records", dataBase.unitId,
            "professionals", dataBase.professionalId,
            "competencias", comp,
            "dates", dayKey,
            "pacientes", dataBase.patientId!,
            "procedures"
        );

        const ids: string[] = [];
        const batch = writeBatch(db);

        for (const proc of procedures) {
            const newDoc = doc(proceduresCol);
            const duplicateDoc = doc(newPathRef, newDoc.id);

            const sanitizedBase = deepRemoveUndefined(dataBase);
            const sanitizedProc = deepRemoveUndefined(proc);

            let createdAtTimestamp;
            const todayStr = new Date().toISOString().split('T')[0];
            if (dataBase.attendanceDate < todayStr) {
                const [year, month, day] = dataBase.attendanceDate.split('-').map(Number);
                createdAtTimestamp = new Date(year, month - 1, day, 12, 0, 0);
            } else {
                createdAtTimestamp = serverTimestamp();
            }

            const recordData = {
                ...sanitizedBase,
                ...sanitizedProc,
                id: newDoc.id,
                createdAt: createdAtTimestamp,
                status: "pending",
                source: "producao_panel",
                ...(dataBase.careContext?.system === 'LEDI' ? {
                    integration: { status: 'PENDENTE_ENVIO', attempts: 0 }
                } : {})
            };

            batch.set(newDoc, recordData);
            batch.set(duplicateDoc, recordData);
            ids.push(newDoc.id);
        }

        await safeWrite(batch.commit(), "Batch Commit");
        return ids;

    } catch (error) {
        console.error("Erro ao salvar múltiplos registros BPA:", error);
        throw error;
    }
};

export const saveBpaRecord = async (
    data: BpaRecordInput,
    tipo: 'BPA-I' | 'BPA-C' = 'BPA-I'
) => {
    try {
        const parent = doc(db, 'bpa_records', tipo);
        const competenciaRef = doc(collection(parent, 'competencias'), data.competenceMonth);
        const registrosRef = collection(competenciaRef, 'registros');
        const newDocRef = doc(registrosRef);

        const sanitizedData = deepRemoveUndefined(data);
        let createdAtTimestamp;
        const todayStr = new Date().toISOString().split('T')[0];

        if (data.attendanceDate < todayStr) {
            const [year, month, day] = data.attendanceDate.split('-').map(Number);
            createdAtTimestamp = new Date(year, month - 1, day, 12, 0, 0);
        } else {
            createdAtTimestamp = serverTimestamp();
        }

        await safeWrite(setDoc(newDocRef, {
            ...sanitizedData,
            id: newDocRef.id,
            createdAt: createdAtTimestamp,
            status: 'pending',
            source: 'producao_panel'
        }), "Save BPA Record");

        return newDocRef.id;
    } catch (error) {
        console.error("Erro ao salvar registro BPA:", error);
        throw error;
    }
};

// NEW: Updated signature to support offline-friendly scoped paths
export const saveOrUpdatePatient = async (
    patientData: any,
    // Context Parameters (Optional for backward compatibility but required for new offline flow)
    municipalityId?: string,
    entityId?: string,
    entityType?: string,
    unitId?: string
): Promise<string> => {
    try {
        // Determine Collection Path
        // Determine Collection Path
        let patientsRef;
        if (municipalityId && entityId) {
            // New Scoped Path: municipalities/{type}/{entId}/{munId}/patients
            const type = (entityType === 'Privada' || entityType === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';
            patientsRef = collection(db, `municipalities/${type}/${entityId}/${municipalityId}/patients`);
        } else {
            // Fallback to root (Legacy/Online-only fallback)
            // console.warn("Using Root Patients Collection (Legacy Path)");
            patientsRef = collection(db, 'patients');
        }

        let existingDocId = patientData.id || null;

        // Check for duplicates (CNS)
        if (!existingDocId && patientData.cns && patientData.cns.length > 5) {
            const qCns = query(patientsRef, where('cns', '==', patientData.cns), limit(1));
            const snapCns = await safeGetDocs(qCns, 'Patient CNS');
            if (!snapCns.empty) {
                existingDocId = snapCns.docs[0].id;
            }
        }

        // Check for duplicates (CPF)
        if (!existingDocId && patientData.cpf && patientData.cpf.length > 5) {
            const qCpf = query(patientsRef, where('cpf', '==', patientData.cpf), limit(1));
            const snapCpf = await safeGetDocs(qCpf, 'Patient CPF');
            if (!snapCpf.empty) {
                existingDocId = snapCpf.docs[0].id;
            }
        }

        const sanitizedData = Object.entries(patientData).reduce((acc, [key, value]) => {
            if (value !== undefined) acc[key] = value;
            return acc;
        }, {} as any);

        sanitizedData.updatedAt = serverTimestamp();

        // Ensure we save the context in the doc too, helpful for indexing
        if (municipalityId) sanitizedData.municipalityId = municipalityId;
        if (unitId) sanitizedData.unitId = unitId;

        if (existingDocId) {
            // For scoped updates, we need the docRef from the correct collection
            let docRef;
            if (municipalityId && entityId && entityType) {
                const type = (entityType === 'Privada' || entityType === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';
                docRef = doc(db, `municipalities/${type}/${entityId}/${municipalityId}/patients`, existingDocId);
            } else {
                docRef = doc(db, 'patients', existingDocId);
            }

            await safeWrite(updateDoc(docRef, sanitizedData), "Update Patient");
            return existingDocId;
        } else {
            sanitizedData.createdAt = serverTimestamp();
            const newRef = doc(patientsRef);
            await safeWrite(setDoc(newRef, sanitizedData), "Create Patient");
            return newRef.id;
        }

    } catch (error) {
        console.error("Erro ao salvar/atualizar paciente:", error);
        throw error;
    }
};

// NEW: Prefetch Patients for Offline Cache
export const prefetchPatientsData = async (
    municipalityId: string,
    entityId: string,
    entityType: string,
    onProgress?: (msg: string, progress: number) => void
): Promise<void> => {
    try {
        if (!municipalityId || !entityId) throw new Error("Missing Context for Patient Sync");

        const type = (entityType === 'Privada' || entityType === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';
        const patientsRef = collection(db, `municipalities/${type}/${entityId}/${municipalityId}/patients`);

        // Fetch all patients (limit if necessary for safety, e.g., 5000)
        // Note: Firestore Offline Persistence automatically caches documents read.
        // We just need to read them.
        onProgress?.("Conectando à base de pacientes...", 10);

        const q = query(patientsRef, limit(5000)); // Safety cap
        const snapshot = await getDocs(q);

        onProgress?.(`Baixando ${snapshot.size} registros...`, 50);

        // Access data to ensure full object is cached
        let count = 0;
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Minimal processing just to touch the data
            count++;
        });

        localStorage.setItem(`probpa_patient_count_${municipalityId}`, count.toString());

        onProgress?.("Finalizando cache...", 100);
        console.log(`[Offline Cache] ${count} patients cached locally.`);

    } catch (error) {
        console.error("Error prefetching patients:", error);
        throw error;
    }
};

// NEW: Search Patients (Scoped)
export const searchPatients = async (
    queryText: string,
    municipalityId: string,
    entityId: string,
    entityType: string,
    unitId?: string // Optional filter
): Promise<any[]> => {
    try {
        if (!municipalityId || !entityId) return [];

        const type = (entityType === 'Privada' || entityType === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';
        const patientsRef = collection(db, `municipalities/${type}/${entityId}/${municipalityId}/patients`);

        // Basic Search Strategy (Client-side filtering for offline cache effectiveness)
        // Ideally, we search by indexed fields if online, but for offline resilience + "keywords" approach:

        let q = query(patientsRef, orderBy('updatedAt', 'desc'), limit(50));

        // If searching specific term (CNS/CPF/Name)
        // complex queries might require indexes. 
        // For simplicity and offline support, we'll fetch recent/all (up to limit) and filter in memory if needed
        // OR rely on keywords if implemented.

        // Let's implement a 'smart' query
        if (queryText.length > 0) {
            // Try specific fields first
            if (/^\d+$/.test(queryText)) {
                // Numeric -> CNS or CPF
                q = query(patientsRef, where('cns', '==', queryText));
                const snap = await getDocs(q);
                if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));

                // If not CNS, try CPF
                q = query(patientsRef, where('cpf', '==', queryText));
                const snap2 = await getDocs(q);
                if (!snap2.empty) return snap2.docs.map(d => ({ id: d.id, ...d.data() }));
            } else {
                // Name search (using array-contains 'searchKeywords' if we had it, or just client side filter)
                // Firestore doesn't do substring search natively. 
                // Assuming we have 'searchKeywords' added during save, lets try that
                // BUT fallback to client side for better offline experience on small datasets
                q = query(patientsRef, orderBy('name'), startAt(queryText), endAt(queryText + '\uf8ff'), limit(20));
            }
        } else {
            // No query, just list recent
            q = query(patientsRef, orderBy('updatedAt', 'desc'), limit(50));
        }

        if (unitId) {
            // We can't easily compound queries without indexes. Filter in client.
            // But if we want *only* my unit, we might want a where clause
            // However, "updatedAt" sorting conflicts with "unitId" filtering without index.
            // We will filter in client for now.
            // q = query(q, where('unitId', '==', unitId)); 
        }

        const snapshot = await safeGetDocs(q, 'Search Patients');
        let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client Side Filtering
        if (unitId) {
            results = results.filter(p => p.unitId === unitId);
        }

        return results;

    } catch (error) {
        console.error("Error searching patients:", error);
        return [];
    }
};

export const getProfessionalHistory = async (professionalId: string, entityId?: string): Promise<any[]> => {
    try {
        // Collection Group Query: searches all 'procedures' collections regardless of parent
        // We now allow filtering by the new route 'municipalities/...'
        const registrosQuery = query(
            collectionGroup(db, 'procedures'),
            where('professionalId', '==', professionalId),
            orderBy('attendanceDate', 'desc')
        );

        const snapshot = await getDocs(registrosQuery);

        return snapshot.docs
            .filter(doc => {
                const path = doc.ref.path;
                // Filter 1: Must be from the new route
                if (!path.startsWith("municipalities")) return false;

                // Filter 2: If entityId is provided, safeguard against cross-entity data 
                // (though rules prevents it, this is extra client-side check)
                // Path: municipalities/{type}/{entityId}/...
                if (entityId) {
                    const parts = path.split("/");
                    // municipalities is [0], type is [1], entityId is [2]
                    if (parts[2] !== entityId) return false;
                }
                return true;
            })
            .map(doc => {
                const data = doc.data() as BpaRecordInput & { status: string, id: string };
                return {
                    id: doc.id,
                    date: data.attendanceDate, // ISO string YYYY-MM-DD
                    procedure: {
                        code: data.procedureCode,
                        name: data.procedureName,
                        type: 'BPA-I' // Assuming BPA-I for now, or derive from path if needed
                    },
                    cidCodes: data.cidCodes || [],
                    quantity: data.quantity,
                    unitId: data.unitId,
                    patientCns: data.patientCns,
                    status: data.status || 'pending',
                    observations: data.obs
                };
            });
    } catch (error) {
        console.error("Erro ao buscar histórico:", error);
        return [];
    }
};

export const getProductionStats = async (professionalId: string | string[], entityId?: string): Promise<{ procedureCode: string, quantity: number, competenceMonth: string, unitId: string, professionalId: string, professionalName: string }[]> => {
    try {
        const ids = Array.isArray(professionalId) ? professionalId : [professionalId];
        // Simple query to get all production for the professional
        // We don't order by date to avoid needing a composite index for this specific aggregation if possible,
        // though 'professionalId' index is required.

        // If multiple IDs, use 'in' operator (max 10)
        const constraints = [
            where('professionalId', 'in', ids)
        ];

        if (entityId) {
            constraints.push(where('entityId', '==', entityId));
        }

        const q = query(
            collectionGroup(db, 'procedures'),
            ...constraints
        );

        const snapshot = await getDocs(q);
        console.log(`[getProductionStats] Found ${snapshot.size} records for professional(s) ${ids.join(', ')}`);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            // console.log('[getProductionStats] Record:', data);
            return {
                procedureCode: data.procedureCode,
                quantity: Number(data.quantity) || 0,
                competenceMonth: data.competenceMonth,
                unitId: data.unitId,
                professionalId: data.professionalId,
                professionalName: data.professionalName
            };
        });
    } catch (error) {
        console.error("Error fetching production stats:", error);
        return [];
    }
};

export const getPatientHistory = async (patientCns: string, entityId: string, limitCount = 50) => {
    try {
        const historyRef = collectionGroup(db, 'procedures');
        const q = query(
            historyRef,
            where('entityId', '==', entityId),
            where('patientCns', '==', patientCns),
            orderBy('attendanceDate', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        const rawDocs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

        // Deduplicate by ID (Handle dual-write legacy + new path returning same ID)
        const seen = new Set();
        const history: any[] = [];
        for (const doc of rawDocs) {
            if (!seen.has(doc.id)) {
                seen.add(doc.id);
                history.push(doc);
            }
        }

        return history;
    } catch (error) {
        console.error("Erro ao buscar histórico do paciente:", error);
        return [];
    }
};

export const getLastClinicalData = async (patientCns: string, entityId: string): Promise<Partial<BpaSharedData> | null> => {
    try {
        // Fetch most recent 5 to find one with actual clinical data
        const history = await getPatientHistory(patientCns, entityId, 5);

        // Find first record with Weight/Pressure/Conditions
        const clinicalRecord = history.find(rec =>
            rec.weight || rec.pressaoArterialSistolica || (rec.soaps?.evaluation?.problemConditions?.length || 0) > 0
        );

        if (!clinicalRecord) return null;

        // Extract relevant fields
        // Check for hypertension/diabetes in problemConditions
        const problems = clinicalRecord.soaps?.evaluation?.problemConditions || [];

        return {
            weight: clinicalRecord.weight,
            height: clinicalRecord.height,
            pressaoArterialSistolica: clinicalRecord.pressaoArterialSistolica,
            pressaoArterialDiastolica: clinicalRecord.pressaoArterialDiastolica,
            frequenciaCardiaca: clinicalRecord.frequenciaCardiaca,
            frequenciaRespiratoria: clinicalRecord.frequenciaRespiratoria,
            temperatura: clinicalRecord.temperatura,
            saturacaoO2: clinicalRecord.saturacaoO2,
            vacinaEmDia: clinicalRecord.vacinaEmDia,
            ficouEmObservacao: clinicalRecord.ficouEmObservacao,
            // Return flags for logic
            soaps: {
                evaluation: {
                    problemConditions: problems // identifying chronic conditions
                }
            }
        };
    } catch (error) {
        console.error("Erro ao buscar últimos dados clínicos:", error);
        return null;
    }
};

export const getPendingExams = async (patientCns: string, entityId: string): Promise<{ code: string, name: string, date: string }[]> => {
    try {
        const history = await getPatientHistory(patientCns, entityId, 50); // Look back 50 records

        const evaluatedMap = new Set<string>();
        const pendingMap = new Map<string, { code: string, name: string, date: string }>();

        // Iterate from NEWEST to OLDEST
        for (const record of history) {
            // Check for evaluated exams in this record
            const exames = record.soaps?.plan?.exames || [];

            // In NEWER records, if we see 'A' (Avaliado), mark as solved.
            // If we see 'S' (Solicitado), check if already solved. If not, it's pending.

            // Iterate Newest -> Oldest
            // If Avaliado -> Add to 'DoneSet'
            // If Solicitado -> If NOT in 'DoneSet', add to 'PendingList' (and don't add duplicate pending)

            for (const exam of exames) {
                if (exam.solicitadoAvaliado?.includes('A')) {
                    evaluatedMap.add(exam.codigoExame);
                }
            }
            for (const exam of exames) {
                if (exam.solicitadoAvaliado?.includes('S')) {
                    if (!evaluatedMap.has(exam.codigoExame)) {
                        // Found a solicitation that hasn't been evaluated in a LATER (or same) record
                        if (!pendingMap.has(exam.codigoExame)) {
                            pendingMap.set(exam.codigoExame, {
                                code: exam.codigoExame,
                                name: exam.nomeExame || 'Exame',
                                date: record.attendanceDate
                            });
                        }
                    }
                }
            }
        }

        return Array.from(pendingMap.values());

    } catch (error) {
        console.error("Erro ao buscar exames pendentes:", error);
        return [];
    }
};
