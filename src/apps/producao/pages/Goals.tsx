import React, { useMemo, useState, useEffect } from 'react';
import { Card, Badge, cn } from '../components/ui/BaseComponents';
import { Target, TrendingUp, AlertTriangle, Calendar, ChevronDown, CheckCircle, DollarSign, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Goal } from '../types';
import { goalService } from '../services/goalService';
import { getProductionStats } from '../services/bpaService';
import { useApp } from '../context';

// Helper to format currency
const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const Goals: React.FC = () => {
    const { user, currentUnit } = useApp();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [collapsedCompetences, setCollapsedCompetences] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (user) {
            const claims = {
                entityId: user.entityId,
                municipalityId: currentUnit?.municipalityId,
                professionalId: user.professionalId || user.id,
                unitId: currentUnit?.id
            };

            // Fetch production stats (Legacy support: check both Profile ID and Auth UID)
            const idsToCheck = [user.id];
            if (user.professionalId && user.professionalId !== user.id) {
                idsToCheck.push(user.professionalId);
            }

            Promise.all([
                goalService.getProfessionalGoals(claims),
                getProductionStats(idsToCheck, user.entityId)
            ])
                .then(([goalsData, productionData]) => {
                    console.log('[Goals] Goals Data:', goalsData);
                    console.log('[Goals] Production Data:', productionData);

                    // Merge production into goals
                    const mergedGoals = goalsData.map(goal => {
                        // Normalize goal competence to YYYY-MM if needed (though it should be YYYY-MM from service)
                        let goalComp = goal.competenceMonth;
                        if (!goalComp && goal.competence) {
                            const [m, y] = goal.competence.split('/');
                            if (m && y) goalComp = `${y}-${m}`;
                        }

                        const relevantProduction = productionData.filter(p => {
                            const matchComp = p.competenceMonth === goalComp;

                            if (goal.professionalId === 'team') {
                                return matchComp && p.unitId === goal.unitId && p.procedureCode === goal.procedureCode;
                            }

                            // Relaxed Match: If the production record belongs to ANY of the user's IDs, it counts.
                            // This handles cases where Goal has AuthUID but Production has ProfileID (or vice versa).
                            const matchProf = idsToCheck.includes(p.professionalId);
                            const matchCode = p.procedureCode === goal.procedureCode;
                            const matchUnit = p.unitId === goal.unitId;

                            // Debug logging for mismatches if we expect a match (e.g. code matches)
                            if (matchCode && matchComp && matchUnit && !matchProf) {
                                console.log(`[Goals] Mismatch Professional for ${goal.procedureName}: Prod Prof=${p.professionalId} not in [${idsToCheck.join(', ')}]`);
                            }

                            return matchProf && matchCode && matchUnit && matchComp;
                        });

                        const totalQuantity = relevantProduction.reduce((acc, curr) => acc + curr.quantity, 0);

                        if (totalQuantity > 0) {
                            console.log(`[Goals] Updated Goal ${goal.procedureName}: ${totalQuantity} / ${goal.targetQuantity}`);
                        }

                        return {
                            ...goal,
                            currentQuantity: totalQuantity,
                        };
                    });

                    setGoals(mergedGoals);
                })
                .catch(console.error);
        }
    }, [user, currentUnit]);

    // --- DATA AGGREGATION LOGIC ---
    const aggregatedData = useMemo(() => {
        // 1. Group by Competence
        const groupedByComp: Record<string, Goal[]> = {};

        goals.forEach(goal => {
            // Normalize to YYYY-MM for sorting and consistent parsing
            let comp = goal.competenceMonth;
            if (!comp && goal.competence) {
                const [m, y] = goal.competence.split('/');
                if (m && y) comp = `${y}-${m}`;
            }
            if (!comp) comp = 'Unknown';

            if (!groupedByComp[comp]) {
                groupedByComp[comp] = [];
            }
            groupedByComp[comp].push(goal);
        });

        // 2. Sort Competences (Newest first)
        const sortedCompetences = Object.keys(groupedByComp).sort((a, b) => b.localeCompare(a));

        // 3. For KPIs: Use only the LATEST competence
        const currentCompetence = sortedCompetences[0];
        const currentGoals = groupedByComp[currentCompetence] || [];

        const stats = {
            totalTarget: currentGoals.reduce((sum, g) => sum + g.targetQuantity, 0),
            totalRealized: currentGoals.reduce((sum, g) => sum + g.currentQuantity, 0),
            totalPactuatedValue: currentGoals.reduce((sum, g) => sum + (g.targetQuantity * g.unitValue), 0),
            riskCount: currentGoals.filter(g => (g.currentQuantity / g.targetQuantity) < 0.4).length
        };
        const globalPercent = stats.totalTarget > 0 ? (stats.totalRealized / stats.totalTarget) * 100 : 0;

        return {
            sortedCompetences,
            groupedByComp,
            stats: { ...stats, globalPercent }
        };
    }, [goals]);

    const toggleCompetence = (comp: string) => {
        setCollapsedCompetences(prev => ({ ...prev, [comp]: !prev[comp] }));
    };

    // --- RENDER HELPERS ---
    const getProgressColor = (percent: number) => {
        if (percent >= 100) return 'bg-green-500';
        if (percent > 70) return 'bg-blue-500';
        if (percent < 40) return 'bg-amber-500';
        return 'bg-yellow-400';
    };

    const getStatusBadge = (percent: number) => {
        if (percent >= 100) return <Badge variant="success">Concluída</Badge>;
        if (percent > 70) return <Badge variant="neutral">Em Andamento</Badge>; // Blue-ish in theme
        if (percent < 40) return <Badge variant="warning">Risco</Badge>;
        return <Badge variant="neutral">Atenção</Badge>;
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-10">
            {/* --- HEADER --- */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Target className="text-medical-600 dark:text-medical-400" />
                    Minhas Metas
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Monitoramento de produção pactuada.</p>
            </div>

            {/* --- KPIs (DASHBOARD) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-500">
                        <TrendingUp size={80} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Atingimento Global (Mês Atual)</p>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                            {aggregatedData.stats.globalPercent.toFixed(1)}%
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full mt-4 overflow-hidden">
                        <div
                            className={cn("h-full transition-all duration-500", getProgressColor(aggregatedData.stats.globalPercent))}
                            style={{ width: `${Math.min(aggregatedData.stats.globalPercent, 100)}%` }}
                        />
                    </div>
                </Card>

                <Card className="p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Pactuado</p>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(aggregatedData.stats.totalPactuatedValue)}
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Estimativa baseada na meta física.</p>
                </Card>

                <Card className="p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Metas em Risco</p>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                {aggregatedData.stats.riskCount} <span className="text-sm font-normal text-gray-400">metas</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Abaixo de 40% de execução.</p>
                </Card>
            </div>

            {/* --- LISTA DE COMPETÊNCIAS (ACCORDION) --- */}
            <div className="space-y-4">
                {aggregatedData.sortedCompetences.map((competence) => {
                    const goals = aggregatedData.groupedByComp[competence];
                    const isCollapsed = collapsedCompetences[competence];
                    const [year, month] = competence.split('-');
                    let compLabel = competence;

                    if (year && month) {
                        const dateObj = new Date(parseInt(year), parseInt(month) - 1);
                        if (!isNaN(dateObj.getTime())) {
                            compLabel = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                        }
                    }

                    // Group goals by Unit inside this competence
                    const goalsByUnit: Record<string, Goal[]> = {};
                    goals.forEach(g => {
                        if (!goalsByUnit[g.unitId]) goalsByUnit[g.unitId] = [];
                        goalsByUnit[g.unitId].push(g);
                    });

                    return (
                        <div key={competence} className="space-y-2">
                            {/* Header da Competência */}
                            <div
                                onClick={() => toggleCompetence(competence)}
                                className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors select-none"
                            >
                                <div className="p-2 bg-medical-100 dark:bg-medical-900/30 text-medical-600 dark:text-medical-400 rounded-lg">
                                    <Calendar size={20} />
                                </div>
                                <div className="flex-1">
                                    <h2 className="font-bold text-gray-900 dark:text-white capitalize text-lg">{compLabel}</h2>
                                    <p className="text-xs text-gray-500">{goals.length} metas atribuídas</p>
                                </div>
                                <ChevronDown
                                    className={cn("text-gray-400 transition-transform", isCollapsed && "-rotate-90")}
                                />
                            </div>

                            {/* Conteúdo da Competência */}
                            <AnimatePresence>
                                {!isCollapsed && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden pl-2 md:pl-4 space-y-4"
                                    >
                                        {/* Loop por Unidade */}
                                        {Object.entries(goalsByUnit).map(([unitId, unitGoals]) => {
                                            const unitName = user?.units.find(u => u.id === unitId)?.name || 'Unidade Desconhecida';

                                            return (
                                                <div key={unitId} className="space-y-3 pt-2">
                                                    {/* Header da Unidade */}
                                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium px-1">
                                                        <Building size={16} />
                                                        <span>{unitName}</span>
                                                        <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1 ml-2"></div>
                                                    </div>

                                                    {/* Cards de Metas */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {unitGoals.map(goal => {
                                                            const percent = (goal.currentQuantity / goal.targetQuantity) * 100;

                                                            return (
                                                                <Card key={goal.id} className="p-5 border-l-4 border-l-transparent hover:border-l-medical-500 transition-all hover:shadow-md">
                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <div className="flex-1 pr-2">
                                                                            <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2" title={goal.procedureName}>
                                                                                {goal.procedureName}
                                                                            </h3>
                                                                            <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded mt-1 inline-block">
                                                                                {goal.procedureCode}
                                                                            </span>
                                                                        </div>
                                                                        {getStatusBadge(percent)}
                                                                    </div>

                                                                    <div className="space-y-2">
                                                                        <div className="flex justify-between text-sm">
                                                                            <span className="text-gray-500">Progresso</span>
                                                                            <span className="font-bold text-gray-900 dark:text-white">
                                                                                {goal.currentQuantity} <span className="text-gray-400 font-normal">/ {goal.targetQuantity}</span>
                                                                            </span>
                                                                        </div>

                                                                        <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                            <motion.div
                                                                                initial={{ width: 0 }}
                                                                                animate={{ width: `${Math.min(percent, 100)}%` }}
                                                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                                                className={cn("h-full rounded-full", getProgressColor(percent))}
                                                                            />
                                                                        </div>

                                                                        <div className="flex justify-between items-center pt-2 text-xs">
                                                                            <span className="text-gray-400">
                                                                                {percent.toFixed(0)}% concluído
                                                                            </span>
                                                                            <span className="font-medium text-gray-600 dark:text-gray-300">
                                                                                Vl. Unit: {formatCurrency(goal.unitValue)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </Card>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};