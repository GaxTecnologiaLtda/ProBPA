import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Select, cn } from '../components/ui/BaseComponents';
import { Search, Loader2, Trash2, ChevronDown, ChevronUp, BookOpen, FileText, Plus } from 'lucide-react';
import { ProcedureFormItem } from '../services/bpaService';
import {
    getCompatibleCids,
    getAttendanceCharacterForProcedure,
    getServicesForProcedure,
    SigtapProcedureRow,
    SigtapCidRow,
    searchCiap,
    searchCids
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
    onAddAction?: () => void;
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
    interfaceType = 'PEC',
    onAddAction
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

    // CID Search State
    const [cidSearch, setCidSearch] = useState('');
    const [cidSearchResults, setCidSearchResults] = useState<any[]>([]);
    const [isSearchingCid, setIsSearchingCid] = useState(false);
    const [showCidDropdown, setShowCidDropdown] = useState(false);

    const handleSearchCid = async () => {
        if (cidSearch.length < 2) {
            setCidSearchResults(availableCids.map(c => ({ code: c.code, label: c.name })));
            return;
        }
        setIsSearchingCid(true);
        try {
            const ciapRes = await searchCiap(cidSearch);
            const cidRes = await searchCids(cidSearch);

            const mappedCiap = ciapRes.map(r => ({ code: r.ciap, label: `[CIAP] ${r.ciap_desc} -> CID: ${r.cid}` }));
            const mappedCid = cidRes.map(r => ({ code: r.code, label: r.name }));

            setCidSearchResults([...mappedCiap, ...mappedCid]);
            setShowCidDropdown(true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearchingCid(false);
        }
    };

    // Auto-search available specific CIDs at form load initially
    useEffect(() => {
        if (availableCids.length > 0) {
            setCidSearchResults(availableCids.map(c => ({ code: c.code, label: c.name })));
        }
    }, [availableCids]);

    // Track previous procedure code to detect external clear
    const prevCodeRef = useRef(data.procedureCode);

    // Sync local search term with data name or clear if reset
    useEffect(() => {
        if (data.procedureCode && data.procedureName && !searchTerm) {
            setSearchTerm(`${data.procedureCode} - ${data.procedureName}`);
        }
        
        // If it was cleared externally (went from something to nothing)
        if (prevCodeRef.current && !data.procedureCode) {
            setSearchTerm('');
            setProcedureType('');
            setSearchResults([]);
            setShowSuggestions(false);
        }
        
        prevCodeRef.current = data.procedureCode;
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
                    // Do not completely disable, but indicate no explicit CIDs match. User can still type/add if needed.
                    setCidDisabled(false);
                    onUpdate(index, { ...data, cidCodes: [], requiresCid: false });
                } else {
                    setCidDisabled(false);

                    let newCidCodes = data.cidCodes;
                    // We no longer strictly auto-select the first CID, because the user might want to skip it
                    // if it's not strictly required in their municipal rule.
                    if (data.cidCodes.length === 0) {
                        newCidCodes = [];
                    }

                    // Flexible rule: We mark it false so the validation in Register.tsx won't block it.
                    // The professional CAN select it, but won't be blocked.
                    onUpdate(index, { ...data, cidCodes: newCidCodes, requiresCid: false });
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

            if (data.procedureCode && debouncedSearchTerm === `${data.procedureCode} - ${data.procedureName}`) {
                return;
            }

            console.log("[ProcedureCard] Starting search...");
            setIsSearching(true);
            try {
                let currentComp = competence;
                // FALLBACK: If current month has no SIGTAP, use the latest available.
                try {
                    const available = await sigtapService.getAvailableCompetences();
                    if (available.length > 0) {
                        const exists = available.find(c => c.competence === currentComp);
                        if (!exists) {
                            currentComp = available[available.length - 1].competence;
                        }
                    }
                } catch (e) {
                    console.warn("Could not fetch fallback competence", e);
                }

                // New Search Logic (Code or Name via CollectionGroup)
                const results = await sigtapService.searchProcedures(debouncedSearchTerm, currentComp);
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
            const proceed = window.confirm(`${validation.message || 'CBO incompatível'}\n\nDeseja prosseguir e registrar este procedimento mesmo assim?`);
            if (!proceed) return;
        }

        setSearchTerm(`${proc.code} - ${proc.name}`);
        setProcedureType(proc.procedureType);
        setShowSuggestions(false);

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
            formCode: (proc as any).formCode
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
                            
                            {onAddAction ? (
                                <Button
                                    type="button"
                                    onClick={onAddAction}
                                    className="bg-green-600 hover:bg-green-700 text-white shadow-md focus:ring-green-500 gap-1 flex items-center justify-center shrink-0 min-w-[120px]"
                                >
                                    <Plus size={16} /> Adicionar
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={async () => {
                                        const results = await sigtapService.searchProcedures(searchTerm, competence);
                                        setSearchResults(results);
                                        setShowSuggestions(true);
                                    }}
                                    className="shrink-0"
                                >
                                    Buscar
                                </Button>
                            )}
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


                    {/* STANDARD INDIVIDUAL FORM (CID, Character, Qty) */}
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

                            {/* Carater Atendimento Removed - Moved to Detalhes Atendimento in Register.tsx */}

                            <Input
                                label="Quantidade"
                                type="number"
                                value={data.quantity}
                                onChange={e => onUpdate(index, { ...data, quantity: Number(e.target.value) })}
                                min={1}
                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>





                </div>
            )}
        </Card>
    );
};
