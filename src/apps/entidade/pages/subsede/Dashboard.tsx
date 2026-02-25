import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, Users, Map, TrendingUp, RefreshCw } from 'lucide-react';
import { StatCard, Card } from '../../components/ui/Components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { CHART_COLORS_SUBSEDE } from '../../constants';
import { useDashboardSubsedeData } from './useDashboardSubsedeData';

const DashboardSubsede: React.FC = () => {
    const { selectedCompetence } = useOutletContext<{ selectedCompetence: string }>();
    const { production, professionals, units, goals, loading, syncing, syncData } = useDashboardSubsedeData(selectedCompetence);

    // Need to define CHART_COLORS_SUBSEDE in constants, but we temporarily fallback
    const colors = CHART_COLORS_SUBSEDE || { primary: '#ea580c', secondary: '#f97316' };
    const accentColorClass = 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';


    return (
        <div className="relative space-y-6 min-h-[400px]">
            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-xl transition-all duration-300">
                    <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-300">
                        <Activity className="w-10 h-10 text-orange-600 animate-spin mb-4" />
                        <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
                            Carregando dados locais...
                        </span>
                    </div>
                </div>
            )}

            <div className={`space-y-6 transition-all duration-300 ${loading ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Visão Geral - Coordenação Local
                    </h1>
                    <div className="flex space-x-2">
                        <button
                            onClick={syncData}
                            disabled={syncing || loading}
                            className={`flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm outline-none transition-colors 
                ${(syncing || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-orange-600 dark:hover:text-orange-400 focus:ring-2 focus:ring-orange-500'}`}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${(syncing) ? 'animate-spin' : ''}`} />
                            {syncing ? 'Sincronizando...' : 'Atualizar Dados'}
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Produção Municipal"
                        value={production.total.toLocaleString('pt-BR')}
                        icon={Activity}
                        trend={`${production.trend}%`}
                        trendUp={production.trendUp}
                        colorClass={accentColorClass}
                        helpText="Soma total de todos os procedimentos realizados no município vigente."
                    />
                    <StatCard
                        title="Profissionais (Equipes)"
                        value={professionals.value.toLocaleString('pt-BR')}
                        icon={Users}
                        trend={`${professionals.trend}%`}
                        trendUp={professionals.trendUp}
                        colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                        helpText="Total de profissionais ativos."
                    />
                    <StatCard
                        title="Unidades de Saúde"
                        value={units?.value?.toLocaleString('pt-BR') || '0'}
                        icon={Map}
                        trendUp={units?.trendUp ?? true}
                        colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        helpText="Quantidade de unidades de saúde (UBS/ESF) cadastradas."
                    />
                    <StatCard
                        title="Metas Atingidas"
                        value={goals.value}
                        icon={TrendingUp}
                        trend={`${goals.trend}%`}
                        trendUp={goals.trendUp}
                        colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        helpText="Percentual de metas atingidas."
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 gap-6">
                    <Card className="p-6 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Evolução Mensal</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                {production.chartData && production.chartData.length > 0 ? (
                                    <AreaChart data={production.chartData}>
                                        <defs>
                                            <linearGradient id="colorProcsSub" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Procedimentos']}
                                        />
                                        <Area type="monotone" dataKey="procedures" stroke={colors.primary} fillOpacity={1} fill="url(#colorProcsSub)" strokeWidth={3} />
                                    </AreaChart>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                        <Activity className="w-8 h-8 mb-2 opacity-50" />
                                        <p>Aguardando dados</p>
                                    </div>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DashboardSubsede;
