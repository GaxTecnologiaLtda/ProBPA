import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Camera, QrCode, UserPlus, Printer, X, Check, FileText, Users, Activity, Clock, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { QRCodeSVG } from 'qrcode.react';

// --- MOCK DATA ---
const MOCK_PATIENTS_LIST = [
  {
    cpf: '123.456.789-00',
    name: 'João da Silva',
    birthDate: '1985-05-12',
    sus: '7001.2345.6789.001',
    gender: 'M',
    motherName: 'Maria da Silva',
    phone: '(11) 99999-9999',
    address: 'Rua das Flores, 123'
  },
  {
    cpf: '987.654.321-11',
    name: 'Maria Antonieta',
    birthDate: '1990-08-22',
    sus: '7002.3456.7890.002',
    gender: 'F',
    motherName: 'Josefina Antonieta',
    phone: '(11) 98888-8888',
    address: 'Avenida Brasil, 456'
  },
  {
    cpf: '111.222.333-44',
    name: 'Pedro Lucas (Menor)',
    birthDate: '2015-02-10',
    sus: '7003.4567.8901.003',
    gender: 'M',
    motherName: 'Ana Clara Lucas',
    phone: '(11) 97777-7777',
    address: 'Rua das Arvores, 789',
    respName: 'Ana Clara Lucas',
    respCpf: '444.555.666-77',
    respRelation: 'MÃE'
  }
];

const Acolhimento: React.FC = () => {
  // Search State
  const [cpfQuery, setCpfQuery] = useState('');
  const [searchState, setSearchState] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');

  // Form & Patient State
  const [isNewRegistration, setIsNewRegistration] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [patientData, setPatientData] = useState<any>({
    cpf: '', name: '', birthDate: '', sus: '', gender: '', motherName: '', phone: '', address: '',
    respName: '', respCpf: '', respRelation: ''
  });
  const [visitReason, setVisitReason] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [isMinor, setIsMinor] = useState(false);

  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  // Ticket State
  const [showTicket, setShowTicket] = useState(false);
  const [ticketId, setTicketId] = useState('');

  // Calculate Age logic
  useEffect(() => {
    if (patientData.birthDate && patientData.birthDate.length === 10) {
      const today = new Date();
      const birthDate = new Date(patientData.birthDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setIsMinor(age < 18 && age >= 0);
    } else {
      setIsMinor(false);
    }
  }, [patientData.birthDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpfQuery) return;
    
    setSearchState('searching');
    setTimeout(() => {
      const cleanCpf = cpfQuery.replace(/\D/g, '');
      const found = MOCK_PATIENTS_LIST.find(p => p.cpf === cpfQuery || p.cpf.replace(/\D/g, '') === cleanCpf);
      
      if (found) {
        setPatientData(found);
        setIsNewRegistration(false);
        setSearchState('found');
      } else {
        setPatientData({ 
          cpf: cpfQuery, name: '', birthDate: '', sus: '', gender: '', motherName: '', phone: '', address: '',
          respName: '', respCpf: '', respRelation: ''
        });
        setIsNewRegistration(true);
        setSearchState('not_found');
      }
    }, 800);
  };

  const handleSelectPatient = (patient: typeof MOCK_PATIENTS_LIST[0]) => {
    setPatientData(patient);
    setIsNewRegistration(false);
    setSearchState('found');
    // Auto-scroll para o topo ou apenas mostrar o card de "encontrado"
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openNewRegistration = () => {
    setPatientData({ 
      cpf: '', name: '', birthDate: '', sus: '', gender: '', motherName: '', phone: '', address: '',
      respName: '', respCpf: '', respRelation: ''
    });
    setVisitReason('');
    setVisitNotes('');
    setPhotoSrc(null);
    setIsNewRegistration(true);
    setSearchState('idle');
    setShowEntryModal(true);
  };

  const openFoundPatient = () => {
    setVisitReason('');
    setVisitNotes('');
    setPhotoSrc(null);
    setShowEntryModal(true);
  };

  const handleCapturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPhotoSrc(imageSrc);
      setShowCamera(false);
    }
  }, [webcamRef]);

  const handleGenerateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketId(`TKT-${Math.floor(Math.random() * 1000000)}`);
    setShowEntryModal(false);
    setShowTicket(true);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Acolher Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Acolher Paciente</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Busque o paciente ou inicie um novo cadastro.</p>
        
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
          
          <form onSubmit={handleSearch} className="flex-1 w-full max-w-2xl flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={cpfQuery}
                onChange={(e) => setCpfQuery(e.target.value)}
                placeholder="Busque por CPF (ex: 123.456.789-00)"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!cpfQuery || searchState === 'searching'}
              className="px-6 py-3 bg-gray-900 hover:bg-black text-white dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {searchState === 'searching' ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          <div className="hidden md:block w-px h-12 bg-gray-200 dark:bg-gray-700"></div>

          <button
            onClick={openNewRegistration}
            className="w-full md:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm shadow-red-500/20"
          >
            <UserPlus className="w-5 h-5" />
            Novo Cadastro
          </button>
        </div>
      </div>

      {/* Result Area */}
      <AnimatePresence mode="wait">
        {searchState === 'found' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm"
          >
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-800/50 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{patientData.name}</h3>
              <p className="text-gray-600 dark:text-gray-300">CNS: {patientData.sus} | Nascimento: {patientData.birthDate}</p>
            </div>
            <button
              onClick={openFoundPatient}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm"
            >
              Iniciar Atendimento
            </button>
          </motion.div>
        )}

        {searchState === 'not_found' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm"
          >
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-800/50 rounded-full flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Paciente não encontrado</h3>
              <p className="text-gray-600 dark:text-gray-300">Nenhum registro para o CPF {cpfQuery}. É necessário completar o cadastro.</p>
            </div>
            <button
              onClick={() => setShowEntryModal(true)}
              className="w-full sm:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-colors shadow-sm"
            >
              Completar Cadastro
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabela de Pacientes Cadastrados */}
      {searchState === 'idle' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pacientes Recentes</h2>
            <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full font-medium">Base Local (Mock)</span>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-4">Nome do Paciente</th>
                    <th className="px-6 py-4">CPF / Cartão SUS</th>
                    <th className="px-6 py-4">Nascimento</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {MOCK_PATIENTS_LIST.map((patient, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm">
                            {patient.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{patient.name}</p>
                            <p className="text-xs text-gray-500">{patient.gender === 'M' ? 'Masculino' : 'Feminino'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-gray-200">{patient.cpf}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{patient.sus}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600 dark:text-gray-300">{patient.birthDate.split('-').reverse().join('/')}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleSelectPatient(patient)}
                          className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400 rounded-lg text-sm font-medium transition-colors border border-emerald-200 dark:border-emerald-800"
                        >
                          Atender
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Registration / Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isNewRegistration ? 'Novo Cadastro Completo' : 'Ficha Rápida de Atendimento'}
                </h2>
                <p className="text-sm text-gray-500">Preencha os dados e capture a foto para emitir o ticket.</p>
              </div>
              <button onClick={() => setShowEntryModal(false)} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleGenerateTicket} className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Complete Registration Form Fields */}
              {isNewRegistration && (
                <div className="space-y-6">
                  <div className="border-l-4 border-red-500 pl-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dados Demográficos</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo *</label>
                      <input type="text" value={patientData.name} onChange={(e) => setPatientData({...patientData, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Nascimento *</label>
                      <input type="date" value={patientData.birthDate} onChange={(e) => setPatientData({...patientData, birthDate: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF</label>
                      <input type="text" value={patientData.cpf} onChange={(e) => setPatientData({...patientData, cpf: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNS (Cartão SUS)</label>
                      <input type="text" value={patientData.sus} onChange={(e) => setPatientData({...patientData, sus: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sexo</label>
                      <select value={patientData.gender} onChange={(e) => setPatientData({...patientData, gender: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="">Selecione...</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="O">Outros</option>
                      </select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Mãe</label>
                      <input type="text" value={patientData.motherName} onChange={(e) => setPatientData({...patientData, motherName: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                      <input type="text" value={patientData.phone} onChange={(e) => setPatientData({...patientData, phone: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço Completo</label>
                      <input type="text" value={patientData.address} onChange={(e) => setPatientData({...patientData, address: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                  </div>

                  {/* Responsible Data for Minors */}
                  {isMinor && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 p-5 rounded-xl space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-orange-600" />
                        <h3 className="text-md font-bold text-orange-800 dark:text-orange-400">Dados do Responsável (Paciente Menor)</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm font-medium text-orange-900 dark:text-orange-300 mb-1">Nome Completo do Responsável *</label>
                          <input type="text" value={patientData.respName} onChange={(e) => setPatientData({...patientData, respName: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-orange-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" required={isMinor} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-orange-900 dark:text-orange-300 mb-1">Grau de Parentesco *</label>
                          <select value={patientData.respRelation} onChange={(e) => setPatientData({...patientData, respRelation: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-orange-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" required={isMinor}>
                            <option value="">Selecione...</option>
                            <option value="MÃE">Mãe</option>
                            <option value="PAI">Pai</option>
                            <option value="AVÓ(Ô)">Avó(ô)</option>
                            <option value="OUTRO">Outro</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Triage / Entry Data */}
              <div className="space-y-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dados de Entrada & Identificação</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* WebCam column */}
                  <div className="col-span-1">
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900/50">
                      {photoSrc ? (
                        <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl">
                          <img src={photoSrc} alt="Paciente" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setPhotoSrc(null)} className="absolute bottom-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowCamera(true)}
                          className="flex flex-col items-center gap-3 text-gray-500 hover:text-red-600 transition-colors"
                        >
                          <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                            <Camera className="w-6 h-6" />
                          </div>
                          <span className="font-medium text-sm">Capturar Foto <br/><span className="text-xs text-red-500">(Obrigatório)</span></span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Triage Info */}
                  <div className="col-span-1 md:col-span-2 space-y-4">
                    {!isNewRegistration && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-4 border border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-500 mb-1">Paciente Identificado</p>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">{patientData.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">CNS: {patientData.sus} | Nasc: {patientData.birthDate}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo Principal da Visita *</label>
                      <select value={visitReason} onChange={(e) => setVisitReason(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500" required>
                        <option value="">Selecione o motivo...</option>
                        <option value="Emergência Clínica">Emergência Clínica</option>
                        <option value="Trauma / Acidente">Trauma / Acidente</option>
                        <option value="Dor Severa">Dor Severa</option>
                        <option value="Febre">Febre</option>
                        <option value="Gestante em Trabalho de Parto">Gestante em Trabalho de Parto</option>
                        <option value="Retorno de Consulta">Retorno de Consulta</option>
                        <option value="Realização de Exames">Realização de Exames</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anotações da Recepção (Opcional)</label>
                      <textarea rows={2} value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} placeholder="Breve relato ou estado visível do paciente..." className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"></textarea>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Area */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 pb-2">
                <button type="button" onClick={() => setShowEntryModal(false)} className="px-6 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={!photoSrc || !visitReason || (isNewRegistration && !patientData.name)} 
                  className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all"
                >
                  <QrCode className="w-5 h-5" />
                  Concluir Cadastro e Gerar Ticket
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Camera Fullscreen Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="p-4 flex justify-between items-center text-white bg-black/50 absolute top-0 w-full z-10">
            <h3 className="font-medium text-lg">Centralize o rosto do paciente</h3>
            <button onClick={() => setShowCamera(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 relative flex items-center justify-center">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "user" }}
              className="max-h-full w-full object-contain"
            />
            {/* Camera Overlay Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-80 border-2 border-white/50 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
            </div>
          </div>
          <div className="p-8 bg-black flex justify-center pb-12">
            <button onClick={handleCapturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 hover:bg-gray-200 transition-colors flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              <div className="w-16 h-16 border-2 border-gray-400 rounded-full"></div>
            </button>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {showTicket && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border-t-[12px] border-red-600"
          >
            <div className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="w-full flex justify-between items-start">
                <div className="flex items-center gap-2 text-red-600">
                  <Hospital className="w-6 h-6" />
                  <span className="font-bold">ProBPA</span>
                </div>
                <span className="font-mono text-sm text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded">{ticketId}</span>
              </div>
              
              {photoSrc && (
                <div className="p-1 bg-white shadow-sm border border-gray-200 rounded-xl">
                  <img src={photoSrc} alt="Patient" className="w-28 h-28 rounded-lg object-cover" />
                </div>
              )}
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">{patientData?.name || 'Paciente'}</h2>
                <p className="text-red-600 mt-2 uppercase font-bold tracking-wide text-sm">{visitReason}</p>
                {isMinor && <p className="text-xs text-orange-600 mt-1 font-semibold">PACIENTE MENOR DE IDADE</p>}
              </div>

              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 w-full flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/5 rounded-bl-[100px]"></div>
                <QRCodeSVG value={ticketId} size={140} level="H" />
                <p className="text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-semibold">Bipe na Triagem</p>
              </div>

              <div className="w-full pt-4 border-t border-dashed border-gray-200 flex gap-3">
                <button onClick={() => { setShowTicket(false); setSearchState('idle'); setCpfQuery(''); }} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">
                  Fechar
                </button>
                <button className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/20">
                  <Printer className="w-5 h-5" />
                  Imprimir
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default Acolhimento;
