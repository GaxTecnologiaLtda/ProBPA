import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Table, Skeleton, Button, Badge, Select } from '../ui/Components';
import { Goal, Unit } from '../../types';
import { goalService } from '../../services/goalService';
import { useAuth } from '../../context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Download, AlertCircle, Building2, Calendar, Edit3, X, Save, GripVertical } from 'lucide-react';
import { unitComparativeReportService } from '../../services/unitComparativeReportService';
import { GenericProcedureComparative } from './GenericProcedureComparative';

const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const getDaysInMonth = (year: string, month: string) => {
    if (!year || !month || month === 'all') return [];
    return Array.from({ length: new Date(Number(year), Number(month), 0).getDate() }, (_, i) => String(i + 1).padStart(2, '0'));
};

const currentYearNum = new Date().getFullYear();

interface UnitComparativeReportProps {
    municipalityId: string;
    onMunicipalityChange: (id: string) => void;
    allMunicipalities: { id: string; name: string }[];
    competence: string; // MM/YYYY
    allUnits: Unit[];
    entityName?: string;
}

export const UnitComparativeReport: React.FC<UnitComparativeReportProps> = ({
    municipalityId,
    onMunicipalityChange,
    allMunicipalities,
    competence,
    allUnits,
    entityName
}) => {
    const { claims } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);

    // stats[unitId][procedureCode] = quantity
    const [stats, setStats] = useState<Record<string, Record<string, number>>>({});
    const [breakdown, setBreakdown] = useState<Record<string, Record<string, any>>>({});
    const [procedureDetails, setProcedureDetails] = useState<Record<string, any>>({});

    const [mode, setMode] = useState<'metas' | 'procedimentos'>('metas');
    const [showEntityColumn, setShowEntityColumn] = useState<boolean>(false);
    const [hoveredData, setHoveredData] = useState<{ x: number; y: number; data: any } | null>(null);

    // DnD and Ordering States
    const [isReordering, setIsReordering] = useState(false);
    const [draggedGoalIndex, setDraggedGoalIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [savingOrder, setSavingOrder] = useState(false);

    // Vigency States
    const [vigencyOptions, setVigencyOptions] = useState<any[]>([]);
    const [selectedVigency, setSelectedVigency] = useState<string>('');

    // Filter states
    const initialMonth = competence && competence.includes('/') ? competence.split('/')[0].replace(/^0/, '') : String(new Date().getMonth() + 1);
    const initialYear = competence && competence.includes('/') ? competence.split('/')[1] : new Date().getFullYear().toString();

    const [uiYear, setUiYear] = useState<string>(initialYear);
    const [uiMonth, setUiMonth] = useState<string>(initialMonth);
    const [uiDay, setUiDay] = useState<string>('all');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

    const [resolvedStartDate, setResolvedStartDate] = useState<string>('');
    const [resolvedEndDate, setResolvedEndDate] = useState<string>('');
    const [resolvedCompetence, setResolvedCompetence] = useState<string>('');

    // Se a competência global mudar por fora, sincroniza (apenas como helper)
    useEffect(() => {
        if (competence && competence.includes('/')) {
            const [m, y] = competence.split('/');
            setUiMonth(m.replace(/^0/, ''));
            setUiYear(y);
            setUiDay('all');
        }
    }, [competence]);

    // Resolução dos dias em payload pro Backend
    useEffect(() => {
        let start = '';
        let end = '';
        let comp = '';

        if (uiMonth === 'custom') {
            start = customStartDate;
            end = customEndDate;
            comp = '';
        } else if (uiMonth === 'all') {
            start = `${uiYear}-01-01`;
            end = `${uiYear}-12-31`;
            comp = '';
        } else {
            const m = uiMonth.padStart(2, '0');
            if (uiDay === 'all') {
                comp = `${m}/${uiYear}`;
            } else {
                const d = uiDay.padStart(2, '0');
                start = `${uiYear}-${m}-${d}`;
                end = `${uiYear}-${m}-${d}`;
            }
        }
        setResolvedStartDate(start);
        setResolvedEndDate(end);
        setResolvedCompetence(comp);
    }, [uiYear, uiMonth, uiDay, customStartDate, customEndDate]);

    useEffect(() => {
        if (!municipalityId) return;
        let isActive = true;

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Fetch Municipality Goals
                // goalService.getGoalsForEntityPrivate uses collectionGroup and filters by entityId
                // We'll fetch all and filter locally by municipalityId and scope
                const allGoals = await goalService.getGoalsForEntityPrivate(claims);
                const munGoals = allGoals.filter(g => {
                    // Check base scope
                    const isMunScope = g.municipalityId === municipalityId && (g.goalType === 'municipal' || !g.unitId);
                    if (!isMunScope) return false;
                    return true;
                });

                // 1. Build Vigency Options
                const currentYearNum = new Date().getFullYear();
                const vigMap = new Map<string, any>();

                const getYearFromComp = (comp: string | undefined): string => {
                    if (!comp) return String(currentYearNum);
                    if (comp.startsWith('20')) return comp.substring(0, 4);
                    return comp.length >= 4 ? comp.substring(0, 4) : String(currentYearNum);
                };

                munGoals.forEach(g => {
                    if (g.startMonth && g.endMonth) {
                        const sY = getYearFromComp(g.startMonth);
                        const eY = getYearFromComp(g.endMonth);
                        const label = sY === eY ? sY : `${sY} - ${eY}`;
                        
                        const formatFullDate = (compStr: string, isEnd: boolean) => {
                            if (!compStr) return '';
                            // Se for formato YYYY-MM-DD
                            if (compStr.length >= 10 && compStr.includes('-')) return compStr.substring(0, 10);
                            // Se for formato MM/YYYY
                            if (compStr.includes('/')) {
                                const parts = compStr.split('/');
                                if (parts.length === 2) {
                                    if (isEnd) {
                                        const lastDay = new Date(parseInt(parts[1]), parseInt(parts[0]), 0).getDate();
                                        return `${parts[1]}-${parts[0].padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                                    }
                                    return `${parts[1]}-${parts[0].padStart(2, '0')}-01`;
                                }
                            }
                            // Se for apenas o ANO YYYY
                            if (compStr.length === 4) return isEnd ? `${compStr}-12-31` : `${compStr}-01-01`;
                            return '';
                        };

                        const sIso = g.startMonth.substring(0, 7);
                        const eIso = g.endMonth.substring(0, 7);
                        const sDate = formatFullDate(g.startMonth, false) || `${sY}-01-01`;
                        const eDate = formatFullDate(g.endMonth, true) || `${eY}-12-31`;

                        if (!vigMap.has(label)) {
                            vigMap.set(label, { label, startYear: sY, endYear: eY, minMonth: sIso, maxMonth: eIso, startDate: sDate, endDate: eDate });
                        } else {
                            const current = vigMap.get(label)!;
                            if (sIso && (!current.minMonth || sIso < current.minMonth)) current.minMonth = sIso;
                            if (eIso && (!current.maxMonth || eIso > current.maxMonth)) current.maxMonth = eIso;
                            if (sDate && (!current.startDate || sDate < current.startDate)) current.startDate = sDate;
                            if (eDate && (!current.endDate || eDate > current.endDate)) current.endDate = eDate;
                        }
                    }
                });

                let vopts = Array.from(vigMap.values()).sort((a,b) => b.startYear.localeCompare(a.startYear));
                if (vopts.length === 0) {
                   vopts = [{ label: String(currentYearNum), startYear: String(currentYearNum), endYear: String(currentYearNum), minMonth: `${currentYearNum}-01`, maxMonth: `${currentYearNum}-12`, startDate: `${currentYearNum}-01-01`, endDate: `${currentYearNum}-12-31` }];
                }
                setVigencyOptions(vopts);

                let currentVigencyObj = vopts.find(v => v.label === selectedVigency);
                if (!currentVigencyObj) {
                    currentVigencyObj = vopts[0];
                    setSelectedVigency(currentVigencyObj.label);
                    // Return early so the state update triggers a re-render with the correct vigorous state immediately
                    return; 
                }

                const filteredMunGoals = munGoals.filter(g => {
                     return getYearFromComp(g.startMonth) === currentVigencyObj!.startYear && getYearFromComp(g.endMonth) === currentVigencyObj!.endYear;
                });

                // Group by procedure to avoid duplicates if any
                const uniqueGoalsMap = new Map<string, Goal>();
                filteredMunGoals.forEach(g => {
                    if (g.procedureCode) {
                        if (!uniqueGoalsMap.has(g.procedureCode)) {
                            uniqueGoalsMap.set(g.procedureCode, { ...g });
                        } else {
                            // Sum target quantity if duplicate macro
                            const existing = uniqueGoalsMap.get(g.procedureCode)!;
                            existing.targetQuantity += (g.targetQuantity || 0);
                        }
                    }
                });

                let finalGoalsList = Array.from(uniqueGoalsMap.values());

                // 1.b. Fetch Custom Order Preference for Comparative
                try {
                    const entityTypeRaw = String(claims.entityType || '').toUpperCase();
                    const prefsRef = doc(db, `municipalities/${entityTypeRaw}/${claims.entityId}/${municipalityId}/preferences/reports_comparativo_metas`);
                    const prefsSnap = await getDoc(prefsRef);

                    if (prefsSnap.exists()) {
                        const customOrder = prefsSnap.data().customOrder as string[];
                        if (Array.isArray(customOrder) && customOrder.length > 0) {
                            finalGoalsList.sort((a, b) => {
                                const indexA = customOrder.indexOf(a.procedureCode);
                                const indexB = customOrder.indexOf(b.procedureCode);

                                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                if (indexA !== -1) return -1;
                                if (indexB !== -1) return 1;
                                return 0;
                            });
                        }
                    }
                } catch (e) {
                    console.error("Failed to load custom comparative order:", e);
                }

                setGoals(finalGoalsList);

                // 2. Fetch Stats via Cloud Function
                const getUnitComparativeStats = httpsCallable(functions, 'getUnitComparativeStats');
                const response = await getUnitComparativeStats({
                    municipalityId,
                    competence: resolvedCompetence,
                    startDate: resolvedStartDate,
                    endDate: resolvedEndDate
                });
                const data = response.data as any;
                if (!isActive) return; // Ignore old responses if effect re-ran
                
                if (data.success && data.data) {
                    setStats(data.data);
                    if (data.procedureDetails) {
                        setProcedureDetails(data.procedureDetails);
                    }
                    if (data.breakdown) {
                        setBreakdown(data.breakdown);
                    }
                }

            } catch (err: any) {
                if (!isActive) return; // Ignore errors from old requests
                console.error('Failed to load comparative report:', err);
                setError('Falha ao carregar os dados comparativos. Tente novamente mais tarde.');
            } finally {
                if (isActive) setLoading(false);
            }
        };

        if (resolvedCompetence || (resolvedStartDate && resolvedEndDate)) {
            loadData();
        }
        
        return () => { isActive = false; };
    }, [municipalityId, resolvedStartDate, resolvedEndDate, resolvedCompetence, claims, selectedVigency]);

    useEffect(() => {
        if (!selectedVigency || vigencyOptions.length === 0) return;
        const currentVigencyObj = vigencyOptions.find(v => v.label === selectedVigency);
        if (currentVigencyObj) {
            setUiMonth('custom');
            if (currentVigencyObj.startDate) setCustomStartDate(currentVigencyObj.startDate);
            if (currentVigencyObj.endDate) setCustomEndDate(currentVigencyObj.endDate);
            
            if (currentVigencyObj.startYear !== currentVigencyObj.endYear) {
                 setUiYear('multi');
            } else if (currentVigencyObj.startYear) {
                 setUiYear(currentVigencyObj.startYear);
            }
        }
    }, [selectedVigency]); // Removes vigencyOptions to prevent snapping back the user's custom dates when loadData re-generates options

    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
        setDraggedGoalIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetIndex: number) => {
        e.preventDefault();
        if (draggedGoalIndex === null || draggedGoalIndex === targetIndex) {
            setDraggedGoalIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newGoals = [...goals];
        const draggedGoal = newGoals[draggedGoalIndex];
        newGoals.splice(draggedGoalIndex, 1);
        newGoals.splice(targetIndex, 0, draggedGoal);

        setGoals(newGoals);
        setDraggedGoalIndex(null);
        setDragOverIndex(null);
    };

    const handleSaveOrder = async () => {
        if (!municipalityId || goals.length === 0) {
            setIsReordering(false);
            return;
        }

        try {
            setSavingOrder(true);
            const entityTypeRaw = String(claims.entityType || '').toUpperCase();
            const prefsRef = doc(db, `municipalities/${entityTypeRaw}/${claims.entityId}/${municipalityId}/preferences/reports_comparativo_metas`);

            const customOrder = goals.map(g => g.procedureCode);
            // Need setDoc to be available (imported earlier, verify this: usually doc, getDoc, setDoc from 'firebase/firestore')
            // Actually, I need to make sure setDoc is imported. Let's do a dynamic import or ensure it is there. I will check imports soon.
            const { setDoc } = await import('firebase/firestore');
            await setDoc(prefsRef, { customOrder }, { merge: true });

            setIsReordering(false);
        } catch (error) {
            console.error("Error saving custom comparative table order:", error);
            setError("Falha ao salvar a nova ordem da tabela.");
        } finally {
            setSavingOrder(false);
        }
    };

    const handleExport = async (format: 'pdf' | 'excel' = 'pdf') => {
        try {
            setLoading(true);
            const municipalityName = allMunicipalities.find(m => m.id === municipalityId)?.name || '';
            const entityName = claims?.entityName || '';

            let logoUrl = '';
            let logoBase64 = '';

            if (claims?.entityId) {
                try {
                    const entityDocSnap = await getDoc(doc(db, 'entities', claims.entityId));
                    if (entityDocSnap.exists()) {
                        const entityData = entityDocSnap.data();
                        logoUrl = entityData.logoUrl || '';
                        logoBase64 = entityData.logoBase64 || '';
                    }
                } catch (e) {
                    console.error("Error fetching entity logo:", e);
                }
            }

            const registeredUnits = allUnits.filter(u => u.municipalityId === municipalityId);
            const unitsMap = new Map<string, { id: string, name: string }>();
            registeredUnits.forEach(u => unitsMap.set(u.id, { id: u.id, name: u.name }));
            
            // Add Entity unit ONLY if showEntityColumn is true and it's not already in registeredUnits
            if (showEntityColumn && claims?.entityId && !unitsMap.has(claims.entityId)) {
                unitsMap.set(claims.entityId, { id: claims.entityId, name: entityName || claims?.entityName || 'Entidade Responsável' });
            }

            let municipalityUnits = Array.from(unitsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

            // Reorder and conditionally filter Entity column
            const entityUnitIndex = municipalityUnits.findIndex(u => u.id === claims?.entityId);
            if (entityUnitIndex > -1) {
                const entityUnit = municipalityUnits.splice(entityUnitIndex, 1)[0];
                if (showEntityColumn) {
                    municipalityUnits.push(entityUnit);
                }
            }

            const exportData = {
                competence: resolvedCompetence || `Ano: ${uiYear}`,
                startDate: resolvedStartDate,
                endDate: resolvedEndDate,
                municipalityName,
                entityName,
                logoUrl,
                logoBase64,
                goals,
                municipalityUnits,
                stats,
                mode,
                procedureDetails
            };

            if (format === 'excel') {
                await unitComparativeReportService.generateExcel(exportData);
            } else {
                await unitComparativeReportService.generatePdf(exportData);
            }
        } catch (err: any) {
            console.error('Error exporting PDF:', err);
            setError('Erro ao gerar relatório em PDF.');
        } finally {
            setLoading(false);
        }
    };

    if (!municipalityId) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Building2 className="w-12 h-12 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Selecione um Município</h3>
                <p className="text-sm mb-6 text-center max-w-md">Para visualizar o Comparativo de Unidades, selecione o município desejado abaixo.</p>
                <div className="w-64">
                    <Select
                        value={municipalityId}
                        onChange={(e) => onMunicipalityChange(e.target.value)}
                        className="w-full"
                    >
                        <option value="">Selecione...</option>
                        {allMunicipalities.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </Select>
                </div>
            </div>
        );
    }

    // We removed the global loading block here so the header is always visible
    // if a municipality is selected. The spinner will be injected directly into the table area.

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
            </div>
        );
    }

    // Prepare Columns (Units that belong to the municipality + any unknown units in stats)
    const registeredUnits = allUnits.filter(u => u.municipalityId === municipalityId);
    const unitsMap = new Map<string, { id: string, name: string }>();
    registeredUnits.forEach(u => unitsMap.set(u.id, { id: u.id, name: u.name }));

    // Add Entity unit ONLY if showEntityColumn is true and it's not already in registeredUnits
    if (showEntityColumn && claims?.entityId && !unitsMap.has(claims.entityId)) {
        unitsMap.set(claims.entityId, { id: claims.entityId, name: entityName || claims?.entityName || 'Entidade Responsável' });
    }

    let municipalityUnits = Array.from(unitsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Reorder and conditionally filter Entity column
    const entityUnitIndex = municipalityUnits.findIndex(u => u.id === claims?.entityId);
    if (entityUnitIndex > -1) {
        const entityUnit = municipalityUnits.splice(entityUnitIndex, 1)[0];
        if (showEntityColumn) {
            municipalityUnits.push(entityUnit);
        }
    }

    return (
        <div className="space-y-6 flex flex-col min-w-0 w-full text-left">
            <div className="flex flex-col gap-4 min-w-0 w-full">
                {/* Linha 1: Configurações Principais e Vigência */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-lg shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                        <div className="w-full sm:w-56 shrink-0">
                            <Select
                                value={municipalityId}
                                onChange={(e) => onMunicipalityChange(e.target.value)}
                                className="bg-white dark:bg-gray-800 w-full border-gray-300 dark:border-gray-700"
                            >
                                <option value="">Selecione o Município...</option>
                                {allMunicipalities.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </Select>
                        </div>
                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider whitespace-nowrap">Pactuação Vigente:</span>
                            <div className="relative">
                                <Select
                                    value={selectedVigency}
                                    onChange={(e) => setSelectedVigency(e.target.value)}
                                    className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-semibold text-sm border-emerald-200 dark:border-emerald-800 min-w-[140px] pr-8"
                                >
                                    {vigencyOptions.length === 0 && <option value="">Sem Vigência</option>}
                                    {vigencyOptions.map(v => (
                                        <option key={v.label} value={v.label}>{v.label}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto items-center">
                        <Button
                            size="sm"
                            variant={mode === 'metas' ? 'primary' : 'outline'}
                            onClick={() => setMode('metas')}
                            className="w-full sm:w-auto"
                        >
                            1. Comparativo de Metas
                        </Button>
                        <Button
                            size="sm"
                            variant={mode === 'procedimentos' ? 'primary' : 'outline'}
                            onClick={() => setMode('procedimentos')}
                            className="w-full sm:w-auto"
                        >
                            2. Procedimento Geral
                        </Button>
                        <div className="flex items-center gap-2 ml-0 sm:ml-2 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors">
                            <input
                                type="checkbox"
                                id="showEntity"
                                checked={showEntityColumn}
                                onChange={(e) => setShowEntityColumn(e.target.checked)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <label htmlFor="showEntity" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                                Exibir Entidade
                            </label>
                        </div>
                    </div>
                </div>

                {/* Linha 2: Filtro de Produção e Exportação */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-2.5 rounded-lg w-full xl:w-auto">
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                            <Calendar className="w-4 h-4" />
                            Escopo de Produção:
                        </span>
                        
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <div className={`relative transition-all duration-200 ${uiMonth === 'custom' ? 'hidden' : 'block'}`}>
                                <select
                                    value={uiYear}
                                    onChange={(e) => setUiYear(e.target.value)}
                                    className="pl-3 pr-8 py-1.5 border rounded bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 font-medium text-sm border-blue-200 dark:border-blue-800/50 outline-none focus:ring-2 focus:ring-blue-500 h-9"
                                >
                                    <option value="multi">Múltiplo</option>
                                    {Array.from({ length: 5 }, (_, i) => String(currentYearNum - i)).map(y => (
                                        <option key={y} value={y}>Ano {y}</option>
                                    ))}
                                </select>
                            </div>
                            <select
                                value={uiMonth}
                                onChange={(e) => {
                                    setUiMonth(e.target.value);
                                    setUiDay('all');
                                }}
                                className="pl-3 pr-8 py-1.5 border rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 h-9"
                            >
                                <option value="all">Todos os Meses</option>
                                <option value="custom">Período Personalizado</option>
                                {monthNames.map((m, i) => (
                                    <option key={i + 1} value={String(i + 1)}>{m}</option>
                                ))}
                            </select>
                            <select
                                value={uiDay}
                                onChange={(e) => setUiDay(e.target.value)}
                                disabled={uiMonth === 'all' || uiMonth === 'custom'}
                                className={`pl-3 pr-8 py-1.5 border rounded text-sm outline-none focus:ring-2 disabled:opacity-50 h-9 transition-colors
                                 ${uiMonth === 'custom' ? 'hidden' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 focus:ring-blue-500 disabled:cursor-not-allowed'}`}
                            >
                                <option value="all">Dias</option>
                                {uiMonth !== 'all' && uiMonth !== 'custom' && getDaysInMonth(uiYear, uiMonth).map((d: string) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>

                            {uiMonth === 'custom' && (
                                <div className="flex items-center gap-1 w-full sm:w-auto animate-fade-in">
                                    <input
                                        type="date"
                                        className="w-full sm:w-auto px-3 py-1.5 border rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 h-9"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        title="Data Inicial"
                                        min={vigencyOptions.find(v => v.label === selectedVigency)?.startDate}
                                        max={vigencyOptions.find(v => v.label === selectedVigency)?.endDate}
                                    />
                                    <span className="text-gray-400 text-xs px-1">até</span>
                                    <input
                                        type="date"
                                        className="w-full sm:w-auto px-3 py-1.5 border rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 h-9"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        title="Data Final"
                                        min={customStartDate || vigencyOptions.find(v => v.label === selectedVigency)?.startDate}
                                        max={vigencyOptions.find(v => v.label === selectedVigency)?.endDate}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 w-full xl:w-auto justify-end">
                        {mode === 'metas' && (
                            isReordering ? (
                                <>
                                    <Button size="sm" variant="outline" className="gap-2 shrink-0 border-gray-300 text-gray-700 hover:bg-gray-100 w-full sm:w-auto" onClick={() => setIsReordering(false)} disabled={savingOrder}>
                                        <X className="w-4 h-4" /> Cancelar
                                    </Button>
                                    <Button size="sm" variant="default" className="gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto" onClick={handleSaveOrder} disabled={savingOrder}>
                                        {savingOrder ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                                        Salvar Ordem
                                    </Button>
                                </>
                            ) : (
                                <Button size="sm" variant="outline" className="gap-2 shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/40 w-full sm:w-auto" onClick={() => setIsReordering(true)} disabled={loading || goals.length === 0}>
                                    <Edit3 className="w-4 h-4 shrink-0" />
                                    Editar Ordem
                                </Button>
                            )
                        )}

                        <div className="relative group shrink-0 w-full sm:w-auto">
                            <Button size="sm" variant="outline" className="gap-2 w-full justify-between" disabled={loading || goals.length === 0 || isReordering}>
                                <span className="flex items-center gap-2">
                                    <Download className="w-4 h-4 shrink-0" />
                                    Exportar
                                </span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </Button>
                            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-md cursor-pointer disabled:opacity-50 border-b border-gray-100 dark:border-gray-700" disabled={loading || goals.length === 0 || isReordering}>
                                    Exportar em PDF
                                </button>
                                <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-md cursor-pointer disabled:opacity-50" disabled={loading || goals.length === 0 || isReordering}>
                                    Exportar em EXCEL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 border rounded-lg shadow-sm border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Carregando Informações...</h3>
                    <p className="text-sm text-gray-500 mt-1">Aguarde enquanto os dados são agregados para todas as unidades.</p>
                </div>
            ) : mode === 'metas' && (
                <div className="overflow-x-auto pb-4 border rounded-lg shadow-sm border-gray-100 dark:border-gray-800 w-full min-w-0">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 border-collapse min-w-max">
                        <thead>
                            <tr className="bg-gray-200 dark:bg-gray-800">
                                <th className="sticky left-0 bg-gray-200 dark:bg-gray-800 z-10 w-20 min-w-[80px] font-bold text-gray-800 dark:text-gray-200 p-2 text-center border-r border-white dark:border-gray-700">
                                    Cód.
                                </th>
                                <th className="sticky left-20 bg-gray-200 dark:bg-gray-800 z-10 w-64 min-w-[250px] font-bold text-gray-800 dark:text-gray-200 p-2 border-r border-white dark:border-gray-700">
                                    Procedimento (Meta Global)
                                </th>
                                {municipalityUnits.map(unit => (
                                    <th key={unit.id} className="text-center font-bold bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs p-2 max-w-[120px] border-r border-white dark:border-gray-700 leading-tight" title={unit.name}>
                                        {unit.name.toUpperCase()}
                                    </th>
                                ))}
                                <th className="text-center font-bold bg-cyan-100 dark:bg-cyan-900/40 text-cyan-900 dark:text-cyan-100 p-2 text-xs border-r border-white dark:border-gray-700">
                                    Total<br />Unid.
                                </th>
                                <th className="text-center font-bold bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 text-xs border-r border-gray-200 dark:border-gray-700">
                                    Meta<br />mês IRB
                                </th>
                                <th className="text-center font-bold bg-red-200 dark:bg-red-900/60 text-red-900 dark:text-red-100 p-2 text-xs border-r border-white dark:border-gray-700">
                                    Diferença
                                </th>
                                <th className="text-center font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 p-2 text-xs">
                                    Meta<br />Anual
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {goals.map((goal, idx) => {
                                const procedureKey = goal.procedureCode;
                                const cleanProcKey = procedureKey.replace(/\D/g, '');

                                // Calculate quantities per unit
                                const rowData = municipalityUnits.map(unit => {
                                    let qty = 0;
                                    let aggregatedBreakdown: any = null;
                                    const unitStats = stats[unit.id] || {};
                                    Object.keys(unitStats).forEach(actualProcKey => {
                                        const cleanActualProcKey = actualProcKey.replace(/\D/g, '');
                                        if (cleanActualProcKey.startsWith(cleanProcKey)) {
                                            qty += unitStats[actualProcKey];

                                            if (breakdown?.[unit.id]?.[actualProcKey]) {
                                                if (!aggregatedBreakdown) aggregatedBreakdown = { manual: 0, connector: 0, professionals: {} };
                                                const br = breakdown[unit.id][actualProcKey];
                                                aggregatedBreakdown.manual += br.manual || 0;
                                                aggregatedBreakdown.connector += br.connector || 0;
                                                if (br.professionals) {
                                                    Object.entries(br.professionals).forEach(([pId, pData]: [string, any]) => {
                                                        if (!aggregatedBreakdown.professionals[pId]) {
                                                            aggregatedBreakdown.professionals[pId] = { name: pData.name, qty: 0 };
                                                        }
                                                        aggregatedBreakdown.professionals[pId].qty += pData.qty;
                                                    });
                                                }
                                            }
                                        }
                                    });
                                    return { unitId: unit.id, qty, breakdown: aggregatedBreakdown };
                                });

                                const totalRowQty = rowData.reduce((sum, item) => sum + item.qty, 0);

                                return (
                                    <tr
                                        key={idx}
                                        draggable={isReordering}
                                        onDragStart={(e) => handleDragStart(e, idx)}
                                        onDragEnter={(e) => handleDragEnter(e, idx)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, idx)}
                                        className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${isReordering ? 'cursor-grab active:cursor-grabbing' : ''
                                            } ${draggedGoalIndex === idx ? 'opacity-50' : ''} ${dragOverIndex === idx && draggedGoalIndex !== idx ? 'border-t-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : ''
                                            }`}
                                    >
                                        <td className="sticky left-0 bg-gray-200 dark:bg-gray-800/90 z-10 border-r border-white dark:border-gray-700 p-2">
                                            <div className="flex items-center justify-center gap-1 w-full h-full text-gray-800 dark:text-gray-300">
                                                {isReordering && <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />}
                                                <span className="font-bold">{procedureKey}</span>
                                            </div>
                                        </td>
                                        <td className="sticky left-20 bg-gray-200 dark:bg-gray-800/90 z-10 border-r border-white dark:border-gray-700 p-2">
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 block" title={goal.procedureName}>
                                                {goal.procedureName}
                                            </span>
                                        </td>

                                        {rowData.map(data => (
                                            <td
                                                key={data.unitId}
                                                className="text-center text-sm p-2 bg-gray-100 dark:bg-gray-800/50 border-r border-white dark:border-gray-700 cursor-default"
                                                onMouseEnter={(e) => {
                                                    if (data.breakdown && data.qty > 0) {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setHoveredData({
                                                            x: rect.left + rect.width / 2,
                                                            y: rect.top,
                                                            data: data.breakdown
                                                        });
                                                    }
                                                }}
                                                onMouseLeave={() => setHoveredData(null)}
                                            >
                                                {data.qty > 0 ? (
                                                    <span className="font-medium text-gray-800 dark:text-gray-300">{data.qty}</span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500">{data.qty}</span>
                                                )}
                                            </td>
                                        ))}

                                        <td className="text-center font-bold text-cyan-900 dark:text-cyan-100 bg-cyan-50 dark:bg-cyan-900/20 p-2 border-r border-white dark:border-gray-700">
                                            {totalRowQty}
                                        </td>
                                        <td className="text-center font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 p-2 border-r border-gray-200 dark:border-gray-700">
                                            {goal.targetQuantity}
                                        </td>
                                        {(() => {
                                            const annualTarget = goal.annualTargetQuantity || (goal.targetQuantity * 12);
                                            const diff = totalRowQty - annualTarget;
                                            return (
                                                <td className={`text-center font-bold p-2 border-r ${diff >= 0 ? "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100" : "bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100"}`}>
                                                    {diff > 0 ? `+${diff}` : diff}
                                                </td>
                                            );
                                        })()}
                                        <td className="text-center font-bold text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-900/40 p-2 text-sm">
                                            {goal.annualTargetQuantity || (goal.targetQuantity * 12)}
                                        </td>
                                    </tr>
                                );
                            })}

                            {goals.length === 0 && (
                                <tr>
                                    <td colSpan={municipalityUnits.length + 6} className="py-8 text-center text-gray-500">
                                        Nenhuma Meta Global encontrada para este município.
                                    </td>
                                </tr>
                            )}

                            {goals.length > 0 && (
                                <tr className="bg-blue-200 dark:bg-blue-900/60">
                                    <td colSpan={2} className="sticky left-0 bg-blue-200 dark:bg-blue-900/90 z-10 p-2 text-right font-bold text-blue-900 dark:text-blue-100 border-r border-white dark:border-gray-700">
                                        Total procedimentos
                                    </td>
                                    {municipalityUnits.map(unit => {
                                        const totalUnit = goals.reduce((acc, goal) => {
                                            const cleanProcKey = goal.procedureCode.replace(/\D/g, '');
                                            let qty = 0;
                                            const unitStats = stats[unit.id] || {};
                                            Object.keys(unitStats).forEach(actualProcKey => {
                                                const cleanActualProcKey = actualProcKey.replace(/\D/g, '');
                                                if (cleanActualProcKey.startsWith(cleanProcKey)) {
                                                    qty += unitStats[actualProcKey];
                                                }
                                            });
                                            return acc + qty;
                                        }, 0);
                                        return (
                                            <td key={unit.id} className="text-center font-bold text-blue-900 dark:text-blue-100 p-2 border-r border-white dark:border-gray-700">
                                                {totalUnit}
                                            </td>
                                        );
                                    })}
                                    <td className="text-center font-bold text-blue-900 dark:text-blue-100 p-2 border-r border-white dark:border-gray-700">
                                        {goals.reduce((acc, goal) => {
                                            const cleanProcKey = goal.procedureCode.replace(/\D/g, '');
                                            let totalRowQty = municipalityUnits.reduce((sum, unit) => {
                                                let qty = 0;
                                                const unitStats = stats[unit.id] || {};
                                                Object.keys(unitStats).forEach(actualProcKey => {
                                                    const cleanActualProcKey = actualProcKey.replace(/\D/g, '');
                                                    if (cleanActualProcKey.startsWith(cleanProcKey)) qty += unitStats[actualProcKey];
                                                });
                                                return sum + qty;
                                            }, 0);
                                            return acc + totalRowQty;
                                        }, 0)}
                                    </td>
                                    <td className="text-center font-bold text-blue-900 dark:text-blue-100 p-2 border-r border-white dark:border-gray-700">
                                        {goals.reduce((acc, goal) => acc + goal.targetQuantity, 0)}
                                    </td>
                                    <td className="text-center font-bold text-blue-900 dark:text-blue-100 p-2 border-r border-white dark:border-gray-700">
                                        {(() => {
                                            const totalProd = goals.reduce((acc, goal) => {
                                                const cleanProcKey = goal.procedureCode.replace(/\D/g, '');
                                                return acc + municipalityUnits.reduce((sum, unit) => {
                                                    let qty = 0;
                                                    const unitStats = stats[unit.id] || {};
                                                    Object.keys(unitStats).forEach(actualProcKey => {
                                                        const cleanActualProcKey = actualProcKey.replace(/\D/g, '');
                                                        if (cleanActualProcKey.startsWith(cleanProcKey)) qty += unitStats[actualProcKey];
                                                    });
                                                    return sum + qty;
                                                }, 0);
                                            }, 0);
                                            const totalMeta = goals.reduce((acc, goal) => acc + (goal.annualTargetQuantity || (goal.targetQuantity * 12)), 0);
                                            const diff = totalProd - totalMeta;
                                            return (
                                                <span className={diff >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
                                                    {diff > 0 ? `+${diff}` : diff}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="text-center font-bold text-blue-900 dark:text-blue-100 p-2">
                                        {goals.reduce((acc, goal) => acc + (goal.annualTargetQuantity || (goal.targetQuantity * 12)), 0)}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && mode === 'procedimentos' && (
                <GenericProcedureComparative
                    stats={stats}
                    procedureDetails={procedureDetails}
                    goals={goals}
                    municipalityUnits={municipalityUnits}
                    breakdown={breakdown}
                />
            )}

            <div className="flex items-center gap-2 p-3 text-sm text-amber-700 bg-amber-50 rounded-lg dark:bg-amber-900/30 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <p>Os valores consolidados por unidade podem divergir ligeiramente do relatório por profissional, caso existam produções manuais registradas diretamente no profissional que não estejam vinculadas a uma Unidade (vínculo de equipe aberto).</p>
            </div>

            {hoveredData && createPortal(
                <div
                    className="fixed pointer-events-none z-[9999] p-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl text-left w-64 transform -translate-x-1/2 -translate-y-full mt-[-8px] transition-all duration-100 ease-out"
                    style={{ left: hoveredData.x, top: hoveredData.y }}
                >
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white/95 dark:bg-gray-900/95 border-b border-r border-gray-200 dark:border-gray-700 rotate-45"></div>
                    <div className="relative z-10">
                        <div className="text-[10px] uppercase font-bold text-gray-400 mb-2 border-b border-gray-100 dark:border-gray-800 pb-1 flex justify-between">
                            <span>Origem dos Dados Agregados</span>
                        </div>
                        <div className="flex gap-2 mb-2">
                            <span className="flex-1 text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md text-center">
                                ✍️ Manual: {hoveredData.data.manual || 0}
                            </span>
                            <span className="flex-1 text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md text-center">
                                🤖 Conector: {hoveredData.data.connector || 0}
                            </span>
                        </div>
                        {hoveredData.data.professionals && Object.keys(hoveredData.data.professionals).length > 0 && (
                            <div className="flex flex-col gap-1 mt-2">
                                <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Profissionais Envolvidos:</div>
                                {Object.entries(hoveredData.data.professionals).sort((a: any, b: any) => b[1].qty - a[1].qty).slice(0, 10).map(([pId, pData]: [string, any]) => (
                                    <div key={pId} className="flex justify-between items-center text-[10px] bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded">
                                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-2 max-w-[170px]" title={pData.name}>{pData.name}</span>
                                        <span className="font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-1.5 rounded">{pData.qty}</span>
                                    </div>
                                ))}
                                {Object.keys(hoveredData.data.professionals).length > 10 && (
                                    <div className="text-[9px] text-center text-gray-400 mt-1 italic">
                                        + {Object.keys(hoveredData.data.professionals).length - 10} outros...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
