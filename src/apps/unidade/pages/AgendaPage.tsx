import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, Search,
    MoreHorizontal, User, Printer
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AgendaCalendar from '../components/AgendaCalendar';
import { AppointmentModal } from '../components/AppointmentModal';
import AppointmentActionModal from '../components/AppointmentActionModal';
import { agendaService, Professional, Appointment } from '../services/agendaService';
import { useUnidadeAuth } from '../contexts/AuthContext';

const AgendaPage: React.FC = () => {
    const { user } = useUnidadeAuth();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [selectedProfessional, setSelectedProfessional] = useState<string>('');
    const [schedule, setSchedule] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Modals State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<Appointment | null>(null);

    // View Mode (Calendar vs Patient Search)
    const [viewMode, setViewMode] = useState<'CALENDAR' | 'PATIENT'>('CALENDAR');
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const handleSearch = () => {
        if (!patientSearchTerm) return;
        setLoading(true);
        agendaService.getPatientHistory(patientSearchTerm)
            .then(setSearchResults)
            .finally(() => setLoading(false));
    };

    const handleNavigateToSlot = (dateStr: string, professionalId: string) => {
        // Parse date properly (assuming YYYY-MM-DD from service)
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        setSelectedDate(date);
        if (professionalId) {
            setSelectedProfessional(professionalId);
        }
        setViewMode('CALENDAR');
    };

    useEffect(() => {
        agendaService.getProfessionals().then(data => {
            setProfessionals(data);
            if (data.length > 0) setSelectedProfessional(data[0].id);
        });
    }, []);

    useEffect(() => {
        if (selectedProfessional) {
            setLoading(true);
            agendaService.getDaySchedule(selectedDate, selectedProfessional)
                .then(setSchedule)
                .finally(() => setLoading(false));
        }
    }, [selectedDate, selectedProfessional]);

    const handleSlotClick = (slot: Appointment) => {
        setSelectedSlot(slot);
        if (slot.status === 'LIVRE') {
            setIsCreateModalOpen(true);
        } else if (slot.status !== 'BLOQUEADO') {
            setIsActionModalOpen(true);
        }
    };

    const handleCreateAppointment = (data: any) => {
        // Mock Update
        if (schedule && selectedSlot) {
            const updatedSlots = schedule.slots.map((s: Appointment) => {
                if (s.id === selectedSlot.id) {
                    const isReserve = data.type === 'RESERVA';
                    return {
                        ...s,
                        status: isReserve ? 'RESERVA' : 'AGENDADO',
                        patient: data.patient,
                        type: data.type,
                        reserveSubtype: data.reserveSubtype,
                        observation: data.observation,
                        // If it's a home visit or other location
                        location: data.location
                    };
                }
                return s;
            });
            setSchedule({ ...schedule, slots: updatedSlots });
        }
    };

    const handleSlotAction = (action: string, payload?: any) => {
        if (schedule && selectedSlot) {
            if (action === 'VIEW_RECORD') {
                setIsActionModalOpen(false);
                setViewMode('PATIENT');
                setPatientSearchTerm(selectedSlot.patient?.name || '');
                return;
            }
            if (action === 'PRINT_RECEIPT') {
                window.alert(`Imprimindo comprovante para ${selectedSlot.patient?.name}...`);
                return;
            }

            let newStatus = selectedSlot.status;

            switch (action) {
                case 'MARK_PRESENT': newStatus = 'PRESENTE'; break;
                case 'MARK_MISSED': newStatus = 'FALTA'; break;
                case 'CANCEL': newStatus = 'CANCELADO'; break; // Should theoretically free the slot, but mostly marks as canceled in history
            }

            const updatedSlots = schedule.slots.map((s: Appointment) => {
                if (s.id === selectedSlot.id) {
                    return { ...s, status: newStatus };
                }
                return s;
            });
            setSchedule({ ...schedule, slots: updatedSlots });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Modals */}
            <AppointmentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onConfirm={handleCreateAppointment}
            />
            <AppointmentActionModal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                appointment={selectedSlot}
                onAction={handleSlotAction}
            />


            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm z-20">
                <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white border border-gray-200 p-2.5 rounded-xl text-medical-600 shadow-sm">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Agenda de Atendimentos</h1>
                            <p className="text-sm text-gray-500">Fluxo de pacientes e agendamentos.</p>
                        </div>
                    </div>

                    <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('CALENDAR')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'CALENDAR' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Agenda Profissional
                        </button>
                        <button
                            onClick={() => setViewMode('PATIENT')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'PATIENT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Histórico do Cidadão
                        </button>
                    </div>
                </div>

                {/* Unified Controls Bar */}
                {viewMode === 'CALENDAR' && (
                    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-4 relative">
                            <select
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none appearance-none font-medium shadow-sm transition-all hover:border-gray-300"
                                value={selectedProfessional}
                                onChange={(e) => setSelectedProfessional(e.target.value)}
                            >
                                {professionals.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>

                        <div className="md:col-span-4 flex items-center justify-center gap-3">
                            <button
                                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                                className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 hover:text-gray-700 transition-all border border-transparent hover:border-gray-200"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center justify-center gap-2 bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm min-w-[200px]">
                                <CalendarIcon className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold text-gray-700 text-sm capitalize">
                                    {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                                className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 hover:text-gray-700 transition-all border border-transparent hover:border-gray-200"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="md:col-span-4 flex justify-end gap-2">
                            <button
                                onClick={() => window.print()}
                                title="Imprimir agenda do dia para conferência"
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors shadow-sm"
                            >
                                <Printer className="w-4 h-4" />
                                <span className="hidden lg:inline">Imprimir Agenda</span>
                            </button>
                            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors shadow-sm">
                                <Filter className="w-4 h-4" />
                                <span>Filtrar</span>
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Controls are now inside Header */}
            {viewMode === 'CALENDAR' ? (
                // Empty div just to keep logic structure if needed, but UI moved up
                <></>
            ) : (
                <div className="px-6 py-8 flex flex-col items-center min-h-[400px]">
                    <div className="w-full max-w-4xl">
                        <div className="flex flex-col items-center justify-center mb-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Buscar Histórico do Cidadão</h3>
                            <p className="text-gray-500 max-w-md text-center mt-2">Digite o nome, CPF ou CNS para visualizar todos os agendamentos passados e futuros.</p>

                            <div className="mt-6 flex gap-2 w-full max-w-lg">
                                <input
                                    type="text"
                                    className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 outline-none"
                                    placeholder="Pesquisar cidadão..."
                                    value={patientSearchTerm}
                                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={loading || patientSearchTerm.length < 3}
                                    className="px-6 py-3 bg-medical-600 text-white font-bold rounded-xl hover:bg-medical-700 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Buscando...' : 'Buscar'}
                                </button>
                            </div>
                        </div>

                        {/* Results List */}
                        {searchResults.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <h4 className="font-bold text-gray-900">Histórico de Agendamentos</h4>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{searchResults.length} registros encontrados</span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {searchResults.map((apt: any) => {
                                        const isFuture = new Date(apt.date) >= new Date(new Date().setHours(0, 0, 0, 0));
                                        return (
                                            <div key={apt.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isFuture ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        {isFuture ? <CalendarIcon className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-gray-900">{format(new Date(apt.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${apt.status === 'AGENDADO' ? 'bg-blue-100 text-blue-700' :
                                                                apt.status === 'REALIZADO' ? 'bg-green-100 text-green-700' :
                                                                    apt.status === 'FALTA' ? 'bg-orange-100 text-orange-700' :
                                                                        'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                {apt.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-0.5">
                                                            {apt.time} • {apt.type} • {apt.professional}
                                                        </p>
                                                    </div>
                                                </div>

                                                {isFuture && apt.status !== 'CANCELADO' && (
                                                    <button
                                                        onClick={() => handleNavigateToSlot(apt.date, apt.professionalId)}
                                                        className="px-4 py-2 text-medical-600 bg-medical-50 hover:bg-medical-100 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2"
                                                    >
                                                        Ir para Agenda
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Content */}
            {viewMode === 'CALENDAR' && (
                <main className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
                    <AgendaCalendar
                        date={selectedDate}
                        schedule={schedule}
                        loading={loading}
                        onSlotClick={handleSlotClick}
                    />
                </main>
            )}
        </div>
    );
};

export default AgendaPage;
