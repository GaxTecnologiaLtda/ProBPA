import React, { useState } from 'react';
import { X, Calendar, Clock, Briefcase, User, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: any) => void;
}

const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [professional, setProfessional] = useState('');
    const [dayOfWeek, setDayOfWeek] = useState('1');
    const [type, setType] = useState('ATENDIMENTO');
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('12:00');

    const handleConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({ professional, dayOfWeek: parseInt(dayOfWeek), type, startTime, endTime });
        onClose();
        // Reset form
        setProfessional('');
        setDayOfWeek('1');
        setType('ATENDIMENTO');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
                >
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="text-lg font-bold text-gray-900">Novo Turno na Escala</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <form onSubmit={handleConfirm} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
                            <div className="relative">
                                <select
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-medical-500 outline-none appearance-none"
                                    value={professional}
                                    onChange={(e) => setProfessional(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione um profissional...</option>
                                    <option value="1">Dr. Gabriel Silva (Médico)</option>
                                    <option value="2">Enf. Ana Costa (Enfermeira)</option>
                                    <option value="3">Dr. Carlos Souza (Odontólogo)</option>
                                </select>
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dia da Semana</label>
                                <div className="relative">
                                    <select
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-medical-500 outline-none appearance-none"
                                        value={dayOfWeek}
                                        onChange={(e) => setDayOfWeek(e.target.value)}
                                    >
                                        <option value="1">Segunda</option>
                                        <option value="2">Terça</option>
                                        <option value="3">Quarta</option>
                                        <option value="4">Quinta</option>
                                        <option value="5">Sexta</option>
                                        <option value="6">Sábado</option>
                                    </select>
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Atividade</label>
                                <div className="relative">
                                    <select
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-medical-500 outline-none appearance-none"
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                    >
                                        <option value="ATENDIMENTO">Atendimento</option>
                                        <option value="VISITA_DOMICILIAR">Visita Domiciliar</option>
                                        <option value="REUNIAO">Reunião</option>
                                        <option value="ATIVIDADE_COLETIVA">Atividade Coletiva</option>
                                    </select>
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                                <div className="relative">
                                    <input
                                        type="time"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-medical-500 outline-none"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                                <div className="relative">
                                    <input
                                        type="time"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-medical-500 outline-none"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 bg-medical-600 text-white rounded-xl font-bold hover:bg-medical-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            Salvar na Escala
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ShiftModal;
