import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Select, Button } from '../ui/Components';
import { Goal } from '../../types';
import { goalService } from '../../services/goalService';
import { useAuth } from '../../context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Download, AlertCircle, Calendar, Target, Edit3, GripVertical, Save, X } from 'lucide-react';
import { goalsFulfillmentReportService } from '../../services/goalsFulfillmentReportService';

const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const currentYearNum = new Date().getFullYear();

interface GoalsFulfillmentReportProps {
    municipalityId: string;
    onMunicipalityChange: (id: string) => void;
    allMunicipalities: { id: string; name: string }[];
    year: string;
}

export const GoalsFulfillmentReport: React.FC<GoalsFulfillmentReportProps> = ({
    municipalityId,
    onMunicipalityChange,
    allMunicipalities,
    year
}) => {
    const { claims } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);

    // stats[monthKey][procedureCode] = quantity
    const [stats, setStats] = useState<Record<string, Record<string, number>>>({});
    const [breakdown, setBreakdown] = useState<Record<string, Record<string, any>>>({});
    const [hoveredData, setHoveredData] = useState<{ x: number; y: number; data: any } | null>(null);

    const [vigencyOptions, setVigencyOptions] = useState<{label: string, startYear: string, endYear: string}[]>([]);
    const [selectedVigency, setSelectedVigency] = useState<string>('');

    // DnD and Ordering States
    const [isReordering, setIsReordering] = useState(false);
    const [draggedGoalIndex, setDraggedGoalIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [savingOrder, setSavingOrder] = useState(false);
    const [showEntityColumn, setShowEntityColumn] = useState(false);

    useEffect(() => {
        if (!municipalityId || !year) return;

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Fetch Municipality Goals
                const allGoals = await goalService.getGoalsForEntityPrivate(claims);
                const munGoals = allGoals.filter(g =>
                    g.municipalityId === municipalityId &&
                    (g.goalType === 'municipal' || !g.unitId)
                );

                const getYearFromComp = (comp?: string) => {
                   if (!comp) return new Date().getFullYear().toString();
                   if (comp.includes('/')) return comp.split('/')[1];
                   if (comp.includes('-')) return comp.split('-')[0];
                   return comp.substring(0, 4);
                };

                const getMonthYearString = (comp?: string) => {
                   if (!comp) return `${new Date().getFullYear()}-01`;
                   if (comp.includes('/')) {
                        const [m, y] = comp.split('/');
                        return `${y}-${m.padStart(2, '0')}`;
                   }
                   if (comp.includes('-')) {
                        const [y, m] = comp.split('-');
                        return `${y}-${m.padStart(2, '0')}`;
                   }
                   return `${comp.substring(0, 4)}-${comp.substring(4,6) || '01'}`;
                };

                const vigMap = new Map<string, { label: string, startYear: string, endYear: string, minMonth: string, maxMonth: string, startDate: string, endDate: string }>();
                munGoals.forEach(g => {
                    const sY = getYearFromComp(g.startMonth);
                    const eY = getYearFromComp(g.endMonth);
                    const sComp = getMonthYearString(g.startMonth);
                    const eComp = getMonthYearString(g.endMonth);
                    const sIso = g.startMonth || '';
                    const eIso = g.endMonth || '';
                    const key = sY !== eY ? `${sY} - ${eY}` : sY;

                    if (!vigMap.has(key)) {
                        vigMap.set(key, { label: key, startYear: sY, endYear: eY, minMonth: sComp, maxMonth: eComp, startDate: sIso, endDate: eIso });
                    } else {
                        const current = vigMap.get(key)!;
                        if (sComp < current.minMonth) current.minMonth = sComp;
                        if (eComp > current.maxMonth) current.maxMonth = eComp;
                        if (sIso && (!current.startDate || sIso < current.startDate)) current.startDate = sIso;
                        if (eIso && (!current.endDate || eIso > current.endDate)) current.endDate = eIso;
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
                    // Retorna cedo, pois o setState vai re-triggar o useEffect a seguir com a string correta
                    return; 
                }

                const filteredMunGoals = munGoals.filter(g => {
                     return getYearFromComp(g.startMonth) === currentVigencyObj!.startYear && getYearFromComp(g.endMonth) === currentVigencyObj!.endYear;
                });

                const uniqueGoalsMap = new Map<string, Goal>();
                filteredMunGoals.forEach(g => {
                    if (g.procedureCode) {
                        if (!uniqueGoalsMap.has(g.procedureCode)) {
                            uniqueGoalsMap.set(g.procedureCode, g);
                        } else {
                            const existing = uniqueGoalsMap.get(g.procedureCode)!;
                            existing.targetQuantity += (g.targetQuantity || 0);
                        }
                    }
                });

                let finalGoalsList = Array.from(uniqueGoalsMap.values());

                // 2. Fetch Custom Order Preference
                try {
                    const entityTypeRaw = String(claims.entityType || '').toUpperCase();
                    const prefsRef = doc(db, `municipalities/${entityTypeRaw}/${claims.entityId}/${municipalityId}/preferences/reports_metas`);
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
                    console.error("Failed to load custom table order:", e);
                }

                setGoals(finalGoalsList);

                // 3. Fetch Stats via Cloud Function
                const getGoalsFulfillmentStatsFn = httpsCallable(functions, 'getGoalsFulfillmentStats');
                const response = await getGoalsFulfillmentStatsFn({
                    municipalityId,
                    startYear: currentVigencyObj.startYear,
                    endYear: currentVigencyObj.endYear,
                    startMonth: currentVigencyObj.minMonth,
                    endMonth: currentVigencyObj.maxMonth,
                    startDate: currentVigencyObj.startDate,
                    endDate: currentVigencyObj.endDate,
                    includeEntity: showEntityColumn
                });

                const data = response.data as any;
                if (data.success && data.data) {
                    setStats(data.data);
                    setBreakdown(data.breakdown || {});
                }

            } catch (err: any) {
                console.error('Failed to load goals fulfillment report:', err);
                setError('Falha ao carregar os dados de cumprimento de metas. Tente novamente mais tarde.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [municipalityId, year, claims, selectedVigency, showEntityColumn]);

    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
        setDraggedGoalIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Hide the original sort of to make the dragged element distinct
        // It's a UX trick
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
            const prefsRef = doc(db, `municipalities/${entityTypeRaw}/${claims.entityId}/${municipalityId}/preferences/reports_metas`);
            
            const customOrder = goals.map(g => g.procedureCode);
            await setDoc(prefsRef, { customOrder }, { merge: true });
            
            setIsReordering(false);
        } catch (error) {
            console.error("Error saving custom table order:", error);
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

            const currentVigencyObj = vigencyOptions.find(v => v.label === selectedVigency) || { startYear: String(currentYearNum), endYear: String(currentYearNum), minMonth: `${currentYearNum}-01`, maxMonth: `${currentYearNum}-12`, startDate: '', endDate: '' };
            const sY = parseInt(currentVigencyObj.startYear);
            const eY = parseInt(currentVigencyObj.endYear);
            const minComp = currentVigencyObj.minMonth;
            const maxComp = currentVigencyObj.maxMonth;
            const reportMonths: { key: string, label: string }[] = [];
            for (let y = sY; y <= eY; y++) {
                for (let i = 1; i <= 12; i++) {
                    const mStr = String(i).padStart(2, '0');
                    const compKey = `${y}-${mStr}`;
                    if (compKey >= minComp && compKey <= maxComp) {
                        reportMonths.push({ key: compKey, label: `${monthsShort[i - 1]}/${String(y).substring(2)}` });
                    }
                }
            }

            const exportData = {
                year: selectedVigency || String(currentYearNum),
                startDate: currentVigencyObj.startDate,
                endDate: currentVigencyObj.endDate,
                reportMonths,
                municipalityName,
                entityName,
                logoUrl,
                logoBase64,
                goals,
                stats
            };

            if (format === 'excel') {
                await goalsFulfillmentReportService.generateExcel(exportData);
            } else {
                await goalsFulfillmentReportService.generatePdf(exportData);
            }
        } catch (err: any) {
            console.error('Error exporting PDF:', err);
            setError('Erro ao gerar relatório.');
        } finally {
            setLoading(false);
        }
    };

    if (!municipalityId) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Target className="w-12 h-12 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Selecione um Município</h3>
                <p className="text-sm mb-6 text-center max-w-md">Para visualizar o Cumprimento de Metas, selecione o município desejado abaixo.</p>
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

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 w-full xl:w-auto">
                    <div className="w-full sm:w-48 shrink-0">
                        <Select
                            value={municipalityId}
                            onChange={(e) => {
                                // Limpa a vigência selecionada ao trocar de município
                                setSelectedVigency('');
                                onMunicipalityChange(e.target.value);
                            }}
                            className="bg-white dark:bg-gray-800 w-full"
                        >
                            <option value="">Selecione o Município...</option>
                            {allMunicipalities.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </Select>
                    </div>

                    {municipalityId && vigencyOptions.length > 0 && (
                        <div className="w-full sm:w-auto shrink-0 flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Vigência:</span>
                            <div className="w-32">
                                <Select
                                    value={selectedVigency}
                                    onChange={(e) => setSelectedVigency(e.target.value)}
                                    className="bg-white dark:bg-gray-800 w-full"
                                >
                                    {vigencyOptions.map(v => (
                                        <option key={v.label} value={v.label}>{v.label}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="shrink-0 w-full xl:w-auto flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors">
                        <input
                            type="checkbox"
                            id="showEntity"
                            checked={showEntityColumn}
                            onChange={(e) => setShowEntityColumn(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <label htmlFor="showEntity" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                            Computar Entidade
                        </label>
                    </div>

                    {isReordering ? (
                        <>
                            <Button size="sm" variant="outline" className="gap-2 shrink-0 border-gray-300 text-gray-700 hover:bg-gray-100" onClick={() => setIsReordering(false)} disabled={savingOrder}>
                                <X className="w-4 h-4" /> Cancelar
                            </Button>
                            <Button size="sm" variant="default" className="gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveOrder} disabled={savingOrder}>
                                {savingOrder ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />} 
                                Salvar Ordem
                            </Button>
                        </>
                    ) : (
                        <Button size="sm" variant="outline" className="gap-2 shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/40" onClick={() => setIsReordering(true)} disabled={loading || goals.length === 0}>
                            <Edit3 className="w-4 h-4 shrink-0" />
                            Editar Ordem
                        </Button>
                    )}

                    <div className="relative group shrink-0 w-full xl:w-auto">
                        <Button size="sm" variant="outline" className="gap-2 w-full xl:w-auto justify-between" disabled={loading || goals.length === 0 || isReordering}>
                            <span className="flex items-center gap-2">
                                <Download className="w-4 h-4 shrink-0" />
                                Exportar
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </Button>
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
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

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 border rounded-lg shadow-sm border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Agregando série histórica...</h3>
                    <p className="text-sm text-gray-500 mt-1">Isso pode levar alguns segundos dependendo do volume de dados.</p>
                </div>
            ) : (() => {
                // Cálculo das colunas da tabela de acordo com a vigência e meses específicos
                const currentVigencyObj = vigencyOptions.find(v => v.label === selectedVigency) || { startYear: String(currentYearNum), endYear: String(currentYearNum), minMonth: `${currentYearNum}-01`, maxMonth: `${currentYearNum}-12`, startDate: '', endDate: '' };
                const sY = parseInt(currentVigencyObj.startYear);
                const eY = parseInt(currentVigencyObj.endYear);
                const minComp = currentVigencyObj.minMonth;
                const maxComp = currentVigencyObj.maxMonth;

                const reportMonths: { key: string, label: string }[] = [];
                for (let y = sY; y <= eY; y++) {
                    for (let i = 1; i <= 12; i++) {
                        const mStr = String(i).padStart(2, '0');
                        const compKey = `${y}-${mStr}`;
                        if (compKey >= minComp && compKey <= maxComp) {
                            reportMonths.push({ key: compKey, label: `${monthsShort[i - 1]}/${String(y).substring(2)}` });
                        }
                    }
                }
                const totalTargetMonths = reportMonths.length;

                return (
                <div className="overflow-x-auto pb-4 border rounded-lg shadow-sm border-gray-100 dark:border-gray-800 mt-4">
                    {currentVigencyObj.startDate && currentVigencyObj.endDate && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-2 text-xs text-center border-b border-yellow-100 dark:border-yellow-900/50">
                            <strong>Nota:</strong> A contagem de produção para esta vigência cobre rigorosamente o período do dia <strong>{currentVigencyObj.startDate.split('-').reverse().join('/')}</strong> ao dia <strong>{currentVigencyObj.endDate.split('-').reverse().join('/')}</strong>.
                        </div>
                    )}
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 border-collapse">
                        <thead>
                            <tr className="bg-gray-200 dark:bg-gray-800">
                                <th className="sticky left-0 bg-gray-200 dark:bg-gray-800 z-10 w-20 min-w-[80px] font-bold text-gray-800 dark:text-gray-200 p-2 text-center border-r border-white dark:border-gray-700">
                                    {isReordering && <GripVertical className="w-4 h-4 inline-block text-gray-400 mr-1" />} Cód.
                                </th>
                                <th className="sticky left-20 bg-gray-200 dark:bg-gray-800 z-10 w-64 min-w-[250px] font-bold text-gray-800 dark:text-gray-200 p-2 border-r border-white dark:border-gray-700">
                                    Procedimento (Meta Global)
                                </th>
                                {reportMonths.map(m => (
                                    <th key={m.key} className="text-center font-bold bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs p-2 max-w-[80px] border-r border-white dark:border-gray-700 leading-tight">
                                        {m.label}
                                    </th>
                                ))}
                                <th className="text-center font-bold bg-cyan-100 dark:bg-cyan-900/40 text-cyan-900 dark:text-cyan-100 p-2 text-xs border-r border-white dark:border-gray-700 min-w-[80px]">
                                    Total Alcançado
                                </th>
                                <th className="text-center font-bold bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 text-xs border-r border-gray-200 dark:border-gray-700 min-w-[80px]">
                                    Meta do Período
                                </th>
                                <th className="text-center font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 p-2 text-xs border-r border-white dark:border-gray-700 min-w-[80px]">
                                    % Cumprido
                                </th>
                                <th className="text-center font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 p-2 text-xs min-w-[80px]">
                                    Falta
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                            {goals.map((goal, index) => {
                                const cleanProcKey = goal.procedureCode.replace(/\D/g, '');

                                let totalAlcancado = 0;
                                const monthlyData = [];

                                for (const rm of reportMonths) {
                                    const monthKey = rm.key;
                                    let monthQty = 0;
                                    
                                    const monthStats = stats[monthKey] || {};
                                    Object.keys(monthStats).forEach(actualProcKey => {
                                        const cleanActualProcKey = actualProcKey.replace(/\D/g, '');
                                        if (cleanActualProcKey.startsWith(cleanProcKey)) {
                                            monthQty += monthStats[actualProcKey];
                                        }
                                    });
                                    
                                    totalAlcancado += monthQty;
                                    monthlyData.push({ monthKey, qty: monthQty });
                                }

                                const metaTotal = goal.annualTargetQuantity || ((goal.targetQuantity || 0) * 12);
                                const percentualNum = metaTotal > 0 ? (totalAlcancado / metaTotal) * 100 : 0;
                                const falta = Math.max(0, metaTotal - totalAlcancado);

                                let percentColorClass = "text-gray-900 dark:text-gray-100 bg-emerald-50 dark:bg-emerald-900/20";
                                if (percentualNum >= 100) percentColorClass = "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20";
                                else percentColorClass = "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/40";

                                const trClasses = [
                                    "transition-colors",
                                    isReordering ? "cursor-move hover:bg-gray-50 dark:hover:bg-gray-800/80" : "hover:bg-gray-50 dark:hover:bg-gray-800/30",
                                    draggedGoalIndex === index ? "opacity-40 bg-blue-50 dark:bg-blue-900/20" : "",
                                    dragOverIndex === index ? "border-t-2 border-t-blue-500 bg-blue-50 dark:bg-blue-900/10" : ""
                                ].filter(Boolean).join(" ");

                                return (
                                    <tr 
                                        key={goal.procedureCode} 
                                        className={trClasses}
                                        draggable={isReordering}
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragEnter={(e) => handleDragEnter(e, index)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, index)}
                                        onDragEnd={() => { setDraggedGoalIndex(null); setDragOverIndex(null); }}
                                    >
                                        <td className={`sticky left-0 bg-gray-200 dark:bg-gray-800/90 z-10 border-r border-white dark:border-gray-700 p-2 text-center font-bold text-gray-800 dark:text-gray-300 ${dragOverIndex === index ? 'border-t-2 border-t-blue-500' : ''}`}>
                                            <div className="flex items-center justify-center gap-1">
                                                {isReordering && <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />}
                                                {goal.procedureCode}
                                            </div>
                                        </td>
                                        <td className="sticky left-20 bg-gray-200 dark:bg-gray-800/90 z-10 border-r border-white dark:border-gray-700 p-2">
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 block" title={goal.procedureName}>
                                                {goal.procedureName}
                                            </span>
                                        </td>

                                        {monthlyData.map((mData, mIdx) => {
                                            const qty = mData.qty;
                                            const hasBreakdown = breakdown[mData.monthKey] && breakdown[mData.monthKey][goal.procedureCode];
                                            const breakdownData = hasBreakdown ? breakdown[mData.monthKey][goal.procedureCode] : null;

                                            return (
                                                <td 
                                                    key={mIdx} 
                                                    className={`text-center text-sm p-2 border-r border-white dark:border-gray-700 ${qty > 0 ? 'bg-blue-50/50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800/50'}`}
                                                    onMouseEnter={(e) => {
                                                        if (qty > 0 && breakdownData) {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setHoveredData({
                                                                x: rect.left + window.scrollX + rect.width / 2,
                                                                y: rect.top + window.scrollY - 10,
                                                                data: breakdownData
                                                            });
                                                        }
                                                    }}
                                                    onMouseLeave={() => setHoveredData(null)}
                                                >
                                                    <span className="font-medium text-gray-800 dark:text-gray-300">{qty}</span>
                                                </td>
                                            );
                                        })}

                                        <td className="text-center font-bold text-cyan-900 dark:text-cyan-100 bg-cyan-50 dark:bg-cyan-900/20 p-2 border-r border-white dark:border-gray-700">
                                            {totalAlcancado}
                                        </td>
                                        <td className="text-center font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 p-2 border-r border-gray-200 dark:border-gray-700">
                                            {metaTotal}
                                        </td>
                                        <td className={`text-center font-bold p-2 border-r border-white dark:border-gray-700 ${percentColorClass}`}>
                                            {percentualNum.toFixed(1)}%
                                        </td>
                                        <td className={`text-center font-bold bg-amber-100 dark:bg-amber-900/40 p-2 text-sm ${falta > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                            {falta}
                                        </td>
                                    </tr>
                                );
                            })}

                            {goals.length === 0 && (
                                <tr>
                                    <td colSpan={18} className="py-8 text-center text-gray-500">
                                        Nenhuma Meta Global encontrada para este município na vigência selecionada.
                                    </td>
                                </tr>
                            )}

                            {goals.length > 0 && (
                                <tr className="bg-blue-200 dark:bg-blue-900/60">
                                    <td colSpan={2} className="sticky left-0 bg-blue-200 dark:bg-blue-900/90 z-10 p-2 text-right font-bold text-blue-900 dark:text-blue-100 border-r border-white dark:border-gray-700">
                                        TOTAL
                                    </td>
                                    {reportMonths.map((rm, mIdx) => {
                                        const totalMonth = goals.reduce((acc, goal) => {
                                            const cleanProcKey = goal.procedureCode.replace(/\D/g, '');
                                            let qty = 0;
                                            const monthStats = stats[rm.key] || {};
                                            Object.keys(monthStats).forEach(actualProcKey => {
                                                const cleanActualProcKey = actualProcKey.replace(/\D/g, '');
                                                if (cleanActualProcKey.startsWith(cleanProcKey)) qty += monthStats[actualProcKey];
                                            });
                                            return acc + qty;
                                        }, 0);
                                        return (
                                            <td key={mIdx} className="text-center font-bold text-blue-900 dark:text-blue-100 p-2 border-r border-white dark:border-gray-700">
                                                {totalMonth}
                                            </td>
                                        );
                                    })}
                                    <td className="text-center font-bold text-blue-900 dark:text-blue-100 p-2 border-r border-white dark:border-gray-700">
                                        {goals.reduce((acc, goal) => {
                                            const cleanProcKey = goal.procedureCode.replace(/\D/g, '');
                                            let totalRowQty = 0;
                                            for(const rm of reportMonths) {
                                                const monthStats = stats[rm.key] || {};
                                                Object.keys(monthStats).forEach(actualProcKey => {
                                                    const cleanActualProcKey = actualProcKey.replace(/\D/g, '');
                                                    if (cleanActualProcKey.startsWith(cleanProcKey)) totalRowQty += monthStats[actualProcKey];
                                                });
                                            }
                                            return acc + totalRowQty;
                                        }, 0)}
                                    </td>
                                    <td className="text-center font-bold text-blue-900 dark:text-blue-100 p-2 border-r border-white dark:border-gray-700">
                                        {goals.reduce((acc, goal) => acc + (goal.annualTargetQuantity || ((goal.targetQuantity || 0) * 12)), 0)}
                                    </td>
                                    <td className="text-center font-bold text-blue-900 dark:text-blue-100 p-2 border-r border-white dark:border-gray-700">
                                        {(() => {
                                            const grandTotalProd = goals.reduce((acc, goal) => {
                                                const cleanProcKey = goal.procedureCode.replace(/\D/g, '');
                                                let totalRowQty = 0;
                                                for(const rm of reportMonths) {
                                                    const monthStats = stats[rm.key] || {};
                                                    Object.keys(monthStats).forEach(actualProcKey => {
                                                        const cleanActualProcKey = actualProcKey.replace(/\D/g, '');
                                                        if (cleanActualProcKey.startsWith(cleanProcKey)) totalRowQty += monthStats[actualProcKey];
                                                    });
                                                }
                                                return acc + totalRowQty;
                                            }, 0);
                                            const grandMetaPeriodo = goals.reduce((acc, goal) => acc + (goal.annualTargetQuantity || ((goal.targetQuantity || 0) * 12)), 0);
                                            return grandMetaPeriodo > 0 ? ((grandTotalProd / grandMetaPeriodo) * 100).toFixed(1) + '%' : '0.0%';
                                        })()}
                                    </td>
                                    <td className="text-center font-bold text-blue-900 dark:text-blue-100 p-2">
                                        {(() => {
                                            const grandTotalProd = goals.reduce((acc, goal) => {
                                                const cleanProcKey = goal.procedureCode.replace(/\D/g, '');
                                                let totalRowQty = 0;
                                                for(const rm of reportMonths) {
                                                    const monthStats = stats[rm.key] || {};
                                                    Object.keys(monthStats).forEach(actualProcKey => {
                                                        const cleanActualProcKey = actualProcKey.replace(/\D/g, '');
                                                        if (cleanActualProcKey.startsWith(cleanProcKey)) totalRowQty += monthStats[actualProcKey];
                                                    });
                                                }
                                                return acc + totalRowQty;
                                            }, 0);
                                            const grandMetaPeriodo = goals.reduce((acc, goal) => acc + (goal.annualTargetQuantity || ((goal.targetQuantity || 0) * 12)), 0);
                                            return Math.max(0, grandMetaPeriodo - grandTotalProd);
                                        })()}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                );
            })()}

            {/* Glassmorphism Tooltip for Breakdown */}
            {hoveredData && createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full"
                    style={{ left: hoveredData.x, top: hoveredData.y }}
                >
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-xl border border-gray-100/50 dark:border-gray-700/50 rounded-xl p-4 text-sm w-64">
                        <div className="space-y-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                <span>Origem dos Dados</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-700 dark:text-gray-200">
                                <span>✍️ Manual:</span>
                                <span className="font-bold">{hoveredData.data.manual || 0}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-700 dark:text-gray-200">
                                <span>🤖 Conector:</span>
                                <span className="font-bold">{hoveredData.data.connector || 0}</span>
                            </div>
                            {(hoveredData.data.actions || 0) > 0 && (
                            <div className="flex justify-between items-center text-gray-700 dark:text-gray-200">
                                <span>🎯 Ações/Progs:</span>
                                <span className="font-bold">{hoveredData.data.actions || 0}</span>
                            </div>
                            )}
                        </div>

                        {hoveredData.data.professionals && Object.keys(hoveredData.data.professionals).length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Top Profissionais
                                </div>
                                {Object.entries(hoveredData.data.professionals)
                                    .sort((a: any, b: any) => b[1].qty - a[1].qty)
                                    .slice(0, 10).map(([pId, pData]: [string, any]) => (
                                    <div key={pId} className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-300">
                                        <span className="truncate pr-2">{pData.name}</span>
                                        <span className="font-bold">{pData.qty}</span>
                                    </div>
                                ))}
                                {Object.keys(hoveredData.data.professionals).length > 10 && (
                                    <div className="text-xs text-center pt-2 text-blue-500 font-medium">
                                        + {Object.keys(hoveredData.data.professionals).length - 10} outros...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {/* Seta do Tooltip */}
                    <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full border-solid border-t-white/90 dark:border-t-gray-800/90 border-t-8 border-l-transparent border-l-8 border-r-transparent border-r-8"></div>
                </div>,
                document.body
            )}
        </div>
    );
};
