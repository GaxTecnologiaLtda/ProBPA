import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Activity, CheckCircle, Clock, Pill, Stethoscope, Droplets, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_PATIENT = {
  nome: 'João da Silva',
  leito: '101-A',
  idade: 45,
  admissao: '21/05/2026 - 18:30',
  medico: 'Dr. Roberto Mendes',
  diagnostico: 'I20.0 - Angina instável',
  prescricoes: [
    { id: 1, remedio: 'AAS 100mg', via: 'VO', frequencia: '1x/dia', horarios: [{ h: '10:00', status: 'checked' }] },
    { id: 2, remedio: 'Dipirona 1g', via: 'EV', frequencia: '6/6h', horarios: [{ h: '06:00', status: 'checked' }, { h: '12:00', status: 'checked' }, { h: '18:00', status: 'pending' }, { h: '00:00', status: 'pending' }] },
    { id: 3, remedio: 'Ceftriaxona 1g', via: 'EV', frequencia: '12/12h', horarios: [{ h: '14:00', status: 'pending' }, { h: '02:00', status: 'pending' }] },
    { id: 4, remedio: 'Soro Fisiológico 0.9% 500ml', via: 'EV', frequencia: 'Contínuo', horarios: [{ h: 'Agora', status: 'running' }] }
  ]
};

const ControlePaciente: React.FC = () => {
  const navigate = useNavigate();
  const { leitoId } = useParams();
  
  const [activeTab, setActiveTab] = useState<'prescricao' | 'sinais' | 'evolucao'>('prescricao');
  const [meds, setMeds] = useState(MOCK_PATIENT.prescricoes);

  // Estados para formulários
  const [pa, setPa] = useState('');
  const [temp, setTemp] = useState('');
  const [anotacao, setAnotacao] = useState('');

  const toggleMedStatus = (medId: number, hIndex: number) => {
    setMeds(prev => prev.map(m => {
      if (m.id === medId) {
        const newH = [...m.horarios];
        if (newH[hIndex].status === 'pending') newH[hIndex].status = 'checked';
        else if (newH[hIndex].status === 'checked') newH[hIndex].status = 'pending';
        return { ...m, horarios: newH };
      }
      return m;
    }));
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => navigate('/enfermaria/leitos')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-300"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Leito {leitoId || MOCK_PATIENT.leito}: {MOCK_PATIENT.nome}
          </h1>
          <p className="text-gray-500 text-sm">
            {MOCK_PATIENT.idade} anos • Admissão: {MOCK_PATIENT.admissao} • Médico: {MOCK_PATIENT.medico}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar Info */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col items-center text-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-6">
              <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center rounded-full mb-4">
                <User className="w-10 h-10" />
              </div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">{MOCK_PATIENT.nome}</h2>
              <p className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full mt-2">
                CID: {MOCK_PATIENT.diagnostico}
              </p>
            </div>

            <nav className="space-y-2">
              <button 
                onClick={() => setActiveTab('prescricao')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'prescricao' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <Pill className="w-5 h-5" /> Prescrição Médica
              </button>
              <button 
                onClick={() => setActiveTab('sinais')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'sinais' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <Activity className="w-5 h-5" /> Sinais Vitais
              </button>
              <button 
                onClick={() => setActiveTab('evolucao')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'evolucao' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <FileText className="w-5 h-5" /> Evolução de Enf.
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            
            {activeTab === 'prescricao' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 lg:p-8 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Pill className="w-6 h-6 text-purple-500" />
                    Aprazamento e Checagem (22/05/2026)
                  </h3>
                </div>

                <div className="space-y-4">
                  {meds.map((med) => (
                    <div key={med.id} className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                          {med.remedio}
                        </h4>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                          Via: <span className="text-gray-700 dark:text-gray-300 mr-3">{med.via}</span>
                          Freq: <span className="text-gray-700 dark:text-gray-300">{med.frequencia}</span>
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                        {med.horarios.map((horario, hIdx) => (
                          <button
                            key={hIdx}
                            onClick={() => toggleMedStatus(med.id, hIdx)}
                            className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 transition-all group relative ${
                              horario.status === 'checked' 
                                ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-500/50' 
                                : horario.status === 'running'
                                ? 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500'
                                : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300 dark:bg-gray-800 dark:border-gray-600'
                            }`}
                          >
                            <span className="text-sm font-bold mb-1">{horario.h}</span>
                            {horario.status === 'checked' ? (
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            ) : horario.status === 'running' ? (
                              <Droplets className="w-6 h-6 text-blue-500 animate-pulse" />
                            ) : (
                              <div className="w-6 h-6 rounded-md border-2 border-gray-300 dark:border-gray-500 group-hover:border-purple-400 transition-colors"></div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'sinais' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 lg:p-8 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-8">
                  <Activity className="w-6 h-6 text-blue-500" />
                  Aferição de Sinais Vitais
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Pressão Arterial (mmHg)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 120/80" 
                      value={pa}
                      onChange={e => setPa(e.target.value)}
                      className="w-full p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Temperatura (°C)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 36.5" 
                      value={temp}
                      onChange={e => setTemp(e.target.value)}
                      className="w-full p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="mt-auto flex justify-end">
                  <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors">
                    Salvar Sinais Vitais
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'evolucao' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 lg:p-8 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-8">
                  <FileText className="w-6 h-6 text-orange-500" />
                  Anotação / Evolução de Enfermagem
                </h3>

                <div className="flex-1 flex flex-col">
                  <textarea 
                    value={anotacao}
                    onChange={(e) => setAnotacao(e.target.value)}
                    placeholder="Relate as ocorrências, aceitação de dieta, queixas do paciente durante o seu turno..."
                    className="w-full flex-1 min-h-[250px] p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 outline-none resize-none leading-relaxed"
                  ></textarea>
                </div>

                <div className="mt-6 flex justify-end">
                  <button className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors">
                    Registrar Evolução
                  </button>
                </div>
              </motion.div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default ControlePaciente;
