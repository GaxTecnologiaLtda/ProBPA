import React, { useState, useEffect } from 'react';
import { Table, Skeleton, Button, Badge, Select } from '../ui/Components';
import { Goal, Unit } from '../../types';
import { goalService } from '../../services/goalService';
import { useAuth } from '../../context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Download, AlertCircle, Building2 } from 'lucide-react';
import { unitComparativeReportService } from '../../services/unitComparativeReportService';

interface UnitComparativeReportProps {
    municipalityId: string;
    onMunicipalityChange: (id: string) => void;
    allMunicipalities: { id: string; name: string }[];
    competence: string; // MM/YYYY
    allUnits: Unit[];
}

export const UnitComparativeReport: React.FC<UnitComparativeReportProps> = ({
    municipalityId,
    onMunicipalityChange,
    allMunicipalities,
    competence,
    allUnits
}) => {
    const { claims } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);

    // stats[unitId][procedureCode] = quantity
    const [stats, setStats] = useState<Record<string, Record<string, number>>>({});

    const [mode, setMode] = useState<'metas' | 'procedimentos'>('metas');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    useEffect(() => {
        if (!municipalityId) return;

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Fetch Municipality Goals
                // goalService.getGoalsForEntityPrivate uses collectionGroup and filters by entityId
                // We'll fetch all and filter locally by municipalityId and scope
                const allGoals = await goalService.getGoalsForEntityPrivate(claims);
                const munGoals = allGoals.filter(g =>
                    g.municipalityId === municipalityId &&
                    (g.goalType === 'municipal' || !g.unitId) // As discussed, goals for the municipality global
                );

                // Group by procedure to avoid duplicates if any
                const uniqueGoalsMap = new Map<string, Goal>();
                munGoals.forEach(g => {
                    if (g.procedureCode) {
                        if (!uniqueGoalsMap.has(g.procedureCode)) {
                            uniqueGoalsMap.set(g.procedureCode, g);
                        } else {
                            // Sum target quantity if duplicate macro
                            const existing = uniqueGoalsMap.get(g.procedureCode)!;
                            existing.targetQuantity += (g.targetQuantity || 0);
                        }
                    }
                });

                setGoals(Array.from(uniqueGoalsMap.values()));

                // 2. Fetch Stats via Cloud Function
                const getUnitComparativeStats = httpsCallable(functions, 'getUnitComparativeStats');
                const response = await getUnitComparativeStats({
                    municipalityId,
                    competence,
                    startDate,
                    endDate
                });

                const data = response.data as any;
                if (data.success && data.data) {
                    setStats(data.data);
                }

            } catch (err: any) {
                console.error('Failed to load comparative report:', err);
                setError('Falha ao carregar os dados comparativos. Tente novamente mais tarde.');
            } finally {
                setLoading(false);
            }
        };

        // Somente rebuscar se o usuário selecionou ambas ou limpou ambas
        if ((startDate && endDate) || (!startDate && !endDate)) {
            loadData();
        }
    }, [municipalityId, startDate, endDate, competence, claims]);

    const handleExport = async () => {
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

            const municipalityUnits = allUnits.filter(u => u.municipalityId === municipalityId);

            await unitComparativeReportService.generatePdf({
                competence,
                startDate,
                endDate,
                municipalityName,
                entityName,
                logoUrl,
                logoBase64,
                goals,
                municipalityUnits,
                stats
            });
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

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
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

    // Prepare Columns (Units that belong to the municipality)
    const municipalityUnits = allUnits.filter(u => u.municipalityId === municipalityId);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-48">
                        <Select
                            value={municipalityId}
                            onChange={(e) => onMunicipalityChange(e.target.value)}
                            className="bg-white dark:bg-gray-800"
                        >
                            <option value="">Selecione o Município...</option>
                            {allMunicipalities.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </Select>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap hidden lg:block">Período Específico:</span>
                        <div className="flex items-center gap-1">
                            <input
                                type="date"
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                title="Data Inicial"
                            />
                            <span className="text-gray-400 text-xs">até</span>
                            <input
                                type="date"
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                title="Data Final"
                                min={startDate}
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="text-xs text-red-500 hover:text-red-700 underline ml-2"
                            >
                                Limpar
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant={mode === 'metas' ? 'primary' : 'outline'}
                            onClick={() => setMode('metas')}
                        >
                            1. Comparativo por Metas Global
                        </Button>
                        <Button
                            size="sm"
                            variant={mode === 'procedimentos' ? 'primary' : 'outline'}
                            onClick={() => setMode('procedimentos')}
                            disabled
                            title="Em Breve"
                        >
                            2. Comparativo por Procedimento Geral
                        </Button>
                    </div>
                </div>

                <Button size="sm" variant="outline" className="gap-2" onClick={handleExport} disabled={loading || goals.length === 0}>
                    <Download className="w-4 h-4" />
                    Exportar PDF
                </Button>
            </div>

            {mode === 'metas' && (
                <div className="overflow-x-auto pb-4 border rounded-lg shadow-sm border-gray-100 dark:border-gray-800">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 border-collapse">
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
                                    const unitStats = stats[unit.id] || {};
                                    Object.keys(unitStats).forEach(actualProcKey => {
                                        if (actualProcKey.startsWith(cleanProcKey)) {
                                            qty += unitStats[actualProcKey];
                                        }
                                    });
                                    return { unitId: unit.id, qty };
                                });

                                const totalRowQty = rowData.reduce((sum, item) => sum + item.qty, 0);

                                return (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="sticky left-0 bg-gray-200 dark:bg-gray-800/90 z-10 border-r border-white dark:border-gray-700 p-2 text-center font-bold text-gray-800 dark:text-gray-300">
                                            {procedureKey}
                                        </td>
                                        <td className="sticky left-20 bg-gray-200 dark:bg-gray-800/90 z-10 border-r border-white dark:border-gray-700 p-2">
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 block" title={goal.procedureName}>
                                                {goal.procedureName}
                                            </span>
                                        </td>

                                        {rowData.map(data => (
                                            <td key={data.unitId} className="text-center text-sm p-2 bg-gray-100 dark:bg-gray-800/50 border-r border-white dark:border-gray-700">
                                                <span className="font-medium text-gray-800 dark:text-gray-300">{data.qty}</span>
                                            </td>
                                        ))}

                                        <td className="text-center font-bold text-cyan-900 dark:text-cyan-100 bg-cyan-50 dark:bg-cyan-900/20 p-2 border-r border-white dark:border-gray-700">
                                            {totalRowQty}
                                        </td>
                                        <td className="text-center font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 p-2 border-r border-gray-200 dark:border-gray-700">
                                            {goal.targetQuantity}
                                        </td>
                                        <td className="text-center font-bold bg-red-100 dark:bg-red-900/40 p-2 border-r border-white dark:border-gray-700 text-red-900 dark:text-red-100">
                                            {totalRowQty - goal.targetQuantity}
                                        </td>
                                        <td className="text-center font-bold text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-900/40 p-2 text-sm">
                                            {goal.targetQuantity * 12}
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
                                                if (actualProcKey.startsWith(cleanProcKey)) {
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
                                                    if (actualProcKey.startsWith(cleanProcKey)) qty += unitStats[actualProcKey];
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
                                                        if (actualProcKey.startsWith(cleanProcKey)) qty += unitStats[actualProcKey];
                                                    });
                                                    return sum + qty;
                                                }, 0);
                                            }, 0);
                                            const totalMeta = goals.reduce((acc, goal) => acc + goal.targetQuantity, 0);
                                            return totalProd - totalMeta;
                                        })()}
                                    </td>
                                    <td className="text-center font-bold text-blue-900 dark:text-blue-100 p-2">
                                        {goals.reduce((acc, goal) => acc + (goal.targetQuantity * 12), 0)}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex items-center gap-2 p-3 text-sm text-amber-700 bg-amber-50 rounded-lg dark:bg-amber-900/30 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <p>Os valores consolidados por unidade podem divergir ligeiramente do relatório por profissional, caso existam produções manuais registradas diretamente no profissional que não estejam vinculadas a uma Unidade (vínculo de equipe aberto).</p>
            </div>
        </div>
    );
};
