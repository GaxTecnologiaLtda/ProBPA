import React, { useState, useEffect } from 'react';
import { Filter, Calendar, Clock, Briefcase, Plus } from 'lucide-react';
import { escalaService, ProfessionalRoster } from '../services/escalaService';
import ShiftModal from '../components/ShiftModal';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const EscalaPage: React.FC = () => {
    const [roster, setRoster] = useState<ProfessionalRoster[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        escalaService.getRoster()
            .then(data => setRoster(data))
            .finally(() => setLoading(false));
    }, []);

    const handleAddShift = (data: any) => {
        // Mock update
        const updatedRoster = [...roster];
        const profIndex = updatedRoster.findIndex(p => p.professionalId === data.professional);

        if (profIndex >= 0) {
            updatedRoster[profIndex].shifts.push({
                id: Math.random().toString(),
                dayOfWeek: data.dayOfWeek,
                startTime: data.startTime,
                endTime: data.endTime,
                type: data.type
            });
            setRoster(updatedRoster);
        } else {
            alert('Profissional simulado não encontrado (use IDs 1 ou 2 no mock)');
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'ATENDIMENTO': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
            case 'VISITA_DOMICILIAR': return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
            case 'REUNIAO': return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
            case 'ATIVIDADE_COLETIVA': return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'ATENDIMENTO': return 'Atendimento UBS';
            case 'VISITA_DOMICILIAR': return 'Visita Domiciliar';
            case 'REUNIAO': return 'Reunião Equipe';
            case 'ATIVIDADE_COLETIVA': return 'Atividade Coletiva';
            default: return type;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto h-screen flex flex-col">
            <ShiftModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleAddShift}
            />

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Escala de Profissionais</h1>
                    <p className="text-gray-500">Visualize a alocação da equipe durante a semana.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                        <Filter className="w-4 h-4" />
                        <span>Filtros</span>
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-medical-600 text-white rounded-lg hover:bg-medical-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Novo Turno</span>
                    </button>
                </div>
            </header>

            {/* Matrix View */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-auto">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 w-64">
                                Profissional
                            </th>
                            {DAYS.slice(1, 6).map(day => ( // Mon-Fri for simplicity, can include Sat/Sun
                                <th key={day} className="p-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 min-w-[200px]">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-12 text-center text-gray-400">Carregando escala...</td></tr>
                        ) : (
                            roster.map(prof => (
                                <tr key={prof.professionalId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 border-r border-gray-100">
                                        <p className="font-bold text-gray-900">{prof.professionalName}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            <Briefcase className="w-3 h-3" />
                                            {prof.cbo}
                                        </p>
                                    </td>
                                    {/* Days Columns */}
                                    {[1, 2, 3, 4, 5].map(dayIndex => {
                                        const shifts = prof.shifts.filter(s => s.dayOfWeek === dayIndex);
                                        return (
                                            <td key={dayIndex} className="p-2 border-r border-gray-50 align-top h-32">
                                                <div className="flex flex-col gap-2 h-full">
                                                    {shifts.length > 0 ? shifts.map(shift => (
                                                        <div
                                                            key={shift.id}
                                                            title="Esta atividade bloqueia a agenda para consultas."
                                                            className={`p-2 rounded-lg border text-xs shadow-sm cursor-help transition-shadow ${getTypeColor(shift.type)}`}
                                                        >
                                                            <div className="font-bold flex items-center gap-1 mb-1">
                                                                <Clock className="w-3 h-3 opacity-70" />
                                                                {shift.startTime} - {shift.endTime}
                                                            </div>
                                                            <div className="opacity-90 font-medium truncate">
                                                                {getTypeLabel(shift.type)}
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <div
                                                            onClick={() => setIsModalOpen(true)}
                                                            className="h-full rounded-lg border-2 border-dashed border-gray-100 flex items-center justify-center text-gray-300 hover:border-medical-200 hover:text-medical-500 cursor-pointer transition-colors group"
                                                        >
                                                            <Plus className="w-5 h-5 opacity-0 group-hover:opacity-100" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EscalaPage;
