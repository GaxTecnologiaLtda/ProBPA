import React from 'react';
import { Users, Activity, Clock, CalendarDays, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral</h1>
          <p className="text-gray-500 dark:text-gray-400">Acompanhamento em tempo real da recepção e acolhimento.</p>
        </div>
        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300">
          Última atualização: Hoje às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock className="w-24 h-24 text-red-600" />
          </div>
          <div className="flex items-center justify-between">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <span className="flex items-center text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Alta demanda
            </span>
          </div>
          <div>
            <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">12</h3>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total em Espera</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Activity className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl">
              <Activity className="w-6 h-6" />
            </div>
            <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3 mr-1" />
              Fluindo
            </span>
          </div>
          <div>
            <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">45</h3>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Triagem</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="w-24 h-24 text-blue-600" />
          </div>
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">87</h3>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Acolhimentos Hoje</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CalendarDays className="w-24 h-24 text-purple-600" />
          </div>
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">1.450</h3>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Acolhimentos no Mês</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Decorative empty state or chart placeholder */}
      <motion.div 
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 flex flex-col items-center justify-center min-h-[300px]"
      >
        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-700">
          <Activity className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Gráficos de Fluxo em Breve</h3>
        <p className="text-sm text-gray-500 text-center max-w-md mt-2">
          Esta área será destinada a gráficos detalhados de tempo médio de espera e pico de atendimentos por horário.
        </p>
      </motion.div>
    </div>
  );
};

export default Dashboard;
