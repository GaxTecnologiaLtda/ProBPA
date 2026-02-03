import React, { useState, useEffect } from 'react';
import { Search, Filter, UserPlus, Clock, Play, FileText, CheckCircle2, UserX, Lock, Printer, X } from 'lucide-react';
import { atendimentoService, AttendanceItem } from '../services/atendimentoService';
import AttendanceModal from '../components/AttendanceModal';

const AtendimentosPage: React.FC = () => {
    // Mock Queue Data representing the Reception Queue (PEC Flow)
    // Adding fields: 'isPriority' (boolean), 'isSpontaneous' (boolean), 'scheduledTime' (string | null)
    const [queue, setQueue] = useState<any[]>([
        { id: '1', arrivalTime: '07:45', patientName: 'João da Silva', patientCns: '700000000000001', status: 'FINALIZADO', professionalName: 'Dr. Gabriel Silva', isPriority: false, isSpontaneous: false, scheduledTime: '08:00' },
        { id: '2', arrivalTime: '08:10', patientName: 'Maria Oliveira', patientCns: '700000000000002', status: 'EM_ATENDIMENTO', professionalName: 'Enf. Ana Costa', isPriority: true, isSpontaneous: false, scheduledTime: '08:20' },
        { id: '3', arrivalTime: '08:30', patientName: 'Carlos Santos', patientCns: '700000000000003', status: 'AGUARDANDO', professionalName: 'Dr. Gabriel Silva', isPriority: false, isSpontaneous: false, scheduledTime: '08:40' },
        { id: '4', arrivalTime: '09:00', patientName: 'Ana Souza', patientCns: '700000000000004', status: 'AGUARDANDO', professionalName: 'Dr. Carlos Souza', isPriority: false, isSpontaneous: true, scheduledTime: null },
        { id: '5', arrivalTime: '09:15', patientName: 'Roberto Lima', patientCns: '700000000000005', status: 'NAO_AGUARDOU', professionalName: 'Téc. Maria', isPriority: false, isSpontaneous: true, scheduledTime: null },
    ]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Sorting Logic: Priority > HasSchedule > ScheduleTime ASC > ArrivalTime ASC
    const sortedQueue = [...queue].sort((a, b) => {
        if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
        const aHasSchedule = !!a.scheduledTime;
        const bHasSchedule = !!b.scheduledTime;
        if (aHasSchedule !== bHasSchedule) return aHasSchedule ? -1 : 1;

        if (aHasSchedule && bHasSchedule) {
            return a.scheduledTime.localeCompare(b.scheduledTime);
        }
        return a.arrivalTime.localeCompare(b.arrivalTime);
    });

    const handleAddAttendance = (data: any) => {
        const newItem = {
            id: Math.random().toString(),
            arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            patientName: data.patient.name,
            patientCns: data.patient.cns,
            status: 'AGUARDANDO',
            professionalName: null,
            isPriority: data.isPriority,
            isSpontaneous: true,
            scheduledTime: null,
            reason: data.reason // Admin only
        };
        setQueue([newItem, ...queue]);
    };

    const handleAction = (id: string, action: string) => {
        if (action === 'MARK_DID_NOT_WAIT') {
            setQueue(queue.map(item => item.id === id ? { ...item, status: 'NAO_AGUARDOU' } : item));
        } else if (action === 'REMOVE') {
            if (window.confirm('Tem certeza que deseja remover este cidadão da fila?')) {
                setQueue(queue.filter(item => item.id !== id));
            }
        }
    };

    const getStatusParams = (status: string) => {
        switch (status) {
            case 'AGUARDANDO': return { label: 'Aguardando', style: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock };
            case 'EM_ATENDIMENTO': return { label: 'Em Atendimento', style: 'bg-green-50 text-green-700 border-green-200', icon: Lock };
            case 'FINALIZADO': return { label: 'Finalizado', style: 'bg-gray-100 text-gray-500 border-gray-200', icon: CheckCircle2 };
            case 'NAO_AGUARDOU': return { label: 'Não Aguardou', style: 'bg-red-50 text-red-600 border-red-200', icon: UserX };
            default: return { label: status, style: 'bg-gray-50 text-gray-500', icon: Clock };
        }
    };

    const stats = {
        waiting: queue.filter(i => i.status === 'AGUARDANDO').length,
        inConfig: queue.filter(i => i.status === 'EM_ATENDIMENTO').length,
        finished: queue.filter(i => i.status === 'FINALIZADO').length,
        dropped: queue.filter(i => i.status === 'NAO_AGUARDOU').length,
    };

    return (
        <div className="p-6 max-w-7xl mx-auto h-screen flex flex-col bg-gray-50">
            <AttendanceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleAddAttendance}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 group cursor-help">
                        Lista de Atendimentos
                        <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Hoje</span>
                        <div className="relative group/info ml-1">
                            <span className="text-gray-400 hover:text-gray-600 transition-colors">ⓘ</span>
                            <div className="absolute top-full left-0 mt-2 hidden group-hover/info:block w-72 bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl z-50 font-medium leading-relaxed">
                                Esta lista exibe a fila do dia. <br />
                                O início e encerramento dos atendimentos são realizados no Painel de Produção.
                            </div>
                        </div>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Gerenciamento da fila de espera e demanda espontânea.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-all shadow-sm">
                        <Filter className="w-4 h-4" />
                        <span>Filtros</span>
                    </button>
                    <div className="hidden">
                        <p className="text-xs text-gray-400">Registrar chegada sem agendamento para entrar na fila do dia.</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.waiting}</p>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Aguardando</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 opacity-75">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <Play className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.inConfig}</p>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Em Atendimento</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 opacity-60">
                    <div className="p-3 bg-gray-100 text-gray-500 rounded-lg">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.finished}</p>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Finalizados</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 opacity-60">
                    <div className="p-3 bg-red-50 text-red-500 rounded-lg">
                        <UserX className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.dropped}</p>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Não Aguardaram</p>
                    </div>
                </div>
            </div>

            {/* Queue List */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 flex items-center gap-3 bg-gray-50/50">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou CNS..."
                        className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-400 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="p-4 border-b border-gray-200 w-40">Horário / Chegada</th>
                                <th className="p-4 border-b border-gray-200">Paciente / Profissional</th>
                                <th className="p-4 border-b border-gray-200 text-center w-40">Status</th>
                                <th className="p-4 border-b border-gray-200 text-right w-32">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedQueue.map((item) => {
                                const status = getStatusParams(item.status);
                                const isClinical = item.status === 'EM_ATENDIMENTO' || item.status === 'FINALIZADO';

                                return (
                                    <tr key={item.id} className={`transition-colors group ${item.isPriority ? 'bg-yellow-50/40 hover:bg-yellow-50' : 'hover:bg-gray-50'}`}>
                                        <td className="p-4 align-top">
                                            <div className="space-y-1">
                                                {item.scheduledTime ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                            {item.scheduledTime}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Agendado</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Sem agendamento</span>
                                                )}

                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    Entrada: <strong>{item.arrivalTime}</strong>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4 align-top">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-gray-900 text-sm">{item.patientName}</span>
                                                    {item.isPriority && (
                                                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold border border-yellow-200 flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                                                            PRIORIDADE
                                                        </span>
                                                    )}
                                                    {item.isSpontaneous && (
                                                        <span className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-full font-bold border border-orange-200">
                                                            ESPONTÂNEO
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                                                    <span className="font-mono">CNS: {item.patientCns}</span>
                                                    <span className="text-gray-400">{item.professionalName || 'Aguardando atribuição'}</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4 align-middle text-center">
                                            <div className="relative group/tooltip flex justify-center">
                                                <span className={`
                                                    cursor-help inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
                                                    ${status.style}
                                                `}>
                                                    {isClinical && <Lock className="w-3 h-3" />}
                                                    {status.label}
                                                </span>
                                                {isClinical && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-50 shadow-xl">
                                                        Status controlado no Painel de Produção
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="p-4 align-middle text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!isClinical && item.status !== 'NAO_AGUARDOU' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleAction(item.id, 'MARK_DID_NOT_WAIT')}
                                                            title="Marcar que não aguardou"
                                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <UserX className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            title="Reimprimir Comprovante"
                                                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}

                                                <button
                                                    onClick={() => // Mock View Logic
                                                        window.alert(`Visualizando detalhes de ${item.patientName}\nMotivo: ${item.reason || 'N/A'}`)
                                                    }
                                                    title="Ver Detalhes"
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>

                                                {!isClinical && (
                                                    <button
                                                        onClick={() => handleAction(item.id, 'REMOVE')}
                                                        title="Remover da fila (lançado errado)"
                                                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {queue.length === 0 && (
                        <div className="p-12 text-center text-gray-400">
                            Nenhum cidadão na fila hoje.
                        </div>
                    )}
                </div>
            </div>
            {/* Disclaimer */}
            <div className="text-center mt-4 mb-2">
                <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    Esta tela é para controle de fluxo. Ações clínicas devem ser realizadas no Painel de Atendimento (PEC).
                </p>
            </div>
        </div>
    );
};

export default AtendimentosPage;
