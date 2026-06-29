import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Button, Input, Select } from '../../../producao/components/ui/BaseComponents';
import { Badge } from '../../components/ui/Components';
import { LISTA_SEXO, LISTA_RACA_COR, LISTA_CARATER_ATENDIMENTO } from '../../../producao/constants';
import { UserCheck, FileText, Calendar, Plus, Save, AlertCircle, Trash2, MapPin, Search, CheckCircle, Unlock, Info, ShieldAlert, Activity, Layout, User, Stethoscope, Hammer, ClipboardList, Syringe, X, Edit2, ArrowLeft, Loader2, LayoutTemplate } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { validateCNS, validatePatientName, validateVaccinationData } from '../../../producao/utils/lediValidation';

import { useAuth } from '../../context/AuthContext';
import { fetchUnitsByEntity } from '../../services/unitsService';
import { fetchProfessionalsByEntity } from '../../services/professionalsService';
import { Unit, Professional } from '../../types';
import { db } from '../../firebase';

import {
    searchProcedures,
    getCompatibleCids,
    getAttendanceCharacterForProcedure,
    getServicesForProcedure,
    getCurrentCompetence,
    getAvailableCompetences,
    SigtapProcedureRow,
    SigtapCidRow
} from '../../../producao/services/sigtapLookupService';
import {
    saveOrUpdatePatient,
    ProcedureFormItem,
    getLastClinicalData,
    getPendingExams,
    BpaSharedData,
    softDeleteBpaRecord
} from '../../../producao/services/bpaService';
import { PatientTimeline } from '../../../producao/components/PatientTimeline';
import { SigtapTreeSelector } from '../../../producao/components/SigtapTreeSelector';
import { sigtapService } from '../../../producao/services/sigtapService';
import { collection, query, where, getDocs, limit, serverTimestamp, writeBatch, doc, getDoc, deleteDoc, orderBy, collectionGroup, addDoc } from 'firebase/firestore';
import { ProcedureCard } from '../../../producao/components/ProcedureCard';
import { CdsIndividualForm } from '../../../producao/components/forms/CdsIndividualForm';
import { CdsOdontoForm } from '../../../producao/components/forms/CdsOdontoForm';
import { CdsVaccinationForm } from '../../../producao/components/forms/CdsVaccinationForm';
import { CdsDomiciliarForm } from '../../../producao/components/forms/CdsDomiciliarForm';
import { ProcedureSection } from '../../../producao/components/forms/ProcedureSection';
import { EditAttendanceModal } from '../../../producao/components/EditAttendanceModal';

// Helper to clean objects
const deepRemoveUndefined = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(v => deepRemoveUndefined(v)).filter(v => v !== undefined);
    if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        Object.entries(obj).forEach(([key, val]) => {
            const cleanVal = deepRemoveUndefined(val);
            if (cleanVal !== undefined) result[key] = cleanVal;
        });
        return result;
    }
    return obj;
};
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

// Helper: Safe Write (Optimistic)
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

const saveSubsedeProduction = async (dataBase: any, procedures: any[]) => {
    try {
        const comp = dataBase.competenceMonth;  // ex: "2025-11"
        const [yyyy, mm, dd] = dataBase.attendanceDate.split("-");
        const dayKey = `${dd}-${mm}-${yyyy}`;

        // In the Subsede environment (which is part of the Private Entity panel), the entityType is ALWAYS Private.
        // We ensure `dataBase.entityType` is passed, or default to PRIVATE.
        let rawEntityType = dataBase.entityType || "PRIVATE";
        let entityType = rawEntityType === 'Privada' || rawEntityType === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';

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
            // Edit Logic: Use existing ID if provided, otherwise auto-gen
            const procDocRef = doc(newPathRef);
            const newDoc = proc.id ? doc(newPathRef, proc.id) : procDocRef;

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
                source: "subsede_panel",
                ...(dataBase.careContext?.system === 'LEDI' ? {
                    integration: { status: 'PENDENTE_ENVIO', attempts: 0 }
                } : {})
            };

            batch.set(newDoc, recordData);
            ids.push(newDoc.id);
        }

        await safeWrite(batch.commit(), "Batch Commit Subsede");
        return ids;
    } catch (error) {
        console.error("Erro ao salvar múltiplos registros Subsede:", error);
        throw error;
    }
};

interface ProcedureItem extends ProcedureFormItem {
    isExpanded: boolean;
}

// Helper Component for Toolbar (Hoisted)
interface FichaButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    color: 'blue' | 'teal' | 'gray' | 'purple' | 'amber' | 'indigo';
}

const FichaButton: React.FC<FichaButtonProps> = ({ active, onClick, icon, title, subtitle, color }) => {
    const colorClasses = {
        blue: "text-blue-600 bg-blue-50 border-blue-200",
        teal: "text-teal-600 bg-teal-50 border-teal-200",
        gray: "text-gray-600 bg-gray-50 border-gray-200",
        purple: "text-purple-600 bg-purple-50 border-purple-200",
        amber: "text-amber-600 bg-amber-50 border-amber-200",
        indigo: "text-indigo-600 bg-indigo-50 border-indigo-200",
    };

    const activeClass = active
        ? `${colorClasses[color]} ring-2 ring-offset-1 ring-${color}-400 shadow-sm`
        : "text-gray-400 hover:bg-gray-50 hover:text-gray-600 border-transparent opacity-60 hover:opacity-100";

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl border transition-all min-w-[100px] flex-1",
                activeClass
            )}
        >
            <div className={`mb-1 ${active ? "" : "grayscale"}`}>{icon}</div>
            <span className="text-xs font-bold leading-tight">{title}</span>
            <span className="text-[10px] opacity-80">{subtitle}</span>
        </button>
    );
};

const SubsedeRegisterProduction: React.FC = () => {
    const navigate = useNavigate();
    const { claims } = useAuth();

    // Custom Searchable Select State for History Professional Filter
    const [isProfSearchOpen, setIsProfSearchOpen] = useState(false);
    const [profSearchTerm, setProfSearchTerm] = useState('');
    const profSearchRef = useRef<HTMLDivElement>(null);

    // Custom Searchable Select State for Form Unit
    const [isFormUnitSearchOpen, setIsFormUnitSearchOpen] = useState(false);
    const [formUnitSearchTerm, setFormUnitSearchTerm] = useState('');
    const formUnitSearchRef = useRef<HTMLDivElement>(null);

    // Custom Searchable Select State for Form Professional
    const [isFormProfSearchOpen, setIsFormProfSearchOpen] = useState(false);
    const [formProfSearchTerm, setFormProfSearchTerm] = useState('');
    const formProfSearchRef = useRef<HTMLDivElement>(null);
    
    // Auto-close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profSearchRef.current && !profSearchRef.current.contains(event.target as Node)) {
                setIsProfSearchOpen(false);
            }
            if (formUnitSearchRef.current && !formUnitSearchRef.current.contains(event.target as Node)) {
                setIsFormUnitSearchOpen(false);
            }
            if (formProfSearchRef.current && !formProfSearchRef.current.contains(event.target as Node)) {
                setIsFormProfSearchOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Manual Selection States for Subsede
    const [units, setUnits] = useState<Unit[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [selectedUnitId, setSelectedUnitId] = useState<string>('');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
    const [loadingSetup, setLoadingSetup] = useState(true);

    const currentUnit = useMemo(() => units.find(u => u.id === selectedUnitId) || null, [units, selectedUnitId]);
    const user = useMemo(() => {
        const [pId] = selectedProfessionalId.split('|');
        return professionals.find(p => p.id === pId) || null;
    }, [professionals, selectedProfessionalId]);

    // Fast Patient Edit State
    const [editPatientModalOpen, setEditPatientModalOpen] = useState(false);
    const [patientToEdit, setPatientToEdit] = useState<any>(null);
    const [isSavingPatient, setIsSavingPatient] = useState(false);

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    
    const toggleGroupExpand = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const handleOpenEditPatient = async (record: any) => {
        // Pre-fetch real patient data to ensure we have the 'cadastrado' documents, 
        // even if the history record snapshot is missing them.
        try {
            let rawEntityType = claims?.entityType || user?.entityType || "PRIVATE";
            let entityType = rawEntityType === 'Privada' || rawEntityType === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
            
            const resolvedMunicipalityId = currentUnit?.municipalityId || claims?.municipalityId || '';
            const resolvedEntityId = claims?.entityId || user?.entityId || '';
            
            const patientRef = doc(db, 'municipalities', entityType, resolvedEntityId, resolvedMunicipalityId, 'patients', record.patientId);
            const patientSnap = await getDoc(patientRef);
            
            let pData = patientSnap.exists() ? patientSnap.data() : null;

            setPatientToEdit({
                id: record.patientId,
                name: pData?.name || pData?.patientName || record.patientName,
                cns: pData?.cns || record.patientCns || '',
                cpf: pData?.cpf || record.patientCpf || '',
                dob: pData?.dob || pData?.patientDob || record.patientDob || '',
                sex: pData?.sex || pData?.patientSex || record.patientSex || '',
                phone: pData?.phone || pData?.patientPhone || record.patientPhone || '',
                municipalityId: resolvedMunicipalityId,
                entityId: resolvedEntityId
            });
            setEditPatientModalOpen(true);
        } catch (error) {
            console.error("Error pre-fetching patient data", error);
            // Fallback to record data
            setPatientToEdit({
                id: record.patientId,
                name: record.patientName,
                cns: record.patientCns || '',
                cpf: record.patientCpf || '',
                dob: record.patientDob || '',
                sex: record.patientSex || '',
                phone: record.patientPhone || '',
                municipalityId: currentUnit?.municipalityId || claims?.municipalityId || '',
                entityId: claims?.entityId || user?.entityId || ''
            });
            setEditPatientModalOpen(true);
        }
    };

    const handleSavePatientEdit = async () => {
        if (!patientToEdit || !patientToEdit.id) return;
        setIsSavingPatient(true);
        try {
            let rawEntityType = claims?.entityType || user?.entityType || "PRIVATE";
            let entityType = rawEntityType === 'Privada' || rawEntityType === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
            
            const patientRef = doc(db, 'municipalities', entityType, patientToEdit.entityId, patientToEdit.municipalityId, 'patients', patientToEdit.id);
            
            // Clean before sending to Firestore
            const cleanData = Object.fromEntries(
                Object.entries({
                    name: patientToEdit.name,
                    cns: patientToEdit.cns,
                    cpf: patientToEdit.cpf,
                    dob: patientToEdit.dob,
                    sex: patientToEdit.sex,
                    phone: patientToEdit.phone
                }).filter(([_, v]) => v !== undefined && v !== '')
            );

            const batch = writeBatch(db);
            batch.update(patientRef, cleanData);

            // Fetch and update all old production records for this patient in this entity
            try {
                const prodRef = collection(db, 'municipalities', entityType, patientToEdit.entityId, patientToEdit.municipalityId, 'productions');
                const q = query(prodRef, where('patientId', '==', patientToEdit.id));
                const snap = await getDocs(q);
                
                snap.forEach(docSnap => {
                    batch.update(docSnap.ref, {
                        patientName: patientToEdit.name,
                        patientCns: patientToEdit.cns || docSnap.data().patientCns || '',
                        patientCpf: patientToEdit.cpf || docSnap.data().patientCpf || '',
                    });
                });
            } catch (err) {
                console.error("Failed to batch update old history records", err);
            }

            await safeWrite(batch.commit(), "Update Patient and History Subsede");
            
            // Live update the history table UI with the newly fetched/edited data
            setHistoryRecords(prev => prev.map(r => {
                if (r.patientId === patientToEdit.id) {
                    return {
                        ...r,
                        patientName: patientToEdit.name,
                        patientCns: patientToEdit.cns,
                        patientCpf: patientToEdit.cpf
                    };
                }
                return r;
            }));

            setEditPatientModalOpen(false);
            setPatientToEdit(null);
            alert("Cadastro de Paciente e seu respectivo histórico retroativo de produções foram atualizados com sucesso!");
        } catch (error) {
            console.error("Error updating patient from history", error);
            alert("Erro ao atualizar os dados do paciente.");
        } finally {
            setIsSavingPatient(false);
        }
    };

    const [step, setStep] = useState<'form' | 'success'>('form');

    useEffect(() => {
        async function loadSetupData() {
            if (!claims?.entityId) return;
            try {
                const [fetchedUnits, fetchedProfs] = await Promise.all([
                    fetchUnitsByEntity(claims.entityId),
                    fetchProfessionalsByEntity(claims.entityId)
                ]);

                // Filter by municipality
                const localUnits = fetchedUnits.filter(u => u.municipalityId === claims.municipalityId);
                const localProfs = fetchedProfs.filter(p => p.assignments?.some(a => a.municipalityId === claims.municipalityId));

                setUnits(localUnits);
                setProfessionals(localProfs);
            } catch (err) {
                console.error("Error loading units and professionals:", err);
            } finally {
                setLoadingSetup(false);
            }
        }
        loadSetupData();
    }, [claims?.entityId, claims?.municipalityId]);

    // MUNICIPALITY CONFIGURATION STATE - FORCED TO SIMPLIFIED FOR SUBSEDE
    const [interfaceType, setInterfaceType] = useState<'PEC' | 'SIMPLIFIED'>('SIMPLIFIED'); // Default to SIMPLIFIED
    const [isConfigLoaded, setIsConfigLoaded] = useState(true);
    const [productionToleranceDays, setProductionToleranceDays] = useState<number>(0);
    const [entityName, setEntityName] = useState<string>('Entidade');

    useEffect(() => {
        async function fetchMunConfig() {
            if (!claims?.entityId || !claims?.municipalityId) return;
            try {
                let entityType = claims.entityType === 'Privada' || claims.entityType === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
                const docRef = doc(db, 'municipalities', entityType, claims.entityId, claims.municipalityId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    setProductionToleranceDays(data.productionToleranceDays || 0);
                    setEntityName(data.linkedEntityName || 'Entidade');
                }
            } catch (err) {
                console.error("Error fetching mun config", err);
            }
        }
        fetchMunConfig();
    }, [claims]);

    // Force Ficha to PROCEDIMENTOS as required by SIMPLIFIED mode
    useEffect(() => {
        if (interfaceType === 'SIMPLIFIED') {
            setActiveFicha('PROCEDIMENTOS');
        }
    }, [interfaceType]);

    // Ficha Type State
    type FichaType = 'INDIVIDUAL' | 'ODONTO' | 'PROCEDIMENTOS' | 'VACINACAO' | 'DOMICILIAR' | 'COLETIVA';
    // Allowed Fichas based on CBO
    const allowedFichas = useMemo<FichaType[]>(() => {
        // SIMPLIFIED override
        if (interfaceType === 'SIMPLIFIED') {
            return ['PROCEDIMENTOS'];
        }

        const cbo = user?.cbo || '';
        if (!cbo) return ['PROCEDIMENTOS'];

        // 1. Médicos (225) & Enfermeiros (2235)
        if (cbo.startsWith('225') || cbo.startsWith('2235')) {
            return ['INDIVIDUAL', 'VACINACAO'];
        }

        // 2. Dentistas (2232) & TSB (3224)
        if (cbo.startsWith('2232') || cbo.startsWith('3224')) {
            return ['ODONTO'];
        }

        // 3. Técnicos de Enfermagem (3222)
        if (cbo.startsWith('3222')) {
            return ['PROCEDIMENTOS', 'VACINACAO'];
        }

        // 4. ACS (5151) & ACE (5153)
        if (cbo.startsWith('5151') || cbo.startsWith('5153')) {
            return ['DOMICILIAR'];
        }

        // Default
        return ['PROCEDIMENTOS'];


    }, [user?.cbo, interfaceType]);

    // Initial Ficha Logic: Always select the first allowed ficha default
    const [activeFicha, setActiveFicha] = useState<FichaType>('PROCEDIMENTOS');

    // Effect to enforce valid allowed ficha on mount/change
    // Effect to enforce valid allowed ficha on mount/change
    useEffect(() => {
        // SIMPLIFIED INTERFACE LOCK
        if (interfaceType === 'SIMPLIFIED') {
            setActiveFicha('PROCEDIMENTOS');
            return;
        }

        if (allowedFichas.length > 0) {
            // If current active is not allowed, switch to first allowed
            if (!allowedFichas.includes(activeFicha)) {
                setActiveFicha(allowedFichas[0]);
            }
        }
    }, [allowedFichas, activeFicha, interfaceType]);

    // Handle Ficha Change with Strict Validation
    const handleFichaChange = (ficha: FichaType) => {
        if (allowedFichas.includes(ficha)) {
            setActiveFicha(ficha);
        } else {
            // Should not happen if UI is correct, but safe guard
            alert('Acesso negado para o seu perfil (CBO).');
        }
    };


    // Permission Check (Legacy/Backup)
    const isVaccinationAllowed = useMemo(() => {
        if (!user?.cbo) return false;
        // 2235 (Enfermeiro), 3222 (Técnico), 225 (Médico)
        return ['2235', '3222', '225'].some(prefix => user.cbo!.startsWith(prefix));
    }, [user]);

    // Sigtap Modal State
    const [isSigtapModalOpen, setIsSigtapModalOpen] = useState(false);
    const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);

    // Selection State (Global or per procedure? Competence is global)
    const [availableCompetences, setAvailableCompetences] = useState<{ competence: string; label: string }[]>([]);

    // Default to empty, will be set on load
    const [currentCompetence, setCurrentCompetence] = useState<string>('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAddress, setShowAddress] = useState(false);

    const [procedures, setProcedures] = useState<ProcedureItem[]>([]);

    // Form State matching BPA-I structure (Base Fields)
    const [formData, setFormData] = useState({
        // Cabeçalho / Operacional
        unit: currentUnit?.id || '',
        cbo: currentUnit?.occupation || '',

        // Identificação do Paciente
        patientId: '', // Internal ID
        patientCns: '',
        patientCpf: '',
        patientName: '',
        patientDob: '',
        patientAge: '', // Added
        patientSex: '',
        patientRace: '',
        patientNationality: '010',
        patientPhone: '',
        patientEmail: '',
        isHomeless: false, // Situação de Rua

        // Endereço Paciente
        cep: '',
        municipalityCode: '', // Cod IBGE
        street: '',
        number: '',
        complement: '',
        district: '', // Bairro

        // Procedimento Realizado (Base)
        competence: '', // YYYYMM
        attendanceDate: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0],

        // LEDI Specifics
        shift: 'M',
        attendanceType: '01',
        localAtendimento: '1', // Default: UBS
        weight: '',
        height: '',
        // Domiciliar Defaults (Legacy/ACS)
        desfechoVisita: '1', // Realizada
        motivosVisita: [] as string[],

        // FAD Specifics (Medical/Nurse Home Care - CDS 08)
        fadData: {
            condicoesAvaliadas: [],
            tipoAtendimento: undefined, // No default
            atencaoDomiciliarModalidade: undefined, // No default
            condutaDesfecho: undefined, // No default
            procedimentos: []
        },

        // Prenatal
        isPregnant: false,
        dumDaGestante: '',
        idadeGestacional: '',
        stGravidezPlanejada: false,
        nuPartos: '0',

        // Vaccination Helper (Current Procedure being edited)
        vaccinationData: {
            imunobiologico: '',
            estrategia: '1', // Rotina
            dose: '1',
            lote: '',
            fabricante: ''
        },

        // New CDS Fields
        soaps: {
            subjective: '',
            objective: '',
            evaluation: {
                problemConditions: [] as any[],
                vaccinationUpToDate: false
            },
            plan: {
                conduct: [] as string[]
            }
        },
        consultationType: '',
        oralHealthVigilance: [] as string[],
        odontoConduct: [] as string[],
        breastfeedingType: ''
    });

    const formDataRef = useRef(formData);
    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    // History & Editing State
    const [showHistory, setShowHistory] = useState(false);
    const [historyActiveTab, setHistoryActiveTab] = useState<'meus' | 'equipe'>('meus');
    const [historyFilterUnitId, setHistoryFilterUnitId] = useState<string>('');
    const [historyFilterProfessionalId, setHistoryFilterProfessionalId] = useState<string>('');
    const [historyFilterCompetence, setHistoryFilterCompetence] = useState<string>('');
    const [historyFilterDate, setHistoryFilterDate] = useState<string>('');
    const [historyFilterPatientTerm, setHistoryFilterPatientTerm] = useState<string>('');
    const [historyRecords, setHistoryRecords] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [editingAttendanceGroup, setEditingAttendanceGroup] = useState<any[] | null>(null);
    const [refreshHistoryTick, setRefreshHistoryTick] = useState(0);

    // Fetch History when context changes
    useEffect(() => {
        const fetchHistory = async () => {
            const compToUse = historyFilterCompetence || formData.competence;
            
            // Only fetch if history is open, avoiding unnecessary background queries
            if (!showHistory) return;
            
            if (!claims?.entityId || !claims?.municipalityId || !compToUse) {
                setHistoryRecords([]);
                return;
            }
            try {
                setLoadingHistory(true);

                // Format YYYYMM to YYYY-MM to match the stored competenceMonth field
                const formattedCompetenceMonth = `${compToUse.slice(0, 4)}-${compToUse.slice(4, 6)}`;

                // To satisfy Firestore Security rules for Subsede AND avoid Missing Index errors,
                // we MUST explicitly filter by entityId, municipalityId, and competenceMonth.
                const q = query(
                    collectionGroup(db, 'procedures'),
                    where('entityId', '==', claims.entityId),
                    where('municipalityId', '==', claims.municipalityId),
                    where('competenceMonth', '==', formattedCompetenceMonth)
                );

                const snapshot = await getDocs(q);

                // Filter client-side
                const records = snapshot.docs
                    .filter(doc => {
                        const data = doc.data();
                        const path = doc.ref.path;

                        // Enforce scoping to the current SUBSEDE context
                        if (!path.startsWith("municipalities")) return false;

                        // Filters
                        if (historyFilterUnitId && data.unitId !== historyFilterUnitId) return false;
                        if (historyFilterProfessionalId && data.professionalId !== historyFilterProfessionalId) return false;

                        // Tab distinction
                        if (historyActiveTab === 'meus') {
                            if (data.source !== 'subsede_panel') return false;
                        }

                        // "equipe" shows everything (including what subsede did), or we can exclude subsede if wanted.
                        // Based on user: "Procedimentos da Equipe - Terá permissão para ver tudo o que os profissionais do município da SUBSEDE logada registraram" (implies ALL).
                        return true;
                    })
                    .map(doc => ({ docId: doc.id, firestorePath: doc.ref.path, ...(doc.data() as any) }))
                    .sort((a: any, b: any) => {
                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.attendanceDate || 0).getTime();
                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.attendanceDate || 0).getTime();
                        return dateB - dateA; // Descending
                    });

                // --- PATCH MISSING DOCUMENTS (CPF/CNS) ---
                // Identify records lacking documents to prevent them from showing as "Documento pendente" if the user added the CPF later.
                const recordsNeedingDoc = records.filter((r: any) => (!r.patientCns || r.patientCns.trim() === '') && (!r.patientCpf || r.patientCpf.trim() === '') && r.patientId && r.patientId !== 'COLETIVA');
                
                if (recordsNeedingDoc.length > 0) {
                    // Unique combinations of patient paths to fetch
                    const uniquePatientPaths = Array.from(new Set(recordsNeedingDoc.map((r: any) => {
                        const segments = r.firestorePath.split('/');
                        return `municipalities/${segments[1]}/${segments[2]}/${segments[3]}/patients/${r.patientId}`;
                    })));

                    const fetchedPatients = await Promise.all(
                        uniquePatientPaths.map(path => getDoc(doc(db, path)))
                    );

                    const patientDataMap: Record<string, any> = {};
                    fetchedPatients.forEach(snap => {
                        if (snap.exists()) {
                            patientDataMap[snap.ref.path] = snap.data();
                        }
                    });

                    // Mutate records to inject missing CNS/CPF
                    records.forEach((r: any) => {
                        if ((!r.patientCns || r.patientCns.trim() === '') && (!r.patientCpf || r.patientCpf.trim() === '') && r.patientId && r.patientId !== 'COLETIVA') {
                            const segments = r.firestorePath.split('/');
                            const path = `municipalities/${segments[1]}/${segments[2]}/${segments[3]}/patients/${r.patientId}`;
                            const pData = patientDataMap[path];
                            if (pData) {
                                r.patientCns = pData.cns || pData.patientCns || '';
                                r.patientCpf = pData.cpf || pData.patientCpf || '';
                            }
                        }
                    });
                }
                // ------------------------------------------

                setHistoryRecords(records);
            } catch (err) {
                console.error("Error fetching history:", err);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [formData.competence, claims?.entityId, claims?.municipalityId, showHistory, historyActiveTab, historyFilterUnitId, historyFilterProfessionalId, historyFilterCompetence, refreshHistoryTick]);

    const filteredHistoryRecords = useMemo(() => {
        return historyRecords.filter(record => {
            if (historyFilterDate) {
                if (record.attendanceDate !== historyFilterDate) return false;
            }
            if (historyFilterPatientTerm) {
                const term = historyFilterPatientTerm.toLowerCase();
                const matchName = (record.patientName || '').toLowerCase().includes(term);
                const matchCns = (record.patientCns || '').includes(term);
                const matchCpf = (record.patientCpf || '').includes(term);
                if (!matchName && !matchCns && !matchCpf) return false;
            }
            return true;
        });
    }, [historyRecords, historyFilterDate, historyFilterPatientTerm]);

    const groupedHistoryRecords = useMemo(() => {
        const groups = new Map<string, any[]>();
        filteredHistoryRecords.forEach(record => {
            const pId = record.patientId || 'NO_PATIENT';
            const date = record.attendanceDate || 'NO_DATE';
            const profId = record.professionalId || record.professionalName || 'NO_PROF';
            const unit = record.unitId || 'NO_UNIT';
            
            const key = `${pId}|${date}|${profId}|${unit}`;
            
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(record);
        });
        
        return Array.from(groups.values());
    }, [filteredHistoryRecords]);

    const handleEditRecord = (record: any) => {
        // Load the record into the form
        setFormData(prev => ({
            ...prev,
            ...record,
            // Map flat specific fields back to form if necessary
            patientId: record.patientId || '',
            patientCns: record.patientCns || prev.patientCns,
            patientCpf: record.patientCpf || prev.patientCpf,
            patientName: record.patientName || prev.patientName,
            patientDob: record.patientDob || prev.patientDob,
            patientAge: record.patientAge !== undefined ? String(record.patientAge) : prev.patientAge,
            // Ensure nested objects are handled if they were flattened
            soaps: record.soaps || prev.soaps,
            vaccinationData: record.vaccinationData || prev.vaccinationData,
            fadData: record.fadData || prev.fadData,
            // Address mapping
            cep: record.address?.cep || prev.cep,
            municipalityCode: record.address?.municipalityCode || prev.municipalityCode,
            street: record.address?.street || prev.street,
            number: record.address?.number || prev.number,
            complement: record.address?.complement || prev.complement,
            district: record.address?.district || prev.district,
        }));

        // Load specific procedures into the list (if they were saved flat, we might just have 1 procedure)
        // Note: The current saveSubsedeProduction saves each procedure as a separate document.
        // So, when editing, we are editing ONE specific procedure record.
        setProcedures([{
            procedureCode: record.procedureCode || '',
            procedureName: record.procedureName || '',
            cidCodes: record.cidCodes || (record.cid ? [record.cid] : []), // Handle single cid or array
            attendanceCharacter: record.attendanceCharacter || '01',
            attendanceType: record.attendanceType || '',
            authNumber: record.authNumber || '',
            serviceCode: record.serviceCode || '',
            classCode: record.classCode || '',
            quantity: record.quantity || 1,
            obs: record.obs || '',
            isExpanded: true,
            id: record.docId // Critical for update vs create
        }]);

        // Sudo Setters
        setIsReadOnlyPatient(true);
        setEditingRecordId(record.docId);
        setShowHistory(false);
        setActiveFicha(record.originFicha || 'PROCEDIMENTOS'); // Restore original ficha type if possible

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteRecord = async (docId: string) => {
        const justification = window.prompt("Especifique a justificativa para exclusão do registro (obrigatório):");
        if (!justification || !justification.trim()) {
            if (justification !== null) alert("A justificativa é obrigatória para excluir este registro.");
            return;
        }

        try {
            const recordToDelete = historyRecords.find(r => r.docId === docId);
            if (!recordToDelete) {
                alert("Registro não encontrado para exclusão.");
                return;
            }

            // Using the full firestore path derived from the collectionGroup query
            if (!recordToDelete.firestorePath) {
                alert("Erro: Caminho do registro não encontrado.");
                return;
            }

            // Soft delete requires basic context mapping
            const contextData = {
                date: recordToDelete.attendanceDate || new Date().toISOString().split('T')[0],
                competenceMonth: (recordToDelete.attendanceDate || new Date().toISOString().split('T')[0]).substring(0, 7),
                municipalityId: currentUnit?.municipalityId || claims?.municipalityId || '', 
                entityId: claims?.entityId || '',
                entityType: claims?.entityType || 'PUBLIC', 
                unitId: recordToDelete.unitId || '',
                professionalId: recordToDelete.professionalId || '',
                patientId: undefined, 
                firestorePath: recordToDelete.firestorePath
            };

            await softDeleteBpaRecord(docId, justification, contextData);

            // Update local state instead of filtering out
            setHistoryRecords(prev => prev.map(r => 
                r.docId === docId ? { ...r, status: 'canceled' as any } : r
            ));
            
            alert("Registro excluído com sucesso.");
        } catch (err) {
            console.error("Error deleting record:", err);
            alert("Erro ao excluir o registro. Verifique sua conexão e permissões.");
        }
    };

    const handleDeleteGroup = async (group: any[]) => {
        const activeRecords = group.filter(r => r.status !== 'canceled');
        if (activeRecords.length === 0) return;
        
        const count = activeRecords.length;
        const justification = window.prompt(`Especifique a justificativa para exclusão de ${count > 1 ? count + ' registros' : '1 registro'} (obrigatório):`);
        if (!justification || !justification.trim()) {
            if (justification !== null) alert("A justificativa é obrigatória para exclusão.");
            return;
        }

        try {
            for (const recordToDelete of activeRecords) {
                if (!recordToDelete.firestorePath) continue;

                const contextData = {
                    date: recordToDelete.attendanceDate || new Date().toISOString().split('T')[0],
                    competenceMonth: (recordToDelete.attendanceDate || new Date().toISOString().split('T')[0]).substring(0, 7),
                    municipalityId: currentUnit?.municipalityId || claims?.municipalityId || '', 
                    entityId: claims?.entityId || '',
                    entityType: claims?.entityType || 'PUBLIC', 
                    unitId: recordToDelete.unitId || '',
                    professionalId: recordToDelete.professionalId || '',
                    patientId: undefined, 
                    firestorePath: recordToDelete.firestorePath
                };

                await softDeleteBpaRecord(recordToDelete.docId, justification, contextData);
            }
            
            // Update Local state
            const deletedIds = new Set(activeRecords.map(r => r.docId));
            setHistoryRecords(prev => prev.map(r => deletedIds.has(r.docId) ? { ...r, status: 'canceled' as any } : r));
            
            alert("Grupo excluído com sucesso.");
        } catch (error) {
            console.error("Error deleting group:", error);
            alert("Erro ao excluir o grupo. Tente novamente.");
        }
    };

    // Calculate Age Effect
    useEffect(() => {
        if (formData.patientDob) {
            const birthDate = new Date(formData.patientDob);
            const today = new Date(); // Or attendance date? Usually age is at attendance.
            // Let's use attendanceDate if available, else today.
            const refDate = formData.attendanceDate ? new Date(formData.attendanceDate) : today;

            let age = refDate.getFullYear() - birthDate.getFullYear();
            const m = refDate.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && refDate.getDate() < birthDate.getDate())) {
                age--;
            }
            // Ensure non-negative
            setFormData(prev => ({ ...prev, patientAge: age < 0 ? '0' : String(age) }));
        }
        // If there's no DOB, we DO NOT clear patientAge, allowing the user to manually input it.
    }, [formData.patientDob, formData.attendanceDate]);

    // Auto-Set Location for ACS / Domiciliar
    useEffect(() => {
        if (activeFicha === 'DOMICILIAR') {
            setFormData(prev => ({ ...prev, localAtendimento: '4' }));
        }
    }, [activeFicha]);

    // Pregnant Eligibility Check
    const isPrenatalEligible = useMemo(() => {
        if (formData.patientSex !== 'F') return false;
        const age = parseInt(formData.patientAge);
        return !isNaN(age) && age >= 9 && age <= 60;
    }, [formData.patientSex, formData.patientAge]);

    // Auto-Calculate Gestational Age from DUM
    useEffect(() => {
        if (formData.dumDaGestante && formData.isPregnant) {
            const dumDate = new Date(formData.dumDaGestante);
            const refDate = formData.attendanceDate ? new Date(formData.attendanceDate) : new Date();
            const diffTime = Math.abs(refDate.getTime() - dumDate.getTime());
            const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
            if (diffWeeks > 0 && diffWeeks < 45) {
                setFormData(prev => ({ ...prev, idadeGestacional: String(diffWeeks) }));
            }
        }
    }, [formData.dumDaGestante, formData.attendanceDate, formData.isPregnant]);

    // Patient Search Debounce
    const debouncedCns = useDebounce(formData.patientCns, 500);
    const debouncedCpf = useDebounce(formData.patientCpf, 500);
    const debouncedName = useDebounce(formData.patientName, 500);

    // Generate last 36 months for Competence Select
    useEffect(() => {
        const options = [];
        const today = new Date();
        for (let i = 0; i < 36; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const competence = `${year}${month}`;
            const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
            options.push({ competence, label: formattedLabel });
        }
        setAvailableCompetences(options);

        // Default to current month
        if (!currentCompetence) {
            const current = options[0].competence;
            setCurrentCompetence(current);
            setFormData(prev => ({ ...prev, competence: current }));
        }
    }, []);

    // Update Unit info
    useEffect(() => {
        if (currentUnit && user) {
            const [_, assignmentIndexStr] = selectedProfessionalId.split('|');
            const assignmentIndex = assignmentIndexStr ? parseInt(assignmentIndexStr) : -1;

            let actualCbo = '';
            if (assignmentIndex >= 0 && user.assignments && user.assignments[assignmentIndex]) {
                const a = user.assignments[assignmentIndex];
                actualCbo = a.cbo || a.occupation || '';
            } else {
                // Fallback legacy logic
                const assignment = user.assignments?.find(a => a.unitId === currentUnit.id);
                actualCbo = assignment?.cbo || assignment?.occupation || user.cbo || user.occupation || '';
            }

            setFormData(prev => ({
                ...prev,
                unit: currentUnit.id,
                cbo: actualCbo
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                unit: '',
                cbo: ''
            }));
        }
    }, [currentUnit, user, selectedProfessionalId]);

    // EFFECT: Pre-fill specific professional/unit based on assignment (if one exists for the unit)
    // Removed implicit user logic based on legacy useApp: e.g. selectUnit was here.

    // Determine if unit is subject to LEDI/APS integration
    const isLediTarget = useMemo(() => {
        // 0. Simplified Configuration Check
        if (interfaceType === 'SIMPLIFIED') return false;

        // 1. Explicit Ficha Selection (Strongest Signal)
        // If user explicitly selects a field-form (like Individual, Odonto, Vaccination), it IS an APS/LEDI activity.
        const lediFichas: FichaType[] = ['INDIVIDUAL', 'ODONTO', 'DOMICILIAR', 'VACINACAO', 'COLETIVA'];
        if (activeFicha && lediFichas.includes(activeFicha)) {
            return true;
        }

        // 2. Unit Type Fallback (for 'PROCEDIMENTOS' or generic inference)
        if (!currentUnit?.type) return false;
        const typeNormalized = currentUnit.type.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const apsTypes = ['UBS', 'ESF', 'POSTO', 'CENTRO DE SAUDE', 'UNIDADE BASICA', 'FAMILIA', 'EACS', 'PACS'];
        return apsTypes.some(t => typeNormalized.includes(t));
    }, [currentUnit, activeFicha, interfaceType]);

    // Patient Search State
    const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);
    const [showPatientSuggestions, setShowPatientSuggestions] = useState<'cns' | 'cpf' | 'name' | null>(null);
    const [patientFound, setPatientFound] = useState(false);

    // History & Smart Form State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isReadOnlyPatient, setIsReadOnlyPatient] = useState(false);
    const [isHypertensiveOrDiabetic, setIsHypertensiveOrDiabetic] = useState(false);
    const [patientHealthFlags, setPatientHealthFlags] = useState<{ isHypertension?: boolean, isDiabetes?: boolean }>({});
    const [pendingExams, setPendingExams] = useState<{ code: string, name: string, date: string }[]>([]);

    // Patient Auto-Search (Prefix/List)
    useEffect(() => {
        async function searchPatient() {
            const termCns = debouncedCns.replace(/\D/g, '');
            const termCpf = debouncedCpf.replace(/\D/g, '');
            const termName = debouncedName.trim().toUpperCase();

            // Only search if we have at least 3 digits to avoid huge lists
            if (termCns.length < 3 && termCpf.length < 3 && termName.length < 3) {
                setPatientSuggestions([]);
                setShowPatientSuggestions(null);
                setPatientFound(false); // Reset found status
                return;
            }

            try {
                // Inside the Entity Subsede context, the entityType should default to 'PRIVATE' if missing from claims.
                let rawEntityType = claims?.entityType || user?.entityType || "PRIVATE";
                let entityType = rawEntityType === 'Privada' || rawEntityType === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';

                const resolvedMunicipalityId = currentUnit?.municipalityId || claims?.municipalityId || '';
                const resolvedEntityId = claims?.entityId || user?.entityId || '';

                const patientsRef = collection(db, 'municipalities', entityType, resolvedEntityId, resolvedMunicipalityId, 'patients');
                let q;
                let type: 'cns' | 'cpf' | 'name' | null = null;

                // Prioritize CNS search if active
                if (termCns.length >= 3 && !patientFound) {
                    type = 'cns';
                    // Prefix search: cns >= term && cns <= term + '\uf8ff'
                    q = query(
                        patientsRef,
                        where('cns', '>=', termCns),
                        where('cns', '<=', termCns + '\uf8ff'),
                        limit(5)
                    );
                } else if (termCpf.length >= 3 && !patientFound) {
                    type = 'cpf';
                    q = query(
                        patientsRef,
                        where('cpf', '>=', termCpf),
                        where('cpf', '<=', termCpf + '\uf8ff'),
                        limit(5)
                    );
                } else if (termName.length >= 3 && !patientFound) {
                    type = 'name';
                    q = query(
                        patientsRef,
                        where('name', '>=', termName),
                        where('name', '<=', termName + '\uf8ff'),
                        limit(5)
                    );
                }

                if (q && type) {
                    const snapshot = await getDocs(q);
                    const results = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
                    setPatientSuggestions(results);
                    setShowPatientSuggestions(type);
                }
            } catch (err) {
                console.error("Error searching patient:", err);
            }
        }
        searchPatient();
    }, [debouncedCns, debouncedCpf, debouncedName]);

    const handleSelectPatient = async (patient: any) => {
        setIsReadOnlyPatient(true); // Lock demographic fields

        let newData = {
            ...formData,
            patientId: patient.id,
            patientCns: patient.cns || formData.patientCns,
            patientCpf: patient.cpf || formData.patientCpf,
            patientName: patient.patientName || patient.name || formData.patientName,
            patientDob: patient.patientDob || patient.dob || formData.patientDob,
            patientAge: patient.patientAge || '',
            patientSex: patient.patientSex || patient.sex || formData.patientSex,
            patientRace: patient.patientRace || patient.race || formData.patientRace,
            patientNationality: patient.patientNationality || patient.nationality || formData.patientNationality,
            patientPhone: patient.patientPhone || patient.phone || formData.patientPhone,
            isHomeless: patient.isHomeless || false,
            address: patient.address?.cep ? {
                cep: patient.address?.cep || formData.cep,
                municipalityCode: patient.address?.municipalityCode || formData.municipalityCode,
                street: patient.address?.street || formData.street,
                number: patient.address?.number || formData.number,
                complement: patient.address?.complement || formData.complement,
                district: patient.address?.district || formData.district
            } : formData.address
        };

        // Initialize Flags from Master Record
        const masterHypertension = patient.healthConditions?.statusTemHipertensaoArterial === true;
        const masterDiabetes = patient.healthConditions?.statusTemDiabetes === true;
        let isChron = masterHypertension || masterDiabetes;

        setPatientHealthFlags({
            isHypertension: masterHypertension,
            isDiabetes: masterDiabetes
        });

        // Smart Pre-filling
        if (patient.cns) {
            try {
                const clinicalData = await getLastClinicalData(patient.cns, user?.entityId || '');
                if (clinicalData) {
                    newData = {
                        ...newData,
                        weight: clinicalData.weight || newData.weight,
                        height: clinicalData.height || newData.height,
                        pressaoArterialSistolica: clinicalData.pressaoArterialSistolica || newData.pressaoArterialSistolica,
                        pressaoArterialDiastolica: clinicalData.pressaoArterialDiastolica || newData.pressaoArterialDiastolica,
                        frequenciaCardiaca: clinicalData.frequenciaCardiaca || newData.frequenciaCardiaca,
                        frequenciaRespiratoria: clinicalData.frequenciaRespiratoria || newData.frequenciaRespiratoria,
                        temperatura: clinicalData.temperatura || newData.temperatura,
                        saturacaoO2: clinicalData.saturacaoO2 || newData.saturacaoO2,
                        vacinaEmDia: clinicalData.vacinaEmDia ?? newData.vacinaEmDia,
                        ficouEmObservacao: clinicalData.ficouEmObservacao ?? newData.ficouEmObservacao,
                        soaps: {
                            ...newData.soaps,
                            evaluation: {
                                ...newData.soaps.evaluation,
                                problemConditions: (clinicalData.soaps?.evaluation?.problemConditions || [])
                                    .filter((p: any) => p.situacao !== '2') // Filter out 'Resolvido'
                                    .map((p: any) => ({
                                        ...p,
                                        isAvaliado: false, // Default to FALSE to require re-evaluation/confirmation
                                        isHistory: true, // Identify as History/Evolution
                                        // Ensure UUID is kept if present for Evolution
                                    }))
                            }
                        }
                    };

                    // Check Conditions from History (in case Master is outdated)
                    const problems = clinicalData.soaps?.evaluation?.problemConditions || [];
                    const historyChron = problems.some((p: any) =>
                        p.code.startsWith('K86') || p.code.startsWith('K87') || // CIAP Hypertension
                        p.code.startsWith('I10') || p.code.startsWith('I11') || // CID Hypertension
                        p.code.startsWith('T90') || // CIAP Diabetes
                        p.code.startsWith('E10') || p.code.startsWith('E11') // CID Diabetes
                    );

                    if (historyChron) isChron = true;
                }

                setIsHypertensiveOrDiabetic(isChron);

                const exams = await getPendingExams(patient.cns, user?.entityId || '');
                setPendingExams(exams);
            } catch (err) {
                console.error("Error fetching patient history data:", err);
            }
        }

        setFormData(newData);
        if (newData.address?.cep) setShowAddress(true);
        setPatientFound(true);
        setPatientSuggestions([]);
        setShowPatientSuggestions(null);
    };

    // Procedure Handlers
    const handleAddProcedure = (newProc?: any) => {
        if (newProc) {
            setProcedures(prev => [...prev.map(p => ({ ...p, isExpanded: false })), { ...newProc, isExpanded: false }]);
        }
    };

    const handleRemoveProcedure = (index: number) => {
        setProcedures(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateProcedure = (index: number, data: Partial<ProcedureItem>) => {
        // Validation: Check if procedureCode is being updated and conflicts with OCI
        if (data.procedureCode && data.procedureCode.startsWith('09')) {
            const cleanCode = data.procedureCode.replace(/\D/g, '');
            const alreadyInOci = formDataRef.current.solicitacoesOci?.some((oci: any) => oci.codigoSigtap.replace(/\D/g, '') === cleanCode);
            if (alreadyInOci) {
                alert('Erro: Este procedimento do Grupo 09 já foi adicionado na seção "Solicitações OCI". Evite duplicidade.');
                return; // Block update
            }
        }

        setProcedures(prev => {
            const newList = [...prev];
            newList[index] = { ...newList[index], ...data };
            return newList;
        });
    };

    const handleToggleExpand = (index: number) => {
        setProcedures(prev => {
            const newList = [...prev];
            newList[index] = { ...newList[index], isExpanded: !newList[index].isExpanded };
            return newList;
        });
    };

    const handleOpenSigtap = (index: number) => {
        setActiveSearchIndex(index);
        setIsSigtapModalOpen(true);
    };

    const handleSigtapSelect = async (proc: SigtapProcedureRow) => {
        // CBO Validation (Warning and Confirmation)
        const validation = sigtapService.checkCboCompatibility(proc, formData.cbo);
        if (!validation.compatible) {
            const proceed = window.confirm(`${validation.message || 'CBO incompatível'}\n\nDeseja prosseguir e registrar este procedimento mesmo assim?`);
            if (!proceed) return;
        }

        // OCI Validation (Avoid Duplication)
        if (proc.code.startsWith('09')) {
            const alreadyInOci = formData.solicitacoesOci?.some((oci: any) => oci.codigoSigtap === proc.code);
            if (alreadyInOci) {
                alert('Erro: Este procedimento do Grupo 09 já foi adicionado na seção "Solicitações OCI". Evite duplicidade.');
                return;
            }
        }

        if (activeSearchIndex !== null) {
            const currentProcedure = procedures[activeSearchIndex];
            const updatedProcedure: Partial<ProcedureItem> = {
                procedureCode: proc.code,
                procedureName: proc.name,
                cidCodes: [], // Reset CIDs on change
                serviceCode: '', // Reset Service
                classCode: proc.classCode,
                // Context Fields (if available/passed)
                groupCode: (proc as any).groupCode,
                subGroupCode: (proc as any).subGroupCode,
                formCode: (proc as any).formCode,
            };

            // 1. Load Compatible CIDs
            try {
                const cids = await getCompatibleCids(proc);
                if (cids.length === 0) {
                    updatedProcedure.cidCodes = [];
                } else {
                    if (cids.length === 1) {
                        updatedProcedure.cidCodes = [cids[0].code];
                    } else {
                        updatedProcedure.cidCodes = [""]; // Allow user to select
                    }
                }
            } catch (err) {
                console.error("Error loading CIDs:", err);
            }

            // 2. Load Attendance Character
            try {
                const charCode = await getAttendanceCharacterForProcedure(proc);
                if (charCode) {
                    const exists = LISTA_CARATER_ATENDIMENTO.some(opt => opt.value === charCode);
                    if (exists) {
                        updatedProcedure.attendanceCharacter = charCode;
                    }
                }
            } catch (err) {
                console.error("Error loading character:", err);
            }

            // 3. Load Services
            try {
                const services = await getServicesForProcedure(proc);
                if (services.length === 1) {
                    updatedProcedure.serviceCode = services[0].code;
                }
            } catch (err) {
                console.error("Error loading services:", err);
            }

            handleUpdateProcedure(activeSearchIndex, updatedProcedure);
            setIsSigtapModalOpen(false);
            setActiveSearchIndex(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // ---------------------------------------------------------
        // 0. RETROACTIVE PRODUCTION BLOCK (Tolerance Check)
        // ---------------------------------------------------------
        if (formData.attendanceDate && productionToleranceDays > 0) {
            const attDate = new Date(`${formData.attendanceDate}T12:00:00`);
            if (!isNaN(attDate.getTime())) {
                const deadlineDate = new Date(attDate.getFullYear(), attDate.getMonth() + 1, productionToleranceDays);
                const today = new Date();
                const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                
                if (todayMidnight > deadlineDate) {
                    setError(`O prazo para digitação retroativa desta competência expirou (Limite: dia ${productionToleranceDays} do mês seguinte). Entre em contato com a Regulação do Núcleo de Saúde da entidade ${entityName}.`);
                    
                    try {
                        const entityType = claims?.entityType === 'Privada' || claims?.entityType === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
                        const logsRef = collection(db, `municipalities/${entityType}/${claims?.entityId}/${claims?.municipalityId}/logs`);
                        await addDoc(logsRef, {
                            action: 'BLOCK',
                            target: 'PROFESSIONAL',
                            description: `Bloqueio de Produção: Tentativa de registrar atendimento retroativo (${formData.attendanceDate}) via Subsede.`,
                            user: {
                                uid: user?.id || '',
                                email: user?.email || '',
                                name: user?.name || '',
                                role: 'SUBSEDE'
                            },
                            entityId: claims?.entityId || '',
                            municipalityId: claims?.municipalityId || '',
                            timestamp: serverTimestamp()
                        });
                    } catch (e) {
                        console.error('Failed to log block:', e);
                    }
                    return;
                }
            }
        }

        // ---------------------------------------------------------
        // 1. COLLECTIVE ACTIVITY PATH (Bypass Standard Validation)
        // ---------------------------------------------------------
        if (activeFicha === 'COLETIVA') {
            const colData = (formData as any).coletivaData;

            // Validation: Activity Type
            if (!colData?.atividadeTipo) {
                setError('Erro: Selecione o Tipo de Atividade.');
                return;
            }

            // Validation: INEP if PSE
            if ((colData.pseEducacao || colData.pseSaude) && !colData.inep) {
                setError('Erro: INEP é obrigatório para atividades PSE.');
                return;
            }

            // Validation: Participants (Required for 05/06)
            if (['05', '06'].includes(colData.atividadeTipo)) {
                if (!colData.participantes || colData.participantes.length === 0) {
                    setError('Erro: É necessário adicionar pelo menos um participante para este tipo de atividade.');
                    return;
                }
            }

            // Validation: Competence
            if (!formData.competence) {
                setError('Erro: Competência não selecionada.');
                return;
            }

            setLoading(true);
            try {
                const competenceMonth = `${formData.competence.slice(0, 4)}-${formData.competence.slice(4, 6)}`;

                // Synthetic Procedure Item for Storage
                // The backend/storage expects an array of procedures. We create one representing the activity.
                const syntheticProcedure: ProcedureFormItem = {
                    procedureCode: '0000000000', // Placeholder or specific code if rules require
                    procedureName: 'ATIVIDADE COLETIVA',
                    cidCodes: [],
                    attendanceCharacter: '',
                    quantity: 1,
                    obs: `Atividade Tipo ${colData.atividadeTipo}`,

                    // Flattened params if strict schema requires them here, 
                    // otherwise they live in the 'coletivaData' of the shared object.
                    activityType: colData.atividadeTipo,
                    participantsCount: (colData.participantes || []).length
                };

                // Save
                await saveSubsedeProduction({
                    unitId: formData.unit,
                    unitName: currentUnit?.name,
                    cbo: formData.cbo,
                    professionalId: user?.professionalId || user?.id || '',
                    professionalName: user?.name || '',
                    entityId: user?.entityId || '',
                    entityType: (user?.entityType === 'Privada' ? 'PRIVATE' : user?.entityType === 'Pública' ? 'PUBLIC' : user?.entityType) || 'PUBLIC', // TRUSTED CONTEXT SOURCE
                    municipalityId: currentUnit?.municipalityId || '',
                    municipalityName: currentUnit?.municipalityName || '',
                    // entityType removed: let service resolve it (bpaService defaults to PUBLIC or fetches correctly)

                    // Patient Data is Irrelevant/Empty for Header, but service might expect strings
                    patientId: 'COLETIVA',
                    patientCns: '',
                    patientName: 'ATIVIDADE COLETIVA',
                    patientDob: '',
                    patientSex: '',
                    patientRace: '',
                    patientNationality: '',
                    patientPhone: '',
                    isHomeless: false,

                    competence: formData.competence,
                    competenceMonth: competenceMonth,
                    attendanceDate: formData.attendanceDate,

                    originFicha: 'COLETIVA',

                    careContext: isLediTarget ? { level: 'APS', system: 'LEDI' } : undefined,

                    // CRITICAL: Pass the Collective Data Object
                    coletivaData: colData

                }, [syntheticProcedure]);

                setStep('success');
            } catch (err) {
                console.error("Error saving Collective Activity:", err);
                setError('Erro ao salvar Atividade Coletiva. Tente novamente.');
            } finally {
                setLoading(false);
            }
            return; // EXIT FUNCTION
        }

        // ---------------------------------------------------------
        // 2. STANDARD PATH (Individual, Odonto, Proc, Domiciliar)
        // ---------------------------------------------------------

        const cleanCns = formData.patientCns ? formData.patientCns.replace(/\D/g, '') : '';
        const cleanCpf = formData.patientCpf ? formData.patientCpf.replace(/\D/g, '') : '';

        // Validation
        if (interfaceType === 'SIMPLIFIED') {
            if (!cleanCns && !cleanCpf) {
                setError('É obrigatório informar o CNS ou o CPF do paciente.');
                return;
            }
            if (!formData.patientName || formData.patientName.trim() === '') {
                setError('É obrigatório informar o Nome do paciente.');
                return;
            }
            if (cleanCns.length > 0 && cleanCns.length !== 15) {
                setError('CNS Inválido. O cartão SUS deve conter exatamente 15 números.');
                return;
            }
            if (cleanCpf.length > 0 && cleanCpf.length !== 11) {
                setError('CPF Inválido. O CPF deve conter exatamente 11 números.');
                return;
            }
        } else {
            // Original Legacy validation
            if (!cleanCns && !cleanCpf && !formData.patientName) {
                setError('Informe ao menos o CNS, CPF ou Nome do paciente');
                return;
            }
        }

        // LEDI/APS Validation
        if (isLediTarget) {
            // 1. CNS Validation (Modulo 11) - NOW CNS OR CPF
            if (!cleanCns && !cleanCpf) {
                setError('Para unidades APS (e-SUS), é obrigatório informar o CNS ou o CPF do paciente.');
                return;
            }
            if (cleanCns.length > 0 && !validateCNS(cleanCns)) {
                setError('CNS Inválido. Verifique o número do cartão SUS (Algoritmo Módulo 11).');
                return;
            }

            // 2. Name Validation (Regex)
            const nameValidation = validatePatientName(formData.patientName);
            if (!nameValidation.isValid) {
                setError(`Nome inválido para o e-SUS: ${nameValidation.message}`);
                return;
            }

            // 3. Mandatory Shift
            if (!formData.shift) {
                setError('O campo Turno é obrigatório para envio ao e-SUS.');
                return;
            }

            // 4. Ficha Specific Validations
            if (activeFicha === 'INDIVIDUAL') {
                const problems = formData.soaps?.evaluation?.problemConditions || [];
                const conduct = formData.soaps?.plan?.conduct || [];

                if (conduct.length === 0) {
                    setError('Ficha Atendimento Individual: Informe a Conduta/Desfecho.');
                    return;
                }
            }

            if (activeFicha === 'ODONTO') {
                if (!formData.consultationType) {
                    setError('Ficha Odontológica: Informe o Tipo de Consulta.');
                    return;
                }
                const vigilance = formData.oralHealthVigilance || [];
                if (vigilance.length === 0) {
                    setError('Ficha Odontológica: Informe a Vigilância em Saúde Bucal (ou Não Identificado).');
                    return;
                }
                const conduct = formData.odontoConduct || [];
                if (conduct.length === 0) {
                    setError('Ficha Odontológica: Informe a Conduta/Desfecho.'); // Usually mandatory too
                    return;
                }
            }
        }


        if (!formData.competence) {
            setError('Erro: Competência SIGTAP não selecionada.');
            return;
        }

        // Validate Procedures
        for (let i = 0; i < procedures.length; i++) {
            const p = procedures[i];

            // 1. Common Validation
            if (!p.procedureCode) {
                setError(`Procedimento #${i + 1}: Código obrigatório.`);
                return;
            }

            // 3. Individual Validation (Standard)
            if (p.quantity <= 0) {
                setError(`Procedimento #${i + 1}: Quantidade inválida.`);
                return;
            }

            // LEDI Vaccination Check (Strict)
            if (isLediTarget && (p.procedureName.toUpperCase().includes('VACINA') || p.procedureName.toUpperCase().includes('IMUNOBI'))) {
                const vacValidation = validateVaccinationData(p.vaccinationData);
                if (!vacValidation.isValid) {
                    setError(`Procedimento #${i + 1} (Vacina): ${vacValidation.message}`);
                    return;
                }
            }
        }

        setLoading(true);
        try {
            const competenceMonth = `${formData.competence.slice(0, 4)}-${formData.competence.slice(4, 6)}`;

            // 2. Save/Update Patient (CRITICAL: Restored this call)
            const patientId = await saveOrUpdatePatient({
                id: (formData as any).patientId, // Pass explicit ID to avoid duplicates
                cns: cleanCns,
                cpf: cleanCpf,
                name: formData.patientName,
                dob: formData.patientDob,
                age: formData.patientAge,
                sex: formData.patientSex,
                race: formData.patientRace,
                nationality: formData.patientNationality,
                phone: formData.patientPhone,
                isHomeless: formData.isHomeless,
                address: {
                    cep: formData.cep,
                    municipalityCode: formData.municipalityCode,
                    street: formData.street,
                    number: formData.number,
                    complement: formData.complement,
                    district: formData.district
                }
            },
                // Context Params for Scoped Path
                currentUnit?.municipalityId || (user?.units?.find(u => u.id === formData.unit)?.municipalityId) || '',
                user?.entityId || '',
                (claims?.entityType || user?.entityType || 'PRIVATE'), // Default to PRIVATE in Subsede component
                formData.unit
            );
            // -------------------------------------------------------------------------
            // SANITIZATION HELPER (Privacy & Validation Rules)
            // -------------------------------------------------------------------------
            const sanitizeFaiPayload = (data: any) => {
                const cleaned = { ...data };
                const isMale = data.patientSex === '0' || data.patientSex === 0;
                const age = Number(data.patientAge) || 0;

                // 1. Pregnancy Fields (Female Only)
                if (isMale) {
                    delete cleaned.dumDaGestante;
                    delete cleaned.idadeGestacional;
                    delete cleaned.stGravidezPlanejada;
                    delete cleaned.nuGestasPrevias;
                    delete cleaned.nuPartos;
                }

                // 2. IVCF (Age >= 60)
                if (age < 60) {
                    delete cleaned.ivcf;
                }

                // 3. Optional Selectors (Empty Strings -> Undefined)
                if (cleaned.atencaoDomiciliarModalidade === '' || cleaned.atencaoDomiciliarModalidade === 0) delete cleaned.atencaoDomiciliarModalidade;
                if (cleaned.racionalidadeSaude === '' || cleaned.racionalidadeSaude === 0) delete cleaned.racionalidadeSaude;
                if (cleaned.tipoGlicemiaCapilar === '' || cleaned.tipoGlicemiaCapilar === 0) delete cleaned.tipoGlicemiaCapilar;

                // 4. NASF (Empty Array -> Undefined)
                if (cleaned.nasfs && cleaned.nasfs.length === 0) delete cleaned.nasfs;

                // 5. Vitals (Empty Strings/Zeros -> Undefined)
                // If weight/height are 0 or empty, remove them to avoid "0" being sent as valid data if optional
                // Note: Dict says 0 is min for weight? No, min is 0.5. So 0 is invalid.
                if (Number(cleaned.weight) === 0) delete cleaned.weight;
                if (Number(cleaned.height) === 0) delete cleaned.height;

                // Remove pre-filled defaults if user didn't change them? 
                // Difficult to know if 98% Saturation is default or real. 
                // We assume if it's in formData it's valid, BUT we must ensure the 'medicoes' object construction in adapter handles it.

                // 6. Medicamentos (Dose Logic)
                if (cleaned.medicamentos && cleaned.medicamentos.length > 0) {
                    cleaned.medicamentos = cleaned.medicamentos.map((m: any) => {
                        const mClean = { ...m };
                        if (mClean.doseUnica) {
                            delete mClean.doseFrequenciaTipo;
                            delete mClean.doseFrequencia;
                            delete mClean.doseFrequenciaQuantidade;
                            delete mClean.doseFrequenciaUnidadeMedida;
                            delete mClean.duracaoTratamento;
                            delete mClean.duracaoTratamentoMedida;
                            delete mClean.qtDoseManha;
                            delete mClean.qtDoseTarde;
                            delete mClean.qtDoseNoite;
                        }
                        return mClean;
                    });
                } else {
                    delete cleaned.medicamentos;
                }

                // 7. Empty Encaminhamentos & OCI
                if (cleaned.encaminhamentos && cleaned.encaminhamentos.length === 0) delete cleaned.encaminhamentos;
                if (cleaned.solicitacoesOci && cleaned.solicitacoesOci.length === 0) delete cleaned.solicitacoesOci;

                // 8. Odonto Sanitization
                if (!['16', '12', '18', '14', '17', '15'].includes(cleaned.odontoConduct?.[0])) {
                    // Maybe filter invalid ones?
                }

                return cleaned;
            };

            const sanitizedData = sanitizeFaiPayload(formData);

            // -------------------------------------------------------------------------
            // UNIFIED INTERFACE -> DUAL BACKEND DISPATCH STRATEGY
            // -------------------------------------------------------------------------
            // We separate procedures into "Consultation Types" (FAI) and "Realized Procedures" (FP).
            // - FAI (Ficha de Atendimento Individual - CDS 03): Receives Consultations, SOAP, Problems, Exam Requests.
            // - FP (Ficha de Procedimentos - CDS 06): Receives Realized Procedures (Curativo, Sutura, etc), Vitals, IVCF.
            // Shared Data: Vitals, IVCF, Header, Patient Info.

            // 1. Categorize Procedures
            const faiProcedures: ProcedureFormItem[] = [];
            const fpProcedures: ProcedureFormItem[] = [];

            // Helper to check if a code is a consultation (Generic Logic - Expand as needed based on SIGTAP)
            // Ideally this comes from a robust mapping. For now, we use known prefixes/ranges or specific checks.
            // Common Consultations: 03.01.01.007-2 (Medico), 03.01.01.004-8 (Enfermeiro), 03.01.01.003-0 (Pre-Natal)
            // Also 03.01.06 (Auditiva), 03.01.07 (Visual) etc often go to FAI.
            // "Realized Procedures" like Curativo (04.01.01...), Sutura (04.01.02...) go to FP.
            //
            // Rule of Thumb for e-SUS: 
            // - Group 03 (Clinicos) usually FAI, BUT some represent specific acts.
            // - Group 04 (Cirurgicos), 02 (Diagnosticos - executed, not requested) usually FP.
            // - Exception: "Escuta Inicial" (03.01.04.007-9) is explicit in header, not procedure list in some versions.

            // NOTE: The user requested NO changes to existing forms, just backend splitting.

            procedures.forEach(p => {
                // Normalize chars and DEEP sanitize undefined
                const removeUndefined = (obj: any): any => {
                    if (Array.isArray(obj)) return obj.map(v => removeUndefined(v)).filter(v => v !== undefined);
                    if (obj !== null && typeof obj === 'object') {
                        return Object.entries(obj).reduce((acc: any, [key, val]) => {
                            const cleanVal = removeUndefined(val);
                            if (cleanVal !== undefined) acc[key] = cleanVal;
                            return acc;
                        }, {});
                    }
                    return obj;
                };

                const pClean = removeUndefined({ ...p, attendanceCharacter: p.attendanceCharacter?.substring(0, 2) || '' });

                // LOGIC: If it's a Consultation, it goes to FAI. If it's a Procedure, it goes to FP.
                // We assume if specific fields like 'Problem/CIAP' are tied to it, it MIGHT be FAI, 
                // but strictly speaking, FAI uses the 'header' to define the visit, and procedures strictly for 'conduct'.
                // However, e-SUS FAI Thrift DOES NOT HAVE a list for 'procedimentosRealizados'. 
                // It ONLY has 'exames' (requested/evaluated) and 'nasfs'/'condutas' (arrays of ints from predefined internal lists).

                // THEREFORE: ANY SIGTAP Procedure Code (02..., 03..., 04...) *that is not purely representing the visit type itself*
                // MUST go to Ficha de Procedimentos if it needs to be recorded as "Produced".
                // The FAI itself generates "Production" via its Header/Turno/TipoAtendimento.

                // Strategy:
                // - FAI Batch: Includes the "Consultation" item IF one exists in the list (as a placeholder for the header logic).
                //   actually, FAI doesn't strictly need a procedure item in the 'bpaService' payload to generate XML, 
                //   it relies on 'soaps', 'problems', etc. But `saveMultipleBpaRecords` expects at least one item to iterate.
                //   We'll use the "Primary" consultation code for FAI batch.

                // - FP Batch: Includes all valid procedural codes (Curativos, Suturas, Exams Done).

                const isConsultation = p.procedureCode.startsWith('030101'); // Crude check for Basic Care Consultations

                if (activeFicha === 'PROCEDIMENTOS') {
                    // In Simplified mode, EVERYTHING is a procedure (no SOAP/FAI header).
                    fpProcedures.push(pClean);
                } else if (isConsultation || activeFicha === 'INDIVIDUAL') {
                    // It is kept in FAI mainly to drive the "Visit" record generation.
                    // But if it's strictly a "Procedure" (like Sutura), it CANNOT stay in FAI.

                    if (p.procedureCode.startsWith('030101')) {
                        faiProcedures.push(pClean);
                    } else {
                        // It's likely a procedure (Sutura 04..., Curativo...)
                        fpProcedures.push(pClean);
                    }
                } else if (activeFicha === 'ODONTO') {
                    // Odonto has its own list in Thrift, usually keeps everything.
                    faiProcedures.push(pClean);
                } else {
                    // Collective / Domiciliar / etc
                    faiProcedures.push(pClean);
                }
            });

            // Edge Case: If FAI is active but NO consultation code was explicitly added (e.g. user just did SOAP),
            // we likely still need to save FAI. 
            // However, the current UI forces adding a procedure.
            // If the user added ONLY "Sutura" and did SOAP... this is conceptually a "Consulta com Procedimento".
            // We need 1 FAI (for SOAP) + 1 FP (for Sutura).
            // We need a dummy/placeholder for FAI iteration if faiProcedures is empty but we have SOAP data.
            if (activeFicha === 'INDIVIDUAL' && faiProcedures.length === 0 && (formData.soaps || formData.patientCns)) {
                // Create a synthetic item for the FAI loop? 
                // Or just attach the 'Consultation' logic to the first FP item but save as FAI?
                // No, safer to assume: If user ONLY listed procedures, they probably skipped the "Consulta" code.
                // We will send SOAP data with the FAI batch even if the procedure list is empty (if service allows).
                // `saveMultipleBpaRecords` iterates items. If empty, it sends nothing.
                // We'll insert a synthetic 'Visit' item if needed? 
                // For now, let's respect the user's input. If no consultation code, maybe they didn't hold a consultation?
            }

            // ----------------------------------------------------
            // BATCH 1: FAI (Ficha Atendimento Individual)
            // ----------------------------------------------------
            const savePromises = [];

            // Determine "Main" FAI items (Consultations)
            // If it's generic INDIVIDUAL mode and we have something for FAI (or pure FAI logic)
            // Note: If faiProcedures is empty but we have SOAP, we might miss saving the Clinical part. 
            // In ProBPA context, usually the first item IS the consultation.

            // Logic: If activeFicha is INDIVIDUAL, we ALWAYS try to save FAI if there is meaningful data,
            // even if we have to "borrow" an item or use a synthetic one.
            // But strict logic: Only save FAI if there are "Consultation" items OR if user selected "INDIVIDUAL".

            const runFai = activeFicha === 'INDIVIDUAL' || activeFicha === 'ODONTO' || activeFicha === 'DOMICILIAR';

            if (runFai && (faiProcedures.length > 0 || (activeFicha === 'INDIVIDUAL' && fpProcedures.length > 0))) {
                // If we have "Consultation" items, use them.
                // If we ONLY have "Procedure" items (fpProcedures) but it's an INDIVIDUAL form with SOAP,
                // we MUST save the FAI part (SOAP) as well. We can use a "Synthetic" item or just the first procedure
                // essentially acting as the header-carrier, even if the procedure itself isn't written to FAI Thrift body.

                const faiItems = faiProcedures.length > 0 ? faiProcedures : [fpProcedures[0]]; // Fallback to carry SOAP

                savePromises.push(saveSubsedeProduction({
                    unitId: formData.unit,
                    unitName: currentUnit?.name,
                    cbo: formData.cbo,
                    professionalId: user?.professionalId || user?.id || '',
                    professionalName: user?.name || '',
                    entityId: user?.entityId || '',
                    municipalityId: currentUnit?.municipalityId || '',
                    municipalityName: currentUnit?.municipalityName || '',
                    entityType: (user?.entityType === 'Privada' ? 'PRIVATE' : user?.entityType === 'Pública' ? 'PUBLIC' : user?.entityType) || 'PUBLIC',
                    // entityType removed: let service resolve it

                    patientId: patientId,
                    patientCns: cleanCns,
                    patientName: formData.patientName,
                    patientDob: formData.patientDob,
                    patientAge: formData.patientAge,
                    patientSex: formData.patientSex,
                    patientRace: formData.patientRace,
                    patientNationality: formData.patientNationality,
                    patientPhone: formData.patientPhone,
                    isHomeless: formData.isHomeless,
                    address: showAddress ? {
                        cep: formData.cep,
                        municipalityCode: formData.municipalityCode,
                        street: formData.street,
                        number: formData.number,
                        complement: formData.complement,
                        district: formData.district
                    } : undefined,

                    competence: formData.competence,
                    competenceMonth: competenceMonth,
                    attendanceDate: formData.attendanceDate,

                    // ORIGIN: FAI (or ODONTO/DOMICILIAR)
                    originFicha: (activeFicha === 'INDIVIDUAL' && formData.localAtendimento === '4') ? 'DOMICILIAR' : activeFicha,

                    careContext: isLediTarget ? { level: 'APS', system: 'LEDI' } : undefined,

                    // LEDI Fields (FAI Specifics + Shared)
                    shift: sanitizedData.shift,
                    attendanceType: (() => {
                        // ... logic ...
                        const hasEscuta = procedures.some(p => p.attendanceCharacter?.includes('ESCUTA'));
                        if (hasEscuta) return '04';
                        const hasDia = procedures.some(p => p.attendanceCharacter?.includes('DIA'));
                        if (hasDia) return '05';
                        const hasUrgencia = procedures.some(p => ['02', '03', '04', '05', '06'].includes(p.attendanceCharacter?.substring(0, 2)));
                        if (hasUrgencia) return '06';
                        if (procedures.some(p => p.procedureName.toUpperCase().includes('ESCUTA'))) return '04';
                        return '02';
                    })(),
                    localAtendimento: sanitizedData.localAtendimento,
                    weight: sanitizedData.weight,
                    height: sanitizedData.height,
                    // Missing Vitals Fix:
                    pressaoArterialSistolica: sanitizedData.pressaoArterialSistolica,
                    pressaoArterialDiastolica: sanitizedData.pressaoArterialDiastolica,
                    frequenciaCardiaca: sanitizedData.frequenciaCardiaca,
                    frequenciaRespiratoria: sanitizedData.frequenciaRespiratoria,
                    temperatura: sanitizedData.temperatura,
                    saturacaoO2: sanitizedData.saturacaoO2,
                    glicemiaCapilar: sanitizedData.glicemiaCapilar,
                    tipoGlicemiaCapilar: sanitizedData.tipoGlicemiaCapilar,
                    perimetroCefalico: sanitizedData.perimetroCefalico,
                    perimetroPanturrilha: sanitizedData.perimetroPanturrilha,
                    circunferenciaAbdominal: sanitizedData.circunferenciaAbdominal,
                    desfechoVisita: sanitizedData.localAtendimento === '4' ? sanitizedData.desfechoVisita : undefined,
                    motivosVisita: sanitizedData.localAtendimento === '4' ? sanitizedData.motivosVisita : undefined,

                    // Prenatal
                    isPregnant: sanitizedData.isPregnant,
                    dumDaGestante: sanitizedData.isPregnant ? sanitizedData.dumDaGestante : undefined,
                    idadeGestacional: sanitizedData.isPregnant ? sanitizedData.idadeGestacional : undefined,
                    stGravidezPlanejada: sanitizedData.isPregnant ? sanitizedData.stGravidezPlanejada : undefined,
                    nuGestasPrevias: sanitizedData.isPregnant ? sanitizedData.nuGestasPrevias : undefined,
                    nuPartos: sanitizedData.isPregnant ? sanitizedData.nuPartos : undefined,

                    // CDS Fields (Full FAI Content)
                    soaps: ['INDIVIDUAL', 'ODONTO'].includes(activeFicha) ? sanitizedData.soaps : undefined,
                    consultationType: activeFicha === 'ODONTO' ? sanitizedData.consultationType : undefined,
                    oralHealthVigilance: activeFicha === 'ODONTO' ? sanitizedData.oralHealthVigilance : undefined,
                    odontoConduct: activeFicha === 'ODONTO' ? sanitizedData.odontoConduct : undefined,
                    breastfeedingType: activeFicha === 'INDIVIDUAL' ? sanitizedData.breastfeedingType : undefined,
                    medicamentos: ['INDIVIDUAL', 'ODONTO'].includes(activeFicha) ? sanitizedData.medicamentos : undefined,
                    encaminhamentos: ['INDIVIDUAL', 'ODONTO'].includes(activeFicha) ? sanitizedData.encaminhamentos : undefined,
                    resultadosExames: ['INDIVIDUAL', 'ODONTO'].includes(activeFicha) ? sanitizedData.resultadosExames : undefined,
                    ivcf: ['INDIVIDUAL', 'ODONTO'].includes(activeFicha) ? sanitizedData.ivcf : undefined, // Shared Field
                    solicitacoesOci: ['INDIVIDUAL', 'ODONTO'].includes(activeFicha) ? sanitizedData.solicitacoesOci : undefined,
                    nasfs: activeFicha === 'INDIVIDUAL' ? sanitizedData.nasfs : undefined,
                    atencaoDomiciliarModalidade: activeFicha === 'INDIVIDUAL' ? sanitizedData.atencaoDomiciliarModalidade : undefined,
                    racionalidadeSaude: activeFicha === 'INDIVIDUAL' ? sanitizedData.racionalidadeSaude : undefined,
                    vacinaEmDia: activeFicha === 'INDIVIDUAL' ? sanitizedData.vacinaEmDia : undefined,
                    ficouEmObservacao: activeFicha === 'INDIVIDUAL' ? sanitizedData.ficouEmObservacao : undefined,

                    vaccinationData: formData.vaccinationData.imunobiologico ? formData.vaccinationData : undefined,

                }, faiItems));
            }

            // ----------------------------------------------------
            // BATCH 2: FP (Ficha de Procedimentos)
            // ----------------------------------------------------
            if ((activeFicha === 'INDIVIDUAL' || activeFicha === 'PROCEDIMENTOS') && fpProcedures.length > 0) {
                // We have Realized Procedures (Curativo, Sutura, etc).
                // Must generate a CDS 06 (FichaProcedimento).

                savePromises.push(saveSubsedeProduction({
                    unitId: formData.unit,
                    unitName: currentUnit?.name,
                    cbo: formData.cbo,
                    professionalId: user?.professionalId || user?.id || '',
                    professionalName: user?.name || '',
                    entityId: user?.entityId || '',
                    municipalityId: currentUnit?.municipalityId || '',
                    municipalityName: currentUnit?.municipalityName || '',
                    entityType: claims?.entityType || 'PRIVATE',

                    patientId: patientId,
                    patientCns: formData.patientCns, // Optional in FP Child if CPF is present, but good to have
                    patientName: formData.patientName, // Not used in FP Thrift but good for UI
                    patientDob: formData.patientDob,   // Required for FP Child (#4 dtNascimento)
                    patientSex: formData.patientSex,   // Required for FP Child (#5 sexo)
                    patientRace: formData.patientRace,
                    patientNationality: formData.patientNationality,
                    patientPhone: formData.patientPhone,
                    isHomeless: formData.isHomeless,

                    competence: formData.competence,
                    competenceMonth: competenceMonth,
                    attendanceDate: formData.attendanceDate,

                    // ORIGIN: FORCE 'PROCEDIMENTOS'
                    originFicha: 'PROCEDIMENTOS',

                    careContext: isLediTarget ? { level: 'APS', system: 'LEDI' } : undefined,

                    // LEDI Fields (Shared for FP)
                    // #6 localAtendimento
                    localAtendimento: formData.localAtendimento,
                    // #7 turno
                    shift: formData.shift,
                    // #8 statusEscutaInicialOrientacao
                    // Needs logic: Is this an Escuta procedure? Usually no if it's in the list. 
                    // But if Escuta is done, it's boolean.
                    // For now, assume false unless explicit.

                    // SHARED CLINICAL DATA (Valid for FP)
                    // #12 medicoes (Vitals)
                    weight: formData.weight,
                    height: formData.height,
                    // Note: 'medicoes' struct is passed via bpaService -> adapter
                    // Check bpaService mapping for weight/height -> medicoes

                    // #13 ivcf (Shared)
                    ivcf: formData.ivcf,

                    // EXCLUDE FAI SPECIFICS to avoid pollution/errors
                    soaps: undefined,

                    encaminhamentos: undefined,
                    medicamentos: undefined, // FP doesn't take meds list
                    solicitacoesOci: undefined,

                }, fpProcedures));
            }

            await Promise.all(savePromises);
            
            // ---- UX de Sucesso sem perder carrinho ----
            const successMsg = document.createElement('div');
            successMsg.className = 'fixed top-4 right-4 bg-green-50 text-green-700 p-4 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in z-50 border border-green-200';
            successMsg.innerHTML = `
                <div class="bg-green-100 text-green-600 p-1.5 rounded-full">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <div>
                    <h4 class="font-bold text-sm">Tudo Certo!</h4>
                    <p class="text-xs opacity-90">Registros salvos no histórico da Subsede.</p>
                </div>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => {
                successMsg.classList.add('fade-out');
                setTimeout(() => successMsg.remove(), 300);
            }, 5000);

            // Clear ONLY Patient Data
            setFormData(prev => ({
                ...prev,
                patientId: '',
                patientCns: '',
                patientCpf: '',
                patientName: '',
                patientDob: '',
                patientSex: '',
                patientRace: '',
                // Also clear vitals/clinical data to prevent accidental carryover
                weight: '', height: '', pressaoArterialSistolica: '', pressaoArterialDiastolica: '',
                frequenciaCardiaca: '', frequenciaRespiratoria: '', temperatura: '', saturacaoO2: '',
                glicemiaCapilar: '', perimetroCefalico: '', perimetroPanturrilha: '', circunferenciaAbdominal: ''
            }));
            
            setIsReadOnlyPatient(false);
            setPatientFound(false);
            setPatientHealthFlags({});
            setIsHypertensiveOrDiabetic(false);
            
            // Keep on 'form' step, do not go to 'success'
            // setStep('success');

        } catch (err: any) {
            console.error(err);

            setError('Erro ao salvar registros. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep("form");
        setFormData(prev => ({
            ...prev,
            patientId: '',
            patientCns: '',
            patientCpf: '',
            patientName: '',
            patientDob: '',
            patientSex: '',
            patientRace: '',
        }));
        setProcedures([]);
        setShowAddress(false);
        setEditingRecordId(null); // Clear editing state
        setIsReadOnlyPatient(false); // Unlock patient fields
    };

    // We no longer use success step (kept logic above instead)
    if (step === 'success') {
        return null; // unreachable now
    }



    // NOTE: Removed legacy Blocking Render for multi-unit selection, 
    // as it's now handled by the form's Passo 0 selectors.

    // EARLY RETURN: Loading Config (After Unit Selected)
    if (!isConfigLoaded && currentUnit) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <LayoutTemplate className="w-12 h-12 text-gray-300 animate-pulse mb-4" />
                <p className="text-gray-500">Carregando configuração municipal...</p>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto pb-20">
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Registrar Atendimento</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Preencha os dados do atendimento realizado.</p>
                </div>

                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowHistory(true)} 
                    className="flex items-center gap-2"
                >
                    <FileText size={16} /> 
                    Histórico de Lançamentos
                </Button>
            </div>





            {/* CONTENT */}
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">

                {/* CONTENT FORM */}
                <Card className="p-5 border-l-4 border-l-medical-500 overflow-visible">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-medical-500" />
                        Identificação do Estabelecimento
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* NEW: Local de Atendimento Visual Selector - Hidden for ACS & SIMPLIFIED */}
                                {activeFicha !== 'DOMICILIAR' && interfaceType !== 'SIMPLIFIED' && (
                                    <div className="sm:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-2">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-3 flex items-center gap-2">
                                            <MapPin size={18} className="text-medical-600" />
                                            Passo 1: Onde o atendimento foi realizado?
                                        </label>

                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { value: '1', label: 'Na Unidade (UBS)', icon: <Layout size={16} /> },
                                                { value: '4', label: 'No Domicílio', icon: <MapPin size={16} /> },
                                                { value: '2', label: 'Unidade Móvel', icon: <Activity size={16} /> },
                                                { value: '3', label: 'Escola/Creche', icon: <User size={16} /> },
                                                { value: '5', label: 'Outros Locais', icon: <Plus size={16} /> } // Simplified
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, localAtendimento: opt.value })}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                                                        formData.localAtendimento === opt.value
                                                            ? "bg-medical-50 border-medical-500 text-medical-700 shadow-sm ring-1 ring-medical-500"
                                                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                                    )}
                                                >
                                                    {opt.icon}
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Contextual Info Badge */}
                                        <div className="mt-3">
                                            {formData.localAtendimento === '4' && activeFicha === 'INDIVIDUAL' && (
                                                <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 p-2 rounded">
                                                    <CheckCircle size={14} />
                                                    <span>Você está registrando um <strong>Atendimento Individual em Domicílio</strong> (Ficha CDS 03).</span>
                                                </div>
                                            )}
                                            {formData.localAtendimento === '4' && activeFicha === 'DOMICILIAR' && (
                                                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
                                                    <MapPin size={14} />
                                                    <span>Você está registrando uma <strong>Visita Domiciliar ACS/ACE</strong> (Ficha CDS 07).</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                                        {formData.localAtendimento === '1' ? "Unidade de Realização (CNES) *" : "Unidade de Vínculo/Referência *"}
                                    </label>
                                    <div className="relative" ref={formUnitSearchRef}>
                                        <div 
                                            onClick={() => setIsFormUnitSearchOpen(!isFormUnitSearchOpen)}
                                            className={cn(
                                                "flex h-12 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm cursor-pointer focus-within:ring-2 focus-within:ring-medical-500 items-center justify-between group transition-colors",
                                                !selectedUnitId && "text-gray-500 dark:text-gray-400"
                                            )}
                                        >
                                            <div className="flex-1 truncate">
                                                {selectedUnitId 
                                                    ? <span className="text-gray-900 dark:text-white font-medium">{units.find(u => u.id === selectedUnitId)?.name}</span> 
                                                    : <span>Selecione uma Unidade...</span>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {selectedUnitId && (
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => { e.stopPropagation(); setSelectedUnitId(''); setSelectedProfessionalId(''); }}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                                <Search size={16} className="text-gray-400 group-hover:text-medical-500 transition-colors ml-1" />
                                            </div>
                                        </div>
                                        
                                        <AnimatePresence>
                                            {isFormUnitSearchOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                                                >
                                                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                            <input 
                                                                autoFocus
                                                                type="text" 
                                                                placeholder="Buscar unidade por nome..." 
                                                                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-medical-500 focus:bg-white dark:focus:bg-gray-800 rounded-lg outline-none transition-all dark:text-white"
                                                                value={formUnitSearchTerm}
                                                                onChange={(e) => setFormUnitSearchTerm(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                                        {units.filter(u => u.name.toLowerCase().includes(formUnitSearchTerm.toLowerCase())).length === 0 ? (
                                                            <div className="px-3 py-4 text-center text-sm text-gray-500">Nenhuma unidade encontrada</div>
                                                        ) : (
                                                            units.filter(u => u.name.toLowerCase().includes(formUnitSearchTerm.toLowerCase())).map(u => (
                                                                <button
                                                                    key={u.id}
                                                                    type="button"
                                                                    onClick={() => { setSelectedUnitId(u.id); setSelectedProfessionalId(''); setIsFormUnitSearchOpen(false); setFormUnitSearchTerm(''); }}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors flex items-center justify-between group",
                                                                        selectedUnitId === u.id ? "bg-medical-50 text-medical-700 font-medium dark:bg-medical-900/30 dark:text-medical-400" : "hover:bg-gray-50 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50"
                                                                    )}
                                                                >
                                                                    <span>{u.name}</span>
                                                                    {selectedUnitId === u.id && <CheckCircle size={16} className="text-medical-500" />}
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                                        Profissional Realizante *
                                    </label>
                                    <div className="relative" ref={formProfSearchRef}>
                                        <div 
                                            onClick={() => { if (selectedUnitId) setIsFormProfSearchOpen(!isFormProfSearchOpen); }}
                                            className={cn(
                                                "flex h-12 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm items-center justify-between transition-colors",
                                                !selectedUnitId ? "cursor-not-allowed opacity-50" : "cursor-pointer focus-within:ring-2 focus-within:ring-medical-500 group",
                                                !selectedProfessionalId && "text-gray-500 dark:text-gray-400"
                                            )}
                                        >
                                            <div className="flex-1 truncate">
                                                {selectedProfessionalId 
                                                    ? <span className="text-gray-900 dark:text-white font-medium">
                                                        {(() => {
                                                            const [pId, pIdx] = selectedProfessionalId.split('|');
                                                            const p = professionals.find(prof => prof.id === pId);
                                                            const a = p?.assignments?.[Number(pIdx)];
                                                            return p && a ? `${p.name} - ${a.cbo || a.occupation || p.cbo || p.occupation || 'Sem CBO configurado'}` : p?.name ? `${p.name}` : '';
                                                        })()}
                                                      </span> 
                                                    : <span>{!selectedUnitId ? "Selecione a Unidade primeiro..." : "Selecione um Profissional..."}</span>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {selectedProfessionalId && selectedUnitId && (
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => { e.stopPropagation(); setSelectedProfessionalId(''); }}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                                <Search size={16} className={cn("transition-colors ml-1", selectedUnitId ? "text-gray-400 group-hover:text-medical-500" : "text-gray-300")} />
                                            </div>
                                        </div>
                                        
                                        <AnimatePresence>
                                            {isFormProfSearchOpen && selectedUnitId && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                                                >
                                                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                            <input 
                                                                autoFocus
                                                                type="text" 
                                                                placeholder="Buscar profissional por nome..." 
                                                                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-medical-500 focus:bg-white dark:focus:bg-gray-800 rounded-lg outline-none transition-all dark:text-white"
                                                                value={formProfSearchTerm}
                                                                onChange={(e) => setFormProfSearchTerm(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                                        {(() => {
                                                            const filteredOptions = professionals
                                                                .filter(p => p.assignments?.some(a => a.unitId === selectedUnitId))
                                                                .filter(p => p.name.toLowerCase().includes(formProfSearchTerm.toLowerCase()))
                                                                .flatMap(p => {
                                                                    const relevantAssignments = (p.assignments || [])
                                                                        .map((a, idx) => ({ a, idx }))
                                                                        .filter(item => item.a.unitId === selectedUnitId);

                                                                    if (relevantAssignments.length === 0) {
                                                                        const activeCbo = p.cbo || p.occupation || 'Sem CBO configurado';
                                                                        return [{
                                                                            id: `${p.id}|0`,
                                                                            label: `${p.name} - ${activeCbo}`
                                                                        }];
                                                                    }

                                                                    return relevantAssignments.map(({ a, idx }) => ({
                                                                        id: `${p.id}|${idx}`,
                                                                        label: `${p.name} - ${a.cbo || a.occupation || p.cbo || p.occupation || 'Sem CBO configurado'}`
                                                                    }));
                                                                });

                                                            if (filteredOptions.length === 0) {
                                                                return <div className="px-3 py-4 text-center text-sm text-gray-500">Nenhum profissional encontrado</div>;
                                                            }

                                                            return filteredOptions.map(opt => (
                                                                <button
                                                                    key={opt.id}
                                                                    type="button"
                                                                    onClick={() => { setSelectedProfessionalId(opt.id); setIsFormProfSearchOpen(false); setFormProfSearchTerm(''); }}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors flex items-center justify-between group",
                                                                        selectedProfessionalId === opt.id ? "bg-medical-50 text-medical-700 font-medium dark:bg-medical-900/30 dark:text-medical-400" : "hover:bg-gray-50 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50"
                                                                    )}
                                                                >
                                                                    <span>{opt.label}</span>
                                                                    {selectedProfessionalId === opt.id && <CheckCircle size={16} className="text-medical-500" />}
                                                                </button>
                                                            ));
                                                        })()}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* SEÇÃO 1.1: DADOS GERAIS DO ATENDIMENTO (DATA, TURNO, COMPETÊNCIA) */}
                        <Card className="p-5 border-l-4 border-l-blue-500">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <Calendar size={20} className="text-blue-500" />
                                Detalhes Atendimento
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div className="sm:col-span-2">
                                    {interfaceType !== 'SIMPLIFIED' ? (
                                        <>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 block mb-1.5">Tipo de Atendimento</label>
                                            <select
                                                className="flex h-12 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-500 dark:text-gray-100"
                                                value={formData.tipoAtendimento || ''}
                                                onChange={e => setFormData({ ...formData, tipoAtendimento: e.target.value })}
                                            >
                                                <option value="">Selecione...</option>
                                                {/* FAI Options (Standard) - When Local is NOT Domicilio (4) */}
                                                {formData.localAtendimento !== '4' && (
                                                    <>
                                                        <option value="1" title="São consultas que constituem ações programáticas individuais, direcionadas para os ciclos de vida, doenças e agravos prioritários, as quais necessitam de acompanhamento contínuo.">1 - CONSULTA AGENDADA PROGRAMADA / CUIDADO CONTINUADO</option>
                                                        <option value="2" title="É toda consulta realizada com agendamento prévio. É oriunda da demanda espontânea ou por agendamento direto na recepção, de caráter não urgente.">2 - CONSULTA AGENDADA</option>
                                                        <option value="4" title="Refere-se à escuta realizada por profissional de nível superior no momento em que o usuário chega ao serviço de saúde.">4 - ESCUTA INICIAL / ORIENTAÇÃO</option>
                                                        <option value="5" title="É a consulta que é realizada no mesmo dia em que o usuário busca o serviço, de caráter não urgente, ou por encaixe/disponibilidade.">5 - CONSULTA NO DIA</option>
                                                        <option value="6" title="Atendimento realizado quando há risco de vida ou necessidade de assistência imediata.">6 - ATENDIMENTO DE URGÊNCIA</option>
                                                    </>
                                                )}

                                                {/* FAD Options (Home Care) - When Local IS Domicilio (4) */}
                                                {formData.localAtendimento === '4' && (
                                                    <>
                                                        <option value="7" title="Atendimento programado de Atenção Domiciliar.">7 - ATENDIMENTO PROGRAMADO</option>
                                                        <option value="8" title="Atendimento não programado de Atenção Domiciliar.">8 - ATENDIMENTO NÃO PROGRAMADO</option>
                                                        <option value="9" title="Visita domiciliar realizada após o falecimento do paciente.">9 - VISITA DOMICILIAR PÓS-ÓBITO</option>
                                                    </>
                                                )}
                                            </select>
                                        </>
                                    ) : (
                                        // Simplified Mode: Just a readonly info or hidden
                                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700">
                                            <span className="text-xs text-gray-500 block">Modo Simplificado</span>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Produção BPA Simplificada</span>
                                        </div>
                                    )}
                                </div>
                                <Select
                                    label="Competência"
                                    value={formData.competence}
                                    onChange={e => setFormData({ ...formData, competence: e.target.value })}
                                    options={availableCompetences.map(c => ({ value: c.competence, label: c.label }))}
                                />
                                <Input
                                    label="Data Atend."
                                    type="date"
                                    value={formData.attendanceDate}
                                    onChange={e => setFormData({ ...formData, attendanceDate: e.target.value })}
                                />
                                {/* Show Shift/Weight/Height here generally? User said: "Data Atend., Turno" below Establishment. 
                            Weight/Height are Anthro, usually in Form. 
                            But "Procedimentos" section had them. 
                            If FAI, Anthro handles Weight/Height. 
                            If Procedure Ficha? Maybe needed. 
                            Let's keep Weight/Height available but conditionally.
                        */}
                                {isLediTarget && activeFicha !== 'INDIVIDUAL' && activeFicha !== 'DOMICILIAR' && (
                                    <>
                                        <Select
                                            label="Turno"
                                            value={formData.shift}
                                            onChange={e => setFormData({ ...formData, shift: e.target.value })}
                                            options={[
                                                { value: 'M', label: 'Manhã' },
                                                { value: 'T', label: 'Tarde' },
                                                { value: 'N', label: 'Noite' }
                                            ]}
                                        />
                                        {/* For pure Procedure Ficha, Weight/Height might be needed? Usually not mandatory but let's keep logic */}
                                        <Input
                                            label="Peso (kg)"
                                            type="number"
                                            placeholder="00.0"
                                            value={formData.weight}
                                            onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                        />
                                        <Input
                                            label="Altura (cm)"
                                            type="number"
                                            placeholder="000"
                                            value={formData.height}
                                            onChange={e => setFormData({ ...formData, height: e.target.value })}
                                        />
                                    </>
                                )}
                                {isLediTarget && (activeFicha === 'INDIVIDUAL' || activeFicha === 'DOMICILIAR') && (
                                    <Select
                                        label="Turno"
                                        value={formData.shift}
                                        onChange={e => setFormData({ ...formData, shift: e.target.value })}
                                        options={[
                                            { value: 'M', label: 'Manhã' },
                                            { value: 'T', label: 'Tarde' },
                                            { value: 'N', label: 'Noite' }
                                        ]}
                                    />
                                )}
                            </div>
                        </Card>

                        {/* SEÇÃO 2: IDENTIFICAÇÃO DO PACIENTE */}

                        {/* SEÇÃO 2: IDENTIFICAÇÃO DO PACIENTE */}
                        {activeFicha !== 'COLETIVA' && (
                            <Card className="p-5 border-l-4 border-l-indigo-500">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                        <UserCheck size={20} className="text-indigo-500" />
                                        Identificação do Paciente
                                        {patientFound && (
                                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1 animate-fade-in">
                                                <CheckCircle size={12} />
                                                Encontrado
                                            </span>
                                        )}
                                        {patientHealthFlags.isHypertension && (
                                            <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold border border-red-200">
                                                HIPERTENSO
                                            </span>
                                        )}
                                        {patientHealthFlags.isDiabetes && (
                                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold border border-orange-200">
                                                DIABÉTICO
                                            </span>
                                        )}
                                    </h3>
                                    <div className="flex gap-2">
                                        {patientFound && isReadOnlyPatient && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsReadOnlyPatient(false)}
                                                className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                            >
                                                <Unlock size={16} />
                                                Editar
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Content omitted for brevity in replace tool, effectively wrapping strict content */}
                                {/* Wait, I cannot omit content in replace_file_content if I want to keep it. I must include it or use start/end carefully. */}
                                {/* Since the block is huge, I will use multiple simpler edits or just wrap the top and bottom. */}
                                <div className="space-y-4">
                                    {/* Linha 1: CNS, CPF e Nome */}
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                        <div className="sm:col-span-1 relative">
                                            <Input
                                                label="CNS"
                                                placeholder="000 0000 0000 0000"
                                                value={formData.patientCns}
                                                onChange={e => {
                                                    let v = e.target.value.replace(/\D/g, '').slice(0, 15);
                                                    v = v.replace(/^(\d{3})(\d)/, '$1 $2').replace(/^(\d{3})\s(\d{4})(\d)/, '$1 $2 $3').replace(/^(\d{3})\s(\d{4})\s(\d{4})(\d)/, '$1 $2 $3 $4');
                                                    setFormData({ ...formData, patientCns: v });
                                                    setPatientFound(false);
                                                    if (v === '') {
                                                        setPatientSuggestions([]);
                                                        setShowPatientSuggestions(null);
                                                    }
                                                }}
                                            />
                                            {showPatientSuggestions === 'cns' && patientSuggestions.length > 0 && (
                                                <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                                                    {patientSuggestions.map(patient => (
                                                        <div
                                                            key={patient.id}
                                                            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm border-b last:border-0 border-gray-100 dark:border-gray-700"
                                                            onClick={() => handleSelectPatient(patient)}
                                                        >
                                                            <div className="font-bold text-gray-800 dark:text-white">{patient.cns}</div>
                                                            <div className="text-xs text-gray-500">{patient.patientName || patient.name}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="sm:col-span-1 relative">
                                            <Input
                                                label="CPF"
                                                placeholder="000.000.000-00"
                                                value={formData.patientCpf}
                                                onChange={e => {
                                                    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                                                    v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                                    setFormData({ ...formData, patientCpf: v });
                                                    setPatientFound(false);
                                                    if (v === '') {
                                                        setPatientSuggestions([]);
                                                        setShowPatientSuggestions(null);
                                                    }
                                                }}
                                            />
                                            {showPatientSuggestions === 'cpf' && patientSuggestions.length > 0 && (
                                                <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                                                    {patientSuggestions.map(patient => (
                                                        <div
                                                            key={patient.id}
                                                            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm border-b last:border-0 border-gray-100 dark:border-gray-700"
                                                            onClick={() => handleSelectPatient(patient)}
                                                        >
                                                            <div className="font-bold text-gray-800 dark:text-white">{patient.cpf}</div>
                                                            <div className="text-xs text-gray-500">{patient.patientName || patient.name}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="sm:col-span-2 relative">
                                            <Input
                                                label="Nome Completo"
                                                placeholder="Nome do paciente"
                                                value={formData.patientName}
                                                onChange={e => {
                                                    setFormData({ ...formData, patientName: e.target.value.toUpperCase() });
                                                    setPatientFound(false);
                                                    if (e.target.value === '') {
                                                        setPatientSuggestions([]);
                                                        setShowPatientSuggestions(null);
                                                    }
                                                }}
                                                readOnly={isReadOnlyPatient}
                                                className={isReadOnlyPatient ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}
                                            />
                                            {showPatientSuggestions === 'name' && patientSuggestions.length > 0 && (
                                                <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                                                    {patientSuggestions.map(patient => (
                                                        <div
                                                            key={patient.id}
                                                            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm border-b last:border-0 border-gray-100 dark:border-gray-700"
                                                            onClick={() => handleSelectPatient(patient)}
                                                        >
                                                            <div className="font-bold text-gray-800 dark:text-white">{patient.patientName || patient.name}</div>
                                                            <div className="text-xs text-gray-500">CNS: {patient.cns || 'Não info.'} | CPF: {patient.cpf || 'Não info.'}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Linha 2: Dados Demográficos */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <div className="col-span-1">
                                            <Input
                                                label="Data Nasc."
                                                type="date"
                                                value={formData.patientDob}
                                                onChange={e => setFormData({ ...formData, patientDob: e.target.value })}
                                                readOnly={isReadOnlyPatient}
                                                className={isReadOnlyPatient ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Input
                                                label="Idade"
                                                type="number"
                                                value={formData.patientAge}
                                                onChange={e => setFormData({ ...formData, patientAge: e.target.value })}
                                                readOnly={!!formData.patientDob || isReadOnlyPatient}
                                                className={!!formData.patientDob || isReadOnlyPatient ? "bg-gray-50 dark:bg-gray-700 cursor-not-allowed" : ""}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Select
                                                label="Sexo"
                                                value={formData.patientSex}
                                                onChange={e => setFormData({ ...formData, patientSex: e.target.value })}
                                                options={[{ value: '', label: 'Selecione' }, ...LISTA_SEXO]}
                                                disabled={isReadOnlyPatient}
                                            />
                                        </div>
                                    </div>

                                    {/* PRE-NATAL SECTION */}
                                    {isLediTarget && isPrenatalEligible && (
                                        <div className="mt-4 p-4 bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-800 rounded-lg">
                                            <div className="flex items-center gap-2 mb-3">
                                                <input
                                                    type="checkbox"
                                                    id="chkPregnant"
                                                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                                                    checked={formData.isPregnant}
                                                    onChange={e => setFormData({ ...formData, isPregnant: e.target.checked })}
                                                />
                                                <label htmlFor="chkPregnant" className="font-bold text-gray-700 dark:text-gray-300">
                                                    Paciente é Gestante
                                                </label>
                                            </div>

                                            {formData.isPregnant && (
                                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                                                    <Input
                                                        label="DUM (Data Última Menst.)"
                                                        type="date"
                                                        value={formData.dumDaGestante}
                                                        onChange={e => setFormData({ ...formData, dumDaGestante: e.target.value })}
                                                    />
                                                    <Input
                                                        label="Idade Gestacional (Semanas)"
                                                        type="number"
                                                        value={formData.idadeGestacional}
                                                        readOnly // Computed ideally
                                                        onChange={e => setFormData({ ...formData, idadeGestacional: e.target.value })}
                                                    />
                                                    <div className="flex flex-col justify-end pb-2">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded text-pink-600 focus:ring-pink-500"
                                                                checked={formData.stGravidezPlanejada}
                                                                onChange={e => setFormData({ ...formData, stGravidezPlanejada: e.target.checked })}
                                                            />
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">Gravidez Planejada?</span>
                                                        </label>
                                                    </div>
                                                    <Input
                                                        label="Núm. Partos Prévios"
                                                        type="number"
                                                        value={formData.nuPartos}
                                                        onChange={e => setFormData({ ...formData, nuPartos: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Removed Address/Homeless fields per user request */}
                                </div>
                            </Card>
                        )}

                        {/* FICHA HUB TOOLBAR - Hidden in Simplified Mode */}
                        {interfaceType !== 'SIMPLIFIED' && (
                            <div className="mb-6 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
                                <div className="flex gap-2 min-w-max">
                                    {allowedFichas.includes('INDIVIDUAL') && (
                                        <FichaButton
                                            active={activeFicha === 'INDIVIDUAL'}
                                            onClick={() => handleFichaChange('INDIVIDUAL')}
                                            icon={<Stethoscope size={20} />}
                                            title="Atendimento"
                                            subtitle="Médico/Enf"
                                            color="blue"
                                        />
                                    )}

                                    {allowedFichas.includes('ODONTO') && (
                                        <FichaButton
                                            active={activeFicha === 'ODONTO'}
                                            onClick={() => handleFichaChange('ODONTO')}
                                            icon={<Hammer size={20} />}
                                            title="Odontologia"
                                            subtitle="Dentista/TSB"
                                            color="teal"
                                        />
                                    )}

                                    {allowedFichas.includes('PROCEDIMENTOS') && (
                                        <FichaButton
                                            active={activeFicha === 'PROCEDIMENTOS'}
                                            onClick={() => handleFichaChange('PROCEDIMENTOS')}
                                            icon={<ClipboardList size={20} />}
                                            title="Procedimentos"
                                            subtitle="Técnicos/Geral"
                                            color="gray"
                                        />
                                    )}

                                    {allowedFichas.includes('VACINACAO') && (
                                        <FichaButton
                                            active={activeFicha === 'VACINACAO'}
                                            onClick={() => handleFichaChange('VACINACAO')}
                                            icon={<Syringe size={20} />}
                                            title="Vacinação"
                                            subtitle="Imunização"
                                            color="purple"
                                        />
                                    )}

                                    {allowedFichas.includes('DOMICILIAR') && (
                                        <FichaButton
                                            active={activeFicha === 'DOMICILIAR'}
                                            onClick={() => handleFichaChange('DOMICILIAR')}
                                            icon={<MapPin size={20} />}
                                            title="Visita Domiciliar"
                                            subtitle="ACS/Território"
                                            color="amber"
                                        />
                                    )}

                                </div>
                            </div>
                        )}

                        {/* Render Active Ficha Form */}
                        {activeFicha === 'INDIVIDUAL' && (
                            formData.localAtendimento === '4' ? (
                                <CdsDomiciliarForm
                                    data={formData as any}
                                    onChange={(d) => setFormData(prev => ({ ...prev, ...d }))}
                                />
                            ) : (
                                <CdsIndividualForm
                                    data={formData as any}
                                    onChange={(d) => setFormData(prev => ({ ...prev, ...d }))}
                                    procedures={procedures}
                                    onUpdateProcedure={handleUpdateProcedure}
                                    onRemoveProcedure={handleRemoveProcedure}
                                    onOpenSigtap={handleOpenSigtap}
                                    onToggleExpand={handleToggleExpand}
                                    onAddProcedure={handleAddProcedure}
                                    userCbo={formData.cbo}
                                    competence={formData.competence}
                                    isHypertensiveOrDiabetic={isHypertensiveOrDiabetic}
                                    pendingExams={pendingExams}
                                />
                            )
                        )}

                        {activeFicha === 'ODONTO' && (
                            <CdsOdontoForm
                                data={formData as any}
                                onChange={(d) => setFormData(prev => ({ ...prev, ...d }))}
                            />
                        )}

                        {activeFicha === 'VACINACAO' && (
                            <CdsVaccinationForm
                                data={formData as any}
                                onChange={(d) => setFormData(prev => ({ ...prev, ...d }))}
                            />
                        )}

                        {/* FICHA DE VISITA DOMICILIAR (ACS/ACE) - Custom Layout */}
                        {activeFicha === 'DOMICILIAR' && (
                            <div className="space-y-6">
                                <Card className="p-5 border-l-4 border-l-amber-500">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                        <MapPin size={20} className="text-amber-500" />
                                        Detalhes da Visita Domiciliar
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Select
                                            label="Desfecho da Visita"
                                            value={formData.desfechoVisita || ''}
                                            onChange={e => setFormData({ ...formData, desfechoVisita: e.target.value })}
                                            options={[
                                                { value: '1', label: 'Realizada' },
                                                { value: '2', label: 'Recusada' },
                                                { value: '3', label: 'Ausente' }
                                            ]}
                                        />

                                        <div className="sm:col-span-2">
                                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                                                Motivos da Visita
                                            </label>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {[
                                                    { code: '01', label: 'Cadastramento/Atualização' },
                                                    { code: '02', label: 'Visita Periódica' },
                                                    { code: '03', label: 'Busca Ativa' },
                                                    { code: '04', label: 'Egresso de Internação' },
                                                    { code: '05', label: 'Convite Ativ. Coletiva' },
                                                    { code: '06', label: 'Orientação/Prevenção' },
                                                    { code: '07', label: 'Outros' }
                                                ].map(m => (
                                                    <label key={m.code} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${(formData.motivosVisita || []).includes(m.code)
                                                        ? 'bg-amber-50 border-amber-300 dark:bg-amber-900/20'
                                                        : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700'
                                                        }`}>
                                                        <input
                                                            type="checkbox"
                                                            value={m.code}
                                                            checked={(formData.motivosVisita || []).includes(m.code)}
                                                            onChange={e => {
                                                                const current = formData.motivosVisita || [];
                                                                const newSelected = e.target.checked
                                                                    ? [...current, m.code]
                                                                    : current.filter(c => c !== m.code);
                                                                setFormData({ ...formData, motivosVisita: newSelected });
                                                            }}
                                                            className="rounded text-amber-600 focus:ring-amber-500"
                                                        />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">{m.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Anthropometry for Visits (Optional but useful) */}
                                        <div className="sm:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700 mt-2">
                                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Antropometria (Opcional)</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <Input
                                                    label="Peso (kg)"
                                                    type="number"
                                                    value={formData.weight}
                                                    onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                                />
                                                <Input
                                                    label="Altura (cm)"
                                                    type="number"
                                                    value={formData.height}
                                                    onChange={e => setFormData({ ...formData, height: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* SEÇÃO 3: PROCEDIMENTOS REALIZADOS (Hidden for DOMICILIAR & COLETIVA & VACINACAO & INDIVIDUAL) */}
                        {activeFicha !== 'DOMICILIAR' && activeFicha !== 'COLETIVA' && activeFicha !== 'VACINACAO' && activeFicha !== 'INDIVIDUAL' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                        <FileText size={20} className="text-green-500" />
                                        Procedimentos Realizados
                                    </h3>
                                </div>

                                {/* Competência e Data (MOVED TO TOP) */}
                                <div className="hidden">
                                    {/* Placeholder to ensure we removed the old block correctly. 
                                In real replacement, we remove the whole Card content. 
                            */}
                                </div>

                                {/* Lista de Procedimentos */}
                                <div className="space-y-4">
                                    {/* 
                                      NOTA DE ARQUITETURA: 
                                      Passamos formData.cbo (que para a Subsede é sempre vazio '') intencionalmente para o userCbo. 
                                      Isso instrui o ProcedureSection e o sigtapService a INATIVAR o bloqueio de CBO incompatível.
                                      O usuário operador da Subsede tem poder de super-usuário para lançar qualquer procedimento 
                                      em nome daquele profissional, diferentemente da tela Register.tsx (Produção Padrão).
                                    */}
                                    <ProcedureSection
                                        procedures={procedures}
                                        competence={formData.competence}
                                        onUpdate={handleUpdateProcedure}
                                        onRemove={handleRemoveProcedure}
                                        onOpenSigtap={handleOpenSigtap}
                                        onToggleExpand={handleToggleExpand}
                                        onAdd={handleAddProcedure}
                                        userCbo={formData.cbo}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Feedback de Erro */}
                        {
                            error && (
                                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )
                        }

                        {/* Botão de Ação */}
                        <div className="pb-4 relative group">
                            {(activeFicha !== 'DOMICILIAR' && activeFicha !== 'COLETIVA' && activeFicha !== 'VACINACAO' && activeFicha !== 'INDIVIDUAL') && procedures.filter(p => !!p.procedureCode).length === 0 && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-max max-w-[90vw] text-center bg-gray-900 dark:bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 flex items-center gap-1.5 shadow-lg border border-gray-700">
                                    <AlertCircle size={14} className="text-red-400" />
                                    <span>Adicione procedimentos à lista para habilitar o registro.</span>
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45 border-r border-b border-gray-700"></div>
                                </div>
                            )}
                            <Button 
                                type="submit" 
                                className="w-full h-14 text-lg bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 border-none disabled:bg-gray-400 disabled:text-gray-200 disabled:shadow-none" 
                                isLoading={loading}
                                disabled={activeFicha !== 'DOMICILIAR' && activeFicha !== 'COLETIVA' && activeFicha !== 'VACINACAO' && activeFicha !== 'INDIVIDUAL' ? procedures.filter(p => !!p.procedureCode).length === 0 : false}
                            >
                                {(() => {
                                    const suffix = isLediTarget ? '(e-SUS/PEC)' : '(BPA)';
                                    switch (activeFicha) {
                                        case 'DOMICILIAR': return `Registrar Visita Domiciliar ${suffix}`;
                                        case 'COLETIVA': return `Registrar Atividade Coletiva ${suffix}`;
                                        case 'ODONTO': return `Registrar Atend. Odontológico ${suffix}`;
                                        case 'VACINACAO': return `Registrar Vacinação ${suffix}`;
                                        case 'INDIVIDUAL': return `Registrar Atendimento Individual ${suffix}`;
                                        default: return `Registrar Procedimentos ${suffix}`;
                                    }
                                })()}
                            </Button>
                        </div>
            </form>

            {/* NOVO: Modal do Histórico de Subsede */}
            <AnimatePresence>
                {showHistory && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm md:p-6 lg:p-10">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/80">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                            Histórico de Lançamentos
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            Consulta e gerenciamento de produção operada pela Subsede
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowHistory(false)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 rounded-full transition-colors group">
                                    <X size={20} className="group-hover:scale-110 transition-transform" />
                                </button>
                            </div>

                            {/* Modal Tabs */}
                            <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 pt-2 gap-8 bg-white dark:bg-gray-900">
                                <button
                                    type="button"
                                    onClick={() => setHistoryActiveTab('meus')}
                                    className={cn(
                                        "py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 relative",
                                        historyActiveTab === 'meus'
                                            ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                                            : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                                    )}
                                >
                                    <User size={16} /> Meus Lançamentos (Subsede)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHistoryActiveTab('equipe')}
                                    className={cn(
                                        "py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2",
                                        historyActiveTab === 'equipe'
                                            ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                                            : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                                    )}
                                >
                                    <UserCheck size={16} /> Procedimentos da Equipe
                                </button>
                            </div>

                            {/* Modal Filters */}
                            <div className="p-5 bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Unidade</label>
                                    <Select
                                        value={historyFilterUnitId}
                                        onChange={(e) => setHistoryFilterUnitId(e.target.value)}
                                        className="h-10 text-sm bg-white dark:bg-gray-900 shadow-sm"
                                        options={[
                                            { value: '', label: 'Todas as Unidades' },
                                            ...units.map(u => ({ value: u.id, label: `${u.cnes} - ${u.name}` }))
                                        ]}
                                    />
                                </div>
                                <div className="relative" ref={profSearchRef}>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Profissional</label>
                                    <div 
                                        onClick={() => setIsProfSearchOpen(!isProfSearchOpen)}
                                        className="flex h-10 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm cursor-pointer focus-within:ring-2 focus-within:ring-medical-500 items-center justify-between group transition-colors"
                                    >
                                        <div className="flex-1 truncate">
                                            {historyFilterProfessionalId 
                                                ? <span className="text-gray-900 dark:text-white font-medium">{professionals.find(p => p.id === historyFilterProfessionalId)?.name}</span> 
                                                : <span className="text-gray-400">Todos os Profissionais</span>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {historyFilterProfessionalId && (
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => { e.stopPropagation(); setHistoryFilterProfessionalId(''); }}
                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                            <Search size={16} className="text-gray-400 group-hover:text-medical-500 transition-colors ml-1" />
                                        </div>
                                    </div>
                                    
                                    <AnimatePresence>
                                        {isProfSearchOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                                            >
                                                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                        <input 
                                                            autoFocus
                                                            type="text" 
                                                            placeholder="Buscar por nome..." 
                                                            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-medical-500 focus:bg-white dark:focus:bg-gray-800 rounded-lg outline-none transition-all dark:text-white"
                                                            value={profSearchTerm}
                                                            onChange={(e) => setProfSearchTerm(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setHistoryFilterProfessionalId(''); setIsProfSearchOpen(false); }}
                                                        className={cn(
                                                            "w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors flex items-center justify-between group",
                                                            !historyFilterProfessionalId ? "bg-medical-50 text-medical-700 font-medium dark:bg-medical-900/30 dark:text-medical-400" : "hover:bg-gray-50 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50"
                                                        )}
                                                    >
                                                        <span>Todos os Profissionais</span>
                                                        {!historyFilterProfessionalId && <CheckCircle className="w-4 h-4 text-medical-500" />}
                                                    </button>
                                                    {professionals
                                                        .filter(p => !profSearchTerm || p.name.toLowerCase().includes(profSearchTerm.toLowerCase()))
                                                        .map(p => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => { setHistoryFilterProfessionalId(p.id!); setIsProfSearchOpen(false); setProfSearchTerm(''); }}
                                                                className={cn(
                                                                    "w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors flex items-center justify-between group",
                                                                    historyFilterProfessionalId === p.id ? "bg-medical-50 text-medical-700 font-medium dark:bg-medical-900/30 dark:text-medical-400" : "hover:bg-gray-50 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50"
                                                                )}
                                                            >
                                                                <span>{p.name}</span>
                                                                {historyFilterProfessionalId === p.id && <CheckCircle className="w-4 h-4 text-medical-500" />}
                                                            </button>
                                                        ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Competência</label>
                                    <Select
                                        value={historyFilterCompetence}
                                        onChange={(e) => setHistoryFilterCompetence(e.target.value)}
                                        className="h-10 text-sm bg-white dark:bg-gray-900 shadow-sm font-medium"
                                        options={availableCompetences.map(c => ({
                                            value: c.competence,
                                            label: `${c.competence.slice(4,6)}/${c.competence.slice(0,4)}`
                                        }))}
                                    />
                                </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="relative">
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Buscar Paciente</label>
                                        <div className="flex h-10 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm focus-within:ring-2 focus-within:ring-blue-500 items-center justify-between">
                                            <input
                                                type="text"
                                                className="w-full bg-transparent outline-none truncate pr-2 dark:text-gray-100 placeholder-gray-400"
                                                placeholder="Nome, CPF ou CNS..."
                                                value={historyFilterPatientTerm}
                                                onChange={(e) => setHistoryFilterPatientTerm(e.target.value)}
                                            />
                                            {historyFilterPatientTerm && (
                                              <button 
                                                  type="button" 
                                                  className="hover:bg-gray-100 dark:hover:bg-gray-700 p-0.5 rounded-full z-10 text-gray-500"
                                                  onClick={() => setHistoryFilterPatientTerm('')}
                                              >
                                                  <X size={14} />
                                              </button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Data Específica</label>
                                        <div className="flex h-10 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm focus-within:ring-2 focus-within:ring-blue-500 items-center justify-between">
                                          <input
                                              type="date"
                                              className="w-full bg-transparent outline-none truncate pr-2 dark:text-gray-100 text-gray-700 placeholder-gray-400"
                                              value={historyFilterDate}
                                              onChange={(e) => setHistoryFilterDate(e.target.value)}
                                          />
                                          {historyFilterDate && (
                                              <button 
                                                  type="button" 
                                                  className="hover:bg-gray-100 dark:hover:bg-gray-700 p-0.5 rounded-full z-10 text-gray-500 ml-2"
                                                  onClick={() => setHistoryFilterDate('')}
                                              >
                                                  <X size={14} />
                                              </button>
                                          )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Body / Table */}
                            <div className="flex-1 overflow-auto p-0 bg-white dark:bg-gray-900 relative min-h-[300px]">
                                {loadingHistory ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-20">
                                        <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-lg mb-4">
                                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-300 font-medium tracking-wide">Buscando lançamentos...</p>
                                    </div>
                                ) : filteredHistoryRecords.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                                        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/80 rounded-full flex items-center justify-center mb-5 shadow-inner">
                                            <Search className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Nenhum registro encontrado</h3>
                                        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                                            Não existem registros para a combinação de filtros selecionada ou a aba de visualização atual.
                                        </p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 dark:bg-gray-800/80 sticky top-0 z-10 backdrop-blur-md">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Data</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Profissional / Paciente</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Procedimento</th>
                                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Qtd</th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                            {groupedHistoryRecords.map((group, index) => {
                                                const record = group[0];
                                                const groupKey = `${record.docId}_${index}`;
                                                
                                                const activeItems = group.filter(item => item.status !== 'canceled');
                                                const canceledItems = group.filter(item => item.status === 'canceled');
                                                const activeQtd = activeItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
                                                const canceledQtd = canceledItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
                                                const totalQtd = activeQtd + canceledQtd;
                                                const allCanceled = activeItems.length === 0 && canceledItems.length > 0;

                                                const isExpanded = expandedGroups.has(groupKey);

                                                return (
                                                    <React.Fragment key={groupKey}>
                                                    <tr 
                                                        onClick={() => toggleGroupExpand(groupKey)}
                                                        className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group cursor-pointer ${allCanceled ? 'opacity-50 grayscale bg-gray-50/50' : ''} ${isExpanded ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}
                                                    >
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <span>{record.attendanceDate ? record.attendanceDate.split('-').reverse().join('/') : '-'}</span>
                                                                {allCanceled && <Badge type="error" className="py-0.5 px-1.5 text-[10px] bg-red-100 text-red-700">Cancelado</Badge>}
                                                            </div>
                                                            <div className="text-[11px] text-gray-400 flex items-center gap-1 font-normal">
                                                                Inserido em {record.createdAt?.toDate ? record.createdAt.toDate().toLocaleDateString('pt-BR') : '-'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                        <div className="flex items-center gap-1.5 mb-1" title={record.professionalName}>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                                                            <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[250px]">
                                                                {record.professionalName || 'Não Informado'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 group/patient" title={record.patientName}>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                                                            <span className="text-gray-600 dark:text-gray-400 truncate max-w-[220px]">
                                                                {record.patientName || 'Não Informado'}
                                                            </span>
                                                            {allCanceled && <span className="ml-2 text-[10px] text-red-500 font-bold flex-shrink-0">(Excluído)</span>}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 mt-1 font-mono ml-4 flex items-center gap-1">
                                                            {(() => {
                                                                const patientCns = record.patientCns?.trim();
                                                                const patientCpf = record.patientCpf?.trim();
                                                                
                                                                if (patientCns && patientCns.length > 5) {
                                                                    return <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 font-mono py-0 text-[10px] px-1.5 font-bold tracking-tight">CNS {patientCns}</Badge>;
                                                                }
                                                                if (patientCpf && patientCpf.length > 5) {
                                                                    return <Badge className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 border border-amber-200 dark:border-amber-800 font-mono py-0 text-[10px] px-1.5 font-bold tracking-tight">CPF {patientCpf}</Badge>;
                                                                }
                                                                return <span className="text-[9px] text-gray-400 italic">Sem Documento</span>;
                                                            })()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[280px]">
                                                            {group.length > 1 ? `${activeItems.length > 0 ? activeItems.length : group.length} procedimento(s) ativo(s)` : (record.procedureName || 'Procedimento Sigtap')}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {group.slice(0, 3).map((gRec, idx) => (
                                                                <Badge key={idx} type="neutral" className={`font-mono px-1.5 py-0.5 text-[11px] font-bold ${gRec.status === 'canceled' ? 'bg-gray-50 text-gray-400 border-gray-100 line-through' : 'bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700'}`}>
                                                                    {gRec.procedureCode}
                                                                </Badge>
                                                            ))}
                                                            {group.length > 3 && <Badge type="neutral" className="font-mono bg-gray-100 text-[10px] border-none text-gray-500">+ {group.length - 3}</Badge>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-black text-gray-900 dark:text-white">
                                                        {totalQtd}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        {historyActiveTab === 'meus' ? (
                                                            <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    disabled={allCanceled}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const mappedRecords = group.map(r => ({
                                                                            id: r.docId,
                                                                            date: r.attendanceDate || '',
                                                                            procedure: { code: r.procedureCode, name: r.procedureName, type: r.attendanceType || 'BPA-I' },
                                                                            quantity: Number(r.quantity) || 1,
                                                                            unitId: r.unitId,
                                                                            patientCns: r.patientCns,
                                                                            patientCpf: r.patientCpf,
                                                                            patientName: r.patientName,
                                                                            cidCodes: r.cidCodes || (r.cid ? [r.cid] : []),
                                                                            status: r.status,
                                                                            observations: r.obs || r.observations,
                                                                            firestorePath: r.firestorePath,
                                                                            _rawRecord: r
                                                                        }));
                                                                        setEditingAttendanceGroup(mappedRecords);
                                                                    }}
                                                                    className={`px-3 py-1.5 text-[11px] ${allCanceled ? 'text-gray-400 border-gray-200 cursor-not-allowed bg-gray-50 dark:bg-gray-800 hidden' : 'text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'}`}
                                                                >
                                                                    <Edit2 size={13} className="mr-1.5" /> {group.length > 1 ? 'Editar Atendimento' : 'Editar'}
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    disabled={allCanceled}
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group); }}
                                                                    className={`px-3 py-1.5 text-[11px] ${allCanceled ? 'text-gray-400 border-gray-200 cursor-not-allowed hidden' : 'text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300'}`}
                                                                >
                                                                    <Trash2 size={13} className="mr-1.5" /> Excluir
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-end pr-2">
                                                                <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-none font-normal">
                                                                    <Info size={12} className="mr-1" /> Permissão de Leitura
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr className="bg-blue-50/10 dark:bg-blue-900/5">
                                                            <td colSpan={5} className="px-6 py-4">
                                                                <div className="bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-900/40 rounded-lg p-4 shadow-sm">
                                                                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 ml-2 flex items-center justify-between">
                                                                        <span>Procedimentos do Atendimento</span>
                                                                        <span className="text-xs text-gray-400 font-normal">{group.length} item(ns)</span>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        {group.map((gRec, idx) => (
                                                                            <div key={idx} className="flex items-center justify-between text-sm py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                                                                <div className="flex items-center gap-3 max-w-[80%]">
                                                                                     <Badge type={gRec.status === 'canceled' ? 'error' : 'neutral'} className={`font-mono px-2 py-0.5 shadow-sm ${gRec.status === 'canceled' ? 'bg-red-50 text-red-600 line-through opacity-70 border-red-200' : 'bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700'}`}>
                                                                                        {gRec.procedureCode}
                                                                                     </Badge>
                                                                                     <span className={`font-medium truncate ${gRec.status === 'canceled' ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                                        {gRec.procedureName || 'Procedimento sem nome'}
                                                                                        {gRec.cidCodes && gRec.cidCodes.length > 0 && <span className="ml-2 text-xs bg-orange-50 text-orange-600 font-mono px-1 rounded-sm border border-orange-100">CID: {gRec.cidCodes.join(', ')}</span>}
                                                                                     </span>
                                                                                </div>
                                                                                <div className="font-bold text-gray-900 dark:text-gray-100 bg-gray-50/80 dark:bg-gray-900/50 px-3 py-1 rounded border border-gray-100 dark:border-gray-800">
                                                                                    {Number(gRec.quantity) || 1}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    </React.Fragment>
                                            );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Patient History Modal */}
            <PatientTimeline
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                patientCns={formData.patientCns}
                patientName={formData.patientName}
                entityId={user?.entityId || ''}
            />

            {/* Quick Patient Edit Modal Overlay */}
            <AnimatePresence>
                {editPatientModalOpen && patientToEdit && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                            onClick={() => setEditPatientModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700/50"
                        >
                            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/80">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-full flex items-center justify-center mb-3">
                                    <User size={24} />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edição Rápida de Paciente</h2>
                                <p className="text-xs text-gray-500 text-center mt-1">
                                    Atualize o cadastro do paciente diretamente pelo histórico. 
                                </p>
                            </div>

                            <div className="p-5 space-y-4">
                                <Input
                                    label="Nome Completo"
                                    value={patientToEdit.name || ''}
                                    onChange={(e) => setPatientToEdit({ ...patientToEdit, name: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="CNS"
                                        value={patientToEdit.cns || ''}
                                        onChange={(e) => setPatientToEdit({ ...patientToEdit, cns: e.target.value })}
                                    />
                                    <Input
                                        label="CPF"
                                        value={patientToEdit.cpf || ''}
                                        onChange={(e) => setPatientToEdit({ ...patientToEdit, cpf: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Nascimento"
                                        type="date"
                                        value={patientToEdit.dob || ''}
                                        onChange={(e) => setPatientToEdit({ ...patientToEdit, dob: e.target.value })}
                                    />
                                    <Select
                                        label="Sexo"
                                        value={patientToEdit.sex || ''}
                                        onChange={(e) => setPatientToEdit({ ...patientToEdit, sex: e.target.value })}
                                        options={[
                                            { value: '', label: 'Selecionar' },
                                            ...LISTA_SEXO
                                        ]}
                                    />
                                </div>
                                <Input
                                    label="Telefone / Contato"
                                    value={patientToEdit.phone || ''}
                                    onChange={(e) => setPatientToEdit({ ...patientToEdit, phone: e.target.value })}
                                />
                            </div>

                            <div className="p-5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setEditPatientModalOpen(false)}
                                    className="font-medium"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    isLoading={isSavingPatient}
                                    onClick={handleSavePatientEdit}
                                    className="px-6 font-bold shadow-md shadow-blue-500/20"
                                >
                                    <Save size={16} className="mr-2" />
                                    Salvar Alterações
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* SIGTAP Tree Selector Modal (v2 New Structure) */}
            <SigtapTreeSelector
                isOpen={isSigtapModalOpen}
                onClose={() => setIsSigtapModalOpen(false)}
                onSelect={(proc) => handleSigtapSelect(proc as unknown as SigtapProcedureRow)}
                currentCompetence={formData.competence || undefined}
            />

            <EditAttendanceModal
                isOpen={!!editingAttendanceGroup}
                onClose={() => setEditingAttendanceGroup(null)}
                attendanceRecords={editingAttendanceGroup || []}
                onSaveSuccess={() => {
                    setEditingAttendanceGroup(null);
                    setRefreshHistoryTick(prev => prev + 1);
                }}
                overrideContextData={{
                    entityId: claims?.entityId || '',
                    municipalityId: claims?.municipalityId || '',
                    entityType: claims?.entityType || 'PUBLIC',
                    professionalId: editingAttendanceGroup?.[0]?._rawRecord?.professionalId || '',
                    source: "subsede_panel"
                }}
            />
        </motion.div>
    );
};

export default SubsedeRegisterProduction;