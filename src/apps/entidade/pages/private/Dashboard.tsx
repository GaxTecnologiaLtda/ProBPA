import React from 'react';
import { Activity, Users, Map, TrendingUp } from 'lucide-react';
import { StatCard, Card } from '../../components/ui/Components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { CHART_COLORS_PRIVATE } from '../../constants';
import { useDashboardData } from './useDashboardData';

const Dashboard: React.FC = () => {
  const { production, professionals, municipalities, goals, loading } = useDashboardData();
  const colors = CHART_COLORS_PRIVATE;
  const accentColorClass = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';

  if (loading) {
    return (
      <div className="flex bg-gray-50 dark:bg-gray-900 justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Visão Geral Institucional
        </h1>
        <div className="flex space-x-2">
          <select className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>Este Ano</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Produção Consolidada"
          value={production.total.toLocaleString('pt-BR')}
          icon={Activity}
          trend={`${production.trend}%`}
          trendUp={production.trendUp}
          colorClass={accentColorClass}
          helpText="Soma total de todos os procedimentos realizados no ano vigente, incluindo produção de todas as equipes e unidades."
        />
        <StatCard
          title="Profissionais Vinculados"
          value={professionals.value.toLocaleString('pt-BR')}
          icon={Users}
          trend={`${professionals.trend}%`}
          trendUp={professionals.trendUp}
          colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          helpText="Total de profissionais ativos vinculados à entidade no momento."
        />
        <StatCard
          title="Municípios Parceiros"
          value={municipalities.value.toLocaleString('pt-BR')}
          icon={Map}
          trendUp={municipalities.trendUp}
          colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
          helpText="Quantidade de municípios atendidos ou com pactuação ativa com a entidade."
        />
        <StatCard
          title="Metas Atingidas"
          value={goals.value}
          icon={TrendingUp}
          trend={`${goals.trend}%`}
          trendUp={goals.trendUp}
          colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          helpText="Percentual médio de atingimento das metas anuais cadastradas (Produção Realizada / Meta Estipulada)."
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Evolução Consolidada</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={production.chartData}>
                <defs>
                  <linearGradient id="colorProcsPriv" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="procedures" stroke={colors.primary} fillOpacity={1} fill="url(#colorProcsPriv)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Municípios (Volume)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {municipalities.topList.length > 0 ? (
                <BarChart data={municipalities.topList}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="value" name="Procedimentos" fill={colors.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                  <Activity className="w-8 h-8 mb-2 opacity-50" />
                  <p>Sem dados de produção</p>
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;