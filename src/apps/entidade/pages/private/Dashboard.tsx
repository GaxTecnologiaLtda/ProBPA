import React, { useState, useEffect } from 'react';
import { Activity, Users, Map, TrendingUp, RefreshCw, Calendar, MapPin } from 'lucide-react';
import { StatCard, Card } from '../../components/ui/Components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { CHART_COLORS_PRIVATE } from '../../constants';
import { useDashboardData } from './useDashboardData';
import { useAuth } from '../../context/AuthContext';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { ProfessionalPerformanceWidget } from '../../components/reports/ProfessionalPerformanceWidget';

const Dashboard: React.FC = () => {
  const { claims } = useAuth();
  const currentYear = new Date().getFullYear();
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');

  const getDaysInMonth = (year: string, month: string) => {
    if (month === 'all') return [];
    const days = new Date(parseInt(year), parseInt(month), 0).getDate();
    return Array.from({ length: days }, (_, i) => String(i + 1));
  };

  // Reset day if month changes to 'all', or if day exceeds month length
  useEffect(() => {
    if (selectedMonth === 'all') {
      setSelectedDay('all');
    } else {
      const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
      if (selectedDay !== 'all' && !daysInMonth.includes(selectedDay)) {
        setSelectedDay('all');
      }
    }
  }, [selectedYear, selectedMonth]);
  const [municipalitiesList, setMunicipalitiesList] = useState<any[]>([]);

  useEffect(() => {
    if (claims?.entityId) {
      fetchMunicipalitiesByEntity(claims.entityId)
        .then(setMunicipalitiesList)
        .catch(console.error);
    }
  }, [claims?.entityId]);

  const { production, professionals, municipalities, goals, loading, syncing, syncData } = useDashboardData(selectedYear, selectedMonth, selectedDay, selectedMunicipality);
  const colors = CHART_COLORS_PRIVATE;
  const accentColorClass = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';



  return (
    <div className="relative space-y-6 min-h-[400px]">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-300 w-[90%] max-w-md text-center">
            <Activity className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Consolidando e agregando dados de produção...
            </span>
            <p className="text-xs text-center text-gray-500 mt-2 max-w-sm mx-auto">
              O tempo de processamento pode variar conforme o volume de registros da sua entidade. Estamos calculando seus indicadores em tempo real.
            </p>
          </div>
        </div>
      )}

      <div className={`space-y-6 transition-all duration-300 ${loading ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Visão Geral Institucional
          </h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={syncData}
              disabled={syncing || loading}
              className={`flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm outline-none transition-colors 
                ${(syncing || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-emerald-600 dark:hover:text-emerald-400 focus:ring-2 focus:ring-emerald-500'}`}
              title="Após a conclusão das extrações, aguarde alguns minutos para a finalização total da agregação em nuvem antes de clicar em Atualizar."
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(syncing) ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Atualizar Dados'}
            </button>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 flex items-center shadow-sm h-[38px] w-full sm:w-auto">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-500 mr-2 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0 hidden sm:inline-block">Município:</span>
              <select
                value={selectedMunicipality}
                onChange={(e) => setSelectedMunicipality(e.target.value)}
                className="text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 py-0.5 cursor-pointer outline-none min-w-[130px] flex-1"
              >
                <option value="all" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                  Todos os Municípios
                </option>
                {municipalitiesList.map((m) => (
                  <option key={m.id} value={m.id} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
              {/* Year Selector */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 flex items-center shadow-sm h-[38px] w-full sm:w-auto">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-500 mr-2 flex-shrink-0" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 py-0.5 cursor-pointer outline-none min-w-[70px]"
                >
                  <option value={currentYear.toString()}>Ano {currentYear}</option>
                  <option value={(currentYear - 1).toString()}>Ano {currentYear - 1}</option>
                  <option value={(currentYear - 2).toString()}>Ano {currentYear - 2}</option>
                </select>
              </div>

              {/* Month Selector */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 flex items-center shadow-sm h-[38px] w-full sm:w-auto">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 py-0.5 cursor-pointer outline-none min-w-[100px]"
                >
                  <option value="all">Todos os Meses</option>
                  {monthNames.map((monthName, index) => (
                    <option key={index + 1} value={String(index + 1)}>{monthName}</option>
                  ))}
                </select>
              </div>

              {/* Day Selector */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 flex items-center shadow-sm h-[38px] w-full sm:w-auto">
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  disabled={selectedMonth === 'all'}
                  className="text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 py-0.5 cursor-pointer outline-none min-w-[60px] disabled:opacity-50"
                >
                  <option value="all">Dias</option>
                  {getDaysInMonth(selectedYear, selectedMonth).map((day) => (
                    <option key={day} value={day}>Dia {day}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="Produção Pactuada"
            value={production.total.toLocaleString('pt-BR')}
            icon={Activity}
            colorClass={accentColorClass}
            helpText="Soma total dos procedimentos vinculados às Metas Globais realizadas no ano vigente."
          />
          <StatCard
            title="Produção Não Pactuada"
            value={(production.totalNonPactuated || 0).toLocaleString('pt-BR')}
            icon={Activity}
            trend="Extra-teto"
            trendUp={false}
            colorClass="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            helpText="Soma total de procedimentos realizados que não possuem vínculo com as metas estipuladas."
          />
          <StatCard
            title="Profissionais Vinculados"
            value={professionals.value.toLocaleString('pt-BR')}
            icon={Users}
            colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
            helpText="Total de profissionais ativos vinculados à entidade no momento."
          />
          <StatCard
            title="Municípios Parceiros"
            value={municipalities.value.toLocaleString('pt-BR')}
            icon={Map}
            colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
            helpText="Quantidade de municípios atendidos ou com pactuação ativa com a entidade."
          />
          <StatCard
            title="Metas Atingidas"
            value={goals.value}
            icon={TrendingUp}
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
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const pactuated = payload.find(p => p.dataKey === 'value')?.value || 0;
                          const nonPactuated = payload.find(p => p.dataKey === 'nonPactuated')?.value || 0;
                          return (
                            <div className="bg-gray-900 rounded-lg p-3 text-white shadow-xl shadow-black/20 border border-gray-800 text-sm">
                              <p className="font-bold mb-2 uppercase tracking-wide">{label}</p>
                              <div className="space-y-1">
                                <p className="text-[#10b981]">Pactuada: {pactuated.toLocaleString('pt-BR')}</p>
                                <p className="text-gray-400">Não Pactuada: {nonPactuated.toLocaleString('pt-BR')}</p>
                                <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-300">
                                  Total: {(Number(pactuated) + Number(nonPactuated)).toLocaleString('pt-BR')}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" name="Pactuada" stackId="a" fill={colors.secondary} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="nonPactuated" name="Não Pactuada" stackId="a" fill="#9ca3af" radius={[4, 4, 0, 0]} />
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

        {/* Zero Production Banner Only Injection */}
        <div className="mt-2">
           <ProfessionalPerformanceWidget 
              bannerOnly 
              initialYear={selectedYear} 
              initialMonth={selectedMonth} 
           />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;