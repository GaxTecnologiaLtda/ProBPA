
import React, { useState, useMemo } from 'react';
import { Button, Input, Select, Badge, cn } from '../../../components/ui/BaseComponents';
import { Trash2, Search, X, Plus } from 'lucide-react';
import ciapCidMap from '../../../services/ciap_cid_mapping.json';

interface ProblemaCondicao {
    uuidProblema?: string;
    uuidEvolucaoProblema?: string;
    coSequencialEvolucao?: number; // Int64
    ciap?: string;
    cid10?: string;
    situacao?: string; // 0, 1, 2
    dataInicioProblema?: number; // Epoch
    dataFimProblema?: number; // Epoch
    isAvaliado: boolean;
    label?: string; // Helper for display
    isHistory?: boolean; // UI Flag
}

interface ProblemaCondicaoListProps {
    value?: ProblemaCondicao[];
    onChange: (val: ProblemaCondicao[]) => void;
    patientDob?: string; // YYYY-MM-DD
    attendanceDate?: string; // YYYY-MM-DD
}

const SITUACAO_OPTIONS = [
    { value: '0', label: 'Ativo' },
    { value: '1', label: 'Latente' },
    { value: '2', label: 'Resolvido' },
];

export const ProblemaCondicaoList: React.FC<ProblemaCondicaoListProps> = ({
    value = [],
    onChange,
    patientDob,
    attendanceDate
}) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState<'CIAP' | 'CID'>('CIAP');

    // Filtered options for Modal
    const filteredOptions = useMemo(() => {
        if (!searchTerm || searchTerm.length < 2) return [];
        const lowerSearch = searchTerm.toLowerCase();

        return ciapCidMap.filter((item: any) => {
            if (searchType === 'CIAP') {
                return item.ciap?.toLowerCase().includes(lowerSearch) ||
                    item.ciap_desc?.toLowerCase().includes(lowerSearch);
            } else {
                return item.cid?.toLowerCase().includes(lowerSearch) ||
                    item.cid_desc?.toLowerCase().includes(lowerSearch);
            }
        }).slice(0, 50); // Limit results
    }, [searchTerm, searchType]);

    const handleAddItem = (item: any) => {
        // Validation: Prevent Duplicates
        const isDuplicate = value.some(p =>
            (p.ciap && p.ciap === item.ciap) || (p.cid10 && p.cid10 === item.cid)
        );

        if (isDuplicate) {
            alert("Este problema/condição já foi adicionado.");
            return;
        }

        const newProb: ProblemaCondicao = {
            uuidProblema: crypto.randomUUID(), // Generate new UUID
            ciap: searchType === 'CIAP' ? item.ciap : undefined,
            cid10: searchType === 'CID' ? item.cid : undefined,
            label: searchType === 'CIAP'
                ? `${item.ciap} - ${item.ciap_desc}`
                : `${item.cid} - ${item.cid_desc}`,
            isAvaliado: true, // Auto-mark as evaluated
            situacao: '0', // Default Active
            dataInicioProblema: attendanceDate ? new Date(attendanceDate).getTime() : undefined,
            coSequencialEvolucao: 1
        };

        const newVal = [...value, newProb];
        onChange(newVal);
        setIsSearchOpen(false);
        setSearchTerm('');
    };

    const handleRemove = (index: number) => {
        const newVal = [...value];
        newVal.splice(index, 1);
        onChange(newVal);
    };

    const handleChangeItem = (index: number, field: keyof ProblemaCondicao, val: any) => {
        const newVal = [...value];
        const item = { ...newVal[index], [field]: val };

        // Validation: Situacao 'Resolvido' (2) requires DataFim
        if (field === 'situacao' && val === '2') {
            if (!item.dataFimProblema && attendanceDate) {
                item.dataFimProblema = new Date(attendanceDate).getTime();
            }
        }
        if (field === 'situacao' && val !== '2') {
            item.dataFimProblema = undefined;
        }

        // Validation: W78 (Gravidez) cannot be '1-Latente'
        if (item.ciap === 'W78' && val === '1') {
            alert("CIAP W78 (Gravidez) não pode ter situação Latente.");
            return;
        }

        newVal[index] = item;
        onChange(newVal);
    };

    const handleDateChange = (index: number, field: 'dataInicioProblema' | 'dataFimProblema', dateStr: string) => {
        if (!dateStr) {
            handleChangeItem(index, field, undefined);
            return;
        }

        const dateEpoch = new Date(dateStr).getTime() + 12 * 60 * 60 * 1000; // Noon to avoid timezone shifts
        // Validation with Dob and Attendance
        if (patientDob) {
            const dobEpoch = new Date(patientDob).getTime();
            if (dateEpoch < dobEpoch) {
                alert("Data não pode ser anterior ao nascimento.");
                return;
            }
        }
        if (attendanceDate) {
            const attEpoch = new Date(attendanceDate).getTime();
            if (dateEpoch > attEpoch) {
                alert("Data não pode ser futura ao atendimento.");
                return;
            }
        }

        const currentItem = value[index];
        if (field === 'dataFimProblema' && currentItem.dataInicioProblema) {
            if (dateEpoch < currentItem.dataInicioProblema) {
                alert("Data Fim não pode ser menor que Data Início.");
                return;
            }
        }
        if (field === 'dataInicioProblema' && currentItem.dataFimProblema) {
            if (dateEpoch > currentItem.dataFimProblema) {
                alert("Data Início não pode ser maior que Data Fim.");
                return;
            }
        }

        handleChangeItem(index, field, dateEpoch);
    };

    const formatEpochToDate = (epoch?: number) => {
        if (!epoch) return '';
        return new Date(epoch).toISOString().split('T')[0];
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setIsSearchOpen(true); setSearchType('CIAP'); }}
                    className="w-full justify-center text-gray-600 dark:text-gray-300 border-dashed border-2 py-6 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                    <Plus className="mr-2" size={18} />
                    Adicionar CIAP
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setIsSearchOpen(true); setSearchType('CID'); }}
                    className="w-full justify-center text-gray-600 dark:text-gray-300 border-dashed border-2 py-6 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                    <Plus className="mr-2" size={18} />
                    Adicionar CID
                </Button>
            </div>

            {value.map((item, index) => (
                <div key={item.uuidProblema || index} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                                <Badge variant="neutral" className="mb-1 font-mono">
                                    {item.ciap ? `CIAP: ${item.ciap}` : `CID: ${item.cid10}`}
                                </Badge>
                                {item.isHistory && (
                                    <Badge variant="default" className="mb-1 text-[10px] bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200">
                                        Histórico (Evolução)
                                    </Badge>
                                )}
                            </div>
                            <p className="font-semibold text-sm">{item.label || 'Problema sem descrição'}</p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-100"
                        >
                            <Trash2 size={16} />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <Select
                                label="Situação"
                                value={item.situacao || '0'}
                                onChange={(e) => handleChangeItem(index, 'situacao', e.target.value)}
                                options={SITUACAO_OPTIONS}
                            />
                        </div>

                        <div>
                            <Input
                                label="Data Início"
                                type="date"
                                className="h-12"
                                value={formatEpochToDate(item.dataInicioProblema)}
                                onChange={(e) => handleDateChange(index, 'dataInicioProblema', e.target.value)}
                            />
                        </div>

                        <div>
                            <Input
                                label="Data Fim"
                                type="date"
                                className="h-12"
                                value={formatEpochToDate(item.dataFimProblema)}
                                onChange={(e) => handleDateChange(index, 'dataFimProblema', e.target.value)}
                                disabled={item.situacao !== '2'}
                            />
                        </div>

                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200">
                                <input
                                    type="checkbox"
                                    checked={item.isAvaliado}
                                    onChange={(e) => handleChangeItem(index, 'isAvaliado', e.target.checked)}
                                    className="rounded text-medical-600 focus:ring-medical-500 w-4 h-4"
                                />
                                Avaliado no Atendimento?
                            </label>
                        </div>
                    </div>
                </div>
            ))}

            {/* Custom Modal */}
            {isSearchOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Buscar {searchType}
                            </h3>
                            <button onClick={() => setIsSearchOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder={`Digite nome ou código para buscar ${searchType}...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                    autoFocus
                                />
                            </div>

                            <div className="border rounded-md flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                                {filteredOptions.length === 0 && searchTerm.length > 1 && (
                                    <div className="p-4 text-center text-gray-500 text-sm">Nenhum resultado encontrado.</div>
                                )}
                                {filteredOptions.map((opt: any, i) => (
                                    <button
                                        key={i}
                                        className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-800 border-b last:border-0 flex justify-between items-center group transition-colors"
                                        onClick={() => handleAddItem(opt)}
                                    >
                                        <div>
                                            <div className="font-bold text-sm text-gray-800 dark:text-gray-200">
                                                {searchType === 'CIAP' ? opt.ciap : opt.cid}
                                            </div>
                                            <div className="text-xs text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200">
                                                {searchType === 'CIAP' ? opt.ciap_desc : opt.cid_desc}
                                            </div>
                                        </div>
                                        <Plus size={16} className="opacity-0 group-hover:opacity-100 text-blue-500" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
