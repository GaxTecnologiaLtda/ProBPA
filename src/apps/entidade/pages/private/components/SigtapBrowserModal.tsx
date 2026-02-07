import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, Badge } from '../../../components/ui/Components'; // Adjusted path
import { Search, Loader2, FolderTree, FileText, CornerDownRight, Check, X, Info, Database } from 'lucide-react';
import { sigtapService, searchProcedures, getAvailableCompetences, SigtapProcedureRow } from '../../../services/sigtapService'; // Local import
import { ProcedureDetailModal } from './ProcedureDetailModal'; // Local import
import { motion, AnimatePresence } from 'framer-motion';

interface SigtapBrowserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (procedure: SigtapProcedureRow) => void;
}

export const SigtapBrowserModal: React.FC<SigtapBrowserModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [activeTab, setActiveTab] = useState<'tree' | 'search'>('tree');
    const [loading, setLoading] = useState(false);
    const [competences, setCompetences] = useState<{ competence: string; label: string }[]>([]);
    const [currentCompetence, setCurrentCompetence] = useState<string>('');

    // Tree State
    const [groups, setGroups] = useState<any[]>([]);
    const [subGroups, setSubGroups] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [procedures, setProcedures] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [selectedSubGroup, setSelectedSubGroup] = useState<string>('');
    const [selectedForm, setSelectedForm] = useState<string>('');

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SigtapProcedureRow[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Detail Modal
    const [viewProcedure, setViewProcedure] = useState<any | null>(null);

    const handleSelectProcedure = (proc: SigtapProcedureRow) => {
        if (onSelect) {
            onSelect(proc);
            onClose();
        }
    };

    // Load Competences
    useEffect(() => {
        if (isOpen) {
            getAvailableCompetences().then(comps => {
                setCompetences(comps);
                if (comps.length > 0 && !currentCompetence) {
                    setCurrentCompetence(comps[0].competence);
                }
            });
        }
    }, [isOpen]);

    // Load Groups when Competence changes
    useEffect(() => {
        if (currentCompetence && activeTab === 'tree') {
            setLoading(true);
            sigtapService.getGroups(currentCompetence).then(setGroups).finally(() => setLoading(false));
            // Reset selections
            setSelectedGroup('');
            setSelectedSubGroup('');
            setSelectedForm('');
            setProcedures([]);
        }
    }, [currentCompetence, activeTab]);

    // Load SubGroups
    useEffect(() => {
        if (currentCompetence && selectedGroup) {
            setLoading(true);
            sigtapService.getSubGroups(currentCompetence, selectedGroup).then(setSubGroups).finally(() => setLoading(false));
        } else {
            setSubGroups([]);
        }
        setSelectedSubGroup('');
        setSelectedForm('');
        setProcedures([]);
    }, [currentCompetence, selectedGroup]);

    // Load Forms
    useEffect(() => {
        if (currentCompetence && selectedGroup && selectedSubGroup) {
            setLoading(true);
            sigtapService.getForms(currentCompetence, selectedGroup, selectedSubGroup).then(setForms).finally(() => setLoading(false));
        } else {
            setForms([]);
        }
        setSelectedForm('');
        setProcedures([]);
    }, [currentCompetence, selectedGroup, selectedSubGroup]);

    // Load Procedures
    useEffect(() => {
        if (currentCompetence && selectedGroup && selectedSubGroup && selectedForm) {
            setLoading(true);
            sigtapService.getProcedures(currentCompetence, selectedGroup, selectedSubGroup, selectedForm).then(res => {
                setProcedures(res);
                setLoading(false);
            });
        } else {
            setProcedures([]);
        }
    }, [currentCompetence, selectedGroup, selectedSubGroup, selectedForm]);

    // Automatic Search with Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery && searchQuery.length >= 3) {
                handleSearch();
            }
        }, 600); // 600ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Search Logic
    const handleSearch = async () => {
        if (!searchQuery || searchQuery.length < 3) return;
        setIsSearching(true);

        try {
            const results = await searchProcedures(searchQuery, 50, currentCompetence);
            setSearchResults(results);
        } catch (error: any) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    // Render Helpers
    const renderProcedureList = (list: any[]) => (
        <div className="space-y-3 p-2">
            {list.map((proc) => (
                <div
                    key={proc.code}
                    className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group shadow-sm"
                >
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 cursor-pointer" onClick={() => setViewProcedure(proc)}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs font-bold bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                                    {proc.code}
                                </span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                                    {proc.complexity === '1' ? 'Atenção Básica' : proc.complexity === '2' ? 'Média Complexidade' : 'Alta Complexidade'}
                                </span>
                            </div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white leading-tight hover:text-emerald-600 dark:hover:text-emerald-400">
                                {proc.name}
                            </h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>Idade: {(proc.ageMin / 12).toFixed(0)}-{(proc.ageMax / 12).toFixed(0)}a</span>
                                <span>Sexo: {proc.sex}</span>
                                <span>Pontos: {proc.points}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-center">
                            {onSelect && (
                                <Button
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectProcedure(proc);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1"
                                >
                                    Selecionar
                                </Button>
                            )}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setViewProcedure(proc)}>
                                <Info className="w-5 h-5 text-gray-400 hover:text-emerald-500" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            {list.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-400">
                    <p>Nenhum procedimento encontrado.</p>
                </div>
            )}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Catálogo SIGTAP (Tabela Unificada)"
            className="max-w-4xl h-[85vh] flex flex-col"
        >
            <div className="flex flex-col h-full -mx-6 -mb-6">

                {/* Controls Header */}
                <div className="px-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50 dark:bg-gray-800/50 pt-2">

                    {/* Competence Selector */}
                    <div className="w-full md:w-64">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Competência de Referência</label>
                        <select
                            value={currentCompetence}
                            onChange={(e) => setCurrentCompetence(e.target.value)}
                            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            {competences.map(c => (
                                <option key={c.competence} value={c.competence}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 self-end md:self-center">
                        <button
                            onClick={() => setActiveTab('tree')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'tree' ? 'bg-white dark:bg-gray-800 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            <FolderTree className="w-4 h-4" /> Navegação
                        </button>
                        <button
                            onClick={() => setActiveTab('search')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'search' ? 'bg-white dark:bg-gray-800 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            <Search className="w-4 h-4" /> Pesquisa Rápida
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900/50 p-6 flex flex-col">

                    {activeTab === 'tree' && (
                        <div className="flex flex-col h-full gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Grupo</label>
                                    <select
                                        className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white text-ellipsis overflow-hidden"
                                        value={selectedGroup}
                                        onChange={e => setSelectedGroup(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {groups.map(g => <option key={g.code} value={g.code}>{g.code} - {g.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Subgrupo</label>
                                    <select
                                        className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white disabled:opacity-50"
                                        value={selectedSubGroup}
                                        onChange={e => setSelectedSubGroup(e.target.value)}
                                        disabled={!selectedGroup}
                                    >
                                        <option value="">Selecione...</option>
                                        {subGroups.map(s => <option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Forma de Organização</label>
                                    <select
                                        className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white disabled:opacity-50"
                                        value={selectedForm}
                                        onChange={e => setSelectedForm(e.target.value)}
                                        disabled={!selectedSubGroup}
                                    >
                                        <option value="">Selecione...</option>
                                        {forms.map(f => <option key={f.code} value={f.code}>{f.code} - {f.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900/50 relative">
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/60 z-10">
                                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                    </div>
                                )}

                                {!selectedForm ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <CornerDownRight className="w-12 h-12 opacity-20 mb-2" />
                                        <p>Selecione a hierarquia para visualizar os procedimentos</p>
                                    </div>
                                ) : (
                                    renderProcedureList(procedures)
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'search' && (
                        <div className="flex flex-col h-full gap-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Busque por código ou nome do procedimento..."
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none placeholder-gray-400 dark:placeholder-gray-500"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-2.5">
                                            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900/50 relative flex flex-col">
                                {isSearching && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/60 z-10">
                                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                    </div>
                                )}

                                {searchResults.length > 0 ? (
                                    renderProcedureList(searchResults)
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 flex-1">
                                        <Search className="w-12 h-12 opacity-20 mb-2" />
                                        <p>{searchQuery && !isSearching ? 'Nenhum resultado encontrado' : 'Digite para pesquisar'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {viewProcedure && (
                    <ProcedureDetailModal
                        procedure={viewProcedure}
                        onClose={() => setViewProcedure(null)}
                    />
                )}
            </AnimatePresence>
        </Modal>
    );
};
