import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User, Activity, AlertTriangle, CheckCircle2, HeartPulse, Thermometer, Wind, Droplet, Frown, ClipboardList, Printer, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CLASSIFICACOES = [
  { id: 'vermelho', label: 'Emergência', tempo: '0 min', color: 'bg-red-500', text: 'text-white', ring: 'ring-red-500' },
  { id: 'laranja', label: 'Muito Urgente', tempo: '10 min', color: 'bg-orange-500', text: 'text-white', ring: 'ring-orange-500' },
  { id: 'amarelo', label: 'Urgente', tempo: '60 min', color: 'bg-yellow-400', text: 'text-gray-900', ring: 'ring-yellow-400' },
  { id: 'verde', label: 'Pouco Urgente', tempo: '120 min', color: 'bg-green-500', text: 'text-white', ring: 'ring-green-500' },
  { id: 'azul', label: 'Não Urgente', tempo: '240 min', color: 'bg-blue-500', text: 'text-white', ring: 'ring-blue-500' },
];

const COMORBIDADES_COMUNS = [
  'Hipertensão (HAS)', 'Diabetes (DM)', 'Asma', 'Doença Cardíaca', 'Doença Renal', 'Doença Hepática', 'Gestante', 'Imunossuprimido'
];

const AtendimentoTriagem: React.FC = () => {
  const { ticket } = useParams();
  const navigate = useNavigate();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [comorbidades, setComorbidades] = useState<string[]>([]);
  const [showFichaModal, setShowFichaModal] = useState(false);

  const toggleComorbidade = (item: string) => {
    setComorbidades(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleConcluir = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColor) {
      alert('Selecione uma classificação de risco!');
      return;
    }
    // Ao invés de redirecionar direto, abre a ficha gerada
    setShowFichaModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFinalizarEEnviar = () => {
    setShowFichaModal(false);
    navigate('/triagem/fila');
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 print:p-0 print:m-0 print:w-full print:max-w-full">
      <div className="flex items-center gap-4 print:hidden">
        <button
          onClick={() => navigate('/triagem/fila')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Atendimento
            <span className="text-sm font-mono bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2 py-1 rounded">
              Ticket: {ticket || 'TR-MOCK'}
            </span>
          </h1>
        </div>
      </div>

      <form onSubmit={handleConcluir} className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        
        {/* Coluna Esquerda: Sinais Vitais */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Sinais Vitais
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* PA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-red-500" /> P.A. (mmHg)
                </label>
                <input type="text" placeholder="120/80" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900/50 dark:border-gray-700 dark:text-white" />
              </div>
              
              {/* FC */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-orange-500" /> F.C. (bpm)
                </label>
                <input type="number" placeholder="80" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900/50 dark:border-gray-700 dark:text-white" />
              </div>

              {/* Temperatura */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-yellow-500" /> Temp. (°C)
                </label>
                <input type="number" step="0.1" placeholder="36.5" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900/50 dark:border-gray-700 dark:text-white" />
              </div>

              {/* O2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-blue-500" /> Saturação (%)
                </label>
                <input type="number" placeholder="98" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900/50 dark:border-gray-700 dark:text-white" />
              </div>

              {/* HGT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-red-600" /> Glicemia (mg/dL)
                </label>
                <input type="number" placeholder="90" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900/50 dark:border-gray-700 dark:text-white" />
              </div>

              {/* Dor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <Frown className="w-4 h-4 text-purple-500" /> Escala de Dor (0-10)
                </label>
                <input type="number" min="0" max="10" placeholder="0" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900/50 dark:border-gray-700 dark:text-white" />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                Anamnese / Histórico
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Queixa Principal / História Atual da Doença
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="Descreva o motivo da vinda ao hospital..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900/50 dark:border-gray-700 dark:text-white resize-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Alergias
                    </label>
                    <input type="text" placeholder="Ex: Penicilina, Dipirona..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900/50 dark:border-gray-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Medicamentos em Uso
                    </label>
                    <input type="text" placeholder="Ex: Losartana 50mg..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900/50 dark:border-gray-700 dark:text-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Comorbidades e Condições
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COMORBIDADES_COMUNS.map(item => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleComorbidade(item)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                          comorbidades.includes(item)
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-900/50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Classificação */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Classificação de Risco
            </h2>

            <div className="space-y-3">
              {CLASSIFICACOES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedColor(item.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    selectedColor === item.id 
                      ? `${item.color} ${item.text} border-transparent scale-[1.02] shadow-md` 
                      : `bg-gray-50 dark:bg-gray-900/50 border-transparent hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Indicador de cor sempre visível se não selecionado */}
                    {selectedColor !== item.id && (
                      <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                    )}
                    <span className="font-bold">{item.label}</span>
                  </div>
                  <span className={`text-xs font-mono font-medium opacity-80 ${selectedColor === item.id ? item.text : ''}`}>
                    {item.tempo}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
              <button
                type="submit"
                disabled={!selectedColor}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedColor 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30' 
                    : 'bg-gray-200 text-gray-400 dark:bg-gray-700 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                Gerar Ficha Clínica
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Modal Ficha Clínica */}
      <AnimatePresence>
        {showFichaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:p-0 bg-black/60 backdrop-blur-sm print:bg-white print:backdrop-blur-none overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 print:bg-white w-full max-w-3xl rounded-3xl print:rounded-none shadow-2xl print:shadow-none overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:h-auto"
            >
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 print:border-b-2 print:border-black flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 print:bg-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl print:bg-transparent print:p-0 print:text-black">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">Ficha Clínica de Triagem</h2>
                    <p className="text-sm text-gray-500 print:text-gray-800">Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <button onClick={handlePrint} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors dark:hover:bg-gray-800" title="Imprimir">
                    <Printer className="w-5 h-5" />
                  </button>
                  <button onClick={() => setShowFichaModal(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors dark:hover:bg-gray-800">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto print:overflow-visible print:p-4">
                {/* Print Layout: Ticket Info */}
                <div className="mb-4 pb-4 border-b border-gray-200 border-dashed print:border-black">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Paciente</p>
                      <h3 className="text-base font-bold text-gray-900 print:text-black uppercase">João da Silva</h3>
                      <p className="text-xs text-gray-600">Nasc: 12/05/1985 (38 anos) • Sexo: Masculino</p>
                      <p className="text-xs text-gray-600">CNS: 7001.2345.6789.001</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-medium">Ticket</p>
                      <h3 className="text-lg font-mono font-bold text-gray-900 print:text-black">{ticket || 'TR-MOCK'}</h3>
                    </div>
                  </div>
                </div>

                {/* Print Layout: Classificação */}
                {selectedColor && (
                  <div className="mb-4 p-3 rounded-xl border-2 print:border-black flex items-center gap-3 bg-gray-50">
                    <div className={`w-5 h-5 rounded-full ${CLASSIFICACOES.find(c => c.id === selectedColor)?.color || 'bg-gray-500'} print:border-2 print:border-black !print:bg-transparent`}></div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Classificação de Risco</p>
                      <h3 className="text-lg font-bold text-gray-900 print:text-black">{CLASSIFICACOES.find(c => c.id === selectedColor)?.label}</h3>
                    </div>
                  </div>
                )}

                {/* Print Layout: Sinais Vitais */}
                <div className="mb-4">
                  <h4 className="font-bold text-gray-900 print:text-black uppercase mb-2 text-xs tracking-wider">Sinais Vitais</h4>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-gray-50 rounded-lg print:border print:border-gray-300">
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">P.A. (mmHg)</p>
                      <p className="text-sm sm:text-base font-bold text-gray-900">120/80</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-gray-50 rounded-lg print:border print:border-gray-300">
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">F.C. (bpm)</p>
                      <p className="text-sm sm:text-base font-bold text-gray-900">80</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-gray-50 rounded-lg print:border print:border-gray-300">
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Temp. (°C)</p>
                      <p className="text-sm sm:text-base font-bold text-gray-900">36.5</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-gray-50 rounded-lg print:border print:border-gray-300">
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">SpO2 (%)</p>
                      <p className="text-sm sm:text-base font-bold text-gray-900">98</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-gray-50 rounded-lg print:border print:border-gray-300">
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Glicemia</p>
                      <p className="text-sm sm:text-base font-bold text-gray-900">90</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-gray-50 rounded-lg print:border print:border-gray-300">
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Dor (0-10)</p>
                      <p className="text-sm sm:text-base font-bold text-gray-900">0</p>
                    </div>
                  </div>
                </div>

                {/* Print Layout: Anamnese */}
                <div className="mb-4">
                  <h4 className="font-bold text-gray-900 print:text-black uppercase mb-2 text-xs tracking-wider">Anamnese</h4>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Queixa Principal:</p>
                      <p className="text-gray-900 bg-gray-50 p-2 sm:p-3 rounded-lg print:border print:border-gray-300 min-h-[40px]">Nenhuma queixa relatada no mock.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div>
                        <p className="font-medium text-gray-700">Alergias:</p>
                        <p className="text-gray-900 bg-gray-50 p-2 sm:p-3 rounded-lg print:border print:border-gray-300">Nega alergias</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Uso Contínuo:</p>
                        <p className="text-gray-900 bg-gray-50 p-2 sm:p-3 rounded-lg print:border print:border-gray-300">Nega medicamentos</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Comorbidades Informadas:</p>
                      <p className="text-gray-900 bg-gray-50 p-2 sm:p-3 rounded-lg print:border print:border-gray-300">
                        {comorbidades.length > 0 ? comorbidades.join(', ') : 'Nenhuma'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Print Layout: Conduta Médica (Espaço em branco para preenchimento manual) */}
                <div className="mb-6 hidden print:block">
                  <h4 className="font-bold text-gray-900 print:text-black uppercase mb-2 text-xs tracking-wider">Avaliação e Conduta Médica</h4>
                  <div className="border border-gray-300 rounded-lg h-32 p-2 text-gray-400 text-xs">
                    Espaço reservado para evolução, conduta e prescrição médica...
                  </div>
                </div>

                {/* Print Layout: Assinaturas */}
                <div className="mt-8 pt-6 flex justify-between gap-4 text-center text-[10px] sm:text-xs print:flex">
                  <div className="flex-1">
                    <div className="border-t border-black pt-1.5 font-bold text-gray-900">Assinatura do Paciente</div>
                  </div>
                  <div className="flex-1">
                    <div className="border-t border-black pt-1.5 font-bold text-gray-900">Enfermeiro(a) da Triagem<br/><span className="font-normal">COREN: _________</span></div>
                  </div>
                  <div className="flex-1 hidden print:block">
                    <div className="border-t border-black pt-1.5 font-bold text-gray-900">Médico(a) Responsável<br/><span className="font-normal">CRM: _________</span></div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 print:hidden">
                <button
                  onClick={handleFinalizarEEnviar}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                  Confirmar e Enviar para Fila Médica
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AtendimentoTriagem;
