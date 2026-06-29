import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ScanLine, Clock, ChevronRight, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock de pacientes que vieram da Recepção e aguardam Triagem
const MOCK_FILA = [
  {
    ticket: 'TR-1042',
    name: 'João da Silva',
    idade: '38',
    gender: 'M',
    chegada: '10:15',
    espera: '15 min'
  },
  {
    ticket: 'TR-1043',
    name: 'Maria Antonieta',
    idade: '33',
    gender: 'F',
    chegada: '10:20',
    espera: '10 min'
  },
  {
    ticket: 'TR-1044',
    name: 'Pedro Lucas',
    idade: '8',
    gender: 'M',
    chegada: '10:28',
    espera: '2 min',
    isMenor: true
  }
];

const FilaTriagem: React.FC = () => {
  const [ticketQuery, setTicketQuery] = useState('');
  const navigate = useNavigate();

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketQuery) return;
    navigate(`/triagem/atendimento/${ticketQuery}`);
  };

  const handleChamar = (ticket: string) => {
    navigate(`/triagem/atendimento/${ticket}`);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Leitor de Ticket / Busca */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Fila de Triagem</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Chame o próximo paciente ou faça a leitura do Ticket (QR Code).</p>
        
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          
          <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3 items-center w-full max-w-2xl">
            <div className="relative flex-1 w-full">
              <ScanLine className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Bipe o QR Code ou digite o Ticket..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all dark:text-white font-mono"
                value={ticketQuery}
                onChange={(e) => setTicketQuery(e.target.value)}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-2xl transition-colors shadow-sm shadow-emerald-200 dark:shadow-none w-full sm:w-auto whitespace-nowrap"
            >
              Iniciar Triagem
            </button>
          </form>
        </div>
      </div>

      {/* Lista da Fila */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Aguardando Chamada
          </h2>
          <span className="text-sm font-medium px-3 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full">
            {MOCK_FILA.length} pacientes
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Paciente</th>
                  <th className="px-6 py-4">Chegada</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {MOCK_FILA.map((paciente, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-lg text-sm">
                        {paciente.ticket}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${paciente.isMenor ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                          {paciente.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            {paciente.name}
                            {paciente.isMenor && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 px-1.5 py-0.5 rounded-md uppercase font-bold tracking-wider">Menor</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {paciente.idade} anos • {paciente.gender === 'M' ? 'Masculino' : 'Feminino'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-gray-200">{paciente.chegada}</p>
                      <p className="text-xs text-orange-500 font-medium mt-0.5">{paciente.espera} de espera</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleChamar(paciente.ticket)}
                        className="px-4 py-2 bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-2"
                      >
                        <Activity className="w-4 h-4" />
                        Chamar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FilaTriagem;
