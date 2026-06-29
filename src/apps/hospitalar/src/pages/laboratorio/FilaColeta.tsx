import React, { useState } from 'react';
import { Search, Printer, Syringe, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_COLETAS = [
  {
    id: 1,
    paciente: 'Carlos Eduardo',
    idade: 52,
    origem: 'Enfermaria (Leito 101-A)',
    tempoEspera: '15 min',
    prioridade: 'Normal',
    exames: ['Hemograma Completo', 'Glicemia', 'Colesterol Total'],
    tubos: [
      { cor: 'bg-purple-600', nome: 'Roxo (EDTA)' },
      { cor: 'bg-yellow-400', nome: 'Amarelo (Soro/Gel)' }
    ],
    status: 'pendente'
  },
  {
    id: 2,
    paciente: 'Sofia Lima',
    idade: 8,
    origem: 'Triagem (Pronto-Socorro)',
    tempoEspera: '5 min',
    prioridade: 'Urgência',
    exames: ['Hemograma', 'PCR'],
    tubos: [
      { cor: 'bg-purple-600', nome: 'Roxo (EDTA)' },
      { cor: 'bg-red-600', nome: 'Vermelho (Soro)' }
    ],
    status: 'pendente'
  },
  {
    id: 3,
    paciente: 'Maria Souza',
    idade: 34,
    origem: 'Enfermaria (Leito 102-A)',
    tempoEspera: '-',
    prioridade: 'Normal',
    exames: ['Coagulograma'],
    tubos: [
      { cor: 'bg-blue-400', nome: 'Azul (Citrato)' }
    ],
    status: 'coletado'
  }
];

const FilaColeta: React.FC = () => {
  const [coletas, setColetas] = useState(MOCK_COLETAS);
  const [search, setSearch] = useState('');

  const handleColetar = (id: number) => {
    setColetas(prev => prev.map(c => c.id === id ? { ...c, status: 'coletado' } : c));
  };

  const handleImprimir = () => {
    alert('Simulação: Imprimindo etiquetas de código de barras para os tubos...');
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Posto de Coleta</h1>
          <p className="text-gray-500 mt-1">Gerencie a fila de pacientes e os tubos necessários para coleta.</p>
        </div>
        <button 
          onClick={handleImprimir}
          className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
        >
          <Printer className="w-5 h-5" />
          Imprimir Etiquetas
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex items-center shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar paciente ou origem..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-cyan-500 dark:text-white outline-none"
          />
        </div>
      </div>

      {/* Lista de Pacientes */}
      <div className="space-y-4">
        <AnimatePresence>
          {coletas.filter(c => c.paciente.toLowerCase().includes(search.toLowerCase())).map((item) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-white dark:bg-gray-800 rounded-3xl p-6 border shadow-sm transition-colors ${
                item.status === 'coletado' 
                  ? 'border-green-200 dark:border-green-900/50 opacity-60' 
                  : item.prioridade === 'Urgência' 
                    ? 'border-red-200 dark:border-red-900/50' 
                    : 'border-gray-100 dark:border-gray-700'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Info Paciente */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{item.paciente}</h3>
                    {item.prioridade === 'Urgência' && (
                      <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold uppercase rounded-full">Urgência</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Idade: {item.idade} anos • Origem: <span className="font-bold">{item.origem}</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Aguardando há {item.tempoEspera}
                  </p>
                </div>

                {/* Exames e Tubos */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-3">Material a Coletar</p>
                  
                  <div className="flex flex-wrap gap-4 mb-3">
                    {item.tubos.map((tubo, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm" title={tubo.nome}>
                        {/* Representação visual do tubo */}
                        <div className="w-3 h-8 rounded-full border border-gray-300 dark:border-gray-600 relative overflow-hidden bg-white/50">
                          <div className={`absolute top-0 inset-x-0 h-3 ${tubo.cor}`}></div>
                        </div>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{tubo.nome.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 line-clamp-2">Exames: {item.exames.join(', ')}</p>
                </div>

                {/* Ações */}
                <div className="flex items-center justify-end min-w-[140px]">
                  {item.status === 'pendente' ? (
                    <button 
                      onClick={() => handleColetar(item.id)}
                      className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30"
                    >
                      <Syringe className="w-5 h-5" />
                      Coletar
                    </button>
                  ) : (
                    <div className="w-full py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-bold rounded-xl flex items-center justify-center gap-2 border border-green-200 dark:border-green-900/50">
                      <CheckCircle2 className="w-5 h-5" />
                      Coletado
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FilaColeta;
