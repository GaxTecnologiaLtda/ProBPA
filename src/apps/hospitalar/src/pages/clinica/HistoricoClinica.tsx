import React, { useState } from 'react';
import { Search, Calendar, Filter, FileText, User, Activity, Printer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_HISTORICO = [
  { 
    id: '1', ticket: 'TR-1030', name: 'Antônio Ferreira', date: '22/05/2026', time: '11:15', desfecho: 'Alta Médica', cid: 'I20.0',
    prontuario: {
      queixa: 'Dor torácica leve',
      exameFisico: 'Bom estado geral, eupneico. ACV: RCVRNF sem sopros. AP: MV+ sem RA.',
      evolucao: 'Melhora da dor após analgesia. Eletrocardiograma sem alterações isquêmicas.',
      prescricao: '1. AAS 100mg - 1cp VO / dia\n2. Retornar em caso de piora.'
    }
  },
  { 
    id: '2', ticket: 'TR-1029', name: 'Sofia Lima (Menor)', date: '22/05/2026', time: '10:45', desfecho: 'Observação', cid: 'A09',
    prontuario: {
      queixa: 'Diarreia e vômitos há 2 dias',
      exameFisico: 'Desidratada ++/4. Afebril. Abdome flácido, RHA+.',
      evolucao: 'Deixada em observação para hidratação venosa. Melhora clínica após 1000ml de Soro Fisiológico.',
      prescricao: '1. Soro de Reidratação Oral\n2. Ondansetrona 4mg se náusea.'
    }
  },
  { 
    id: '3', ticket: 'TR-1028', name: 'Cláudio Santos', date: '22/05/2026', time: '09:30', desfecho: 'Internação', cid: 'J18.9',
    prontuario: {
      queixa: 'Febre alta e tosse produtiva',
      exameFisico: 'BEG, taquipneico. AP: Crepitações em base direita.',
      evolucao: 'Raio-X tórax evidencia consolidação em base direita. Solicitado vaga de internação para antibioticoterapia venosa.',
      prescricao: '1. Ceftriaxona 1g EV 12/12h\n2. Dipirona 1g EV SN.'
    }
  },
];

const HistoricoClinica: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedProntuario, setSelectedProntuario] = useState<typeof MOCK_HISTORICO[0] | null>(null);

  const getDesfechoColor = (desfecho: string) => {
    switch(desfecho) {
      case 'Alta Médica': return 'bg-green-100 text-green-700 border-green-200';
      case 'Observação': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Internação': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Histórico de Consultas</h1>
          <p className="text-gray-500 mt-1">Consulte os prontuários dos pacientes atendidos no seu plantão.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por Nome, Ticket ou CID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
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
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Paciente</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data / Hora</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Desfecho</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {MOCK_HISTORICO.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white block">{item.name}</span>
                        <span className="text-xs text-gray-500">CID: {item.cid}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {item.ticket}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-3 h-3" /> {item.date} <span className="mx-1">•</span> {item.time}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getDesfechoColor(item.desfecho)}`}>
                      {item.desfecho}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedProntuario(item)}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Prontuário
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Visualização Prontuário */}
      <AnimatePresence>
        {selectedProntuario && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedProntuario(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between bg-gray-50/50 dark:bg-gray-900/50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Prontuário de Atendimento
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedProntuario.name} • Ticket: {selectedProntuario.ticket} • {selectedProntuario.date} {selectedProntuario.time}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedProntuario(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Desfecho Status */}
                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 uppercase">Desfecho</p>
                    <span className={`inline-flex items-center px-2.5 py-1 mt-1 rounded-full text-xs font-bold border ${getDesfechoColor(selectedProntuario.desfecho)}`}>
                      {selectedProntuario.desfecho}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 uppercase">Diagnóstico (CID)</p>
                    <p className="font-bold text-gray-900 dark:text-white mt-1">{selectedProntuario.cid}</p>
                  </div>
                </div>

                {/* Textos Evolução */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Queixa Principal</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      {selectedProntuario.prontuario.queixa}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Exame Físico</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      {selectedProntuario.prontuario.exameFisico}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Evolução Clínica</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      {selectedProntuario.prontuario.evolucao}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Prescrição / Conduta</h4>
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      <pre className="text-sm text-blue-900 dark:text-blue-300 whitespace-pre-wrap font-sans">
                        {selectedProntuario.prontuario.prescricao}
                      </pre>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                <button 
                  onClick={() => alert('Layout de impressão de 2ª via da prescrição')}
                  className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Re-imprimir Receita
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HistoricoClinica;
