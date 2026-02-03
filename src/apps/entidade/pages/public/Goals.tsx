import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button, Modal, Input, Select, Badge } from '../../components/ui/Components';
import { MOCK_UNITS, MOCK_PROFESSIONALS } from '../../constants';
import { Target, Plus, Building2, User, Clock, AlertTriangle, BarChart2, TrendingUp, ChevronDown, Copy, Eye, Calendar, FileText, Search } from 'lucide-react';
import { goalService, EntityProductionRecord, matchProfessional, calculateGoalStatus } from '../../services/goalService';
import { Goal, Unit, Professional } from '../../types';

const normalize = (v?: string | null) => String(v || '').trim();
const normalizeName = (v?: string | null) => normalize(v).toLowerCase();

const normalizeCompetenceMonth = (value?: string) => {
   if (!value) return undefined;
   const v = value.trim();
   if (v.includes('/')) {
      const [mm, yyyy] = v.split('/');
      return `${yyyy}-${mm}`;
   }
   if (/^\d{6}$/.test(v)) {
      return `${v.slice(0, 4)}-${v.slice(4)}`;
   }
   return v;
};

const normalizeCompetence = (competence?: string, competenceMonth?: string) =>
   normalizeCompetenceMonth(competenceMonth || competence);

const getProdUnitId = (p: EntityProductionRecord) =>
   normalize((p as any).unitId || (p as any).unityId || (p as any).unit?.id);

const getProdCompetenceKey = (p: EntityProductionRecord) =>
   normalizeCompetenceMonth(
      (p as any).competenceMonth || (p as any).competence
   );

const mergeGoalsWithEntityProduction = (
   goals: Goal[],
   production: EntityProductionRecord[]
): Goal[] => {
   return goals.map(goal => {
      const comp = normalizeCompetence(goal.competence, goal.competenceMonth);
      const goalUnit = normalize(goal.unitId);

      // Passo B — Filtrar produção oficial (unit)
      const matchUnitProd = production.filter(p =>
         normalize(p.procedureCode) === normalize(goal.procedureCode) &&
         getProdCompetenceKey(p) === comp &&
         getProdUnitId(p) === goalUnit
      );

      const totalUnit = matchUnitProd.reduce((acc, r) => acc + Number(r.quantity || 0), 0);

      // Passo C — Filtrar produção individual (professional)
      let totalProfessional = 0;

      if (goal.professionalId && goal.professionalId !== 'team') {
         const matchProfProd = matchUnitProd.filter(p =>
            matchProfessional(goal, p)
         );

         totalProfessional = matchProfProd.reduce((acc, r) => acc + Number(r.quantity || 0), 0);
      }

      const effectiveCurrent = goal.professionalId && goal.professionalId !== 'team'
         ? totalProfessional
         : totalUnit;

      const status = calculateGoalStatus(effectiveCurrent, goal.targetQuantity);

      // Passo D — Preencher o objeto goal
      return {
         ...goal,
         currentQuantity: totalUnit, // compatibilidade
         currentQuantityUnit: totalUnit,
         currentQuantityProfessional: totalProfessional,
         status
      };
   });
};

import { fetchUnitsByEntity } from '../../services/unitsService';
import { fetchProfessionalsByEntity } from '../../services/professionalsService';
import { useAuth } from '../../context/AuthContext';
import { SigtapSearchModal } from '../../components/SigtapSearchModal';
import { SigtapProcedureRow } from '../../../producao/services/sigtapLookupService';
import { motion, AnimatePresence } from 'framer-motion';

// Interface auxiliar para o agrupamento
interface GroupedByUnit {
   unitId: string;
   unitName: string;
   goals: Goal[];
   totalValue: number;
}

interface GroupedByType {
   type: 'municipal' | 'unit' | 'professional';
   label: string;
   goals: Goal[];
   // For 'unit'/'professional' types, we might still want to subgroup by unit for clarity
   subGroups?: GroupedByUnit[];
}

interface GroupedByCompetence {
   competence: string;
   types: GroupedByType[];
}

const Goals: React.FC = () => {
   const { claims } = useAuth();
   const [goals, setGoals] = useState<Goal[]>([]);
   const [units, setUnits] = useState<Unit[]>([]);
   const [professionals, setProfessionals] = useState<Professional[]>([]);

   // Sigtap Modal
   const [isSigtapModalOpen, setIsSigtapModalOpen] = useState(false);

   // Form State
   const [formData, setFormData] = useState<Partial<Goal>>({
      goalType: 'municipal',
      competence: '07/2024',
      unitValue: 0,
      targetQuantity: 0,
      totalValue: 0,
      daysOfWeek: [],
      status: 'pending'
   });

   // State for multi-procedure selection (Municipal Goal)
   const [selectedProcedures, setSelectedProcedures] = useState<{
      code: string;
      name: string;
      group: string;
      targetQuantity: number;
      unitValue: number;
   }[]>([]);

   // Removed strict filtering by municipalityId to match Units.tsx behavior
   // If needed, we can filter by the selected municipality if we add a municipality selector later.
   // For now, we show all units of the entity.

   useEffect(() => {
      if (!claims?.entityId) return;

      // Load Units
      fetchUnitsByEntity(claims.entityId)
         .then(setUnits)
         .catch(console.error);

      // Load Professionals
      fetchProfessionalsByEntity(claims.entityId)
         .then(setProfessionals)
         .catch(console.error);

      // Load Goals and Production
      const load = (formData.municipalityId || claims.municipalityId)
         ? goalService.getGoalsForMunicipalityPublic(claims, formData.municipalityId || claims.municipalityId)
         : goalService.getGoalsForEntityPrivate(claims);

      Promise.all([
         load,
         goalService.getEntityProductionStats(claims.entityId)
      ])
         .then(([goalsData, productionData]) => {
            const merged = mergeGoalsWithEntityProduction(goalsData, productionData);
            setGoals(merged);
         })
         .catch(console.error);
   }, [claims, formData.municipalityId]);

   // Generate Competences (Current Year + Next Year)
   const competenceOptions = useMemo(() => {
      const options = [];
      const today = new Date();
      const currentYear = today.getFullYear();

      // Add current year months
      for (let i = 0; i < 12; i++) {
         const d = new Date(currentYear, i, 1);
         const month = (i + 1).toString().padStart(2, '0');
         options.push(`${month}/${currentYear}`);
      }

      // Add next year months
      for (let i = 0; i < 12; i++) {
         const d = new Date(currentYear + 1, i, 1);
         const month = (i + 1).toString().padStart(2, '0');
         options.push(`${month}/${currentYear + 1}`);
      }

      return options;
   }, []);

   // Estados de Controle Visual
   const [expandedCompetences, setExpandedCompetences] = useState<Record<string, boolean>>({ '07/2024': true, '06/2024': false });

   // Modais
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
   const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);



   // --- Helpers & Calculators ---

   const toggleCompetence = (comp: string) => {
      setExpandedCompetences(prev => ({ ...prev, [comp]: !prev[comp] }));
   };

   // Agrupa quotas por competência e depois por tipo
   const groupedGoals = useMemo<GroupedByCompetence[]>(() => {
      // 1. Agrupar por Competência
      const byCompetence: Record<string, Goal[]> = {};
      goals.forEach(goal => {
         // Fallback legacy logic
         if (!goal.goalType) {
            goal.goalType = (goal.professionalId === 'team' || !goal.professionalId) ? 'unit' : 'professional';
            // If no unitId, assume municipal?
            if (!goal.unitId) goal.goalType = 'municipal';
         }

         if (!byCompetence[goal.competence]) byCompetence[goal.competence] = [];
         byCompetence[goal.competence].push(goal);
      });

      // 2. Ordenar competências (decrescente)
      const sortedKeys = Object.keys(byCompetence).sort((a, b) => {
         const [monthA, yearA] = a.split('/').map(Number);
         const [monthB, yearB] = b.split('/').map(Number);
         return new Date(yearB, monthB - 1).getTime() - new Date(yearA, monthA - 1).getTime();
      });

      // 3. Estruturar por Tipo dentro da Competência
      return sortedKeys.map(comp => {
         const goalsInComp = byCompetence[comp];

         const byType: Record<string, Goal[]> = {
            municipal: [],
            unit: [],
            professional: []
         };

         goalsInComp.forEach(g => {
            const type = g.goalType || 'unit';
            if (byType[type]) byType[type].push(g);
            else byType['unit'].push(g); // Fallback
         });

         const typesGrouped: GroupedByType[] = [];

         // Process Municipal
         if (byType.municipal.length > 0) {
            typesGrouped.push({
               type: 'municipal',
               label: 'Metas Municipais (Globais)',
               goals: byType.municipal
            });
         }

         // Process Unit & Professional (Group by Unit for better display)
         ['unit', 'professional'].forEach(t => {
            const type = t as 'unit' | 'professional';
            const gList = byType[type];
            if (gList.length > 0) {
               const byUnit: Record<string, Goal[]> = {};
               gList.forEach(g => {
                  const uId = g.unitId || 'no-unit';
                  if (!byUnit[uId]) byUnit[uId] = [];
                  byUnit[uId].push(g);
               });

               const subGroups = Object.keys(byUnit).map(uId => ({
                  unitId: uId,
                  unitName: units.find(u => u.id === uId)?.name || (uId === 'no-unit' ? 'Sem Unidade' : 'Unidade Desconhecida'),
                  goals: byUnit[uId],
                  totalValue: byUnit[uId].reduce((acc, curr) => acc + (curr.totalValue || 0), 0)
               }));

               typesGrouped.push({
                  type,
                  label: type === 'unit' ? 'Metas por Unidade' : 'Metas por Profissional',
                  goals: gList, // All goals flattened
                  subGroups // Structured
               });
            }
         });

         return {
            competence: comp,
            types: typesGrouped
         };
      });
   }, [goals, units]);

   // Filtra profissionais baseado na unidade selecionada no formulário
   const filteredProfessionals = useMemo(() => {
      if (!formData.unitId) return [];
      // Filter professionals that have an assignment to this unit
      return professionals.filter(p =>
         p.assignments?.some(a => a.unitId === formData.unitId) ||
         (p.unitId === formData.unitId) // Legacy fallback
      );
   }, [formData.unitId, professionals]);

   const handleSigtapSelect = (proc: SigtapProcedureRow) => {
      setFormData(prev => ({
         ...prev,
         procedureCode: proc.code,
         procedureName: proc.name,
         procedureGroup: proc.groupCode
      }));
      setIsSigtapModalOpen(false);
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

   // Actions
   const handleOpenDetails = (goal: Goal) => {
      setSelectedGoal(goal);
      setIsDetailsModalOpen(true);
   };

   const handleRenew = (goal: Goal) => {
      setFormData({
         ...goal,
         id: undefined,
         currentQuantity: 0,
         status: 'pending',
         description: `${goal.description} (Renovação)`,
      });
      setIsModalOpen(true);
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         if (formData.goalType === 'municipal' && selectedProcedures.length > 0) {
            // Batch Save
            const promises = selectedProcedures.map(proc => {
               return goalService.saveGoalFromEntity({
                  ...formData,
                  procedureCode: proc.code,
                  procedureName: proc.name,
                  procedureGroup: proc.group,
                  targetQuantity: proc.targetQuantity,
                  unitValue: proc.unitValue,
                  totalValue: proc.targetQuantity * proc.unitValue,
                  goalType: 'municipal'
               }, claims);
            });
            await Promise.all(promises);
         } else {
            // Single Save (Unit/Prof or Editing)
            await goalService.saveGoalFromEntity(formData, claims);
         }

         // Reload Goals & Production
         const munIdToFetch = formData.municipalityId || claims.municipalityId;
         const load = munIdToFetch
            ? goalService.getGoalsForMunicipalityPublic(claims, munIdToFetch)
            : goalService.getGoalsForEntityPrivate(claims);

         const [goalsData, productionData] = await Promise.all([
            load,
            goalService.getEntityProductionStats(claims.entityId)
         ]);
         setGoals(mergeGoalsWithEntityProduction(goalsData, productionData));

         // Expand competence
         if (formData.competence) {
            setExpandedCompetences(prev => ({ ...prev, [formData.competence!]: true }));
         }
         setIsModalOpen(false);
         setFormData({ ...formData, id: undefined }); // Reset ID
         setSelectedProcedures([]); // Reset list
      } catch (error) {
         console.error('Error saving goal:', error);
         alert('Erro ao salvar meta. Tente novamente.');
      }
   };

   // Stats Dashboard
   const totalMeta = goals.reduce((acc, g) => acc + g.targetQuantity, 0);
   const totalRealizado = goals.reduce((acc, g) => acc + g.currentQuantity, 0);
   const percentualGeral = totalMeta > 0 ? Math.round((totalRealizado / totalMeta) * 100) : 0;
   const valorPactuado = goals.reduce((acc, g) => acc + (g.totalValue || 0), 0);
   // Helper de Renderização
   const renderGoalCard = (goal: Goal, professionals: Professional[]) => {
      const profName = professionals.find(p => p.id === goal.professionalId)?.name || (goal.professionalName || 'Equipe / Geral');
      const percentage = Math.min(Math.round((goal.currentQuantity / goal.targetQuantity) * 100), 100);

      const statusTooltip: Record<string, string> = {
         pending: "Pendente – 0% realizado",
         risk: "Risco – menos de 40% realizado",
         attention: "Atenção – entre 40% e 70% realizado",
         on_track: "Em Andamento – entre 70% e 99% realizado",
         completed: "Concluída – 100% ou mais realizado"
      };

      const statusColor = {
         pending: 'bg-gray-400',
         risk: 'bg-amber-500',
         attention: 'bg-yellow-500',
         on_track: 'bg-blue-500',
         completed: 'bg-emerald-600'
      }[goal.status] || 'bg-gray-400';

      const statusText = {
         pending: 'Pendente',
         risk: 'Risco',
         attention: 'Atenção',
         on_track: 'Em Andamento',
         completed: 'Concluída'
      }[goal.status] || 'Pendente';

      return (
         <Card key={goal.id} className="p-0 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
            {/* Lado Esquerdo */}
            <div className="p-5 flex-1">
               <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-3">
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wide bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                           {goal.procedureGroup}
                        </span>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${statusColor}`} title={statusTooltip[goal.status]}>
                           {statusText}
                        </div>
                     </div>
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white">{goal.description}</h3>
                     <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1 truncate max-w-md" title={goal.procedureName}>
                        {goal.procedureCode} - {goal.procedureName}
                     </p>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-2">
                     <Button variant="outline" className="h-8 px-3 text-xs flex items-center gap-1" onClick={() => handleOpenDetails(goal)}>
                        <Eye className="w-3 h-3" /> Detalhes
                     </Button>
                     <button className="h-8 px-3 text-xs flex items-center gap-1 rounded-lg font-medium transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 border border-blue-100 dark:border-blue-800" onClick={() => handleRenew(goal)}>
                        <Copy className="w-3 h-3" /> Renovar
                     </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                     <User className="w-3.5 h-3.5 mr-2 text-gray-400" />
                     <span className="truncate" title={profName}>{profName}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                     <Clock className="w-3.5 h-3.5 mr-2 text-gray-400" />
                     {goal.shift || 'N/A'} • {goal.daysOfWeek?.length || 0} dias
                  </div>
               </div>
            </div>

            {/* Lado Direito */}
            <div className="bg-gray-50 dark:bg-gray-700/30 p-5 w-full md:w-64 border-l border-gray-100 dark:border-gray-700 flex flex-col justify-center">
               <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-gray-500 dark:text-gray-400">Realizado</span>
                  <span className="text-gray-900 dark:text-white">{percentage}%</span>
               </div>
               <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3">
                  <div className={`h-2 rounded-full ${statusColor} transition-all`} style={{ width: `${percentage}%` }}></div>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-mono">{goal.currentQuantity} / {goal.targetQuantity}</span>
                  {goal.totalValue > 0 && (
                     <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.totalValue)}
                     </span>
                  )}
               </div>
            </div>
         </Card>
      );
   };


   return (
      <div className="space-y-6">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
               <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Metas Municipais</h1>
               <p className="text-gray-500 dark:text-gray-400 mt-1">Gestão de pactuação e produção da rede.</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-48">
                  <Select
                     value={formData.competence} // Bind to something? Or separate state?
                     // Actually, let's use a separate state for the "Global Context Competence" if implied, 
                     // but the user might just want to quick-select for the NEW goal.
                     // "ao lado do botão de Nova Pactuação" suggests it controls what happens when you click.
                     // I'll make it a standalone selector that updates the formData default, or is just a view filter.
                     // Let's make it a View Filter AND Default for new goals.
                     onChange={(e) => {
                        // Logic to filter view or just set default? 
                        // I'll just set it as a convenient way to verify.
                        // But usually "Selector active" implies context.
                        // I will use it to scroll/expand the specific competence group.
                        const comp = e.target.value;
                        if (comp) setExpandedCompetences(prev => ({ ...prev, [comp]: true }));
                        // And visually select it?
                     }}
                     className="h-10"
                  >
                     <option value="">Ir para Competência...</option>
                     {competenceOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                     ))}
                  </Select>
               </div>
               <Button
                  variant="primary"
                  className="flex items-center gap-2 h-10"
                  onClick={() => {
                     // Use the selected competence from context if we had one, or calculate default
                     const today = new Date();
                     // Default to Current Month
                     const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
                     const defaultComp = `${currentMonth}/${today.getFullYear()}`;

                     setFormData({
                        competence: defaultComp, // Or use the one selected in the dropdown if I implemented state
                        unitValue: 0,
                        targetQuantity: 0,
                        totalValue: 0,
                        daysOfWeek: [],
                        shift: 'Manhã',
                        status: 'pending',
                        goalType: 'municipal'
                     });
                     setIsModalOpen(true);
                  }}
               >
                  <Plus className="w-4 h-4" /> Nova Pactuação
               </Button>
            </div>
         </div>

         {/* Dashboard KPI */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white dark:bg-gray-800 border-l-4 border-blue-500">
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Atingimento da Rede</p>
                     <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{percentualGeral}%</h3>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                     <BarChart2 className="w-6 h-6 text-blue-600" />
                  </div>
               </div>
               <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${percentualGeral}%` }}></div>
               </div>
               <p className="text-xs text-gray-400 mt-2">{totalRealizado} realizados de {totalMeta} previstos</p>
            </Card>

            <Card className="p-6 bg-white dark:bg-gray-800 border-l-4 border-emerald-500">
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Pactuado (Est.)</p>
                     <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorPactuado)}
                     </h3>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                     <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
               </div>
               <div className="mt-4 flex items-center text-sm text-emerald-600 font-medium">
                  <Target className="w-4 h-4 mr-1" /> {goals.length} metas ativas
               </div>
            </Card>

            <Card className="p-6 bg-white dark:bg-gray-800 border-l-4 border-amber-500">
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Atenção Necessária</p>
                     <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                        {goals.filter(g => g.status === 'risk').length}
                     </h3>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                     <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
               </div>
               <p className="text-xs text-gray-500 mt-4">Metas com baixa execução no período.</p>
            </Card>
         </div>

         {/* Listagem Agrupada por Competência e Unidade */}
         <div className="space-y-6">
            {groupedGoals.map((group) => {
               const isExpanded = expandedCompetences[group.competence];

               return (
                  <div key={group.competence} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                     {/* Cabeçalho da Competência */}
                     <div
                        className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${isExpanded ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        onClick={() => toggleCompetence(group.competence)}
                     >
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                              <Calendar className="w-5 h-5" />
                           </div>
                           <div>
                              <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">Competência {group.competence}</h2>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{group.units.length} unidades pactuadas</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           {/* Botão Atualizar Progresso */}
                           <button
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                              title="Atualizar Progresso"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 if (confirm(`Deseja recalcular o progresso de todas as metas da competência ${group.competence}?`)) {
                                    const munIdToFetch = formData.municipalityId || claims.municipalityId;
                                    const load = munIdToFetch
                                       ? goalService.getGoalsForMunicipalityPublic(claims, munIdToFetch)
                                       : goalService.getGoalsForEntityPrivate(claims);

                                    Promise.all([
                                       load,
                                       goalService.getEntityProductionStats(claims.entityId)
                                    ])
                                       .then(([goalsData, productionData]) => {
                                          const merged = mergeGoalsWithEntityProduction(goalsData, productionData);
                                          setGoals(merged);
                                          alert('Progresso atualizado com sucesso!');
                                       })
                                       .catch(err => {
                                          console.error(err);
                                          alert('Erro ao atualizar progresso.');
                                       });
                                 }
                              }}
                           >
                              <TrendingUp className="w-5 h-5" />
                              <span className="hidden md:inline text-sm font-medium">Atualizar Progresso</span>
                           </button>

                           <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 transform rotate-180 transition-transform" />}
                           </button>
                        </div>
                     </div>

                     {/* Conteúdo da Competência */}
                     <AnimatePresence>
                        {isExpanded && (
                           <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                           >
                              <div className="p-6 space-y-8 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/20">

                                 {group.types.map((typeGroup) => (
                                    <div key={typeGroup.type} className="mb-8 last:mb-0">
                                       <h3 className="text-md font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                                          {typeGroup.label}
                                       </h3>

                                       {/* Municipal Goals: List directly */}
                                       {typeGroup.type === 'municipal' && (
                                          <div className="space-y-3">
                                             {typeGroup.goals.map(goal => renderGoalCard(goal, professionals))}
                                          </div>
                                       )}

                                       {/* Unit/Professional Goals: Group by Unit */}
                                       {(typeGroup.type === 'unit' || typeGroup.type === 'professional') && typeGroup.subGroups?.map((unitGroup) => (
                                          <div key={unitGroup.unitId} className="mb-6 last:mb-0 ml-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                                             {/* Cabeçalho da Unidade */}
                                             <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                   <Building2 className="w-5 h-5 text-blue-600" />
                                                   <h3 className="font-bold text-gray-800 dark:text-gray-200">{unitGroup.unitName}</h3>
                                                </div>
                                                <div className="hidden sm:flex gap-4 text-sm">
                                                   <span className="text-gray-500 dark:text-gray-400">
                                                      Meta Total: <strong className="text-gray-800 dark:text-gray-200">{unitGroup.goals.reduce((acc, g) => acc + g.targetQuantity, 0)}</strong>
                                                   </span>
                                                   <span className="text-gray-500 dark:text-gray-400">
                                                      Valor: <strong className="text-emerald-600 dark:text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(unitGroup.totalValue)}</strong>
                                                   </span>
                                                </div>
                                             </div>

                                             {/* Cards das Metas da Unidade */}
                                             <div className="space-y-3">
                                                {unitGroup.goals.map((goal) => renderGoalCard(goal, professionals))}
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 ))}

                                 {group.types.length === 0 && (
                                    <div className="text-center py-4 text-gray-500 italic">
                                       Nenhuma meta pactuada nesta competência.
                                    </div>
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
                        <p className="text-xs text-gray-500 uppercase font-bold">Competência</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedGoal.competence}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase font-bold">Total Previsto</p>
                        <p className="text-lg font-bold text-emerald-600">
                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedGoal.totalValue)}
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
                           <p><span className="font-medium">Turno:</span> {selectedGoal.shift}</p>
                           <p><span className="font-medium">Dias:</span> {selectedGoal.daysOfWeek.join(', ')}</p>
                        </div>
                     </div>
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
                              className="h-4 rounded-full bg-blue-500 text-xs text-white flex items-center justify-center"
                              style={{ width: `${Math.min((selectedGoal.currentQuantity / selectedGoal.targetQuantity) * 100, 100)}%` }}
                           >
                              {Math.round((selectedGoal.currentQuantity / selectedGoal.targetQuantity) * 100)}%
                           </div>
                        </div>
                     </div>
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
                     <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 text-xs">1</div>
                     Identificação
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Meta</label>
                        <div className="flex gap-4">
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                 type="radio"
                                 name="goalType"
                                 value="municipal"
                                 checked={formData.goalType === 'municipal'}
                                 onChange={() => setFormData(prev => ({ ...prev, goalType: 'municipal', unitId: '', professionalId: '' }))}
                                 className="text-blue-600"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Municipal (Global)</span>
                           </label>
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                 type="radio"
                                 name="goalType"
                                 value="unit"
                                 checked={formData.goalType === 'unit' || formData.goalType === 'professional'} // 'unit' encompasses unit-specific
                                 onChange={() => setFormData(prev => ({ ...prev, goalType: 'unit' }))}
                                 className="text-blue-600"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Por Unidade / Profissional</span>
                           </label>
                        </div>
                     </div>

                     <Select
                        label="Competência"
                        value={formData.competence}
                        onChange={e => setFormData({ ...formData, competence: e.target.value })}
                     >
                        {competenceOptions.map(opt => (
                           <option key={opt} value={opt}>{opt}</option>
                        ))}
                     </Select>

                     <div className={formData.goalType === 'municipal' ? "md:col-span-2" : ""}>
                        <Input
                           label="Descrição da Meta"
                           placeholder="Ex: Consultas de Hiperdia"
                           value={formData.description || ''}
                           onChange={e => setFormData({ ...formData, description: e.target.value })}
                           required
                        />
                     </div>

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
                                    municipalityId: selectedUnit?.municipalityId, // Auto-populate municipality
                                    professionalId: '',
                                    goalType: 'unit' // Default to unit, changable to professional if prof selected
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
                              label="Profissional (Opcional)"
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


               {/* 2 & 3. Procedimentos e Quantitativo */}
               <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-between">
                     <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 text-xs">2</div>
                        Procedimentos e Metas
                     </div>
                     <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => setIsSigtapModalOpen(true)}>
                        <Search className="w-3 h-3 mr-1" /> Buscar no SIGTAP
                     </Button>
                  </h4>

                  {/* Staging Fields */}
                  <div className="grid grid-cols-1 gap-4 mb-4">
                     <div onClick={() => setIsSigtapModalOpen(true)} className="cursor-pointer">
                        <Input
                           label="Procedimento Selecionado"
                           placeholder="Clique para buscar..."
                           value={formData.procedureCode ? `${formData.procedureCode} - ${formData.procedureName}` : ''}
                           readOnly
                           className="cursor-pointer"
                        />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                           label="Qtd. Meta"
                           type="number"
                           value={formData.targetQuantity || ''}
                           onChange={e => updateValues('qty', e.target.value)}
                        />
                        <Input
                           label="Valor Unit. (R$)"
                           type="number"
                           step="0.01"
                           value={formData.unitValue || ''}
                           onChange={e => updateValues('val', e.target.value)}
                        />
                     </div>

                     {formData.goalType === 'municipal' && (
                        <Button
                           type="button"
                           variant="secondary"
                           className="w-full"
                           disabled={!formData.procedureCode || !formData.targetQuantity}
                           onClick={() => {
                              if (formData.procedureCode && formData.targetQuantity) {
                                 setSelectedProcedures(prev => [...prev, {
                                    code: formData.procedureCode!,
                                    name: formData.procedureName!,
                                    group: formData.procedureGroup!,
                                    targetQuantity: formData.targetQuantity!,
                                    unitValue: formData.unitValue || 0
                                 }]);
                                 // Reset staging
                                 setFormData(prev => ({
                                    ...prev,
                                    procedureCode: '',
                                    procedureName: '',
                                    targetQuantity: 0,
                                    unitValue: 0,
                                    totalValue: 0
                                 }));
                              }
                           }}
                        >
                           <Plus className="w-4 h-4 mr-2" /> Adicionar à Lista
                        </Button>
                     )}
                  </div>

                  {/* List of Selected Procedures (Municipal Mode) */}
                  {formData.goalType === 'municipal' && selectedProcedures.length > 0 && (
                     <div className="mt-4 space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase">Procedimentos Adicionados</p>
                        {selectedProcedures.map((proc, idx) => (
                           <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 text-sm">
                              <div>
                                 <p className="font-bold text-gray-800 dark:text-gray-200">{proc.name}</p>
                                 <p className="text-xs text-gray-500">{proc.code} • Meta: {proc.targetQuantity}</p>
                              </div>
                              <button
                                 type="button"
                                 onClick={() => setSelectedProcedures(prev => prev.filter((_, i) => i !== idx))}
                                 className="text-red-500 hover:text-red-700"
                              >
                                 Remover
                              </button>
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               {/* Criteria checks for single items (Unit/Prof) */}
               {formData.goalType !== 'municipal' && (
                  <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                     <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-2 text-xs">3</div>
                        Critérios
                     </h4>
                     <div className="space-y-4">
                        <Select
                           label="Turno"
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
                              {['seg', 'ter', 'qua', 'qui', 'sex'].map(day => (
                                 <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(day)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors ${formData.daysOfWeek?.includes(day)
                                       ? 'bg-blue-600 text-white'
                                       : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                       }`}
                                 >
                                    {day}
                                 </button>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               )}


               <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" variant="primary">Salvar Meta</Button>
               </div>
            </form>
         </Modal>

         {/* Sigtap Modal */}
         <SigtapSearchModal
            isOpen={isSigtapModalOpen}
            onClose={() => setIsSigtapModalOpen(false)}
            onSelect={handleSigtapSelect}
         />
      </div>
   );
};

export default Goals;