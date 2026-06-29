import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, SidePanel, Input, Select, Badge } from '../../components/ui/Components';
import { Plus, Calendar, MapPin, Users, Activity, Trash2, Edit2, Search, Stethoscope, Save, X, FileText, User, Info, AlertTriangle, CheckCircle, Clock, Download, ChevronDown, Building2, FileSignature } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEntityData } from '../../hooks/useEntityData';
import {
    fetchActionsByEntity,
    createAction,
    updateAction,
    deleteAction,
    registerProduction,
    fetchActionProduction,
    deleteActionProduction,
    updateActionProduction,
    Action,
    ActionProduction
} from '../../services/actionsService';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { fetchProfessionalsByEntity } from '../../services/professionalsService';
import { createPerson, searchPersons, Person } from '../../services/personsService';
import { SigtapBrowserModal } from './components/SigtapBrowserModal';
import { susReportService } from '../../services/susReportService';
import { municipalityReportService, resolveSigtapCode } from '../../services/municipalityReportService';
import { sigtapService, SigtapProcedureDetail } from '../../services/sigtapService';
import { logAction } from '../../services/logsService';
import { fetchActionProfessionals, searchActionProfessionals, saveActionProfessional, deleteActionProfessional, ActionProfessionalBase, updateActionProfessionalStatus } from '../../services/actionProfessionalsService';
import { collection, doc, getDocs, getDoc, query, where, orderBy, writeBatch, collectionGroup, limit } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { CBO_LIST } from '../../constants';
import { Loader2 } from 'lucide-react';

// Debounce hook (local)
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

// Helper para buscar assinaturas com fallback de CNS/CPF para ações legadas
const fetchSignatureForProfessionalFallback = async (actionProf: any, entityId: string, municipalityId: string | undefined) => {
    let signatureUrl: string | undefined = undefined;
    let signatureBase64: string | undefined = undefined;

    try {
        if (actionProf.id) {
            // 1. Try Action Professionals Base FIRST
            const actionProfDoc = await getDoc(doc(db, `entities/${entityId}/professionalsActions`, actionProf.id));
            if (actionProfDoc.exists()) {
                const data = actionProfDoc.data();
                signatureUrl = data.signatureUrl;
                signatureBase64 = data.signatureBase64;
            }

            // 2. Try municipality scoped
            if (!signatureUrl && !signatureBase64 && municipalityId && municipalityId !== 'others') {
                const profDoc = await getDoc(doc(db, `municipalities/PRIVATE/${entityId}/${municipalityId}/professionals`, actionProf.id));
                if (profDoc.exists()) {
                    const data = profDoc.data();
                    signatureUrl = data.signatureUrl;
                    signatureBase64 = data.signatureBase64;
                }
            }

            // 3. Try collection group 'professionals' fallback by ID
            if (!signatureUrl && !signatureBase64) {
                const profQuery = query(collectionGroup(db, 'professionals'), where('id', '==', actionProf.id), limit(1));
                const profSnap = await getDocs(profQuery);
                if (!profSnap.empty) {
                    const data = profSnap.docs[0].data() as any;
                    signatureUrl = data.signatureUrl;
                    signatureBase64 = data.signatureBase64;
                }
            }
        }

        // 4. Fallback by CNS
        if (!signatureUrl && !signatureBase64 && actionProf.cns) {
            const cnsActionQuery = query(collection(db, `entities/${entityId}/professionalsActions`), where('cns', '==', actionProf.cns), limit(1));
            const cnsActionSnap = await getDocs(cnsActionQuery);
            if (!cnsActionSnap.empty) {
                const data = cnsActionSnap.docs[0].data() as any;
                signatureUrl = data.signatureUrl;
                signatureBase64 = data.signatureBase64;
            } else {
                const cnsQuery = query(collectionGroup(db, 'professionals'), where('cns', '==', actionProf.cns), limit(1));
                const cnsSnap = await getDocs(cnsQuery);
                if (!cnsSnap.empty) {
                    const data = cnsSnap.docs[0].data() as any;
                    signatureUrl = data.signatureUrl;
                    signatureBase64 = data.signatureBase64;
                }
            }
        }

        // 5. Fallback by CPF
        if (!signatureUrl && !signatureBase64 && actionProf.cpf) {
            const cpfActionQuery = query(collection(db, `entities/${entityId}/professionalsActions`), where('cpf', '==', actionProf.cpf), limit(1));
            const cpfActionSnap = await getDocs(cpfActionQuery);
            if (!cpfActionSnap.empty) {
                const data = cpfActionSnap.docs[0].data() as any;
                signatureUrl = data.signatureUrl;
                signatureBase64 = data.signatureBase64;
            } else {
                const cpfQuery = query(collectionGroup(db, 'professionals'), where('cpf', '==', actionProf.cpf), limit(1));
                const cpfSnap = await getDocs(cpfQuery);
                if (!cpfSnap.empty) {
                    const data = cpfSnap.docs[0].data() as any;
                    signatureUrl = data.signatureUrl;
                    signatureBase64 = data.signatureBase64;
                }
            }
        }

        // Load image if only URL exists
        if (signatureUrl && !signatureBase64) {
            const loadedSig = await municipalityReportService.loadImage(signatureUrl);
            if (loadedSig) signatureBase64 = loadedSig;
        }
    } catch (err) {
        console.log("Could not fetch professional signature", err);
    }

    return { signatureUrl, signatureBase64 };
};

const ActionsAndPrograms: React.FC = () => {
    const { claims, user } = useAuth();
    const { entity } = useEntityData(claims?.entityId);
    const isCoordenacao = !!claims?.coordenation;

    const getLogUser = () => ({
        uid: user?.uid || '',
        email: user?.email || '',
        name: user?.displayName || user?.email || '',
        role: claims?.role || (isCoordenacao ? 'COORDENAÇÃO' : 'GERAL')
    });

    // Data State
    const [actions, setActions] = useState<Action[]>([]);
    const [municipalities, setMunicipalities] = useState<any[]>([]);
    const [professionals, setProfessionals] = useState<any[]>([]);

    // Analytics State
    const [actionCounts, setActionCounts] = useState<Record<string, { procedures: number, patients: number }>>({});

    // Time State
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [selectedCompetence, setSelectedCompetence] = useState<string>(currentMonth);

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Export State
    const [exportingActionId, setExportingActionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [isPeriodExportModalOpen, setIsPeriodExportModalOpen] = useState(false);
    const [actionToExport, setActionToExport] = useState<Action | null>(null);
    const [exportPeriod, setExportPeriod] = useState({ start: '', end: '' });

    const [isBatchExportModalOpen, setIsBatchExportModalOpen] = useState(false);
    const [batchExportMunGroup, setBatchExportMunGroup] = useState<any | null>(null);
    const [batchExportProfessionalName, setBatchExportProfessionalName] = useState<string>(''); // '' for 'Todos'
    const [isExportingBatch, setIsExportingBatch] = useState(false);

    // Hierarchical State
    const [expandedMunicipalities, setExpandedMunicipalities] = useState<Record<string, boolean>>({});

    const toggleMunicipality = (munId: string) => {
        setExpandedMunicipalities(prev => ({
            ...prev,
            [munId]: !prev[munId]
        }));
    };

    const groupedActions = React.useMemo(() => {
        const groups: Record<string, Action[]> = {};
        actions.forEach(action => {
            const munId = action.municipalityId || 'others';
            if (!groups[munId]) {
                groups[munId] = [];
            }
            groups[munId].push(action);
        });

        return Object.entries(groups).map(([munId, munActions]) => {
            let munName = 'Outros Locais / Não Informado';
            if (munId !== 'others') {
                const mun = municipalities.find(m => m.id === munId);
                if (mun) munName = mun.name;
            } else if (munActions.length > 0 && munActions[0].municipalityName) {
                munName = munActions[0].municipalityName;
            }

            return {
                municipalityId: munId,
                municipalityName: munName,
                actions: munActions
            };
        }).sort((a, b) => a.municipalityName.localeCompare(b.municipalityName));
    }, [actions, municipalities]);

    // Modals State
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
    const [isSigtapModalOpen, setIsSigtapModalOpen] = useState(false);

    // Fast Patient Edit State
    const [editPatientModalOpen, setEditPatientModalOpen] = useState(false);
    const [patientToEdit, setPatientToEdit] = useState<any>(null);
    const [isSavingPatient, setIsSavingPatient] = useState(false);

    // Form State (Action)
    const [editingActionId, setEditingActionId] = useState<string | null>(null);
    const [actionForm, setActionForm] = useState<Partial<Action>>({
        professionals: [],
        procedures: []
    });

    // Form State (Production)
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const [productionForm, setProductionForm] = useState<Partial<ActionProduction>>({
        patientId: '',
        patient: { name: '', cns: '', cpf: '', birthDate: '', sex: 'M' },
        competence: new Date().toISOString().slice(0, 7).replace('-', ''), // YYYYMM
        attendanceDate: new Date().toISOString().split('T')[0], // Default today just in case, mostly overridden
        professionalId: '',
        procedures: []
    });
    const [productionHistory, setProductionHistory] = useState<ActionProduction[]>([]);
    const [editingProductionPatientId, setEditingProductionPatientId] = useState<string | null>(null);

    // Patient Modal & Search State
    const [patientForm, setPatientForm] = useState<Partial<Person>>({ name: '', cns: '', cpf: '', birthDate: '' });
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const debouncedPatientSearchQuery = useDebounce(patientSearchQuery, 300);
    const [patientSearchResults, setPatientSearchResults] = useState<Person[]>([]);
    const [isSearchingPatient, setIsSearchingPatient] = useState(false);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);

    // Procedure Modal & Search State
    const [procedureSearchQuery, setProcedureSearchQuery] = useState('');
    const debouncedProcedureSearchQuery = useDebounce(procedureSearchQuery, 300);
    const [procedureSearchResults, setProcedureSearchResults] = useState<SigtapProcedureDetail[]>([]);
    const [isSearchingProcedures, setIsSearchingProcedures] = useState(false);
    const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);

    // Inline Search effect mirroring Producao App
    useEffect(() => {
        async function doSearch() {
            if (debouncedProcedureSearchQuery.length < 3) {
                if (procedureSearchResults.length > 0) {
                    setProcedureSearchResults([]);
                }
                return;
            }
            let compId = productionForm.competence || selectedCompetence.replace('-', '');
            if (!compId) return;

            // FALLBACK: If current month has no SIGTAP, use the latest available.
            try {
                const available = await sigtapService.getAvailableCompetences();
                if (available.length > 0) {
                    // check if compId exists
                    const exists = available.find(c => c.competence === compId);
                    if (!exists) {
                        compId = available[available.length - 1].competence; // Latest (assuming they sort chronologically or are just the last added)
                    }
                }
            } catch (e) {
                console.warn("Could not fetch fallback competence", e);
            }

            setIsSearchingProcedures(true);
            try {
                const results = await sigtapService.searchProcedures(debouncedProcedureSearchQuery, compId);
                setProcedureSearchResults(results);
                setShowProcedureDropdown(true);
            } catch (err) {
                console.error("Procedure search error:", err);
            } finally {
                setIsSearchingProcedures(false);
            }
        }
        doSearch();
    }, [debouncedProcedureSearchQuery, productionForm.competence, selectedCompetence]);

    const [isCreatingProfessional, setIsCreatingProfessional] = useState(false);
    const [isSavingManualProf, setIsSavingManualProf] = useState(false);
    const [baseProfForm, setBaseProfForm] = useState({ id: '', name: '', cns: '', cpf: '', conselho: '', occupation: '', email: '', phone: '', municipalityId: '' });

    const [isProfessionalBaseModalOpen, setIsProfessionalBaseModalOpen] = useState(false);

    // Signature State
    const [uploadingSignatureId, setUploadingSignatureId] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [selectedProfForSignature, setSelectedProfForSignature] = useState<ActionProfessionalBase | null>(null);
    const [viewingSignatureProf, setViewingSignatureProf] = useState<ActionProfessionalBase | null>(null);
    const [actionProfessionalsList, setActionProfessionalsList] = useState<ActionProfessionalBase[]>([]);
    const [profBaseSearch, setProfBaseSearch] = useState('');

    const handleDeleteActionProfessional = async (profId: string) => {
        if (!claims?.entityId) return;
        if (confirm("Tem certeza que deseja remover este profissional da base? Ele não será apagado das produções já registradas.")) {
            try {
                await deleteActionProfessional(claims.entityId, profId);
                setActionProfessionalsList(prev => prev.filter(p => p.id !== profId));
            } catch (error) {
                alert("Erro ao excluir profissional: " + error);
            }
        }
    };

    // Constants
    const [customLocationMode, setCustomLocationMode] = useState(false);
    const [professionalSearch, setProfessionalSearch] = useState("");
    const [showProfessionalDropdown, setShowProfessionalDropdown] = useState(false);

    const loadData = async () => {
        if (!claims?.entityId) return;
        setLoading(true);

        try {
            // Load in parallel but fail gracefully independently
            const actionsPromise = fetchActionsByEntity(claims.entityId, selectedCompetence)
                .then(setActions)
                .catch(err => console.error("Failed to load actions:", err));

            const municipalitiesPromise = fetchMunicipalitiesByEntity(claims.entityId)
                .then(setMunicipalities)
                .catch(err => console.error("Failed to load municipalities:", err));

            const professionalsPromise = fetchProfessionalsByEntity(claims.entityId)
                .then(setProfessionals)
                .catch(err => console.error("Failed to load professionals:", err));

            const actionProfsPromise = fetchActionProfessionals(claims.entityId)
                .then(setActionProfessionalsList)
                .catch(err => console.error("Failed to load action professionals:", err));

            await Promise.all([actionsPromise, municipalitiesPromise, professionalsPromise, actionProfsPromise]);
        } catch (error) {
            console.error("Error in loadData:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [claims?.entityId, selectedCompetence]);

    // Fetch and calculate counts for actions
    useEffect(() => {
        if (!actions.length) {
            setActionCounts({});
            return;
        }

        const fetchCounts = async () => {
            const newCounts: Record<string, { procedures: number, patients: number }> = {};

            await Promise.all(actions.map(async (action) => {
                if (!action.id || !claims?.entityId) return;
                try {
                    const actionCompetence = action.date.substring(0, 7);
                    const productions = await fetchActionProduction(claims.entityId, action.id, actionCompetence);

                    let procCount = 0;
                    const patientSet = new Set<string>();

                    productions.forEach(prod => {
                        if (prod.isDeleted) return;
                        if (prod.patient?.cns || prod.patient?.cpf || prod.patientId) {
                            patientSet.add(prod.patient?.cns || prod.patient?.cpf || prod.patientId || 'unknown');
                        }
                        prod.procedures.forEach(() => {
                            procCount += 1; // Assuming 1 per procedure line for now
                        });
                    });

                    newCounts[action.id] = {
                        procedures: procCount,
                        patients: patientSet.size
                    };
                } catch (e) {
                    console.error("Error fetching counts for action", action.id, e);
                }
            }));

            setActionCounts(newCounts);
        };

        fetchCounts();
    }, [actions, productionHistory]); // Recalculate when actions or active production UI changes

    // --- ACTION MANAGEMENT ---

    const handleOpenActionModal = (action?: Action) => {
        if (action) {
            setEditingActionId(action.id || null);
            setActionForm({ ...action });
            setCustomLocationMode(!action.municipalityId);
        } else {
            setEditingActionId(null);
            setActionForm({
                entityId: claims?.entityId,
                professionals: [],
                procedures: [],
                municipalityName: ''
            });
            setCustomLocationMode(false);
        }
        setIsActionModalOpen(true);
    };

    const handleSaveAction = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Validate
            if (!actionForm.name || !actionForm.date) {
                alert("Nome e Data são obrigatórios.");
                return;
            }

            if (!customLocationMode && !actionForm.municipalityId) {
                alert("Selecione um município ou marque 'Outro Local'.");
                return;
            }

            // If custom location, clear ID
            const payload = {
                ...actionForm,
                municipalityId: customLocationMode ? undefined : actionForm.municipalityId,
                municipalityName: customLocationMode ? actionForm.municipalityName : municipalities.find(m => m.id === actionForm.municipalityId)?.name
            } as Action;

            if (editingActionId) {
                await updateAction(editingActionId, payload, actions.find(a => a.id === editingActionId)!);
                if (actionForm.entityId) {
                    await logAction({
                        entityId: actionForm.entityId,
                        municipalityId: payload.municipalityId,
                        user: getLogUser(),
                        action: 'UPDATE',
                        target: 'ACTION_PROGRAM',
                        description: `Atualizou a Ação/Campanha: ${payload.name} com ${payload.professionals?.length || 0} profissionais registrados.`
                    });
                }
            } else {
                await createAction(payload);
                if (actionForm.entityId) {
                    await logAction({
                        entityId: actionForm.entityId,
                        municipalityId: payload.municipalityId,
                        user: getLogUser(),
                        action: 'CREATE',
                        target: 'ACTION_PROGRAM',
                        description: `Criou nova Ação/Campanha: ${payload.name} com ${payload.professionals?.length || 0} profissionais registrados.`
                    });
                }
            }
            setIsActionModalOpen(false);
            loadData();
        } catch (error) {
            alert("Erro ao salvar ação: " + error);
        }
    };

    const handleDeleteAction = async (action: Action) => {
        if (confirm("Tem certeza que deseja excluir esta ação?")) {
            try {
                await deleteAction(action.id!, action.entityId, action.date, action.municipalityId);
                await logAction({
                    entityId: action.entityId,
                    municipalityId: action.municipalityId,
                    user: getLogUser(),
                    action: 'DELETE',
                    target: 'ACTION_PROGRAM',
                    description: `Excluiu a Ação/Campanha: ${action.name}`
                });
                loadData();
            } catch (error) {
                alert("Erro ao excluir: " + error);
            }
        }
    };

    // --- PROFESSIONALS & PROCEDURES ---

    const handleAddProfessional = (profId: string) => {
        if (!profId) return;

        let prof = professionals.find(p => p.id === profId);

        // If not found in primary professionals list, search in actionProfessionalsList
        if (!prof) {
            const actionProf = actionProfessionalsList.find(p => p.id === profId);
            if (actionProf) {
                prof = {
                    id: actionProf.id,
                    name: actionProf.name,
                    cns: actionProf.cns || '',
                    cpf: actionProf.cpf || '',
                    registerClass: actionProf.conselho || '',
                    occupation: actionProf.occupation || 'Não informado',
                    municipalityId: actionProf.municipalityId || ''
                } as any;
            }
        }

        if (prof) {
            const exists = actionForm.professionals?.find(p => p.id === prof.id);
            if (!exists) {
                setActionForm(prev => ({
                    ...prev,
                    professionals: [...(prev.professionals || []), {
                        id: prof.id,
                        name: prof.name,
                        cns: prof.cns,
                        cpf: prof.cpf || '',
                        conselho: prof.registerClass || '',
                        occupation: prof.occupation || 'Não informado'
                    }]
                }));
            }
        }
        setProfessionalSearch("");
        setShowProfessionalDropdown(false);
    };

    const handleCreateBaseProfessional = async () => {
        if (!baseProfForm.name || !baseProfForm.cpf) {
            alert("Preencha ao menos o nome e o CPF do profissional.");
            return;
        }

        setIsSavingManualProf(true);

        if (claims?.entityId) {
            try {
                const payload = {
                    municipalityId: baseProfForm.municipalityId || '',
                    entityId: claims.entityId,
                    name: baseProfForm.name,
                    cpf: baseProfForm.cpf,
                    cns: baseProfForm.cns,
                    conselho: baseProfForm.conselho,
                    occupation: baseProfForm.occupation,
                    email: baseProfForm.email,
                    phone: baseProfForm.phone
                };

                const newProfId = await saveActionProfessional(claims.entityId, baseProfForm.id ? { id: baseProfForm.id, ...payload } : payload);

                setActionProfessionalsList(prev => {
                    const existingIndex = prev.findIndex(p => p.id === newProfId);
                    const newProf = { id: newProfId, ...payload } as any;
                    if (existingIndex >= 0) {
                        const updated = [...prev];
                        updated[existingIndex] = newProf;
                        return updated;
                    }
                    return [...prev, newProf];
                });

                setBaseProfForm({ id: '', name: '', cns: '', cpf: '', conselho: '', occupation: '', email: '', phone: '', municipalityId: '' });
                setIsCreatingProfessional(false);
            } catch (e) {
                console.error("Error saving action professional manually", e);
                alert("Erro ao salvar profissional: " + e);
            }
        }

        setIsSavingManualProf(false);
    };

    // Signature attachment Logic
    const handleAttachSignature = (prof: ActionProfessionalBase) => {
        if (prof.signatureUrl) {
            setViewingSignatureProf(prof);
        } else {
            setSelectedProfForSignature(prof);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
            }
        }
    };

    const handleChangeSignature = () => {
        if (viewingSignatureProf) {
            const prof = viewingSignatureProf;
            setViewingSignatureProf(null);
            setSelectedProfForSignature(prof);
            setTimeout(() => {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                    fileInputRef.current.click();
                }
            }, 100);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedProfForSignature || !claims?.entityId || !selectedProfForSignature.id) return;

        setUploadingSignatureId(selectedProfForSignature.id);
        try {
            const timestamp = Date.now();
            const storageRef = ref(storage, `signatures/${claims.entityId}/${selectedProfForSignature.id}_${timestamp}`);

            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result as string;

                await updateActionProfessionalStatus(claims.entityId, selectedProfForSignature.id!, {
                    signatureUrl: url,
                    signatureBase64: base64
                });

                setActionProfessionalsList(prev => prev.map(p =>
                    p.id === selectedProfForSignature.id ? { ...p, signatureUrl: url, signatureBase64: base64 } : p
                ));

                alert('Assinatura anexada com sucesso!');
                setUploadingSignatureId(null);
                setSelectedProfForSignature(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            };
            reader.onerror = () => {
                console.error("Error reading file:", reader.error);
                setUploadingSignatureId(null);
            };
            reader.readAsDataURL(file);

        } catch (error) {
            console.error("Error uploading signature:", error);
            alert("Erro ao enviar assinatura.");
            setUploadingSignatureId(null);
        }
    };

    const renderSignatureModal = () => {
        if (!viewingSignatureProf) return null;

        return (
            <Modal
                isOpen={!!viewingSignatureProf}
                onClose={() => setViewingSignatureProf(null)}
                title={`Assinatura Digital - ${viewingSignatureProf.name}`}
            >
                <div className="flex flex-col items-center space-y-6">
                    <div className="w-full max-w-md p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-center items-center min-h-[150px]">
                        {viewingSignatureProf.signatureUrl ? (
                            <img
                                src={viewingSignatureProf.signatureUrl}
                                alt="Assinatura"
                                className="max-h-40 object-contain"
                            />
                        ) : (
                            <span className="text-gray-400">Imagem indisponível</span>
                        )}
                    </div>

                    <div className="flex gap-3 w-full justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => setViewingSignatureProf(null)}
                        >
                            Fechar
                        </Button>

                        <a
                            href={viewingSignatureProf.signatureUrl}
                            download={`assinatura_${viewingSignatureProf.cns || 'document'}.png`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Baixar
                        </a>

                        <Button
                            variant="secondary"
                            onClick={handleChangeSignature}
                        >
                            <FileSignature className="w-4 h-4 mr-2" />
                            Alterar Assinatura
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    };

    const handleRemoveProfessional = (index: number) => {
        const updated = [...(actionForm.professionals || [])];
        updated.splice(index, 1);
        setActionForm(prev => ({ ...prev, professionals: updated }));
    };

    // Callback for Sigtap Modal
    const handleAddProcedure = (procedure: any) => {
        const code = procedure.code || procedure.co_procedimento;
        const name = procedure.name || procedure.no_procedimento;

        if (!code) {
            console.error("Invalid procedure selected:", procedure);
            return;
        }

        if (isProductionModalOpen) {
            const exists = productionForm.procedures?.find(p => p.code === code);
            if (!exists) {
                setProductionForm(prev => ({
                    ...prev,
                    procedures: [...(prev.procedures || []), { code, name, quantity: 1 } as any]
                }));
            }
        } else {
            const exists = actionForm.procedures?.find(p => p.code === code);
            if (!exists) {
                setActionForm(prev => ({
                    ...prev,
                    procedures: [...(prev.procedures || []), { code, name }]
                }));
            }
        }
        setIsSigtapModalOpen(false);
    };

    const handleRemoveProcedure = (index: number) => {
        if (isProductionModalOpen) {
            const updated = [...(productionForm.procedures || [])];
            updated.splice(index, 1);
            setProductionForm(prev => ({ ...prev, procedures: updated }));
        } else {
            const updated = [...(actionForm.procedures || [])];
            updated.splice(index, 1);
            setActionForm(prev => ({ ...prev, procedures: updated }));
        }
    };

    // --- PRODUCTION ---

    const handleOpenProduction = async (action: Action) => {
        setSelectedAction(action);
        const comp = action.date.substring(0, 7).replace('-', '');
        const autoProf = action.professionals?.length === 1 ? action.professionals[0].id! : '';
        setProductionForm({
            patientId: '',
            patient: { name: '', cns: '', cpf: '', birthDate: '', sex: 'M' },
            competence: comp, // Prefilled with Action's competence
            attendanceDate: action.date, // Prefilled with Action's exact date
            actionId: action.id,
            professionalId: autoProf,
            procedures: []
        });
        setPatientSearchQuery('');
        setPatientSearchResults([]);

        // Procedure Reset
        setProcedureSearchQuery('');
        setProcedureSearchResults([]);

        // Load history
        if (action.id && claims?.entityId) {
            const competenceToFetch = action.date.substring(0, 7);
            const hist = await fetchActionProduction(claims.entityId, action.id, competenceToFetch);
            setProductionHistory(hist);
        }

        setIsProductionModalOpen(true);
    };

    useEffect(() => {
        async function doPatientSearch() {
            if (debouncedPatientSearchQuery.length < 3) {
                if (patientSearchResults.length > 0) {
                    setPatientSearchResults([]);
                }
                setShowPatientDropdown(false);
                return;
            }
            if (!claims?.entityId) return;

            // Prevent searching (and reopening dropdown) if the query matches the selected patient
            if (productionForm.patient?.name && debouncedPatientSearchQuery === productionForm.patient.name) {
                setShowPatientDropdown(false);
                return;
            }

            setIsSearchingPatient(true);
            try {
                const results = await searchPersons(claims.entityId, debouncedPatientSearchQuery, selectedAction?.municipalityId);
                setPatientSearchResults(results);
                setShowPatientDropdown(true);
            } catch (error) {
                console.error("Search error", error);
            } finally {
                setIsSearchingPatient(false);
            }
        }
        doPatientSearch();
    }, [debouncedPatientSearchQuery, claims?.entityId, productionForm.patient?.name, selectedAction?.municipalityId]);

    const handlePatientSearch = (queryStr: string) => {
        setPatientSearchQuery(queryStr);
        if (!queryStr || queryStr.length < 3) {
            setShowPatientDropdown(false);
            setPatientSearchResults([]);
        }
    };

    const handleSelectPatient = (person: Person) => {
        setProductionForm(prev => ({
            ...prev,
            patientId: person.id,
            patient: {
                name: person.name,
                cns: person.cns || '',
                cpf: person.cpf || '',
                birthDate: person.birthDate || '',
                sex: prev.patient?.sex || 'M'
            }
        }));
        setPatientSearchQuery(person.name);
        setShowPatientDropdown(false);
    };

    const handleProcedureSearch = (queryStr: string) => {
        setProcedureSearchQuery(queryStr);
        if (!queryStr) setShowProcedureDropdown(false);
    };

    const handleSelectProcedureFromSearch = (proc: SigtapProcedureDetail) => {
        const exists = productionForm.procedures?.find(p => p.code === proc.code);
        if (!exists) {
            setProductionForm(prev => ({
                ...prev,
                procedures: [...(prev.procedures || []), { code: proc.code, name: proc.name }]
            }));
        }
        setProcedureSearchQuery('');
        setShowProcedureDropdown(false);
        setProcedureSearchResults([]);
    };

    const handleSaveNewPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!claims?.entityId || !selectedAction) return;

        if (!patientForm.name || (!patientForm.cns && !patientForm.cpf)) {
            alert("Nome e (CPF ou CNS) são obrigatórios.");
            return;
        }

        try {
            const newPerson: Omit<Person, 'id' | 'createdAt' | 'updatedAt'> = {
                entityId: claims.entityId,
                municipalityId: selectedAction.municipalityId || '',
                actionId: selectedAction.id!,
                source: 'actionsEntity',
                name: patientForm.name!,
                cpf: patientForm.cpf || '',
                cns: patientForm.cns || '',
                birthDate: patientForm.birthDate || ''
            };

            const newPersonId = await createPerson(claims.entityId, newPerson);

            const actionLocationName = selectedAction.municipalityName || municipalities.find(m => m.id === selectedAction.municipalityId)?.name || 'Local não especificado';

            await logAction({
                entityId: claims.entityId,
                municipalityId: selectedAction.municipalityId,
                user: getLogUser(),
                action: 'CREATE',
                target: 'ACTION_PROGRAM',
                description: `Cadastrou o paciente ${patientForm.name} na base, a partir da Ação: ${selectedAction.name} (${actionLocationName}).`
            });

            handleSelectPatient({ ...newPerson, id: newPersonId } as Person);

            setIsPatientModalOpen(false);
            setPatientForm({ name: '', cns: '', cpf: '', birthDate: '' });
        } catch (error) {
            alert("Erro ao cadastrar paciente: " + error);
        }
    };

    const handleRegisterProduction = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Procedure and Patient Name are strictly required
        if (!selectedAction || !productionForm.procedures || productionForm.procedures.length === 0 || !productionForm.patient?.name || !productionForm.patientId) {
            alert("Preencha o Nome do Paciente (usando a busca/cadastro) e adicione ao menos um procedimento.");
            return;
        }

        // Validation: At least one ID (CNS or CPF) is required
        if (!productionForm.patient?.cns && !productionForm.patient?.cpf) {
            alert("Informe o CNS ou o CPF do paciente.");
            return;
        }

        // Validation: CNS length (15 digits) if provided
        if (productionForm.patient.cns && productionForm.patient.cns.length !== 15) {
            alert("O CNS deve conter exatamente 15 dígitos.");
            return;
        }

        if (!productionForm.professionalId) {
            alert("Selecione qual profissional realizou este atendimento.");
            return;
        }

        try {
            const finalProcedures: any[] = [];
            (productionForm.procedures || []).forEach((p: any) => {
                const qty = p.quantity || 1;
                for (let i = 0; i < qty; i++) {
                    finalProcedures.push({ code: p.code, name: p.name });
                }
            });

            const actionCompetence = selectedAction.date.substring(0, 7);
            const actionLocationName = selectedAction.municipalityName || municipalities.find(m => m.id === selectedAction.municipalityId)?.name || 'Local não especificado';

            if (editingProductionPatientId) {
                await updateActionProduction(
                    selectedAction.entityId,
                    selectedAction.id!,
                    actionCompetence,
                    editingProductionPatientId,
                    { ...productionForm, procedures: finalProcedures }
                );

                await logAction({
                    entityId: selectedAction.entityId,
                    municipalityId: selectedAction.municipalityId,
                    user: getLogUser(),
                    action: 'UPDATE',
                    target: 'ACTION_PROGRAM',
                    description: `Atualizou a produção para o paciente ${productionForm.patient?.name} na Ação: ${selectedAction.name} (${finalProcedures.length} procedimentos) em ${actionLocationName}.`
                });

                setEditingProductionPatientId(null);
                alert("Lançamento atualizado com sucesso!");
            } else {
                await registerProduction(
                    selectedAction.id!,
                    selectedAction.entityId,
                    actionCompetence,
                    selectedAction.municipalityId,
                    { ...productionForm, procedures: finalProcedures } as ActionProduction
                );

                await logAction({
                    entityId: selectedAction.entityId,
                    municipalityId: selectedAction.municipalityId,
                    user: getLogUser(),
                    action: 'CREATE',
                    target: 'ACTION_PROGRAM',
                    description: `Registrou produção para o paciente ${productionForm.patient?.name} na Ação: ${selectedAction.name} (${finalProcedures.length} procedimentos) em ${actionLocationName}.`
                });
                alert("Produção registrada!");
            }

            // Refresh history
            const hist = await fetchActionProduction(selectedAction.entityId, selectedAction.id!, actionCompetence);
            setProductionHistory(hist);

            // Reset form but keep competence and clear patient data (keep selected professional)
            setProductionForm(prev => ({
                ...prev,
                patientId: '',
                patient: { name: '', cns: '', cpf: '', birthDate: '', sex: 'M' },
                attendanceDate: selectedAction.date, // reset back to action date
                procedures: []
            }));

            setPatientSearchQuery('');
        } catch (error) {
            alert("Erro ao registrar: " + error);
        }
    };

    const handleEditProduction = (e: React.MouseEvent, record: ActionProduction) => {
        e.preventDefault();
        e.stopPropagation();

        const grouped = record.procedures.reduce((acc, proc) => {
            const existing = acc.find((p: any) => p.code === proc.code);
            if (existing) {
                existing.quantity = (existing.quantity || 1) + 1;
            } else {
                acc.push({ ...proc, quantity: 1 });
            }
            return acc;
        }, [] as any[]);

        setProductionForm(prev => ({
            ...prev,
            patientId: record.patientId,
            patient: record.patient,
            professionalId: record.professionalId,
            procedures: grouped,
            attendanceDate: record.attendanceDate || selectedAction?.date || ''
        }));
        setEditingProductionPatientId(record.patientId);
        setEditingProductionPatientId(record.patientId);

        // Find the modal scroll container and scroll to top smoothly
        const modalContainer = document.querySelector('[role="dialog"] .overflow-y-auto') || document.querySelector('.overflow-y-auto');
        if (modalContainer) {
            modalContainer.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

    };

    const handleCancelEditProduction = () => {
        setEditingProductionPatientId(null);
        setProductionForm(prev => ({
            ...prev,
            patientId: '',
            patient: { name: '', cns: '', cpf: '', birthDate: '', sex: 'M' },
            procedures: [],
            attendanceDate: selectedAction?.date || ''
        }));
        setPatientSearchQuery('');
    };

    const handleDeleteProduction = async (e: React.MouseEvent, record: ActionProduction) => {
        e.preventDefault();
        e.stopPropagation();

        if (!claims?.entityId || !selectedAction?.id) return;

        if (confirm(`Tem certeza que deseja excluir a produção de ${record.patient.name}?`)) {
            try {
                const actionCompetence = selectedAction.date.substring(0, 7);
                await deleteActionProduction(claims.entityId, selectedAction.id, actionCompetence, record.patientId);

                await logAction({
                    entityId: claims.entityId,
                    municipalityId: selectedAction.municipalityId,
                    user: getLogUser(),
                    action: 'DELETE',
                    target: 'ACTION_PROGRAM',
                    description: `Excluiu a produção do paciente ${record.patient.name} da Ação: ${selectedAction.name}.`
                });

                // Refresh history
                const hist = await fetchActionProduction(claims.entityId, selectedAction.id, actionCompetence);
                setProductionHistory(hist);
            } catch (error) {
                alert("Erro ao excluir registro: " + error);
            }
        }
    };

    const handleOpenEditPatient = async (record: ActionProduction) => {
        try {
            if (!claims?.entityId) return;
            const patientRef = doc(db, 'entities', claims.entityId, 'persons', record.patientId);
            const patientSnap = await getDoc(patientRef);

            let pData = patientSnap.exists() ? patientSnap.data() : null;

            setPatientToEdit({
                id: record.patientId,
                name: pData?.name || record.patient.name,
                cns: pData?.cns || record.patient.cns || '',
                cpf: pData?.cpf || record.patient.cpf || '',
                dob: pData?.birthDate || record.patient.birthDate || '',
                sex: pData?.sex || record.patient.sex || '',
                phone: pData?.phone || '',
                entityId: claims.entityId
            });
            setEditPatientModalOpen(true);
        } catch (error) {
            console.error("Error pre-fetching patient data", error);
            // Fallback to local snapshot
            setPatientToEdit({
                id: record.patientId,
                name: record.patient.name,
                cns: record.patient.cns || '',
                cpf: record.patient.cpf || '',
                dob: record.patient.birthDate || '',
                sex: record.patient.sex || '',
                phone: '',
                entityId: claims?.entityId || ''
            });
            setEditPatientModalOpen(true);
        }
    };

    const handleSavePatientEdit = async () => {
        if (!patientToEdit || !patientToEdit.id || !claims?.entityId) return;
        setIsSavingPatient(true);
        try {
            const patientRef = doc(db, 'entities', claims.entityId, 'persons', patientToEdit.id);

            // Clean before sending to Firestore
            const cleanData = Object.fromEntries(
                Object.entries({
                    name: patientToEdit.name,
                    cns: patientToEdit.cns,
                    cpf: patientToEdit.cpf,
                    birthDate: patientToEdit.dob,
                    sex: patientToEdit.sex,
                    phone: patientToEdit.phone
                }).filter(([_, v]) => v !== undefined && v !== '')
            );

            // Update Master Patient Record
            const batch = writeBatch(db);
            batch.update(patientRef, cleanData);

            // Atualiza retroativamente a produção na Ação Atual selecionada
            try {
                if (selectedAction) {
                    const actionCompetence = selectedAction.date.substring(0, 7);
                    const actionProdRef = doc(
                        db,
                        'entities',
                        claims.entityId,
                        'actions',
                        actionCompetence,
                        'actions',
                        selectedAction.id!,
                        'production',
                        patientToEdit.id
                    );

                    const existingProdDoc = await getDoc(actionProdRef);
                    if (existingProdDoc.exists()) {
                        const existingData = existingProdDoc.data();
                        batch.update(actionProdRef, {
                            'patient.name': patientToEdit.name,
                            'patient.cns': patientToEdit.cns || existingData.patient?.cns || '',
                            'patient.cpf': patientToEdit.cpf || existingData.patient?.cpf || '',
                            'patient.birthDate': patientToEdit.dob || existingData.patient?.birthDate || '',
                            'patient.sex': patientToEdit.sex || existingData.patient?.sex || ''
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to update history record for the current action", err);
            }

            await batch.commit();

            // Retroactively update the LIVE history listing (O(1) visual update)
            setProductionHistory(prev => prev.map(r => {
                if (r.patientId === patientToEdit.id) {
                    return {
                        ...r,
                        patient: {
                            ...r.patient,
                            name: patientToEdit.name,
                            cns: patientToEdit.cns,
                            cpf: patientToEdit.cpf,
                            birthDate: patientToEdit.dob,
                            sex: patientToEdit.sex
                        }
                    };
                }
                return r;
            }));

            setEditPatientModalOpen(false);
            setPatientToEdit(null);

            await logAction({
                entityId: claims.entityId,
                municipalityId: selectedAction?.municipalityId,
                user: getLogUser(),
                action: 'UPDATE',
                target: 'ACTION_PROGRAM',
                description: `Editou os dados cadastrais do paciente ${patientToEdit.name} a partir da base de Ações e Programas.`
            });

            alert("Cadastro do Paciente atualizado com sucesso no Master Data!");
        } catch (error) {
            console.error("Error updating patient from history", error);
            alert("Erro ao atualizar os dados do paciente.");
        } finally {
            setIsSavingPatient(false);
        }
    };

    const handleExportActionReport = async (action: Action, startDate?: string, endDate?: string) => {
        try {
            if (!claims?.entityId || !action.id) return;
            setExportingActionId(action.id);

            // Fetch production
            const actionCompetence = action.date.substring(0, 7);
            const recordsRaw = await fetchActionProduction(claims.entityId, action.id, actionCompetence);
            let records = recordsRaw.filter(r => !r.isDeleted).map(r => ({ ...r, actionDate: action.date }));

            if (startDate || endDate) {
                records = records.filter(r => {
                    const rDateStr = r.attendanceDate || r.actionDate || (r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toISOString().split('T')[0] : null);
                    if (!rDateStr) return true;
                    if (startDate && rDateStr < startDate) return false;
                    if (endDate && rDateStr > endDate) return false;
                    return true;
                });
            }

            if (records.length === 0) {
                alert("Nenhuma produção registrada para esta ação neste período.");
                setExportingActionId(null);
                return;
            }

            // Preload Logo Base64
            let logoBase64 = entity?.logoBase64 || '';
            if (!logoBase64 && entity?.logoUrl) {
                try {
                    logoBase64 = await municipalityReportService.loadImage(entity.logoUrl);
                } catch (err) {
                    console.log("Could not load external logo url, proceeding without it.");
                }
            }

            // Fetch Full Professional Profiles to get Signatures
            const fullProfessionals = await Promise.all(
                action.professionals.map(async (actionProf) => {
                    const { signatureUrl, signatureBase64 } = await fetchSignatureForProfessionalFallback(actionProf, claims.entityId!, action.municipalityId);

                    return {
                        name: actionProf.name,
                        cns: actionProf.cns,
                        role: actionProf.occupation,
                        cbo: actionProf.occupation,
                        unit: action.municipalityName || 'Não identificada',
                        signatureUrl,
                        signatureBase64
                    };
                })
            );

            // Prepare options
            await susReportService.generateActionSusProductionPdf(records, {
                competence: new Date(action.date + 'T12:00:00').toISOString().slice(0, 7).replace('-', '/'),
                municipalityName: action.municipalityName || 'Não Informado',
                entityName: entity?.name || 'ENTIDADE NÃO IDENTIFICADA',
                actionName: action.name,
                logoBase64,
                professionals: fullProfessionals,
                entityAddress: entity?.address,
                entityPhone: entity?.phone,
                entityCnpj: entity?.cnpj,
                entityCity: entity?.location || claims?.municipalityName,
                entityResponsible: entity?.responsible
            });

        } catch (error) {
            console.error("Erro ao exportar relatório:", error);
            alert("Erro ao exportar relatório da ação.");
        } finally {
            setExportingActionId(null);
        }
    };

    const handleExportBatchActions = async () => {
        if (!claims?.entityId || !batchExportMunGroup) return;
        setIsExportingBatch(true);

        try {
            let allRecordsRaw: any[] = [];
            const profsMap = new Map<string, any>();

            for (const action of batchExportMunGroup.actions) {
                const actionCompetence = action.date.substring(0, 7);
                const records = await fetchActionProduction(claims.entityId, action.id, actionCompetence);

                const mappedRecords = records.map(r => {
                    let pName = '';
                    if (r.professionalId) {
                        const pObj = action.professionals?.find((p: any) => p.id === r.professionalId);
                        if (pObj) pName = pObj.name;
                    }
                    // Legacy fallback: if ID matching fails or ID is missing, and the action has only 1 professional, it must be them
                    if (!pName && action.professionals?.length === 1) {
                        pName = action.professionals[0].name;
                    }
                    return {
                        ...r,
                        actionId: action.id,
                        actionName: action.name,
                        actionDate: action.date,
                        professionalName: pName
                    };
                });

                allRecordsRaw = [...allRecordsRaw, ...mappedRecords];

                if (action.professionals) {
                    action.professionals.forEach((p: any) => {
                        if (p.name && !profsMap.has(p.name)) profsMap.set(p.name, p);
                    });
                }
            }

            let validRecords = allRecordsRaw.filter(r => !r.isDeleted);

            if (batchExportProfessionalName) {
                validRecords = validRecords.filter(r => r.professionalName === batchExportProfessionalName);
            }

            if (validRecords.length === 0) {
                alert("Nenhuma produção encontrada para os filtros selecionados.");
                setIsExportingBatch(false);
                return;
            }

            const selectedProfsMeta = batchExportProfessionalName
                ? [Array.from(profsMap.values()).find(p => p.name === batchExportProfessionalName)].filter(Boolean)
                : Array.from(profsMap.values());

            const fullProfessionals = await Promise.all(
                selectedProfsMeta.map(async (actionProf) => {
                    const { signatureUrl, signatureBase64 } = await fetchSignatureForProfessionalFallback(actionProf, claims.entityId!, batchExportMunGroup.municipalityId);

                    return {
                        id: actionProf.id,
                        name: actionProf.name,
                        cns: actionProf.cns,
                        role: actionProf.occupation,
                        cbo: actionProf.occupation,
                        unit: batchExportMunGroup.municipalityName || 'Não identificada',
                        signatureUrl,
                        signatureBase64
                    };
                })
            );

            let logoBase64 = entity?.logoBase64 || '';
            if (!logoBase64 && entity?.logoUrl) {
                try {
                    logoBase64 = await municipalityReportService.loadImage(entity.logoUrl);
                } catch (err) { }
            }

            const batchData = fullProfessionals.map(prof => {
                const profRecords = validRecords.filter(r => r.professionalName === prof.name);
                return {
                    records: profRecords,
                    options: {
                        competence: selectedCompetence.replace('-', '/'),
                        municipalityName: batchExportMunGroup.municipalityName || 'Não Informado',
                        entityName: entity?.name || 'ENTIDADE NÃO IDENTIFICADA',
                        actionName: 'MÚLTIPLAS AÇÕES (AGRUPADO)',
                        logoBase64,
                        professionals: [prof],
                        entityAddress: entity?.address,
                        entityPhone: entity?.phone,
                        entityCnpj: entity?.cnpj,
                        entityCity: entity?.location || claims?.municipalityName,
                        entityResponsible: entity?.responsible
                    }
                };
            }).filter(item => item.records.length > 0);

            if (batchData.length === 0) {
                alert("Nenhuma produção direta associada aos profissionais listados encontrada neste lote.");
                setIsExportingBatch(false);
                return;
            }

            await susReportService.generateBatchActionSusProductionPdf(batchData);

            setIsBatchExportModalOpen(false);

        } catch (error) {
            console.error("Erro ao exportar lote:", error);
            alert("Erro ao exportar relatório agrupado.");
        } finally {
            setIsExportingBatch(false);
        }
    };
    const collectAndFlattenActionProduction = async (munGroup: any) => {
        let allFlattened: any[] = [];
        for (const action of munGroup.actions) {
            const actionCompetence = action.date.substring(0, 7);
            const records = await fetchActionProduction(claims?.entityId!, action.id, actionCompetence);

            records.forEach((r: any) => {
                if (r.isDeleted || r.status === 'canceled') return;

                // Get professional name and CBO
                let pName = 'NÃO IDENTIFICADO';
                let pCbo = 'S/CBO';
                if (r.professionalId) {
                    const pObj = action.professionals?.find((p: any) => p.id === r.professionalId);
                    if (pObj) {
                        pName = pObj.name;
                        pCbo = pObj.occupation || pObj.cbo || 'S/CBO';
                    }
                }

                // Calculate age if missing
                let age = r.age;
                if (!age && r.patient?.birthDate) {
                    try {
                        const birth = new Date(r.patient.birthDate);
                        const now = new Date();
                        age = now.getFullYear() - birth.getFullYear();
                        const m = now.getMonth() - birth.getMonth();
                        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
                            age--;
                        }
                    } catch (e) {
                        age = 0;
                    }
                }

                // Flatten procedures
                const proceduresArray = Array.isArray(r.procedures) && r.procedures.length > 0 ? r.procedures : [r];
                proceduresArray.forEach((proc: any) => {
                    const resolved = resolveSigtapCode(proc);
                    allFlattened.push({
                        ...r,
                        professionalName: pName,
                        cbo: pCbo,
                        procedureCode: proc.code || resolved?.code || '-',
                        procedureName: proc.name || resolved?.name || '-',
                        quantity: 1,
                        age: age || 0,
                        attendanceDate: r.attendanceDate || action.date,
                        patientCns: r.patient?.cns || '',
                        patientCpf: r.patient?.cpf || '',
                        patientName: r.patient?.name || '',
                        patientBirthDate: r.patient?.birthDate || ''
                    });
                });
            });
        }
        return allFlattened;
    };

    const handleExportBpaC = async (munGroup: any) => {
        if (!claims?.entityId) return;
        const fakeId = 'bpa-c-' + munGroup.municipalityId;
        setExportingActionId(fakeId);
        try {
            const allRecords = await collectAndFlattenActionProduction(munGroup);
            if (allRecords.length === 0) {
                alert("Nenhuma produção encontrada para este município na competência.");
                return;
            }

            const bpaRows = municipalityReportService.aggregateBpaC(allRecords);
            municipalityReportService.generatePdfBpaC(bpaRows, {
                municipalityName: munGroup.municipalityName,
                entityName: entity?.name || 'ENTIDADE',
                competence: selectedCompetence.replace('-', '/')
            });
        } catch (error) {
            console.error("Erro ao gerar BPA-C:", error);
            alert("Erro ao gerar BPA-C.");
        } finally {
            setExportingActionId(null);
        }
    };

    const handleExportBpaI = async (munGroup: any) => {
        if (!claims?.entityId) return;
        const fakeId = 'bpa-i-' + munGroup.municipalityId;
        setExportingActionId(fakeId);
        try {
            const allRecords = await collectAndFlattenActionProduction(munGroup);
            if (allRecords.length === 0) {
                alert("Nenhuma produção encontrada para este município na competência.");
                return;
            }

            municipalityReportService.generatePdfBpaI(allRecords, {
                municipalityName: munGroup.municipalityName,
                entityName: entity?.name || 'ENTIDADE',
                competence: selectedCompetence.replace('-', '/')
            });
        } catch (error) {
            console.error("Erro ao gerar BPA-I:", error);
            alert("Erro ao gerar BPA-I.");
        } finally {
            setExportingActionId(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ações e Programas</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie campanhas e atividades externas.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 flex items-center shadow-sm">
                        <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-500 mr-2" />
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Competência:</span>
                        <select
                            value={selectedCompetence}
                            onChange={(e) => setSelectedCompetence(e.target.value)}
                            className="text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 py-0.5 cursor-pointer outline-none min-w-[130px]"
                        >
                            {monthNames.map((monthName, index) => {
                                const monthNumber = String(index + 1).padStart(2, '0');
                                const value = `${currentYear}-${monthNumber}`;
                                return (
                                    <option key={value} value={value} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                                        {monthName} / {currentYear}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    {(claims?.role === 'MASTER' || isCoordenacao) && (
                        <div className="flex items-center gap-2">
                            <Button onClick={() => setIsProfessionalBaseModalOpen(true)} variant="outline" className="flex items-center gap-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-500" /> Base de Profissionais
                            </Button>
                            <Button onClick={() => handleOpenActionModal()} variant="secondary" className="flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Nova Ação
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="space-y-8">
                {groupedActions.map((munGroup) => {
                    const isExpanded = expandedMunicipalities[munGroup.municipalityId];

                    return (
                        <div key={munGroup.municipalityId} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div
                                className="flex items-center justify-between p-5 cursor-pointer bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800/70 transition-colors border-b border-gray-200 dark:border-gray-700"
                                onClick={() => toggleMunicipality(munGroup.municipalityId)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-sm">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{munGroup.municipalityName}</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {munGroup.actions.length} ações vinculadas
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4">
                                    <div className="hidden sm:flex items-center gap-2 mr-2">
                                        <Button
                                            variant="outline"
                                            className="text-[10px] font-bold h-7 px-2 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                            onClick={(e) => { e.stopPropagation(); handleExportBpaC(munGroup); }}
                                            disabled={exportingActionId === 'bpa-c-' + munGroup.municipalityId}
                                        >
                                            {exportingActionId === 'bpa-c-' + munGroup.municipalityId ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
                                            BPA-C
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="text-[10px] font-bold h-7 px-2 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                            onClick={(e) => { e.stopPropagation(); handleExportBpaI(munGroup); }}
                                            disabled={exportingActionId === 'bpa-i-' + munGroup.municipalityId}
                                        >
                                            {exportingActionId === 'bpa-i-' + munGroup.municipalityId ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <User className="w-3 h-3 mr-1" />}
                                            BPA-I
                                        </Button>
                                    </div>
                                    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        {isExpanded ? <ChevronDown className="w-5 h-5 transform rotate-180 transition-transform" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                    >
                                        <div className="p-6 space-y-8 bg-white dark:bg-gray-800">
                                            <div className="relative">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-5 h-5 text-emerald-600" />
                                                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">
                                                            {entity?.name || 'Entidade Responsável'}
                                                        </h3>
                                                        {entity?.cnpj && (
                                                            <span className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                                CNPJ: {entity.cnpj}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleExportBpaC(munGroup);
                                                            }}
                                                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/40"
                                                            disabled={exportingActionId === 'bpa-c-' + munGroup.municipalityId}
                                                        >
                                                            {exportingActionId === 'bpa-c-' + munGroup.municipalityId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                                                            <span className="hidden sm:inline">BPA-C (Consolidado)</span>
                                                            <span className="sm:hidden">BPA-C</span>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleExportBpaI(munGroup);
                                                            }}
                                                            className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/40"
                                                            disabled={exportingActionId === 'bpa-i-' + munGroup.municipalityId}
                                                        >
                                                            {exportingActionId === 'bpa-i-' + munGroup.municipalityId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                                                            <span className="hidden sm:inline">BPA-I (Individualizado)</span>
                                                            <span className="sm:hidden">BPA-I</span>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setBatchExportMunGroup(munGroup);
                                                                setBatchExportProfessionalName('');
                                                                setIsBatchExportModalOpen(true);
                                                            }}
                                                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/40"
                                                        >
                                                            <Download className="w-4 h-4 mr-2" />
                                                            <span className="hidden sm:inline">Baixar Agrupado</span>
                                                            <span className="sm:hidden">Baixar</span>
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent -mx-2 px-2 min-h-[220px]">
                                                    {munGroup.actions.map((action) => (
                                                        <div key={action.id} className="min-w-[320px] w-[320px] flex-shrink-0">
                                                            <Card className="group h-full relative overflow-hidden transition-all duration-300 hover:shadow-xl dark:bg-gray-800/90 dark:backdrop-blur-sm border-t-4 border-t-emerald-500">
                                                                <div className="p-5 flex flex-col h-full">
                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <div className="flex-1 min-w-0 pr-2">
                                                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate" title={action.name}>
                                                                                {action.name}
                                                                            </h3>
                                                                        </div>
                                                                        <div className="flex flex-col items-end shrink-0">
                                                                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full mb-1 border border-emerald-200 dark:border-emerald-800">
                                                                                {new Date(action.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 mb-6">
                                                                        <div className="flex flex-col p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
                                                                                <Users className="w-3.5 h-3.5" /> Profissionais ({action.professionals?.length || 0})
                                                                            </span>

                                                                            <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 mb-3">
                                                                                {action.professionals?.map((prof, i) => (
                                                                                    <div key={prof.id || i} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-700">
                                                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate pr-2 flex-1" title={prof.name}>{prof.name}</span>
                                                                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded ml-2 shrink-0 truncate max-w-[120px]" title={prof.occupation}>{prof.occupation}</span>
                                                                                    </div>
                                                                                ))}
                                                                                {(!action.professionals || action.professionals.length === 0) && (
                                                                                    <div className="text-xs text-center text-gray-400 py-3">Nenhum profissional listado</div>
                                                                                )}
                                                                            </div>

                                                                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                                                                <div className="flex items-center justify-between text-sm px-1">
                                                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> Procedimentos</span>
                                                                                    <span className="font-bold text-gray-900 dark:text-white">{actionCounts[action.id!]?.procedures || 0}</span>
                                                                                </div>
                                                                                <div className="flex items-center justify-between text-sm px-1">
                                                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Pacientes</span>
                                                                                    <span className="font-bold text-gray-900 dark:text-white">{actionCounts[action.id!]?.patients || 0}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="mt-auto flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                                                        <Button
                                                                            onClick={() => handleOpenProduction(action)}
                                                                            variant="primary"
                                                                            className="flex-1 text-xs shadow-sm hover:shadow-md transition-all active:scale-95"
                                                                        >
                                                                            <Activity className="w-3.5 h-3.5 mr-2" /> Produção
                                                                        </Button>
                                                                        <Button
                                                                            onClick={() => {
                                                                                setActionToExport(action);
                                                                                const comp = action.date.substring(0, 7);

                                                                                // Preselect month bounds
                                                                                const firstDay = `${comp}-01`;

                                                                                // Calculate last day of month
                                                                                const [yearStr, monthStr] = comp.split('-');
                                                                                const lastDayOfMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
                                                                                const lastDay = `${comp}-${lastDayOfMonth}`;

                                                                                setExportPeriod({ start: firstDay, end: lastDay });
                                                                                setIsPeriodExportModalOpen(true);
                                                                            }}
                                                                            variant="outline"
                                                                            className="px-3 shadow-sm border border-gray-200 dark:border-gray-700"
                                                                            disabled={exportingActionId === action.id}
                                                                            title="Exportar Relatório BDPA SUS"
                                                                        >
                                                                            {exportingActionId === action.id ? (
                                                                                <Activity className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                                                                            ) : (
                                                                                <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                                            )}
                                                                        </Button>
                                                                        {(claims?.role === 'MASTER' || isCoordenacao) && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handleOpenActionModal(action)}
                                                                                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                                                                                    title="Editar"
                                                                                >
                                                                                    <Edit2 className="w-4 h-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteAction(action)}
                                                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                                                                                    title="Excluir"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </Card>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}

                {groupedActions.length === 0 && (
                    <div className="text-center py-16 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 dark:text-white">Nenhuma ação registrada</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                            Crie campanhas ou atividades externas para registrar a produção da sua equipe.
                        </p>
                        {(claims?.role === 'MASTER' || isCoordenacao) && (
                            <Button onClick={() => handleOpenActionModal()} variant="secondary" className="mt-6">
                                Criar Primeira Ação
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Create/Edit Action */}
            <Modal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                title={editingActionId ? "Editar Ação" : "Nova Ação / Campanha"}
            >
                <form onSubmit={handleSaveAction} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Input
                            label="Nome da Ação"
                            className="md:col-span-2"
                            value={actionForm.name || ''}
                            onChange={e => setActionForm({ ...actionForm, name: e.target.value })}
                            placeholder="Ex: Campanha de vacinação, Atendimento domiciliar..."
                            required
                        />
                        <Input
                            label="Data de Realização"
                            type="date"
                            value={actionForm.date || ''}
                            onChange={e => setActionForm({ ...actionForm, date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-emerald-500" /> Local de Realização
                            </label>
                            <button
                                type="button"
                                onClick={() => setCustomLocationMode(!customLocationMode)}
                                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline flex items-center gap-1"
                            >
                                <Edit2 className="w-3 h-3" />
                                {customLocationMode ? "Selecionar Município Vinculado" : "Digitar Outro Local"}
                            </button>
                        </div>

                        {customLocationMode ? (
                            <Input
                                label=""
                                placeholder="Digite o nome do local (Ex: Praça Central, Escola...)"
                                value={actionForm.municipalityName || ''}
                                onChange={e => setActionForm({ ...actionForm, municipalityName: e.target.value })}
                                autoFocus
                            />
                        ) : (
                            <Select
                                label=""
                                value={actionForm.municipalityId || ''}
                                onChange={e => setActionForm({ ...actionForm, municipalityId: e.target.value })}
                            >
                                <option value="">Selecione um município...</option>
                                {municipalities.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </Select>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
                            {customLocationMode ? "Este local será salvo apenas como texto." : "Os dados serão sincronizados com o painel do município selecionado."}
                        </p>
                    </div>

                    {/* Professionals Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Equipe Envolvida</label>

                        <div className="relative">
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Buscar profissional por nome..."
                                    value={professionalSearch}
                                    onChange={(e) => {
                                        setProfessionalSearch(e.target.value);
                                        setShowProfessionalDropdown(true);
                                    }}
                                    onFocus={() => setShowProfessionalDropdown(true)}
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-white"
                                />
                                {professionalSearch && (
                                    <button
                                        type="button"
                                        onClick={() => { setProfessionalSearch(""); setShowProfessionalDropdown(false); }}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {showProfessionalDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {(() => {
                                        const combinedList = actionProfessionalsList;
                                        const searchLower = professionalSearch.toLowerCase();

                                        const filteredList = combinedList.filter(p => {
                                            const matchesName = p.name.toLowerCase().includes(searchLower) || (p.cpf && p.cpf.includes(searchLower));
                                            if (!matchesName) return false;

                                            if (!actionForm.municipalityId) return true;

                                            const isGlobal = !p.municipalityId || p.municipalityId === '' || p.municipalityId === 'custom';
                                            const matchesMun = p.municipalityId === actionForm.municipalityId || p.assignments?.some((a: any) => a.municipalityId === actionForm.municipalityId);

                                            return isGlobal || matchesMun;
                                        });

                                        if (filteredList.length === 0) {
                                            return <div className="px-4 py-3 text-sm text-gray-500 text-center">Nenhum profissional encontrado.</div>;
                                        }

                                        return filteredList.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => p.id && handleAddProfessional(p.id)}
                                                className="px-4 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer text-sm text-gray-700 dark:text-gray-200 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                                            >
                                                <div className="font-medium">{p.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{p.occupation || 'Sem CBO'} • CNS: {p.cns || 'N/A'}</div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3 min-h-[40px] p-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                            {actionForm.professionals?.length === 0 && (
                                <span className="text-xs text-gray-400 w-full text-center py-2">Nenhum profissional selecionado</span>
                            )}
                            {actionForm.professionals?.map((p, i) => (
                                <Badge key={i} type="neutral" className="pr-1 flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-200">{p.name}</span>
                                    <span className="opacity-60 text-[10px] text-gray-500 dark:text-gray-400 border-l border-gray-300 dark:border-gray-600 pl-1 ml-1">
                                        {p.occupation}
                                    </span>
                                    <div
                                        className="ml-1 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
                                        onClick={() => handleRemoveProfessional(i)}
                                    >
                                        <X className="w-3 h-3" />
                                    </div>
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Procedures Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Procedimentos Planejados (Opcional)</label>
                        <Button type="button" variant="outline" className="w-full text-left justify-start border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400" onClick={() => setIsSigtapModalOpen(true)}>
                            <Search className="w-4 h-4 mr-2" /> Buscar e Adicionar do SIGTAP...
                        </Button>

                        <div className="space-y-2 mt-3 max-h-48 overflow-y-auto custom-scrollbar">
                            {actionForm.procedures?.length === 0 && (
                                <div className="text-center py-4 text-xs text-gray-500 dark:text-gray-400 italic">
                                    Nenhum procedimento adicionado ainda.
                                </div>
                            )}
                            {actionForm.procedures?.map((proc, i) => (
                                <div key={i} className="flex justify-between items-center text-sm p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm group hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-colors">
                                    <span className="truncate flex-1 text-gray-700 dark:text-gray-200" title={proc.name}>
                                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded text-xs mr-2">
                                            {proc.code}
                                        </strong>
                                        {proc.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveProcedure(i)}
                                        className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors p-1"
                                        title="Remover"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="outline" onClick={() => setIsActionModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="secondary">Salvar Ação</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isProductionModalOpen}
                onClose={() => {
                    setIsProductionModalOpen(false);
                    setEditingProductionPatientId(null);
                }}
                title={`Registrar Produção: ${selectedAction?.name}`}
                className="max-w-7xl w-full"
            >
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Form Side */}
                    <form onSubmit={handleRegisterProduction} className="space-y-6 lg:col-span-3">
                        {editingProductionPatientId ? (
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-sm text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/50 flex items-start gap-3 shadow-sm">
                                <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                                <div>
                                    <strong className="font-bold flex items-center gap-1.5"><Edit2 className="w-4 h-4" /> Modo de Edição Ativo</strong>
                                    <p className="mt-1">
                                        Os dados do paciente foram recarregados no formulário abaixo. Faça as alterações desejadas nos
                                        <b> procedimentos</b> ou profissionais e clique em "Salvar Edição" lá no final da tela.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-sm text-emerald-800 dark:text-emerald-200 border border-emerald-100 dark:border-emerald-800/50 flex items-start gap-3">
                                <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <p>
                                    <strong className="font-bold">Lançamento Simplificado:</strong> Preencha os dados do paciente para vincular diretamente ao procedimento selecionado.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-5">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Competência <span className="text-red-500">*</span>
                                </label>
                                <div className="flex bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                                    <div className="flex items-center justify-center px-3 bg-gray-100 dark:bg-gray-700 border-r border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="YYYYMM"
                                        value={productionForm.competence || ''}
                                        onChange={e => setProductionForm({ ...productionForm, competence: e.target.value })}
                                        maxLength={6}
                                        required
                                        className="w-full px-4 py-2 bg-transparent text-gray-900 dark:text-white font-mono text-lg font-bold focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col justify-end">
                                <Button type="button" variant="primary" onClick={() => setIsPatientModalOpen(true)} className="h-[42px] mb-2 shadow-sm flex items-center justify-center gap-2">
                                    <User className="w-4 h-4" /> Cadastrar Paciente
                                </Button>
                            </div>

                            {/* Procedure Date */}
                            <div className="col-span-2 relative bg-white dark:bg-gray-800 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 shadow-sm mt-2">
                                <Input
                                    type="date"
                                    label="Data do Procedimento"
                                    value={productionForm.attendanceDate || ''}
                                    onChange={e => setProductionForm({ ...productionForm, attendanceDate: e.target.value })}
                                    required
                                    className="dark:text-white dark:bg-gray-800 text-lg font-bold"
                                />
                                <div className="absolute top-4 right-5 text-emerald-500/20">
                                    <Calendar className="w-10 h-10" />
                                </div>
                            </div>
                        </div>

                        {/* Professional Selection */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative">
                            <Select
                                label="Profissional Responsável pelo Atendimento"
                                value={productionForm.professionalId || ''}
                                onChange={e => setProductionForm({ ...productionForm, professionalId: e.target.value })}
                                required
                                className="dark:text-white dark:bg-gray-800"
                            >
                                <option value="">Selecione o profissional...</option>
                                {(selectedAction?.professionals || []).map(p => (
                                    <option key={p.id} value={p.id}>{p.name} - {p.cbo_description}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="space-y-5 p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-inner relative">
                            <h4 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                                <Search className="w-4 h-4 text-emerald-500" /> Buscar Paciente
                            </h4>

                            <div className="relative">
                                <Input
                                    label="Buscar na base do município"
                                    placeholder="Digite o Nome, CNS ou CPF..."
                                    value={patientSearchQuery}
                                    onChange={(e) => handlePatientSearch(e.target.value)}
                                    className="dark:text-white dark:bg-gray-800"
                                    onFocus={() => { if (patientSearchResults.length > 0) setShowPatientDropdown(true) }}
                                    onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                                    autoComplete="off"
                                />
                                {isSearchingPatient && (
                                    <div className="absolute right-3 top-9">
                                        <Activity className="w-5 h-5 text-emerald-500 animate-spin" />
                                    </div>
                                )}

                                <AnimatePresence>
                                    {showPatientDropdown && patientSearchResults.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto"
                                        >
                                            {patientSearchResults.map((person) => (
                                                <div
                                                    key={person.id}
                                                    onClick={() => handleSelectPatient(person)}
                                                    className="p-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-colors"
                                                >
                                                    <div className="font-bold text-gray-800 dark:text-gray-100">{person.name}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                                        {person.cpf && <span>CPF: {person.cpf}</span>}
                                                        {person.cns && <span>CNS: {person.cns}</span>}
                                                        {person.birthDate && <span>Nasc: {new Date(person.birthDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Selected Patient Display */}
                            {productionForm.patient?.name && (
                                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl border-l-4 border-emerald-500 shadow-sm flex justify-between items-center">
                                    <div>
                                        <h5 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            {productionForm.patient.name}
                                        </h5>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex gap-3">
                                            {productionForm.patient?.cpf && <span>CPF: {productionForm.patient?.cpf}</span>}
                                            {productionForm.patient?.cns && <span>CNS: {productionForm.patient?.cns}</span>}
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setProductionForm(prev => ({ ...prev, patient: { name: '', cns: '', cpf: '', birthDate: '', sex: 'M' } }));
                                            setPatientSearchQuery('');
                                        }}
                                        className="text-xs px-3"
                                    >
                                        Trocar
                                    </Button>
                                </div>
                            )}

                            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-5">
                                <div className="flex justify-between items-center mb-4">
                                    <h5 className="text-sm font-bold tracking-wider text-gray-700 dark:text-gray-300">
                                        Procedimentos Realizados <span className="text-red-500">*</span>
                                    </h5>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsSigtapModalOpen(true)}
                                        className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                                    >
                                        <Activity className="w-3.5 h-3.5 mr-1.5" /> Adicionar SIGTAP
                                    </Button>
                                </div>

                                {/* Inline SIGTAP Search */}
                                <div className="relative mb-5 border-b border-gray-100 dark:border-gray-800 pb-5">
                                    <Input
                                        label="Busca Rápida de Procedimentos"
                                        placeholder="Digite o código ou nome do procedimento..."
                                        value={procedureSearchQuery}
                                        onChange={(e) => handleProcedureSearch(e.target.value)}
                                        className="dark:text-white dark:bg-gray-800"
                                        onFocus={() => { if (procedureSearchResults.length > 0 && procedureSearchQuery.length >= 3) setShowProcedureDropdown(true) }}
                                        onBlur={() => setTimeout(() => setShowProcedureDropdown(false), 200)}
                                        autoComplete="off"
                                    />
                                    {isSearchingProcedures && (
                                        <div className="absolute right-3 top-9">
                                            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                                        </div>
                                    )}

                                    <AnimatePresence>
                                        {showProcedureDropdown && procedureSearchResults.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="relative z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 max-h-[500px] overflow-y-auto"
                                            >
                                                {procedureSearchResults.map((proc) => (
                                                    <div
                                                        key={proc.code}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            handleSelectProcedureFromSearch(proc);
                                                        }}
                                                        className="p-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-colors flex justify-between items-center group"
                                                    >
                                                        <div className="flex-1 pr-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-mono text-xs font-bold bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                                                                    {proc.code}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm font-medium text-gray-800 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                                                                {proc.name}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 mt-1">
                                                                Idade: {(proc.ageMin / 12).toFixed(0)}-{(proc.ageMax / 12).toFixed(0)}a • Sexo: {proc.sex} • Pontos: {proc.points}
                                                            </div>
                                                        </div>
                                                        <Plus className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-transform hover:scale-110" />
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {productionForm.procedures && productionForm.procedures.length > 0 ? (
                                    <div className="space-y-2">
                                        {productionForm.procedures.map((proc, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm shadow-sm group">
                                                <div className="flex-1 truncate pr-3">
                                                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200 mr-2">{proc.code}</span>
                                                    <span className="text-gray-600 dark:text-gray-400 truncate">{proc.name}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="99"
                                                        value={(proc as any).quantity !== undefined ? (proc as any).quantity : 1}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            const newProcs = [...productionForm.procedures!];
                                                            if (val === '') {
                                                                (newProcs[idx] as any).quantity = '';
                                                            } else {
                                                                (newProcs[idx] as any).quantity = parseInt(val);
                                                            }
                                                            setProductionForm({ ...productionForm, procedures: newProcs });
                                                        }}
                                                        onBlur={() => {
                                                            const newProcs = [...productionForm.procedures!];
                                                            if (!(newProcs[idx] as any).quantity || (newProcs[idx] as any).quantity < 1) {
                                                                (newProcs[idx] as any).quantity = 1;
                                                                setProductionForm({ ...productionForm, procedures: newProcs });
                                                            }
                                                        }}
                                                        className="w-14 h-7 text-center text-sm border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 focus:ring-emerald-500 focus:border-emerald-500 mr-2 dark:text-white"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveProcedure(idx)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shrink-0"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/20">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum procedimento adicionado para este paciente.</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Clique em "Adicionar SIGTAP" para buscar.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {editingProductionPatientId ? (
                            <div className="flex gap-2 w-full mt-4">
                                <Button type="button" variant="outline" className="flex-1 h-12 text-gray-500 rounded-xl" onClick={handleCancelEditProduction}>
                                    Cancelar
                                </Button>
                                <Button type="submit" variant="primary" className="flex-1 h-12 text-lg font-bold shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all rounded-xl" style={{ backgroundColor: '#6366f1' }}>
                                    <CheckCircle className="w-5 h-5 mr-2" /> Salvar Edição
                                </Button>
                            </div>
                        ) : (
                            <Button type="submit" variant="secondary" className="w-full h-12 text-lg font-bold shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all mt-4 rounded-xl">
                                <CheckCircle className="w-5 h-5 mr-2" /> Registrar Atendimento
                            </Button>
                        )}
                    </form>

                    {/* History Side */}
                    <div className="border-l border-gray-100 dark:border-gray-700 lg:col-span-2 hidden lg:block relative min-h-[550px]">
                        <div className="absolute inset-0 flex flex-col pl-8">
                            <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100 shrink-0">
                                <Clock className="w-5 h-5 text-gray-400" /> Registros
                            </h4>
                            <div className="space-y-4 overflow-y-auto pr-3 custom-scrollbar flex-1 min-h-0 pb-4">
                                {productionHistory.map(prod => (
                                    <details key={prod.id} className={`p-4 ${prod.isDeleted ? 'bg-gray-100 dark:bg-gray-800/40 opacity-75 grayscale-[50%]' : 'bg-white dark:bg-gray-800/80'} border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all hover:shadow-md group cursor-pointer [&_summary::-webkit-details-marker]:hidden`}>
                                        <summary className="font-bold text-base text-gray-900 dark:text-white mb-2 list-none flex items-center gap-2" title={prod.patient.name}>
                                            <div className="flex items-center gap-1.5 group/patient flex-1 min-w-0">
                                                <span className={`truncate flex-1 ${prod.isDeleted ? 'line-through text-gray-500' : ''}`}>{prod.patient.name}</span>
                                                {prod.isDeleted && <Badge type="error" className="ml-2 text-[10px] shrink-0">Excluído</Badge>}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleOpenEditPatient(prod);
                                                    }}
                                                    className="flex-shrink-0 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                    title="Editar dados cadastrais básicos deste Paciente"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                            <ChevronDown className="flex-shrink-0 w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                                        </summary>
                                        <div className="grid grid-cols-1 gap-y-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">Identificação:</span>
                                                <span className="font-mono text-xs">{prod.patient.cns || prod.patient.cpf || 'Não informada'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-medium">Nascimento:</span>
                                                <span>
                                                    {prod.patient.birthDate ? new Date(prod.patient.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                            <h6 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Procedimentos ({prod.procedures?.length || 0})</h6>
                                            <div className="flex flex-wrap gap-2">
                                                {(prod.procedures || []).map((proc, i) => (
                                                    <span key={i} className="text-[11px] font-bold tracking-wide bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60" title={proc.name}>
                                                        {proc.code} {proc.name && <span className="font-medium opacity-80 mx-1">-</span>} <span className="font-medium opacity-80">{proc.name}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-3 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                {!prod.isDeleted && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleEditProduction(e, prod)}
                                                            className="text-[11px] font-medium text-indigo-500 hover:text-indigo-700 flex items-center gap-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded"
                                                            title="Editar este lançamento (Alterar quantidade, profissionais, procedimentos)"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" /> Editar Lançamento
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteProduction(e, prod)}
                                                            className="text-[11px] font-medium text-red-500 hover:text-red-700 flex items-center gap-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 px-2 py-1 rounded"
                                                            title="Excluir este registro"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {prod.attendanceDate
                                                    ? prod.attendanceDate.split('-').reverse().join('/')
                                                    : (prod.createdAt ? new Date(prod.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : '-')}
                                            </span>
                                        </div>
                                    </details>
                                ))}
                                {productionHistory.length === 0 && (
                                    <div className="text-center py-12 flex flex-col items-center justify-center h-full opacity-60">
                                        <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum registro ainda</p>
                                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Os atendimentos aparecerão aqui</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal: Cadastrar Paciente */}
            <SidePanel
                isOpen={isPatientModalOpen}
                onClose={() => setIsPatientModalOpen(false)}
                title="Cadastrar Novo Paciente"
            >
                <form onSubmit={handleSaveNewPatient} className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 flex rounded-lg mb-4 text-sm text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-800/50 items-start gap-2">
                        <Info className="w-5 h-5 shrink-0" />
                        <p>Este paciente ficará salvo na base da Entidade para uso futuro rápido.</p>
                    </div>

                    <Input
                        label="Nome Completo"
                        value={patientForm.name || ''}
                        onChange={e => setPatientForm({ ...patientForm, name: e.target.value })}
                        required
                        className="dark:text-white dark:bg-gray-800"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="CPF"
                            value={patientForm.cpf || ''}
                            onChange={e => setPatientForm({ ...patientForm, cpf: e.target.value })}
                            maxLength={14}
                            placeholder="Apenas números"
                            className="dark:text-white dark:bg-gray-800"
                        />
                        <Input
                            label="CNS (Cartão SUS)"
                            value={patientForm.cns || ''}
                            onChange={e => setPatientForm({ ...patientForm, cns: e.target.value })}
                            maxLength={15}
                            placeholder="15 dígitos"
                            className="dark:text-white dark:bg-gray-800"
                        />
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-500 text-right -mt-2 mb-2">*Obrigatório informar CPF ou CNS</p>

                    <Input
                        label="Data de Nascimento"
                        type="date"
                        value={patientForm.birthDate || ''}
                        onChange={e => setPatientForm({ ...patientForm, birthDate: e.target.value })}
                        className="dark:text-white dark:bg-gray-800"
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                        <Button type="button" variant="outline" onClick={() => setIsPatientModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="primary">Salvar Paciente</Button>
                    </div>
                </form>
            </SidePanel>

            <SigtapBrowserModal
                isOpen={isSigtapModalOpen}
                onClose={() => setIsSigtapModalOpen(false)}
                onSelect={handleAddProcedure}
            />

            {/* Modal: Base de Profissionais */}
            <SidePanel
                isOpen={isProfessionalBaseModalOpen}
                onClose={() => setIsProfessionalBaseModalOpen(false)}
                title="Base de Profissionais (Ações e Programas)"
                className="max-w-4xl w-full sm:w-[85vw]"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Esta é a base exclusiva de profissionais que atuam nas campanhas e ações externas, divididos por município.
                    </p>

                    <Input
                        label="Buscar Profissional"
                        placeholder="Nome, CPF ou CBO..."
                        value={profBaseSearch}
                        onChange={e => setProfBaseSearch(e.target.value)}
                        className="dark:text-white dark:bg-gray-800 mb-2"
                    />

                    <div className="flex justify-end mb-4">
                        <Button type="button" onClick={() => {
                            if (isCreatingProfessional) {
                                setIsCreatingProfessional(false);
                                setBaseProfForm({ id: '', name: '', cns: '', cpf: '', conselho: '', occupation: '', email: '', phone: '', municipalityId: '' });
                            } else {
                                setIsCreatingProfessional(true);
                                setBaseProfForm({ id: '', name: '', cns: '', cpf: '', conselho: '', occupation: '', email: '', phone: '', municipalityId: '' });
                            }
                        }} size="sm" variant={isCreatingProfessional ? 'outline' : 'secondary'}>
                            {isCreatingProfessional ? "Cancelar" : "+ Novo Profissional"}
                        </Button>
                    </div>

                    {isCreatingProfessional && (
                        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-200 dark:border-gray-700 mb-8 space-y-6 shadow-md">
                            <div className="pb-4 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{baseProfForm.id ? "Editar Profissional da Base" : "Cadastro de Profissional na Base"}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Preencha os dados abaixo. Itens com * são obrigatórios.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
                                <Input label="Nome Completo *" placeholder="Obrigatório" value={baseProfForm.name} onChange={e => setBaseProfForm({ ...baseProfForm, name: e.target.value })} />
                                <Input label="CPF *" placeholder="Obrigatório" value={baseProfForm.cpf} onChange={e => setBaseProfForm({ ...baseProfForm, cpf: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 md:gap-6">
                                <div className="sm:col-span-1">
                                    <Input label="CNS (Cartão SUS)" placeholder="Opcional" value={baseProfForm.cns} onChange={e => setBaseProfForm({ ...baseProfForm, cns: e.target.value })} />
                                </div>
                                <div className="flex flex-col sm:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">CBO (OCUPAÇÃO)</label>
                                    <input
                                        list="cbo-list-actions"
                                        value={baseProfForm.occupation}
                                        onChange={e => setBaseProfForm({ ...baseProfForm, occupation: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                                        placeholder="Buscar..."
                                    />
                                    <datalist id="cbo-list-actions">
                                        {CBO_LIST.map((group) => group.options.map(opt => <option key={opt.value} value={opt.label} />))}
                                    </datalist>
                                </div>
                                <div className="sm:col-span-1">
                                    <Input label="Conselho (Ex: CRM)" placeholder="Opcional" value={baseProfForm.conselho} onChange={e => setBaseProfForm({ ...baseProfForm, conselho: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
                                <Select label="Município Lotação / Atuação" value={baseProfForm.municipalityId} onChange={e => setBaseProfForm({ ...baseProfForm, municipalityId: e.target.value })}>
                                    <option value="">Geral / Opcional...</option>
                                    {municipalities.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </Select>
                                <Input label="E-mail" type="email" placeholder="Opcional" value={baseProfForm.email} onChange={e => setBaseProfForm({ ...baseProfForm, email: e.target.value })} />
                                <Input label="Telefone / WhatsApp" placeholder="Opcional" value={baseProfForm.phone} onChange={e => setBaseProfForm({ ...baseProfForm, phone: e.target.value })} />
                            </div>

                            <div className="flex justify-end pt-6">
                                <Button type="button" onClick={handleCreateBaseProfessional} disabled={isSavingManualProf} size="sm" className="px-6 w-full sm:w-auto shadow-sm flex items-center justify-center gap-2">
                                    {isSavingManualProf ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                                    ) : (
                                        "Salvar na Base"
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {!isCreatingProfessional && (
                        <div className="space-y-6">
                            {(() => {
                                // Filter
                                const filtered = actionProfessionalsList.filter(p =>
                                    p.name.toLowerCase().includes(profBaseSearch.toLowerCase()) ||
                                    p.cpf?.includes(profBaseSearch) ||
                                    p.occupation?.toLowerCase().includes(profBaseSearch.toLowerCase())
                                );

                                // Group by municipality
                                const groupedByMun = filtered.reduce((acc, prof) => {
                                    const mId = prof.municipalityId || 'custom';
                                    if (!acc[mId]) acc[mId] = [];
                                    acc[mId].push(prof);
                                    return acc;
                                }, {} as Record<string, ActionProfessionalBase[]>);

                                if (filtered.length === 0) {
                                    return (
                                        <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                            <p className="text-gray-500">Nenhum profissional encontrado.</p>
                                        </div>
                                    );
                                }

                                return (Object.entries(groupedByMun) as [string, ActionProfessionalBase[]][]).map(([munId, profs]) => {
                                    let munName = 'Outros Locais / Não Informado';
                                    if (munId !== 'custom') {
                                        const mun = municipalities.find(m => m.id === munId);
                                        if (mun) munName = mun.name;
                                    }

                                    return (
                                        <div key={munId} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                            <div className="bg-gray-100 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-emerald-600" />
                                                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{munName}</h3>
                                                <Badge type="neutral" className="ml-auto text-xs">{profs.length}</Badge>
                                            </div>
                                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {profs.map(prof => (
                                                    <div key={prof.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center group">
                                                        <div>
                                                            <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                                {prof.name}
                                                                {prof.conselho && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">{prof.conselho}</span>}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                                                <span><strong className="font-medium text-gray-600 dark:text-gray-300">CPF:</strong> {prof.cpf}</span>
                                                                {prof.cns && <span><strong className="font-medium text-gray-600 dark:text-gray-300">CNS:</strong> {prof.cns}</span>}
                                                                <span><strong className="font-medium text-gray-600 dark:text-gray-300">CBO:</strong> {prof.occupation}</span>
                                                            </div>
                                                            {(prof.email || prof.phone) && (
                                                                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex gap-3">
                                                                    {prof.email && <span>E-mail: {prof.email}</span>}
                                                                    {prof.phone && <span>Tel: {prof.phone}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex opacity-0 group-hover:opacity-100 transition-all">
                                                            <button
                                                                onClick={() => handleAttachSignature(prof)}
                                                                className={`p-2 rounded-lg transition-all ${prof.signatureUrl ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'}`}
                                                                title={prof.signatureUrl ? "Ver/Alterar Assinatura" : "Anexar Assinatura Digitalizada"}
                                                                disabled={uploadingSignatureId === prof.id}
                                                            >
                                                                {uploadingSignatureId === prof.id ? (
                                                                    <Activity className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <FileSignature className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setBaseProfForm({
                                                                        id: prof.id || '',
                                                                        name: prof.name,
                                                                        cpf: prof.cpf,
                                                                        cns: prof.cns || '',
                                                                        conselho: prof.conselho || '',
                                                                        occupation: prof.occupation || '',
                                                                        email: prof.email || '',
                                                                        phone: prof.phone || '',
                                                                        municipalityId: prof.municipalityId || ''
                                                                    });
                                                                    setIsCreatingProfessional(true);
                                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                }}
                                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                                                title="Editar Profissional"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => prof.id && handleDeleteActionProfessional(prof.id)}
                                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                                                title="Remover Profissional"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>
                {renderSignatureModal()}
            </SidePanel>

            {/* Quick Patient Edit Modal Overlay within the Actions Context */}
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
                                    Atualize o cadastro base do paciente diretamente pela ação.
                                </p>
                            </div>

                            <div className="p-5 space-y-4">
                                <Input
                                    label="Nome Completo"
                                    value={patientToEdit.name || ''}
                                    onChange={(e) => setPatientToEdit({ ...patientToEdit, name: e.target.value })}
                                    className="dark:text-white dark:bg-gray-800"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="CNS (Cartão SUS)"
                                        value={patientToEdit.cns || ''}
                                        onChange={(e) => setPatientToEdit({ ...patientToEdit, cns: e.target.value })}
                                        className="dark:text-white dark:bg-gray-800"
                                    />
                                    <Input
                                        label="CPF"
                                        value={patientToEdit.cpf || ''}
                                        onChange={(e) => setPatientToEdit({ ...patientToEdit, cpf: e.target.value })}
                                        className="dark:text-white dark:bg-gray-800"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Nascimento"
                                        type="date"
                                        value={patientToEdit.dob || ''}
                                        onChange={(e) => setPatientToEdit({ ...patientToEdit, dob: e.target.value })}
                                        className="dark:text-white dark:bg-gray-800"
                                    />
                                    <Select
                                        label="Sexo"
                                        value={patientToEdit.sex || ''}
                                        onChange={(e) => setPatientToEdit({ ...patientToEdit, sex: e.target.value })}
                                        options={[
                                            { value: '', label: 'Selecionar' },
                                            ...[
                                                { value: 'M', label: 'Masculino' },
                                                { value: 'F', label: 'Feminino' },
                                                { value: 'I', label: 'Ignorado' }
                                            ]
                                        ]}
                                    />
                                </div>
                                <Input
                                    label="Telefone / Contato"
                                    value={patientToEdit.phone || ''}
                                    onChange={(e) => setPatientToEdit({ ...patientToEdit, phone: e.target.value })}
                                    className="dark:text-white dark:bg-gray-800"
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

            <Modal
                isOpen={isPeriodExportModalOpen}
                onClose={() => {
                    setIsPeriodExportModalOpen(false);
                    setActionToExport(null);
                }}
                title="Período do Relatório"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">Selecione o período de produção para gerar o relatório BDPA. As datas devem estar dentro da competência da ação ({actionToExport?.date.substring(0, 7)}).</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Data Início
                            </label>
                            <Input
                                type="date"
                                value={exportPeriod.start}
                                min={actionToExport ? `${actionToExport.date.substring(0, 7)}-01` : undefined}
                                max={actionToExport ? `${actionToExport.date.substring(0, 7)}-31` : undefined}
                                onChange={(e) => setExportPeriod({ ...exportPeriod, start: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Data Fim
                            </label>
                            <Input
                                type="date"
                                value={exportPeriod.end}
                                min={actionToExport ? `${actionToExport.date.substring(0, 7)}-01` : undefined}
                                max={actionToExport ? `${actionToExport.date.substring(0, 7)}-31` : undefined}
                                onChange={(e) => setExportPeriod({ ...exportPeriod, end: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 gap-3">
                        <Button variant="ghost" onClick={() => setIsPeriodExportModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => {
                                if (actionToExport) {
                                    setIsPeriodExportModalOpen(false);
                                    handleExportActionReport(actionToExport, exportPeriod.start, exportPeriod.end);
                                }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Download size={16} className="mr-2" />
                            Gerar Relatório
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isBatchExportModalOpen}
                onClose={() => setIsBatchExportModalOpen(false)}
                title="Relatório Agrupado de Ações"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                        {batchExportMunGroup ? `Selecione o(a) profissional para gerar o boletim integrado de produções contidas nesta competência.` : 'Selecione o profissional.'}
                    </p>

                    <div>
                        <Select
                            label="Profissional"
                            value={batchExportProfessionalName}
                            onChange={(e) => setBatchExportProfessionalName(e.target.value)}
                        >
                            <option value="">Todos os Profissionais na listagem</option>
                            {batchExportMunGroup && Array.from(new Map(
                                batchExportMunGroup.actions.flatMap((a: any) => a.professionals || []).map((p: any) => [p.name, p])
                            ).values()).map((p: any) => (
                                <option key={p.name} value={p.name}>
                                    {p.name} - {p.occupation ? p.occupation : 'CBO Variado'}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="flex justify-end pt-4 gap-3">
                        <Button variant="ghost" onClick={() => setIsBatchExportModalOpen(false)} disabled={isExportingBatch}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleExportBatchActions}
                            isLoading={isExportingBatch}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Download size={16} className="mr-2" />
                            Gerar Relatório Agrupado
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Hidden File Input for Signatures */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileChange}
            />
        </div>
    );
};

export default ActionsAndPrograms;
