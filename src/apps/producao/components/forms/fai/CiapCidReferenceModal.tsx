import React, { useState, useEffect } from 'react';
import { X, Search, Activity } from 'lucide-react';
import { Input, Button } from '../../ui/BaseComponents';
import ciapData from '../../../services/ciap_cid_mapping.json';

interface DiagnosisItem {
    ciap: string;
    ciap_desc: string;
    cid: string;
    cid_desc: string;
}

const FULL_DATA = ciapData as DiagnosisItem[];

interface CiapCidReferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (item: DiagnosisItem) => void;
}

export const CiapCidReferenceModal: React.FC<CiapCidReferenceModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredData, setFilteredData] = useState<DiagnosisItem[]>([]);
    const [page, setPage] = useState(0);
    const ITEMS_PER_PAGE = 50;

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setFilteredData(FULL_DATA);
            setPage(0);
        }
    }, [isOpen]);

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        const filtered = FULL_DATA.filter(item =>
            item.ciap.toLowerCase().includes(lower) ||
            item.ciap_desc.toLowerCase().includes(lower) ||
            item.cid.toLowerCase().includes(lower) ||
            item.cid_desc.toLowerCase().includes(lower)
        );
        setFilteredData(filtered);
        setPage(0);
    }, [searchTerm]);

    if (!isOpen) return null;

    const visibleItems = filteredData.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                        <div className="bg-rose-100 p-2 rounded-lg">
                            <Activity className="text-rose-600 w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Diagnósticos (CIAP-2 / CID-10)</h2>
                            <p className="text-xs text-gray-500">{filteredData.length} registros encontrados</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
                    <div className="relative">
                        <Input
                            placeholder="Pesquisar por código ou descrição CIAP/CID..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 h-10"
                            autoFocus
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-1">CIAP</div>
                    <div className="col-span-5">Descrição CIAP</div>
                    <div className="col-span-1">CID</div>
                    <div className="col-span-5">Descrição CID</div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50 dark:bg-gray-900/50 p-2 space-y-1">
                    {visibleItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p>Nenhum diagnóstico encontrado.</p>
                        </div>
                    ) : (
                        visibleItems.map((item, idx) => (
                            <div
                                key={idx}
                                className={`grid grid-cols-12 gap-2 text-sm p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-rose-200 hover:shadow-sm transition-all ${onSelect ? 'cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/20' : ''}`}
                                onClick={() => onSelect && onSelect(item)}
                            >
                                <div className="col-span-1 font-mono text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/30 w-fit px-2 py-1 rounded h-fit font-bold">
                                    {item.ciap}
                                </div>
                                <div className="col-span-5 text-gray-700 dark:text-gray-200 flex items-center">
                                    {item.ciap_desc}
                                </div>
                                <div className="col-span-1 font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 w-fit px-2 py-1 rounded h-fit">
                                    {item.cid}
                                </div>
                                <div className="col-span-5 text-slate-500 dark:text-slate-400 text-xs flex items-center">
                                    {item.cid_desc}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer / Pagination */}
                <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center text-xs">
                    <span className="text-gray-500">
                        Página {page + 1} de {totalPages || 1}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="h-8"
                        >
                            Anterior
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            className="h-8"
                        >
                            Próxima
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
