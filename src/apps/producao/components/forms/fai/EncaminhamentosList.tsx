import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Badge, cn } from '../../../components/ui/BaseComponents';
import { Plus, Trash2, ArrowUpRight, Save, X, Search, Briefcase, Activity } from 'lucide-react';
import { searchCbo, CboItem } from '../../../services/cboLookupService';
import { CboReferenceModal } from './CboReferenceModal';
import { CiapCidReferenceModal } from './CiapCidReferenceModal';
import ciapData from '../../../services/ciap_cid_mapping.json';

// Types
// Types
interface Encaminhamento {
    especialidade: string; // Code (CBO)
    hipoteseDiagnosticoCID10?: string;
    hipoteseDiagnosticoCIAP2?: string;
    classificacaoRisco: string;
}

interface EncaminhamentosListProps {
    value?: Encaminhamento[];
    onChange: (val: Encaminhamento[]) => void;
    disabled?: boolean;
    userCbo?: string;
}

interface DiagnosisItem {
    ciap: string;
    ciap_desc: string;
    cid: string;
    cid_desc: string;
}

const RISCO_OPTIONS = [
    { value: '1', label: 'Alto Risco' },
    { value: '2', label: 'Médio Risco' },
    { value: '3', label: 'Baixo Risco' },
    { value: '4', label: 'Sem Classificação' }
];

// CBOs allowed to use CID-10 (Doctors + Specifics)
const isAllowedCID = (cbo: string) => {
    if (!cbo) return false;
    // Doctors (225...)
    if (cbo.startsWith('225')) return true;
    // Specific exceptions from LEDI Table
    const EXCEPTIONS = ['2002', '131205', '131210', '223505', '223115', '2231', '2231F9', '239425'];
    // Note: 239425 (Paulo Freire?? No, just checking list)
    return EXCEPTIONS.includes(cbo);
};

export const EncaminhamentosList: React.FC<EncaminhamentosListProps> = ({ value = [], onChange, disabled, userCbo }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newItem, setNewItem] = useState<Partial<Encaminhamento>>({});

    // CBO Search State
    const [cboSearchTerm, setCboSearchTerm] = useState('');
    const [cboResults, setCboResults] = useState<CboItem[]>([]);
    const [isCboModalOpen, setIsCboModalOpen] = useState(false);

    // Diagnosis Search State
    const [diagSearchTerm, setDiagSearchTerm] = useState('');
    const [diagResults, setDiagResults] = useState<DiagnosisItem[]>([]);
    const [isDiagModalOpen, setIsDiagModalOpen] = useState(false);

    const handleCboSearch = async (term: string) => {
        setCboSearchTerm(term);
        if (term.length < 2) {
            setCboResults([]);
            return;
        }
        const results = await searchCbo(term);
        setCboResults(results);
    };

    const handleSelectCbo = (item: CboItem) => {
        setNewItem({ ...newItem, especialidade: item.codigo });
        setCboSearchTerm(`${item.codigo} - ${item.ocupacao}`);
        setCboResults([]);
    };

    const handleDiagSearch = (term: string) => {
        setDiagSearchTerm(term);
        if (term.length < 2) {
            setDiagResults([]);
            return;
        }
        const lower = term.toLowerCase();
        // Simple client-side filter
        const filtered = (ciapData as DiagnosisItem[]).filter(d =>
            d.ciap.toLowerCase().includes(lower) ||
            d.ciap_desc.toLowerCase().includes(lower) ||
            d.cid.toLowerCase().includes(lower) ||
            d.cid_desc.toLowerCase().includes(lower)
        ).slice(0, 20);
        setDiagResults(filtered);
    };

    const handleSelectDiag = (item: DiagnosisItem) => {
        // LEDI Rule: Only allowed professionals can use CID-10
        const canUseCID = isAllowedCID(userCbo || '');

        let cid = '';
        let ciap = '';

        if (canUseCID) {
            // Prefer CID if available, otherwise CIAP
            if (item.cid) {
                cid = item.cid;
                // Ensure mutual exclusion if strict? 
                // LEDI says: "Não pode ser preenchido se o campo hipoteseDiagnosticoCIAP2 for preenchido"
                // So we set ONLY CID.
            } else {
                ciap = item.ciap;
            }
        } else {
            // MUST use CIAP-2
            ciap = item.ciap;
        }

        setNewItem({
            ...newItem,
            hipoteseDiagnosticoCIAP2: ciap || undefined,
            hipoteseDiagnosticoCID10: cid || undefined
        });

        // Display logic for input box
        const display = cid
            ? `CID: ${cid} - ${item.cid_desc || item.ciap_desc}`
            : `CIAP: ${ciap} - ${item.ciap_desc}`;

        setDiagSearchTerm(display);
        setDiagResults([]);
    };

    const handleAdd = () => {
        if (!newItem.especialidade || !newItem.classificacaoRisco) return;
        onChange([...value, newItem as Encaminhamento]);
        setNewItem({});
        setCboSearchTerm('');
        setDiagSearchTerm('');
        setIsAdding(false);
    };

    const handleRemove = (index: number) => {
        const next = [...value];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <Card className="p-4 border border-slate-200 shadow-sm mt-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <ArrowUpRight className="w-4 h-4 text-blue-600" />
                    Encaminhamentos
                </h3>
                {!isAdding && !disabled && (
                    <Button size="sm" variant="outline" type="button" onClick={() => setIsAdding(true)}>
                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                )}
            </div>

            {/* List */}
            <div className="space-y-2 mb-4">
                {value.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 w-full mr-4">
                            <span className="font-medium text-slate-700">
                                Esp: {item.especialidade}
                            </span>
                            <span className="text-xs text-slate-500">
                                Risco: {RISCO_OPTIONS.find(r => r.value === item.classificacaoRisco)?.label}
                            </span>
                            {(item.hipoteseDiagnosticoCID10 || item.hipoteseDiagnosticoCIAP2) && (
                                <span className="text-xs text-slate-500 col-span-2">
                                    Hipóteses: CIAP {item.hipoteseDiagnosticoCIAP2} / CID {item.hipoteseDiagnosticoCID10}
                                </span>
                            )}
                        </div>
                        {!disabled && (
                            <Button size="xs" variant="ghost" type="button" className="text-red-500 h-8 w-8 p-0" onClick={() => handleRemove(idx)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            {value.length > 0 && (
                <div className="mb-4 p-2 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100 flex items-start gap-2">
                    <Activity className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                        <strong>Nota Automática:</strong> A presença de encaminhamentos habilita automaticamente a opção
                        <strong> "4 - Encaminhamento para serviço especializado"</strong> na seção de Conduta/Desfecho.
                    </span>
                </div>
            )}

            {/* Add Form */}
            {isAdding && (
                <div className="bg-white border rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* CBO Search */}
                        <div className="relative">
                            <label className="text-xs font-medium mb-1 block">Especialidade (CBO)</label>
                            <div className="relative">
                                <Input
                                    value={cboSearchTerm}
                                    onChange={e => handleCboSearch(e.target.value)}
                                    placeholder="Busque por ocupação..."
                                    className="pr-8"
                                />
                                <div className="absolute right-2 top-2.5 text-slate-400">
                                    <Search size={16} />
                                </div>
                                {cboResults.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                                        {cboResults.map((res) => (
                                            <div
                                                key={res.codigo}
                                                className="p-2 hover:bg-slate-100 cursor-pointer text-xs border-b last:border-0"
                                                onClick={() => handleSelectCbo(res)}
                                            >
                                                <div className="font-bold text-slate-700">{res.codigo}</div>
                                                <div className="text-slate-500">{res.ocupacao}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCboModalOpen(true)}
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1 font-medium"
                            >
                                <Briefcase size={14} />
                                Consultar Lista de CBOs
                            </button>
                        </div>

                        {/* Risco */}
                        <div>
                            <label className="text-xs font-medium mb-1 block">Classificação de Risco</label>
                            <Select
                                value={newItem.classificacaoRisco || ''}
                                onChange={e => setNewItem({ ...newItem, classificacaoRisco: e.target.value })}
                                options={[{ value: '', label: 'Selecione' }, ...RISCO_OPTIONS]}
                            />
                        </div>

                        {/* Diagnostic Search */}
                        <div className="col-span-1 md:col-span-2 relative">
                            <label className="text-xs font-medium mb-1 block">Hipótese Diagnóstica (CIAP/CID)</label>
                            <div className="relative">
                                <Input
                                    value={diagSearchTerm}
                                    onChange={e => handleDiagSearch(e.target.value)}
                                    placeholder="Busque por CIAP ou CID..."
                                    className="pr-8"
                                />
                                <div className="absolute right-2 top-2.5 text-slate-400">
                                    <Search size={16} />
                                </div>
                                {diagResults.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                                        {diagResults.map((res, i) => (
                                            <div
                                                key={i}
                                                className="p-2 hover:bg-slate-100 cursor-pointer text-xs border-b last:border-0"
                                                onClick={() => handleSelectDiag(res)}
                                            >
                                                <div className="font-bold text-slate-700">
                                                    {res.ciap} - {res.ciap_desc}
                                                </div>
                                                <div className="text-slate-500 text-[10px]">
                                                    CID: {res.cid} - {res.cid_desc}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                            </div>
                            <button
                                type="button"
                                onClick={() => setIsDiagModalOpen(true)}
                                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 mt-1 font-medium"
                            >
                                <Activity size={14} />
                                Consultar Tabela CIAP/CID
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button size="sm" variant="ghost" type="button" onClick={() => setIsAdding(false)}>
                            <X className="w-4 h-4 mr-1" /> Cancelar
                        </Button>
                        <Button
                            size="sm"
                            type="button"
                            onClick={handleAdd}
                            disabled={!newItem.especialidade || !newItem.classificacaoRisco}
                            title={(!newItem.especialidade || !newItem.classificacaoRisco) ? "Selecione uma Especialidade (CBO) e Classificação de Risco" : "Salvar Encaminhamento"}
                        >
                            <Save className="w-4 h-4 mr-1" /> Salvar
                        </Button>
                    </div>
                </div>
            )}

            <CboReferenceModal
                isOpen={isCboModalOpen}
                onClose={() => setIsCboModalOpen(false)}
                onSelect={(item) => {
                    handleSelectCbo(item);
                    setIsCboModalOpen(false);
                }}
            />

            <CiapCidReferenceModal
                isOpen={isDiagModalOpen}
                onClose={() => setIsDiagModalOpen(false)}
                onSelect={(item) => {
                    handleSelectDiag(item);
                    setIsDiagModalOpen(false);
                }}
            />
        </Card>
    );
};
