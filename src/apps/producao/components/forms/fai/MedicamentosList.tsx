import React, { useState } from 'react';
import { Card, Button, Input, Select, Badge, cn } from '../../../components/ui/BaseComponents';
import { Plus, Trash2, Pill, Save, X, Search, BookOpen } from 'lucide-react';
import { searchCatmat, CatmatItem } from '../../../services/catmatLookupService';
import { CatmatReferenceModal } from './CatmatReferenceModal';

interface Medicamento {
    codigoCatmat: string;
    viaAdministracao: string; // Num as string
    dose: string;
    doseUnica: boolean;
    usoContinuo: boolean;
    doseFrequenciaTipo: string;
    doseFrequencia: string;
    dtInicioTratamento: string; // Date string or generic
    duracaoTratamento: string;
    quantidadeReceitada: string;
}

interface MedicamentosListProps {
    value?: Medicamento[];
    onChange: (val: Medicamento[]) => void;
    disabled?: boolean;
}

const VIAS_ADMINISTRACAO = [
    { value: '1', label: 'Oral' },
    { value: '2', label: 'Parenteral' },
    { value: '3', label: 'Outras' }
    // Full list requires checking dictionary, simplified for now
];

const FREQUENCIA_TIPO = [
    { value: '1', label: 'Por dia' },
    { value: '2', label: 'Por hora' },
    { value: '3', label: 'Total' }
];

export const MedicamentosList: React.FC<MedicamentosListProps> = ({ value = [], onChange, disabled }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newItem, setNewItem] = useState<Partial<Medicamento>>({});

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<CatmatItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isRefModalOpen, setIsRefModalOpen] = useState(false);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const results = await searchCatmat(term);
        setSearchResults(results);
        setIsSearching(false);
    };

    const handleSelectMedicamento = (item: CatmatItem) => {
        setNewItem({
            ...newItem,
            codigoCatmat: item.codigo,
            // Pre-fill fields if we want, though standard list might differ on dose format
            // Let's use concentracao + forma as generic dose info if empty?
            dose: `${item.concentracao} (${item.formaFarmaceutica})`
        });
        setSearchTerm(`${item.codigo} - ${item.principioAtivo} ${item.concentracao}`);
        setSearchResults([]);
    };

    const handleAdd = () => {
        if (!newItem.codigoCatmat || !newItem.dose) return; // Basic validation
        onChange([...value, newItem as Medicamento]);
        setNewItem({});
        setIsAdding(false);
    };

    const handleRemove = (index: number) => {
        const next = [...value];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <Card className="p-4 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    Medicamentos
                </h3>
                {!isAdding && !disabled && (
                    <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                )}
            </div>

            {/* List */}
            <div className="space-y-2 mb-4">
                {value.map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border text-sm">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full mr-4">
                            <span className="font-medium text-slate-700 col-span-2">
                                {med.codigoCatmat} - {med.dose}
                            </span>
                            <span className="text-xs text-slate-500">
                                Via: {VIAS_ADMINISTRACAO.find(v => v.value === med.viaAdministracao)?.label || med.viaAdministracao}
                            </span>
                            <span className="text-xs text-slate-500">
                                Duração: {med.duracaoTratamento} {med.usoContinuo && '(Contínuo)'}
                            </span>
                        </div>
                        {!disabled && (
                            <Button size="xs" variant="ghost" className="text-red-500 h-8 w-8 p-0" onClick={() => handleRemove(idx)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                ))}
                {value.length === 0 && !isAdding && (
                    <p className="text-center text-xs text-slate-400 py-2">Nenhum medicamento prescrito.</p>
                )}
            </div>

            {/* Add Form */}
            {isAdding && (
                <div className="bg-white border rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium mb-1 block">Código CATMAT / Nome</label>
                            <div className="relative">
                                <Input
                                    value={searchTerm}
                                    onChange={e => handleSearch(e.target.value)}
                                    placeholder="Busque por nome ou código..."
                                    className="pr-8"
                                />
                                <div className="absolute right-2 top-2.5 text-slate-400">
                                    <Search size={16} />
                                </div>
                                {/* Search Results Dropdown */}
                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                                        {searchResults.map((res) => (
                                            <div
                                                key={res.codigo}
                                                className="p-2 hover:bg-slate-100 cursor-pointer text-xs border-b last:border-0"
                                                onClick={() => handleSelectMedicamento(res)}
                                            >
                                                <div className="font-bold text-slate-700">{res.principioAtivo}</div>
                                                <div className="text-slate-500 flex justify-between">
                                                    <span>{res.concentracao} - {res.formaFarmaceutica}</span>
                                                    <span className="font-mono text-[10px] bg-slate-200 px-1 rounded">{res.codigo}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsRefModalOpen(true)}
                                className="text-xs text-medical-600 hover:text-medical-700 flex items-center gap-1 mt-1 font-medium"
                            >
                                <BookOpen size={14} />
                                Consultar Tabela Completa
                            </button>
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block">Via de Administração</label>
                            <Select
                                value={newItem.viaAdministracao || ''}
                                onChange={originalEvent => setNewItem({ ...newItem, viaAdministracao: originalEvent.target.value })}
                                options={[{ value: '', label: 'Selecione' }, ...VIAS_ADMINISTRACAO]}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block">Dose</label>
                            <Input
                                value={newItem.dose || ''}
                                onChange={e => setNewItem({ ...newItem, dose: e.target.value })}
                                placeholder="Ex: 500mg"
                            />
                        </div>
                        <div className="flex items-center gap-4 pt-6">
                            <label className="flex items-center gap-2 text-xs">
                                <input
                                    type="checkbox"
                                    checked={newItem.doseUnica || false}
                                    onChange={e => setNewItem({ ...newItem, doseUnica: e.target.checked })}
                                    className="rounded border-gray-300"
                                />
                                Dose Única
                            </label>
                            <label className="flex items-center gap-2 text-xs">
                                <input
                                    type="checkbox"
                                    checked={newItem.usoContinuo || false}
                                    onChange={e => setNewItem({ ...newItem, usoContinuo: e.target.checked })}
                                    className="rounded border-gray-300"
                                />
                                Uso Contínuo
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs font-medium mb-1 block">Frequência</label>
                                <Input
                                    type="number"
                                    value={newItem.doseFrequencia || ''}
                                    onChange={e => setNewItem({ ...newItem, doseFrequencia: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Tipo Freq.</label>
                                <Select
                                    value={newItem.doseFrequenciaTipo || ''}
                                    onChange={e => setNewItem({ ...newItem, doseFrequenciaTipo: e.target.value })}
                                    options={[{ value: '', label: 'Selecione' }, ...FREQUENCIA_TIPO]}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block">Duração (dias/semanas)</label>
                            <Input
                                type="number"
                                value={newItem.duracaoTratamento || ''}
                                onChange={e => setNewItem({ ...newItem, duracaoTratamento: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block">Qtde Receitada</label>
                            <Input
                                type="number"
                                value={newItem.quantidadeReceitada || ''}
                                onChange={e => setNewItem({ ...newItem, quantidadeReceitada: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block">Início Tratamento</label>
                            <Input
                                type="date"
                                value={newItem.dtInicioTratamento || ''}
                                onChange={e => setNewItem({ ...newItem, dtInicioTratamento: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                            <X className="w-4 h-4 mr-1" /> Cancelar
                        </Button>
                        <Button size="sm" onClick={handleAdd}>
                            <Save className="w-4 h-4 mr-1" /> Salvar
                        </Button>
                    </div>
                </div>
            )}

            <CatmatReferenceModal
                isOpen={isRefModalOpen}
                onClose={() => setIsRefModalOpen(false)}
                onSelect={(item) => {
                    handleSelectMedicamento(item);
                    setIsRefModalOpen(false);
                }}
            />
        </Card>
    );
};
