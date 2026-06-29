import React, { useState } from 'react';
import { Search, Filter, FileText, Calendar, Clock, User } from 'lucide-react';

const MOCK_HISTORICO = [
  { id: '1', ticket: 'TR-1042', name: 'João da Silva', date: '22/05/2026', time: '08:15', risk: 'Amarelo', nurse: 'Enf. Maria' },
  { id: '2', ticket: 'TR-1041', name: 'Ana Souza', date: '22/05/2026', time: '07:50', risk: 'Verde', nurse: 'Enf. Carlos' },
  { id: '3', ticket: 'TR-1040', name: 'Marcos Oliveira (Menor)', date: '22/05/2026', time: '07:30', risk: 'Laranja', nurse: 'Enf. Maria' },
  { id: '4', ticket: 'TR-1039', name: 'Cláudia Ramos', date: '21/05/2026', time: '23:10', risk: 'Verde', nurse: 'Enf. Carlos' },
];

const getRiskColor = (risk: string) => {
  switch(risk) {
    case 'Vermelho': return 'bg-red-100 text-red-700 border-red-200';
    case 'Laranja': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'Amarelo': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'Verde': return 'bg-green-100 text-green-700 border-green-200';
    case 'Azul': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const HistoricoTriagem: React.FC = () => {
  const [search, setSearch] = useState('');

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Histórico de Triagem</h1>
          <p className="text-gray-500 mt-1">Consulte os prontuários e fichas dos pacientes já avaliados.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por Nome, CPF ou Ticket..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-white"
          />
        </div>
        <button className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 whitespace-nowrap">
          <Calendar className="w-4 h-4" />
          Hoje
        </button>
        <button className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 whitespace-nowrap">
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Paciente</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data / Hora</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Classificação</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Profissional</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {MOCK_HISTORICO.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {item.ticket}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-3 h-3" /> {item.date} <span className="mx-1">•</span> <Clock className="w-3 h-3" /> {item.time}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getRiskColor(item.risk)}`}>
                      {item.risk}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.nurse}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => alert(`Funcionalidade de visualizar ficha do ${item.ticket} em construção.`)}
                      className="px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Visualizar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoricoTriagem;
