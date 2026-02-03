import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Badge, cn } from '../components/ui/BaseComponents';
import { Search, Loader2, ChevronRight, CornerDownRight, Check, X, Info } from 'lucide-react';
import { sigtapService } from '../services/sigtapService';
import { motion } from 'framer-motion';
import { ProcedureDetailModal } from './ProcedureDetailModal';

// Types
interface SigtapTreeSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (procedure: any) => void;
    currentCompetence?: string;
}

interface Procedure {
    code: string;
    name: string;
    ageMin: number;
    ageMax: number;
    complexity: string;
    sex: string;
    [key: string]: any;
}

export const SigtapTreeSelector: React.FC<SigtapTreeSelectorProps> = ({ isOpen, onClose, onSelect, currentCompetence }) => {
    // Selection State
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [selectedSubGroup, setSelectedSubGroup] = useState<string>('');
    const [selectedForm, setSelectedForm] = useState<string>('');
    const [viewProcedure, setViewProcedure] = useState<Procedure | null>(null);


    // Data State
    const [groups, setGroups] = useState<any[]>([]);
    const [subGroups, setSubGroups] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [loading, setLoading] = useState(false);

    // Active Competence
    // Usually passed from parent. If not, could fetch default.
    // For now, assume parent passes valid competence or we default.
    const [comp, setComp] = useState('202501'); // Fallback

    useEffect(() => {
        if (currentCompetence) {
            setComp(currentCompetence);
        }
    }, [currentCompetence]);

    // Initial Load (Groups)
    useEffect(() => {
        if (isOpen && comp) {
            setLoading(true);
            sigtapService.getGroups(comp).then(res => {
                setGroups(res);
                setLoading(false);
            }).catch(err => {
                console.error("Error loading groups:", err);
                setLoading(false);
            });
        }
    }, [isOpen, comp]);

    // Derived Lists
    // Fetch SubGroups
    useEffect(() => {
        if (comp && selectedGroup) {
            setLoading(true);
            sigtapService.getSubGroups(comp, selectedGroup).then(res => {
                setSubGroups(res);
                setLoading(false);
            });
        } else {
            setSubGroups([]);
        }
    }, [comp, selectedGroup]);

    // Fetch Forms
    useEffect(() => {
        if (comp && selectedGroup && selectedSubGroup) {
            setLoading(true);
            sigtapService.getForms(comp, selectedGroup, selectedSubGroup).then(res => {
                setForms(res);
                setLoading(false);
            });
        } else {
            setForms([]);
        }
    }, [comp, selectedGroup, selectedSubGroup]);

    // Fetch Procedures
    useEffect(() => {
        if (comp && selectedGroup && selectedSubGroup && selectedForm) {
            setLoading(true);
            sigtapService.getProcedures(comp, selectedGroup, selectedSubGroup, selectedForm).then(res => {
                setProcedures(res);
                setLoading(false);
            });
        } else {
            setProcedures([]);
        }
    }, [comp, selectedGroup, selectedSubGroup, selectedForm]);

    // Handlers
    const handleGroupChange = (val: string) => {
        setSelectedGroup(val);
        setSelectedSubGroup('');
        setSelectedForm('');
        setProcedures([]);
    };

    const handleSubGroupChange = (val: string) => {
        setSelectedSubGroup(val);
        setSelectedForm('');
        setProcedures([]);
    };

    const handleSelectProcedure = (proc: Procedure) => {
        // Adapt format to what Register expects if needed
        // Register expects SigtapProcedureRow properties + Context
        onSelect({
            ...proc,
            groupCode: selectedGroup,
            subGroupCode: selectedSubGroup,
            formCode: selectedForm
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-800 dark:text-slate-100 font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/60">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Search className="text-medical-500" /> Consultar SIGTAP (Árvore)
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Navegue pela estrutura hierárquica. Competência: <strong>{comp}</strong></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-full transition-colors">
                        <X size={24} className="text-gray-400 hover:text-red-500" />
                    </button>
                </div>

                {/* Filters Row */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Group */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Grupo</label>
                        <select
                            className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-medical-500 outline-none transition-all text-sm"
                            value={selectedGroup}
                            onChange={e => handleGroupChange(e.target.value)}
                        >
                            <option value="">Selecione o Grupo...</option>
                            {groups.map(g => (
                                <option key={g.code} value={g.code}>{g.code} - {g.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* SubGroup */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Subgrupo</label>
                        <select
                            className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-medical-500 outline-none transition-all text-sm disabled:opacity-50"
                            value={selectedSubGroup}
                            onChange={e => handleSubGroupChange(e.target.value)}
                            disabled={!selectedGroup}
                        >
                            <option value="">Selecione o Subgrupo...</option>
                            {subGroups.map(s => (
                                <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Form */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Forma de Organização</label>
                        <select
                            className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-medical-500 outline-none transition-all text-sm disabled:opacity-50"
                            value={selectedForm}
                            onChange={e => setSelectedForm(e.target.value)}
                            disabled={!selectedSubGroup}
                        >
                            <option value="">Selecione a Forma...</option>
                            {forms.map(f => (
                                <option key={f.code} value={f.code}>{f.code} - {f.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Details Modal */}
                {viewProcedure && (
                    <ProcedureDetailModal
                        procedure={viewProcedure}
                        onClose={() => setViewProcedure(null)}
                    />
                )}

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative bg-gray-50/30 dark:bg-black/20">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-10 backdrop-blur-sm">
                            <Loader2 className="animate-spin text-medical-500" size={40} />
                        </div>
                    )}

                    {!selectedForm ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center animate-in fade-in zoom-in-95">
                            <CornerDownRight size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">Selecione a hierarquia completa acima</p>
                            <p className="text-sm">Os procedimentos serão listados aqui.</p>
                        </div>
                    ) : (
                        <div className="h-full overflow-y-auto p-4">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                    {procedures.length} procedimento(s) encontrado(s)
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {procedures.map((proc, idx) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        key={proc.code}
                                        className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-medical-200 dark:hover:border-medical-900 transition-all group"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="font-mono text-xs bg-gray-100 dark:bg-gray-900">
                                                        {proc.code}
                                                    </Badge>
                                                    <span className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded-full border border-gray-100 dark:border-gray-800">
                                                        {proc.complexity === '1' ? 'Atenção Básica' : proc.complexity === '2' ? 'Média' : 'Alta'}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-gray-800 dark:text-gray-100 leading-tight">
                                                    {proc.name}
                                                </h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <span title="Idade Mínima/Máxima">
                                                        👶 Idade: {(proc.ageMin / 12).toFixed(0)}-{(proc.ageMax / 12).toFixed(0)} anos
                                                    </span>
                                                    <span>
                                                        ⚧ Sexo: {proc.sex === 'I' ? 'Ambos' : proc.sex === 'F' ? 'Fem' : 'Masc'}
                                                    </span>
                                                    <span>
                                                        🏥 Perm: {proc.daysStay === 9999 ? 'N/A' : `${proc.daysStay}d`}
                                                    </span>
                                                    <span>
                                                        ⭐ Pontos: {proc.points}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 md:border-l md:pl-4 dark:border-gray-700">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setViewProcedure(proc)}
                                                    className="w-full md:w-auto border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    title="Ver Detalhes, Compatibilidades e Serviços"
                                                >
                                                    <Info size={16} className="text-blue-500" />
                                                </Button>
                                                <Button
                                                    onClick={() => handleSelectProcedure(proc)}
                                                    className="w-full md:w-auto bg-medical-600 hover:bg-medical-700 text-white shadow-lg shadow-medical-500/30"
                                                >
                                                    <Check size={16} className="mr-2" />
                                                    Selecionar
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}


                                {procedures.length === 0 && !loading && (
                                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                        <Info size={32} className="mx-auto mb-2 text-gray-400" />
                                        <p className="text-gray-500">Nenhum procedimento encontrado nesta forma de organização.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
