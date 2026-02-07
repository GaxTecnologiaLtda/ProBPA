import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { Building2, Users, Map, Activity, TrendingUp, ArrowUpRight, DollarSign, CalendarCheck, AlertCircle, Wallet } from 'lucide-react';
import { Card, Badge } from '../components/Common';
import { StatCardProps } from '../componentTypes';
import { getDashboardStats, getRecentActivity, getFinancialOverview, getRevenueData, getTopEntitiesByMunicipalities, FinancialStats, RevenueChartData } from '../services/dashboard';

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, trendUp, icon: Icon, color }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  };

  return (
    <div className="bg-white dark:bg-dark-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={`flex items-center font-medium ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
            {trendUp ? <TrendingUp className="w-4 h-4 mr-1" /> : <Activity className="w-4 h-4 mr-1" />}
            {trend}
          </span>
          <span className="ml-2 text-slate-400">vs mês anterior</span>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = React.useState({
    publicEntities: 0,
    privateEntities: 0,
    municipalities: 0,
    users: 0
  });
  const [financialStats, setFinancialStats] = React.useState<FinancialStats>({
    totalAnnualContracts: 0,
    totalReceived: 0,
    totalPending: 0,
    totalOverdue: 0
  });
  const [revenueData, setRevenueData] = React.useState<RevenueChartData[]>([]);
  const [topEntities, setTopEntities] = React.useState<{ name: string, value: number }[]>([]);
  const [activities, setActivities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardStats, recentActivity, finStats, revData, topEnts] = await Promise.all([
          getDashboardStats(),
          getRecentActivity(),
          getFinancialOverview(),
          getRevenueData(),
          getTopEntitiesByMunicipalities()
        ]);
        setStats(dashboardStats);
        setActivities(recentActivity);
        setFinancialStats(finStats);
        setRevenueData(revData);
        setTopEntities(topEnts);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-slate-500">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Visão Geral</h1>
        <div className="text-sm text-slate-500">Atualizado hoje às {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Entidades Públicas" value={stats.publicEntities} trend="+12%" trendUp={true} icon={Building2} color="blue" />
        <StatCard title="Entidades Privadas" value={stats.privateEntities} trend="+5%" trendUp={true} icon={Building2} color="purple" />
        <StatCard title="Municípios Ativos" value={stats.municipalities} trend="Total" trendUp={true} icon={Map} color="orange" />
        <StatCard title="Usuários do Sistema" value={stats.users} trend="Total" trendUp={true} icon={Users} color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Valor Contratado (Anual)"
          value={formatCurrency(financialStats.totalAnnualContracts)}
          trend="Previsão" trendUp={true}
          icon={DollarSign} color="blue"
        />
        <StatCard
          title="Recebido (Total)"
          value={formatCurrency(financialStats.totalReceived)}
          trend="Confirmado" trendUp={true}
          icon={Wallet} color="green"
        />
        <StatCard
          title="A Receber (Pendente)"
          value={formatCurrency(financialStats.totalPending)}
          trend="Aberto" trendUp={true}
          icon={CalendarCheck} color="orange"
        />
        <StatCard
          title="Em Atraso"
          value={formatCurrency(financialStats.totalOverdue)}
          trend="Atenção" trendUp={false}
          icon={AlertCircle} color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Receita: Previsto vs Realizado (2024)">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val / 1000}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="expected" name="Previsto" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="received" name="Recebido" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top Entidades por Municípios">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topEntities}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {topEntities.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#0ea5e9', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card title="Atividades Recentes" action={<a href="#" className="text-sm text-corp-500 hover:underline flex items-center">Ver tudo <ArrowUpRight className="w-4 h-4 ml-1" /></a>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-dark-900/50">
              <tr>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-4 py-3 font-medium">{activity.entityName}</td>
                  <td className="px-4 py-3 text-slate-500">{activity.action}</td>
                  <td className="px-4 py-3 text-slate-500">{activity.date}</td>
                  <td className="px-4 py-3"><Badge variant={activity.variant}>{activity.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
