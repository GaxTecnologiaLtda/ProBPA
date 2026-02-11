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



  return (
    <div className="relative space-y-6 min-h-[400px]">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-xl transition-all duration-300">
          <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-300">
            <Activity className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Consolidando e agregando dados de produção...
            </span>
            <p className="text-xs text-center text-gray-500 mt-2 max-w-sm">
              O tempo de processamento pode variar conforme o volume de registros da sua entidade. Estamos calculando seus indicadores em tempo real.
            </p>
          </div>
        </div>
      )}

      <div className={`space-y-6 transition-all duration-300 ${loading ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
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
    </div>
  );
};

export default Dashboard;