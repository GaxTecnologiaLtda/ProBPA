import React, { useState, useEffect } from 'react';

// Actually, looking at previous files, we used a custom Modal in SigtapTables. Let's reuse the 'Modal' component if available or build one using the existing UI patterns.
// In SigtapTables.tsx, we saw: <div className="fixed inset-0 ..."> for modal.
// Let's check 'src/apps/administrativo/components/Common.tsx' or similar for a reusable Modal.
// The user said "Preservar integralmente layout... componentes React existentes".
// I'll check 'src/apps/producao/components/ui/BaseComponents' first.

import { Card, Button, Input, Select, Badge, cn } from '../components/ui/BaseComponents';
import { Search, X, FileText, Info, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { searchProcedures, SigtapProcedureRow, getCompatibleCids, getServicesForProcedure, getAttendanceCharacterForProcedure } from '../services/sigtapLookupService';

interface SigtapSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCompetence?: string;
}

export const SigtapSearchModal: React.FC<SigtapSearchModalProps> = ({ isOpen, onClose, currentCompetence }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchCompetence, setSearchCompetence] = useState(currentCompetence || '');
    const [availableCompetences, setAvailableCompetences] = useState<{ competence: string; label: string }[]>([]);
    const [results, setResults] = useState<SigtapProcedureRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [details, setDetails] = useState<any>({}); // Cache for details
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        if (currentCompetence) {
            setSearchCompetence(currentCompetence);
        }
    }, [currentCompetence]);

    useEffect(() => {
        async function loadCompetences() {
            // Here we want the ACTUAL available imports for search
            try {
                const { getAvailableCompetences } = await import('../services/sigtapLookupService');
                const comps = await getAvailableCompetences();
                setAvailableCompetences(comps);

                // If the passed competence isn't in the list (not imported), default to the latest available
                if (currentCompetence && comps.length > 0) {
                    const exists = comps.some(c => c.competence === currentCompetence);
                    if (!exists) {
                        setSearchCompetence(comps[0].competence);
                    }
                } else if (comps.length > 0 && !searchCompetence) {
                    setSearchCompetence(comps[0].competence);
                }
            } catch (err) {
                console.error(err);
            }
        }
        if (isOpen) {
            loadCompetences();
        }
    }, [isOpen, currentCompetence]);

    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setResults([]);
            setExpandedId(null);
            setDetails({});
        }
    }, [isOpen]);

    const handleSearch = async () => {
        if (searchTerm.length < 3) return;
        setLoading(true);
        try {
            const data = await searchProcedures(searchTerm, 50, searchCompetence);
            setResults(data);
            setExpandedId(null);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Trigger search on enter or button click, or debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.length >= 3) {
                handleSearch();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, searchCompetence]); // Re-search when competence changes

    const toggleExpand = async (proc: SigtapProcedureRow) => {
        if (expandedId === proc.id) {
            setExpandedId(null);
            return;
        }

        setExpandedId(proc.id);

        if (!details[proc.id]) {
            setLoadingDetails(true);
            try {
                const [cids, services, character] = await Promise.all([
                    getCompatibleCids(proc),
                    getServicesForProcedure(proc),
                    getAttendanceCharacterForProcedure(proc)
                ]);

                setDetails((prev: any) => ({
                    ...prev,
                    [proc.id]: { cids, services, character }
                }));
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingDetails(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Search className="text-medical-500" />
                            Consultar SIGTAP
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">Referência:</span>
                            <select
                                value={searchCompetence}
                                onChange={(e) => setSearchCompetence(e.target.value)}
                                className="text-sm bg-gray-100 dark:bg-gray-700 border-none rounded px-2 py-1 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-medical-500"
                            >
                                {availableCompetences.map(c => (
                                    <option key={c.competence} value={c.competence}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Digite código ou nome do procedimento..."
                                className="w-full pl-10 pr-4 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-medical-500 focus:outline-none dark:text-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                autoFocus
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={loading || searchTerm.length < 3}>
                            {loading ? <Loader2 className="animate-spin" /> : 'Buscar'}
                        </Button>
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50 dark:bg-black/20">
                    {results.length === 0 && !loading && (
                        <div className="text-center py-10 text-gray-500">
                            {searchTerm.length < 3 ? 'Digite ao menos 3 caracteres para buscar.' : 'Nenhum procedimento encontrado.'}
                        </div>
                    )}

                    {results.map((proc) => (
                        <Card key={proc.id} className="border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <div
                                className="p-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                onClick={() => toggleExpand(proc)}
                            >
                                <div className="mt-1">
                                    <Badge variant={proc.procedureType === 'BPA' ? 'success' : proc.procedureType === 'APAC' ? 'warning' : 'default'}>
                                        {proc.procedureType}
                                    </Badge>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{proc.code} - {proc.name}</h3>
                                        {expandedId === proc.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 flex gap-4">
                                        <span>Grupo: {proc.groupCode}</span>
                                        <span>Subgrupo: {proc.subgroupCode}</span>
                                        <span>Org: {proc.formaOrganizacaoCode}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === proc.id && (
                                <div className="bg-gray-50 dark:bg-gray-800/30 p-4 border-t border-gray-200 dark:border-gray-800 text-sm animate-in slide-in-from-top-2 duration-200">
                                    {loadingDetails && !details[proc.id] ? (
                                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-medical-500" /></div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* CIDs */}
                                            <div>
                                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                                    <FileText size={14} /> CIDs Compatíveis ({details[proc.id]?.cids?.length || 0})
                                                </h4>
                                                <div className="max-h-40 overflow-y-auto bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2">
                                                    {details[proc.id]?.cids?.length > 0 ? (
                                                        <ul className="space-y-1">
                                                            {details[proc.id].cids.map((c: any) => (
                                                                <li key={c.code} className="text-xs text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 last:border-0 pb-1 mb-1 last:pb-0 last:mb-0">
                                                                    <span className="font-bold">{c.code}</span> - {c.name}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : <span className="text-xs text-gray-400">Nenhum CID vinculado.</span>}
                                                </div>
                                            </div>

                                            {/* Services & Character */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                                        <Info size={14} /> Caráter de Atendimento
                                                    </h4>
                                                    <div className="text-xs bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                                                        {details[proc.id]?.character ? (
                                                            <span className="font-mono font-bold text-medical-600">{details[proc.id].character}</span>
                                                        ) : <span className="text-gray-400">Não especificado</span>}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                                        <Info size={14} /> Serviços / Classificações
                                                    </h4>
                                                    <div className="max-h-24 overflow-y-auto bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2">
                                                        {details[proc.id]?.services?.length > 0 ? (
                                                            <ul className="space-y-1">
                                                                {details[proc.id].services.map((s: any) => (
                                                                    <li key={s.code} className="text-xs text-gray-600 dark:text-gray-400">
                                                                        <span className="font-bold">{s.code}</span> - {s.name}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : <span className="text-xs text-gray-400">Nenhum serviço vinculado.</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>

                <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-right">
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                </div>
            </div>
        </div>
    );
};
