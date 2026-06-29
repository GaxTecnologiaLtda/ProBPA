import React from 'react';
import { Tent, Users, Activity, FileCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const FeirasDashboard: React.FC = () => {
  const stats = [
    { label: 'Feiras Ativas (Mês)', value: '3', icon: Tent, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { label: 'Pacientes Atendidos', value: '1.450', icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
    { label: 'Procedimentos Lançados', value: '4.230', icon: FileCheck, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Welcome / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Painel de Ações Externas</h1>
          <p className="text-gray-500 mt-1">Acompanhe a produção e o alcance das Feiras de Saúde.</p>
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
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Últimas Feiras */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-orange-500" />
          Eventos Recentes
        </h3>
        
        <div className="space-y-4">
          {[
            { nome: 'Ação Outubro Rosa - Praça da Matriz', data: '15/10/2026', producao: '850 Procedimentos' },
            { nome: 'Mutirão da Saúde do Homem - Centro', data: '05/11/2026', producao: '420 Procedimentos' },
            { nome: 'Campanha de Vacinação Infantil', data: '12/10/2026', producao: '1.200 Doses Aplicadas' }
          ].map((feira, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">{feira.nome}</h4>
                <p className="text-sm text-gray-500">Data: {feira.data}</p>
              </div>
              <div className="px-4 py-1.5 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-bold text-sm rounded-full">
                {feira.producao}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default FeirasDashboard;
