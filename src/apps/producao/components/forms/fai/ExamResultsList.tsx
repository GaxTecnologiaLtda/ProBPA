import React, { useState, useMemo } from 'react';
import { Card, Button, Input, Select, Badge, cn } from '../../../components/ui/BaseComponents';
import { Plus, Trash2, TestTube, Save, X, AlertCircle, Search } from 'lucide-react';
import examList from '../../../services/exams_list_clean.json';

interface ResultadoItem {
    tipoResultado: string; // 1=Valor, 2=Dias, 3=Semanas, 4=Data
    valorResultado: string;
}

interface ItemExame {
    exame: string; // Code (SIA)
    dataSolicitacao?: string;
    dataRealizacao?: string;
    dataResultado?: string;
    resultado?: ResultadoItem[];
}

interface ExamResultsListProps {
    value?: ItemExame[];
    onChange: (val: ItemExame[]) => void;
    disabled?: boolean;
    patientDob?: string; // Needed for validation
    attendanceDate?: string; // dataHoraInicialAtendimento (Epoch or Date string)
}

const TIPO_RESULTADO = [
    { value: '1', label: '1 - Valor' },
    { value: '2', label: '2 - Dias' },
    { value: '3', label: '3 - Semanas' },
    { value: '4', label: '4 - Data' }
];

// Special Codes
const OBSTETRIC_ULTRASOUNDS = ['0205020143', '0205020151', '0205010059', 'ABEX024']; // ABEX024 mapped to SIA 0205020143 usually
// Note: User listed 02.05.02.014-3 (ABEX024), 02.05.02.015-1, 02.05.01.005-9
// We should check normalized codes (no dots/hyphens).
// 0205020143 -> ABEX024
// 0205020151
// 0205010059

const TESTE_ORELHINHA = [
    { value: '5', label: '5 - Passou' },
    { value: '6', label: '6 - Falhou' }
];

const TOMOGRAFIA = [
    { value: '11', label: '11 - Normal' },
    { value: '12', label: '12 - Sugestivo de infecção congênita' },
    { value: '13', label: '13 - Outras alterações' },
    { value: '14', label: '14 - Indeterminado' }
];

const RESSONANCIA = [
    { value: '15', label: '15 - Normal' },
    { value: '16', label: '16 - Sugestivo de infecção congênita' },
    { value: '17', label: '17 - Outras alterações' },
    { value: '18', label: '18 - Indeterminado' }
];

const FUNDO_OLHO = [
    { value: '3', label: '3 - Normal' },
    { value: '4', label: '4 - Alterado' }
];

const TESTE_OLHINHO = [
    { value: '1', label: '1 - Presente bilateral' },
    { value: '2', label: '2 - Duvidoso ou ausente' }
];

const PROVA_LACO = [
    { value: '19', label: '19 - Positivo' },
    { value: '20', label: '20 - Negativo' },
    { value: '21', label: '21 - Inconclusivo' }
];

const CODED_RESULTS: Record<string, { value: string, label: string }[]> = {
    '0205020178': [ // Ultrassonografia transfontanela
        { value: '7', label: '7 - Normal' },
        { value: '8', label: '8 - Sugestivo de infecção congênita' },
        { value: '9', label: '9 - Outras alterações' },
        { value: '10', label: '10 - Indeterminado' }
    ],
    // Teste Orelhinha
    '0211070270': TESTE_ORELHINHA,
    '0211070149': TESTE_ORELHINHA,
    'ABEX020': TESTE_ORELHINHA,
    // Tomografia
    '0206010079': TOMOGRAFIA,
    // Ressonancia
    '0207010064': RESSONANCIA,
    // Fundo de Olho
    '0211060100': FUNDO_OLHO,
    'ABPG013': FUNDO_OLHO,
    // Teste Olhinho
    'ABEX022': TESTE_OLHINHO,
    // Prova Laco
    '0202020509': PROVA_LACO
};

interface NumericRange { min: number; max: number; label: string; }

const NUMERIC_RANGES: Record<string, NumericRange> = {
    // 0-100
    '0202010503': { min: 0, max: 100, label: '0,00 a 100,00' },
    'ABEX008': { min: 0, max: 100, label: '0,00 a 100,00' },
    // 1-10000
    '0202010295': { min: 1, max: 10000, label: '1,00 a 10000,00' },
    'ABEX002': { min: 1, max: 10000, label: '1,00 a 10000,00' },
    '0202010279': { min: 1, max: 10000, label: '1,00 a 10000,00' },
    'ABEX007': { min: 1, max: 10000, label: '1,00 a 10000,00' },
    '0202010287': { min: 1, max: 10000, label: '1,00 a 10000,00' },
    'ABEX009': { min: 1, max: 10000, label: '1,00 a 10000,00' },
    '0202010678': { min: 1, max: 10000, label: '1,00 a 10000,00' },
    // 0.1 - 500
    '0202010317': { min: 0.1, max: 500, label: '0,10 a 500,00' },
    'ABEX003': { min: 0.1, max: 500, label: '0,10 a 500,00' },
    // 0.001 - 1000
    '0202050025': { min: 0.001, max: 1000, label: '0,001 a 1000,000' }
};

export const ExamResultsList: React.FC<ExamResultsListProps> = ({
    value = [],
    onChange,
    disabled,
    patientDob,
    attendanceDate
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newItem, setNewItem] = useState<Partial<ItemExame>>({});
    const [newItemError, setNewItemError] = useState<string | null>(null);

    // Inner state for adding a result value
    const [newResVal, setNewResVal] = useState<Partial<ResultadoItem>>({});
    const [resValError, setResValError] = useState<string | null>(null);

    // Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredExams = useMemo(() => {
        if (!searchTerm) return examList;
        const lower = searchTerm.toLowerCase();
        return examList.filter(item =>
            item.label.toLowerCase().includes(lower) ||
            item.value.includes(lower)
        );
    }, [searchTerm]);

    // --- Helpers & Definitions ---
    const normalizeCode = (code: string) => code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const isObstetric = useMemo(() => {
        if (!newItem.exame) return false;
        const norm = normalizeCode(newItem.exame);
        // Check strict list from user request
        // 0205020143, 0205020151, 0205010059, ABEX024
        return ['0205020143', '0205020151', '0205010059', 'ABEX024'].some(c => norm.includes(c));
    }, [newItem.exame]);

    const allowedResultTypes = useMemo(() => {
        if (isObstetric) {
            return TIPO_RESULTADO.filter(t => ['3', '4'].includes(t.value)); // Only Semanas/Data per rule? User said "pelo menos com o valor 3 ou 4... e NÃO PODE ser 1"
        }
        return TIPO_RESULTADO.filter(t => t.value === '1'); // Default only Value? User: "Para os demais... somente poderá ser informado 1 - Valor"
    }, [isObstetric]);

    // Auto-select Type if only one option
    React.useEffect(() => {
        if (allowedResultTypes.length === 1 && !newResVal.tipoResultado) {
            setNewResVal(prev => ({ ...prev, tipoResultado: allowedResultTypes[0].value }));
        }
    }, [allowedResultTypes, newResVal.tipoResultado]);

    const codedOptions = useMemo(() => {
        if (!newItem.exame) return null;
        const norm = normalizeCode(newItem.exame);
        return CODED_RESULTS[newItem.exame] || CODED_RESULTS[norm];
    }, [newItem.exame]);

    const numericRange = useMemo(() => {
        if (!newItem.exame) return null;
        const norm = normalizeCode(newItem.exame);
        return NUMERIC_RANGES[newItem.exame] || NUMERIC_RANGES[norm];
    }, [newItem.exame]);

    const handleSelectExam = (exam: typeof examList[0]) => {
        setNewItem({
            ...newItem,
            exame: exam.value
        });
        setIsSearchOpen(false);
        setSearchTerm('');
    };

    // --- Helpers ---



    // --- Validation Logic ---

    const validateDates = (item: Partial<ItemExame>): string | null => {
        if (!item.dataSolicitacao && !item.dataRealizacao && !item.dataResultado) return null; // Partial entry ok until save? No, rules say mandatory.

        // Convert to Date objects
        const dob = patientDob ? new Date(patientDob) : null;
        const attStart = attendanceDate ? new Date(attendanceDate) : new Date(); // Default to Now if missing

        const dSol = item.dataSolicitacao ? new Date(item.dataSolicitacao) : null;
        const dReal = item.dataRealizacao ? new Date(item.dataRealizacao) : null;
        const dRes = item.dataResultado ? new Date(item.dataResultado) : null;

        // 1. Birth Date Check
        if (dob) {
            if (dSol && dSol < dob) return "Data Solicitação anterior ao Nascimento";
            if (dReal && dReal < dob) return "Data Realização anterior ao Nascimento";
            if (dRes && dRes < dob) return "Data Resultado anterior ao Nascimento";
        }

        // 2. Attendance Date Check (Cannot be posterior to start of attendance - wait, usually exams are BEFORE attendance?)
        // Rule: "Não pode ser posterior à dataHoraInicialAtendimento" implies historical exams.
        if (attStart) {
            // Compare dates generally (ignoring time for simplicity unless strict)
            if (dSol && dSol > attStart) return "Data Solicitação posterior ao Atendimento";
            if (dReal && dReal > attStart) return "Data Realização posterior ao Atendimento";
            if (dRes && dRes > attStart) return "Data Resultado posterior ao Atendimento";
        }

        // 3. Chronology
        if (dSol && dReal && dReal < dSol) return "Data Realização anterior à Solicitação";
        if (dReal && dRes && dRes < dReal) return "Data Resultado anterior à Realização";

        return null;
    };

    const validateResultValue = (val: Partial<ResultadoItem>): string | null => {
        if (!val.tipoResultado || !val.valorResultado) return "Preencha tipo e valor";

        // 1. Coded Result Validation
        if (codedOptions && val.tipoResultado === '1') { // Usually '1' for code value, but check if rule allows others
            const isValid = codedOptions.some(opt => opt.value === val.valorResultado);
            if (!isValid) return "Valor inválido para este exame (selecione da lista)";
        }

        // 2. Numeric Range Validation
        if (numericRange && val.tipoResultado === '1') {
            // Parse float for decimals
            const num = parseFloat(val.valorResultado.replace(',', '.'));
            if (isNaN(num)) return "Valor numérico inválido";
            if (num < numericRange.min || num > numericRange.max) {
                return `Valor deve ser entre ${numericRange.label}`;
            }
        }

        // 3. Obstetric Rules
        if (isObstetric) {
            if (val.tipoResultado === '2') {
                const v = parseInt(val.valorResultado);
                if (isNaN(v) || v < 0 || v > 6) return "Dias deve ser 0-6";
            }
            if (val.tipoResultado === '3') {
                const v = parseInt(val.valorResultado);
                if (isNaN(v) || v < 0 || v > 42) return "Semanas deve ser 0-42";
            }
            if (val.tipoResultado === '4') {
                // Date validation? Usually just valid date string
            }
        }
        return null;
    };

    // --- Handlers ---

    const handleAddResultVal = () => {
        setResValError(null);
        if (!newResVal.valorResultado || !newResVal.tipoResultado) return;

        const error = validateResultValue(newResVal);
        if (error) {
            setResValError(error);
            return;
        }

        const currentList = newItem.resultado || [];
        setNewItem({ ...newItem, resultado: [...currentList, newResVal as ResultadoItem] });
        setNewResVal({});
    };

    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const handleEdit = (index: number) => {
        setEditingIndex(index);
        setNewItem(value[index]);
        setIsAdding(true);
        setNewItemError(null);
    };

    const handleAddExam = () => {
        setNewItemError(null);
        // Validations
        if (!newItem.exame) {
            setNewItemError("Código do exame obrigatório");
            return;
        }
        if (!newItem.dataRealizacao) { // Realização is mandatory per rule? "Sim"
            setNewItemError("Data Realização obrigatória");
            return;
        }
        if (!newItem.resultado || newItem.resultado.length === 0) {
            setNewItemError("Adicione ao menos um resultado");
            return;
        }
        if (newItem.resultado.length > 3) {
            setNewItemError("Máximo 3 resultados por exame");
            return;
        }

        const dateErr = validateDates(newItem);
        if (dateErr) {
            setNewItemError(dateErr);
            return;
        }

        if (editingIndex !== null) {
            // Update Existing
            const updated = [...value];
            updated[editingIndex] = newItem as ItemExame;
            onChange(updated);
            setEditingIndex(null);
        } else {
            // Add New
            onChange([...value, newItem as ItemExame]);
        }

        setNewItem({});
        setIsAdding(false);
    };

    const handleRemove = (index: number) => {
        const next = [...value];
        next.splice(index, 1);
        onChange(next);
        if (editingIndex === index) {
            setEditingIndex(null);
            setIsAdding(false);
            setNewItem({});
        }
    };

    const handleCancel = () => {
        setIsAdding(false);
        setNewItem({});
        setNewItemError(null);
        setEditingIndex(null);
    };

    return (
        <Card className="p-4 border border-slate-200 shadow-sm mt-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <TestTube className="w-4 h-4 text-purple-600" />
                    Resultados de Exames
                </h3>
                {!isAdding && !disabled && (
                    <Button size="sm" variant="outline" type="button" onClick={() => setIsAdding(true)}>
                        <Plus className="w-4 h-4 mr-1" /> Adicionar Resultado
                    </Button>
                )}
            </div>

            {/* List */}
            <div className="space-y-2 mb-4">
                {value.length === 0 && <p className="text-xs text-slate-400 italic">Nenhum resultado registrado.</p>}
                {value.map((item, idx) => (
                    <div key={idx} className={cn(
                        "flex flex-col p-3 bg-slate-50 rounded-md border text-sm gap-2 transition-opacity",
                        editingIndex === idx ? "opacity-50 pointer-events-none ring-2 ring-purple-100" : ""
                    )}>
                        <div className="flex justify-between items-start">
                            <span className="font-medium text-slate-700">Exame: {item.exame}</span>
                            {!disabled && (
                                <div className="flex gap-1">
                                    <Button size="xs" variant="ghost" type="button" className="text-blue-600 h-6 px-2" onClick={() => handleEdit(idx)}>
                                        Editar / Lançar
                                    </Button>
                                    <Button size="xs" variant="ghost" type="button" className="text-red-500 h-6 w-6 p-0" onClick={() => handleRemove(idx)}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                            <span>Sol: {item.dataSolicitacao ? new Date(item.dataSolicitacao).toLocaleDateString('pt-BR') : '-'}</span>
                            <span>Real: {item.dataRealizacao ? new Date(item.dataRealizacao).toLocaleDateString('pt-BR') : '-'}</span>
                            <span>Res: {item.dataResultado ? new Date(item.dataResultado).toLocaleDateString('pt-BR') : '-'}</span>
                        </div>
                        {item.resultado && item.resultado.length > 0 && (
                            <div className="mt-1 pl-2 border-l-2 border-purple-200">
                                {item.resultado.map((r, ri) => (
                                    <div key={ri} className="text-xs">
                                        [{TIPO_RESULTADO.find(t => t.value === r.tipoResultado)?.label}]: <span className="font-medium">{r.valorResultado}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {(!item.resultado || item.resultado.length === 0) && (
                            <div className="mt-1 text-xs text-amber-600 italic flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Pendente de preenchimento
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add/Edit Form */}
            {isAdding && (
                <div className="bg-white border rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2 ring-1 ring-purple-200 shadow-lg">
                    <div className="flex justify-between items-center pb-2 border-b">
                        <h4 className="text-xs font-bold uppercase text-purple-700">
                            {editingIndex !== null ? 'Editando Resultado' : 'Novo Resultado'}
                        </h4>
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleCancel}>
                            <X className="w-3 h-3" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="text-xs font-medium mb-1 block">Exame</label>
                            <div className="flex gap-2">
                                <Input
                                    value={newItem.exame || ''}
                                    readOnly
                                    placeholder="Selecione um exame..."
                                    className="bg-slate-50 font-mono text-xs"
                                />
                                <Button size="icon" variant="outline" type="button" onClick={() => setIsSearchOpen(true)}>
                                    <Search className="w-4 h-4" />
                                </Button>
                            </div>
                            {/* Display Name Helper */}
                            {newItem.exame && (
                                <p className="text-[10px] text-slate-500 mt-1 truncate">
                                    {examList.find(e => e.value === newItem.exame)?.label}
                                </p>
                            )}
                            {isObstetric && <span className="text-[10px] text-blue-600 font-medium block mt-1">Exame Obstétrico Detectado (Regras esp. aplicadas)</span>}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-xs font-medium mb-1 block">Data Sol.</label>
                                <Input type="date" value={newItem.dataSolicitacao || ''} onChange={e => setNewItem({ ...newItem, dataSolicitacao: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Data Real. <span className="text-red-500">*</span></label>
                                <Input type="date" value={newItem.dataRealizacao || ''} onChange={e => setNewItem({ ...newItem, dataRealizacao: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Data Res.</label>
                                <Input type="date" value={newItem.dataResultado || ''} onChange={e => setNewItem({ ...newItem, dataResultado: e.target.value })} />
                            </div>
                        </div>






                        {/* Sub-form for Values */}
                        <div className="bg-slate-50 p-2 rounded border">
                            <label className="text-xs font-medium mb-1 block text-slate-600">Adicionar Valor do Resultado</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                                <Select
                                    label=""
                                    value={newResVal.tipoResultado || ''}
                                    onChange={e => setNewResVal({ ...newResVal, tipoResultado: e.target.value })}
                                    options={allowedResultTypes}
                                    placeholder="Selecione o Tipo..."
                                />
                                {codedOptions && newResVal.tipoResultado === '1' ? (
                                    <Select
                                        label=""
                                        value={newResVal.valorResultado || ''}
                                        onChange={e => setNewResVal({ ...newResVal, valorResultado: e.target.value })}
                                        options={codedOptions}
                                        placeholder="Selecione o Resultado..."
                                    />
                                ) : (
                                    <div className="w-full">
                                        <Input
                                            value={newResVal.valorResultado || ''}
                                            type={newResVal.tipoResultado === '4' ? 'date' : 'text'}
                                            onChange={e => setNewResVal({ ...newResVal, valorResultado: e.target.value })}
                                            placeholder={newResVal.tipoResultado === '4' ? '' : "Valor"}
                                        />
                                        {numericRange && newResVal.tipoResultado === '1' && (
                                            <span className="text-[10px] text-slate-500 mt-1 block">
                                                Faixa permitida: {numericRange.label}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {resValError && <p className="text-xs text-red-500 mb-2">{resValError}</p>}
                            <Button size="xs" variant="secondary" type="button" onClick={handleAddResultVal} disabled={!newResVal.valorResultado || !newResVal.tipoResultado} className="w-full">
                                <Plus className="w-3 h-3 mr-1" /> Incluir Valor
                            </Button>

                            {/* Current Values Preview */}
                            {(newItem.resultado || []).map((r, i) => (
                                <div key={i} className="text-xs mt-1 bg-white p-1 border rounded flex justify-between items-center animate-in slide-in-from-left-1">
                                    <span>
                                        <span className="font-semibold text-slate-500 mr-2">
                                            {TIPO_RESULTADO.find(t => t.value === r.tipoResultado)?.label}:
                                        </span>
                                        {r.valorResultado}
                                    </span>
                                    <Trash2 className="w-3 h-3 text-red-400 cursor-pointer" onClick={() => {
                                        const next = [...(newItem.resultado || [])];
                                        next.splice(i, 1);
                                        setNewItem({ ...newItem, resultado: next });
                                    }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {newItemError && (
                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                            <AlertCircle className="w-4 h-4" />
                            {newItemError}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                        <Button size="sm" variant="ghost" type="button" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button size="sm" type="button" onClick={handleAddExam} className="bg-purple-600 hover:bg-purple-700 text-white">
                            <Save className="w-4 h-4 mr-1" /> {editingIndex !== null ? 'Atualizar' : 'Salvar'}
                        </Button>
                    </div>
                </div>
            )}
            {/* Search Modal - Global to Component */}
            {isSearchOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h3 className="font-semibold text-lg text-gray-800">Buscar Exame</h3>
                            <Button variant="ghost" size="sm" type="button" onClick={() => setIsSearchOpen(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="p-4 border-b bg-gray-50/50">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar por nome ou código..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-white"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-1">
                            {filteredExams.map(exam => (
                                <button
                                    key={exam.value}
                                    type="button"
                                    onClick={() => handleSelectExam(exam)}
                                    className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded border border-transparent hover:border-blue-100 text-sm transition-colors group"
                                >
                                    <span className="font-medium text-slate-900 group-hover:text-blue-700 block text-start">{exam.value}</span>
                                    <span className="text-slate-500 group-hover:text-blue-600 text-xs block text-start">{exam.label.split(' - ')[1]}</span>
                                </button>
                            ))}
                            {filteredExams.length === 0 && (
                                <div className="text-center p-8 text-slate-500">
                                    Nenhum exame encontrado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};
