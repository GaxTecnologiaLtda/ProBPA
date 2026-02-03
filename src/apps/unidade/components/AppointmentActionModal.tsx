import React, { useState } from 'react';
import { X, User, Phone, Mail, FileText, AlertCircle, Trash2, CheckCircle2, UserX, Clock, Printer, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Appointment } from '../services/agendaService';
import { useUnidadeAuth } from '../contexts/AuthContext';

interface AppointmentActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: Appointment | null;
    onAction: (action: string, payload?: any) => void;
}

const AppointmentActionModal: React.FC<AppointmentActionModalProps> = ({ isOpen, onClose, appointment, onAction }) => {
    const { user } = useUnidadeAuth();
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    if (!isOpen || !appointment || !appointment.patient) return null;

    const isPast = false; // logic to check if time < now (omitted for mock simplicity)
    const canCancel = user?.role === 'RECEPCIONISTA' || user?.role === 'COORDENADOR';

    const handleCancel = () => {
        onAction('CANCEL', { reason: cancelReason });
        setShowCancelConfirm(false);
        setCancelReason('');
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                >
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="text-lg font-bold text-gray-900">Detalhes do Agendamento</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Patient Header */}
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                                {appointment.patient.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg leading-tight">{appointment.patient.name}</h3>
                                <p className="text-sm text-gray-500">CNS: {appointment.patient.cns}</p>
                                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                                    <Clock className="w-4 h-4" />
                                    <span>{appointment.time} • {appointment.type}</span>
                                </div>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-xl">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <Phone className="w-4 h-4" />
                                <span>{appointment.patient.phone || 'Telefone não informado'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <Mail className="w-4 h-4" />
                                <span>{appointment.patient.email || 'E-mail não informado'}</span>
                            </div>
                            <div className="flex items-start gap-3 text-sm text-gray-600">
                                <FileText className="w-4 h-4 mt-0.5" />
                                <span className="italic">{appointment.observation || 'Nenhuma observação.'}</span>
                            </div>
                        </div>

                        {/* Actions Grid */}
                        {/* Actions Grid */}
                        {!showCancelConfirm ? (
                            <div className="space-y-4">
                                {user?.role === 'RECEPCIONISTA' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Receptionist can only interact with normal assignments, NOT Reserves */}
                                        {appointment.status === 'RESERVA' ? (
                                            <div className="col-span-2 bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                                                <AlertCircle className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                                                <p className="font-bold text-purple-800 text-sm">Horário Reservado</p>
                                                <p className="text-xs text-purple-600 mt-1">Atividade interna definida pela coordenação. Você não pode alterar este horário.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => onAction('MARK_PRESENT')}
                                                    disabled={appointment.status !== 'AGENDADO' && appointment.status !== 'FALTA'}
                                                    title="Atendimento será iniciado pelo profissional no Painel de Produção."
                                                    className="col-span-2 p-3 bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    <span>Marcar Presença</span>
                                                    {appointment.status === 'PRESENTE' && <span className="text-xs bg-green-200 px-2 py-0.5 rounded-full ml-2">Já presente</span>}
                                                </button>

                                                <button
                                                    onClick={() => onAction('MARK_MISSED')}
                                                    disabled={isPast && appointment.status !== 'AGENDADO'}
                                                    title="Disponível apenas no dia do agendamento"
                                                    className="p-3 bg-white text-orange-700 border border-orange-200 rounded-xl hover:bg-orange-50 font-medium flex flex-col items-center gap-1 transition-colors"
                                                >
                                                    <UserX className="w-5 h-5" />
                                                    <span>Informar Falta</span>
                                                </button>

                                                <button
                                                    onClick={() => setShowCancelConfirm(true)}
                                                    disabled={isPast}
                                                    title={isPast ? "Horário já ocorreu. Utilize 'Informar falta'." : "Liberar horário na agenda"}
                                                    className="p-3 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 font-medium flex flex-col items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                    <span>Cancelar</span>
                                                </button>

                                                <button
                                                    onClick={() => onAction('VIEW_RECORD')}
                                                    className="p-3 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium flex flex-col items-center gap-1 transition-colors"
                                                >
                                                    <FileText className="w-5 h-5" />
                                                    <span>Prontuário</span>
                                                </button>

                                                <button
                                                    onClick={() => onAction('PRINT_RECEIPT')}
                                                    className="p-3 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium flex flex-col items-center gap-1 transition-colors"
                                                >
                                                    <Printer className="w-5 h-5" />
                                                    <span>Comprovante</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {user?.role === 'COORDENADOR' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setShowCancelConfirm(true)}
                                            className="col-span-2 p-3 text-red-600 border border-red-200 rounded-xl hover:bg-red-50 font-medium flex items-center justify-center gap-2"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                            <span>Cancelar / Liberar Horário</span>
                                        </button>
                                        <button
                                            onClick={() => onAction('BLOCK_SLOT')}
                                            className="col-span-2 p-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-200 font-bold flex items-center justify-center gap-2"
                                        >
                                            <Ban className="w-5 h-5" />
                                            <span>Bloquear Horário</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800">Tem certeza que deseja cancelar? Esta ação liberará o horário na agenda.</p>
                                </div>
                                <textarea
                                    placeholder="Motivo do cancelamento (Obrigatório)"
                                    className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCancelConfirm(false)}
                                        className="flex-1 py-2 border border-gray-300 rounded-lg font-medium text-gray-700"
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        disabled={!cancelReason}
                                        className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AppointmentActionModal;
