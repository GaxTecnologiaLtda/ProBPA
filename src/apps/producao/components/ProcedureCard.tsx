import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, cn } from '../components/ui/BaseComponents';
import { Search, Loader2, Trash2, ChevronDown, ChevronUp, BookOpen, FileText } from 'lucide-react';
import { ProcedureFormItem } from '../services/bpaService';
import {
    getCompatibleCids,
    getAttendanceCharacterForProcedure,
    getServicesForProcedure,
    SigtapProcedureRow,
    SigtapCidRow
} from '../services/sigtapLookupService';
import { sigtapService } from '../services/sigtapService';
import { LISTA_CARATER_ATENDIMENTO } from '../constants';

interface ProcedureCardProps {
    index: number;
    data: ProcedureFormItem;
    competence: string;
    onUpdate: (index: number, data: ProcedureFormItem) => void;
    onRemove: (index: number) => void;
    onOpenSigtap: (index: number) => void;
    isExpanded: boolean;
    onToggleExpand: (index: number) => void;
    userCbo?: string;
    interfaceType?: 'PEC' | 'SIMPLIFIED';
}

// Debounce hook (local)
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export const ProcedureCard: React.FC<ProcedureCardProps> = ({
    index,
    data,
    competence,
    onUpdate,
    onRemove,
    onOpenSigtap,
    isExpanded,
    onToggleExpand,
    userCbo,
    interfaceType = 'PEC'
}) => {
    // Local UI State
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [searchResults, setSearchResults] = useState<SigtapProcedureRow[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [availableCids, setAvailableCids] = useState<SigtapCidRow[]>([]);
    const [availableServices, setAvailableServices] = useState<any[]>([]);
    const [cidDisabled, setCidDisabled] = useState(false);
    const [procedureType, setProcedureType] = useState<string>('');

    // Sync local search term with data name if empty (initial load)
    useEffect(() => {
        if (data.procedureCode && data.procedureName && !searchTerm) {
            setSearchTerm(`${data.procedureCode} - ${data.procedureName}`);
        }
    }, [data.procedureCode, data.procedureName]);

    // Load details when procedureCode changes (e.g. from Modal or manual select)
    useEffect(() => {
        async function loadDetails() {
            if (!data.procedureCode) return;

            try {
                // Fetch full procedure details to get compatible CIDs/Services arrays
                const results = await sigtapService.searchProcedures(data.procedureCode, competence);
                const fullProc = results.find((r: any) => r.code === data.procedureCode);

                if (!fullProc) {
                    console.warn("Procedure not found in SIGTAP:", data.procedureCode);
                    return;
                }

                // 1. CIDs
                const cids = await getCompatibleCids(fullProc);
                setAvailableCids(cids);

                if (cids.length === 0) {
                    setCidDisabled(true);
                    // Update: No CIDs required
                    onUpdate(index, { ...data, cidCodes: [], requiresCid: false });
                } else {
                    setCidDisabled(false);

                    let newCidCodes = data.cidCodes;
                    // Auto-select if 1 and none selected
                    if (cids.length === 1 && data.cidCodes.length === 0) {
                        newCidCodes = [cids[0].code];
                    } else if (cids.length > 1 && data.cidCodes.length === 0) {
                        // Initialize with one empty select if multiple options
                        newCidCodes = [""];
                    }

                    onUpdate(index, { ...data, cidCodes: newCidCodes, requiresCid: true });
                }

                // 2. Character
                if (!data.attendanceCharacter) {
                    const charCode = await getAttendanceCharacterForProcedure(fullProc);
                    if (charCode) {
                        const exists = LISTA_CARATER_ATENDIMENTO.some(opt => opt.value === charCode);
                        if (exists) {
                            onUpdate(index, { ...data, attendanceCharacter: charCode });
                        }
                    }
                }

                // 3. Services
                const services = await getServicesForProcedure(fullProc);
                setAvailableServices(services);
                if (services.length === 1 && !data.serviceCode) {
                    onUpdate(index, { ...data, serviceCode: services[0].code });
                }

            } catch (err) {
                console.error("Error loading procedure details:", err);
            }
        }

        loadDetails();
    }, [data.procedureCode]);

    // Inline Search
    useEffect(() => {
        async function doSearch() {
            console.log(`[ProcedureCard] doSearch Triggered. Term: "${debouncedSearchTerm}", Competence: "${competence}"`);

            if (debouncedSearchTerm.length < 3) {
                console.log("[ProcedureCard] Term too short.");
                setSearchResults([]);
                return;
            }

            // Avoid searching if term matches current selection
            if (data.procedureCode && (debouncedSearchTerm === data.procedureCode || debouncedSearchTerm.includes(data.procedureCode))) {
                console.log("[ProcedureCard] Term matches current selection. Skipping.");
                return;
            }

            console.log("[ProcedureCard] Starting search...");
            setIsSearching(true);
            try {
                // New Search Logic (Code or Name via CollectionGroup)
                const results = await sigtapService.searchProcedures(debouncedSearchTerm, competence);
                console.log(`[ProcedureCard] Results: ${results.length}`);
                setSearchResults(results);
                setShowSuggestions(true);
            } catch (err) {
                console.error("[ProcedureCard] Error:", err);
            } finally {
                setIsSearching(false);
            }
        }
        doSearch();
    }, [debouncedSearchTerm, competence]);

    const handleSelectProcedure = (proc: SigtapProcedureRow) => {
        // CBO Validation (Internal Search)
        const validation = sigtapService.checkCboCompatibility(proc, userCbo || '');
        if (!validation.compatible) {
            alert(validation.message || 'CBO incompatível');
            return;
        }

        setSearchTerm(`${proc.code} - ${proc.name}`);
        setProcedureType(proc.procedureType);
        setShowSuggestions(false);

        // Check for collective activity potential
        const isPotentialCollective = (proc as any).groupCode === '01' || ((proc as any).formCode && (proc as any).formCode.includes('coletiva'));
        // Only enable flag if NOT in simplified mode
        const shouldFlagAsCollective = interfaceType !== 'SIMPLIFIED' && isPotentialCollective;

        // Reset fields
        onUpdate(index, {
            ...data,
            procedureCode: proc.code,
            procedureName: proc.name,
            cidCodes: [],
            serviceCode: '',
            attendanceCharacter: '01', // Reset to default or let effect load it
            // Save Context Fields (from search API)
            groupCode: (proc as any).groupCode,
            subGroupCode: (proc as any).subGroupCode,
            formCode: (proc as any).formCode,
            // Automatic Trigger: isCollective?
            isCollectiveActivity: shouldFlagAsCollective
        });
    };

    return (
        <Card className={cn("p-0 border-l-4 transition-all overflow-visible", data.procedureCode ? "border-l-green-500" : "border-l-gray-300")}>
            {/* Header (Always visible) */}
            <div
                className={cn(
                    "p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                    isExpanded ? "rounded-t-2xl" : "rounded-2xl"
                )}
                onClick={() => onToggleExpand(index)}
            >
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", data.procedureCode ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500")}>
                        <FileText size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
                            {data.procedureCode ? `${data.procedureCode} - ${data.procedureName}` : `Procedimento #${index + 1}`}
                        </h3>
                        <div className="text-xs text-gray-500 flex gap-2">
                            <span>Qtd: {data.quantity}</span>
                            {data.cidCodes.length > 0 && <span>• {data.cidCodes.length} CIDs</span>}

                            {/* Visual Badge for Collective Activity (Hidden in Simplified) */}
                            {interfaceType !== 'SIMPLIFIED' && (data.groupCode === '01' || (data.formCode && data.formCode.includes('coletiva'))) && (
                                <span className="ml-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] px-1.5 py-0.5 rounded font-bold border border-purple-200 dark:border-purple-800">
                                    🟣 Atividade Coletiva
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(index);
                        }}
                    >
                        <Trash2 size={18} />
                    </Button>
                    {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-5 pt-0 border-t border-gray-100 dark:border-gray-700 space-y-4 animate-in slide-in-from-top-2 rounded-b-2xl">

                    {/* Search Input & Sigtap Button */}
                    <div className="pt-4 space-y-2 relative">
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Procedimento (SIGTAP)</label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 gap-1"
                                onClick={() => onOpenSigtap(index)}
                            >
                                <BookOpen size={14} />
                                Consultar SIGTAP
                            </Button>
                        </div>

                        <div className="relative flex gap-2 z-30">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar código ou nome..."
                                    className="w-full pl-10 pr-4 h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-medical-500 focus:outline-none dark:text-white"
                                    value={searchTerm}
                                    onChange={e => {
                                        setSearchTerm(e.target.value);
                                        if (!e.target.value) setShowSuggestions(false);
                                    }}
                                    onFocus={() => {
                                        if (searchResults.length > 0) setShowSuggestions(true);
                                    }}
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-3.5">
                                        <Loader2 className="w-5 h-5 text-medical-500 animate-spin" />
                                    </div>
                                )}
                            </div>
                            <Button
                                type="button"
                                onClick={async () => {
                                    const results = await sigtapService.searchProcedures(searchTerm, competence);
                                    setSearchResults(results);
                                    setShowSuggestions(true);
                                }}
                            >
                                Buscar
                            </Button>
                        </div>

                        {/* Suggestions */}
                        {showSuggestions && (
                            <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl z-50 max-h-80 overflow-y-auto ring-1 ring-black/5 divide-y divide-gray-100 dark:divide-gray-700">
                                {searchResults.length > 0 ? (
                                    searchResults.map(proc => (
                                        <div
                                            key={proc.id}
                                            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                            onClick={() => handleSelectProcedure(proc)}
                                        >
                                            <div className="font-medium text-sm text-medical-600 dark:text-medical-400 flex justify-between">
                                                <span>{proc.code}</span>
                                                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500 font-mono">{proc.procedureType}</span>
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{proc.name}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-sm text-gray-500 text-center">
                                        {debouncedSearchTerm.length < 3 ? 'Digite ao menos 3 caracteres...' : 'Nada encontrado.'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>


                    {/* CONDITIONAL FORM: COLLECTIVE vs INDIVIDUAL */}
                    {data.isCollectiveActivity ? (
                        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-lg p-4 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-lg shrink-0">
                                    <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-purple-800 dark:text-purple-300">Atividade Coletiva (PEC)</h4>
                                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                        Procedimento identificado como coletivo. O preenchimento simplificado abaixo substitui a ficha padrão.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <Select
                                    label="Tipo de Atividade"
                                    value={data.activityType || ''}
                                    onChange={e => onUpdate(index, { ...data, activityType: e.target.value })}
                                    options={[
                                        { value: '01', label: 'Reunião de Equipe' },
                                        { value: '02', label: 'Reunião com Usuários' },
                                        { value: '03', label: 'Reunião com Outros' },
                                        { value: '04', label: 'Grupo de Atendimento' },
                                        { value: '05', label: 'Proc. Coletivo/Prática Corporal' },
                                        { value: '06', label: 'Atividade Educativa' },
                                        { value: '07', label: 'Outros' }
                                    ]}
                                />
                                <Input
                                    label="Nº Participantes"
                                    type="number"
                                    value={data.participantsCount || ''}
                                    onChange={e => onUpdate(index, { ...data, participantsCount: Number(e.target.value) })}
                                    placeholder="Min. 1"
                                />
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                                        Público Alvo
                                    </label>
                                    <select
                                        multiple
                                        className="w-full text-sm rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 h-20"
                                        value={data.targetAudience || []}
                                        onChange={e => {
                                            const target = e.target as HTMLSelectElement;
                                            const options = Array.from(target.selectedOptions, option => option.value);
                                            onUpdate(index, { ...data, targetAudience: options });
                                        }}
                                    >
                                        <option value="01">Comunidade em Geral</option>
                                        <option value="02">Crianças 0-3 anos</option>
                                        <option value="03">Crianças 4-9 anos</option>
                                        <option value="04">Adolescentes</option>
                                        <option value="05">Adultos</option>
                                        <option value="06">Idosos</option>
                                        <option value="07">Gestantes</option>
                                        <option value="08">Mulheres</option>
                                        <option value="09">Homens</option>
                                        <option value="10">Familias</option>
                                        <option value="11">Profissionais Educação</option>
                                        <option value="12">Outros</option>
                                    </select>
                                    <p className="text-[10px] text-gray-500 mt-1">*Segure Ctrl/Cmd para selecionar múltiplos</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // STANDARD INDIVIDUAL FORM (CID, Character, Qty)
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            {/* VACCINATION BLOCK */}
                            {(data.procedureName.toUpperCase().includes("VACINA") || data.procedureName.toUpperCase().includes("IMUNOBI")) && (
                                <div className="sm:col-span-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg p-4 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg shrink-0">
                                            <div className="w-5 h-5 text-blue-600 dark:text-blue-300">💉</div>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300">Dados da Vacina (LEDI)</h4>
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                Preenchimento obrigatório para envio ao PEC (Ficha de Vacinação).
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <Input
                                                label="Código Imunobiológico"
                                                value={data.vaccinationData?.imunobiologico || ''}
                                                onChange={e => onUpdate(index, {
                                                    ...data,
                                                    vaccinationData: { ...data.vaccinationData!, imunobiologico: e.target.value }
                                                })}
                                                placeholder="Ex: 23 (BCG)"
                                            />
                                        </div>
                                        <Select
                                            label="Estratégia"
                                            value={data.vaccinationData?.estrategia || ''}
                                            onChange={e => onUpdate(index, {
                                                ...data,
                                                vaccinationData: { ...data.vaccinationData!, estrategia: e.target.value }
                                            })}
                                            options={[
                                                { value: '1', label: 'Rotina' },
                                                { value: '2', label: 'Campanha' },
                                                { value: '3', label: 'Bloqueio' },
                                                { value: '4', label: 'Especial' },
                                                { value: '5', label: 'Soroterapia' },
                                            ]}
                                        />
                                        <Select
                                            label="Dose"
                                            value={data.vaccinationData?.dose || ''}
                                            onChange={e => onUpdate(index, {
                                                ...data,
                                                vaccinationData: { ...data.vaccinationData!, dose: e.target.value }
                                            })}
                                            options={[
                                                { value: '1', label: 'D1 - 1ª Dose' },
                                                { value: '2', label: 'D2 - 2ª Dose' },
                                                { value: '3', label: 'D3 - 3ª Dose' },
                                                { value: '4', label: 'R1 - 1º Reforço' },
                                                { value: '5', label: 'R2 - 2º Reforço' },
                                                { value: '6', label: 'Dose Única' },
                                                { value: '7', label: 'Dose Inicial' },
                                                { value: '8', label: 'Dose Adicional' },
                                                { value: '38', label: 'Reforço' },
                                            ]}
                                        />
                                        <Input
                                            label="Lote"
                                            value={data.vaccinationData?.lote || ''}
                                            onChange={e => onUpdate(index, {
                                                ...data,
                                                vaccinationData: { ...data.vaccinationData!, lote: e.target.value }
                                            })}
                                        />
                                        <Input
                                            label="Fabricante"
                                            value={data.vaccinationData?.fabricante || ''}
                                            onChange={e => onUpdate(index, {
                                                ...data,
                                                vaccinationData: { ...data.vaccinationData!, fabricante: e.target.value }
                                            })}
                                            placeholder="Nome ou CNPJ"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">CID-10</label>
                                <div className="flex flex-col gap-2">
                                    {/* Case 1: No Procedure Selected or No CIDs available */}
                                    {availableCids.length === 0 && (
                                        <select
                                            disabled={true}
                                            className={cn(
                                                "w-full h-12 px-4 rounded-xl border bg-gray-50 dark:bg-gray-800 transition-all border-gray-200 dark:border-gray-700 dark:text-white cursor-not-allowed"
                                            )}
                                        >
                                            <option>{cidDisabled ? "Não há CIDs compatíveis" : "Selecione o Procedimento"}</option>
                                        </select>
                                    )}

                                    {/* Case 2: CIDs Available */}
                                    {availableCids.length > 0 && data.cidCodes.map((code, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <select
                                                disabled={cidDisabled}
                                                className="w-full h-12 px-4 rounded-xl border bg-white dark:bg-gray-800 focus:ring-2 focus:ring-medical-500 focus:outline-none border-gray-200 dark:border-gray-700 dark:text-white"
                                                value={code}
                                                onChange={e => {
                                                    const newList = [...data.cidCodes];
                                                    newList[idx] = e.target.value;
                                                    onUpdate(index, { ...data, cidCodes: newList });
                                                }}
                                            >
                                                <option value="">Selecione o CID</option>
                                                {availableCids.map(opt => (
                                                    <option key={opt.code} value={opt.code}>
                                                        {opt.code} - {opt.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {/* Remove button for extra CIDs */}
                                            {data.cidCodes.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:bg-red-50"
                                                    onClick={() => {
                                                        const newList = data.cidCodes.filter((_, i) => i !== idx);
                                                        onUpdate(index, { ...data, cidCodes: newList });
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            )}
                                        </div>
                                    ))}

                                    {!cidDisabled && availableCids.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => onUpdate(index, { ...data, cidCodes: [...data.cidCodes, ''] })}
                                            className="text-xs text-medical-600 font-medium hover:underline self-start flex items-center gap-1"
                                        >
                                            + Adicionar outro CID
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Carater Atendimento Removed - Moved to Detalhes Atendimento in Register.tsx */}

                            <Input
                                label="Quantidade"
                                type="number"
                                value={data.quantity}
                                onChange={e => onUpdate(index, { ...data, quantity: Number(e.target.value) })}
                                min={1}
                            />
                        </div>
                    )}





                </div>
            )}
        </Card>
    );
};
