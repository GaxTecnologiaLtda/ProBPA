import React from 'react';
import { Bed, UserCheck, Activity, AlertTriangle, Pill, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const EnfermariaDashboard: React.FC = () => {
  const stats = [
    { label: 'Leitos Ocupados', value: '18', total: '24', icon: Bed, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Altas Previstas Hoje', value: '5', icon: UserCheck, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Medicações em Atraso', value: '2', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Welcome / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Painel Geral da Enfermaria</h1>
          <p className="text-gray-500 mt-1">Visão geral da ocupação e rotinas do plantão atual.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-6"
            >
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                <Icon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
                  {stat.total && <span className="text-gray-400 font-bold">/ {stat.total}</span>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Lembretes de Medicação Próximos */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Pill className="w-5 h-5 text-purple-500" />
              Próximas Medicações
            </h3>
            <span className="text-sm text-purple-600 font-bold">Ver todas</span>
          </div>

          <div className="space-y-4">
            {[
              { patient: 'Cláudio Santos', leito: '101-B', time: '14:00', med: 'Ceftriaxona 1g EV', status: 'pendente' },
              { patient: 'Sofia Lima', leito: 'Observação 2', time: '14:30', med: 'Dipirona 1g EV', status: 'pendente' },
              { patient: 'Roberto Alves', leito: '105-A', time: '12:00', med: 'Insulina NPH', status: 'atrasado' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${item.status === 'atrasado' ? 'bg-red-100 text-red-600' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {item.time}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{item.patient}</p>
                    <p className="text-xs text-gray-500">Leito: {item.leito} • {item.med}</p>
                  </div>
                </div>
                {item.status === 'atrasado' && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Atrasado
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sinais Vitais Pendentes */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Sinais Vitais (Rotina das 14h)
            </h3>
          </div>

          <div className="space-y-4">
            {[
              { patient: 'Antônio Ferreira', leito: '102-A' },
              { patient: 'Maria Joaquina', leito: '103-B' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{item.patient}</p>
                    <p className="text-xs text-gray-500">Leito: {item.leito}</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-sm font-bold transition-colors">
                  Aferir Agora
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default EnfermariaDashboard;
