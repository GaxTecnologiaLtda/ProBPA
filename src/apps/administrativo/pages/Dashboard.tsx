import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Building2, Users, Map, Activity, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Card, Badge } from '../components/Common';
import { StatCardProps } from '../componentTypes';
import { getDashboardStats, getRecentActivity } from '../services/dashboard';

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

const dataGrowth = [
  { name: 'Jan', public: 40, private: 24 },
  { name: 'Fev', public: 30, private: 13 },
  { name: 'Mar', public: 20, private: 58 },
  { name: 'Abr', public: 27, private: 39 },
  { name: 'Mai', public: 18, private: 48 },
  { name: 'Jun', public: 23, private: 38 },
  { name: 'Jul', public: 34, private: 43 },
];

const dataRegion = [
  { name: 'BA', value: 400 },
  { name: 'PE', value: 300 },
  { name: 'SP', value: 200 },
  { name: 'RJ', value: 278 },
  { name: 'MG', value: 189 },
];

const Dashboard: React.FC = () => {
  const [stats, setStats] = React.useState({
    publicEntities: 0,
    privateEntities: 0,
    municipalities: 0,
    users: 0
  });
  const [activities, setActivities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardStats, recentActivity] = await Promise.all([
          getDashboardStats(),
          getRecentActivity()
        ]);
        setStats(dashboardStats);
        setActivities(recentActivity);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
        <StatCard title="Municípios" value={stats.municipalities} trend="+18%" trendUp={true} icon={Map} color="orange" />
        <StatCard title="Usuários Totais" value={stats.users} trend="+4%" trendUp={true} icon={Users} color="green" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Crescimento de Entidades (2024)">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Line type="monotone" dataKey="public" stroke="#0ea5e9" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="private" stroke="#22c55e" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Cobertura por Região">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataRegion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.2} />
                <XAxis type="number" stroke="#94a3b8" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={30} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
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
