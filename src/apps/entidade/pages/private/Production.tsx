import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Modal, Input, Select, Table, Skeleton } from '../../components/ui/Components';
import {
   CheckCircle, FileText, Users, Filter, ArrowUpRight,
   Download, BarChart2, PieChart, AlertTriangle, FileCode, Database,
   Calendar, ChevronRight, TrendingUp, Activity, Eye, Target, Building2, DollarSign, FileSignature, Search, X,
   Loader2, Upload, ChevronDown, PlusCircle, MapPin, FileSpreadsheet
} from 'lucide-react';
import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
   Legend, LineChart, Line, PieChart as RechartsPieChart, Cell, AreaChart, Area, Pie,
   ComposedChart, Scatter
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { fetchProfessionalsByEntity, updateProfessional } from '../../services/professionalsService';
import { municipalityReportService } from '../../services/municipalityReportService';
import { susReportService } from '../../services/susReportService';
import { groupedProfessionalReportService } from '../../services/groupedProfessionalReportService';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { fetchUnitsByEntity } from '../../services/unitsService';
import { Professional, Municipality, Unit } from '../../types';
import { collection, doc, getDocs, getDoc, query, where, writeBatch, orderBy, limit, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { goalService } from '../../services/goalService';
import ConnectorDashboard from './ConnectorDashboard';
import GlobalRegisterProduction from './GlobalRegisterProduction';
import GlobalProductionHistory from './GlobalProductionHistory';
import { useEntityData } from '../../hooks/useEntityData';

import { useDashboardData } from './useDashboardData';
import { UnitComparativeReport } from '../../components/reports/UnitComparativeReport';
import { CboMunicipalReport } from '../../components/reports/CboMunicipalReport';
import { GoalsFulfillmentReport } from '../../components/reports/GoalsFulfillmentReport';
import { FinancialEvolutionReport } from '../../components/reports/FinancialEvolutionReport';
import { ProfessionalPerformanceWidget } from '../../components/reports/ProfessionalPerformanceWidget';

// ... (keep imports)

// --- Mock Data para Gráficos e Relatórios (Mantidos para a aba Relatórios) ---

const EVOLUTION_DATA = [
   { month: 'Jan', real: 12400, meta: 12000, valor: 124000 },
   { month: 'Fev', real: 13100, meta: 12000, valor: 131000 },
   { month: 'Mar', real: 11500, meta: 12500, valor: 115000 },
   { month: 'Abr', real: 14200, meta: 13000, valor: 142000 },
   { month: 'Mai', real: 15800, meta: 13000, valor: 158000 },
   { month: 'Jun', real: 14900, meta: 13500, valor: 149000 },
   { month: 'Jul', real: 16100, meta: 14000, valor: 161000 },
];

const TOP_PROCEDURES = [
   { name: 'Consulta em Atenção Básica', qtd: 4500, val: 45000 },
   { name: 'Aferição de Pressão Arterial', qtd: 3200, val: 0 },
   { name: 'Glicemia Capilar', qtd: 2800, val: 5600 },
   { name: 'Visita Domiciliar (Nível Médio)', qtd: 1200, val: 0 },
   { name: 'Atendimento de Urgência', qtd: 850, val: 12500 },
   { name: 'Curativo Grau II', qtd: 600, val: 3000 },
   { name: 'Admin. de Medicamentos', qtd: 550, val: 1200 },
];

const DEMOGRAPHICS_AGE = [
   { name: '0-12 anos', value: 15 },
   { name: '13-19 anos', value: 10 },
   { name: '20-59 anos', value: 45 },
   { name: '60+ anos', value: 30 },
];

const DEMOGRAPHICS_SEX = [
   { name: 'Feminino', value: 58 },
   { name: 'Masculino', value: 42 },
];

const PROFESSIONAL_RANKING = [
   { id: 1, name: 'Dr. Carlos Silva', role: 'Médico Clínico', unit: 'UBS Central', qtd: 450, meta: 98, val: 4500 },
   { id: 2, name: 'Enf. Maria Souza', role: 'Enfermeira', unit: 'UBS Central', qtd: 320, meta: 110, val: 0 },
   { id: 3, name: 'Dr. Pedro Álvares', role: 'Cirurgião', unit: 'Hosp. Municipal', qtd: 120, meta: 85, val: 12000 },
   { id: 4, name: 'Tec. Ana Lima', role: 'Técnico Enf.', unit: 'PSF Vila Nova', qtd: 890, meta: 100, val: 0 },
   { id: 5, name: 'Dra. Júlia Roberts', role: 'Dentista', unit: 'CEO Municipal', qtd: 210, meta: 92, val: 8500 },
];

const UNIT_COMPARISON = [
   { name: 'UBS Central', producao: 15400, faturamento: 45000 },
   { name: 'Hosp. Municipal', producao: 8200, faturamento: 125000 },
   { name: 'PSF Vila Nova', producao: 5600, faturamento: 12000 },
   { name: 'UPA 24h', producao: 12100, faturamento: 89000 },
   { name: 'CEO Centro', producao: 2100, faturamento: 35000 },
];

const META_VS_REAL_BY_GROUP = [
   { group: 'Atenção Básica', meta: 100, real: 98 },
   { group: 'Média Complexidade', meta: 100, real: 85 },
   { group: 'Cirurgias', meta: 100, real: 60 },
   { group: 'Odontologia', meta: 100, real: 92 },
   { group: 'Vigilância', meta: 100, real: 110 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type TabType = 'dashboard' | 'reports' | 'connector' | 'lancamento' | 'history';

interface ReportType {
   id: string;
   title: string;
   desc: string;
   icon: any;
   color: string;
}

const Production: React.FC = () => {
   const { claims } = useAuth();
   const isCoordenacao = !!claims?.coordenation || claims?.role === 'COORDENAÇÃO';
   const { entity } = useEntityData(claims?.entityId);
   const [activeTab, setActiveTab] = useState<TabType>('dashboard');

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

   // Defaulting to current month dynamically
   const [selectedYear, setSelectedYear] = useState<string>(currentYearNum.toString());
   const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
   const [selectedDay, setSelectedDay] = useState<string>('all');
   const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');

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

   const { production, professionals: dashboardProfessionals, municipalities: dashboardMunicipalities, goals: dashboardGoals, loading: dashboardLoading, rawRecords } = useDashboardData(selectedYear, selectedMonth, selectedDay, selectedMunicipality);


   // --- Procedure Breakdown Modal State ---
   const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
   const [isProcedureModalOpen, setIsProcedureModalOpen] = useState(false);
   const [isExportingBatch, setIsExportingBatch] = useState(false);

   const handleProcedureClick = (procName: string) => {
      setSelectedProcedure(procName);
      setIsProcedureModalOpen(true);
   };

   // Helper to get breakdown data for selected procedure
   const getProcedureBreakdown = () => {
      // Safety check: ensure rawRecords is an array and selectedProcedure is valid
      if (!selectedProcedure || !rawRecords || !Array.isArray(rawRecords)) return [];

      const records = rawRecords.filter((r: any) => {
         const rName = r.procedureName || `Código: ${r.procedureCode}`;
         return rName === selectedProcedure;
      });

      // Aggregate by Professional
      const agg: Record<string, { quantity: number, unit: string }> = {};
      records.forEach((r: any) => {
         const profName = r.professionalName || 'Não Identificado';
         const unitName = r.unitId ? (allUnits.find(u => u.cnes === r.unitId || u.id === r.unitId)?.name || r.unitId) : 'N/A';

         if (!agg[profName]) {
            agg[profName] = { quantity: 0, unit: unitName };
         }
         agg[profName].quantity += (Number(r.quantity) || 1);
      });

      return Object.entries(agg)
         .map(([name, data]) => ({ name, ...data }))
         .sort((a, b) => b.quantity - a.quantity);
   };



   // Function not needed anymore for competenceOptions, but we keep the structure inside map in the JSX

   // Estado para Relatórios
   const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
   const [isReportModalOpen, setIsReportModalOpen] = useState(false);

   // Estado Real para Relatório Profissional
   const [professionals, setProfessionals] = useState<Professional[]>([]);
   const [productionStats, setProductionStats] = useState<Record<string, Record<string, number>>>({});
   const [loadingReport, setLoadingReport] = useState(false);

   // Independent Modal Filters
   const [modalYear, setModalYear] = useState<string>('');
   const [modalMonth, setModalMonth] = useState<string>('');
   const [modalDay, setModalDay] = useState<string>('all');

   // States for Filter Options
   const [allMunicipalities, setAllMunicipalities] = useState<Municipality[]>([]);
   const [allUnits, setAllUnits] = useState<Unit[]>([]);

   // Helper for normalizing strings
   const normalize = (str: string) => String(str || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
   const [loadingStats, setLoadingStats] = useState(false);

   // --- Filters ---
   const [filterName, setFilterName] = useState('');
   const [filterMunicipality, setFilterMunicipality] = useState('');
   const [filterUnit, setFilterUnit] = useState('');

   // Export Filters
   const [exportGoalFilter, setExportGoalFilter] = useState<'all' | 'pactuados' | 'nao_pactuados'>('all');
   const [municipalityGoals, setMunicipalityGoals] = useState<any[]>([]);

   useEffect(() => {
      const fetchGoals = async () => {
         if (!claims?.entityId) return;
         try {
            // Se houver um filterMunicipality setado (que é o NOME), resolvemos o ID correspondente
            let targetMuniId = undefined;
            if (filterMunicipality) {
               const found = allMunicipalities.find(m => normalize(m.name) === normalize(filterMunicipality));
               if (found) targetMuniId = found.id;
            }

            const goals = await goalService.getGoalsForMunicipalityPublic(claims, targetMuniId);
            setMunicipalityGoals(goals);
         } catch (error) {
            console.error("Error fetching goals for production filter:", error);
         }
      };
      
      if (selectedReport?.id?.includes('profissional')) {
         fetchGoals();
      }
   }, [claims, filterMunicipality, selectedReport, allMunicipalities]);

   // Date Filter State: Input (what user types) vs Applied (what filters data)
   const [inputStartDate, setInputStartDate] = useState('');
   const [inputEndDate, setInputEndDate] = useState('');
   const [appliedStartDate, setAppliedStartDate] = useState('');
   const [appliedEndDate, setAppliedEndDate] = useState('');

   const displayCompetenceText = modalMonth === 'all' 
      ? `Ano Inteiro (${modalYear})` 
      : modalMonth === 'custom' 
         ? (appliedStartDate && appliedEndDate ? `${appliedStartDate.split('-').reverse().join('/')} até ${appliedEndDate.split('-').reverse().join('/')}` : 'Período Personalizado')
         : `${modalMonth.padStart(2, '0')}/${modalYear}`;


   // Data State
   const [fetchedRecords, setFetchedRecords] = useState<any[]>([]); // Store raw fetched records
   const [isManagementDataLoaded, setIsManagementDataLoaded] = useState(false);

   // Filtered Professionals
   const latestStatsFetchId = React.useRef(0);

   const filteredProfessionals = React.useMemo(() => {
      return professionals.filter(prof => {
         const matchesName = normalize(prof.name).includes(normalize(filterName));

         // Check if ANY assignment matches the municipality filter
         const matchesMunicipality = filterMunicipality
            ? prof.assignments?.some(a => normalize(a.municipalityName || prof.municipality) === normalize(filterMunicipality))
            : true;

         // Check if ANY assignment matches the unit filter
         const matchesUnit = filterUnit
            ? prof.assignments?.some(a => normalize(a.unitName || prof.unitName) === normalize(filterUnit))
            : true;

         // Check if has production in filtered range (if date filter is applied)
         // Only filter by production presence if a date filter is explicitly applied.
         // This ensures that when browsing the full competence (no date filter), we see all professionals (even those with 0).
         // But when drilling down to a date range, we likely only care about those who produced.
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

         return matchesName && matchesMunicipality && matchesUnit && matchesProduction;
      });
   }, [professionals, filterName, filterMunicipality, filterUnit, appliedStartDate, appliedEndDate, productionStats]);

   // Derive unique options for Selects - Using Fetched Data
   const uniqueMunicipalities = React.useMemo(() => {
      return allMunicipalities.map(m => m.name).sort();
   }, [allMunicipalities]);

   const uniqueUnits = React.useMemo(() => {
      let filteredUnits = allUnits;
      if (filterMunicipality) {
         // Find ID of selected municipality
         const selectedMuni = allMunicipalities.find(m => m.name === filterMunicipality);
         if (selectedMuni) {
            filteredUnits = allUnits.filter(u => u.municipalityId === selectedMuni.id);
         } else {
            filteredUnits = [];
         }
      }
      return Array.from(new Set(filteredUnits.map(u => u.name.trim()))).sort();
   }, [allUnits, allMunicipalities, filterMunicipality]);



   // Reset filters when modal closes or changes
   useEffect(() => {
      if (!isReportModalOpen) {
         setFilterName('');
         setFilterMunicipality('');
         setFilterUnit('');
         setInputStartDate('');
         setInputEndDate('');
         setAppliedStartDate('');
         setAppliedEndDate('');
         setIsManagementDataLoaded(false);
      }
   }, [isReportModalOpen]);

   // Carregar dados quando o modal abrir, for o relatório correto, ou se estiver na aba do conector
   useEffect(() => {
      console.log('[PRODUCTION_REPORT] useEffect triggered!');
      console.log('- isReportModalOpen:', isReportModalOpen);
      console.log('- selectedReport?.id:', selectedReport?.id);
      console.log('- activeTab:', activeTab);
      console.log('- claims?.entityId:', claims?.entityId);

      const isReportNeedsData = isReportModalOpen && (selectedReport?.id === 'profissional' || selectedReport?.id === 'profissional_agrupado' || selectedReport?.id === 'unidades' || selectedReport?.id === 'cbo_municipal' || selectedReport?.id === 'metas' || selectedReport?.id === 'financeiro');
      const isConnectorTabActive = activeTab === 'connector';
      const isHistoryTabActive = activeTab === 'history';

      if ((isReportNeedsData || isConnectorTabActive || isHistoryTabActive) && claims?.entityId) {
         console.log('[PRODUCTION_REPORT] ✅ Conditions met - checking if load is needed');
         if (!isManagementDataLoaded || isReportNeedsData) {
            console.log('[PRODUCTION_REPORT] ⏳ Fetching management data (Municipalities/Professionals/Units)');
            loadManagementData();
         }
      } else {
         console.log('[PRODUCTION_REPORT] ❌ Conditions NOT met or data already loaded via another flow');
      }
   }, [isReportModalOpen, selectedReport, activeTab, selectedCompetence, claims?.entityId, isManagementDataLoaded]);

   // Load Initial Data (Professionals, Municipalities, Units)
   const loadManagementData = async () => {
      if (!claims?.entityId) return;
      setLoadingReport(true);
      try {
         const [profs, munis, units] = await Promise.all([
            fetchProfessionalsByEntity(claims.entityId),
            fetchMunicipalitiesByEntity(claims.entityId),
            fetchUnitsByEntity(claims.entityId)
         ]);
         setProfessionals(profs);
         setAllMunicipalities(munis);
         setAllUnits(units);
         setIsManagementDataLoaded(true);
      } catch (error) {
         console.error("[PRODUCTION_REPORT] Error loading reference data:", error);
      } finally {
         setLoadingReport(false);
      }
   };

   // Fetch Production Stats via Cloud Function
   const fetchProductionStats = async () => {
      // Must have modalYear defined. (Empty competence is ok, means annual)
      if (!claims?.entityId || !modalYear) return;
      
      const fetchId = ++latestStatsFetchId.current;
      setLoadingStats(true);
      try {
         const getStatsFn = httpsCallable(functions, 'getProfessionalProductionStats', { timeout: 540000 }); // Using correct export format for Cloud Functions
         
         const apiCompetence = (modalMonth === 'all' || modalMonth === 'custom') ? '' : `${modalMonth.padStart(2, '0')}/${modalYear}`;
         const apiMonth = (modalMonth === 'all' || modalMonth === 'custom') ? undefined : `${modalYear}-${modalMonth.padStart(2, '0')}`;

         const response = await getStatsFn({
            entityId: claims.entityId,
            year: modalYear,
            month: apiMonth,
            day: modalDay === 'all' ? undefined : modalDay.padStart(2, '0'),
            competence: apiCompetence || undefined, // Fallback purely for backward compat se necessário
            startDate: appliedStartDate,
            endDate: appliedEndDate,
            municipalities: allMunicipalities,
            professionals: professionals.map(p => ({ id: p.id, name: p.name, cns: p.cns || '', cpf: p.cpf || '' })),
            goalFilter: exportGoalFilter,
            goalProcedureCodes: municipalityGoals.map(g => String(g.procedureCode || '').replace(/\D/g, '')).filter(c => c.length > 0)
         });
         
         // Previne Race Conditions (quando o usuário troca rápido de filtro e a requisição antiga chega depois)
         if (fetchId !== latestStatsFetchId.current) {
            console.log('[PRODUCTION_REPORT] Ignorando stats desatualizados devido a uma nova requisição em andamento.');
            return;
         }

         const stats = response.data as Record<string, number>;
         console.log('[PRODUCTION_REPORT] Cloud Function Stats returned for', Object.keys(stats).length, 'professionals');
         setProductionStats({...stats});
      } catch (error) {
         console.error("[PRODUCTION_REPORT] Error fetching stats via Cloud Function:", error);
         alert("Erro ao carregar os totais de produção. Tente novamente.");
      } finally {
         if (fetchId === latestStatsFetchId.current) {
            setLoadingStats(false);
         }
      }
   };

   // Re-fetch Stats when Modal Competence or Date Filters change, if Modal is Open and Data Loaded
   useEffect(() => {
      if (isReportModalOpen && isManagementDataLoaded && (selectedReport?.id === 'profissional' || selectedReport?.id === 'profissional_agrupado')) {
         fetchProductionStats();
      }
   }, [isReportModalOpen, isManagementDataLoaded, modalYear, modalMonth, modalDay, appliedStartDate, appliedEndDate, exportGoalFilter, municipalityGoals]);

   // Estado de simulação de geração de arquivo
   const [generatingFile, setGeneratingFile] = useState<string | null>(null);

   const handleGenerate = (fileType: string) => {
      if (selectedMonth === 'all') {
         alert('Para gerar arquivos exportáveis (BPA / Relatórios SUS), selecione um Mês de competência específico no filtro.');
         return;
      }

      setGeneratingFile(fileType);
      setTimeout(() => {
         setGeneratingFile(null);
         alert(`Arquivo ${fileType} gerado com sucesso para a competência ${selectedCompetence}!`);
      }, 2000);
   };

   const handleOpenReport = (report: ReportType) => {
      // Sync initial modal state with current global selection
      if (!modalYear && !modalMonth) {
         setModalYear(selectedYear);
         setModalMonth(selectedMonth);
         setModalDay(selectedDay);
      } else if (report.id === 'profissional' || report.id === 'profissional_agrupado') {
         // Se já havia sido aberto antes, e estamos apenas reabrindo, podemos opcionalmente forçar sync ou manter a última aba modal.
         // Para melhor UX, vamos forçar Sync só na primeira vez ou se o usuário quiser. Mas vamos sincronizar sempre para ser previsível.
         setModalYear(selectedYear);
         setModalMonth(selectedMonth);
         setModalDay(selectedDay);
      }

      setSelectedReport(report);
      setIsReportModalOpen(true);
   };

   // --- Signature Logic ---
   const [uploadingSignatureId, setUploadingSignatureId] = useState<string | null>(null);
   const fileInputRef = React.useRef<HTMLInputElement>(null);
   const [selectedProfForSignature, setSelectedProfForSignature] = useState<Professional | null>(null);

   const [viewingSignatureProf, setViewingSignatureProf] = useState<Professional | null>(null);

   const handleAttachSignature = (prof: Professional) => {
      if (prof.signatureUrl) {
         setViewingSignatureProf(prof);
      } else {
         setSelectedProfForSignature(prof);
         if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset value to ensure onChange triggers even for same file
            fileInputRef.current.click();
         }
      }
   };

   const handleChangeSignature = () => {
      if (viewingSignatureProf) {
         const prof = viewingSignatureProf;
         setViewingSignatureProf(null); // Close view modal
         setSelectedProfForSignature(prof);
         // Small timeout to allow modal to close before opening file picker
         setTimeout(() => {
            if (fileInputRef.current) {
               fileInputRef.current.value = '';
               fileInputRef.current.click();
            }
         }, 100);
      }
   };

   const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !selectedProfForSignature || !claims?.entityId) return;

      setUploadingSignatureId(selectedProfForSignature.id);
      try {
         // 1. Upload to Storage (backup/standard)
         // Upload path: signatures/{entityId}/{professionalId}_{timestamp}
         // Using timestamp to avoid caching issues on update
         const timestamp = Date.now();
         const storageRef = ref(storage, `signatures/${claims.entityId}/${selectedProfForSignature.id}_${timestamp}`);

         await uploadBytes(storageRef, file);
         const url = await getDownloadURL(storageRef);

         // 2. Convert to Base64 (for reliable PDF embedding)
         const reader = new FileReader();
         reader.onload = async () => {
            const base64 = reader.result as string;

            // 3. Update Professional Document in Firestore
            await updateProfessional(selectedProfForSignature.id, {
               signatureUrl: url,
               signatureBase64: base64
            });

            // 4. Update local state
            setProfessionals(prev => prev.map(p =>
               p.id === selectedProfForSignature.id ? { ...p, signatureUrl: url, signatureBase64: base64 } : p
            ));

            alert('Assinatura anexada com sucesso!');
            setUploadingSignatureId(null);
            setSelectedProfForSignature(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
         };
         reader.onerror = () => {
            console.error("Error reading file:", reader.error);
         };
         reader.readAsDataURL(file);

      } catch (error) {
         console.error("Error uploading signature:", error);
         alert("Erro ao enviar assinatura.");
         setUploadingSignatureId(null);
         setSelectedProfForSignature(null);
         if (fileInputRef.current) fileInputRef.current.value = '';
      }
   };
   // --- Export Logic ---
   const [exportingProfId, setExportingProfId] = useState<string | null>(null);
   const [exportDropdownOpen, setExportDropdownOpen] = useState<string | null>(null); // Stores ID of prof with open dropdown

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
            professionals: professionals.map(p => ({ id: p.id, name: p.name, cns: p.cns || '', cpf: p.cpf || '' })),
            goalFilter: exportGoalFilter,
            goalProcedureCodes: municipalityGoals.map(g => String(g.procedureCode || '').replace(/\D/g, '')).filter(c => c.length > 0)
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

   const handleBatchExport = async () => {
      if (!claims?.entityId) return;
      
      const apiCompetence = (modalMonth === 'all' || modalMonth === 'custom') ? '' : `${modalMonth.padStart(2, '0')}/${modalYear}`;
      const modalCompetence = modalMonth === 'all' ? '' : modalMonth === 'custom' ? `${appliedStartDate.split('-').reverse().join('/')} até ${appliedEndDate.split('-').reverse().join('/')}` : `${modalMonth.padStart(2, '0')}/${modalYear}`;
      const layout = selectedReport?.id === 'profissional_agrupado' ? 'grouped' : 'sus';
      
      setIsExportingBatch(true);
      
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

         const isGrouped = layout === 'grouped';
         const apiName = isGrouped ? 'getProfessionalProductionGrouped' : 'getProfessionalProductionDetailed';
         const getRecordsFn = httpsCallable(functions, apiName, { timeout: 540000 });
         
         const batchItems = [];
         
         const normalizeStr = (str?: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';

         // Loop filtered professionals that match the selected municipality and unit
         for (const prof of filteredProfessionals) {
            
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

            const matchedUnitId = displayUnits.find(unitId => {
               let resolvedUnitName = 'Sem Lotação';
               const foundUnit = allUnits.find(u => u.id === unitId || u.cnes === unitId);
               if (foundUnit) {
                  resolvedUnitName = foundUnit.name;
               } else {
                  const assignment = prof.assignments?.find(a => a.unitId === unitId);
                  if (assignment) {
                     resolvedUnitName = assignment.unitName || 'Sem Lotação';
                  } else if (unitId === 'unknown') {
                     resolvedUnitName = prof.assignments?.[0]?.unitName || prof.unitName || 'Sem Lotação';
                  }
               }
               return filterUnit && normalizeStr(resolvedUnitName) === normalizeStr(filterUnit);
            });

            if (!matchedUnitId && filterUnit) continue;

            const response = await getRecordsFn({
               entityId: claims.entityId,
               municipalityId: prof.assignments?.[0]?.municipalityId || claims.municipalityId || '', 
               unitId: matchedUnitId || undefined,
               competence: apiCompetence,
               year: modalYear,
               startDate: appliedStartDate,
               endDate: appliedEndDate,
               day: modalDay === 'all' ? undefined : modalDay.padStart(2, '0'),
               professionalId: prof.id,
               professionalCns: prof.cns,
               professionalName: prof.name,
               municipalities: allMunicipalities,
               professionals: professionals.map(p => ({ id: p.id, name: p.name, cns: p.cns || '', cpf: p.cpf || '' })),
               goalFilter: exportGoalFilter,
               goalProcedureCodes: municipalityGoals.map(g => String(g.procedureCode || '').replace(/\D/g, '')).filter(c => c.length > 0)
            });

            let normalizedRecords = response.data as any[];
            if (normalizedRecords && normalizedRecords.length > 0) {
                // NEW: Enrich batch records too
                normalizedRecords = await municipalityReportService.enrichMissingManualDocuments(
                    normalizedRecords, 
                    claims.entityId, 
                    allMunicipalities
                );
                
                const displayCompetence = modalCompetence + (exportGoalFilter === 'pactuados' ? ' (Pactuados)' : exportGoalFilter === 'nao_pactuados' ? ' (Não Pactuados)' : '');

                const getUnitName = () => {
                    const unit = allUnits.find(u => u.name === filterUnit);
                    if (unit) return unit.name;
                    return filterUnit || prof.unitName || '';
                };

                const optionsOrMeta = isGrouped ? {
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
               } : {
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
                        const u = allUnits.find(u => u.name === filterUnit);
                        return u?.cnes || filterUnit || '';
                     })()
                  },
                  signatureUrl: prof.signatureUrl,
                  signatureBase64: prof.signatureBase64,
                  entityAddress: entityData.address,
                  entityPhone: entityData.phone,
                  entityCnpj: entityData.cnpj,
                  entityCity: entityData.location || claims.municipalityName,
                  entityResponsible: entityData.responsible
               };

               batchItems.push(isGrouped ? { records: normalizedRecords, meta: optionsOrMeta } : { records: normalizedRecords, options: optionsOrMeta });
            }
         }

         if (batchItems.length === 0) {
            alert('Nenhuma produção encontrada para os profissionais desta unidade no filtro informado.');
            setIsExportingBatch(false);
            return;
         }

         if (isGrouped) {
             await groupedProfessionalReportService.generateBatchGroupedProfessionalPdf(batchItems as any[]);
         } else {
             await susReportService.generateBatchSusProductionPdf(batchItems as any[]);
         }
         
      } catch (error) {
         console.error("Error generating batch PDF:", error);
         alert("Erro ao exportar lote de relatórios.");
      } finally {
         setIsExportingBatch(false);
      }
   };





   // Calculate Date Constraints based on Competence
   const dateConstraints = React.useMemo(() => {
      if (!selectedCompetence) return { min: '', max: '' };
      const [month, year] = selectedCompetence.split('/');
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      return {
         min: `${year}-${month}-01`,
         max: `${year}-${month}-${lastDay}`
      };
   }, [selectedCompetence]);

   // Ensure filters are cleared if competence changes
   useEffect(() => {
      setInputStartDate('');
      setInputEndDate('');
      setAppliedStartDate('');
      setAppliedEndDate('');
   }, [selectedCompetence]);



   // --- Render Signature Modal ---
   const renderSignatureModal = () => {
      if (!viewingSignatureProf) return null;

      return (
         <Modal
            isOpen={!!viewingSignatureProf}
            onClose={() => setViewingSignatureProf(null)}
            title={`Assinatura Digital - ${viewingSignatureProf.name}`}
         >
            <div className="flex flex-col items-center space-y-6">
               <div className="w-full max-w-md p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-center items-center min-h-[150px]">
                  {viewingSignatureProf.signatureUrl ? (
                     <img
                        src={viewingSignatureProf.signatureUrl}
                        alt="Assinatura"
                        className="max-h-40 object-contain"
                     />
                  ) : (
                     <span className="text-gray-400">Imagem indisponível</span>
                  )}
               </div>

               <div className="flex gap-3 w-full justify-end">
                  <Button
                     variant="ghost"
                     onClick={() => setViewingSignatureProf(null)}
                  >
                     Fechar
                  </Button>

                  <a
                     href={viewingSignatureProf.signatureUrl}
                     download={`assinatura_${viewingSignatureProf.cns || 'document'}.png`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                     <Download className="w-4 h-4 mr-2" />
                     Baixar
                  </a>

                  <Button
                     variant="secondary"
                     onClick={handleChangeSignature}
                  >
                     <FileSignature className="w-4 h-4 mr-2" />
                     Alterar Assinatura
                  </Button>
               </div>
            </div>
         </Modal>
      );
   };

   // --- Renders de Conteúdo dos Modais ---

   const renderReportDetail = () => {
      if (!selectedReport) return null;

      switch (selectedReport.id) {
         case 'metas': // Cumprimento de Metas
            return (
               <GoalsFulfillmentReport
                  municipalityId={filterMunicipality}
                  onMunicipalityChange={setFilterMunicipality}
                  allMunicipalities={allMunicipalities}
                  year={modalYear}
               />
            );
         case 'financeiro': // Evolução Financeira
            return (
               <FinancialEvolutionReport
                  municipalityId={filterMunicipality}
                  onMunicipalityChange={setFilterMunicipality}
                  allMunicipalities={allMunicipalities}
                  year={modalYear}
               />
            );

         case 'profissional':
         case 'profissional_agrupado': // Produção por Profissional (Ambos os tipos usam a mesma tela de seleção)
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
                        <div className="md:w-1/4">
                           <label className="text-xs text-gray-500 mb-1 block">Município</label>
                           <select
                              value={filterMunicipality}
                              onChange={(e) => {
                                 setFilterMunicipality(e.target.value);
                                 setFilterUnit(''); // Reset unit when municipality changes
                              }}
                              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                           >
                              <option value="">Todos os Municípios</option>
                              {uniqueMunicipalities.map(m => (
                                 <option key={m} value={m}>{m}</option>
                              ))}
                           </select>
                        </div>
                        <div className="md:w-1/4">
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
                        {/* NOVO: Modalidade de Faturamento Mestre */}
                        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-1.5 rounded border border-emerald-100 dark:border-emerald-800/50">
                           <label className="text-xs font-medium text-emerald-800 dark:text-emerald-200 uppercase shrink-0">Modalidade de Relatório:</label>
                           <select
                              value={exportGoalFilter}
                              onChange={(e) => setExportGoalFilter(e.target.value as 'all' | 'pactuados' | 'nao_pactuados')}
                              className="bg-transparent border-none text-sm font-semibold text-emerald-900 dark:text-emerald-100 focus:ring-0 cursor-pointer outline-none"
                           >
                              <option value="all">Global (Todos os Procedimentos)</option>
                              <option value="pactuados">Apenas Procedimentos Pactuados (Metas Ativas)</option>
                              <option value="nao_pactuados">Apenas Procedimentos Não Pactuados</option>
                           </select>
                        </div>
                        
                        <div className="flex-1 flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-end w-full justify-end">
                           <div className="flex gap-2 w-full sm:w-auto">
                              {(filterName || filterUnit || filterMunicipality || exportGoalFilter !== 'all') && (
                                 <Button
                                    variant="ghost"
                                    className="text-gray-500 hover:text-red-500 flex-1 sm:flex-none justify-center"
                                    onClick={() => {
                                       setFilterName('');
                                       setFilterMunicipality('');
                                       setFilterUnit('');
                                       setInputStartDate('');
                                       setInputEndDate('');
                                       setAppliedStartDate('');
                                       setAppliedEndDate('');
                                       setExportGoalFilter('all');
                                    }}
                                 >
                                    <X className="w-4 h-4 mr-1 shrink-0" /> Limpar Filtros
                                 </Button>
                              )}

                              {filterMunicipality && filterUnit && (
                                 <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex-1 sm:flex-none justify-center"
                                    onClick={handleBatchExport}
                                    disabled={isExportingBatch || loadingReport}
                                 >
                                    {isExportingBatch ? (
                                       <>
                                          <Activity className="w-4 h-4 mr-2 animate-spin" /> Gerando Lote...
                                       </>
                                    ) : (
                                       <>
                                          <Download className="w-4 h-4 mr-2" /> Baixar Agrupado da Unidade
                                       </>
                                    )}
                                 </Button>
                              )}
                           </div>
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
                              
                              if (filterMunicipality && normalize(resolvedMuniName) !== normalize(filterMunicipality)) {
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
                                                   onClick={() => handleExportProfessional(prof, 'default', unitId)}
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
                                                               onClick={() => { handleExportProfessional(prof, 'sus', unitId); setExportDropdownOpen(null); }}
                                                               className="w-full text-left px-4 py-2 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                            >
                                                               <FileText className="w-3 h-3 text-red-500" />
                                                               Gerar em PDF
                                                            </button>
                                                            <button
                                                               onClick={() => { handleExportProfessional(prof, 'excel_sus', unitId); setExportDropdownOpen(null); }}
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
                                          <Button
                                             size="sm"
                                             variant="outline"
                                             className="h-8 text-xs gap-1 whitespace-nowrap"
                                             onClick={() => handleAttachSignature(prof)}
                                             disabled={uploadingSignatureId === prof.id}
                                             title={prof.signatureUrl ? "Ver/Alterar Assinatura" : "Anexar Assinatura Digitalizada"}
                                          >
                                             {uploadingSignatureId === prof.id ? (
                                                <Activity className="w-3 h-3 animate-spin" />
                                             ) : (
                                                <FileSignature className={`w-3 h-3 ${prof.signatureUrl ? 'text-green-600' : 'text-gray-400'}`} />
                                             )}
                                             {prof.signatureUrl ? 'Ver Assinatura' : 'Anexar Assinatura'}
                                          </Button>
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



         case 'unidades': // Comparativo de Unidades
            return (
               <UnitComparativeReport
                  municipalityId={filterMunicipality}
                  onMunicipalityChange={setFilterMunicipality}
                  allMunicipalities={allMunicipalities}
                  competence={selectedCompetence}
                  allUnits={allUnits}
                  entityName={entity?.name || entity?.fantasyName || claims?.entityName || 'Entidade Responsável'}
               />
            );

         case 'cbo_municipal': // Produção por CBO - Municipal
            return (
               <CboMunicipalReport
                  municipalityId={filterMunicipality}
                  onMunicipalityChange={setFilterMunicipality}
                  allMunicipalities={allMunicipalities}
                  competence={selectedCompetence}
                  allUnits={allUnits}
                  professionals={professionals}
                  entityName={entity?.name || entity?.fantasyName || claims?.entityName || 'Entidade Responsável'}
               />
            );

         case 'procedimentos': // Top Procedimentos
            return (
               <div className="space-y-4">
                  {TOP_PROCEDURES.map((proc, idx) => (
                     <div key={idx} className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                           <div>
                              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                                 #{idx + 1}
                              </span>
                              <span className="ml-2 font-medium text-sm text-gray-700 dark:text-gray-200">
                                 {proc.name}
                              </span>
                           </div>
                           <div className="text-right">
                              <span className="text-xs font-semibold inline-block text-blue-600">
                                 {proc.qtd} exames
                              </span>
                           </div>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100 dark:bg-gray-700">
                           <div style={{ width: `${(proc.qtd / 4500) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                        </div>
                     </div>
                  ))}
               </div>
            );

         case 'financeiro': // Evolução Financeira
            return (
               <div className="space-y-6">
                  <div className="h-80 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={EVOLUTION_DATA}>
                           <defs>
                              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                 <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                           <XAxis dataKey="month" />
                           <YAxis tickFormatter={(value) => `R$${value / 1000}k`} />
                           <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                           <Area type="monotone" dataKey="valor" name="Faturamento Aprovado" stroke="#10b981" fillOpacity={1} fill="url(#colorVal)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                     <div>
                        <p className="text-sm text-emerald-800 dark:text-emerald-200">Total Acumulado (Ano)</p>
                        <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">R$ 979.000,00</h3>
                     </div>
                     <div className="h-10 w-10 bg-emerald-200 dark:bg-emerald-800 rounded-full flex items-center justify-center">
                        <DollarSign className="text-emerald-700 dark:text-emerald-200" />
                     </div>
                  </div>
               </div>
            );

         case 'cobertura': // Indicadores de Cobertura
            return (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="flex flex-col items-center">
                     <h4 className="text-sm font-bold mb-4 text-gray-700 dark:text-gray-300">Distribuição por Faixa Etária</h4>
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <RechartsPieChart>
                              <Pie
                                 data={DEMOGRAPHICS_AGE}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius={60}
                                 outerRadius={80}
                                 paddingAngle={5}
                                 dataKey="value"
                                 label
                              >
                                 {DEMOGRAPHICS_AGE.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                 ))}
                              </Pie>
                              <Tooltip />
                              <Legend verticalAlign="bottom" height={36} />
                           </RechartsPieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
                  <div className="flex flex-col items-center">
                     <h4 className="text-sm font-bold mb-4 text-gray-700 dark:text-gray-300">Distribuição por Sexo</h4>
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <RechartsPieChart>
                              <Pie
                                 data={DEMOGRAPHICS_SEX}
                                 cx="50%"
                                 cy="50%"
                                 outerRadius={80}
                                 dataKey="value"
                                 label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                 <Cell fill="#ec4899" /> {/* Feminino */}
                                 <Cell fill="#3b82f6" /> {/* Masculino */}
                              </Pie>
                              <Tooltip />
                           </RechartsPieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            );

         default:
            return <div className="text-center py-10 text-gray-500">Visualização em desenvolvimento para este relatório.</div>;
      }
   };

   const renderDashboard = () => (
      <div className="space-y-6 animate-in fade-in duration-500">
         {/* KPI Cards */}
         <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card className="p-5 border-l-4 border-blue-500">
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
               <div className="flex items-center mt-2 text-sm text-red-600 font-medium">
                  Extra-teto
               </div>
            </Card>

            <Card className="p-5 border-l-4 border-emerald-500">
               <div className="text-sm text-gray-500 font-medium">Eficiência de Metas</div>
               <div className="mt-2">
                  {dashboardLoading ? (
                     <Skeleton className="h-8 w-16" />
                  ) : (
                     <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {dashboardGoals.value}
                     </div>
                  )}
               </div>
               <div className="text-xs text-gray-500 mt-2">Média geral das unidades</div>
            </Card>

            <Card className="p-5 border-l-4 border-orange-500">
               <div className="text-sm text-gray-500 font-medium">Municípios Ativos</div>
               <div className="mt-2">
                  {dashboardLoading ? (
                     <Skeleton className="h-8 w-12" />
                  ) : (
                     <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {dashboardMunicipalities.value}
                     </div>
                  )}
               </div>
               <div className="flex items-center mt-2 text-sm text-orange-600 font-medium">
                  <Building2 className="w-4 h-4 mr-1" /> Monitorados
               </div>
            </Card>

            <Card className="p-5 border-l-4 border-purple-500">
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
               <div className="flex items-center mt-2 text-sm text-purple-600 font-medium">
                  <Users className="w-4 h-4 mr-1" /> Na competência
               </div>
            </Card>
         </div>

         {/* Gráficos Principais */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Evolução Temporal */}
            <Card className="lg:col-span-2 p-6">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                     <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                     Evolução Temporal da Produção
                  </h3>
                  <div className="flex gap-2">
                     <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Manual</span>
                     <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">Conector</span>
                  </div>
               </div>
               <div className="h-80">
                  {dashboardLoading ? (
                     <Skeleton className="w-full h-full rounded-lg" />
                  ) : (
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={production.chartData}>
                           <defs>
                              <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                 <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                           <XAxis dataKey="month" axisLine={false} tickLine={false} />
                           <YAxis axisLine={false} tickLine={false} />
                           <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                           <Legend />
                           <Area type="monotone" dataKey="procedures" name="Produção Total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorProd)" strokeWidth={3} />
                        </AreaChart>
                     </ResponsiveContainer>
                  )}
               </div>
            </Card>

            {/* Top Procedimentos */}
            <Card className="p-6">
               <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Procedimentos</h3>
               <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
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
                           <div
                              key={idx}
                              className="relative pt-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-1 transition-colors group"
                              onClick={() => handleProcedureClick(proc.name)}
                              title="Clique para ver detalhamento"
                           >
                              <div className="flex mb-1 items-center justify-between">
                                 <div className="flex items-center overflow-hidden">
                                    <span className="text-xs font-semibold inline-block py-0.5 px-2 uppercase rounded-full text-blue-600 bg-blue-100 mr-2 flex-shrink-0 group-hover:bg-blue-200">
                                       #{idx + 1}
                                    </span>
                                    <span className="font-medium text-sm text-gray-700 dark:text-gray-200 truncate" title={proc.name}>
                                       {proc.name}
                                    </span>
                                 </div>
                                 <span className="text-xs font-bold text-gray-900 dark:text-white ml-2">
                                    {proc.value}
                                 </span>
                              </div>
                              <div className="overflow-hidden h-1.5 mb-2 text-xs flex rounded bg-gray-100 dark:bg-gray-700">
                                 <div style={{ width: `${(proc.value / (production.topProcedures[0]?.value || 1)) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
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

         {/* Performance por Profissional (Simplificado/Inteligente) */}
         <div className="mt-6">
            <ProfessionalPerformanceWidget initialYear={selectedYear} initialMonth={selectedMonth} />
         </div>
      </div>
   );

   const renderReports = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
         {[
            { id: 'profissional_agrupado', title: 'Produção por Profissional - Agrupado', desc: 'Relatório do profissional por agrupamento de procedimentos.', icon: Users, color: 'text-indigo-600' },
            { id: 'profissional', title: 'Produção por Profissional - Individualizado', desc: 'Relatório detalhado por paciente, procedimento, datas e quantidades.', icon: Users, color: 'text-emerald-600' },
            { id: 'cbo_municipal', title: 'Produção por CBO - Municipal', desc: 'Totalização de produção por Município agrupado por Unidade e CBO.', icon: Users, color: 'text-pink-600' },
            { id: 'unidades', title: 'Comparativo de Unidades', desc: 'Análise de desempenho entre postos de saúde do município.', icon: Building2, color: 'text-purple-600' },
            { id: 'metas', title: 'Cumprimento de Metas', desc: 'Evolução da produção vs. meta definida por unidade e procedimento.', icon: Target, color: 'text-blue-600' },
            { id: 'financeiro', title: 'Evolução Financeira', desc: 'Série histórica de faturamento produzido com base nos valores das metas.', icon: TrendingUp, color: 'text-green-600' },
            { id: 'procedimentos', title: 'Procedimentos Mais Realizados', desc: 'Curva ABC de procedimentos por volume e valor faturado.', icon: BarChart2, color: 'text-amber-600', comingSoon: true },
            { id: 'meta_realizada', title: 'Meta Física vs Realizada', desc: 'Indicador de eficiência global e por grupos de procedimentos.', icon: Activity, color: 'text-red-600', comingSoon: true },
            { id: 'cobertura', title: 'Indicadores de Cobertura', desc: 'Análise populacional, faixa etária e sexo dos pacientes atendidos.', icon: PieChart, color: 'text-teal-600', comingSoon: true },
            { id: 'pacientes', title: 'Pacientes por Unidade', desc: 'Listagem nominal ou quantitativa de pacientes atendidos.', icon: Users, color: 'text-cyan-600', comingSoon: true },
         ].filter(rep => {
            if (isCoordenacao && ['cbo_municipal', 'unidades', 'metas', 'financeiro'].includes(rep.id)) {
               return false;
            }
            return true;
         }).map((rep: any, idx) => {
            const Icon = rep.icon;
            return (
               <Card key={idx} className="p-6 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700">
                  <div className={`p-6 flex flex-col justify-between h-full relative ${rep.comingSoon ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                     {rep.comingSoon && (
                        <div className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                           Em Breve
                        </div>
                     )}
                     <div>
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
                           onClick={() => !rep.comingSoon && handleOpenReport(rep)}
                           disabled={rep.comingSoon}
                        >
                           <Eye className="w-3 h-3 mr-2" /> Visualizar
                        </Button>
                        {rep.id !== 'unidades' && rep.id !== 'profissional' && rep.id !== 'profissional_agrupado' && rep.id !== 'cbo_municipal' && rep.id !== 'metas' && rep.id !== 'financeiro' && (
                           <Button
                              variant="secondary"
                              className="flex-1 text-xs"
                              onClick={() => {
                                 if (rep.comingSoon) return;
                                 handleGenerate('PDF');
                              }}
                              disabled={rep.comingSoon}
                           >
                              <Download className="w-3 h-3 mr-2" />
                              PDF
                           </Button>
                        )}
                     </div>
                  </div>
               </Card>
            )
         })}
      </div>
   );

   const renderTechnical = () => (
      <div className="space-y-8 animate-in fade-in duration-500">

         {/* Cabeçalho de Validação */}
         <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <Database className="w-48 h-48" />
            </div>
            <div className="relative z-10 max-w-2xl">
               <h2 className="text-2xl font-bold mb-2">Central de Exportação SIA/SUS</h2>
               <p className="text-gray-300 mb-6">
                  Geração oficial dos arquivos de produção ambulatorial para importação no sistema do DATASUS.
                  Certifique-se de que todas as críticas foram resolvidas antes de gerar o arquivo final.
               </p>
               <div className="flex flex-wrap gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                     <span className="block text-xs text-gray-400 uppercase">Competência Selecionada</span>
                     <span className="font-bold text-lg">{selectedCompetence}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                     <span className="block text-xs text-gray-400 uppercase">Status do Fechamento</span>
                     <span className="font-bold text-lg text-emerald-400 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" /> Aberto
                     </span>
                  </div>
               </div>
            </div>
         </div>

         {/* Fluxo de Geração */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna 1: Relatórios Pré-Envio */}
            <div className="space-y-6">
               <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" /> Relatórios de Conferência (Espelhos)
               </h3>

               <Card className="p-5 flex items-center justify-between border-l-4 border-blue-500">
                  <div>
                     <h4 className="font-bold text-gray-900 dark:text-white">BPA-I (Individualizado)</h4>
                     <p className="text-sm text-gray-500 mt-1">Detalhamento por paciente (CBO, CID, CNS).</p>
                     <Badge type="neutral" className="mt-2">23,270 Registros</Badge>
                  </div>
                  <Button onClick={() => handleGenerate('BPA-I')} disabled={!!generatingFile} variant="outline">
                     {generatingFile === 'BPA-I' ? 'Gerando...' : <Download className="w-4 h-4" />}
                  </Button>
               </Card>

               <Card className="p-5 flex items-center justify-between border-l-4 border-indigo-500">
                  <div>
                     <h4 className="font-bold text-gray-900 dark:text-white">BPA-C (Consolidado)</h4>
                     <p className="text-sm text-gray-500 mt-1">Produção agregada por procedimento e CBO.</p>
                     <Badge type="neutral" className="mt-2">48,630 Registros</Badge>
                  </div>
                  <Button onClick={() => handleGenerate('BPA-C')} disabled={!!generatingFile} variant="outline">
                     {generatingFile === 'BPA-C' ? 'Gerando...' : <Download className="w-4 h-4" />}
                  </Button>
               </Card>

               <Card className="p-5 flex items-center justify-between border-l-4 border-red-500 bg-red-50/50 dark:bg-red-900/10">
                  <div>
                     <h4 className="font-bold text-gray-900 dark:text-white flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2 text-red-500" /> Relatório de Críticas/Erros
                     </h4>
                     <p className="text-sm text-gray-500 mt-1">Inconsistências que impedem a exportação.</p>
                     <Badge type="error" className="mt-2">12 Erros Encontrados</Badge>
                  </div>
                  <Button onClick={() => handleGenerate('ERROS')} disabled={!!generatingFile} variant="danger" className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                     Ver Erros
                  </Button>
               </Card>
            </div>

            {/* Coluna 2: Arquivo Final */}
            <div className="space-y-6">
               <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <FileCode className="w-5 h-5 mr-2 text-emerald-600" /> Arquivo Final (Integração)
               </h3>

               <Card className="p-6 bg-gray-50 dark:bg-gray-800 border-dashed border-2 border-gray-300 dark:border-gray-700 text-center">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">Exportação BPA-SIA</h4>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6 max-w-md mx-auto">
                     Gera o arquivo <strong>.TXT</strong> no layout oficial do Ministério da Saúde para importação no SIA/SUS.
                  </p>

                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-left mb-6 max-w-sm mx-auto">
                     <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">Competência:</span>
                        <span className="font-mono font-bold">{selectedCompetence}</span>
                     </div>
                     <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">Linhas Totais:</span>
                        <span className="font-mono font-bold">71,900</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Hash MD5:</span>
                        <span className="font-mono text-xs text-gray-400">...a1b2c3d4</span>
                     </div>
                  </div>

                  <Button
                     onClick={() => handleGenerate('BPA-MAG')}
                     disabled={!!generatingFile}
                     variant="secondary"
                     className="w-full max-w-sm mx-auto py-3 text-lg shadow-lg shadow-emerald-500/20"
                  >
                     {generatingFile === 'BPA-MAG' ? (
                        <span className="flex items-center"><Activity className="animate-spin mr-2" /> Processando...</span>
                     ) : (
                        <span className="flex items-center"><Download className="mr-2" /> Baixar Arquivo .TXT</span>
                     )}
                  </Button>
                  <p className="text-xs text-gray-400 mt-4">
                     * O arquivo será validado automaticamente antes do download.
                  </p>
               </Card>
            </div>
         </div>
      </div>
   );



   // --- Procedure Breakdown Modal State ---



   // --- Renderers ---

   const renderProcedureModal = () => {
      const data = getProcedureBreakdown() || [];
      console.log('Rendering Procedure Modal:', { selectedProcedure, dataCount: data.length });


      return (
         <Modal
            isOpen={isProcedureModalOpen}
            onClose={() => setIsProcedureModalOpen(false)}
            title={`Detalhamento: ${selectedProcedure}`}
         >
            <div className="max-h-[60vh] overflow-y-auto">
               <Table>
                  <thead className="bg-gray-50 dark:bg-gray-800">
                     <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profissional</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidade</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                     </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                     {Array.isArray(data) && data.map((row, idx) => (
                        <tr key={idx}>
                           <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{row.name}</td>
                           <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{row.unit}</td>
                           <td className="px-4 py-2 text-sm text-center font-bold text-gray-900 dark:text-white">{row.quantity}</td>
                        </tr>
                     ))}
                     {data.length === 0 && (
                        <tr>
                           <td colSpan={3} className="px-4 py-4 text-center text-gray-500 text-sm">Nenhum registro encontrado.</td>
                        </tr>
                     )}
                  </tbody>
               </Table>
            </div>
            <div className="mt-4 flex justify-end">
               <Button variant="outline" onClick={() => setIsProcedureModalOpen(false)}>Fechar</Button>
            </div>
         </Modal>
      );
   };

   // ... (Rest of renders)

   return (
      <div className="space-y-6">
         <div id="zero-production-alert-portal" />
         {/* Header Principal */}
         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
               <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produção Global</h1>
               <p className="text-gray-500 dark:text-gray-400 mt-1">Monitoramento, Auditoria e Exportação do BPA.</p>

            </div>
         </div>

         <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {/* Seletor de Município */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 flex items-center shadow-sm h-[38px] w-full sm:w-auto">
               <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-500 mr-2 flex-shrink-0" />
               <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0 hidden sm:inline-block">Município:</span>
               <select
                  value={selectedMunicipality}
                  onChange={(e) => setSelectedMunicipality(e.target.value)}
                  className="text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 py-0.5 cursor-pointer outline-none min-w-[130px] flex-1"
               >
                  <option value="all" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                     Todos os Municípios
                  </option>
                  {allMunicipalities.map((m) => (
                     <option key={m.id} value={m.id} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                        {m.name}
                     </option>
                  ))}
               </select>
            </div>

            {/* Year Selector */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 flex items-center shadow-sm h-[38px] w-full sm:w-auto">
               <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-500 mr-2 flex-shrink-0" />
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

            <Button variant="outline" className="flex items-center gap-2 h-[38px]">
               <Filter className="w-4 h-4" /> Filtros Avançados
            </Button>
         </div>


         {/* Navegação por Abas */}
         <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 overflow-x-auto">
               {[
                  { id: 'dashboard', label: 'Dashboard & Monitoramento', icon: BarChart2 },
                  { id: 'reports', label: 'Relatórios Gerenciais', icon: FileText },
                  ...(!isCoordenacao ? [{ id: 'history', label: 'Histórico de Produção', icon: Database }] : []),
                  { id: 'lancamento', label: 'Lançar Produção', icon: PlusCircle },
                  { id: 'connector', label: 'Conector', icon: Activity },
               ].map(tab => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as TabType)}
                     className={`
                     py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                     ${activeTab === tab.id
                           ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                           : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                  `}
                  >
                     <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`} />
                     {tab.label}
                  </button>
               ))}

            </nav>
         </div>

         {/* Conteúdo das Abas */}
         <div className="min-h-[500px]">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'connector' && (
               <ConnectorDashboard
                  entityId={claims?.entityId || ''}
                  municipalities={allMunicipalities}
                  competence={selectedCompetence}
               />
            )}
            {activeTab === 'history' && (
               <GlobalProductionHistory 
                  entityId={claims?.entityId || ''}
                  municipalities={allMunicipalities}
                  competence={selectedCompetence}
                  day={selectedDay}
               />
            )}
            {activeTab === 'lancamento' && (
               <GlobalRegisterProduction />
            )}
         </div>

         {/* Modal de Visualização de Relatório */}
         <Modal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            title={selectedReport?.title || 'Detalhes do Relatório'}
            className={selectedReport?.id === 'unidades' || selectedReport?.id === 'profissional' || selectedReport?.id === 'profissional_agrupado' || selectedReport?.id === 'metas' || selectedReport?.id === 'financeiro' ? 'max-w-[95vw]' : 'max-w-5xl'}
         >
            <div className="mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
               <p className="text-gray-500 dark:text-gray-400">{selectedReport?.desc}</p>
               <div className="mt-2 flex items-center gap-2">
                  {selectedReport?.id !== 'metas' && selectedReport?.id !== 'financeiro' && selectedReport?.id !== 'cbo_municipal' && (
                     <Badge type="neutral">
                        {(selectedReport?.id === 'profissional' || selectedReport?.id === 'profissional_agrupado') 
                           ? `Competência: ${displayCompetenceText}`
                           : `Competência: ${selectedCompetence || 'Ano Inteiro'}`
                        }
                     </Badge>
                  )}
                  <Badge type="success">Dados Consolidados</Badge>
               </div>
            </div>

            {renderReportDetail()}

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
               <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>Fechar</Button>
            </div>
         </Modal>

         {/* Procedure Breakdown Modal */}
         {renderProcedureModal()}

         {/* Hidden File Input for Signature Upload - Moved to root to persist across tabs */}
         <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
         />
         {renderSignatureModal()}
      </div >
   );
};

export default Production;