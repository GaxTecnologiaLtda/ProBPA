import React, { useState, useEffect } from 'react';

import { Card, Button, Badge, Modal, Table, Skeleton } from '../../components/ui/Components';
import {
    CheckCircle, FileText, Users, Filter, ArrowUpRight, FileSpreadsheet,
    Download, BarChart2, PieChart, Activity, Eye, Target, Building2, TrendingUp, Search, X,
    ChevronDown, RefreshCw, Loader2, Calendar
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useDashboardSubsedeData } from './useDashboardSubsedeData';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { susReportService } from '../../services/susReportService';
import { municipalityReportService } from '../../services/municipalityReportService';
import { groupedProfessionalReportService } from '../../services/groupedProfessionalReportService';
import { fetchProfessionalsByEntity } from '../../services/professionalsService';
import { fetchUnitsByEntity } from '../../services/unitsService';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { Professional, Municipality, Unit } from '../../types';
import SubsedeRegisterProduction from './SubsedeRegisterProduction';

// Reusing same mock/structural constants for charts if needed
const COLORS = ['#ea580c', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

type TabType = 'dashboard' | 'reports' | 'register';

interface ReportType {
    id: string;
    title: string;
    desc: string;
    icon: any;
    color: string;
}

const ProductionSubsede: React.FC = () => {
    const { claims } = useAuth();
    
    const currentYearNum = new Date().getFullYear();
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const getDaysInMonth = (year: string, month: string) => {
        if (month === 'all') return [];
        const days = new Date(parseInt(year), parseInt(month), 0).getDate();
        return Array.from({ length: days }, (_, i) => String(i + 1));
    };

    const [selectedYear, setSelectedYear] = useState<string>(currentYearNum.toString());
    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
    const [selectedDay, setSelectedDay] = useState<string>('all');

    // Deriving logical selectedCompetence format (MM/YYYY) for legacy child components
    const selectedCompetence = selectedMonth === 'all' ? '' : `${selectedMonth.padStart(2, '0')}/${selectedYear}`;

    // Reset day if month changes to 'all', or if day exceeds month length
    useEffect(() => {
        if (selectedMonth === 'all') {
            setSelectedDay('all');
        } else {
            const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
            if (selectedDay !== 'all' && !daysInMonth.includes(selectedDay)) {
                setSelectedDay('all');
            }
        }
    }, [selectedYear, selectedMonth]);

    const { production, professionals: dashboardProfessionals, units: dashboardUnits, goals: dashboardGoals, loading: dashboardLoading, syncing, syncData } = useDashboardSubsedeData(selectedYear, selectedMonth, selectedDay);

    const [activeTab, setActiveTab] = useState<TabType>('dashboard');

    // --- View Control ---
    const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const handleOpenReport = (report: ReportType) => {
        setSelectedReport(report);
        setIsReportModalOpen(true);
    };

    // --- State: Relatório Profissional ---
    const [allProfessionals, setAllProfessionals] = useState<Professional[]>([]);
    const [allUnits, setAllUnits] = useState<Unit[]>([]);
    const [allMunicipalities, setAllMunicipalities] = useState<Municipality[]>([]);
    const [fetchedRecords, setFetchedRecords] = useState<any[]>([]);
    const [loadingReport, setLoadingReport] = useState(false);

    const [filterName, setFilterName] = useState('');
    const [filterUnit, setFilterUnit] = useState('');
    const [inputStartDate, setInputStartDate] = useState('');
    const [inputEndDate, setInputEndDate] = useState('');
    const [appliedStartDate, setAppliedStartDate] = useState('');
    const [appliedEndDate, setAppliedEndDate] = useState('');
    const [exportingProfId, setExportingProfId] = useState<string | null>(null);

    const [modalYear, setModalYear] = useState<string>(currentYearNum.toString());
    const [modalMonth, setModalMonth] = useState<string>(String(new Date().getMonth() + 1));
    const [modalDay, setModalDay] = useState<string>('all');
    const [exportGoalFilter, setExportGoalFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('name-asc');
    const [loadingStats, setLoadingStats] = useState(false);
    const [productionStats, setProductionStats] = useState<Record<string, Record<string, number>>>({});
    const latestStatsFetchId = React.useRef(0);
    const [isManagementDataLoaded, setIsManagementDataLoaded] = useState(false);

    const normalize = (str: string) => String(str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Clear filters when modal closes
    useEffect(() => {
        if (!isReportModalOpen) {
            setFilterName('');
            setFilterUnit('');
            setInputStartDate('');
            setInputEndDate('');
            setAppliedStartDate('');
            setAppliedEndDate('');
        }
    }, [isReportModalOpen]);

    // Data Load Effect: Fetch raw details internally only when report opens and requires them
    useEffect(() => {
        const loadManagementData = async () => {
            if (!claims?.entityId || !claims?.municipalityId) return;
            setLoadingReport(true);
            try {
                const [profs, munis, units] = await Promise.all([
                    fetchProfessionalsByEntity(claims.entityId),
                    fetchMunicipalitiesByEntity(claims.entityId),
                    fetchUnitsByEntity(claims.entityId)
                ]);

                setAllProfessionals(profs);
                setAllMunicipalities(munis);
                setAllUnits(units.filter(u => u.municipalityId === claims.municipalityId));
                setIsManagementDataLoaded(true);
            } catch (error) {
                console.error("Error loading subsede report mapping data:", error);
            } finally {
                setLoadingReport(false);
            }
        };

        if (isReportModalOpen && selectedReport?.id === 'profissional') {
            if (!isManagementDataLoaded) {
                loadManagementData();
            }
        }
    }, [isReportModalOpen, selectedReport, claims?.entityId, claims?.municipalityId, isManagementDataLoaded]);


    // Unique Units based on current user's municipality
    const uniqueUnits = React.useMemo(() => {
        return allUnits.map(u => u.name).sort();
    }, [allUnits]);

    // Calculate Production Stats via API
    const fetchProductionStats = async () => {
       if (!claims?.entityId || !modalYear) return;
       
       const fetchId = ++latestStatsFetchId.current;
       setLoadingStats(true);
       try {
          const getStatsFn = httpsCallable(functions, 'getProfessionalProductionStats', { timeout: 540000 });
          
          const apiCompetence = (modalMonth === 'all' || modalMonth === 'custom') ? '' : `${modalMonth.padStart(2, '0')}/${modalYear}`;
          const apiMonth = (modalMonth === 'all' || modalMonth === 'custom') ? undefined : `${modalYear}-${modalMonth.padStart(2, '0')}`;

          const response = await getStatsFn({
             entityId: claims.entityId,
             municipalityId: claims.municipalityId,
             year: modalYear,
             month: apiMonth,
             day: modalDay === 'all' ? undefined : modalDay.padStart(2, '0'),
             competence: apiCompetence || undefined,
             startDate: appliedStartDate,
             endDate: appliedEndDate,
             municipalities: allMunicipalities,
             professionals: allProfessionals.map((p: any) => ({ id: p.id, name: p.name, cns: p.cns || '', cpf: p.cpf || '' })),
             goalFilter: exportGoalFilter,
             goalProcedureCodes: dashboardGoals?.list?.map((g: any) => String(g.procedureCode || '').replace(/\D/g, '')).filter((c: any) => c.length > 0) || []
          });
          
          if (fetchId !== latestStatsFetchId.current) return;
          const stats = response.data as Record<string, Record<string, number>>;
          setProductionStats({...stats});
       } catch (error) {
          console.error("Error fetching stats:", error);
       } finally {
          if (fetchId === latestStatsFetchId.current) setLoadingStats(false);
       }
    };

    useEffect(() => {
       if (isReportModalOpen && isManagementDataLoaded && selectedReport?.id === 'profissional') {
          fetchProductionStats();
       }
    }, [isReportModalOpen, isManagementDataLoaded, modalYear, modalMonth, modalDay, appliedStartDate, appliedEndDate, exportGoalFilter, dashboardGoals]);


    // Filtered Professionals List
    const filteredProfessionals = React.useMemo(() => {
       const filtered = allProfessionals.filter((prof: Professional) => {
          const isInMunicipality = prof.assignments?.some(a => a.municipalityId === claims?.municipalityId);
          if (!isInMunicipality) return false;

          const matchesName = normalize(prof.name).includes(normalize(filterName));
          const matchesUnit = filterUnit
             ? prof.assignments?.some(a => normalize(a.unitName || prof.unitName) === normalize(filterUnit))
             : true;

          let hasProduction = false;
          if (appliedStartDate && appliedEndDate) {
             const addUnitStats = (pId: string): number => {
                if (!productionStats[pId]) return 0;
                let sum = 0;
                Object.values(productionStats[pId]).forEach(val => sum += Number(val));
                return sum;
             };
             let count = addUnitStats(prof.id);
             if (prof.cns) count += addUnitStats(prof.cns) + addUnitStats(`ext_${prof.cns}`) + addUnitStats(`ext_name_${prof.name.replace(/\s/g, '')}`);
             if (prof.cpf) count += addUnitStats(prof.cpf) + addUnitStats(`ext_${prof.cpf}`);
             hasProduction = count > 0;
          } else {
             hasProduction = true;
          }
          const matchesProduction = hasProduction;

          return matchesName && matchesUnit && matchesProduction;
       });

       return [...filtered].sort((a, b) => {
          if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'pt-BR');
          if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'pt-BR');
          return 0;
       });
    }, [allProfessionals, filterName, filterUnit, appliedStartDate, appliedEndDate, productionStats, claims?.municipalityId, sortBy]);

    // Handle Export Professional
    const handleExportProfessional = async (prof: Professional, layout: 'default' | 'grouped' | 'sus' | 'excel_sus' = 'grouped', targetUnitId?: string) => {
      if (!claims?.entityId) return;
      // if (modalMonth === 'all') {
      //    alert('Para exportar o relatório detalhado deste profissional, selecione um Mês de competência específico no filtro deste painel.');
      //    return;
      // }
      
      const apiCompetence = (modalMonth === 'all' || modalMonth === 'custom') ? '' : `${modalMonth.padStart(2, '0')}/${modalYear}`;
      const modalCompetence = modalMonth === 'all' ? '' : modalMonth === 'custom' ? `${appliedStartDate.split('-').reverse().join('/')} até ${appliedEndDate.split('-').reverse().join('/')}` : `${modalMonth.padStart(2, '0')}/${modalYear}`;

      setExportingProfId(`${prof.id}-${targetUnitId || 'all'}`);
      setExportDropdownOpen(null); // Close dropdown

      const getUnitName = () => {
         if (targetUnitId) {
            const unit = allUnits.find(u => u.id === targetUnitId || u.cnes === targetUnitId);
            if (unit) return unit.name;
            const fallback = prof.assignments?.find(a => a.unitId === targetUnitId);
            if (fallback) return fallback.unitName;
         }
         if (filterUnit) return filterUnit;
         if (prof.assignments && prof.assignments.length > 0) {
            const units = Array.from(new Set(prof.assignments.map(a => a.unitName).filter(Boolean)));
            return units.join(', ');
         }
         return prof.unitName || '';
      };

      try {
         // 1. Fetch Entity Name and Logo
         let entityName = claims.entityName || 'Entidade';
         let entityLogoUrl: string | undefined = undefined;
         let entityLogoBase64: string | undefined = undefined;

         let entityData: any = {};

         const entDoc = await getDoc(doc(db, 'entities', claims.entityId));
         if (entDoc.exists()) {
            const data = entDoc.data();
            entityData = data;
            entityName = data.name || data.fantasyName || entityName;
            entityLogoUrl = data.logoUrl;
            entityLogoBase64 = data.logoBase64;
         }

         // 2. Fetch records via Cloud Function
         console.log('[EXPORT] Fetching records via API for prof:', prof.id);

         const isGrouped = selectedReport?.id === 'profissional_agrupado' || layout === 'default';
         const apiName = (layout === 'sus' || !isGrouped) ? 'getProfessionalProductionDetailed' : 'getProfessionalProductionGrouped';

         const getRecordsFn = httpsCallable(functions, apiName, { timeout: 540000 });
         const response = await getRecordsFn({
            entityId: claims.entityId,
            municipalityId: prof.assignments?.[0]?.municipalityId || claims.municipalityId || '', // Depending on where they work
            unitId: targetUnitId,
            competence: apiCompetence,
            year: modalYear,
            startDate: appliedStartDate,
            endDate: appliedEndDate,
            day: modalDay === 'all' ? undefined : modalDay.padStart(2, '0'),
            professionalId: prof.id,
            professionalCns: prof.cns,
            professionalName: prof.name,
            municipalities: allMunicipalities,
            professionals: allProfessionals.map(p => ({ id: p.id, name: p.name, cns: p.cns || '', cpf: p.cpf || '' })),
            goalFilter: exportGoalFilter,
            goalProcedureCodes: dashboardGoals?.list?.map(g => String(g.procedureCode || '').replace(/\D/g, '')).filter(c => c.length > 0)
         });

         let normalizedRecords = response.data as any[];
         
         // NEW: Enrich records with missing documents before generating PDF
         normalizedRecords = await municipalityReportService.enrichMissingManualDocuments(
            normalizedRecords, 
            claims.entityId, 
            allMunicipalities
         );

         if (!normalizedRecords || normalizedRecords.length === 0) {
            alert(`Nenhuma produção encontrada para este profissional nesta competência com o filtro de modalidade atual (${exportGoalFilter === 'pactuados' ? 'Pactuados' : exportGoalFilter === 'nao_pactuados' ? 'Não Pactuados' : 'Global'}).`);
            setExportingProfId(null);
            return;
         }

         console.log('[EXPORT] Fetched API records length after filters:', normalizedRecords.length);

         const displayCompetence = modalCompetence + (exportGoalFilter === 'pactuados' ? ' (Pactuados)' : exportGoalFilter === 'nao_pactuados' ? ' (Não Pactuados)' : '');

         // 3. Generate PDF based on Layout
         if (layout === 'sus') {
            await susReportService.generateSusProductionPdf(
               normalizedRecords,
               {
                  competence: displayCompetence,
                  municipalityName: prof.assignments?.[0]?.municipalityName || 'Município',
                  entityName: entityName,
                  logoUrl: entityLogoUrl,
                  logoBase64: entityLogoBase64,
                  professional: {
                     name: prof.name,
                     cns: prof.cns || '',
                     role: prof.assignments?.[0]?.occupation || prof.occupation || '',
                     cbo: prof.assignments?.[0]?.cbo || prof.cbo || '',
                     unit: (() => {
                        const units = Array.from(new Set(normalizedRecords.map(r => r.unitName).filter(Boolean)));
                        return units.length > 0 ? units.join(', ') : getUnitName();
                     })(),
                     unitCnes: (() => {
                        const uIds = Array.from(new Set(normalizedRecords.map(r => r.unitId).filter(Boolean)));
                        if (uIds.length > 0) {
                           return uIds.map(uId => {
                              const unit = allUnits.find(u => u.id === uId || u.cnes === uId);
                              return unit?.cnes || uId;
                           }).join(', ');
                        }
                        const uI = targetUnitId || prof.assignments?.[0]?.unitId || prof.unitId || '';
                        const u = allUnits.find(u => u.id === uI || u.cnes === uI);
                        return u?.cnes || uI;
                     })()
                  },
                  signatureUrl: prof.signatureUrl,
                  signatureBase64: prof.signatureBase64,
                  // Entity Details for Footer
                  entityAddress: entityData.address,
                  entityPhone: entityData.phone,
                  entityCnpj: entityData.cnpj,
                  entityCity: entityData.location || claims.municipalityName, // Fallback
                  entityResponsible: entityData.responsible
               }
            );
         } else if (selectedReport?.id === 'profissional_agrupado' || layout === 'default') {
            await groupedProfessionalReportService.generateGroupedProfessionalPdf(
               normalizedRecords,
               {
                  competence: displayCompetence || 'Anual',
                  municipalityName: prof.assignments?.[0]?.municipalityName || 'Município',
                  entityName: entityName,
                  logoUrl: entityLogoUrl,
                  logoBase64: entityLogoBase64,
                  signatureUrl: prof.signatureUrl,
                  signatureBase64: prof.signatureBase64,
                  entityAddress: entityData?.address,
                  entityCnpj: entityData?.cnpj,
                  entityCity: entityData?.location || claims?.municipalityName || '',
                  professional: {
                     name: prof.name,
                     cns: prof.cns || '',
                     role: prof.assignments?.[0]?.occupation || prof.occupation || '',
                     unit: (() => {
                        const units = Array.from(new Set(normalizedRecords.map(r => r.unitName).filter(Boolean)));
                        return units.length > 0 ? units.join(', ') : getUnitName();
                     })()
                  }
               }
            );
         } else if (layout === 'excel_sus') {
            await susReportService.generateSusProductionExcel(
               normalizedRecords,
               {
                  competence: displayCompetence,
                  municipalityName: prof.assignments?.[0]?.municipalityName || 'Município',
                  entityName: entityName,
                  professional: {
                     name: prof.name,
                     cns: prof.cns || '',
                     role: prof.assignments?.[0]?.occupation || prof.occupation || '',
                     cbo: prof.assignments?.[0]?.cbo || prof.cbo || '',
                     unit: (() => {
                        const units = Array.from(new Set(normalizedRecords.map(r => r.unitName).filter(Boolean)));
                        return units.length > 0 ? units.join(', ') : getUnitName();
                     })(),
                     unitCnes: (() => {
                        const uIds = Array.from(new Set(normalizedRecords.map(r => r.unitId).filter(Boolean)));
                        if (uIds.length > 0) {
                           return uIds.map(uId => {
                              const unit = allUnits.find(u => u.id === uId || u.cnes === uId);
                              return unit?.cnes || uId;
                           }).join(', ');
                        }
                        const uI = targetUnitId || prof.assignments?.[0]?.unitId || prof.unitId || '';
                        const u = allUnits.find(u => u.id === uI || u.cnes === uI);
                        return u?.cnes || uI;
                     })()
                  }
               }
            );
         } else {
            // Default Detailed (fallback)
            await municipalityReportService.generateProfessionalProductionPdf(
               normalizedRecords,
               {
                  competence: displayCompetence,
                  municipalityName: prof.assignments?.[0]?.municipalityName || 'Município',
                  entityName: entityName,
                  logoUrl: entityLogoUrl,
                  logoBase64: entityLogoBase64,
                  signatureUrl: prof.signatureUrl,
                  signatureBase64: prof.signatureBase64,
                  entityAddress: entityData?.address,
                  entityCnpj: entityData?.cnpj,
                  entityCity: entityData?.location || claims?.municipalityName || '',
                  professional: {
                     name: prof.name,
                     cns: prof.cns || '',
                     role: prof.assignments?.[0]?.occupation || prof.occupation || '',
                     unit: (() => {
                        const units = Array.from(new Set(normalizedRecords.map(r => r.unitName).filter(Boolean)));
                        return units.length > 0 ? units.join(', ') : getUnitName();
                     })()
                  }
               }
            );
         }

      } catch (error) {
         console.error("Error exporting professional report:", error);
         alert("Erro ao exportar relatório.");
      } finally {
         setExportingProfId(null);
      }
   };


    // --- Renderers ---
    const renderDashboard = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card className="p-5 border-l-4 border-orange-500">
                    <div className="text-sm text-gray-500 font-medium">Produção Pactuada (Qtd)</div>
                    <div className="mt-2">
                        {dashboardLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {production.total.toLocaleString('pt-BR')}
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-5 border-l-4 border-gray-400">
                    <div className="text-sm text-gray-500 font-medium">Produção Não Pactuada</div>
                    <div className="mt-2">
                        {dashboardLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {(production.totalNonPactuated || 0).toLocaleString('pt-BR')}
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2 font-medium">Extra-teto</div>
                </Card>

                <Card className="p-5 border-l-4 border-amber-500">
                    <div className="text-sm text-gray-500 font-medium">Eficiência de Metas (Local)</div>
                    <div className="mt-2">
                        {dashboardLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {dashboardGoals.value}
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Média da Unidade Local</div>
                </Card>

                <Card className="p-5 border-l-4 border-emerald-500">
                    <div className="text-sm text-gray-500 font-medium">Unidades Monitoradas</div>
                    <div className="mt-2">
                        {dashboardLoading ? (
                            <Skeleton className="h-8 w-12" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {dashboardUnits?.value || 0}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center mt-2 text-sm text-emerald-600 font-medium">
                        <Building2 className="w-4 h-4 mr-1" /> Lançamentos no Município
                    </div>
                </Card>

                <Card className="p-5 border-l-4 border-indigo-500">
                    <div className="text-sm text-gray-500 font-medium">Profissionais Ativos</div>
                    <div className="mt-2">
                        {dashboardLoading ? (
                            <Skeleton className="h-8 w-12" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {dashboardProfessionals.value}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center mt-2 text-sm text-indigo-600 font-medium">
                        <Users className="w-4 h-4 mr-1" /> Na competência
                    </div>
                </Card>
            </div>

            {/* Gráficos Principais */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2 text-orange-600" />
                            Evolução Temporal da Produção Local
                        </h3>
                    </div>
                    <div className="h-[300px]">
                        {dashboardLoading ? (
                            <Skeleton className="w-full h-full rounded-lg" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={production.chartData}>
                                    <defs>
                                        <linearGradient id="colorProdLocal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="procedures" name="Produção Local" stroke="#ea580c" fillOpacity={1} fill="url(#colorProdLocal)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Procedimentos</h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                        {dashboardLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="flex flex-col gap-2">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-8" />
                                    </div>
                                    <Skeleton className="h-1.5 w-full" />
                                </div>
                            ))
                        ) : (
                            <>
                                {production.topProcedures?.map((proc, idx) => (
                                    <div key={idx} className="relative pt-1 p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors group">
                                        <div className="flex mb-1 items-center justify-between">
                                            <div className="flex items-center overflow-hidden">
                                                <span className="text-xs font-semibold inline-block py-0.5 px-2 uppercase rounded-full text-orange-700 bg-orange-100 dark:bg-orange-900 dark:text-orange-300 mr-2 flex-shrink-0 group-hover:bg-orange-200">
                                                    #{idx + 1}
                                                </span>
                                                <span className="font-medium text-sm text-gray-700 dark:text-gray-200 truncate" title={proc.name}>
                                                    {proc.name}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-gray-900 dark:text-white ml-2 flex-shrink-0">
                                                {proc.value}
                                            </span>
                                        </div>
                                        <div className="overflow-hidden h-1.5 mb-2 text-xs flex rounded bg-gray-100 dark:bg-gray-700">
                                            <div style={{ width: `${(proc.value / (production.topProcedures[0]?.value || 1)) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-500"></div>
                                        </div>
                                    </div>
                                ))}
                                {(!production.topProcedures || production.topProcedures.length === 0) && (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        Nenhum dado de procedimento disponível.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {(dashboardProfessionals.value > 0 || dashboardLoading) && (
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Detalhes de Performance
                        </h3>
                        <Button variant="outline" className="text-xs" onClick={() => setActiveTab('reports')}>
                            Explorar Relatórios Locais
                        </Button>
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 text-center">
                        <p className="text-sm text-gray-500 mb-4 flex justify-center items-center gap-2">
                            Acompanhe informações detalhadas usando os relatórios da sua sub-sede abaixo.
                        </p>
                        <Button onClick={() => setActiveTab('reports')} variant="secondary">
                            Ver Relatórios
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );

    const renderReports = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {[
                { id: 'metas', title: 'Apoio às Metas', desc: 'Acompanhamento se as unidades e equipes atingiram a meta diária e mensal.', icon: Target, color: 'text-orange-600' },
                { id: 'profissional', title: 'Lançamentos da Equipe', desc: 'Produção detalhada pelos profissionais alocados no seu município.', icon: Users, color: 'text-emerald-600' },
                { id: 'unidades', title: 'Produtividade de Unidades', desc: 'Análise de desempenho e faturamento das unidades geridas.', icon: Building2, color: 'text-indigo-600' },
                { id: 'procedimentos', title: 'Curva de Procedimentos', desc: 'Identifique os serviços mais demandados pela população local.', icon: BarChart2, color: 'text-amber-500' }
            ].map((rep, idx) => {
                const Icon = rep.icon;
                return (
                    <Card key={idx} className="p-6 flex flex-col justify-between hover:border-orange-200 transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700">
                        <div className="opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className={`p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 w-fit mb-4 ${rep.color}`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{rep.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{rep.desc}</p>
                        </div>
                        <div className="flex gap-2 mt-auto">
                            <Button
                                variant="outline"
                                className="flex-1 text-xs"
                                onClick={() => handleOpenReport(rep)}
                            >
                                <Eye className="w-3 h-3 mr-2 text-gray-500" /> Consultar
                            </Button>
                        </div>
                    </Card>
                )
            })}
        </div>
    );

    const [exportDropdownOpen, setExportDropdownOpen] = useState<string | null>(null);

    const renderReportModalContent = () => {
        if (!selectedReport) return null;

        if (selectedReport?.id === 'profissional') {
            return (
               <div className="space-y-6">
                  {/* Filter Toolbar */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                     
                     {/* Local Competence Toolbar for this Modal */}
                     <div className="flex flex-col sm:flex-row gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                           <div className={`relative transition-all duration-200 ${modalMonth === 'custom' ? 'hidden' : 'block'}`}>
                              <Calendar className="w-4 h-4 absolute left-2.5 top-2.5 text-blue-500" />
                              <select
                                 value={modalYear}
                                 onChange={(e) => setModalYear(e.target.value)}
                                 className="pl-8 pr-8 py-2 border rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium text-sm border-blue-200 dark:border-blue-800 outline-none focus:ring-2 focus:ring-blue-500 h-9"
                              >
                                 {Array.from({ length: 5 }, (_, i) => String(currentYearNum - i)).map(y => (
                                    <option key={y} value={y}>Ano {y}</option>
                                 ))}
                              </select>
                           </div>
                           <select
                              value={modalMonth}
                              onChange={(e) => {
                                 setModalMonth(e.target.value);
                                 setModalDay('all');
                              }}
                              className="pl-3 pr-8 py-2 border rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 h-9"
                           >
                               <option value="all">Todos os Meses</option>
                               <option value="custom">Período Personalizado</option>
                               {monthNames.map((m, i) => (
                                  <option key={i + 1} value={String(i + 1)}>{m}</option>
                               ))}
                           </select>
                           <select
                              value={modalDay}
                              onChange={(e) => setModalDay(e.target.value)}
                              disabled={modalMonth === 'all' || modalMonth === 'custom'}
                              className={`pl-3 pr-8 py-2 border rounded text-sm outline-none focus:ring-2 disabled:opacity-50 h-9 transition-colors
                                 ${modalMonth === 'custom' ? 'hidden' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 focus:ring-blue-500 disabled:cursor-not-allowed'}`}
                           >
                              <option value="all">Dias</option>
                              {modalMonth !== 'all' && modalMonth !== 'custom' && getDaysInMonth(modalYear || String(currentYearNum), modalMonth).map((d: string) => (
                                 <option key={d} value={d}>{d}</option>
                              ))}
                           </select>

                           {modalMonth === 'custom' && (
                              <div className="flex items-center gap-1 w-full sm:w-auto mt-2 sm:mt-0 animate-fade-in">
                                 <input
                                    type="date"
                                    className="w-full sm:w-auto px-3 py-2 border rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 h-9"
                                    value={inputStartDate}
                                    onChange={(e) => setInputStartDate(e.target.value)}
                                    title="Data Inicial"
                                 />
                                 <span className="text-gray-400 text-xs px-1">até</span>
                                 <input
                                    type="date"
                                    className="w-full sm:w-auto px-3 py-2 border rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 h-9"
                                    value={inputEndDate}
                                    onChange={(e) => setInputEndDate(e.target.value)}
                                    title="Data Final"
                                    min={inputStartDate}
                                 />
                                 <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 ml-1"
                                    onClick={() => {
                                       setAppliedStartDate(inputStartDate);
                                       setAppliedEndDate(inputEndDate);
                                    }}
                                    disabled={!inputStartDate && !inputEndDate}
                                 >
                                    <Filter className="w-4 h-4 mr-1" /> Aplicar
                                 </Button>
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="flex flex-col md:flex-row gap-3">
                        
                        <div className="md:w-1/5">
                           <label className="text-xs text-gray-500 mb-1 block">Unidade</label>
                           <select
                              value={filterUnit}
                              onChange={(e) => setFilterUnit(e.target.value)}
                              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                           >
                              <option value="">Todas as Unidades</option>
                              {uniqueUnits.map(u => (
                                 <option key={u} value={u}>{u}</option>
                              ))}
                           </select>
                        </div>
                        <div className="md:w-1/5">
                           <label className="text-xs text-gray-500 mb-1 block">Ordenar por</label>
                           <select
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value)}
                              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                           >
                              <option value="name-asc">Ordem Alfabética (A-Z)</option>
                              <option value="name-desc">Ordem Alfabética (Z-A)</option>
                              <option value="date-desc">Cadastro Mais Recente</option>
                              <option value="date-asc">Cadastro Mais Antigo</option>
                              <option value="no-signature">Sem Assinatura Primeiro</option>
                           </select>
                        </div>
                        <div className="flex-1">
                           <label className="text-xs text-gray-500 mb-1 block">Profissional</label>
                           <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                              <input
                                 type="text"
                                 placeholder="Filtrar por nome ou CNS..."
                                 value={filterName}
                                 onChange={(e) => setFilterName(e.target.value)}
                                 className="pl-9 w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700"
                              />
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-col xl:flex-row gap-3 pt-2 border-t border-gray-100 dark:border-gray-700 items-start xl:items-center justify-between mt-2">
                        {/* Modalidade de Faturamento Mestre */}
                        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-1.5 rounded border border-emerald-100 dark:border-emerald-800/50">
                           <label className="text-xs font-medium text-emerald-800 dark:text-emerald-200 uppercase shrink-0">Modalidade de Relatório:</label>
                           <select
                              value={exportGoalFilter}
                              onChange={(e) => setExportGoalFilter(e.target.value)}
                              className="bg-transparent border-none text-sm font-semibold text-emerald-900 dark:text-emerald-100 focus:ring-0 cursor-pointer outline-none"
                           >
                              <option value="all">Global (Todos os Procedimentos)</option>
                              <option value="pactuados">Apenas Procedimentos Pactuados (Metas Ativas)</option>
                              <option value="nao_pactuados">Apenas Procedimentos Não Pactuados</option>
                           </select>
                        </div>
                     </div>
                  </div>
                  {loadingReport ? (
                     <div className="flex flex-col justify-center items-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Carregando Informações...</h3>
                        <p className="text-sm text-gray-500 mt-1">Aguarde enquanto os dados são agregados.</p>
                     </div>
                  ) : (
                     <Table headers={['Profissional', 'Lotação (Principal)', 'Procedimentos', 'Ações']} wrapperClassName="pb-32 min-h-[250px]">
                        {filteredProfessionals.flatMap((prof) => {
                           const getProfUnitCount = (uId: string) => {
                              let c = 0;
                              const ids = [prof.id];
                              if (prof.cns) ids.push(prof.cns, `ext_${prof.cns}`, `ext_name_${prof.name.replace(/\s/g, '')}`);
                              if (prof.cpf) ids.push(prof.cpf, `ext_${prof.cpf}`);
                              for (const pId of ids) {
                                 if (productionStats[pId] && productionStats[pId][uId]) {
                                    c += productionStats[pId][uId];
                                 }
                              }
                              return c;
                           };

                           const unitSet = new Set<string>();
                           const ids = [prof.id];
                           if (prof.cns) ids.push(prof.cns, `ext_${prof.cns}`, `ext_name_${prof.name.replace(/\s/g, '')}`);
                           if (prof.cpf) ids.push(prof.cpf, `ext_${prof.cpf}`);
                           for (const pId of ids) {
                              if (productionStats[pId]) {
                                 Object.keys(productionStats[pId]).forEach(uId => unitSet.add(uId));
                              }
                           }

                           let displayUnits = Array.from(unitSet);
                           if (displayUnits.length === 0) {
                              displayUnits = [prof.assignments?.[0]?.unitId || prof.unitId || 'unknown'];
                           }

                           return displayUnits.map((unitId) => {
                              let resolvedUnitName = 'Sem Lotação';
                              let resolvedMuniName = '';

                              const foundUnit = allUnits.find(u => u.id === unitId || u.cnes === unitId);
                              if (foundUnit) {
                                 resolvedUnitName = foundUnit.name;
                                 resolvedMuniName = allMunicipalities.find(m => m.id === foundUnit.municipalityId)?.name || '';
                              } else {
                                 const assignment = prof.assignments?.find(a => a.unitId === unitId);
                                 if (assignment) {
                                    resolvedUnitName = assignment.unitName || 'Sem Lotação';
                                    resolvedMuniName = assignment.municipalityName || '';
                                 } else if (unitId === 'unknown') {
                                    resolvedUnitName = prof.assignments?.[0]?.unitName || prof.unitName || 'Sem Lotação';
                                    resolvedMuniName = prof.assignments?.[0]?.municipalityName || '';
                                 }
                              }

                              if (filterUnit && normalize(resolvedUnitName) !== normalize(filterUnit)) {
                                 return null;
                              }


                              const rowKey = `${prof.id}-${unitId}`;
                              const statCount = getProfUnitCount(unitId);

                              return (
                                 <tr key={rowKey} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                       <div>
                                          {prof.name}
                                          <span className="block text-xs text-gray-500 font-mono">CNS: {prof.cns}</span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                       {resolvedUnitName}
                                       {resolvedMuniName && ` (${resolvedMuniName})`}
                                    </td>
                                    <td className="px-6 py-4 font-mono">
                                       {loadingStats ? (
                                          <div className="flex items-center gap-2 text-gray-400">
                                             <Activity className="w-4 h-4 animate-spin" />
                                             <span className="text-xs">Calculando...</span>
                                          </div>
                                       ) : (
                                          <Badge type="neutral" className="font-mono">
                                             {statCount}
                                          </Badge>
                                       )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <div className="flex items-center justify-end gap-2">
                                          <div className="relative border-r border-gray-100 dark:border-gray-700/50 pr-2">
                                             {selectedReport?.id === 'profissional_agrupado' ? (
                                                <Button
                                                   size="sm"
                                                   variant="outline"
                                                   className="h-8 text-xs gap-1"
                                                   onClick={() => handleExportProfessional(prof, 'sus')}
                                                   disabled={exportingProfId === rowKey}
                                                >
                                                   {exportingProfId === rowKey ? <Activity className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                                   Gerar PDF
                                                </Button>
                                             ) : (
                                                <>
                                                   <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="h-8 text-xs gap-1 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                                      onClick={() => setExportDropdownOpen(exportDropdownOpen === rowKey ? null : rowKey)}
                                                      disabled={exportingProfId === rowKey}
                                                   >
                                                      {exportingProfId === rowKey ? <Activity className="w-3 h-3 animate-spin" /> : <Building2 className="w-3 h-3" />}
                                                      Boletim BPA
                                                      <ChevronDown className="w-3 h-3 ml-1" />
                                                   </Button>
                                                   {exportDropdownOpen === rowKey && (
                                                      <>
                                                         <div className="fixed inset-0 z-10" onClick={() => setExportDropdownOpen(null)} />
                                                         <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-20 py-1">
                                                            <button
                                                               onClick={() => { handleExportProfessional(prof, 'sus'); setExportDropdownOpen(null); }}
                                                               className="w-full text-left px-4 py-2 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                            >
                                                               <FileText className="w-3 h-3 text-red-500" />
                                                               Gerar em PDF
                                                            </button>
                                                            <button
                                                               onClick={() => { handleExportProfessional(prof, 'sus'); setExportDropdownOpen(null); }}
                                                               className="w-full text-left px-4 py-2 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                            >
                                                               <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                                                               Exportar em Excel
                                                            </button>
                                                         </div>
                                                      </>
                                                   )}
                                                </>
                                             )}
                                          </div>
                                          
                                       </div>
                                    </td>
                                 </tr>
                              );
                           });
                        })}
                        {filteredProfessionals.length === 0 && (
                           <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                 Nenhum profissional encontrado com os filtros selecionados.
                              </td>
                           </tr>
                        )}
                     </Table>
                  )}
               </div>
            );
         }

        // For now, other reports will share similar structural mock to show they're read-only views
        return (
            <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Relatório em Construção Especializada</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                    As visualizações específicas dos relatórios locais detalhados para o perfil de {selectedReport.title} estão sendo preparadas para integração.
                </p>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
            <div className={`space-y-6 transition-all duration-300 ${dashboardLoading ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center">
                        <Activity className="w-8 h-8 text-orange-600 mr-3" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Acompanhamento e Produção</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie a produção ambulatorial do seu município</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <button
                            onClick={syncData}
                            disabled={syncing || dashboardLoading}
                            className={`flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm outline-none transition-colors 
                ${(syncing || dashboardLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-orange-600 dark:hover:text-orange-400 focus:ring-2 focus:ring-orange-500'}`}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${(syncing) ? 'animate-spin' : ''}`} />
                            {syncing ? 'Sincronizando...' : 'Atualizar Dados'}
                        </button>
                        
                        <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
                            {/* Year Selector */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 flex items-center shadow-sm h-[38px] w-full sm:w-auto">
                                <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-500 mr-2 flex-shrink-0" />
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 py-0.5 cursor-pointer outline-none min-w-[70px]"
                                >
                                    <option value={currentYearNum.toString()}>Ano {currentYearNum}</option>
                                    <option value={(currentYearNum - 1).toString()}>Ano {currentYearNum - 1}</option>
                                    <option value={(currentYearNum - 2).toString()}>Ano {currentYearNum - 2}</option>
                                </select>
                            </div>

                            {/* Month Selector */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 flex items-center shadow-sm h-[38px] w-full sm:w-auto">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 py-0.5 cursor-pointer outline-none min-w-[100px]"
                                >
                                    <option value="all">Todos os Meses</option>
                                    {monthNames.map((monthName, index) => (
                                        <option key={index + 1} value={String(index + 1)}>{monthName}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Day Selector */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 flex items-center shadow-sm h-[38px] w-full sm:w-auto">
                                <select
                                    value={selectedDay}
                                    onChange={(e) => setSelectedDay(e.target.value)}
                                    disabled={selectedMonth === 'all'}
                                    className="text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 py-0.5 cursor-pointer outline-none min-w-[60px] disabled:opacity-50"
                                >
                                    <option value="all">Dias</option>
                                    {getDaysInMonth(selectedYear, selectedMonth).map((day) => (
                                        <option key={day} value={day}>Dia {day}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">

                    <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                        <button
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'dashboard' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm' : 'text-gray-600 hover:text-orange-600 dark:text-gray-400'}`}
                            onClick={() => setActiveTab('dashboard')}
                        >
                            Painel Resumo
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'reports' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm' : 'text-gray-600 hover:text-orange-600 dark:text-gray-400'}`}
                            onClick={() => setActiveTab('reports')}
                        >
                            Painel de Monitoramento
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'register' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm' : 'text-gray-600 hover:text-orange-600 dark:text-gray-400'}`}
                            onClick={() => setActiveTab('register')}
                        >
                            Lançamento de Produção
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                {activeTab === 'dashboard' ? renderDashboard() : activeTab === 'reports' ? renderReports() : <SubsedeRegisterProduction />}
            </div>

            <Modal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                title={selectedReport?.title || 'Relatório'}
                className={selectedReport?.id === 'profissional' ? 'max-w-[95vw]' : 'max-w-5xl'}
            >
                {renderReportModalContent()}
            </Modal>
        </div>
    );
};

export default ProductionSubsede;
