import React from 'react';
import { Clock, Activity, Users, CalendarDays } from 'lucide-react';

const TriagemDashboard: React.FC = () => {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Painel da Triagem</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Visão geral do fluxo de classificação de risco.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl"><Clock className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aguardando Triagem</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">12</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-xl"><Activity className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tempo Médio</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">15m</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><Users className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Classificados Hoje</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">45</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl"><CalendarDays className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Classificados Mês</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">1.120</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TriagemDashboard;
