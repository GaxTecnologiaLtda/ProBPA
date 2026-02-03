import React, { useState, useEffect } from 'react';
import { useUnidadeAuth } from '../contexts/AuthContext';
import {
    Users, Calendar, Clock, Activity, AlertCircle,
    Bell, ChevronRight, FilePlus, Search, ShieldAlert,
    BarChart3
} from 'lucide-react';
import { dashboardService, DashboardStats } from '../services/dashboardService';

const DashboardPage: React.FC = () => {
    const { user } = useUnidadeAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        dashboardService.getStats().then(setStats);
    }, []);

    if (!stats) return <div className="p-8">Carregando painel...</div>;

    const isCoordinator = user?.role === 'COORDENADOR';

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Olá, {user?.name}</h1>
                <p className="text-gray-500">
                    {isCoordinator
                        ? 'Visão geral gerencial da UBS Central.'
                        : 'Acompanhe o fluxo da recepção e agenda do dia.'}
                </p>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Agendados Hoje</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.appointmentsToday.total}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                            <Calendar className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Total de agendamentos previstos</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Aguardando</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.queueStatus.waiting}</h3>
                        </div>
                        <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg group-hover:bg-yellow-100 transition-colors">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Cidadãos presentes na unidade</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Em Atendimento</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.queueStatus.inProgress}</h3>
                        </div>
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors">
                            <Activity className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Controle do Painel de Produção</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Faltas</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">2</h3>
                        </div>
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition-colors">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Agendamentos não comparecidos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Actions Section */}
                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-gray-900">Ações Rápidas</h2>
                    <div className="grid grid-cols-1 gap-3">
                        <button className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-medical-300 hover:shadow-md transition-all text-left group">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                <Search className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Buscar Cidadão</h3>
                                <p className="text-xs text-gray-500">Verificar prontuário ou histórico</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 ml-auto group-hover:text-medical-500" />
                        </button>

                        <button className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-medical-300 hover:shadow-md transition-all text-left group">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors">
                                <FilePlus className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Novo Agendamento</h3>
                                <p className="text-xs text-gray-500">Marcar consulta para hoje/futuro</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 ml-auto group-hover:text-medical-500" />
                        </button>

                        {isCoordinator && (
                            <button className="flex items-center gap-3 p-4 bg-white border-l-4 border-l-orange-500 border-y border-r border-gray-200 rounded-r-xl hover:shadow-md transition-all text-left group">
                                <div>
                                    <h3 className="font-bold text-gray-900">Gerenciar Escala</h3>
                                    <p className="text-xs text-gray-500">Resolver conflitos de horário</p>
                                </div>
                                <ShieldAlert className="w-5 h-5 text-orange-500 ml-auto" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Alerts / Notices Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900">Avisos da Unidade</h2>
                        {isCoordinator && (
                            <button className="text-sm font-medium text-medical-600 hover:underline">
                                + Criar Aviso
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {stats.alerts.map(alert => (
                            <div key={alert.id} className={`p-4 rounded-xl border flex items-start gap-4 ${alert.type === 'ALERTA' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'
                                }`}>
                                <div className={`p-2 rounded-full ${alert.type === 'ALERTA' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${alert.type === 'ALERTA' ? 'text-red-900' : 'text-blue-900'
                                        }`}>{alert.title}</h3>
                                    <p className={`text-sm mt-1 ${alert.type === 'ALERTA' ? 'text-red-700' : 'text-blue-700'
                                        }`}>{alert.message}</p>
                                    <p className="text-xs mt-2 opacity-70 font-medium">Postado em {alert.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
