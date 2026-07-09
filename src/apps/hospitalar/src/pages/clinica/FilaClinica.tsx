import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Stethoscope, AlertTriangle, User } from 'lucide-react';
import { motion } from 'framer-motion';

// Ordem de prioridade (0 = mais crítico)
const RISK_ORDER: Record<string, number> = {
  'Vermelho': 0,
  'Laranja': 1,
  'Amarelo': 2,
  'Verde': 3,
  'Azul': 4,
};

const MOCK_FILA = [
  { id: '1', ticket: 'TR-1044', name: 'José das Couves', age: 65, gender: 'M', risk: 'Amarelo', time: '45 min', queixa: 'Dor no peito irradiando para o braço esquerdo.' },
  { id: '2', ticket: 'TR-1045', name: 'Maria Joaquina', age: 29, gender: 'F', risk: 'Vermelho', time: '5 min', queixa: 'Acidente automobilístico, sangramento ativo.' },
  { id: '3', ticket: 'TR-1046', name: 'Carla Dias', age: 41, gender: 'F', risk: 'Verde', time: '1h 20m', queixa: 'Dor de cabeça leve há 2 dias.' },
  { id: '4', ticket: 'TR-1047', name: 'Pedro Alves', age: 12, gender: 'M', risk: 'Laranja', time: '12 min', queixa: 'Crise asmática severa.' },
];

const getRiskStyles = (risk: string) => {
  switch(risk) {
    case 'Vermelho': return { bg: 'bg-red-500', text: 'text-red-700', badgeBg: 'bg-red-100', border: 'border-red-200' };
    case 'Laranja': return { bg: 'bg-orange-500', text: 'text-orange-700', badgeBg: 'bg-orange-100', border: 'border-orange-200' };
    case 'Amarelo': return { bg: 'bg-yellow-400', text: 'text-yellow-700', badgeBg: 'bg-yellow-100', border: 'border-yellow-200' };
    case 'Verde': return { bg: 'bg-green-500', text: 'text-green-700', badgeBg: 'bg-green-100', border: 'border-green-200' };
    case 'Azul': return { bg: 'bg-blue-500', text: 'text-blue-700', badgeBg: 'bg-blue-100', border: 'border-blue-200' };
    default: return { bg: 'bg-gray-500', text: 'text-gray-700', badgeBg: 'bg-gray-100', border: 'border-gray-200' };
  }
};

const FilaClinica: React.FC = () => {
  const navigate = useNavigate();

  // Ordenar a fila pela prioridade de Manchester, e depois pelo tempo (simulado aqui)
  const filaOrdenada = [...MOCK_FILA].sort((a, b) => {
    return RISK_ORDER[a.risk] - RISK_ORDER[b.risk];
  });

  const proximoPaciente = filaOrdenada[0];

  const handleChamar = (ticket: string) => {
    navigate(`/clinica/atendimento/${ticket}`);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fila de Atendimento</h1>
          <p className="text-gray-500 mt-1">Pacientes triados ordenados por Protocolo de Manchester.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Col: Tabela de Espera */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white">Aguardando Chamada</h2>
              <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold px-2 py-1 rounded-lg">
                {filaOrdenada.length} pacientes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filaOrdenada.map((paciente) => {
                    const styles = getRiskStyles(paciente.risk);
                    return (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={paciente.id} 
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group"
                      >
                        <td className="px-6 py-4 w-1 flex-shrink-0">
                          <div className={`w-3 h-12 rounded-full ${styles.bg}`}></div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold">
                              {paciente.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{paciente.name}</p>
                              <p className="text-xs text-gray-500">{paciente.age} anos • Sexo {paciente.gender}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell w-1/3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2" title={paciente.queixa}>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">Motivo:</span> {paciente.queixa}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${styles.badgeBg} ${styles.text} ${styles.border}`}>
                            {paciente.risk}
                          </span>
                          <p className="text-xs text-gray-500 mt-1 font-medium">{paciente.time} de espera</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleChamar(paciente.ticket)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                            title="Atender Paciente"
                          >
                            <ChevronRight className="w-6 h-6" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                  {filaOrdenada.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Nenhum paciente na fila no momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Side Col: Próximo Paciente Highlight */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-900/20 sticky top-24">
            <div className="flex items-center gap-2 text-blue-200 mb-6 font-medium text-sm">
              <AlertTriangle className="w-4 h-4" />
              Prioridade Máxima Atual
            </div>

            {proximoPaciente ? (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl border-4 border-white/20 shadow-inner ${getRiskStyles(proximoPaciente.risk).bg}`}>
                    {proximoPaciente.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">{proximoPaciente.name}</h3>
                    <p className="text-blue-200 text-sm mt-1">{proximoPaciente.ticket}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <p className="text-blue-200 text-xs mb-1">Classificação (Manchester)</p>
                    <p className="font-bold flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getRiskStyles(proximoPaciente.risk).bg}`}></span>
                      {proximoPaciente.risk.toUpperCase()}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <p className="text-blue-200 text-xs mb-1">Queixa na Triagem</p>
                    <p className="font-medium text-sm line-clamp-3">{proximoPaciente.queixa}</p>
                  </div>
                </div>

                <button 
                  onClick={() => handleChamar(proximoPaciente.ticket)}
                  className="w-full py-4 bg-white text-blue-700 hover:bg-blue-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <Stethoscope className="w-5 h-5" />
                  Chamar para Atendimento
                </button>
              </>
            ) : (
              <div className="py-12 text-center text-blue-200">
                Fila zerada. Excelente trabalho!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FilaClinica;
