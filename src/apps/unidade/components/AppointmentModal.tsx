import React, { useState, useEffect } from 'react';
import { X, User, Search, Calendar, Clock, CheckCircle, Lock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Appointment } from '../services/agendaService';
import { useUnidadeAuth } from '../contexts/AuthContext';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    slot: Appointment | null;
    onConfirm: (data: any) => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, slot, onConfirm }) => {
    const { user } = useUnidadeAuth();
    const [mode, setMode] = useState<'AGENDAMENTO' | 'RESERVA'>('AGENDAMENTO');

    // Agendamento State
    const [step, setStep] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [appointmentType, setAppointmentType] = useState('CONSULTA');
    const [observation, setObservation] = useState('');
    const [isOutsideUbs, setIsOutsideUbs] = useState(false);
    const [locationType, setLocationType] = useState('DOMICILIO');

    // Reserva State
    const [reserveSubtype, setReserveSubtype] = useState('REUNIAO');
    const [reserveReason, setReserveReason] = useState('');

    const isCoordinator = user?.role === 'COORDENADOR';

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setMode('AGENDAMENTO');
            setStep(1);
            setSearchTerm('');
            setPatients([]);
            setSelectedPatient(null);
            setAppointmentType('CONSULTA');
            setObservation('');
            setIsOutsideUbs(false);
            setLocationType('DOMICILIO');
            setReserveSubtype('REUNIAO');
            setReserveReason('');
        }
    }, [isOpen]);

    // Mock Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.length > 2) {
                // Mock results
                setPatients([
                    { id: '1', name: 'Maria da Silva', cns: '700140026786567', dob: '10/05/1985' },
                    { id: '2', name: 'João Santos', cns: '700123456789012', dob: '22/01/1990' },
                    { id: '3', name: 'Ana Souza', cns: '700987654321098', dob: '15/09/1975' },
                ].filter(p =>
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.cns.includes(searchTerm)
                ));
            } else {
                setPatients([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleConfirm = () => {
        if (mode === 'RESERVA') {
            onConfirm({
                slotId: slot?.id,
                type: 'RESERVA',
                reserveSubtype,
                observation: reserveReason, // Using observation field for reason storage generic
                patient: null
            });
        } else {
            onConfirm({
                slotId: slot?.id,
                patient: selectedPatient,
                type: isOutsideUbs ? 'VISITA_DOMICILIAR' : appointmentType, // Infer type
                observation,
                outsideUbs: isOutsideUbs,
                location: isOutsideUbs ? locationType : undefined
            });
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                {mode === 'RESERVA' ? 'Nova Reserva (Bloqueio)' : 'Novo Agendamento'}
                            </h2>
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> {slot?.id?.split('-')[0] || 'Hoje'}
                                <Clock className="w-3 h-3 ml-2" /> {slot?.time}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Mode Switcher (Coordinator Only) */}
                    {isCoordinator && (
                        <div className="flex p-2 bg-gray-100/50 border-b border-gray-100">
                            <button
                                onClick={() => setMode('AGENDAMENTO')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${mode === 'AGENDAMENTO' ? 'bg-white shadow-sm text-medical-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Atendimento (Cidadão)
                            </button>
                            <button
                                onClick={() => setMode('RESERVA')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${mode === 'RESERVA' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Reserva (Interno)
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1">

                        {/* --- RESERVA MODE (Internal) --- */}
                        {mode === 'RESERVA' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex gap-3">
                                    <Lock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-purple-800">Reserva Administrativa</p>
                                        <p className="text-xs text-purple-700 mt-1">
                                            Destina-se exclusivamente a atividades internas. Não envolve atendimento ao cidadão e não gera produção clínica.
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Reserva <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium text-gray-700"
                                        value={reserveSubtype}
                                        onChange={(e) => setReserveSubtype(e.target.value)}
                                    >
                                        <option value="ENTRE_PROFISSIONAIS">Entre Profissionais (Matriciamento/Discussão)</option>
                                        <option value="REUNIAO">Reunião de Equipe</option>
                                        <option value="CAPACITACAO">Capacitação / Treinamento</option>
                                        <option value="ATIVIDADE_ADMINISTRATIVA">Atividade Administrativa</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da Reserva <span className="text-red-500">*</span></label>
                                    <textarea
                                        className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                        rows={3}
                                        placeholder="Descreva o motivo (Ex: Reunião mensal de indicadores...)"
                                        value={reserveReason}
                                        onChange={(e) => setReserveReason(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* --- AGENDAMENTO MODE (Patient) --- */}
                        {mode === 'AGENDAMENTO' && (
                            <>
                                <div className="mb-6 space-y-2">
                                    <p className="text-sm font-medium text-blue-800 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        Agendamento de Consulta ou Visita. <br />
                                        <span className="font-normal opacity-80 text-xs">O atendimento clínico será realizado no painel do profissional.</span>
                                    </p>
                                </div>

                                {/* Step 1: Patient Search */}
                                <div className={`transition-all duration-300 ${step === 1 ? 'block' : 'hidden'}`}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Cidadão</label>
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Nome, CNS ou CPF..."
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mb-4 flex justify-between">
                                        <span>Digite ao menos 3 caracteres.</span>
                                        <span className="text-medical-600 hover:underline cursor-pointer">Cadastrar novo cidadão</span>
                                    </p>

                                    <div className="space-y-2">
                                        {patients.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => { setSelectedPatient(p); setStep(2); }}
                                                className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-medical-200 hover:bg-medical-50 transition-all flex items-center gap-3 group"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-medical-100 text-medical-600 flex items-center justify-center font-bold">
                                                    {p.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 group-hover:text-medical-700">{p.name}</p>
                                                    <p className="text-xs text-gray-500">CNS: {p.cns} • Nasc: {p.dob}</p>
                                                </div>
                                            </button>
                                        ))}
                                        {searchTerm.length > 2 && patients.length === 0 && (
                                            <div className="text-center py-4 text-gray-400">
                                                Nenhum paciente encontrado.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Step 2: Details */}
                                <div className={`transition-all duration-300 ${step === 2 ? 'block' : 'hidden'}`}>
                                    {selectedPatient && (
                                        <div className="bg-medical-50 rounded-xl p-4 mb-6 flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-white text-medical-600 flex items-center justify-center font-bold text-lg shadow-sm">
                                                {selectedPatient.name.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900">{selectedPatient.name}</h3>
                                                <p className="text-xs text-medical-700">CNS: {selectedPatient.cns}</p>
                                            </div>
                                            <button onClick={() => setStep(1)} className="text-xs text-medical-600 font-medium hover:underline">
                                                Trocar
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Atendimento <span className="text-red-500">*</span></label>
                                            <select
                                                className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-medical-500 outline-none bg-white font-medium text-gray-700 disabled:bg-gray-100"
                                                value={appointmentType}
                                                onChange={(e) => setAppointmentType(e.target.value)}
                                                disabled={isOutsideUbs}
                                            >
                                                <option value="CONSULTA">Consulta Agendada</option>
                                                <option value="DEMANDA_ESPONTANEA">Demanda Espontânea</option>
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {isOutsideUbs ? "Tipo definido automaticamente como Visita." : "Selecione o tipo de atendimento clínico."}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 py-2 border-t border-b border-gray-100 my-4">
                                            <input
                                                type="checkbox"
                                                id="outsideUbs"
                                                className="w-4 h-4 text-medical-600 rounded border-gray-300 focus:ring-medical-500"
                                                checked={isOutsideUbs}
                                                onChange={(e) => setIsOutsideUbs(e.target.checked)}
                                            />
                                            <label htmlFor="outsideUbs" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                                Atendimento fora da UBS (Visita/Atividade)
                                            </label>
                                        </div>

                                        {isOutsideUbs && (
                                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 animate-in slide-in-from-top-2">
                                                <label className="block text-sm font-medium text-orange-900 mb-2">Local do Atendimento <span className="text-red-500">*</span></label>
                                                <select
                                                    className="w-full p-2.5 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-500 outline-none bg-white font-medium text-gray-700"
                                                    value={locationType}
                                                    onChange={(e) => setLocationType(e.target.value)}
                                                >
                                                    <option value="DOMICILIO">Atendimento Domiciliar</option>
                                                    <option value="ESCOLA">Escola</option>
                                                    <option value="CRECHE">Creche</option>
                                                    <option value="ATIVIDADE_COLETIVA">Atividade Coletiva</option>
                                                    <option value="OUTROS">Outros</option>
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Observações Administrativas</label>
                                            <textarea
                                                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none text-sm"
                                                rows={2}
                                                placeholder={isOutsideUbs ? "Detalhes do local, ponto de referência..." : "Observações para a recepção..."}
                                                value={observation}
                                                onChange={(e) => setObservation(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 z-10 relative">
                        {mode === 'AGENDAMENTO' && step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                            >
                                Voltar
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancelar
                        </button>

                        {(mode === 'RESERVA' || (mode === 'AGENDAMENTO' && step === 2)) && (
                            <button
                                onClick={handleConfirm}
                                disabled={mode === 'RESERVA' && !reserveReason}
                                className="px-6 py-2 bg-medical-600 text-white rounded-lg text-sm font-medium hover:bg-medical-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {mode === 'RESERVA' ? <Lock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                {mode === 'RESERVA' ? 'Confirmar Reserva' : 'Confirmar Agendamento'}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
