import React, { useState } from 'react';
import { Button, Badge, cn } from '../../ui/BaseComponents';
import { Trash2, Plus, Info, LayoutList } from 'lucide-react';
import { SigtapTreeSelector } from '../../SigtapTreeSelector';
import { SigtapProcedureRow } from '../../../services/sigtapLookupService';

interface SolicitacoesOciListProps {
    value?: { codigoSigtap: string; desc?: string }[];
    onChange: (val: { codigoSigtap: string; desc?: string }[]) => void;
    currentCompetence?: string;
    existingProcedureCodes?: string[]; // Codes already used in "Procedimentos Realizados"
}

export const SolicitacoesOciList: React.FC<SolicitacoesOciListProps> = ({
    value = [],
    onChange,
    currentCompetence = '202412', // Fallback
    existingProcedureCodes = []
}) => {
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSelect = (item: SigtapProcedureRow) => {
        setError(null);

        // 1. Check Group 09 (Should be filtered by SigtapTreeSelector, but double check)
        if (!item.code.startsWith('09')) {
            setError('Apenas procedimentos do Grupo 09 (OCI) podem ser adicionados aqui.');
            return;
        }

        // 2. Check Duplication in Current List
        if (value.some(v => v.codigoSigtap === item.code)) {
            setError('Este procedimento já está na lista de solicitações.');
            return;
        }

        // 3. Check Duplication in "Procedimentos Realizados" (Warning)
        if (existingProcedureCodes.includes(item.code)) {
            setError('Este procedimento já foi inserido em "Procedimentos Realizados". Evite duplicidade.');
            return;
        }

        onChange([...value, { codigoSigtap: item.code, desc: item.name }]);
        setIsSearching(false);
    };

    const handleRemove = (code: string) => {
        onChange(value.filter(v => v.codigoSigtap !== code));
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                    <LayoutList size={16} />
                    Lista de Solicitações (Grupo 09)
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearching(true)}
                    className="flex items-center gap-1"
                >
                    <Plus size={14} />
                    Adicionar OCI
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-2 rounded border border-red-200 animate-in fade-in slide-in-from-top-1">
                    {error}
                </div>
            )}

            {value.length === 0 && (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                    <span className="text-gray-400 text-sm">Nenhuma solicitação OCI registrada.</span>
                </div>
            )}

            {value.length > 0 && (
                <div className="space-y-2">
                    {value.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700 shadow-sm hover:border-indigo-200 transition-colors">
                            <div className="flex-1">
                                <div className="text-sm font-bold text-gray-800 dark:text-gray-200 font-mono">
                                    {item.codigoSigtap}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                    {item.desc || 'Descrição não disponível'}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemove(item.codigoSigtap)}
                                className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                title="Remover"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {isSearching && (
                <SigtapTreeSelector
                    isOpen={true}
                    onClose={() => setIsSearching(false)}
                    onSelect={handleSelect}
                    currentCompetence={currentCompetence}
                // We might need to implement a 'rootFilter' prop in SigtapTreeSelector if it doesn't exist
                // For now, we rely on the search bar or user navigation.
                // Ideally, we'd pass `rootGroup="09"`
                />
            )}
        </div>
    );
};
