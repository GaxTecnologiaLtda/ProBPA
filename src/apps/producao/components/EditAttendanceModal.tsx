import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2, AlertTriangle, User, Stethoscope, Undo2, Loader2, Search } from 'lucide-react';
import { Button, Input, Badge, cn } from './ui/BaseComponents';
import { SigtapTreeSelector } from './SigtapTreeSelector';
import { ProductionRecord } from '../types';
import { softDeleteBpaRecord } from '../services/bpaService';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, limit, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AppContext } from '../context';

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

interface EditAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    attendanceRecords: ProductionRecord[];
    onSaveSuccess: () => void;
    overrideContextData?: {
        entityId: string;
        municipalityId: string;
        entityType: string;
        professionalId: string;
        source?: string;
    };
}

interface ProcedureItem {
    id: string;
    code: string;
    name: string;
    quantity: number;
    status: 'active' | 'canceled' | 'pending_add' | 'pending_remove';
    originalRecord?: ProductionRecord;
    cidCodes?: string[];
}

export const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({ isOpen, onClose, attendanceRecords, onSaveSuccess, overrideContextData }) => {
    const appCtx = useContext(AppContext);
    const user = appCtx?.user || null;
    const [patientName, setPatientName] = useState('');
    const [patientCns, setPatientCns] = useState('');
    const [patientCpf, setPatientCpf] = useState('');

    const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
    
    // Core Identity/Structural State
    const [patientId, setPatientId] = useState('');
    const [attendanceDate, setAttendanceDate] = useState('');
    const [competence, setCompetence] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    
    // Procedure Quantities State for pending adds
    const [pendingQuantity, setPendingQuantity] = useState(1);
    const [selectedNewProc, setSelectedNewProc] = useState<any>(null);

    // Patient Search State
    const debouncedCns = useDebounce(patientCns, 500);
    const debouncedCpf = useDebounce(patientCpf, 500);
    const debouncedName = useDebounce(patientName, 500);
    const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);
    const [showPatientSuggestions, setShowPatientSuggestions] = useState<'cns' | 'cpf' | 'name' | null>(null);
    const [patientFound, setPatientFound] = useState(true);

    const baseRecord = attendanceRecords[0];

    useEffect(() => {
        if (isOpen && attendanceRecords.length > 0) {
            const firstValid = attendanceRecords.find(r => r.patientName) || attendanceRecords[0];
            setPatientName(firstValid.patientName || '');
            setPatientCns(firstValid.patientCns || '');
            setPatientCpf(firstValid.patientCpf || '');
            setPatientFound(true);
            
            // Extract patientId from firestore path
            let extractPatientId = '';
            if (firstValid.firestorePath) {
                const parts = firstValid.firestorePath.split('/');
                const pIdx = parts.indexOf('pacientes');
                if (pIdx > -1 && parts.length > pIdx + 1) {
                    extractPatientId = parts[pIdx + 1];
                }
            }
            setPatientId(extractPatientId || firstValid.patientId || 'unknown_patient');
            setAttendanceDate(firstValid.date || '');
            
            // Extract competence from firestorePath
            let extractCompetence = '';
            if (firstValid.firestorePath) {
                const parts = firstValid.firestorePath.split('/');
                const compIdx = parts.indexOf('competencias');
                if (compIdx > -1 && parts.length > compIdx + 1) {
                    extractCompetence = parts[compIdx + 1];
                }
            }
            if (!extractCompetence && firstValid.date) {
                extractCompetence = firstValid.date.substring(0, 7);
            }
            setCompetence(extractCompetence);
            
            setProcedures(attendanceRecords.map(r => ({
                id: r.id,
                code: r.procedure.code,
                name: r.procedure.name,
                quantity: r.quantity,
                status: r.status === 'canceled' ? 'canceled' : 'active',
                originalRecord: r,
                cidCodes: r.cidCodes
            })));
        }
    }, [isOpen, attendanceRecords]);

    // Patient Search Effect
    useEffect(() => {
        async function searchPatient() {
            const termCns = debouncedCns.replace(/\D/g, '');
            const termCpf = debouncedCpf.replace(/\D/g, '');
            const termName = debouncedName.trim().toUpperCase();

            // Skip search if we just populated from an existing record (patientFound=true)
            // Or if term is too small
            if (patientFound || (termCns.length < 3 && termCpf.length < 3 && termName.length < 3)) {
                setPatientSuggestions([]);
                setShowPatientSuggestions(null);
                return;
            }

            try {
                let patientsRef;
                let legacyRef = collection(db, 'patients');
                const entityId = overrideContextData?.entityId || user?.entityId;
                // Safely grab municipalityId context, prioritizing user context, falling back to potential record info if possible (though baseRecord doesn't explicitly guarantee municipalityId at root interface level)
                const municipalityId = overrideContextData?.municipalityId || user?.municipalityId || (baseRecord as any)?.municipalityId || (baseRecord?.firestorePath?.includes('/municipalities/') ? baseRecord.firestorePath.split('/')[3] : null);
                const entityType = overrideContextData?.entityType || user?.entityType || 'PUBLIC';

                if (entityId && municipalityId) {
                    const type = (entityType === 'Privada' || entityType === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';
                    patientsRef = collection(db, `municipalities/${type}/${entityId}/${municipalityId}/patients`);
                } else {
                    patientsRef = legacyRef;
                }

                let qScoped;
                let qLegacy;
                let type: 'cns' | 'cpf' | 'name' | null = null;

                if (termCns.length >= 3) {
                    type = 'cns';
                    qScoped = query(patientsRef, where('cns', '>=', termCns), where('cns', '<=', termCns + '\uf8ff'), limit(5));
                    if (patientsRef !== legacyRef) qLegacy = query(legacyRef, where('cns', '>=', termCns), where('cns', '<=', termCns + '\uf8ff'), limit(5));
                } else if (termCpf.length >= 3) {
                    type = 'cpf';
                    qScoped = query(patientsRef, where('cpf', '>=', termCpf), where('cpf', '<=', termCpf + '\uf8ff'), limit(5));
                    if (patientsRef !== legacyRef) qLegacy = query(legacyRef, where('cpf', '>=', termCpf), where('cpf', '<=', termCpf + '\uf8ff'), limit(5));
                } else if (termName.length >= 3) {
                    type = 'name';
                    qScoped = query(patientsRef, where('name', '>=', termName), where('name', '<=', termName + '\uf8ff'), limit(5));
                    if (patientsRef !== legacyRef) qLegacy = query(legacyRef, where('name', '>=', termName), where('name', '<=', termName + '\uf8ff'), limit(5));
                }

                if (type) {
                    const scopedSnap = qScoped ? await getDocs(qScoped) : null;
                    const legacySnap = qLegacy ? await getDocs(qLegacy) : null;

                    const resultsMap = new Map();
                    if (scopedSnap) scopedSnap.docs.forEach(doc => resultsMap.set(doc.id, { id: doc.id, ...(doc.data() as any) }));
                    if (legacySnap) legacySnap.docs.forEach(doc => {
                        if (!resultsMap.has(doc.id)) resultsMap.set(doc.id, { id: doc.id, ...(doc.data() as any) });
                    });

                    setPatientSuggestions(Array.from(resultsMap.values()).slice(0, 5));
                    setShowPatientSuggestions(type);
                }
            } catch (err) {
                console.error("Error searching patient:", err);
            }
        }
        searchPatient();
    }, [debouncedCns, debouncedCpf, debouncedName, patientFound, user, baseRecord]);

    const handleSelectPatient = (patient: any) => {
        setPatientName(patient.name || patient.patientName || '');
        setPatientCns(patient.cns || '');
        setPatientCpf(patient.cpf || '');
        setPatientId(patient.id);
        setPatientFound(true);
        setShowPatientSuggestions(null);
        setPatientSuggestions([]);
    };

    const handleQuantityChange = (id: string, delta: number) => {
        setProcedures(prev => prev.map(p => {
            if (p.id === id) {
                const newQuantity = Math.max(1, p.quantity + delta);
                return { ...p, quantity: newQuantity };
            }
            return p;
        }));
    };

    const handleRemove = (id: string) => {
        setProcedures(prev => prev.map(p => {
            if (p.id === id) {
                return { ...p, status: p.status === 'pending_add' ? 'canceled' : 'pending_remove' };
            }
            return p;
        }).filter(p => !(p.id === id && p.status === 'canceled' && !p.originalRecord))); // Remove immediately if it was just pending_add
    };

    const handleUndoRemove = (id: string) => {
        setProcedures(prev => prev.map(p => 
            p.id === id && p.status === 'pending_remove' ? { ...p, status: 'active' } : p
        ));
    };

    const handleProcedureSelect = (proc: any) => {
        setSelectedNewProc(proc);
        setPendingQuantity(1);
    };

    const confirmAddProcedure = () => {
        if (!selectedNewProc) return;
        
        const newItem: ProcedureItem = {
            id: `temp_${Date.now()}`,
            code: selectedNewProc.code,
            name: selectedNewProc.name,
            quantity: pendingQuantity,
            status: 'pending_add'
        };

        setProcedures(prev => [newItem, ...prev]);
        setSelectedNewProc(null);
        setIsSelectorOpen(false);
    };

    const handleSave = async () => {
        if (procedures.length === 0 || (!user && !overrideContextData) || attendanceRecords.length === 0) return;
        setIsSaving(true);
        
        try {
            const dateChanged = attendanceDate !== baseRecord.date;
            
            // Re-extract original patient ID specifically from path to ensure robust comparison 
            // (since baseRecord.patientId might be missing on some interfaces)
            let currentPathPatientId = baseRecord.patientId || '';
            let currentPathCompetence = '';
            if (baseRecord.firestorePath) {
                const pParts = baseRecord.firestorePath.split('/');
                const pIdx = pParts.indexOf('pacientes');
                if (pIdx > -1 && pParts.length > pIdx + 1) currentPathPatientId = pParts[pIdx + 1];
                const compIdx = pParts.indexOf('competencias');
                if (compIdx > -1 && pParts.length > compIdx + 1) currentPathCompetence = pParts[compIdx + 1];
            }
            
            const patientIdChanged = patientId !== currentPathPatientId;
            const competenceChanged = competence !== currentPathCompetence;
            const needsMove = dateChanged || patientIdChanged || competenceChanged;

            const nameChanged = patientName !== baseRecord.patientName;
            const cnsChanged = patientCns !== baseRecord.patientCns;
            const cpfChanged = patientCpf !== baseRecord.patientCpf;
            const patientDataChanged = nameChanged || cnsChanged || cpfChanged;

            // Define Target Collection Path for Additions/Moves
            let targetCollectionPath = '';
            const pathParts = baseRecord.firestorePath?.split('/');
            
            if (pathParts && pathParts.length > 0) {
                if (needsMove) {
                    const compMonth = competence || attendanceDate.substring(0, 7); // YYYY-MM
                    const [yyyy, mm, dd] = attendanceDate.split('-');
                    const dayKey = `${dd}-${mm}-${yyyy}`;
                    
                    const compIdx = pathParts.indexOf('competencias');
                    if (compIdx > -1) {
                        pathParts[compIdx + 1] = compMonth;
                        pathParts[compIdx + 3] = dayKey;
                        pathParts[compIdx + 5] = patientId;
                        targetCollectionPath = pathParts.slice(0, -1).join('/'); 
                    }
                } else {
                    targetCollectionPath = pathParts.slice(0, -1).join('/');
                }
            }
            
            if (!targetCollectionPath) {
                 console.error("Failed to determine target collection path.");
                 setIsSaving(false);
                 return;
            }

            const targetCollection = collection(db, targetCollectionPath);
            const batch = writeBatch(db);

            // 1. Process Removals (These stay on the original path and get marked as deleted)
            const toRemove = procedures.filter(p => p.status === 'pending_remove');
            for (const p of toRemove) {
                if (p.originalRecord && p.originalRecord.firestorePath) {
                    let origComp = p.originalRecord.date.substring(0, 7);
                    const pParts = p.originalRecord.firestorePath.split('/');
                    const compIdx = pParts.indexOf('competencias');
                    if (compIdx > -1 && pParts.length > compIdx + 1) origComp = pParts[compIdx + 1];

                    const contextData = {
                        date: p.originalRecord.date,
                        competenceMonth: origComp,
                        municipalityId: overrideContextData?.municipalityId || user?.municipalityId || '', 
                        entityId: overrideContextData?.entityId || user?.entityId || '',
                        entityType: overrideContextData?.entityType || user?.entityType || 'PUBLIC', 
                        unitId: p.originalRecord.unitId,
                        professionalId: overrideContextData?.professionalId || user?.professionalId || user?.id || '',
                    };
                    await softDeleteBpaRecord(p.id, "Removido via Edição de Atendimento", {
                        ...contextData,
                        firestorePath: p.originalRecord.firestorePath
                    });
                }
            }

            // Fetch Base Full Data (Needed for full additions)
            let baseFullData: any = null;
            if (baseRecord.firestorePath) {
                const baseDocRef = doc(db, baseRecord.firestorePath);
                const snap = await getDoc(baseDocRef);
                if (snap.exists()) {
                    baseFullData = snap.data();
                }
            }

            // Prepare Common Update Payload for all affected docs
            const updatePayload: any = {};
            if (nameChanged) updatePayload.patientName = patientName;
            if (cnsChanged) updatePayload.patientCns = patientCns;
            if (cpfChanged) updatePayload.patientCpf = patientCpf;
            
            if (dateChanged || competenceChanged) {
                if (dateChanged) updatePayload.attendanceDate = attendanceDate;
                updatePayload.competenceMonth = competence || attendanceDate.substring(0, 7);
                if (dateChanged) {
                    const [y,m,d] = attendanceDate.split('-');
                    if (updatePayload.attendanceDate && updatePayload.attendanceDate < new Date().toISOString().split('T')[0]) {
                         updatePayload.createdAt = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
                    }
                }
            }
            if (patientIdChanged) updatePayload.patientId = patientId;
            updatePayload.updatedAt = serverTimestamp();

            // 2. Process Additions (New Target Collection)
            const toAdd = procedures.filter(p => p.status === 'pending_add');
            if (toAdd.length > 0 && baseFullData) {
                for (const p of toAdd) {
                    const newDocRef = doc(targetCollection);
                    const newDocData = {
                        ...baseFullData,
                        ...updatePayload,
                        id: newDocRef.id,
                        procedureCode: p.code,
                        procedureName: p.name,
                        quantity: p.quantity,
                        cidCodes: p.cidCodes || [],
                        status: 'pending', // Ready for cloud sync
                        ...(overrideContextData?.source ? { source: overrideContextData.source } : {})
                    };
                    if (!newDocData.createdAt) newDocData.createdAt = new Date();
                    batch.set(newDocRef, newDocData);
                }
            } else if (toAdd.length > 0 && !baseFullData) {
                console.error("Failed to fetch base document for accurate replication. Additions aborted.");
            }

            // 3. Process Existing Docs (Move or Update)
            const existingToProcess = procedures.filter(p => p.status === 'active' || p.status === 'canceled');
            const hasQuantityChanges = existingToProcess.some(p => p.originalRecord && p.quantity !== p.originalRecord.quantity);
            
            if (needsMove || patientDataChanged || hasQuantityChanges) {
                // Must process one by one because each might have different quantities
                for (const p of existingToProcess) {
                    if (p.originalRecord?.firestorePath) {
                        const originalRef = doc(db, p.originalRecord.firestorePath);
                        
                        const specificPayload = { ...updatePayload };
                        if (p.status === 'active' && p.quantity !== p.originalRecord.quantity) {
                            specificPayload.quantity = p.quantity;
                        }

                        if (needsMove) {
                            // Fetch old doc uniquely
                            const oldSnap = await getDoc(originalRef);
                            if (oldSnap.exists()) {
                                const oldData = oldSnap.data();
                                const newRef = doc(targetCollection, originalRef.id); // keep precise ID
                                batch.set(newRef, { ...oldData, ...specificPayload });
                                batch.delete(originalRef); // Destroy original location synchronously in batch
                            }
                        } else {
                            // SIMPLE LOCAL UPDATE
                            if (Object.keys(specificPayload).length > 1) { // >1 because updatedAt is always set
                                batch.update(originalRef, specificPayload);
                            }
                        }
                    }
                }
                
                await batch.commit();
            }

            onSaveSuccess();
        } catch (error) {
            console.error("Error saving attendance edits:", error);
            alert("Erro ao salvar as edições. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const nameChanged = patientName !== (baseRecord?.patientName || '');
    const cnsChanged = patientCns !== (baseRecord?.patientCns || '');
    const cpfChanged = patientCpf !== (baseRecord?.patientCpf || '');
    const patientDataChangedCount = (nameChanged || cnsChanged || cpfChanged) ? 1 : 0; // Count as 1 block change
    
    // Check for structural changes (Date or Patient ID or Competence) that require move
    const dateChanged = attendanceDate !== (baseRecord?.date || '');
    let currentPathPatientId = baseRecord?.patientId || '';
    let currentPathCompetenceUI = '';
    if (baseRecord?.firestorePath) {
        const pParts = baseRecord.firestorePath.split('/');
        const pIdx = pParts.indexOf('pacientes');
        if (pIdx > -1 && pParts.length > pIdx + 1) currentPathPatientId = pParts[pIdx + 1];
        const compIdx = pParts.indexOf('competencias');
        if (compIdx > -1 && pParts.length > compIdx + 1) currentPathCompetenceUI = pParts[compIdx + 1];
    }
    const patientIdChanged = patientId !== currentPathPatientId;
    const competenceChangedUI = competence !== currentPathCompetenceUI;
    const structuralChangesCount = (dateChanged || patientIdChanged || competenceChangedUI) ? 1 : 0;

    const quantityChangesCount = procedures.filter(p => p.status === 'active' && p.originalRecord && p.quantity !== p.originalRecord.quantity).length;

    const changesCount = procedures.filter(p => p.status === 'pending_add' || p.status === 'pending_remove').length + patientDataChangedCount + quantityChangesCount + structuralChangesCount;
    const compYYYYMM = competence ? competence.replace('-', '') : (baseRecord ? baseRecord.date.replace(/-/g, '').substring(0, 6) : ''); 

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => !isSaving && onClose()}
            />
            
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                            Editar Atendimento
                        </h2>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                            {baseRecord?.date.split('-').reverse().join('/')} 
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            Edição Rápida
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={isSaving}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 disabled:opacity-50"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Patient Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-medical-600 dark:text-medical-400 font-bold mb-2 pt-2">
                            <User size={18} />
                            <h3>Dados do Atendimento</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                            
                            <div className="col-span-1 sm:col-span-2 relative mb-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Editar Competência (Mês/Ano)
                                </label>
                                <input
                                    type="month"
                                    value={competence}
                                    onChange={(e) => setCompetence(e.target.value)}
                                    className="flex h-10 w-full sm:w-1/2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:focus-visible:ring-gray-300"
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="col-span-1 sm:col-span-2 relative mb-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Data de Realização
                                </label>
                                <input
                                    type="date"
                                    value={attendanceDate}
                                    onChange={(e) => setAttendanceDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="flex h-10 w-full sm:w-1/2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:focus-visible:ring-gray-300"
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Cartão SUS (CNS)
                                </label>
                                <Input
                                    value={patientCns}
                                    onChange={(e) => { setPatientCns(e.target.value); setPatientFound(false); }}
                                    placeholder="Número do CNS"
                                    className="w-full"
                                    disabled={isSaving}
                                />
                                {/* CNS Dropdown */}
                                {showPatientSuggestions === 'cns' && patientSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                                        {patientSuggestions.map(patient => (
                                            <div 
                                                key={patient.id} 
                                                className="p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-medical-50 dark:hover:bg-medical-900/30 cursor-pointer transition-colors"
                                                onClick={() => handleSelectPatient(patient)}
                                            >
                                                <div className="font-bold text-sm text-gray-900 dark:text-white">{patient.name || patient.patientName}</div>
                                                <div className="text-xs text-medical-600 mt-1 flex items-center gap-2">
                                                    <Badge variant="neutral" className="py-0 uppercase text-[10px]">CNS {patient.cns}</Badge>
                                                    {patient.cpf && <span className="text-gray-400">CPF: {patient.cpf}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    CPF
                                </label>
                                <Input
                                    value={patientCpf}
                                    onChange={(e) => { setPatientCpf(e.target.value); setPatientFound(false); }}
                                    placeholder="Apenas números"
                                    className="w-full"
                                    disabled={isSaving}
                                />
                                {/* CPF Dropdown */}
                                {showPatientSuggestions === 'cpf' && patientSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                                        {patientSuggestions.map(patient => (
                                            <div 
                                                key={patient.id} 
                                                className="p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-medical-50 dark:hover:bg-medical-900/30 cursor-pointer transition-colors"
                                                onClick={() => handleSelectPatient(patient)}
                                            >
                                                <div className="font-bold text-sm text-gray-900 dark:text-white">{patient.name || patient.patientName}</div>
                                                <div className="text-xs text-medical-600 mt-1 flex gap-2">
                                                    <Badge variant="neutral" className="py-0 uppercase text-[10px]">CPF {patient.cpf}</Badge>
                                                    {patient.cns && <span className="text-gray-400">CNS {patient.cns}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="col-span-1 sm:col-span-2 relative">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Nome do Paciente
                                </label>
                                <Input
                                    value={patientName}
                                    onChange={(e) => { setPatientName(e.target.value); setPatientFound(false); }}
                                    placeholder="Nome Completo do Paciente"
                                    className="w-full text-base"
                                    disabled={isSaving}
                                />
                                {/* Name Dropdown */}
                                {showPatientSuggestions === 'name' && patientSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                                        {patientSuggestions.map(patient => (
                                            <div 
                                                key={patient.id} 
                                                className="p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-medical-50 dark:hover:bg-medical-900/30 cursor-pointer transition-colors"
                                                onClick={() => handleSelectPatient(patient)}
                                            >
                                                <div className="font-bold text-sm text-gray-900 dark:text-white flex justify-between items-center">
                                                    {patient.name || patient.patientName}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-2">
                                                    {patient.cns && <Badge variant="neutral" className="bg-gray-50 py-0">CNS: {patient.cns}</Badge>}
                                                    {patient.cpf && <Badge variant="neutral" className="bg-gray-50 py-0">CPF: {patient.cpf}</Badge>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Procedures Section */}
                    <div className="space-y-3 relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-medical-600 dark:text-medical-400 font-bold">
                                <Stethoscope size={18} />
                                <h3>Procedimentos Registrados</h3>
                            </div>
                            <Button 
                                onClick={() => setIsSelectorOpen(true)}
                                size="sm" 
                                variant="outline" 
                                className="border-medical-200 text-medical-700 hover:bg-medical-50 dark:border-medical-800 dark:text-medical-300 dark:hover:bg-medical-900/30"
                                disabled={isSaving}
                            >
                                <Plus size={16} className="mr-1" />
                                Adicionar
                            </Button>
                        </div>
                        
                        <div className="space-y-3">
                            {procedures.map((p) => (
                                <div 
                                    key={p.id} 
                                    className={cn(
                                        "p-3 sm:p-4 rounded-xl border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-all",
                                        p.status === 'canceled' ? "bg-gray-50 border-gray-200 opacity-60 dark:bg-gray-900 dark:border-gray-800" :
                                        p.status === 'pending_remove' ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/30" :
                                        p.status === 'pending_add' ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30" :
                                        "bg-white border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700"
                                    )}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                {p.code}
                                            </span>
                                            {p.status === 'pending_add' && <Badge variant="success" className="text-[10px] uppercase py-0 leading-tight">Novo</Badge>}
                                            {p.status === 'pending_remove' && <Badge variant="danger" className="text-[10px] uppercase py-0 leading-tight">A Ser Removido</Badge>}
                                            {p.status === 'canceled' && <Badge variant="danger" className="text-[10px] uppercase py-0 leading-tight">Cancelado Anteriormente</Badge>}
                                        </div>
                                        <p className={cn("text-sm font-medium", 
                                            p.status === 'pending_remove' || p.status === 'canceled' ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-200"
                                        )}>
                                            {p.name}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                        {p.status === 'active' || p.status === 'pending_add' ? (
                                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                                <button 
                                                    type="button"
                                                    onClick={() => handleQuantityChange(p.id, -1)}
                                                    disabled={p.quantity <= 1 || isSaving}
                                                    className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 disabled:opacity-50 shadow-sm transition-colors"
                                                >
                                                    -
                                                </button>
                                                <input 
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={p.quantity || ''}
                                                    onChange={(e) => {
                                                        const v = e.target.value.replace(/\D/g, '');
                                                        const num = v === '' ? 0 : parseInt(v, 10);
                                                        setProcedures(prev => prev.map(proc => proc.id === p.id ? { ...proc, quantity: Math.min(99, num) } : proc));
                                                    }}
                                                    onBlur={() => {
                                                        if (!p.quantity || p.quantity < 1) {
                                                            setProcedures(prev => prev.map(proc => proc.id === p.id ? { ...proc, quantity: 1 } : proc));
                                                        }
                                                    }}
                                                    disabled={isSaving}
                                                    className="w-10 text-center text-sm font-bold text-gray-800 dark:text-gray-200 bg-transparent py-0 px-0 outline-none focus:ring-2 focus:ring-medical-500 rounded border-none transition-all"
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => handleQuantityChange(p.id, 1)}
                                                    disabled={isSaving}
                                                    className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 shadow-sm transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Qtd</span>
                                                <span className="font-bold text-gray-700 dark:text-gray-300">{p.quantity}</span>
                                            </div>
                                        )}

                                        {p.status === 'active' || p.status === 'pending_add' ? (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={() => handleRemove(p.id)}
                                                disabled={isSaving}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        ) : p.status === 'pending_remove' ? (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                                onClick={() => handleUndoRemove(p.id)}
                                                disabled={isSaving}
                                            >
                                                <Undo2 size={16} />
                                            </Button>
                                        ) : (
                                            <div className="w-8" /> 
                                        )}
                                    </div>
                                </div>
                            ))}
                            {procedures.length === 0 && (
                                <div className="text-center py-6 text-gray-400 border border-dashed rounded-xl border-gray-200 dark:border-gray-700">
                                    Nenhum procedimento encontrado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between gap-4">
                    <div className="text-sm font-medium text-gray-500">
                        {changesCount > 0 ? (
                            <span className="text-orange-500 flex items-center gap-1">
                                <AlertTriangle size={14} /> {changesCount} alteração(ões) pendente(s)
                            </span>
                        ) : 'Nenhuma alteração'}
                    </div>
                    
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                        <Button 
                            className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 min-w-[120px]" 
                            onClick={handleSave}
                            disabled={changesCount === 0 || isSaving}
                        >
                            {isSaving ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} className="mr-2" />
                                    Salvar Alterações
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* New Procedure Dialog Overlay */}
            <AnimatePresence>
                {selectedNewProc && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedNewProc(null)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm relative z-10"
                        >
                            <h3 className="font-bold text-gray-900 dark:text-white mb-2">Adicionar Procedimento</h3>
                            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg mb-4">
                                <span className="font-mono text-xs font-bold bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300 mr-2">
                                    {selectedNewProc.code}
                                </span>
                                <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                                    {selectedNewProc.name}
                                </span>
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Quantidade Realizada
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="99"
                                    value={pendingQuantity}
                                    onChange={(e) => setPendingQuantity(parseInt(e.target.value) || 1)}
                                    className="w-full text-center text-lg"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button className="flex-1" variant="outline" onClick={() => setSelectedNewProc(null)}>
                                    Cancelar
                                </Button>
                                <Button className="flex-1 bg-medical-600 text-white" onClick={confirmAddProcedure}>
                                    Confirmar
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Sigtap Selector Portal */}
            <SigtapTreeSelector 
                isOpen={isSelectorOpen && !selectedNewProc} 
                onClose={() => setIsSelectorOpen(false)}
                onSelect={handleProcedureSelect}
                currentCompetence={compYYYYMM || undefined}
            />
        </div>
    );
};
