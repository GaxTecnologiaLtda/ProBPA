import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Input, Badge } from './ui/Components';
import { Search, FileText, Info, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import {
    searchProcedures,
    SigtapProcedureRow,
    getCompatibleCids,
    getServicesForProcedure,
    getAttendanceCharacterForProcedure,
    getAvailableCompetences
} from '../../producao/services/sigtapLookupService';

interface SigtapSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (proc: SigtapProcedureRow) => void;
    currentCompetence?: string;
}

export const SigtapSearchModal: React.FC<SigtapSearchModalProps> = ({ isOpen, onClose, onSelect, currentCompetence }) => {
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
            try {
                const comps = await getAvailableCompetences();
                setAvailableCompetences(comps);

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

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.length >= 3) {
                handleSearch();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, searchCompetence]);

    const toggleExpand = async (e: React.MouseEvent, proc: SigtapProcedureRow) => {
        e.stopPropagation();
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Consultar SIGTAP">
            <div className="space-y-4">
                {/* Search Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Referência:</span>
                        <select
                            value={searchCompetence}
                            onChange={(e) => setSearchCompetence(e.target.value)}
                            className="text-sm bg-gray-100 dark:bg-gray-700 border-none rounded px-2 py-1 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-blue-500"
                        >
                            {availableCompetences.map(c => (
                                <option key={c.competence} value={c.competence}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Digite código ou nome..."
                                className="w-full pl-10 pr-4 h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                autoFocus
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={loading || searchTerm.length < 3}>
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Buscar'}
                        </Button>
                    </div>
                </div>

                {/* Results */}
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                    {results.length === 0 && !loading && (
                        <div className="text-center py-8 text-gray-500">
                            {searchTerm.length < 3 ? 'Digite ao menos 3 caracteres.' : 'Nenhum procedimento encontrado.'}
                        </div>
                    )}

                    {results.map((proc) => (
                        <div key={proc.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <div
                                className="p-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                onClick={() => onSelect(proc)}
                            >
                                <div className="mt-1">
                                    <Badge type={proc.procedureType === 'BPA' ? 'success' : proc.procedureType === 'APAC' ? 'warning' : 'neutral'}>
                                        {proc.procedureType}
                                    </Badge>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{proc.code} - {proc.name}</h3>
                                        <button
                                            onClick={(e) => toggleExpand(e, proc)}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                        >
                                            {expandedId === proc.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                        </button>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 flex gap-4">
                                        <span>Grupo: {proc.groupCode}</span>
                                        <span>Sub: {proc.subgroupCode}</span>
                                        <span>Org: {proc.formaOrganizacaoCode}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === proc.id && (
                                <div className="bg-gray-50 dark:bg-gray-800/30 p-4 border-t border-gray-200 dark:border-gray-700 text-sm">
                                    {loadingDetails && !details[proc.id] ? (
                                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" /></div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                                    <FileText size={14} /> CIDs Compatíveis
                                                </h4>
                                                <div className="max-h-32 overflow-y-auto bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2">
                                                    {details[proc.id]?.cids?.length > 0 ? (
                                                        <ul className="space-y-1">
                                                            {details[proc.id].cids.map((c: any) => (
                                                                <li key={c.code} className="text-xs text-gray-600 dark:text-gray-400">
                                                                    <span className="font-bold">{c.code}</span> - {c.name}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : <span className="text-xs text-gray-400">Nenhum CID vinculado.</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};
