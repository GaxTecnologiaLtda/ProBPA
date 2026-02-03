import React, { useState, useMemo, useEffect } from 'react';
import { Button, Input, Badge, cn } from '../../../components/ui/BaseComponents';
import { Trash2, Search, X, Plus, Check, Table, FolderTree } from 'lucide-react';
import examsListClean from '../../../services/exams_list_clean.json';
import { SigtapTreeSelector } from '../../SigtapTreeSelector';
import { sigtapService } from '../../../services/sigtapService'; // Assuming exported or we use dynamic if issues

// Interfaces based on Thrift
interface ExameItem {
    codigoExame: string;
    solicitadoAvaliado: string[]; // "S", "A"
    label?: string; // Helper for display
}

interface RequestedExamsListProps {
    value?: ExameItem[];
    onChange: (val: ExameItem[]) => void;
    currentCompetence?: string;
    pendingExams?: { code: string, name: string, date: string }[];
}

export const RequestedExamsList: React.FC<RequestedExamsListProps> = ({
    value = [],
    onChange,
    currentCompetence,
    pendingExams = []
}) => {
    // Sigtap Modal State
    const [isSigtapModalOpen, setIsSigtapModalOpen] = useState(false);

    // --- Sigtap Inline Search State ---
    const [sigtapSearchTerm, setSigtapSearchTerm] = useState('');
    const [sigtapResults, setSigtapResults] = useState<any[]>([]);
    const [searchingSigtap, setSearchingSigtap] = useState(false);
    const [showSigtapDropdown, setShowSigtapDropdown] = useState(false);

    // Debounce Sigtap Search
    useEffect(() => {
        if (!sigtapSearchTerm || sigtapSearchTerm.length < 3) {
            setSigtapResults([]);
            setShowSigtapDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setSearchingSigtap(true);
            try {
                const results = await sigtapService.searchProcedures(sigtapSearchTerm, currentCompetence || '202501');
                setSigtapResults(results);
                setShowSigtapDropdown(true);
            } catch (err) {
                console.error("Sigtap Search Error", err);
            } finally {
                setSearchingSigtap(false);
            }
        }, 600); // 600ms debounce

        return () => clearTimeout(timer);
    }, [sigtapSearchTerm, currentCompetence]);

    const handleAdd = (code: string, name: string, initialStatus: string[] = ['S']) => {
        // Rule: No duplicates
        if (value.some(v => v.codigoExame === code)) {
            alert("Exame já adicionado.");
            return;
        }

        const newItem: ExameItem = {
            codigoExame: code,
            solicitadoAvaliado: initialStatus,
            label: `${code} - ${name}`
        };
        onChange([...value, newItem]);

        // Clear search states if added from search
        setSigtapSearchTerm('');
        setShowSigtapDropdown(false);
    };

    const handleRemove = (index: number) => {
        const newVal = [...value];
        newVal.splice(index, 1);
        onChange(newVal);
    };

    const toggleStatus = (index: number, status: 'S' | 'A') => {
        const newVal = [...value];
        const currentStatuses = newVal[index].solicitadoAvaliado;

        let newStatuses: string[];
        if (currentStatuses.includes(status)) {
            newStatuses = currentStatuses.filter(s => s !== status);
        } else {
            newStatuses = [...currentStatuses, status];
        }

        // Rule: Min 1 selected
        if (newStatuses.length === 0) {
            alert("Pelo menos uma opção (Solicitado ou Avaliado) deve ser marcada.");
            return;
        }

        newVal[index].solicitadoAvaliado = newStatuses;
        onChange(newVal);
    };

    const handleSigtapSelect = (proc: any) => {
        // Validation: Warn if not Group 02 (Diagnostics)
        if (proc.groupCode !== '02') {
            const confirm = window.confirm(`Atenção: O procedimento selecionado (${proc.code}) pertence ao Grupo ${proc.groupCode} (não é Diagnóstico padrão).\nDeseja adicionar mesmo assim?`);
            if (!confirm) return;
        }
        handleAdd(proc.code, proc.name);
    };

    return (
        <div className="space-y-6">
            {/* PENDING EXAMS ALERT */}
            {pendingExams && pendingExams.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4 animate-in slide-in-from-top-2">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                        <Table size={16} /> Exames Pendentes ({pendingExams.length})
                    </h4>
                    <div className="space-y-2">
                        {pendingExams.map((exam, idx) => (
                            !value.some(v => v.codigoExame === exam.code) && (
                                <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded border border-yellow-100 dark:border-yellow-800 shadow-sm">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="neutral" className="text-[10px] h-5">{exam.code}</Badge>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{exam.name}</span>
                                        </div>
                                        <span className="text-xs text-gray-500">Solicitado: {exam.date ? exam.date.split('-').reverse().join('/') : '-'}</span>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => handleAdd(exam.code, exam.name, ['A'])}>Avaliar</Button>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* LEFT: Common Exams Grid (Visual Table) */}
                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col h-full">
                    <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Check size={16} className="text-teal-500" />
                        Principais Exames (Clique para adicionar)
                    </h5>
                    <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                        {examsListClean.slice(0, 30).map((item: any) => (
                            <button
                                key={item.value}
                                onClick={() => handleAdd(item.value, item.label)}
                                className="text-left px-2 py-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-700 hover:border-blue-400 hover:shadow-md rounded text-xs transition-all flex flex-col gap-1 group"
                                title={item.label}
                            >
                                <span className="font-semibold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 truncate w-full block">
                                    {item.label?.split('-')[1]?.trim() || item.label}
                                </span>
                                <Badge variant="secondary" className="text-[9px] w-fit opacity-70 font-mono">{item.value}</Badge>
                            </button>
                        ))}
                    </div>
                </div>

                {/* RIGHT: SIGTAP Search (Inline) */}
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 p-4 flex flex-col h-full">
                    <h5 className="text-sm font-bold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                        <Search size={16} />
                        Buscar na Tabela SIGTAP (Completa)
                    </h5>
                    <div className="relative flex-1">
                        <Input
                            placeholder="Digite nome ou código (ex: Hemograma, 020502...)"
                            value={sigtapSearchTerm}
                            onChange={e => setSigtapSearchTerm(e.target.value)}
                            className="bg-white dark:bg-slate-900 shadow-sm border-blue-300 focus:border-blue-500 mb-2"
                        />
                        {searchingSigtap && <span className="absolute right-3 top-2.5 text-xs text-blue-500 animate-pulse bg-white px-1">Buscando...</span>}

                        {/* Dropdown Results */}
                        {showSigtapDropdown && sigtapResults.length > 0 && (
                            <div className="absolute top-11 left-0 right-0 bg-white dark:bg-slate-800 border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95">
                                {sigtapResults.map((res: any) => (
                                    <button
                                        key={res.code}
                                        onClick={() => handleSigtapSelect(res)}
                                        className="w-full text-left px-3 py-2 text-xs border-b hover:bg-blue-50 dark:hover:bg-blue-900/30 flex justify-between items-center group transition-colors"
                                    >
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 truncate mr-2">{res.name}</span>
                                            <span className="text-[10px] text-slate-500">{res.code} • {res.groupCode === '02' ? 'Diagnóstico' : 'Outros'}</span>
                                        </div>
                                        <Plus size={14} className="text-blue-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}
                        {showSigtapDropdown && sigtapResults.length === 0 && !searchingSigtap && (
                            <div className="absolute top-11 left-0 right-0 bg-white dark:bg-slate-800 border rounded p-3 text-xs text-center text-gray-500 shadow-lg z-50">
                                Nenhum resultado encontrado no SIGTAP.
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-blue-200/50">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsSigtapModalOpen(true)}
                                className="w-full text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-xs flex justify-center"
                            >
                                <FolderTree className="mr-2" size={14} />
                                Ou navegue pela Tabela Hierárquica
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* List of Selected Exams */}
            <div className="space-y-2 pt-2">
                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Exames Selecionados ({value.length})</h5>
                {value.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-lg text-gray-400 text-sm">
                        Nenhum exame solicitado ou avaliado.
                    </div>
                )}
                {value.map((item, index) => (
                    <div key={item.codigoExame} className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in slide-in-from-left-2">
                        <div className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="neutral" className="font-mono text-xs">
                                    {item.codigoExame}
                                </Badge>
                            </div>
                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate max-w-md" title={item.label}>
                                {item.label || 'Exame sem descrição'}
                            </p>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0">
                            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                <div className={cn(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    item.solicitadoAvaliado.includes('S') ? "bg-medical-600 border-medical-600 text-white" : "border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600"
                                )}>
                                    {item.solicitadoAvaliado.includes('S') && <Check size={12} />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={item.solicitadoAvaliado.includes('S')}
                                    onChange={() => toggleStatus(index, 'S')}
                                />
                                Solicitado
                            </label>

                            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                <div className={cn(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    item.solicitadoAvaliado.includes('A') ? "bg-medical-600 border-medical-600 text-white" : "border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600"
                                )}>
                                    {item.solicitadoAvaliado.includes('A') && <Check size={12} />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={item.solicitadoAvaliado.includes('A')}
                                    onChange={() => toggleStatus(index, 'A')}
                                />
                                Avaliado
                            </label>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemove(index)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-100 ml-2"
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal: Sigtap Tree Selector */}
            {isSigtapModalOpen && (
                <SigtapTreeSelector
                    isOpen={isSigtapModalOpen}
                    onClose={() => setIsSigtapModalOpen(false)}
                    onSelect={handleSigtapSelect}
                    currentCompetence={currentCompetence}
                />
            )}
        </div>
    );
};
