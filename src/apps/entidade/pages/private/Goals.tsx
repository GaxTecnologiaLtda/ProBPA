import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button, Modal, Input, Select, Badge } from '../../components/ui/Components';
import { MOCK_UNITS, MOCK_PROFESSIONALS } from '../../constants';
import {
   Target, Users, Calendar, Plus, Filter, Search, MoreVertical,
   AlertTriangle, CheckCircle, FileText, ChevronDown, Trash2, Edit2,
   Download, ArrowUpRight, BarChart2, Briefcase, Activity,
   Save, Info, X, Clock, User, Building2, TrendingUp, Copy, Eye, Loader2, RefreshCw
} from 'lucide-react';
import { Goal, Unit, Professional } from '../../types';
import { GoalHierarchyExplorer } from '../../components/GoalHierarchyExplorer';
import { goalService, EntityProductionRecord, matchProfessional, calculateGoalStatus } from '../../services/goalService';
import { sigtapService } from '../../../administrativo/services/sigtapService';
import { municipalityReportService } from '../../services/municipalityReportService';
import { fetchUnitsByEntity } from '../../services/unitsService';
import { fetchProfessionalsByEntity } from '../../services/professionalsService';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { SigtapSearchModal } from '../../components/SigtapSearchModal';
import { SigtapSelector } from '../../components/SigtapSelector';
import { SigtapProcedureRow } from '../../../producao/services/sigtapLookupService';
import { motion, AnimatePresence } from 'framer-motion';

const normalize = (v?: string | null) => String(v || '').trim();
const normalizeName = (v?: string | null) => normalize(v).toLowerCase();
// --- Helpers for Normalization & Data ---
// const normalize = (str?: string) => str ? str.trim() : ''; // DUPLICATE REMOVED


// Helper to reliably get YYYY-MM from production record
const getProdCompetenceKey = (p: EntityProductionRecord) => {
   if (p.competenceMonth) return p.competenceMonth;
   if (p.competence) {
      // Try normalize YYYYMM or MM/YYYY
      if (p.competence.includes('/')) return p.competence.split('/').reverse().join('-');
      if (p.competence.length === 6) return `${p.competence.substring(0, 4)}-${p.competence.substring(4)}`;
   }
   return '';
};

// Returns just the YEAR
const getYear = (comp: string) => {
   if (!comp) return new Date().getFullYear().toString();
   if (comp.includes('/')) return comp.split('/')[1]; // MM/YYYY
   if (comp.includes('-')) return comp.split('-')[0]; // YYYY-MM
   return comp.substring(0, 4); // YYYYMM
};

const getProdUnitId = (p: EntityProductionRecord) =>
   normalize((p as any).unitId || (p as any).unityId || (p as any).unit?.id);

// Default to current year if goal has weird competence.
const mergeGoalsWithEntityProduction = (
   goals: Goal[],
   production: EntityProductionRecord[]
): Goal[] => {
   return goals.map(goal => {
      // Determine the target YEAR for this goal.
      // Default to current year if goal has weird competence.
      const year = getYear(goal.competence || goal.competenceMonth || '');

      const goalUnit = normalize(goal.unitId);
      const goalCode = normalize(goal.procedureCode);

      // Filter production for this Goal (Code + Unit/Prof) AND Year
      const annualProduction = production.filter(p => {
         const pComp = getProdCompetenceKey(p);

         // 1. Period Match (Start/End Range or Year Fallback)
         if (goal.startMonth && goal.endMonth) {
            const startRaw = goal.startMonth.substring(0, 7);
            const endRaw = goal.endMonth.substring(0, 7);
            if (pComp < startRaw || pComp > endRaw) return false;
         } else {
            // 2. Strict Year Match (if no range defined)
            const pYear = getYear(pComp);
            if (pYear !== year) return false;
         }
         // Hierarchical Matching 
         const pCode = normalize(p.procedureCode);
         // Check if goal is macro (Group, SubGroup, Form)
         // We can use length or stored type. 
         // Logic: If goalCode < 10 chars, it is macro.
         const isMacro = goalCode.length < 10 || ["Group", "SubGroup", "Form", "Grupo", "Subgrupo", "Forma"].includes(goal.sigtapTargetType || "");

         if (isMacro) {
            // Robust SIGTAP Matching: Check dedicated fields if available, else usage startsWith
            let match = false;
            if (goalCode.length === 2 && (p as any).groupCode === goalCode) match = true;
            else if (goalCode.length === 4 && (p as any).groupCode + (p as any).subGroupCode === goalCode) match = true;
            else if (goalCode.length === 6 && (p as any).groupCode + (p as any).subGroupCode + (p as any).formCode === goalCode) match = true;
            else if (pCode.startsWith(goalCode)) match = true;

            if (!match) return false;
         } else {
            if (pCode !== goalCode) return false;
         }

         // Unit/Prof Match
         // If Municipal (Global), we might want ALL production for that code in that Municipality?
         // Current logic relied on filtering.
         if (goal.goalType === 'municipal') {
            // Match Municipality (Normalized)
            return normalize(p.municipalityId) === normalize(goal.municipalityId);
         }

         // Match Unit
         const unitMatch = getProdUnitId(p) === goalUnit;
         if (!unitMatch) return false;

         // Match Professional (if applicable)
         if (goal.professionalId && goal.professionalId !== 'team') {
            return matchProfessional(goal, p);
         }

         return true;
      });

      // Calculate Chart Data (12 months)
      const chartData = Array.from({ length: 12 }, (_, i) => {
         const month = (i + 1).toString().padStart(2, '0');
         const key = `${year}-${month}`;
         const value = annualProduction
            .filter(p => getProdCompetenceKey(p) === key)
            .reduce((acc, r) => acc + Number(r.quantity || 0), 0);

         return { month: `${month}`, value, label: `${month}/${year.slice(2)}` };
      });

      // Annual Total
      const totalAnnual = annualProduction.reduce((acc, r) => acc + Number(r.quantity || 0), 0);

      const status = calculateGoalStatus(totalAnnual, goal.annualTargetQuantity || goal.targetQuantity * 12);

      return {
         ...goal,
         currentQuantity: totalAnnual,
         status,
         chartData
      };
   });
};

// Mini Bar Chart Component
const MiniBarChart = ({ data }: { data: { value: number; label: string }[] }) => {
   const max = Math.max(...data.map(d => d.value), 1); // Avoid div by zero

   return (
      <div className="flex items-end justify-between h-16 w-full gap-1 mt-2">
         {data.map((d, i) => (
            <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
               <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${d.value > 0 ? 'bg-emerald-400 dark:bg-emerald-600 group-hover:bg-emerald-300' : 'bg-gray-100 dark:bg-gray-700'}`}
                  style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? '4px' : '2px' }}
               ></div>
               {/* Tooltip or Label - simplified for mini view */}
            </div>
         ))}
      </div>
   );
};


// Interface auxiliar para o agrupamento
interface GroupedByUnit {
   unitId: string;
   unitName: string;
   goals: Goal[];
   totalValue: number;
}

interface GroupedMunicipality {
   municipalityId: string;
   municipalityName: string;
   globalGoals: Goal[];
   unitGoals: GroupedByUnit[];
   totalValue: number;
   totalGoals: number;
}

interface GroupedUnit {
   unitId: string;
   unitName: string;
   goals: Goal[];
   totalValue: number;
}

const Goals: React.FC = () => {
   const { claims } = useAuth();
   const isCoordenacao = !!claims?.coordenation;
   const [goals, setGoals] = useState<Goal[]>([]);
   const [units, setUnits] = useState<Unit[]>([]);
   const [professionals, setProfessionals] = useState<Professional[]>([]);

   const [municipalities, setMunicipalities] = useState<any[]>([]);

   const [isSigtapModalOpen, setIsSigtapModalOpen] = useState(false);
   const [sigtapSourceCompetence, setSigtapSourceCompetence] = useState('');
   const [sigtapHistory, setSigtapHistory] = useState<{ id: string, competence: string }[]>([]);

   // Vigency Filter State
   const [vigencyYear, setVigencyYear] = useState<string>(new Date().getFullYear().toString());

   useEffect(() => {
      // Load Sigtap History for the selector
      sigtapService.getCompetenceHistory().then(hist => {
         setSigtapHistory(hist);
         if (hist.length > 0) {
            // Default to most recent
            setSigtapSourceCompetence(hist[0].competence);
         } else {
            // Fallback to current month logic
            const today = new Date();
            const currentComp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
            setSigtapSourceCompetence(currentComp);
         }
      });
   }, []);

   // Form State
   const [formData, setFormData] = useState<Partial<Goal>>({
      goalType: 'municipal',
      competence: '07/2024',
      startMonth: `${new Date().getFullYear()}-01-01`,
      endMonth: `${new Date().getFullYear()}-12-31`,
      unitValue: 0,
      targetQuantity: 0,
      totalValue: 0,
      daysOfWeek: [],
      status: 'pending'
   });

   // State for multi-procedure selection (Municipal Goal)
   // New Selector State
   const [isSigtapSelectorOpen, setIsSigtapSelectorOpen] = useState(false);
   const [sigtapMode, setSigtapMode] = useState<'new' | 'bulk'>('new'); // Track context

   // State for multi-procedure/group selection (Municipal Goal)
   const [selectedGoalsList, setSelectedGoalsList] = useState<{
      code: string;
      name: string;
      type: 'Group' | 'SubGroup' | 'Form' | 'Procedure';
      annualTarget: number;
      monthlyTarget: number;
      unitValue: number;
   }[]>([]);

   const handleConfirmSigtap = (items: { code: string; name: string; type: 'Group' | 'SubGroup' | 'Form' | 'Procedure' }[]) => {
      const newItems = items.map(item => ({
         ...item,
         annualTarget: 0,
         monthlyTarget: 0,
         unitValue: 0
      }));

      if (sigtapMode === 'new') {
         setSelectedGoalsList(prev => {
            // Remove duplicates
            const existingCodes = new Set(prev.map(p => p.code));
            const filtered = newItems.filter(i => !existingCodes.has(i.code));
            return [...prev, ...filtered];
         });
      } else {
         // Bulk Mode
         setBulkEditList(prev => {
            const existingCodes = new Set(prev.map(p => p.procedureCode)); // Bulk list uses procedureCode
            // Map items to Goal structure (partial) for bulk list
            const mappedForBulk = newItems
               .filter(i => !existingCodes.has(i.code))
               .map(i => ({
                  id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  procedureCode: i.code,
                  sigtapTargetType: i.type, // Ensure type is saved
                  procedureName: i.name,
                  description: i.name,
                  annualTargetQuantity: 0,
                  unitValue: 0,
                  municipalityId: prev[0]?.municipalityId || currentBulkMunicipalityId || '',
                  // Inherit from template (first item) or use defaults
                  competence: prev[0]?.competence || new Date().getFullYear().toString(),
                  startMonth: prev[0]?.startMonth || `${new Date().getFullYear()}-01-01`,
                  endMonth: prev[0]?.endMonth || `${new Date().getFullYear()}-12-31`,
                  sigtapSourceCompetence: prev[0]?.sigtapSourceCompetence || undefined,
                  goalType: prev[0]?.goalType || 'municipal',
                  shift: prev[0]?.shift || 'Manhã',
                  status: 'pending',
                  daysOfWeek: prev[0]?.daysOfWeek || [], // Initialize
                  chartData: [], // Initialize empty chart data
                  currentQuantity: 0,
               } as any)); // Type casting for partial goal

            return [...prev, ...mappedForBulk];
         });
      }
      setIsSigtapSelectorOpen(false);
   };
   // Load Data
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
      if (!claims?.entityId) return;

      setIsLoading(true);

      // Async function to handle sequential logic
      const loadData = async () => {
         try {
            // 1. Fetch Goals First
            const goalsData = await goalService.getGoalsForEntityPrivate(claims);

            // 2. Determine Required Production Range
            // We need production from the Minimum Start Year of any ACTIVE goal that touches the current vigency year.
            const targetVigencyYear = parseInt(vigencyYear || new Date().getFullYear().toString());
            let minYear = targetVigencyYear;

            goalsData.forEach(g => {
               // Only consider goals relevant to the selected view
               const startYear = parseInt(getYear(g.startMonth) || '9999');
               const endYear = parseInt(getYear(g.endMonth) || '0');

               // Overlap Check: If goal overlaps with selected year
               if (startYear <= targetVigencyYear && endYear >= targetVigencyYear) {
                  if (startYear < minYear) {
                     minYear = startYear;
                  }
               }
            });

            console.log(`[Goals] Loading production from ${minYear} to ${targetVigencyYear}`);

            // 3. Fetch Production for the Calculated Range
            const productionData = await goalService.getEntityProductionStatsRange(
               claims.entityId,
               minYear.toString(),
               targetVigencyYear.toString(),
               claims.municipalityId // Pass municipality context if exists (SUBSEDE)
            );

            // 4. Merge
            const merged = mergeGoalsWithEntityProduction(goalsData, productionData);
            setGoals(merged);
         } catch (error) {
            console.error("Error loading goals/production:", error);
         } finally {
            setIsLoading(false);
         }
      };

      loadData();

      // Load Units (Static)
      fetchUnitsByEntity(claims.entityId)
         .then(setUnits)
         .catch(console.error);

      // Load Professionals (Static)
      fetchProfessionalsByEntity(claims.entityId)
         .then(setProfessionals)
         .catch(console.error);

      // Load Municipalities Dynamically (Static)
      import('../../services/municipalitiesService').then(({ fetchMunicipalitiesByEntity }) => {
         fetchMunicipalitiesByEntity(claims.entityId).then(setMunicipalities).catch(console.error);
      });
   }, [claims, vigencyYear]);

   // Generate Competences
   const competenceOptions = useMemo(() => {
      const options = [];
      const today = new Date();
      const currentYear = today.getFullYear();

      for (let i = 0; i < 12; i++) {
         const d = new Date(currentYear, i, 1);
         const month = (i + 1).toString().padStart(2, '0');
         options.push(`${month}/${currentYear}`);
      }
      for (let i = 0; i < 12; i++) {
         const d = new Date(currentYear + 1, i, 1);
         const month = (i + 1).toString().padStart(2, '0');
         options.push(`${month}/${currentYear + 1}`);
      }
      return options;
   }, []);

   // Estados de Controle Visual
   // Default to current month/year if possible, or just the first of the options
   const [viewCompetence, setViewCompetence] = useState<string>('');
   const [expandedCompetences, setExpandedCompetences] = useState<Record<string, boolean>>({});

   // Initialize viewCompetence on load (ONLY for Modal default)
   useEffect(() => {
      const today = new Date();
      const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
      const currentComp = `${currentMonth}/${today.getFullYear()}`;
      setViewCompetence(currentComp);
   }, []);


   // Modais
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
   const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

   // --- Export Logic ---
   const [isExportModalOpen, setIsExportModalOpen] = useState(false);
   const [exportData, setExportData] = useState({
      municipalityId: '',
      municipalityName: '',
      competence: '',
      type: 'bpac',
      format: 'pdf'
   });
   const [isGeneratingReport, setIsGeneratingReport] = useState(false);

   const handleOpenExport = (data: { id: string, name: string, competence: string }) => {
      setExportData({
         municipalityId: data.id,
         municipalityName: data.name,
         competence: data.competence || viewCompetence, // Use current default if missing
         type: 'bpac',
         format: 'pdf'
      });
      setIsExportModalOpen(true);
   };

   const handleGenerateReport = async () => {
      if (!exportData.municipalityId || !exportData.competence) return;

      setIsGeneratingReport(true);
      try {
         // Dynamic Import
         const { municipalityReportService } = await import('../../services/municipalityReportService');

         // 1. Fetch Data
         // We need unit IDs for this municipality. 
         const unitIds = units.filter(u => u.municipalityId === exportData.municipalityId).map(u => u.id);

         const records = await municipalityReportService.fetchMunicipalityProduction(
            exportData.municipalityId,
            exportData.competence,
            unitIds,
            claims.entityId
         );

         if (records.length === 0) {
            alert("Nenhum registro encontrado para esta competência.");
            setIsGeneratingReport(false);
            return;
         }

         if (exportData.type === 'bpac') {
            // 2. Aggregate
            const rows = municipalityReportService.aggregateBpaC(records);

            // 3. Generate PDF
            municipalityReportService.generatePdfBpaC(rows, {
               competence: exportData.competence,
               municipalityName: exportData.municipalityName,
               entityName: claims.entityName || 'Entidade'
            });
         } else {
            // BPA-I (Placeholder)
            alert("Relatório BPA-I em breve.");
         }
         setIsExportModalOpen(false);
      } catch (error) {
         console.error(error);
         alert("Erro ao gerar relatório. Verifique os dados.");
      } finally {
         setIsGeneratingReport(false);
      }
   };

   // --- Helpers & Calculators ---
   const toggleCompetence = (comp: string) => {
      setExpandedCompetences(prev => ({ ...prev, [comp]: !prev[comp] }));
   };

   // Interfaces para o novo agrupamento por Município
   interface GroupedUnit {
      unitId: string;
      unitName: string;
      goals: Goal[];
      totalValue: number;
   }

   interface GroupedMunicipality {
      municipalityId: string;
      municipalityName: string;
      globalGoals: Goal[];
      unitGoals: GroupedUnit[];
      totalValue: number;
      totalGoals: number;
   }

   // Agrupa quotas por competência (apenas para seleção se necessário) e estrutura principal por Município
   const groupedGoals = useMemo<GroupedMunicipality[]>(() => {
      // NO FILTERING by View Competence! Show ALL Active Goals.
      const filteredList = goals;

      // 2. Agrupar TUDO por Município
      const byMunicipality: Record<string, { global: Goal[], units: Record<string, Goal[]> }> = {};

      goals.forEach(goal => {
         // --- Vigency Logic ---
         // Check if goal is active within the selected Vigency YEAR
         const startYear = parseInt(getYear(goal.startMonth) || '0');
         const endYear = parseInt(getYear(goal.endMonth) || '9999');
         const selectedYear = parseInt(vigencyYear);

         // If filter year is outside the [Start, End] range, SKIP IT.
         if (selectedYear < startYear || selectedYear > endYear) {
            return;
         }

         let munId = goal.municipalityId;

         // Se não tiver ID do município direto, tenta resolver pela unidade
         if (!munId && goal.unitId) {
            const unit = units.find(u => u.id === goal.unitId);
            if (unit?.municipalityId) {
               munId = unit.municipalityId;
            }
         }

         // Fallback se ainda não tiver ID
         if (!munId) munId = 'unknown';

         if (!byMunicipality[munId]) {
            byMunicipality[munId] = { global: [], units: {} };
         }

         // Determina Tipo do Goal
         let type = goal.goalType;
         if (!type) {
            type = (goal.professionalId === 'team' || !goal.professionalId) ? 'unit' : 'professional';
            if (!goal.unitId) type = 'municipal';
         }

         if (type === 'municipal') {
            byMunicipality[munId].global.push(goal);
         } else {
            // Agrupa por unidade dentro do município
            const uId = goal.unitId || 'unknown-unit';
            if (!byMunicipality[munId].units[uId]) {
               byMunicipality[munId].units[uId] = [];
            }
            byMunicipality[munId].units[uId].push(goal);
         }
      });

      // 3. Transformar em Array Ordenado de Municípios
      const result: GroupedMunicipality[] = Object.keys(byMunicipality).map(munId => {
         // Resolve Nome do Município
         const munName = municipalities.find(m => m.id === munId)?.name || (munId === 'unknown' ? 'Município Desconhecido' : 'Município Global');

         const group = byMunicipality[munId];

         // Process Unit Goals
         const unitGoals: GroupedUnit[] = Object.keys(group.units).map(uId => {
            const uGoals = group.units[uId];
            const uName = units.find(u => u.id === uId)?.name || (uId === 'unknown-unit' ? 'Unidade Desconhecida' : uId);

            return {
               unitId: uId,
               unitName: uName,
               goals: uGoals,
               totalValue: uGoals.reduce((acc, g) => acc + (g.totalValue || 0), 0)
            };
         });

         const totalValueGlobal = group.global.reduce((acc, g) => acc + (g.totalValue || 0), 0);
         const totalValueUnits = unitGoals.reduce((acc, u) => acc + u.totalValue, 0);

         return {
            municipalityId: munId,
            municipalityName: munName,
            globalGoals: group.global,
            unitGoals: unitGoals,
            totalValue: totalValueGlobal + totalValueUnits,
            totalGoals: group.global.length + unitGoals.reduce((acc, u) => acc + u.goals.length, 0)
         };
      });

      return result.sort((a, b) => a.municipalityName.localeCompare(b.municipalityName));
   }, [goals, units, municipalities, vigencyYear]); // Added vigencyYear dependency

   // Filtra profissionais baseado na unidade selecionada no formulário
   const filteredProfessionals = useMemo(() => {
      if (!formData.unitId) return [];
      // Filter professionals that have an assignment to this unit
      return professionals.filter(p =>
         p.assignments?.some(a => a.unitId === formData.unitId) ||
         (p.unitId === formData.unitId) // Legacy fallback
      );
   }, [formData.unitId, professionals]);

   const handleSigtapMultiSelect = (nodes: any[]) => {
      // 1. Deduplicate incoming nodes internally first (in case selector sends duplicates)
      const uniqueIncoming = Array.from(new Map(nodes.map(n => [n.code, n])).values());

      // 2. Filter out already selected items to prevent duplicates in list
      const newItems = uniqueIncoming.filter(n => !selectedGoalsList.some(s => s.code === n.code))
         .map(n => ({
            code: n.code,
            name: n.name,
            type: n.type,
            annualTarget: 0,
            monthlyTarget: 0,
            unitValue: 0
         }));

      if (newItems.length > 0) {
         setSelectedGoalsList(prev => [...prev, ...newItems]);
      }
   };

   // Helper to update temp list
   const updateGoalItem = (code: string, field: 'annual' | 'val', value: string) => {
      const num = parseFloat(value) || 0;
      setSelectedGoalsList(prev => prev.map(item => {
         if (item.code === code) {
            if (field === 'annual') {
               return { ...item, annualTarget: num, monthlyTarget: Math.round(num / 12) };
            } else {
               return { ...item, unitValue: num };
            }
         }
         return item;
      }));
   };

   const updateValues = (field: 'qty' | 'val', value: string) => {
      const numValue = parseFloat(value) || 0;
      setFormData(prev => {
         const newQty = field === 'qty' ? numValue : (prev.targetQuantity || 0);
         const newUnitVal = field === 'val' ? numValue : (prev.unitValue || 0);
         return {
            ...prev,
            targetQuantity: newQty,
            unitValue: newUnitVal,
            totalValue: newQty * newUnitVal
         };
      });
   };

   const toggleDay = (day: string) => {
      setFormData(prev => {
         const currentDays = prev.daysOfWeek || [];
         const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day];
         return { ...prev, daysOfWeek: newDays };
      });
   };

   // --- Bulk Edit Logic ---
   const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
   const [bulkEditList, setBulkEditList] = useState<Goal[]>([]);
   const [currentBulkMunicipalityId, setCurrentBulkMunicipalityId] = useState<string>(''); // For adding new items

   const handleOpenBulkEdit = (group: GroupedMunicipality) => {
      // Flatten goals to edit
      const goalsToEdit = [...group.globalGoals, ...group.unitGoals.flatMap(u => u.goals)];
      setBulkEditList(JSON.parse(JSON.stringify(goalsToEdit))); // Deep copy
      setCurrentBulkMunicipalityId(group.municipalityId);
      setIsBulkEditModalOpen(true);
   };

   const handleBulkEditChange = (id: string, field: 'annualTargetQuantity' | 'unitValue', value: string) => {
      setBulkEditList(prev => prev.map(g => {
         if (g.id === id) {
            const val = parseFloat(value) || 0;
            if (field === 'annualTargetQuantity') {
               return { ...g, annualTargetQuantity: val, targetQuantity: Math.round(val / 12) };
            } else {
               return { ...g, unitValue: val, totalValue: (g.annualTargetQuantity || g.targetQuantity * 12) * val };
            }
         }
         return g;
      }));
   };

   const handleBulkDelete = (id: string) => {
      setBulkEditList(prev => prev.filter(g => g.id !== id));
   };

   const handleBulkSave = async () => {
      try {
         setIsLoading(true);
         const promises = bulkEditList.map(goal => {
            const goalToSave = {
               ...goal,
               totalValue: (goal.annualTargetQuantity || goal.targetQuantity * 12) * (goal.unitValue || 0)
            };
            // Remove temp ID before saving to let backend/service generate a real ID
            if (goalToSave.id && goalToSave.id.startsWith('temp_')) {
               delete (goalToSave as any).id;
            }
            return goalService.saveGoalFromEntity(goalToSave, claims);
         });
         await Promise.all(promises);

         // Refresh
         const currentYear = new Date().getFullYear().toString();
         const [goalsData, productionData] = await Promise.all([
            goalService.getGoalsForEntityPrivate(claims),
            goalService.getEntityProductionStats(claims.entityId, currentYear)
         ]);
         setGoals(mergeGoalsWithEntityProduction(goalsData, productionData));

         setIsBulkEditModalOpen(false);
         setBulkEditList([]);
      } catch (error) {
         console.error('Error batch saving:', error);
         alert('Erro ao salvar edições em lote.');
      } finally {
         setIsLoading(false);
      }
   };

   const resetForm = () => {
      setFormData({
         goalType: 'municipal',
         competence: new Date().getFullYear().toString(),
         startMonth: `${new Date().getFullYear()}-01-01`,
         endMonth: `${new Date().getFullYear()}-12-31`,
         unitValue: 0,
         targetQuantity: 0,
         totalValue: 0,
         daysOfWeek: [],
         shift: 'Manhã',
         status: 'pending',
         id: undefined,
         description: '',
         municipalityId: '',
         unitId: '',
         professionalId: ''
      });
      setSelectedGoalsList([]);
   };

   // Actions
   const handleOpenDetails = (goal: Goal) => {
      setSelectedGoal(goal);
      setIsDetailsModalOpen(true);
   };

   const handleExportMetas = async (group: GroupedMunicipality) => {
      setIsLoading(true);
      try {
         const goalsToExport = [...group.globalGoals, ...group.unitGoals.flatMap(u => u.goals)];

         // Fetch Entity Name and Logo
         let entityName = 'Entidade';
         let logoUrl = undefined;
         let logoBase64 = undefined;

         if (claims?.entityId) {
            const entDoc = await getDoc(doc(db, 'entities', claims.entityId));
            if (entDoc.exists()) {
               const data = entDoc.data();
               entityName = data.name || data.fantasyName || 'Entidade';
               logoUrl = data.logoUrl;
               logoBase64 = data.logoBase64;
            }
         }

         await municipalityReportService.generateGoalsReportPdf(
            goalsToExport,
            {
               municipalityName: group.municipalityName,
               year: viewCompetence.includes('/') ? viewCompetence.split('/')[1] : viewCompetence,
               entityName: entityName,
               logoUrl: logoUrl,
               logoBase64: logoBase64
            }
         );
      } catch (error) {
         console.error('Error exporting metas:', error);
         alert('Erro ao gerar relatório.');
      } finally {
         setIsLoading(false);
      }
   };

   // Renew State
   const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
   const [renewTargetYear, setRenewTargetYear] = useState(String(new Date().getFullYear() + 1));
   const [renewGroup, setRenewGroup] = useState<GroupedMunicipality | null>(null);

   const handleOpenBulkRenew = (group: GroupedMunicipality) => {
      setRenewGroup(group);
      setRenewTargetYear(String(new Date().getFullYear() + 1));
      setIsRenewModalOpen(true);
   };

   const handleConfirmRenew = async () => {
      if (!renewGroup || !renewTargetYear) return;
      setIsLoading(true);
      try {
         const goalsToRenew = [...renewGroup.globalGoals, ...renewGroup.unitGoals.flatMap(u => u.goals)];

         // Duplicate goals for new year
         const promises = goalsToRenew.map(g => {
            // Create new goal object
            const newGoal = {
               ...g,
               id: undefined, // Clear ID to force creation
               competence: `01/${renewTargetYear}`, // Start of new year? Or keep same months? Usually goals are annual. 
               // If structure is annual, we set the competence to the start of the year or use the year as competence string depending on logic.
               // Current logic seems to use month/year or just year? 
               // `Goals.tsx` usually handles competence as View Competence.
               // If I set `01/YYYY`, it might appear in Jan view.
               // Ideally, annual goals are valid for the whole year.
               // Let's assume standard starts at Jan.
               startMonth: `${renewTargetYear}-01-01`,
               endMonth: `${renewTargetYear}-12-31`,
               chartData: [], // Clear progress
               currentQuantity: 0,
               status: 'pending'
            };
            // Remove internal fields
            delete (newGoal as any).chartData;
            delete (newGoal as any).currentQuantity;
            delete (newGoal as any).status;
            delete newGoal.id;

            return goalService.saveGoalFromEntity(newGoal, claims);
         });

         await Promise.all(promises);
         alert(`Renovação concluída para o ano ${renewTargetYear}!`);
         setIsRenewModalOpen(false);
         // Refresh
         // window.location.reload(); or re-fetch
         // We can trigger a refresh if we have a refresh function. 
         // For now, simple alert.
      } catch (error) {
         console.error('Error renewing:', error);
         alert('Erro ao renovar metas.');
      } finally {
         setIsLoading(false);
      }
   };

   // ... existing merge logic ...

   const handleRenew = (goal: Goal) => {
      // Copia dados, zera produção e sugere renovação
      setFormData({
         ...goal,
         id: undefined, // Novo ID será gerado
         currentQuantity: 0,
         status: 'pending',
         description: `${goal.description} (Renovação)`,
      });
      setIsModalOpen(true);
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         if (formData.goalType === 'municipal' && selectedGoalsList.length > 0) {
            // Batch Save
            const promises = selectedGoalsList.map(item => {
               return goalService.saveGoalFromEntity({
                  ...formData,
                  procedureCode: item.code,
                  procedureName: item.name,
                  procedureGroup: item.type === 'Procedure' ? 'Procedimento' : item.type, // Map appropriately
                  targetQuantity: item.monthlyTarget, // Save Monthly as main target for compatibility
                  annualTargetQuantity: item.annualTarget, // Save Annual
                  sigtapTargetType: item.type,
                  sigtapSourceCompetence: sigtapSourceCompetence || undefined, // Save Source SIGTAP Version
                  competence: new Date().getFullYear().toString(), // Save as Annual Goal (YYYY)
                  competenceMonth: new Date().getFullYear().toString(), // Explicitly set Annual
                  unitValue: item.unitValue,
                  totalValue: item.monthlyTarget * item.unitValue,
                  goalType: 'municipal'
               }, claims);
            });
            await Promise.all(promises);
         } else {
            // Single Save
            await goalService.saveGoalFromEntity({
               ...formData,
               sigtapSourceCompetence: sigtapSourceCompetence || undefined,
               competence: new Date().getFullYear().toString(),
               competenceMonth: new Date().getFullYear().toString()
            }, claims);
         }

         // Refresh goals (Optimized)
         const currentYear = new Date().getFullYear().toString();
         const [goalsData, productionData] = await Promise.all([
            goalService.getGoalsForEntityPrivate(claims),
            goalService.getEntityProductionStats(claims.entityId, currentYear)
         ]);
         setGoals(mergeGoalsWithEntityProduction(goalsData, productionData));

         // Expand competence (if used)
         // if (formData.competence) { ... } // Removed

         setIsModalOpen(false);
         setFormData({ ...formData, id: undefined });
         setSelectedGoalsList([]);
      } catch (error) {
         console.error('Error saving goal:', error);
         alert('Erro ao salvar meta. Tente novamente.');
      }
   };

   // Stats Dashboard - SHOW ALL
   const filteredGoalsForStats = goals;
   const totalMeta = filteredGoalsForStats.reduce((acc, g) => acc + (g.annualTargetQuantity || g.targetQuantity * 12), 0);
   const totalRealizado = filteredGoalsForStats.reduce((acc, g) => acc + g.currentQuantity, 0); // currentQuantity is ANNUAL now
   const totalFinanceiro = filteredGoalsForStats.reduce((acc, g) => acc + (g.totalValue || 0) * 12, 0); // Approximation
   const percentage = totalMeta > 0 ? Math.round((totalRealizado / totalMeta) * 100) : 0;

   // Aliases for compatibility with JSX
   const percentualGeral = percentage;
   const valorPactuado = totalFinanceiro;

   // Helper de Renderização
   const StatusBadge = ({ status }: { status: string }) => {
      const statusTooltip: Record<string, string> = {
         pending: "Pendente – 0% realizado",
         risk: "Risco – menos de 40% realizado",
         attention: "Atenção – entre 40% e 70% realizado",
         on_track: "No Caminho – acima de 70% realizado",
         completed: "Concluída – 100% ou mais"
      };

      const statusColor = {
         pending: 'bg-gray-400',
         risk: 'bg-red-500',
         attention: 'bg-yellow-500',
         on_track: 'bg-blue-500',
         completed: 'bg-emerald-600'
      }[status] || 'bg-gray-400';

      const statusText = {
         pending: 'Pendente',
         risk: 'Risco',
         attention: 'Atenção',
         on_track: 'Em Andamento',
         completed: 'Concluída'
      }[status] || 'Pendente';

      return (
         <div className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${statusColor}`} title={statusTooltip[status]}>
            {statusText}
         </div>
      );
   };

   // Render Components
   const renderGoalCard = (goal: Goal) => (
      <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 shadow-sm relative group hover:shadow-md transition-shadow">
         <div className="flex justify-between items-start mb-2">
            <div>
               <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2" title={goal.description}>
                  {goal.description}
               </h4>
               <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                  {goal.procedureName || goal.procedureCode}
               </span>
               {goal.sigtapTargetType && <Badge type="neutral" className="mt-1 text-[10px] py-0">{goal.sigtapTargetType}</Badge>}
            </div>
            <div className="flex flex-col items-end gap-1">
               <StatusBadge status={goal.status} />
               {goal.annualTargetQuantity && (
                  <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1 rounded border border-emerald-100">
                     Meta Anual
                  </span>
               )}
               {/* Multi-Year Badge */}
               {goal.startMonth && goal.endMonth && (parseInt(getYear(goal.startMonth)) < parseInt(getYear(goal.endMonth))) && (
                  <span className="text-[10px] text-purple-600 font-medium bg-purple-50 px-1 rounded border border-purple-100" title={`Vigência: ${getYear(goal.startMonth)} a ${getYear(goal.endMonth)}`}>
                     Plurianual ({getYear(goal.startMonth)}-{getYear(goal.endMonth)})
                  </span>
               )}
            </div>
         </div>

         <div className="space-y-3 mt-3">
            {/* Progress Bar (Annual) */}
            <div>
               <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Progresso Anual</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                     {goal.currentQuantity} / {goal.annualTargetQuantity || (goal.targetQuantity * 12)}
                  </span>
               </div>
               <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                     className={`h-2 rounded-full transition-all duration-500 ${goal.status === 'on_track' || goal.status === 'completed' ? 'bg-emerald-500' :
                        goal.status === 'risk' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}
                     style={{ width: `${Math.min((goal.currentQuantity / (goal.annualTargetQuantity || goal.targetQuantity * 12)) * 100, 100)}%` }}
                  ></div>
               </div>
            </div>

            {/* Monthly Evolution Chart */}
            {goal.chartData && <MiniBarChart data={goal.chartData} />}

            <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-50 dark:border-gray-700">
               <div>
                  Média Mensal: <strong>{Math.round(goal.currentQuantity / 12)}</strong>
               </div>
               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenDetails(goal)} className="text-blue-600 hover:text-blue-800" title="Ver Detalhes"><Eye size={16} /></button>
                  {!isCoordenacao && <button onClick={() => handleRenew(goal)} className="text-emerald-600 hover:text-emerald-800" title="Renovar/Duplicar"><RefreshCw size={16} /></button>}
               </div>
            </div>
         </div>
      </div>
   );

   // --- Evolution Modal Logic ---
   const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false);
   const [evolutionData, setEvolutionData] = useState<{ title: string, series: { name: string, data: number[] }[], categories: string[] } | null>(null);

   const handleOpenEvolution = (group: GroupedMunicipality) => {
      // Aggregate data for the municipality
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const aggregatedData = new Array(12).fill(0);

      // Combine global and unit goals
      const allGoals = [...group.globalGoals, ...group.unitGoals.flatMap(u => u.goals)];

      let totalAggregated = 0;
      allGoals.forEach(goal => {
         if (goal.chartData && Array.isArray(goal.chartData)) {
            goal.chartData.forEach((d, index) => {
               const val = Number(d.value || 0);
               if (!isNaN(val) && index < 12) {
                  aggregatedData[index] += val;
                  totalAggregated += val;
               }
            });
         }
      });

      setEvolutionData({
         title: `Evolução Mensal - ${group.municipalityName}`,
         categories: months,
         series: [{
            name: 'Produção Realizada',
            data: aggregatedData
         }]
      });
      setIsEvolutionModalOpen(true);
   };

   const [previewData, setPreviewData] = useState<any[]>([]); // Records for preview
   const [isPreviewing, setIsPreviewing] = useState(false);

   const getMunicipalityUnitIds = () => {
      const id = exportData.municipalityId;
      if (!id) return [];
      // Find units matching this municipality
      // Note: units state is available
      return units.filter(u => u.municipalityId === id).map(u => u.id);
   };

   const handlePreviewReport = async () => {
      if (!exportData.municipalityId || !exportData.competence) return;

      setIsGeneratingReport(true);
      try {
         const { municipalityReportService } = await import('../../services/municipalityReportService');

         const unitIds = getMunicipalityUnitIds();
         // Pass entityId from claims
         const entityId = claims?.entityId;

         if (!entityId) {
            alert('Erro: ID da Entidade não encontrado.');
            return;
         }

         const records = await municipalityReportService.fetchMunicipalityProduction(
            exportData.municipalityId,
            exportData.competence,
            unitIds,
            entityId
         );

         if (records.length === 0) {
            alert('Nenhum registro de produção encontrado para esta competência.');
            setIsGeneratingReport(false);
            return;
         }

         if (exportData.type === 'bpac') {
            const rows = municipalityReportService.aggregateBpaC(records);
            setPreviewData(rows);
            setIsPreviewing(true);
         } else if (exportData.type === 'bpai') {
            const rows = municipalityReportService.prepareBpaIData(records);
            setPreviewData(rows);
            setIsPreviewing(true);
         }

      } catch (error) {
         console.error('Error generating preview:', error);
         alert('Erro ao gerar pré-visualização.');
      } finally {
         setIsGeneratingReport(false); // Stop loading, show preview
      }
   };

   const handleConfirmDownload = async () => {
      setIsGeneratingReport(true);
      try {
         const { municipalityReportService } = await import('../../services/municipalityReportService');

         let entityName = claims.entityName || 'Entidade';

         if (claims.entityId) {
            try {
               const entityRef = doc(db, 'entities', claims.entityId);
               const entitySnap = await getDoc(entityRef);
               if (entitySnap.exists()) {
                  entityName = entitySnap.data().name || entityName;
               }
            } catch (err) {
               console.error("Error fetching entity name:", err);
            }
         }

         if (previewData.length > 0) {
            if (exportData.type === 'bpac') {
               if (exportData.format === 'pdf') {
                  municipalityReportService.generatePdfBpaC(previewData, {
                     competence: exportData.competence,
                     municipalityName: exportData.municipalityName,
                     entityName: entityName
                  });
               } else {
                  municipalityReportService.generateXlsxBpaC(previewData, {
                     competence: exportData.competence,
                     municipalityName: exportData.municipalityName
                  });
               }
            } else {
               // BPA-I
               if (exportData.format === 'pdf') {
                  municipalityReportService.generatePdfBpaI(previewData, {
                     competence: exportData.competence,
                     municipalityName: exportData.municipalityName,
                     entityName: entityName
                  });
               } else {
                  municipalityReportService.generateXlsxBpaI(previewData, {
                     competence: exportData.competence,
                     municipalityName: exportData.municipalityName
                  });
               }
            }
         } else {
            await handleGenerateReport();
         }

         setIsExportModalOpen(false);
         setIsPreviewing(false);
         setPreviewData([]);
      } catch (error) {
         console.error('Error downloading:', error);
         alert('Erro ao baixar arquivo.');
      } finally {
         setIsGeneratingReport(false);
      }
   };

   const renderExportModal = () => (
      <Modal
         isOpen={isExportModalOpen}
         onClose={() => {
            setIsExportModalOpen(false);
            setIsPreviewing(false);
            setPreviewData([]);
         }}
         title="Exportar Relatório BPA"
         maxWidth={isPreviewing ? "7xl" : "md"} // Wider for preview
      >
         {isPreviewing ? (
            <div className="space-y-6">
               <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <h4 className="font-bold text-gray-900 dark:text-white uppercase">Pré-visualização {exportData.type === 'bpac' ? 'BPA-C' : 'BPA-I'}</h4>
                        <p className="text-sm text-gray-500">{exportData.municipalityName} • {exportData.competence}</p>
                     </div>
                     <Badge variant="success" className="bg-emerald-100 text-emerald-800">
                        {previewData.length} Registros
                     </Badge>
                  </div>

                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                     <table className="w-full text-sm text-left">
                        <thead className="text-xs text-white uppercase bg-emerald-600 sticky top-0 z-10">
                           {exportData.type === 'bpac' ? (
                              <tr>
                                 <th className="px-4 py-3 w-16 text-center">Seq</th>
                                 <th className="px-4 py-3">Profissional</th>
                                 <th className="px-4 py-3 w-24">CBO</th>
                                 <th className="px-4 py-3 w-24">Código</th>
                                 <th className="px-4 py-3">Procedimento</th>
                                 <th className="px-4 py-3 w-20 text-center">Idade</th>
                                 <th className="px-4 py-3 w-20 text-center">Qtd</th>
                              </tr>
                           ) : (
                              <tr>
                                 <th className="px-4 py-3">Profissional</th>
                                 <th className="px-4 py-3 w-24">Data</th>
                                 <th className="px-4 py-3 w-32">CNS</th>
                                 <th className="px-4 py-3">Paciente</th>
                                 <th className="px-4 py-3 w-24">Código</th>
                                 <th className="px-4 py-3 w-20">CBO</th>
                                 <th className="px-4 py-3 w-20">CID</th>
                                 <th className="px-4 py-3 w-16 text-center">Idade</th>
                                 <th className="px-4 py-3 w-16 text-center">Qtd</th>
                              </tr>
                           )}
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                           {previewData.map((row: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                 {exportData.type === 'bpac' ? (
                                    <>
                                       <td className="px-4 py-2 text-center text-gray-400 font-mono">{row.seq}</td>
                                       <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-200">{row.professionalName}</td>
                                       <td className="px-4 py-2 text-gray-500 text-xs">{row.cbo}</td>
                                       <td className="px-4 py-2 text-gray-500 font-mono text-xs">{row.procedureCode}</td>
                                       <td className="px-4 py-2 text-gray-600 dark:text-gray-300 text-xs truncate max-w-[200px]" title={row.procedureName}>
                                          {row.procedureName}
                                       </td>
                                       <td className="px-4 py-2 text-center text-gray-500">{row.age}</td>
                                       <td className="px-4 py-2 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10">
                                          {row.quantity}
                                       </td>
                                    </>
                                 ) : (
                                    <>
                                       <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-200 text-xs">{row.professionalName}</td>
                                       <td className="px-4 py-2 text-gray-500 text-xs">{row.attendanceDate}</td>
                                       <td className="px-4 py-2 text-gray-500 font-mono text-xs">{row.cns}</td>
                                       <td className="px-4 py-2 text-gray-900 dark:text-gray-200 text-xs truncate max-w-[150px]" title={row.patientName}>{row.patientName}</td>
                                       <td className="px-4 py-2 text-gray-500 font-mono text-xs">{row.procedureCode}</td>
                                       <td className="px-4 py-2 text-gray-500 text-xs">{row.cbo}</td>
                                       <td className="px-4 py-2 text-gray-500 text-xs">{row.cid}</td>
                                       <td className="px-4 py-2 text-center text-gray-500 text-xs">{row.age}</td>
                                       <td className="px-4 py-2 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 text-xs">
                                          {row.quantity}
                                       </td>
                                    </>
                                 )}
                              </tr>
                           ))}
                        </tbody>
                        <tfoot className="bg-gray-100 dark:bg-gray-700 font-semibold text-gray-900 dark:text-white sticky bottom-0">
                           <tr>
                              <td colSpan={exportData.type === 'bpac' ? 6 : 8} className="px-4 py-3 text-right">TOTAL</td>
                              <td className="px-4 py-3 text-center text-emerald-600 dark:text-emerald-400">
                                 {previewData.reduce((acc, curr) => acc + curr.quantity, 0)}
                              </td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
               </div>

               <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setIsPreviewing(false)}>
                     <ChevronDown className="w-4 h-4 mr-2 rotate-90" /> Voltar
                  </Button>
                  <Button onClick={handleConfirmDownload} disabled={isGeneratingReport} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                     {isGeneratingReport ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando PDF...</>
                     ) : (
                        <><Download className="w-4 h-4 mr-2" /> Confirmar Download ({exportData.format.toUpperCase()})</>
                     )}
                  </Button>
               </div>
            </div>
         ) : (
            <div className="space-y-6">
               <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                     <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                     <h4 className="font-bold text-gray-900 dark:text-white">{exportData.municipalityName}</h4>
                     <p className="text-xs text-gray-500 dark:text-gray-400">Exportando produção consolidada</p>
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Competência</label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white font-medium">
                     {exportData.competence}
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Relatório</label>
                  <div className="grid grid-cols-2 gap-3">
                     <button
                        type="button"
                        onClick={() => setExportData({ ...exportData, type: 'bpac' })}
                        className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${exportData.type === 'bpac'
                           ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                           : 'border-gray-200 text-gray-600 hover:border-gray-300'
                           }`}
                     >
                        BPA-C (Consolidado)
                     </button>
                     <button
                        type="button"
                        onClick={() => setExportData({ ...exportData, type: 'bpai' })}
                        className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${exportData.type === 'bpai'
                           ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                           : 'border-gray-200 text-gray-600 hover:border-gray-300'
                           }`}
                     >
                        BPA-I (Individualizado)
                     </button>
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Formato</label>
                  <div className="flex gap-3">
                     <button
                        onClick={() => setExportData({ ...exportData, format: 'pdf' })}
                        className={`flex-1 p-2 rounded border text-sm ${exportData.format === 'pdf' ? 'bg-gray-800 text-white' : 'bg-white border-gray-300'}`}
                     >
                        PDF
                     </button>
                     <button
                        onClick={() => setExportData({ ...exportData, format: 'xlsx' })}
                        className={`flex-1 p-2 rounded border text-sm ${exportData.format === 'xlsx' ? 'bg-green-700 text-white' : 'bg-white border-gray-300'}`}
                     >
                        Excel
                     </button>
                  </div>
               </div>

               <div className="flex justify-end pt-4">
                  <Button
                     onClick={exportData.format === 'pdf' ? handlePreviewReport : handleGenerateReport}
                     disabled={isGeneratingReport}
                  >
                     {isGeneratingReport ? 'Processando...' : (exportData.format === 'pdf' ? 'Visualizar' : 'Baixar Arquivo')}
                  </Button>
               </div>
            </div>
         )}
      </Modal>
   );

   return (
      <div className="space-y-6">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
               <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Metas Globais</h1>
               <p className="text-gray-500 dark:text-gray-400 mt-1">Pactuação e histórico de produção anual.</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center px-3 h-10 shadow-sm">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-500 mr-2">Vigência:</span>
                  <select
                     value={vigencyYear}
                     onChange={(e) => setVigencyYear(e.target.value)}
                     className="bg-transparent text-sm font-bold text-gray-900 dark:text-gray-100 outline-none cursor-pointer"
                  >
                     {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                     ))}
                  </select>
               </div>
               {(!isCoordenacao) && (
                  <Button
                     variant="secondary"
                     className="flex items-center gap-2 h-10 shadow-sm border border-gray-200 dark:border-gray-700"
                     onClick={() => {
                        setFormData({
                           competence: viewCompetence, // Use current view as default
                           unitValue: 0,
                           targetQuantity: 0,
                           totalValue: 0,
                           daysOfWeek: [],
                           shift: 'Manhã',
                           status: 'pending',
                           goalType: 'municipal'
                        });
                        resetForm();
                        setIsModalOpen(true);
                     }}
                  >
                     <Plus className="w-4 h-4" /> Nova Pactuação
                  </Button>
               )}
            </div>
         </div>

         {/* Dashboard KPI */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white dark:bg-gray-800 border-l-4 border-emerald-500">
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Atingimento Global</p>
                     <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{percentualGeral}%</h3>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                     <BarChart2 className="w-6 h-6 text-emerald-600" />
                  </div>
               </div>
               <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${percentualGeral}%` }}></div>
               </div>
               <p className="text-xs text-gray-400 mt-2">{totalRealizado} realizados de {totalMeta} previstos</p>
            </Card>

            <Card className="p-6 bg-white dark:bg-gray-800 border-l-4 border-blue-500">
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Pactuado (Total)</p>
                     <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorPactuado)}
                     </h3>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                     <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
               </div>
               <div className="mt-4 flex items-center text-sm text-blue-600 font-medium">
                  <Target className="w-4 h-4 mr-1" /> {goals.length} metas ativas
               </div>
            </Card>

            <Card className="p-6 bg-white dark:bg-gray-800 border-l-4 border-amber-500">
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Metas em Risco</p>
                     <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                        {goals.filter(g => g.status === 'risk').length}
                     </h3>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                     <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
               </div>
               <p className="text-xs text-gray-500 mt-4">Abaixo de 70% do esperado para o período.</p>
            </Card>
         </div>

         {/* Listagem Agrupada */}
         <div className="space-y-6">
            {groupedGoals.map((munGroup) => {
               return (
                  <div key={munGroup.municipalityId} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm animate-in fade-in duration-500">
                     {/* Header do Município (Collapsible) */}
                     <div
                        className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                     >
                        <div
                           className="flex items-center gap-3 flex-1 cursor-pointer"
                           onClick={() => toggleCompetence(munGroup.municipalityId)}
                        >
                           <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5" />
                           </div>
                           <div>
                              <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{munGroup.municipalityName}</h2>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                 {munGroup.totalGoals} metas pactuadas • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(munGroup.totalValue)}
                              </p>
                           </div>
                        </div>

                        <div className="flex items-center gap-3">
                           <Button
                              variant="outline"
                              className="h-9 px-3 text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 handleOpenEvolution(munGroup);
                              }}
                           >
                              <BarChart2 className="w-4 h-4 mr-2 text-emerald-500" />
                              Evolução
                           </Button>
                           {!isCoordenacao && (
                              <Button
                                 variant="outline"
                                 className="h-9 px-3 text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenBulkEdit(munGroup);
                                 }}
                              >
                                 <Edit2 className="w-4 h-4 mr-2 text-blue-500" />
                                 Editar
                              </Button>
                           )}

                           <Button
                              variant="outline"
                              className="h-9 px-3 text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 handleExportMetas(munGroup);
                              }}
                           >
                              <FileText className="w-4 h-4 mr-2 text-purple-600" />
                              Exportar Metas
                           </Button>
                           {!isCoordenacao && (
                              <Button
                                 variant="outline"
                                 className="h-9 w-9 p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                 title="Renovar Pactuação"
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenBulkRenew(munGroup);
                                 }}
                              >
                                 <RefreshCw className="w-4 h-4 text-emerald-600" />
                              </Button>
                           )}
                           <Button
                              variant="outline"
                              className="h-9 w-9 p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 opacity-50 cursor-not-allowed"
                              title="Excluir Pactuação (Em Breve)"
                              disabled
                              onClick={(e) => {
                                 e.stopPropagation();
                                 // handleOpenBulkDelete(munGroup);
                              }}
                           >
                              <Trash2 className="w-4 h-4 text-red-500" />
                           </Button>
                           {expandedCompetences[munGroup.municipalityId]
                              ? <ChevronDown className="w-5 h-5 text-gray-400 transform rotate-180 cursor-pointer" onClick={() => toggleCompetence(munGroup.municipalityId)} />
                              : <ChevronDown className="w-5 h-5 text-gray-400 cursor-pointer" onClick={() => toggleCompetence(munGroup.municipalityId)} />
                           }
                        </div>
                     </div>

                     {/* Conteúdo Expansível do Município */}
                     <AnimatePresence>
                        {expandedCompetences[munGroup.municipalityId] && (
                           <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                           >
                              <div className="p-6 space-y-8 border-t border-gray-100 dark:border-gray-700">
                                 {/* Seção de Metas Globais */}
                                 {munGroup.globalGoals.length > 0 && (
                                    <div className="animate-in slide-in-from-left duration-300">
                                       <h3 className="flex items-center text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                                          <Building2 className="w-4 h-4 mr-2 text-indigo-500" />
                                          Metas Globais
                                       </h3>
                                       <div className="space-y-3 pl-2 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                                          {munGroup.globalGoals.map(goal => renderGoalCard(goal))}
                                       </div>
                                    </div>
                                 )}

                                 {/* Seção de Metas por Unidade */}
                                 {munGroup.unitGoals.length > 0 && (
                                    <div className="animate-in slide-in-from-left duration-500 delay-100">
                                       <h3 className="flex items-center text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                                          <Building2 className="w-4 h-4 mr-2 text-emerald-500" />
                                          Metas por Unidade
                                       </h3>
                                       <div className="space-y-6">
                                          {munGroup.unitGoals.map(unitGroup => (
                                             <div key={unitGroup.unitId} className="pl-4 border-l-2 border-emerald-100 dark:border-emerald-900/50">
                                                <div className="flex items-center justify-between mb-3 bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded-lg">
                                                   <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                      <div className='w-2 h-2 rounded-full bg-emerald-500'></div>
                                                      {unitGroup.unitName}
                                                   </h4>
                                                   <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm border border-emerald-100 dark:border-emerald-900">
                                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(unitGroup.totalValue)}
                                                   </span>
                                                </div>
                                                <div className="space-y-3">
                                                   {unitGroup.goals.map(goal => renderGoalCard(goal))}
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    </div>
                                 )}

                                 {munGroup.globalGoals.length === 0 && munGroup.unitGoals.length === 0 && (
                                    <p className="text-center text-gray-400 italic py-4">Nenhuma meta encontrada para este município.</p>
                                 )}
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </div>
               );
            })}
         </div>

         {/* Modal de Detalhes */}
         <Modal
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            title="Detalhes da Pactuação"
         >
            {selectedGoal && (
               <div className="space-y-6">
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                     <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Exercício</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                           {selectedGoal.competence ? selectedGoal.competence.split('/')[1] : new Date().getFullYear()}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                           SIGTAP Base: {selectedGoal.sigtapSourceCompetence || selectedGoal.competence}
                        </p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase font-bold">Meta Anual</p>
                        <p className="text-lg font-bold text-emerald-600">
                           {selectedGoal.annualTargetQuantity ? selectedGoal.annualTargetQuantity : selectedGoal.targetQuantity * 12}
                        </p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center mb-3">
                           <FileText className="w-4 h-4 mr-2 text-blue-600" /> Procedimento
                        </h4>
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                           <p><span className="font-medium">Descrição:</span> {selectedGoal.description}</p>
                           <p><span className="font-medium">Código:</span> {selectedGoal.procedureCode}</p>
                           <p><span className="font-medium">SIGTAP:</span> {selectedGoal.procedureName}</p>
                        </div>
                     </div>
                     <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center mb-3">
                           <Building2 className="w-4 h-4 mr-2 text-blue-600" /> Execução
                        </h4>
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                           <p><span className="font-medium">Unidade:</span> {units.find(u => u.id === selectedGoal.unitId)?.name}</p>
                           <p><span className="font-medium">Responsável:</span> {professionals.find(p => p.id === selectedGoal.professionalId)?.name}</p>
                           <p><span className="font-medium">Turno:</span> {selectedGoal.shift}</p>
                           <p><span className="font-medium">Dias:</span> {selectedGoal.daysOfWeek?.join(', ') || 'N/A'}</p>
                        </div>
                     </div>
                  </div>

                  {/* ... existing imports ... */}

                  {/* ... inside Details Modal ... */}

                  <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                     <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Estrutura SIGTAP & Compatibilidades</h4>
                     <GoalHierarchyExplorer goal={selectedGoal} />
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                     <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Progresso</h4>

                     <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4">
                        <div className="flex justify-between mb-2 text-sm">
                           <span>Meta: <strong>{selectedGoal.targetQuantity}</strong></span>
                           <span>Realizado: <strong>{selectedGoal.currentQuantity}</strong></span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4">
                           <div
                              className="h-4 rounded-full bg-emerald-500 text-xs text-white flex items-center justify-center"
                              style={{ width: `${Math.min((selectedGoal.currentQuantity / selectedGoal.targetQuantity) * 100, 100)}%` }}
                           >
                              {Math.round((selectedGoal.currentQuantity / selectedGoal.targetQuantity) * 100)}%
                           </div>
                        </div>
                     </div>
                     {selectedGoal.observations && (
                        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 border border-yellow-100 dark:border-yellow-800">
                           <strong>Obs:</strong> {selectedGoal.observations}
                        </div>
                     )}
                  </div>

                  <div className="flex justify-end pt-2">
                     <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>Fechar</Button>
                  </div>
               </div>
            )}
         </Modal>

         {/* Modal de Cadastro em 4 Etapas */}
         <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={formData.id ? "Editar Pactuação" : "Nova Pactuação de Meta"}
         >
            <form onSubmit={handleSubmit} className="space-y-6">

               {/* 1. Identificação */}
               <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                     <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-2 text-xs">1</div>
                     Identificação
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Pactuação</label>
                        <div className="flex gap-4">
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                 type="radio"
                                 name="goalType"
                                 value="municipal"
                                 checked={formData.goalType === 'municipal'}
                                 onChange={() => setFormData(prev => ({ ...prev, goalType: 'municipal', unitId: '', professionalId: '', municipalityId: '' }))}
                                 className="text-emerald-600"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Municipal (Global)</span>
                           </label>
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                 type="radio"
                                 name="goalType"
                                 value="unit"
                                 checked={formData.goalType === 'unit' || formData.goalType === 'professional'}
                                 onChange={() => setFormData(prev => ({ ...prev, goalType: 'unit' }))}
                                 className="text-emerald-600"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Por Unidade / Profissional</span>
                           </label>
                        </div>
                     </div>



                     <div className={formData.goalType === 'municipal' ? "md:col-span-2" : ""}>
                        <Input
                           label="Descrição da Meta"
                           placeholder="Ex: Consultas de Hiperdia"
                           value={formData.description || ''}
                           onChange={e => setFormData({ ...formData, description: e.target.value })}
                           required
                        />
                     </div>

                     {/* Municipality Selector for Municipal/Global Goals */}
                     {formData.goalType === 'municipal' && (
                        <div className="md:col-span-2">
                           <Select
                              label="Município Vinculado"
                              value={formData.municipalityId || ''}
                              onChange={e => setFormData({ ...formData, municipalityId: e.target.value })}
                              required
                           >
                              <option value="">Selecione o Município...</option>
                              {municipalities.map(m => (
                                 <option key={m.id} value={m.id}>{m.name} ({m.uf})</option>
                              ))}
                           </Select>
                        </div>
                     )}

                     {formData.goalType !== 'municipal' && (
                        <>
                           <Select
                              label="Unidade de Saúde"
                              value={formData.unitId || ''}
                              onChange={e => {
                                 const selectedUnit = units.find(u => u.id === e.target.value);
                                 setFormData({
                                    ...formData,
                                    unitId: e.target.value,
                                    municipalityId: selectedUnit?.municipalityId,
                                    professionalId: '',
                                    goalType: 'unit'
                                 });
                              }}
                              required
                           >
                              <option value="">Selecione a Unidade...</option>
                              {units.map(u => (
                                 <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                           </Select>
                           <Select
                              label="Profissional Responsável"
                              value={formData.professionalId || ''}
                              onChange={e => setFormData({
                                 ...formData,
                                 professionalId: e.target.value,
                                 goalType: e.target.value ? 'professional' : 'unit'
                              })}
                              disabled={!formData.unitId}
                           >
                              <option value="">Todos / Equipe</option>
                              {filteredProfessionals.map(p => (
                                 <option key={p.id} value={p.id}>{p.name} ({p.occupation})</option>
                              ))}
                           </Select>
                        </>
                     )}
                  </div>
               </div>


               {/* 2. Período da Meta */}
               <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                     <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 text-xs">2</div>
                     Período de Vigência
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                     <Input
                        type="date"
                        label="Início da Vigência"
                        value={formData.startMonth || ''}
                        onChange={e => setFormData({ ...formData, startMonth: e.target.value })}
                        required
                        className="dark:text-white"
                     />
                     <Input
                        type="date"
                        label="Fim da Vigência"
                        value={formData.endMonth || ''}
                        onChange={e => setFormData({ ...formData, endMonth: e.target.value })}
                        required
                        className="dark:text-white"
                     />
                  </div>
               </div>

               {/* 3. Metas (Renamed) */}
               <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-between">
                     <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 text-xs">3</div>
                        Metas
                     </div>
                     <div className="flex gap-2 items-center">
                        <select
                           value={sigtapSourceCompetence}
                           onChange={(e) => setSigtapSourceCompetence(e.target.value)}
                           className="h-8 text-xs border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                           title="Competência da Tabela SIGTAP"
                        >
                           {sigtapHistory.map(h => {
                              // Format YYYYMM to MM/YYYY
                              const year = h.competence.substring(0, 4);
                              const month = h.competence.substring(4, 6);
                              return <option key={h.id} value={h.competence}>{month}/{year}</option>
                           })}
                           {/* Fallback if list empty or custom needed */}
                           {!sigtapHistory.some(h => h.competence === sigtapSourceCompetence) && sigtapSourceCompetence && (
                              <option value={sigtapSourceCompetence}>{sigtapSourceCompetence}</option>
                           )}
                        </select>
                        <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => setIsSigtapSelectorOpen(true)}>
                           <Search className="w-3 h-3 mr-1" /> Vincular SIGTAP
                        </Button>
                     </div>
                  </h4>



                  {/* List of Selected Goals (Municipal Mode) */}
                  {formData.goalType === 'municipal' ? (
                     selectedGoalsList.length > 0 ? (
                        <div className="space-y-3">
                           <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Itens Selecionados para Pactuação</p>
                           {selectedGoalsList.map((item) => (
                              <div key={item.code} className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 text-sm shadow-sm">
                                 <div className="flex justify-between items-start mb-3">
                                    <div>
                                       <div className="flex items-center gap-2 mb-1">
                                          <Badge type="neutral" className="text-[10px] py-0">{item.type}</Badge>
                                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{item.code}</span>
                                       </div>
                                       <p className="font-bold text-gray-800 dark:text-gray-200">{item.name}</p>
                                    </div>
                                    <button
                                       type="button"
                                       onClick={() => setSelectedGoalsList(prev => prev.filter(x => x.code !== item.code))}
                                       className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                                       title="Remover"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>

                                 <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded">
                                    <div>
                                       <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Meta Anual</label>
                                       <input
                                          type="number"
                                          className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                          value={item.annualTarget || ''}
                                          onChange={e => updateGoalItem(item.code, 'annual', e.target.value)}
                                          placeholder="0"
                                       />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Média Mensal</label>
                                       <div className="w-full text-sm bg-gray-200 dark:bg-gray-700 rounded px-2 py-1 text-gray-600 dark:text-gray-300 font-mono">
                                          {item.monthlyTarget}
                                       </div>
                                    </div>
                                    <div>
                                       <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Valor Unit. (R$)</label>
                                       <input
                                          type="number"
                                          step="0.01"
                                          className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                          value={item.unitValue || ''}
                                          onChange={e => updateGoalItem(item.code, 'val', e.target.value)}
                                          placeholder="0.00"
                                       />
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                           <p className="text-gray-500 text-sm">Nenhuma meta selecionada.</p>
                           <p className="text-xs text-gray-400">Clique em "Vincular SIGTAP" para adicionar procedimentos ou grupos.</p>
                        </div>
                     )
                  ) : (
                     // Placeholder for other goal types if needed, or empty
                     <></>
                  )}
               </div>

               {/* 3. Critérios e Observações */}
               <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                     <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-2 text-xs">3</div>
                     Critérios e Observações
                  </h4>
                  <div className="space-y-4">
                     {formData.goalType !== 'municipal' && (
                        <>
                           <Select
                              label="Turno de Atendimento"
                              value={formData.shift}
                              onChange={e => setFormData({ ...formData, shift: e.target.value as any })}
                           >
                              <option value="Manhã">Manhã</option>
                              <option value="Tarde">Tarde</option>
                              <option value="Noite">Noite</option>
                              <option value="Integral">Integral</option>
                           </Select>

                           <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dias da Semana</label>
                              <div className="flex gap-2 flex-wrap">
                                 {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map(day => (
                                    <button
                                       key={day}
                                       type="button"
                                       onClick={() => toggleDay(day)}
                                       className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors ${formData.daysOfWeek?.includes(day)
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                          }`}
                                    >
                                       {day}
                                    </button>
                                 ))}
                              </div>
                           </div>
                        </>
                     )}

                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                        <textarea
                           className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-20"
                           placeholder="Detalhes adicionais sobre a meta..."
                           value={formData.observations || ''}
                           onChange={e => setFormData({ ...formData, observations: e.target.value })}
                        />
                     </div>
                  </div>
               </div>

               <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" variant="secondary">Salvar Pactuação</Button>
               </div>
            </form>
         </Modal>



         {/* Export Modal */}
         {renderExportModal()}

         {/* Evolution Modal */}
         <Modal
            isOpen={isEvolutionModalOpen}
            onClose={() => setIsEvolutionModalOpen(false)}
            title={evolutionData?.title || "Evolução da Produção"}
         >
            {evolutionData && (
               <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex justify-between items-center">
                     <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{evolutionData.title}</h3>
                        <p className="text-sm text-gray-500">Produção acumulada mês a mês.</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs font-bold uppercase text-gray-500">Total Acumulado</p>
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                           {evolutionData.series[0].data.reduce((a, b) => a + b, 0).toLocaleString()}
                        </p>
                     </div>
                  </div>

                  <div className="h-64 flex items-end justify-between gap-2 px-2 border-b border-gray-200 dark:border-gray-600 pb-2">
                     {evolutionData.series[0].data.map((value, index) => {
                        const maxVal = Math.max(...evolutionData.series[0].data, 1);
                        const heightPct = (value / maxVal) * 100;
                        return (
                           <div key={index} className="flex flex-col items-center flex-1 h-full justify-end group">
                              <div className="relative w-full flex-1 flex items-end justify-center">
                                 <div className="relative w-full flex justify-center h-full items-end">
                                    <span className="opacity-100 absolute bottom-full mb-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-300 transition-opacity whitespace-nowrap z-10">
                                       {value > 0 ? value : ''}
                                    </span>
                                    <div
                                       className="w-full mx-0.5 bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-all cursor-crosshair relative"
                                       style={{ height: `${Math.max(heightPct, 4)}%` }}
                                    ></div>
                                 </div>
                              </div>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-medium truncate w-full text-center">
                                 {evolutionData.categories[index]}
                              </span>
                           </div>
                        );
                     })}
                  </div>

                  <div className="flex justify-end">
                     <Button variant="outline" onClick={() => setIsEvolutionModalOpen(false)}>Fechar</Button>
                  </div>
               </div>
            )}
         </Modal>

         {/* Bulk Edit Modal */}
         <Modal
            isOpen={isBulkEditModalOpen}
            onClose={() => setIsBulkEditModalOpen(false)}
            title="Editar Metas Pactuadas"
            size="3xl"
         >
            <div className="space-y-4">
               <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                     <h4 className="text-sm font-bold text-blue-800 dark:text-blue-200">Edição em Lote</h4>
                     <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                        Ajuste os quantitativos anuais e valores unitários das metas deste município. Clique em Salvar para aplicar todas as alterações.
                     </p>
                  </div>
               </div>

               <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
                  {bulkEditList.map(item => (
                     <div key={item.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                              {item.sigtapTargetType && <Badge type="neutral" className="text-[10px] py-0">{item.sigtapTargetType}</Badge>}
                              <span className="font-mono text-xs text-gray-500">{item.procedureCode}</span>
                           </div>
                           <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1" title={item.description || item.procedureName}>
                              {item.description || item.procedureName}
                           </p>
                           <p className="text-xs text-gray-500 mt-0.5">{item.procedureName}</p>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                           <div className="w-24">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Meta Anual</label>
                              <input
                                 type="number"
                                 className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                 value={item.annualTargetQuantity || (item.targetQuantity * 12)}
                                 onChange={(e) => item.id && handleBulkEditChange(item.id, 'annualTargetQuantity', e.target.value)}
                              />
                           </div>
                           <div className="w-24">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Valor Unit.</label>
                              <input
                                 type="number"
                                 step="0.01"
                                 className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                 value={item.unitValue || 0}
                                 onChange={(e) => item.id && handleBulkEditChange(item.id, 'unitValue', e.target.value)}
                              />
                           </div>
                           <div className="w-8 flex items-end justify-center pb-1">
                              <button onClick={() => item.id && handleBulkDelete(item.id)} className="text-red-400 hover:text-red-600" title="Remover da lista de edição (Visual apenas)"><Trash2 size={16} /></button>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>

               {/* Bulk Edit Modal Footer */}
               <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <Button
                     variant="secondary"
                     className="flex items-center gap-2"
                     onClick={() => {
                        setSigtapMode('bulk');
                        setIsSigtapSelectorOpen(true);
                     }}
                  >
                     <Plus className="w-4 h-4" />
                     Adicionar Metas
                  </Button>

                  <div className="flex gap-2">
                     <Button
                        variant="ghost"
                        onClick={() => setIsBulkEditModalOpen(false)}
                     >
                        Cancelar
                     </Button>
                     <Button
                        onClick={handleBulkSave}
                        disabled={isLoading}
                     >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Alterações
                     </Button>
                  </div>
               </div>
            </div>
         </Modal>



         {/* Renew Confirmation Modal */}
         <Modal
            isOpen={isRenewModalOpen}
            onClose={() => setIsRenewModalOpen(false)}
            title="Renovar Pactuação"
            size="sm"
         >
            <div className="space-y-4">
               <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                     <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Confirmar Renovação</h4>
                     <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                        Isso criará uma cópia de <strong>todas</strong> as metas deste município para o ano de vigência selecionado abaixo.
                     </p>
                  </div>
               </div>

               <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Ano de Vigência</label>
                  <Input
                     type="number"
                     value={renewTargetYear}
                     onChange={(e) => setRenewTargetYear(e.target.value)}
                     className="mt-1"
                     min={new Date().getFullYear()}
                     max={new Date().getFullYear() + 5}
                  />
               </div>

               <div className="flex justify-end gap-2 pt-4">
                  <Button variant="ghost" onClick={() => setIsRenewModalOpen(false)}>Cancelar</Button>
                  <Button onClick={handleConfirmRenew} className="bg-emerald-600 hover:bg-emerald-700">
                     {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Renovação'}
                  </Button>
               </div>
            </div>
         </Modal>

         {/* Sigtap Selector Modal (Shared) */}
         <SigtapSelector
            isOpen={isSigtapSelectorOpen}
            onClose={() => setIsSigtapSelectorOpen(false)}
            onSelect={handleConfirmSigtap}
            competence={sigtapSourceCompetence}
         />
      </div >
   );
};

export default Goals;