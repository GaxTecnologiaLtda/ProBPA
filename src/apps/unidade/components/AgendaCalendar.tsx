import React from 'react';
import {
    Clock, User, CheckCircle2, XCircle, AlertCircle, Ban,
    CalendarCheck, UserX, FileText, Lock
} from 'lucide-react';
import { Appointment, AppointmentStatus } from '../services/agendaService';

interface AgendaCalendarProps {
    date: Date;
    schedule: { slots: Appointment[] } | null;
    loading: boolean;
    onSlotClick: (appointment: Appointment) => void;
}

const AgendaCalendar: React.FC<AgendaCalendarProps> = ({ date, schedule, loading, onSlotClick }) => {

    // Helper to determine visual style key based on status
    const getStatusStyle = (status: AppointmentStatus) => {
        switch (status) {
            case 'LIVRE':
                return 'hover:border-medical-300 hover:shadow-md border-l-4 border-l-transparent hover:border-l-medical-500';
            case 'AGENDADO':
                return 'border-l-4 border-l-blue-500 bg-white shadow-sm';
            case 'PRESENTE':
                return 'border-l-4 border-l-teal-500 bg-white shadow-sm';
            case 'EM_ATENDIMENTO':
                return 'border-l-4 border-l-yellow-500 bg-yellow-50/30 shadow-sm';
            case 'REALIZADO':
                return 'border-l-4 border-l-green-500 bg-gray-50 opacity-90';
            case 'FALTA':
                return 'border-l-4 border-l-red-400 bg-red-50/20';
            case 'CANCELADO':
                return 'border-l-4 border-l-gray-300 bg-gray-50 opacity-60 grayscale';
            case 'RESERVA':
                return 'border-l-4 border-l-purple-500 bg-white shadow-sm';
            case 'BLOQUEADO':
                return 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed border-l-4 border-l-gray-400';
            case 'AGENDA_FECHADA':
                return 'bg-gray-200 border-gray-300 opacity-40 cursor-not-allowed border-l-4 border-l-gray-500 grayscale';
            default:
                return 'bg-white border-l-4 border-l-gray-200';
        }
    };

    const getStatusLabel = (status: AppointmentStatus) => {
        switch (status) {
            case 'LIVRE': return { text: 'Disponível', color: 'text-gray-400' };
            case 'AGENDADO': return { text: 'Agendado', color: 'text-blue-600 bg-blue-50' };
            case 'PRESENTE': return { text: 'Na Recepção', color: 'text-teal-600 bg-teal-50' };
            case 'EM_ATENDIMENTO': return { text: 'Em Atendimento', color: 'text-yellow-700 bg-yellow-100' };
            case 'REALIZADO': return { text: 'Finalizado', color: 'text-green-600 bg-green-50' };
            case 'FALTA': return { text: 'Faltou', color: 'text-red-600 bg-red-50' };
            case 'CANCELADO': return { text: 'Cancelado', color: 'text-gray-500 bg-gray-100' };
            case 'RESERVA': return { text: 'Reserva', color: 'text-purple-600 bg-purple-50' };
            case 'BLOQUEADO': return { text: 'Bloqueado', color: 'text-gray-500' };
            case 'AGENDA_FECHADA': return { text: 'Fechada', color: 'text-gray-600 bg-gray-200' };
            default: return { text: status, color: 'text-gray-500' };
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-medical-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!schedule || schedule.slots.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 h-96 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <CalendarCheck className="w-12 h-12 mb-3 opacity-30" />
                <p>Nenhuma agenda configurada.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pb-20 p-1">
            {schedule.slots.map((slot) => {
                const label = getStatusLabel(slot.status);
                const isBlocked = slot.status === 'BLOQUEADO' || slot.status === 'AGENDA_FECHADA';
                const isReserved = slot.status === 'RESERVA';

                return (
                    <div
                        key={slot.id}
                        onClick={() => onSlotClick(slot)}
                        title={isBlocked ? "Agenda fechada/bloqueada para este horário." : (isReserved ? "Horário reservado pela coordenação." : "")}
                        className={`
                            px-4 py-3 rounded-lg border border-gray-200 transition-all cursor-pointer relative min-h-[90px] flex flex-col justify-between group
                            ${getStatusStyle(slot.status)}
                        `}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-lg font-bold tracking-tight ${slot.status === 'LIVRE' ? 'text-gray-400 group-hover:text-medical-600' : 'text-gray-800'}`}>
                                {slot.time}
                            </span>
                            {slot.status !== 'LIVRE' && (
                                <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${label.color}`} title={label.text}>
                                    {slot.status === 'AGENDADO' && <CalendarCheck className="w-3 h-3" />}
                                    {slot.status === 'PRESENTE' && <User className="w-3 h-3" />}
                                    {slot.status === 'EM_ATENDIMENTO' && <Clock className="w-3 h-3" />}
                                    {slot.status === 'REALIZADO' && <CheckCircle2 className="w-3 h-3" />}
                                    {slot.status === 'NAO_AGUARDOU' && <UserX className="w-3 h-3" />}
                                    {slot.status === 'FALTA' && <XCircle className="w-3 h-3" />}
                                    {slot.status === 'CANCELADO' && <Ban className="w-3 h-3" />}
                                    {slot.status === 'RESERVA' && <AlertCircle className="w-3 h-3" />}
                                    {(slot.status === 'BLOQUEADO' || slot.status === 'AGENDA_FECHADA') && <Ban className="w-3 h-3" />}
                                    <span className="truncate max-w-[80px]">{label.text}</span>
                                </div>
                            )}
                        </div>

                        <div className="min-h-[20px]">
                            {slot.status === 'LIVRE' ? (
                                <span className="text-sm font-medium text-gray-300 group-hover:text-medical-500 transition-colors flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-medical-500 transition-colors" />
                                    <span className="text-xs">Livre</span>
                                </span>
                            ) : (
                                <div className="space-y-0.5">
                                    <p className={`font-semibold text-sm truncate leading-tight ${slot.status === 'RESERVA' ? 'text-purple-700' : 'text-gray-900'}`}>
                                        {slot.status === 'RESERVA' ? slot.observation : slot.patient?.name}
                                    </p>
                                    {slot.status === 'RESERVA' ? (
                                        <div className="flex items-center gap-1 text-xs text-purple-600">
                                            <Lock className="w-3 h-3" />
                                            <span className="truncate">Atividade Interna</span>
                                        </div>
                                    ) : (
                                        slot.patient && (
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <User className="w-3 h-3" />
                                                <span className="truncate">{slot.patient.cns}</span>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Visual Tab for Type */}
                        {slot.type && slot.status !== 'LIVRE' && (
                            <div className={`
                                absolute right-3 top-3 w-2 h-2 rounded-full
                                ${slot.type === 'CONSULTA' ? 'bg-blue-400' : ''}
                                ${slot.type === 'RETORNO' ? 'bg-green-400' : ''}
                                ${slot.type === 'RESERVA' ? 'bg-purple-400' : ''}
                            `} title={slot.type} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default AgendaCalendar;
