import React from 'react';
import { EntityType } from '../types';
import { Activity, Users, FileWarning, TrendingUp, Map, Building2 } from 'lucide-react';
import { StatCard, Card } from '../components/ui/Components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MOCK_PRODUCTION_STATS, CHART_COLORS_PUBLIC, CHART_COLORS_PRIVATE } from '../constants';

interface DashboardProps {
  type: EntityType;
}

const Dashboard: React.FC<DashboardProps> = ({ type }) => {
  const isPublic = type === 'public';
  
  // Cores dinâmicas
  const colors = isPublic ? CHART_COLORS_PUBLIC : CHART_COLORS_PRIVATE;
  const accentColorClass = isPublic ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isPublic ? 'Dashboard Municipal' : 'Visão Geral Institucional'}
        </h1>
        <div className="flex space-x-2">
          <select className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none">
             <option>Últimos 30 dias</option>
             <option>Este Ano</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={isPublic ? "Produção Total" : "Produção Consolidada"}
          value={isPublic ? "14,250" : "85,420"}
          icon={Activity}
          trend="12%"
          trendUp={true}
          colorClass={accentColorClass}
        />
        <StatCard 
          title={isPublic ? "Profissionais Ativos" : "Profissionais Vinculados"}
          value={isPublic ? "48" : "215"}
          icon={Users}
          trend="3%"
          trendUp={true}
          colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
        <StatCard 
          title={isPublic ? "Pendências BPA" : "Municípios Parceiros"}
          value={isPublic ? "12" : "8"}
          icon={isPublic ? FileWarning : Map}
          trend={isPublic ? "5%" : undefined}
          trendUp={!isPublic} 
          colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
        />
        <StatCard 
          title="Metas Atingidas"
          value="87%"
          icon={TrendingUp}
          trend="2%"
          trendUp={true}
          colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Evolução de Procedimentos</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_PRODUCTION_STATS}>
                <defs>
                  <linearGradient id="colorProcs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="procedures" stroke={colors.primary} fillOpacity={1} fill="url(#colorProcs)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {isPublic ? 'Produção por Categoria' : 'Top Municípios (Volume)'}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_PRODUCTION_STATS}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <Tooltip 
                   cursor={{fill: 'transparent'}}
                   contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="consultations" name="Consultas" fill={colors.secondary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="audited" name="Auditados" fill={colors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom Section: Recent Activity / Warnings */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alertas do Sistema</h3>
          <button className={`text-sm font-medium hover:underline ${isPublic ? 'text-blue-600' : 'text-emerald-600'}`}>
            Ver todos
          </button>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="flex items-start p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mr-4 shrink-0">
                <FileWarning className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">BPA com inconsistências</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  O arquivo de produção da {isPublic ? 'UBS Central' : 'Prefeitura de Rio Verde'} apresentou 3 erros de validação no CNS.
                </p>
                <span className="text-xs text-gray-400 mt-2 block">Há 2 horas</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;