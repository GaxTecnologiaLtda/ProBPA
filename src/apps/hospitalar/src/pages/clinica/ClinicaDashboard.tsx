import React from 'react';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, Clock, TrendingUp, HeartPulse, Activity } from 'lucide-react';

const ClinicaDashboard: React.FC = () => {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral do Plantão</h1>
          <p className="text-gray-500 mt-1">Acompanhamento em tempo real da fila de atendimentos.</p>
        </div>
      </div>

      {/* Cards de Risco */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.0 }} className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></div>
            <span className="text-sm font-bold text-red-700 dark:text-red-400 uppercase">Emergência</span>
          </div>
          <p className="text-3xl font-black text-red-700 dark:text-red-400">1</p>
          <p className="text-xs text-red-600/70 dark:text-red-500 mt-1 font-medium">Aguardando atendimento</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></div>
            <span className="text-sm font-bold text-orange-700 dark:text-orange-400 uppercase">Muito Urgente</span>
          </div>
          <p className="text-3xl font-black text-orange-700 dark:text-orange-400">2</p>
          <p className="text-xs text-orange-600/70 dark:text-orange-500 mt-1 font-medium">Aguardando atendimento</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400/50"></div>
            <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400 uppercase">Urgente</span>
          </div>
          <p className="text-3xl font-black text-yellow-700 dark:text-yellow-400">5</p>
          <p className="text-xs text-yellow-600/70 dark:text-yellow-500 mt-1 font-medium">Aguardando atendimento</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
            <span className="text-sm font-bold text-green-700 dark:text-green-400 uppercase">Pouco Urgente</span>
          </div>
          <p className="text-3xl font-black text-green-700 dark:text-green-400">12</p>
          <p className="text-xs text-green-600/70 dark:text-green-500 mt-1 font-medium">Aguardando atendimento</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
            <span className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase">Não Urgente</span>
          </div>
          <p className="text-3xl font-black text-blue-700 dark:text-blue-400">8</p>
          <p className="text-xs text-blue-600/70 dark:text-blue-500 mt-1 font-medium">Aguardando atendimento</p>
        </motion.div>
      </div>

      {/* Estatísticas Secundárias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Atendimentos Hoje</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">42</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Tempo Médio (Urgência)</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">14 min</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Taxa de Internação</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">8.5%</p>
          </div>
        </motion.div>
      </div>

    </div>
  );
};

export default ClinicaDashboard;
