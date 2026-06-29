import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, User, Activity, AlertTriangle, FileText, 
  Stethoscope, Pill, Printer, CheckCircle2, ChevronDown, Check, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import ReceituarioImpresso from './ReceituarioImpresso';

const MOCK_PATIENT = {
  ticket: 'TR-1045',
  name: 'Maria Joaquina',
  age: 29,
  gender: 'F',
  risk: 'Vermelho',
  vitals: {
    pa: '90/60 mmHg',
    fc: '120 bpm',
    temp: '36.5 °C',
    sat: '94%',
    resp: '24 irpm'
  },
  triagem: {
    queixa: 'Acidente automobilístico, sangramento ativo em membro inferior.',
    alergias: 'Nenhuma conhecida',
    medicamentos: 'Anticoncepcional',
    comorbidades: 'Nenhuma'
  }
};

const getRiskColor = (risk: string) => {
  switch(risk) {
    case 'Vermelho': return 'bg-red-500 text-white';
    case 'Laranja': return 'bg-orange-500 text-white';
    case 'Amarelo': return 'bg-yellow-400 text-yellow-900';
    case 'Verde': return 'bg-green-500 text-white';
    case 'Azul': return 'bg-blue-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const MOCK_CIDS = [
  { code: 'S81.9', name: 'Ferimento não especificado da perna' },
  { code: 'V49.9', name: 'Ocupante não especificado de um automóvel traumatizado em um acidente de trânsito' },
  { code: 'I10', name: 'Hipertensão essencial (primária)' },
  { code: 'E11.9', name: 'Diabetes mellitus não-insulino-dependente sem complicações' },
  { code: 'J01.9', name: 'Sinusite aguda não especificada' },
  { code: 'J11.1', name: 'Influenza com outras manifestações respiratórias' },
  { code: 'A09', name: 'Diarreia e gastroenterite de origem infecciosa presumível' },
  { code: 'M54.5', name: 'Dor lombar baixa' },
  { code: 'R50.9', name: 'Febre não especificada' },
  { code: 'R51', name: 'Cefaleia' },
  { code: 'K35.8', name: 'Outras apendicites agudas e as não especificadas' },
];

const AtendimentoClinico: React.FC = () => {
  const navigate = useNavigate();
  const { ticket } = useParams();

  const [activeTab, setActiveTab] = useState<'anamnese' | 'diagnostico' | 'prescricao'>('anamnese');
  
  // Forms State
  const [exameFisico, setExameFisico] = useState('');
  const [evolucao, setEvolucao] = useState('');
  const [buscaCid, setBuscaCid] = useState('');
  const [selectedCids, setSelectedCids] = useState<{code: string, name: string, type: 'Principal'|'Secundário'}[]>([]);
  const [prescricao, setPrescricao] = useState('');
  
  // Modal State
  const [showDesfechoModal, setShowDesfechoModal] = useState(false);
  const [desfecho, setDesfecho] = useState('');

  const handleImprimirReceita = () => {
    if (!prescricao.trim()) {
      alert('Por favor, preencha a prescrição antes de imprimir.');
      return;
    }
    setTimeout(() => window.print(), 100);
  };

  const handleFinalizar = () => {
    setShowDesfechoModal(false);
    navigate('/clinica/fila');
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header com Voltar e Identificação */}
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => navigate('/clinica/fila')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-300"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Atendimento: {MOCK_PATIENT.name}
            <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider ${getRiskColor(MOCK_PATIENT.risk)}`}>
              {MOCK_PATIENT.risk}
            </span>
          </h1>
          <p className="text-gray-500 text-sm">
            Ticket: <span className="font-bold">{ticket || MOCK_PATIENT.ticket}</span> • 
            {MOCK_PATIENT.age} anos • Sexo {MOCK_PATIENT.gender}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna Esquerda: Sinais Vitais (Triagem) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-500" />
              Sinais Vitais (Triagem)
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Pressão Arterial</p>
                <p className="font-bold text-gray-900 dark:text-white">{MOCK_PATIENT.vitals.pa}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Freq. Cardíaca</p>
                <p className="font-bold text-gray-900 dark:text-white">{MOCK_PATIENT.vitals.fc}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Oximetria (SpO2)</p>
                <p className="font-bold text-gray-900 dark:text-white">{MOCK_PATIENT.vitals.sat}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Temperatura</p>
                <p className="font-bold text-gray-900 dark:text-white">{MOCK_PATIENT.vitals.temp}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Queixa Principal</p>
                <p className="text-sm text-gray-800 dark:text-gray-300 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30">
                  {MOCK_PATIENT.triagem.queixa}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Alergias</p>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{MOCK_PATIENT.triagem.alergias}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Comorbidades</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-300">{MOCK_PATIENT.triagem.comorbidades}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Prontuário Médico (Abas) */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden flex-1 flex flex-col">
            
            {/* Tabs Header */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setActiveTab('anamnese')}
                className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'anamnese' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
              >
                <Stethoscope className="w-4 h-4" /> Evolução Médica
              </button>
              <button 
                onClick={() => setActiveTab('diagnostico')}
                className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'diagnostico' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
              >
                <FileText className="w-4 h-4" /> Diagnóstico (CID)
              </button>
              <button 
                onClick={() => setActiveTab('prescricao')}
                className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'prescricao' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
              >
                <Pill className="w-4 h-4" /> Prescrição / Conduta
              </button>
            </div>

            {/* Tabs Content */}
            <div className="p-6 flex-1 flex flex-col bg-gray-50/30 dark:bg-gray-900/20">
              
              {activeTab === 'anamnese' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 flex-1">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Exame Físico</label>
                    <textarea 
                      value={exameFisico}
                      onChange={(e) => setExameFisico(e.target.value)}
                      placeholder="Ex: Vias aéreas pérvias. Murmúrio vesicular globalmente audível, sem ruídos adventícios. Bulhas rítmicas normofonéticas. Ferimento corto-contuso de aprox. 5cm em face anterior de perna direita, com sangramento ativo. Sem outros sinais de trauma."
                      className="w-full h-32 p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Evolução Clínica</label>
                    <textarea 
                      value={evolucao}
                      onChange={(e) => setEvolucao(e.target.value)}
                      placeholder="Ex: Vítima de colisão auto x auto. Deu entrada deambulando, referindo dor em MID. Realizada compressão hemostática e sutura (5 pontos simples). Solicitado RX de perna D (sem fraturas). Recebeu toxóide tetânico e analgesia venosa. Evolui bem, dor controlada."
                      className="w-full h-40 p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    ></textarea>
                  </div>
                </motion.div>
              )}

              {activeTab === 'diagnostico' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 flex-1">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Busca de CID-10</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={buscaCid}
                        onChange={(e) => setBuscaCid(e.target.value)}
                        placeholder="Digite o código ou nome da doença (ex: S81, Hipertensão)..."
                        className="w-full p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                      />
                      <span className="absolute right-4 top-4 text-xs font-bold text-gray-400">BUSCAR</span>
                    </div>
                    
                    {/* Search Results */}
                    {buscaCid.length > 1 && (
                      <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {MOCK_CIDS.filter(c => c.code.toLowerCase().includes(buscaCid.toLowerCase()) || c.name.toLowerCase().includes(buscaCid.toLowerCase())).map((cidOption) => (
                          <div key={cidOption.code} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <div>
                              <span className="font-bold text-blue-600 mr-2">{cidOption.code}</span> 
                              <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">{cidOption.name}</span>
                            </div>
                            <button 
                              onClick={() => {
                                if (!selectedCids.find(c => c.code === cidOption.code)) {
                                  setSelectedCids([{ ...cidOption, type: selectedCids.length === 0 ? 'Principal' : 'Secundário' }, ...selectedCids]);
                                }
                                setBuscaCid('');
                              }}
                              className="text-xs font-bold px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 transition-colors shrink-0 ml-2"
                            >
                              Adicionar
                            </button>
                          </div>
                        ))}
                        {MOCK_CIDS.filter(c => c.code.toLowerCase().includes(buscaCid.toLowerCase()) || c.name.toLowerCase().includes(buscaCid.toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">Nenhum CID encontrado para a busca.</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Diagnoses List */}
                  {selectedCids.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Diagnósticos Adicionados</h4>
                      <div className="space-y-3">
                        {selectedCids.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full ${item.type === 'Principal' ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                                  {item.type}
                                </span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{item.code}</span>
                              </div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                            </div>
                            <button 
                              onClick={() => setSelectedCids(selectedCids.filter(c => c.code !== item.code))}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'prescricao' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 flex-1 flex flex-col">
                  <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Receituário e Pedido de Exames</label>
                    <textarea 
                      value={prescricao}
                      onChange={(e) => setPrescricao(e.target.value)}
                      placeholder="1. Dipirona 500mg - Tomar 1cp VO de 6/6h em caso de dor&#10;2. Cefalexina 500mg - Tomar 1cp VO de 6/6h por 7 dias&#10;3. Limpeza local com soro fisiológico e curativo diário&#10;4. Retorno para retirada de pontos em 10 dias"
                      className="w-full flex-1 min-h-[250px] p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                    ></textarea>
                  </div>
                  
                  <div className="flex justify-end">
                    <button 
                      onClick={handleImprimirReceita}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold transition-colors flex items-center gap-2"
                    >
                      <Printer className="w-5 h-5" />
                      Imprimir Receituário
                    </button>
                  </div>
                </motion.div>
              )}

            </div>
          </div>

          {/* Action Button */}
          <button 
            onClick={() => setShowDesfechoModal(true)}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-6 h-6" />
            Concluir Atendimento e Dar Desfecho
          </button>

        </div>
      </div>

      {/* Modal de Desfecho */}
      <AnimatePresence>
        {showDesfechoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDesfechoModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Desfecho Clínico</h3>
                <p className="text-sm text-gray-500">Selecione o destino do paciente após a consulta.</p>
              </div>

              <div className="p-6 space-y-3">
                {[
                  { id: 'alta', label: 'Alta Médica', desc: 'Paciente liberado para casa.' },
                  { id: 'observacao', label: 'Observação (Enfermaria)', desc: 'Encaminhar para medicação/soro.' },
                  { id: 'internacao', label: 'Internação Hospitalar', desc: 'Solicitar leito de internação.' },
                  { id: 'transferencia', label: 'Transferência Externa', desc: 'Transferir para outra unidade.' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setDesfecho(item.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${desfecho === item.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
                  >
                    <div>
                      <p className={`font-bold ${desfecho === item.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>{item.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                    </div>
                    {desfecho === item.id && <Check className="w-5 h-5 text-blue-500" />}
                  </button>
                ))}
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                <button 
                  onClick={() => setShowDesfechoModal(false)}
                  className="px-6 py-2.5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  disabled={!desfecho}
                  onClick={handleFinalizar}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar e Fechar Prontuário
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Componente Invisível que só aparece na impressão */}
      <ReceituarioImpresso 
        pacienteNome={MOCK_PATIENT.name}
        idade={MOCK_PATIENT.age}
        data={new Date().toLocaleDateString('pt-BR')}
        prescricao={prescricao}
        medicoNome="Dr. Roberto Mendes"
        crm="123456-SP"
      />
    </div>
  );
};

export default AtendimentoClinico;
