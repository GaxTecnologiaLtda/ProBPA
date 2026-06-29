import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Badge } from '../ui/Components';
import { AlertTriangle, ChevronDown, ChevronRight, Building2, MapPin, Loader2, Calendar, Activity, Filter, Download, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { Municipality } from '../../types';
import { functions, db } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { susReportService } from '../../services/susReportService';
import { createPortal } from 'react-dom';
// @ts-ignore
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

interface ProfessionalPerformanceWidgetProps {
    initialYear: string;
    initialMonth: string;
    bannerOnly?: boolean;
}

interface GroupedZeros {
    [municipalityName: string]: {
        [unitName: string]: any[];
    };
}

export const ProfessionalPerformanceWidget: React.FC<ProfessionalPerformanceWidgetProps> = ({ initialYear, initialMonth, bannerOnly = false }) => {
    const { claims } = useAuth();
    const currentYearNum = new Date().getFullYear();

    // Internal Competence State
    const [widgetYear, setWidgetYear] = useState<string>(initialYear || currentYearNum.toString());
    const [widgetMonth, setWidgetMonth] = useState<string>(initialMonth === 'all' ? String(new Date().getMonth() + 1) : initialMonth);
    const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');

    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
    const [groupedZeros, setGroupedZeros] = useState<GroupedZeros>({});
    const [totalZerosUnique, setTotalZerosUnique] = useState(0);
    const [totalProfessionalsEvaluated, setTotalProfessionalsEvaluated] = useState(0);
    
    const [loadingData, setLoadingData] = useState(true);
    const [loadingStats, setLoadingStats] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    
    const generationIdRef = useRef<number>(0); 
    
    // Progress bar simulation
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (loadingStats) {
            setLoadingProgress(0);
            interval = setInterval(() => {
                setLoadingProgress(prev => {
                    if (prev < 30) return prev + 8;
                    if (prev < 60) return prev + 4;
                    if (prev < 85) return prev + 2;
                    if (prev < 95) return prev + 1;
                    return prev;
                });
            }, 300);
        } else {
            setLoadingProgress(100);
            setTimeout(() => setLoadingProgress(0), 400); // reset after finish
        }
        return () => clearInterval(interval);
    }, [loadingStats]);
    
    // UI State for Accordions
    const [expandedMunicipalities, setExpandedMunicipalities] = useState<Record<string, boolean>>({});
    const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

    const toggleMunicipality = (muni: string) => {
        setExpandedMunicipalities(prev => ({ ...prev, [muni]: !prev[muni] }));
    };

    const toggleUnit = (muniUnit: string) => {
        setExpandedUnits(prev => ({ ...prev, [muniUnit]: !prev[muniUnit] }));
    };

    // 1. Fetch Reference Data Once (Only what we need for the UI filters)
    useEffect(() => {
        const loadReferenceData = async () => {
            if (!claims?.entityId) return;
            setLoadingData(true);
            try {
                const munis = await fetchMunicipalitiesByEntity(claims.entityId);
                setMunicipalities(munis);
            } catch (error) {
                console.error("Error fetching municipalities", error);
            } finally {
                setLoadingData(false);
            }
        };
        loadReferenceData();
    }, [claims?.entityId]);

    // 2. Fetch Zero Production from the new blazingly fast backend API with LocalStorage Caching
    const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
    const getCacheKey = () => `zero_prod_${claims?.entityId}_${widgetYear}_${widgetMonth}_${selectedMunicipality}`;

    const fetchZeroProductionData = async (forceRefresh = false) => {
        if (!claims?.entityId || loadingData) return;
        
        const cacheKey = getCacheKey();
        const currentGenId = ++generationIdRef.current;
        
        // --- 1. CHECK CACHE FIRST ---
        if (!forceRefresh) {
            const cachedStr = localStorage.getItem(cacheKey);
            if (cachedStr) {
                try {
                    const parsed = JSON.parse(cachedStr);
                    if (Date.now() - parsed.timestamp < CACHE_TTL) {
                        setGroupedZeros(parsed.data.groupedZeros);
                        setTotalZerosUnique(parsed.data.totalZerosUnique);
                        setTotalProfessionalsEvaluated(parsed.data.totalProfessionalsEvaluated);
                        
                        triggerPopupIfNecessary(parsed.data, parsed.timestamp);
                        
                        // Auto-expand UX
                        const data = parsed.data;
                        const mKeys = Object.keys(data.groupedZeros).sort();
                        const mExpanded: Record<string, boolean> = {};
                        const uExpanded: Record<string, boolean> = {};
                        if (mKeys.length > 0) {
                             mExpanded[mKeys[0]] = true;
                             const uKeys = Object.keys(data.groupedZeros[mKeys[0]]).sort();
                             if (uKeys.length > 0) {
                                  uExpanded[`${mKeys[0]}-${uKeys[0]}`] = true;
                             }
                        }
                        setExpandedMunicipalities(mExpanded);
                        setExpandedUnits(uExpanded);
                        
                        setLoadingStats(false);
                        return; // Successfully used cache
                    }
                } catch (e) {
                    console.warn("Invalid zero production cache, bypassing.");
                }
            }
        }

        // --- 2. FETCH FROM CLOUD ---
        setLoadingStats(true);
        
        try {
            const getZerosFn = httpsCallable(functions, 'getZeroProductionProfessionals', { timeout: 300000 });
            
            const response = await getZerosFn({
                entityId: claims.entityId,
                year: widgetYear,
                month: widgetMonth === 'all' ? undefined : widgetMonth,
                municipalityName: selectedMunicipality,
                municipalities: municipalities
            });
            
            const data = response.data as { groupedZeros: GroupedZeros; totalZerosUnique: number; totalProfessionalsEvaluated: number };
            const payload = {
                timestamp: Date.now(),
                data: {
                    groupedZeros: data.groupedZeros,
                    totalZerosUnique: data.totalZerosUnique,
                    totalProfessionalsEvaluated: data.totalProfessionalsEvaluated || 0
                }
            };
            
            // Background Cache Snapshot
            try {
                localStorage.setItem(cacheKey, JSON.stringify(payload));
            } catch (e) {}

            triggerPopupIfNecessary(payload.data, payload.timestamp);

            if (currentGenId !== generationIdRef.current) return;
            
            setGroupedZeros(data.groupedZeros);
            setTotalZerosUnique(data.totalZerosUnique);
            setTotalProfessionalsEvaluated(data.totalProfessionalsEvaluated || 0);

            // Auto-expand first items for UX
            const mKeys = Object.keys(data.groupedZeros).sort();
            const mExpanded: Record<string, boolean> = {};
            const uExpanded: Record<string, boolean> = {};
            
            if (mKeys.length > 0) {
                 mExpanded[mKeys[0]] = true;
                 const uKeys = Object.keys(data.groupedZeros[mKeys[0]]).sort();
                 if (uKeys.length > 0) {
                      uExpanded[`${mKeys[0]}-${uKeys[0]}`] = true;
                 }
            }
            setExpandedMunicipalities(mExpanded);
            setExpandedUnits(uExpanded);
            
        } catch (error) {
            console.error("Error fetching zero production API:", error);
        } finally {
            if (currentGenId === generationIdRef.current) {
                setLoadingStats(false);
            }
        }
    };

    useEffect(() => {
        fetchZeroProductionData(false);
    }, [widgetYear, widgetMonth, selectedMunicipality, loadingData, claims?.entityId]);

    const triggerPopupIfNecessary = (data: any, timestamp: number) => {
        // Only trigger popup explicitly on the visual widget to avoid spamming 
        // if this widget is hidden / rendered in multiple places.
        // We'll restrict the popup to trigger only if this widget is 'bannerOnly' (used on the main Dashboard)
        // or just by checking sessionStorage.
        if (!bannerOnly) return; 
        
        const pct = data.totalProfessionalsEvaluated > 0 
            ? Math.round((data.totalZerosUnique / data.totalProfessionalsEvaluated) * 100) 
            : 0;

        const popupKey = `zeroProdPopup_${claims?.entityId}_${timestamp}`;
        if (!sessionStorage.getItem(popupKey)) {
            sessionStorage.setItem(popupKey, 'true');
            
            setTimeout(() => {
                Swal.fire({
                    title: 'Alerta de Ociosidade',
                    html: `Detectamos que <b>${pct}%</b> da equipe (${data.totalZerosUnique} de ${data.totalProfessionalsEvaluated} profissionais) não registrou produção nesta pesquisa.<br><br>Ideal acompanhar de perto para evitar perdas contratuais.`,
                    icon: pct >= 40 ? 'warning' : 'info',
                    confirmButtonText: 'Ciente, Obrigado',
                    confirmButtonColor: pct >= 40 ? '#ef4444' : '#3b82f6'
                });
            }, 800);
        }
    };

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const generateYearOptions = () => {
        let years = [];
        for (let i = currentYearNum; i >= 2023; i--) {
            years.push({ value: i.toString(), label: i.toString() });
        }
        return years;
    };

    const uniqueMunicipalities = useMemo(() => {
        return municipalities.map(m => m.name).sort();
    }, [municipalities]);

    // Export Handlers
    const getReportContextName = () => {
        return `Controle_Zerados_${selectedMunicipality === 'all' ? 'Geral' : selectedMunicipality}_${widgetMonth !== 'all' ? widgetMonth.padStart(2, '0') : 'Ano'}_${widgetYear}`;
    };

    const buildExportRows = () => {
        const rows: any[][] = [];
        Object.keys(groupedZeros).sort().forEach(muni => {
            Object.keys(groupedZeros[muni]).sort().forEach(unit => {
                groupedZeros[muni][unit].forEach(prof => {
                    rows.push([
                        muni,
                        unit,
                        prof.name.toUpperCase(),
                        prof.cns || 'S/N',
                        prof.cpf || 'S/N',
                        prof.cbo || prof.occupation || 'NÃO ESPECIFICADO'
                    ]);
                });
            });
        });
        return rows;
    };

    const handleExportPDF = async () => {
        let finalLogoBase64: string | undefined = undefined;
        try {
            if (claims?.entityId) {
                const entDoc = await getDoc(doc(db, 'entities', claims.entityId));
                if (entDoc.exists()) {
                    finalLogoBase64 = entDoc.data().logoBase64;
                }
            }
        } catch (error) {
            console.error("Failed to fetch entity logo for PDF:", error);
        }

        susReportService.generateZeroProductionPdf(groupedZeros, {
            competence: widgetMonth === 'all' ? widgetYear : `${widgetMonth.padStart(2, '0')}/${widgetYear}`,
            logoBase64: finalLogoBase64,
            filename: `${getReportContextName()}.pdf`
        });
    };

    const handleExportExcel = () => {
        const rows = buildExportRows();
        const headers = ['Município', 'Unidade', 'Profissional', 'CNS', 'CPF', 'CBO/Cargo'];
        const sheetData = [headers, ...rows];

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 45 }, { wch: 20 }, { wch: 15 }, { wch: 30 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Produções_Zeradas");
        XLSX.writeFile(wb, `${getReportContextName()}.xlsx`);
    };

    // Alert Banner calculation
    const percentZeroed = totalProfessionalsEvaluated > 0 
        ? Math.round((totalZerosUnique / totalProfessionalsEvaluated) * 100) 
        : 0;

    const getAlertTheme = (pct: number) => {
        if (pct === 100) return "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300";
        if (pct >= 80) return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300";
        if (pct >= 60) return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-600";
        if (pct >= 40) return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-500";
        if (pct >= 20) return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300";
        return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300";
    };

    const getAlertIconTheme = (pct: number) => {
        if (pct === 100) return "text-purple-600 dark:text-purple-400";
        if (pct >= 80) return "text-red-600 dark:text-red-400";
        if (pct >= 60) return "text-yellow-600 dark:text-yellow-500";
        if (pct >= 40) return "text-amber-600 dark:text-amber-500";
        if (pct >= 20) return "text-blue-600 dark:text-blue-400";
        return "text-gray-500 dark:text-gray-400";
    };

    const getAlertMessage = (pct: number) => {
        if (pct === 100) return "CRÍTICO EXTREMO! 100% dos profissionais sem produção.";
        if (pct >= 80) return "ESTADO CRÍTICO! Alto índice de ociosidade detectado.";
        if (pct >= 60) return "ATENÇÃO ALTA! Maioria da equipe não registrou trabalhos.";
        if (pct >= 40) return "ATENÇÃO MODERADA! Fique alerta ao volume de profissionais zerados.";
        if (pct >= 20) return "STATUS ACEITÁVEL. Produção majoritariamente lançada.";
        return "STATUS IDEAL! Menos de 20% da equipe está zerada.";
    };

    const alertBannerContent = (
        <div className={`flex items-center gap-4 p-4 rounded-xl border shadow-sm transition-all animate-pulse ${getAlertTheme(percentZeroed)}`}>
            <div className={`p-2 bg-white/50 dark:bg-black/20 rounded-lg ${getAlertIconTheme(percentZeroed)}`}>
                <Activity className="w-6 h-6" />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-sm tracking-wide">{getAlertMessage(percentZeroed)}</h3>
                <p className="text-xs opacity-90 mt-0.5 font-medium">
                    {totalZerosUnique} profissionais zerados de um total de {totalProfessionalsEvaluated} cadastrados na entidade.
                </p>
            </div>
            <div className="text-right">
                <div className="text-3xl font-black">{percentZeroed}%</div>
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-80 mt-0.5">Índice de Ociosidade</div>
            </div>
        </div>
    );

    // Grab portal target element
    const portalElement = document.getElementById('zero-production-alert-portal');

    return (
        <div className="space-y-4">
            {/* Local Alert Banner (Duplicated logic below) */}
            {!loadingStats && !loadingData && totalProfessionalsEvaluated > 0 && alertBannerContent}
            
            {/* Global Teleport Portal to the Top Header */}
            {!loadingStats && !loadingData && totalProfessionalsEvaluated > 0 && !bannerOnly && portalElement && createPortal(alertBannerContent, portalElement)}

            {!bannerOnly && (
                <Card className="overflow-hidden bg-white dark:bg-gray-800 shadow-sm border border-red-100 dark:border-red-900/50">
                {/* Header Area */}
            <div className="p-5 border-b border-red-100 dark:border-red-900/30 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gradient-to-r from-red-50 to-white dark:from-red-900/20 dark:to-gray-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Controle de Produções Zeradas</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Monitoramento de profissionais sem registro na competência</p>
                    </div>
                </div>

                {/* Filters and Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Exports (Only enabled when not loading) */}
                    <div className="flex gap-2 mr-2">
                        <button 
                            disabled={loadingStats || loadingData}
                            onClick={() => fetchZeroProductionData(true)}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Atualizar dados conectando ao servidor"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} /> Atualizar Base
                        </button>
                        <button 
                            disabled={loadingStats || loadingData}
                            onClick={handleExportPDF}
                            className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button 
                            disabled={loadingStats || loadingData}
                            onClick={handleExportExcel}
                            className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-3.5 h-3.5" /> Excel
                        </button>
                    </div>

                    {/* Municipality Filter */}
                    <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden shadow-sm">
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex items-center">
                            <Filter className="w-4 h-4 text-gray-500" />
                        </div>
                        <select 
                            className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 dark:text-gray-200 py-2 pl-3 pr-8 min-w-[150px] cursor-pointer"
                            value={selectedMunicipality}
                            onChange={(e) => setSelectedMunicipality(e.target.value)}
                        >
                            <option value="all">Todos os Municípios</option>
                            {uniqueMunicipalities.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {/* Competence Selectors */}
                    <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden shadow-sm">
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex items-center">
                            <Calendar className="w-4 h-4 text-gray-500" />
                        </div>
                        <select 
                            className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 dark:text-gray-200 py-2 pl-3 pr-8 min-w-[120px] cursor-pointer"
                            value={widgetMonth}
                            onChange={(e) => setWidgetMonth(e.target.value)}
                        >
                            <option value="all">Ano Completo</option>
                            {monthNames.map((m, i) => (
                                <option key={i + 1} value={String(i + 1)}>{m}</option>
                            ))}
                        </select>
                        <div className="w-px bg-gray-200 dark:bg-gray-700" />
                        <select 
                            className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 dark:text-gray-200 py-2 pl-3 pr-8 min-w-[80px] cursor-pointer"
                            value={widgetYear}
                            onChange={(e) => setWidgetYear(e.target.value)}
                        >
                            {generateYearOptions().map(y => (
                                <option key={y.value} value={y.value}>{y.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative border-t border-red-50 dark:border-red-900/30">
                {/* Background Decorator */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 dark:bg-red-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                {loadingStats || loadingData ? (
                    <div className="p-16 flex flex-col items-center justify-center space-y-5">
                        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                        <div className="text-center w-full max-w-sm">
                            <p className="text-gray-700 dark:text-gray-200 font-bold text-base mb-1">
                                Buscando e Agregando Dados
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">
                                Executando Consolidação dos dados, aguarde, o tempo será conforme o volume de dados.
                            </p>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden shadow-inner flex">
                                <div 
                                    className="bg-red-500 h-2 rounded-full transition-all duration-300 ease-out flex-shrink-0"
                                    style={{ width: `${Math.max(5, loadingProgress)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-5 lg:p-6 relative z-10 min-h-[300px]">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-medium text-red-800 dark:text-red-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Profissionais Faltosos Encontrados
                            </h4>
                            <div className="text-xs text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full font-medium border border-red-200 dark:border-red-900/50">
                                {totalZerosUnique} Indivíduos Relacionados
                            </div>
                        </div>

                        {Object.keys(groupedZeros).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-green-200 dark:border-green-900/30 rounded-xl bg-green-50/50 dark:bg-green-900/10">
                                <Activity className="w-10 h-10 text-green-500 mb-3" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Excelente!</h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-sm">Nenhum profissional com produção zerada encontrado para os filtros selecionados.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                                {Object.keys(groupedZeros).sort().map(muni => (
                                    <div key={muni} className="border border-red-100 dark:border-red-900/40 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm transition-all hover:shadow-md">
                                        {/* Municipality Header */}
                                        <button 
                                            onClick={() => toggleMunicipality(muni)}
                                            className="w-full flex items-center justify-between p-4 bg-red-50/50 hover:bg-red-50 dark:bg-red-900/10 dark:hover:bg-red-900/20 transition-colors border-b border-red-50 dark:border-red-900/30"
                                        >
                                            <div className="flex items-center gap-2 font-semibold text-red-900 dark:text-red-300 uppercase tracking-widest text-sm">
                                                <MapPin className="w-4 h-4" />
                                                {muni}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="destructive" className="text-xs font-medium">
                                                    {Object.keys(groupedZeros[muni]).reduce((sum, u) => sum + groupedZeros[muni][u].length, 0)} Atribuições
                                                </Badge>
                                                {expandedMunicipalities[muni] ? <ChevronDown className="w-4 h-4 text-red-400" /> : <ChevronRight className="w-4 h-4 text-red-400" />}
                                            </div>
                                        </button>

                                        {/* Units */}
                                        {expandedMunicipalities[muni] && (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800/30 space-y-3">
                                                {Object.keys(groupedZeros[muni]).sort().map(unit => {
                                                    const unitKey = `${muni}-${unit}`;
                                                    const profsInUnit = groupedZeros[muni][unit];

                                                    return (
                                                        <div key={unitKey} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                                                            <button 
                                                                onClick={() => toggleUnit(unitKey)}
                                                                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                    <Building2 className="w-4 h-4 text-gray-400" />
                                                                    {unit}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                     <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">{profsInUnit.length}</span>
                                                                     {expandedUnits[unitKey] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                                                </div>
                                                            </button>
                                                            
                                                            {/* Professionals array */}
                                                            {expandedUnits[unitKey] && (
                                                                <div className="p-3 bg-gray-50/50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                                        {profsInUnit.map((prof: any) => (
                                                                            <div key={prof.id} className="flex flex-col p-3 bg-white dark:bg-gray-800 rounded-lg border border-red-100 dark:border-red-900/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                                                                <div className="absolute top-0 left-0 w-1 h-full bg-red-400 dark:bg-red-600" />
                                                                                
                                                                                <div className="pl-2">
                                                                                    <div className="font-semibold text-sm text-gray-900 dark:text-white truncate" title={prof.name}>
                                                                                        {prof.name}
                                                                                    </div>
                                                                                    
                                                                                    <div className="flex items-center justify-between mt-2">
                                                                                        <div className="flex flex-col gap-1">
                                                                                            <span className="text-[11px] text-gray-500 font-medium">
                                                                                                {prof.cbo || 'Cargo não especificado'}
                                                                                            </span>
                                                                                            {prof.cns && (
                                                                                                <span className="text-[10px] text-gray-400 font-mono">
                                                                                                    CNS: {prof.cns}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        
                                                                                        <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50 text-[10px] px-2 py-0 font-medium shrink-0">
                                                                                            ZERADO
                                                                                        </Badge>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
        )}
        </div>
    );
};

export default ProfessionalPerformanceWidget;
