import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Button, Input, Select } from '../components/ui/BaseComponents';
import { LISTA_SEXO, LISTA_RACA_COR, LISTA_CARATER_ATENDIMENTO } from '../constants';
import { Search, Plus, MapPin, AlertCircle, CheckCircle, FileText, UserCheck, Stethoscope, Hammer, ClipboardList, Syringe, User, Layout, Activity, ChevronUp, ChevronDown, Calendar, LayoutTemplate, WifiOff } from 'lucide-react';

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { validateCNS, validatePatientName, validateVaccinationData } from '../utils/lediValidation';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { useApp } from '../context';
import {
    searchProcedures,
    getCompatibleCids,
    getAttendanceCharacterForProcedure,
    getServicesForProcedure,
    getCurrentCompetence,
    getAvailableCompetences,
    SigtapProcedureRow,
    SigtapCidRow
} from '../services/sigtapLookupService';
import {
    saveBpaRecord,
    saveMultipleBpaRecords,
    saveOrUpdatePatient,
    ProcedureFormItem,
    getLastClinicalData,
    getPendingExams
} from '../services/bpaService';
import { PatientTimeline } from '../components/PatientTimeline';
import { SigtapTreeSelector } from '../components/SigtapTreeSelector';
import { sigtapService } from '../services/sigtapService';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { ProcedureCard } from '../components/ProcedureCard';
import { CdsIndividualForm } from '../components/forms/CdsIndividualForm';
import { CdsOdontoForm } from '../components/forms/CdsOdontoForm';
import { CdsColetivaForm } from '../components/forms/CdsColetivaForm';
import { CdsVaccinationForm } from '../components/forms/CdsVaccinationForm';
import { CdsDomiciliarForm } from '../components/forms/CdsDomiciliarForm';
import { doc, getDoc } from 'firebase/firestore'; // Added getDoc import

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
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

export const Register: React.FC = () => {
    const navigate = useNavigate();
    const { user, currentUnit, selectUnit } = useApp();
    const [step, setStep] = useState<'form' | 'success'>('form');

    // MUNICIPALITY CONFIGURATION STATE
    const [interfaceType, setInterfaceType] = useState<'PEC' | 'SIMPLIFIED'>('PEC'); // Default to PEC
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);

    // BLOCK RENDER UNTIL CONFIG LOADED
    if (!isConfigLoaded && currentUnit?.municipalityId) {
        // We have a unit but config implies we need to fetch. 
        // We wait for the effect to set isConfigLoaded.
        // (The effect below handles the fetch)
    }

    // Fetch Municipality Config - Robust Fetch
    useEffect(() => {
        async function fetchConfig() {
            if (!currentUnit) return;

            const mId = currentUnit.municipalityId;

            if (!mId) {
                // If context logic works now, this shouldn't happen often
                setIsConfigLoaded(true);
                return;
            }

            try {

                // We need to fetch the municipality doc to get the interfaceType.
                // Munis are subcollections: municipalities/{PUBLIC|PRIVATE}/{entityId}/{munId}
                // Since we don't know the Type, we check both or verify User entity context.
                // Assuming User is linked to the same entity as the unit:
                const entityId = user?.entityId;
                if (!entityId) throw new Error("User Entity ID missing");

                // Try fetching from Public path first (Most common? Or check both)
                let docRef = doc(db, 'municipalities', 'PUBLIC', entityId, mId);
                let docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    // Try Private
                    docRef = doc(db, 'municipalities', 'PRIVATE', entityId, mId);
                    docSnap = await getDoc(docRef);
                }

                // Fallback: If still not found, logic fails (PEC Default)
                // (Maybe try global ID query if cross-entity access ever needed?? No, scoped.)

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const type = data.interfaceType || 'PEC';
                    console.log(`Debug: Municipality ${mId} Config Loaded:`, type);

                    // CACHE: Save to localStorage for offline support
                    localStorage.setItem(`probpa_config_${mId}`, JSON.stringify({
                        type,
                        timestamp: Date.now()
                    }));

                    setInterfaceType(type);

                    // IF SIMPLIFIED: Force Ficha to PROCEDIMENTOS
                    if (type === 'SIMPLIFIED') {
                        setActiveFicha('PROCEDIMENTOS');
                    }
                } else {
                    throw new Error("Municipality config not found");
                }
            } catch (err) {
                console.warn("Error fetching municipality config (using cache if available):", err);
                // FALLBACK: Try LocalStorage
                const cached = localStorage.getItem(`probpa_config_${mId}`);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        console.log("Using cached interface config:", parsed.type);
                        setInterfaceType(parsed.type);
                        if (parsed.type === 'SIMPLIFIED') {
                            setActiveFicha('PROCEDIMENTOS');
                        }
                    } catch (e) {
                        console.error("Error parsing cached config", e);
                    }
                }
            } finally {
                setIsConfigLoaded(true);
            }
        }
        fetchConfig();
    }, [currentUnit, user?.entityId]);

    // Ficha Type State
    type FichaType = 'INDIVIDUAL' | 'ODONTO' | 'PROCEDIMENTOS' | 'VACINACAO' | 'DOMICILIAR' | 'COLETIVA';
    // Allowed Fichas based on CBO
    const allowedFichas = useMemo<FichaType[]>(() => {
        // SIMPLIFIED override
        if (interfaceType === 'SIMPLIFIED') {
            return ['PROCEDIMENTOS'];
        }

        const cbo = user?.cbo || '';
        if (!cbo) return ['PROCEDIMENTOS', 'COLETIVA'];

        // 1. Médicos (225) & Enfermeiros (2235)
        if (cbo.startsWith('225') || cbo.startsWith('2235')) {
            return ['INDIVIDUAL', 'COLETIVA', 'VACINACAO'];
        }

        // 2. Dentistas (2232) & TSB (3224)
        if (cbo.startsWith('2232') || cbo.startsWith('3224')) {
            return ['ODONTO', 'COLETIVA'];
        }

        // 3. Técnicos de Enfermagem (3222)
        if (cbo.startsWith('3222')) {
            return ['PROCEDIMENTOS', 'VACINACAO', 'COLETIVA'];
        }

        // 4. ACS (5151) & ACE (5153)
        if (cbo.startsWith('5151') || cbo.startsWith('5153')) {
            return ['DOMICILIAR', 'COLETIVA'];
        }

        // Default
        return ['PROCEDIMENTOS', 'COLETIVA'];


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

    // Procedures List
    const [procedures, setProcedures] = useState<ProcedureItem[]>([{
        procedureCode: '',
        procedureName: '',
        cidCodes: [],
        attendanceCharacter: '01',
        attendanceType: '',
        authNumber: '',
        serviceCode: '',
        classCode: '',
        quantity: 1,
        obs: '',
        isExpanded: true
    }]);

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
        } else {
            setFormData(prev => ({ ...prev, patientAge: '' }));
        }
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

    // Generate last 12 months for Competence Select
    useEffect(() => {
        const options = [];
        const today = new Date();
        for (let i = 0; i < 12; i++) {
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
        if (currentUnit) {
            setFormData(prev => ({
                ...prev,
                unit: currentUnit.id,
                cbo: currentUnit.occupation || ''
            }));
        }
    }, [currentUnit]);

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
    const [showPatientSuggestions, setShowPatientSuggestions] = useState<'cns' | 'cpf' | null>(null);
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

            // Only search if we have at least 3 digits to avoid huge lists
            if (termCns.length < 3 && termCpf.length < 3) {
                setPatientSuggestions([]);
                setShowPatientSuggestions(null);
                setPatientFound(false); // Reset found status
                return;
            }

            try {
                const patientsRef = collection(db, 'patients');
                let q;
                let type: 'cns' | 'cpf' | null = null;

                // Prioritize CNS search if active
                if (termCns.length >= 3) {
                    type = 'cns';
                    // Prefix search: cns >= term && cns <= term + '\uf8ff'
                    q = query(
                        patientsRef,
                        where('cns', '>=', termCns),
                        where('cns', '<=', termCns + '\uf8ff'),
                        limit(5)
                    );
                } else if (termCpf.length >= 3) {
                    type = 'cpf';
                    q = query(
                        patientsRef,
                        where('cpf', '>=', termCpf),
                        where('cpf', '<=', termCpf + '\uf8ff'),
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
    }, [debouncedCns, debouncedCpf]);

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
    const handleAddProcedure = () => {
        setProcedures(prev => [
            ...prev.map(p => ({ ...p, isExpanded: false })), // Collapse others
            {
                procedureCode: '',
                procedureName: '',
                cidCodes: [],
                attendanceCharacter: '01-AGENDADA',
                attendanceType: '',
                authNumber: '',
                serviceCode: '',
                classCode: '',
                quantity: 1,
                obs: '',
                isExpanded: true
            }
        ]);
    };

    const handleRemoveProcedure = (index: number) => {
        if (procedures.length === 1) {
            // If only one, just reset it
            setProcedures([{
                procedureCode: '',
                procedureName: '',
                cidCodes: [],
                attendanceCharacter: '01-AGENDADA',
                attendanceType: '',
                authNumber: '',
                serviceCode: '',
                classCode: '',
                quantity: 1,
                obs: '',
                isExpanded: true
            }]);
            return;
        }
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
        // CBO Validation
        const validation = sigtapService.checkCboCompatibility(proc, formData.cbo);
        if (!validation.compatible) {
            alert(validation.message || 'CBO incompatível'); // Or use toast if available
            return; // Block selection
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
                    isCollectiveActivity: true, // Flag for service
                    obs: `Atividade Tipo ${colData.atividadeTipo}`,

                    // Flattened params if strict schema requires them here, 
                    // otherwise they live in the 'coletivaData' of the shared object.
                    activityType: colData.atividadeTipo,
                    participantsCount: (colData.participantes || []).length
                };

                // Save
                await saveMultipleBpaRecords({
                    unitId: formData.unit,
                    unitName: currentUnit?.name,
                    cbo: formData.cbo,
                    professionalId: user?.professionalId || user?.id || '',
                    professionalName: user?.name || '',
                    entityId: user?.entityId || '',
                    entityType: user?.entityType || 'PUBLIC', // TRUSTED CONTEXT SOURCE
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

        // Validation
        if (!formData.patientCns && !formData.patientCpf && !formData.patientName) {
            setError('Informe ao menos o CNS, CPF ou Nome do paciente');
            return;
        }

        // LEDI/APS Validation
        if (isLediTarget) {
            // 1. CNS Validation (Modulo 11)
            if (!formData.patientCns) {
                setError('Para unidades APS (e-SUS), o CNS do paciente é obrigatório.');
                return;
            }
            if (formData.patientCns.length > 0 && !validateCNS(formData.patientCns)) {
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

                if (problems.length === 0) {
                    setError('Ficha Atendimento Individual: Informe ao menos um Problema/Condição (CIAP/CID).');
                    return;
                }
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

            // 2. Collective Activity Validation
            if (p.isCollectiveActivity) {
                // Should not hit here if activeFicha is COLETIVA (handled above), 
                // but keep for legacy mixed mode if any.
                if (!p.activityType) {
                    setError(`Procedimento #${i + 1}: Informe o Tipo de Atividade Coletiva.`);
                    return;
                }
                if (!p.participantsCount || p.participantsCount < 1) {
                    setError(`Procedimento #${i + 1}: Informe o número de participantes (mínimo 1).`);
                    return;
                }
                // Skip CID/Qty checks for Collective (Qty forced to 1, CIDs handled by simplified form)
                continue;
            }

            // 3. Individual Validation (Standard)
            // Skip CID check if it's a Home Visit (localAtendimento === '4')
            const isHomeVisit = formData.localAtendimento === '4';

            if (p.requiresCid !== false && !isHomeVisit) {
                if (p.cidCodes.length === 0 || p.cidCodes.some(cid => !cid)) {
                    setError(`Procedimento #${i + 1}: Selecione ao menos um CID válido.`);
                    return;
                }
            }
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
                cns: formData.patientCns,
                cpf: formData.patientCpf,
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
                user?.entityType || 'PUBLIC',
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

                savePromises.push(saveMultipleBpaRecords({
                    unitId: formData.unit,
                    unitName: currentUnit?.name,
                    cbo: formData.cbo,
                    professionalId: user?.professionalId || user?.id || '',
                    professionalName: user?.name || '',
                    entityId: user?.entityId || '',
                    municipalityId: currentUnit?.municipalityId || '',
                    municipalityName: currentUnit?.municipalityName || '',
                    entityType: user?.entityType || 'PUBLIC',
                    // entityType removed: let service resolve it

                    patientId: patientId,
                    patientCns: formData.patientCns,
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

                savePromises.push(saveMultipleBpaRecords({
                    unitId: formData.unit,
                    unitName: currentUnit?.name,
                    cbo: formData.cbo,
                    professionalId: user?.professionalId || user?.id || '',
                    professionalName: user?.name || '',
                    entityId: user?.entityId || '',
                    municipalityId: currentUnit?.municipalityId || '',
                    municipalityName: currentUnit?.municipalityName || '',
                    entityType: user?.entityType || 'PUBLIC',
                    // entityType removed: let service resolve it

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
            setStep('success');

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
        setProcedures([{
            procedureCode: '',
            procedureName: '',
            cidCodes: [],
            attendanceCharacter: '01-AGENDADA',
            attendanceType: '',
            authNumber: '',
            serviceCode: '',
            classCode: '',
            quantity: 1,
            obs: '',
            isExpanded: true
        }]);
        setShowAddress(false);
    };

    if (step === 'success') {
        return (
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6"
            >
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                    <CheckCircle size={40} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Atendimentos Registrados!</h2>

                    <p className="text-gray-500 mt-2">Os procedimentos foram salvos com sucesso.</p>
                </div>
                <div className="flex gap-3 w-full max-w-xs">
                    <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
                        Início
                    </Button>
                    <Button className="flex-1" onClick={handleBack}>
                        Novo Registro
                    </Button>
                </div>
            </motion.div>
        );
    }

    // EFFECT: Auto-select unit if user has only one assignment
    useEffect(() => {
        if (!currentUnit && user?.units?.length === 1) {
            selectUnit(user.units[0]);
        }
    }, [currentUnit, user?.units, selectUnit]);

    // BLOCKING RENDER: Unit Selection for Multi-Link Professionals
    // If no unit is selected and user has multiple units, force selection before showing form.
    if (!currentUnit && (user?.units?.length || 0) > 1) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="bg-medical-50 dark:bg-medical-900/20 p-4 rounded-full text-medical-600 dark:text-medical-400 mb-2">
                    <Layout size={40} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Selecione a Unidade de Trabalho</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        Você possui vínculos em múltiplas unidades. Por favor, selecione em qual unidade deseja registrar a produção agora.
                    </p>
                </div>

                <div className="grid gap-3 w-full max-w-md">
                    {user?.units.map(u => (
                        <button
                            key={u.id}
                            onClick={() => selectUnit(u)}
                            className="flex items-center p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-500 hover:ring-2 hover:ring-medical-500/20 transition-all text-left group shadow-sm"
                        >
                            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mr-4 group-hover:bg-medical-50 dark:group-hover:bg-medical-900/30 transition-colors">
                                <MapPin className="text-gray-500 group-hover:text-medical-600 dark:text-gray-400" size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-medical-700 dark:group-hover:text-medical-400 transition-colors">
                                    {u.name}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <span className="opacity-75">{u.occupation}</span>
                                    {u.type && <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">{u.type}</span>}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

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

                {/* UNIT SWITCHER (Top Right) */}
                {(user?.units?.length || 0) > 1 && currentUnit && (
                    <div className="relative group">
                        <select
                            className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2 pl-3 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-medical-500 shadow-sm transition-all cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                            value={currentUnit.id}
                            onChange={(e) => {
                                const u = user?.units.find(un => un.id === e.target.value);
                                if (u) selectUnit(u);
                            }}
                        >
                            {user?.units.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.name.length > 25 ? u.name.substring(0, 25) + '...' : u.name}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                            <Layout size={14} />
                        </div>
                    </div>
                )}
            </div>

            {/* Simplified Interface Warning Banner */}
            {interfaceType === 'SIMPLIFIED' && (
                <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg flex items-start gap-3">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-800 rounded-full text-amber-600 dark:text-amber-400 shrink-0">
                        <AlertCircle size={16} />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                            Modo Simplificado Ativo
                        </h4>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                            Você está operando no modo exclusivo de produção BPA. Funcionalidades avançadas de prontuário, coleta de dados clínicos (SOAP) e integração e-SUS estão desabilitadas para este município.
                        </p>
                    </div>
                </div>
            )}



            {/* CONTENT */}
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">

                {/* SEÇÃO 1: DADOS OPERACIONAIS */}
                <Card className="p-5 border-l-4 border-l-medical-500">
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

                        <Select
                            label={formData.localAtendimento === '1' ? "Unidade de Realização (CNES)" : "Unidade de Vínculo/Referência"}
                            value={formData.unit}
                            onChange={e => {
                                const selectedUnit = user?.units.find(u => u.id === e.target.value);
                                if (selectedUnit) {
                                    selectUnit(selectedUnit); // Updates global context & triggers config fetch
                                    // Local formData update is handled by the useEffect monitoring currentUnit
                                }
                            }}
                            options={user?.units.map(u => ({ value: u.id, label: `${u.name} ${u.type ? `(${u.type})` : ''} - ${u.occupation}` })) || []}
                        />
                        <Input
                            label="CBO do Profissional"
                            value={formData.cbo}
                            readOnly
                            className="bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
                        />
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
                                {isReadOnlyPatient && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)} className="gap-2">
                                        <Activity size={16} />
                                        Ver Histórico
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" type="button" disabled title="Em breve: Integração DataSUS">
                                    <Search size={14} className="mr-1" /> Localizar no DataSUS
                                </Button>
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
                                            setFormData({ ...formData, patientCns: e.target.value });
                                            if (e.target.value === '') {
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
                                            setFormData({ ...formData, patientCpf: e.target.value });
                                            if (e.target.value === '') {
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
                                <div className="sm:col-span-2">
                                    <Input
                                        label="Nome Completo"
                                        placeholder="Nome do paciente"
                                        value={formData.patientName}
                                        onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                                        readOnly={isReadOnlyPatient}
                                        className={isReadOnlyPatient ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}
                                    />
                                </div>
                            </div>

                            {/* Linha 2: Dados Demográficos */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
                                        value={formData.patientAge}
                                        readOnly
                                        className="bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
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
                                <div className="col-span-1">
                                    <Select
                                        label="Raça/Cor"
                                        value={formData.patientRace}
                                        onChange={e => setFormData({ ...formData, patientRace: e.target.value })}
                                        options={[{ value: '', label: 'Selecione' }, ...LISTA_RACA_COR]}
                                        disabled={isReadOnlyPatient}
                                    />
                                </div>
                                <div className="col-span-1 sm:col-span-1">
                                    <Input
                                        label="Telefone"
                                        placeholder="(XX) 99999-9999"
                                        value={formData.patientPhone}
                                        onChange={e => setFormData({ ...formData, patientPhone: e.target.value })}
                                        readOnly={isReadOnlyPatient}
                                        className={isReadOnlyPatient ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}
                                    />
                                </div>
                                <div className="col-span-1 sm:col-span-1">
                                    <Input
                                        label="Nacionalidade (Cód. País)"
                                        value={formData.patientNationality}
                                        onChange={e => setFormData({ ...formData, patientNationality: e.target.value })}
                                        placeholder="010 (Brasil)"
                                        readOnly={isReadOnlyPatient}
                                        className={isReadOnlyPatient ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}
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

                            {allowedFichas.includes('COLETIVA') && (
                                <FichaButton
                                    active={activeFicha === 'COLETIVA'}
                                    onClick={() => handleFichaChange('COLETIVA')}
                                    icon={<UserCheck size={20} />}
                                    title="Ativ. Coletiva"
                                    subtitle="Grupos/Reuniões"
                                    color="indigo"
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

                {activeFicha === 'COLETIVA' && (
                    <CdsColetivaForm
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
                            {procedures.map((proc, index) => (
                                <ProcedureCard
                                    key={index}
                                    index={index}
                                    data={proc}
                                    competence={formData.competence}
                                    onUpdate={handleUpdateProcedure}
                                    onRemove={handleRemoveProcedure}
                                    onOpenSigtap={handleOpenSigtap}
                                    isExpanded={proc.isExpanded}
                                    onToggleExpand={handleToggleExpand}
                                    userCbo={formData.cbo}
                                />
                            ))}
                            {/* Add Button */}
                            <Button variant="outline" onClick={handleAddProcedure} className="w-full border-dashed border-2 py-6">
                                <Plus className="mr-2" size={20} />
                                Adicionar Outro Procedimento
                            </Button>
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
                <div className="pb-4">
                    <Button type="submit" className="w-full h-14 text-lg shadow-lg shadow-medical-500/20" isLoading={loading}>
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

            {/* Patient History Modal */}
            <PatientTimeline
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                patientCns={formData.patientCns}
                patientName={formData.patientName}
                entityId={user?.entityId || ''}
            />


            {/* SIGTAP Tree Selector Modal (v2 New Structure) */}
            <SigtapTreeSelector
                isOpen={isSigtapModalOpen}
                onClose={() => setIsSigtapModalOpen(false)}
                onSelect={(proc) => handleSigtapSelect(proc as unknown as SigtapProcedureRow)}
                currentCompetence={formData.competence}
            />
        </motion.div >
    );
};