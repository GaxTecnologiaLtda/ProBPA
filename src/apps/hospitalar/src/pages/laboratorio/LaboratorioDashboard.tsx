import React from 'react';
import { Beaker, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const LaboratorioDashboard: React.FC = () => {
  const stats = [
    { label: 'Aguardando Coleta', value: '12', icon: Users, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { label: 'Em Análise', value: '45', icon: Beaker, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
    { label: 'Laudos Liberados (Hoje)', value: '128', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Welcome / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Painel do Laboratório</h1>
          <p className="text-gray-500 mt-1">Acompanhe as coletas pendentes e a emissão de laudos.</p>
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

      {/* Alertas Críticos */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5" />
          Atenção: Exames de Urgência (Pronto-Socorro)
        </h3>
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900 dark:text-white">Sofia Lima (Ticket: TR-1029)</p>
              <p className="text-sm text-gray-500">Hemograma Completo • Aguardando resultado há 45 min</p>
            </div>
            <button className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition-colors">
              Acelerar Laudo
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LaboratorioDashboard;
