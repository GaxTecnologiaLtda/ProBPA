import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Button, Badge, Modal, Table, Skeleton } from '../../components/ui/Components';
import {
    CheckCircle, FileText, Users, Filter, ArrowUpRight,
    Download, BarChart2, PieChart, Activity, Eye, Target, Building2, TrendingUp, Search, X,
    ChevronDown, RefreshCw
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useDashboardSubsedeData } from './useDashboardSubsedeData';

// Reusing same mock/structural constants for charts if needed
const COLORS = ['#ea580c', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

type TabType = 'dashboard' | 'reports';

interface ReportType {
    id: string;
    title: string;
    desc: string;
    icon: any;
    color: string;
}

const ProductionSubsede: React.FC = () => {
    const { claims } = useAuth();
    const { selectedCompetence } = useOutletContext<{ selectedCompetence: string }>();
    const { production, professionals: dashboardProfessionals, units: dashboardUnits, goals: dashboardGoals, loading: dashboardLoading, syncing, syncData } = useDashboardSubsedeData(selectedCompetence);

    const [activeTab, setActiveTab] = useState<TabType>('dashboard');

    // --- View Control ---
    const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const handleOpenReport = (report: ReportType) => {
        setSelectedReport(report);
        setIsReportModalOpen(true);
    };

    // --- Renderers ---
    const renderDashboard = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-5 border-l-4 border-orange-500">
                    <div className="text-sm text-gray-500 font-medium">Produção Local (Qtd)</div>
                    <div className="mt-2">
                        {dashboardLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {production.total.toLocaleString('pt-BR')}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center mt-2 text-sm text-orange-600 font-medium">
                        {production.trendUp ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <Activity className="w-4 h-4 mr-1" />}
                        {production.trend}% vs anterior
                    </div>
                </Card>

                <Card className="p-5 border-l-4 border-amber-500">
                    <div className="text-sm text-gray-500 font-medium">Eficiência de Metas (Local)</div>
                    <div className="mt-2">
                        {dashboardLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {dashboardGoals.value}
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Média da Unidade Local</div>
                </Card>

                <Card className="p-5 border-l-4 border-emerald-500">
                    <div className="text-sm text-gray-500 font-medium">Unidades Monitoradas</div>
                    <div className="mt-2">
                        {dashboardLoading ? (
                            <Skeleton className="h-8 w-12" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {dashboardUnits?.value || 0}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center mt-2 text-sm text-emerald-600 font-medium">
                        <Building2 className="w-4 h-4 mr-1" /> Lançamentos no Município
                    </div>
                </Card>

                <Card className="p-5 border-l-4 border-indigo-500">
                    <div className="text-sm text-gray-500 font-medium">Profissionais Ativos</div>
                    <div className="mt-2">
                        {dashboardLoading ? (
                            <Skeleton className="h-8 w-12" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {dashboardProfessionals.value}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center mt-2 text-sm text-indigo-600 font-medium">
                        <Users className="w-4 h-4 mr-1" /> Na competência
                    </div>
                </Card>
            </div>

            {/* Gráficos Principais */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2 text-orange-600" />
                            Evolução Temporal da Produção Local
                        </h3>
                    </div>
                    <div className="h-[300px]">
                        {dashboardLoading ? (
                            <Skeleton className="w-full h-full rounded-lg" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={production.chartData}>
                                    <defs>
                                        <linearGradient id="colorProdLocal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="procedures" name="Produção Local" stroke="#ea580c" fillOpacity={1} fill="url(#colorProdLocal)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Procedimentos</h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                        {dashboardLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="flex flex-col gap-2">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-8" />
                                    </div>
                                    <Skeleton className="h-1.5 w-full" />
                                </div>
                            ))
                        ) : (
                            <>
                                {production.topProcedures?.map((proc, idx) => (
                                    <div key={idx} className="relative pt-1 p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors group">
                                        <div className="flex mb-1 items-center justify-between">
                                            <div className="flex items-center overflow-hidden">
                                                <span className="text-xs font-semibold inline-block py-0.5 px-2 uppercase rounded-full text-orange-700 bg-orange-100 dark:bg-orange-900 dark:text-orange-300 mr-2 flex-shrink-0 group-hover:bg-orange-200">
                                                    #{idx + 1}
                                                </span>
                                                <span className="font-medium text-sm text-gray-700 dark:text-gray-200 truncate" title={proc.name}>
                                                    {proc.name}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-gray-900 dark:text-white ml-2 flex-shrink-0">
                                                {proc.value}
                                            </span>
                                        </div>
                                        <div className="overflow-hidden h-1.5 mb-2 text-xs flex rounded bg-gray-100 dark:bg-gray-700">
                                            <div style={{ width: `${(proc.value / (production.topProcedures[0]?.value || 1)) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-500"></div>
                                        </div>
                                    </div>
                                ))}
                                {(!production.topProcedures || production.topProcedures.length === 0) && (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        Nenhum dado de procedimento disponível.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {(dashboardProfessionals.value > 0 || dashboardLoading) && (
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Detalhes de Performance
                        </h3>
                        <Button variant="outline" className="text-xs" onClick={() => setActiveTab('reports')}>
                            Explorar Relatórios Locais
                        </Button>
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 text-center">
                        <p className="text-sm text-gray-500 mb-4 flex justify-center items-center gap-2">
                            Acompanhe informações detalhadas usando os relatórios da sua sub-sede abaixo.
                        </p>
                        <Button onClick={() => setActiveTab('reports')} variant="secondary">
                            Ver Relatórios
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );

    const renderReports = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {[
                { id: 'metas', title: 'Apoio às Metas', desc: 'Acompanhamento se as unidades e equipes atingiram a meta diária e mensal.', icon: Target, color: 'text-orange-600' },
                { id: 'profissional', title: 'Lançamentos da Equipe', desc: 'Produção detalhada pelos profissionais alocados no seu município.', icon: Users, color: 'text-emerald-600' },
                { id: 'unidades', title: 'Produtividade de Unidades', desc: 'Análise de desempenho e faturamento das unidades geridas.', icon: Building2, color: 'text-indigo-600' },
                { id: 'procedimentos', title: 'Curva de Procedimentos', desc: 'Identifique os serviços mais demandados pela população local.', icon: BarChart2, color: 'text-amber-500' }
            ].map((rep, idx) => {
                const Icon = rep.icon;
                return (
                    <Card key={idx} className="p-6 flex flex-col justify-between hover:border-orange-200 transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700">
                        <div className="opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className={`p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 w-fit mb-4 ${rep.color}`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{rep.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{rep.desc}</p>
                        </div>
                        <div className="flex gap-2 mt-auto">
                            <Button
                                variant="outline"
                                className="flex-1 text-xs"
                                onClick={() => handleOpenReport(rep)}
                            >
                                <Eye className="w-3 h-3 mr-2 text-gray-500" /> Consultar
                            </Button>
                        </div>
                    </Card>
                )
            })}
        </div>
    );

    const renderReportModalContent = () => {
        if (!selectedReport) return null;
        // For now, Subsede reports will share similar structural mock to show they're read-only views
        return (
            <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Relatório em Construção Especializada</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                    As visualizações específicas dos relatórios locais detalhados para o perfil de {selectedReport.title} estão sendo preparadas para integração.
                </p>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Acompanhamento e Produção</h1>
                    <p className="text-gray-500 mt-1 dark:text-gray-400">
                        Visão consolidada das atividades da sua Sub-Sede.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={syncData}
                        disabled={syncing || dashboardLoading}
                        className={`flex items-center px-4 py-2 h-[42px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm outline-none transition-colors 
                        ${(syncing || dashboardLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-orange-600 dark:hover:text-orange-400 focus:ring-2 focus:ring-orange-500'}`}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${(syncing) ? 'animate-spin' : ''}`} />
                        {syncing ? 'Sincronizando...' : 'Atualizar'}
                    </button>
                    <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                        <button
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'dashboard' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm' : 'text-gray-600 hover:text-orange-600 dark:text-gray-400'}`}
                            onClick={() => setActiveTab('dashboard')}
                        >
                            Painel Resumo
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'reports' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm' : 'text-gray-600 hover:text-orange-600 dark:text-gray-400'}`}
                            onClick={() => setActiveTab('reports')}
                        >
                            Painel de Monitoramento
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                {activeTab === 'dashboard' ? renderDashboard() : renderReports()}
            </div>

            <Modal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                title={selectedReport?.title || 'Relatório'}
                size="xl"
            >
                {renderReportModalContent()}
            </Modal>
        </div>
    );
};

export default ProductionSubsede;
