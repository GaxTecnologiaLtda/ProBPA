import React, { useState } from 'react';
import { Search, FileText, CheckCircle2, FlaskConical, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_EXAMES = [
  {
    id: 1,
    paciente: 'Carlos Eduardo',
    ticket: 'TR-1025',
    tipo: 'Hemograma Completo',
    coleta: '22/05/2026 14:10',
    urgente: false,
    parametros: [
      { nome: 'Hemácias', ref: '4.5 - 5.9 milhões/mm³', unidade: 'milhões/mm³', val: '' },
      { nome: 'Hemoglobina', ref: '13.5 - 17.5 g/dL', unidade: 'g/dL', val: '' },
      { nome: 'Leucócitos', ref: '4.500 - 11.000 /mm³', unidade: '/mm³', val: '' },
      { nome: 'Plaquetas', ref: '150.000 - 450.000 /mm³', unidade: '/mm³', val: '' }
    ]
  },
  {
    id: 2,
    paciente: 'Sofia Lima',
    ticket: 'TR-1029',
    tipo: 'PCR (Proteína C Reativa)',
    coleta: '22/05/2026 14:25',
    urgente: true,
    parametros: [
      { nome: 'Proteína C Reativa', ref: '< 5.0 mg/L', unidade: 'mg/L', val: '' }
    ]
  }
];

const CentralLaudos: React.FC = () => {
  const [exames, setExames] = useState(MOCK_EXAMES);
  const [selectedExame, setSelectedExame] = useState<typeof MOCK_EXAMES[0] | null>(null);

  const handleInputChange = (idx: number, value: string) => {
    if (!selectedExame) return;
    const newParams = [...selectedExame.parametros];
    newParams[idx].val = value;
    setSelectedExame({ ...selectedExame, parametros: newParams });
  };

  const handleLiberarLaudo = () => {
    if (!selectedExame) return;
    // Marca como liberado removendo da lista
    setExames(prev => prev.filter(e => e.id !== selectedExame.id));
    setSelectedExame(null);
    alert('Laudo assinado e liberado para o prontuário eletrônico com sucesso!');
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 h-[calc(100vh-100px)]">
      
      {/* Coluna Esquerda: Lista de Exames Pendentes de Digitação */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Central de Laudos</h1>
          <p className="text-gray-500 mt-1 text-sm">Amostras coletadas aguardando resultados.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar amostra..." 
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-cyan-500 text-sm outline-none dark:text-white"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {exames.length === 0 ? (
            <div className="text-center p-8 text-gray-500">Nenhum exame pendente de digitação.</div>
          ) : (
            exames.map(exame => (
              <button
                key={exame.id}
                onClick={() => setSelectedExame(exame)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedExame?.id === exame.id 
                    ? 'bg-cyan-50 border-cyan-300 dark:bg-cyan-900/30 dark:border-cyan-700' 
                    : 'bg-white border-gray-200 hover:border-cyan-300 dark:bg-gray-800 dark:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{exame.tipo}</h3>
                  {exame.urgente && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{exame.paciente}</p>
                <p className="text-xs text-gray-500 mt-1">Coleta: {exame.coleta}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Coluna Direita: Área de Digitação */}
      <div className="w-full lg:w-2/3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm flex flex-col overflow-hidden">
        {selectedExame ? (
          <>
            {/* Header da Digitação */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-cyan-600" />
                    {selectedExame.tipo}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">Paciente: <span className="font-bold text-gray-700 dark:text-gray-300">{selectedExame.paciente}</span> (Ticket: {selectedExame.ticket})</p>
                </div>
                {selectedExame.urgente && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold uppercase rounded-full">Urgência</span>
                )}
              </div>
            </div>

            {/* Formulário de Digitação */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {selectedExame.parametros.map((param, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white">{param.nome}</h4>
                      <p className="text-xs text-gray-500 mt-1">Ref: {param.ref}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="text" 
                        value={param.val}
                        onChange={(e) => handleInputChange(idx, e.target.value)}
                        placeholder="Resultado"
                        className="w-32 p-3 text-center rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-gray-900 dark:text-white"
                      />
                      <span className="text-sm font-medium text-gray-500 w-24">{param.unidade}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Observações do Laudo (Opcional)</label>
                <textarea 
                  className="w-full h-24 p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                  placeholder="Ex: Amostra levemente hemolisada..."
                ></textarea>
              </div>
            </div>

            {/* Footer / Actions */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button 
                onClick={handleLiberarLaudo}
                className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/30"
              >
                <CheckCircle2 className="w-5 h-5" />
                Assinar e Liberar Laudo
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <FileText className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Selecione um exame</h3>
            <p className="max-w-sm">Clique em um exame na lista ao lado para iniciar a digitação dos resultados.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default CentralLaudos;
