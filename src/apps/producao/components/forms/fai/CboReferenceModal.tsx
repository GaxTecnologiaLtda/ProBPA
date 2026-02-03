import React, { useState, useEffect } from 'react';
import { X, Search, Briefcase } from 'lucide-react';
import { Input, Button } from '../../ui/BaseComponents';
import cboData from '../../../services/cbo_mapping.json';

interface CboItem {
    codigo: string;
    ocupacao: string;
}

const FULL_DATA = cboData as CboItem[];

interface CboReferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (item: CboItem) => void;
}

export const CboReferenceModal: React.FC<CboReferenceModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredData, setFilteredData] = useState<CboItem[]>([]);
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
            item.ocupacao.toLowerCase().includes(lower) ||
            item.codigo.startsWith(lower)
        );
        setFilteredData(filtered);
        setPage(0);
    }, [searchTerm]);

    if (!isOpen) return null;

    const visibleItems = filteredData.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Briefcase className="text-blue-600 w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">CBOS (Classificação Brasileira de Ocupações)</h2>
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
                            placeholder="Pesquisar por ocupação ou código..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 h-10"
                            autoFocus
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50 dark:bg-gray-900/50 p-2 space-y-1">
                    {visibleItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p>Nenhuma ocupação encontrada.</p>
                        </div>
                    ) : (
                        visibleItems.map((item) => (
                            <div
                                key={item.codigo}
                                className={`flex items-center gap-3 text-sm p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-200 hover:shadow-sm transition-all ${onSelect ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''}`}
                                onClick={() => onSelect && onSelect(item)}
                            >
                                <span className="font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded text-xs min-w-[60px] text-center">
                                    {item.codigo}
                                </span>
                                <span className="font-medium text-gray-700 dark:text-gray-200 flex-1">
                                    {item.ocupacao}
                                </span>
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
