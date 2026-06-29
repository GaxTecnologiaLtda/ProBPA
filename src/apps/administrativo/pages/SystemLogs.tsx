import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { LogEntry, LogLevel, LogSource } from '../types';
import { Card, Button, Input, Select, Badge, Table, Modal, Tooltip } from '../components/Common';
import { ScrollText, Search, Filter, Monitor, Server, Shield, Eye, Download, Info, AlertTriangle, AlertOctagon, CheckCircle, CloudLightning, GitCommit, ChevronDown, ChevronRight, Activity, Globe } from 'lucide-react';
import { UnknownUnitsTracker } from '../components/UnknownUnitsTracker';
import { ExternalIntegrationsTracker } from '../components/ExternalIntegrationsTracker';

const SystemLogs: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'logs' | 'unknown_units'>('logs');

    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSource, setSelectedSource] = useState<string>('all');
    const [selectedLevel, setSelectedLevel] = useState<string>('all');

    // Detail Modal
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const q = query(
            collection(db, 'system_logs'),
            orderBy('timestamp', 'desc'),
            limit(200)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as LogEntry[];
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching system logs:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Filter Logic
    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSource = selectedSource === 'all' || log.source === selectedSource;
        const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;

        return matchesSearch && matchesSource && matchesLevel;
    });

    // Grouping Logic
    const groupedLogs = useMemo(() => {
        const groups: { parent: LogEntry, children: LogEntry[] }[] = [];

        filteredLogs.forEach((log) => {
            if (groups.length === 0) {
                groups.push({ parent: log, children: [] });
                return;
            }

            const lastGroup = groups[groups.length - 1];
            const timeDiff = Math.abs(new Date(lastGroup.parent.timestamp).getTime() - new Date(log.timestamp).getTime());
            const isSameSource = lastGroup.parent.source === log.source;
            const isSameUser = lastGroup.parent.user === log.user;
            const isSameLevel = lastGroup.parent.level === log.level;

            if (timeDiff <= 5000 && isSameSource && isSameUser && isSameLevel) {
                lastGroup.children.push(log);
            } else {
                groups.push({ parent: log, children: [] });
            }
        });

        return groups;
    }, [filteredLogs]);

    const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());

    const toggleCluster = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedClusters(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Helpers
    const getLevelBadge = (level: LogLevel) => {
        switch (level) {
            case LogLevel.INFO: return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800"><Info className="w-3 h-3 mr-1" /> INFO</span>;
            case LogLevel.WARNING: return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><AlertTriangle className="w-3 h-3 mr-1" /> WARN</span>;
            case LogLevel.ERROR: return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"><AlertOctagon className="w-3 h-3 mr-1" /> ERROR</span>;
            case LogLevel.CRITICAL: return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-300 dark:border-rose-700"><AlertOctagon className="w-3 h-3 mr-1" /> CRITICAL</span>;
            default: return <Badge variant="neutral">{level}</Badge>;
        }
    };

    const getSourceIcon = (source: LogSource) => {
        switch (source) {
            case LogSource.ADMIN_PANEL: return <Shield className="w-4 h-4 text-purple-500" />;
            case LogSource.ENTITY_PANEL: return <Server className="w-4 h-4 text-blue-500" />;
            case LogSource.PRODUCTION_PANEL: return <Monitor className="w-4 h-4 text-emerald-500" />;
            case LogSource.CLOUD_FUNCTIONS: return <CloudLightning className="w-4 h-4 text-orange-500" />;
            default: return <ScrollText className="w-4 h-4" />;
        }
    };

    const handleViewDetails = (log: LogEntry) => {
        setSelectedLog(log);
        setIsModalOpen(true);
    };

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "system_logs.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Logs de Sistema</h1>
                    <p className="text-slate-500">Auditoria centralizada de eventos e glosas.</p>
                </div>
                {activeTab === 'logs' && (
                    <Button variant="outline" icon={Download} onClick={handleExport}>
                        Exportar Logs
                    </Button>
                )}
            </div>

            {/* TABS SELECTION */}
            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-px font-medium text-sm">
                <button
                    className={`pb-2 px-2 border-b-2 transition-colors ${activeTab === 'logs' ? 'border-corp-500 text-corp-600 dark:text-corp-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    onClick={() => setActiveTab('logs')}
                >
                    Eventos do Sistema
                </button>
                <button
                    className={`pb-2 px-2 border-b-2 transition-colors ${activeTab === 'unknown_units' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    onClick={() => setActiveTab('unknown_units')}
                >
                    <div className="flex items-center gap-2">
                        Glosas Unknown Units
                        <Activity className="w-4 h-4" />
                    </div>
                </button>
                <button
                    className={`pb-2 px-2 border-b-2 transition-colors ${activeTab === 'external_integrations' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    onClick={() => setActiveTab('external_integrations')}
                >
                    <div className="flex items-center gap-2">
                        Integrações Externas (API)
                        <Globe className="w-4 h-4" />
                    </div>
                </button>
            </div>

            {activeTab === 'logs' ? (
                <>
                    <Card className="!p-4">
                        <div className="flex flex-col xl:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <Input
                                    placeholder="Buscar por evento, usuário ou ID..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="w-full sm:w-48">
                                    <Select
                                        value={selectedSource}
                                        onChange={(e) => setSelectedSource(e.target.value)}
                                        options={[
                                            { value: 'all', label: 'Origem: Todas' },
                                            { value: LogSource.ADMIN_PANEL, label: 'Painel Admin' },
                                            { value: LogSource.ENTITY_PANEL, label: 'Painel Entidade' },
                                            { value: LogSource.PRODUCTION_PANEL, label: 'Painel Produção' },
                                            { value: LogSource.CLOUD_FUNCTIONS, label: 'Cloud Functions' },
                                        ]}
                                    />
                                </div>
                                <div className="w-full sm:w-48">
                                    <Select
                                        value={selectedLevel}
                                        onChange={(e) => setSelectedLevel(e.target.value)}
                                        options={[
                                            { value: 'all', label: 'Nível: Todos' },
                                            { value: LogLevel.INFO, label: 'INFO' },
                                            { value: LogLevel.WARNING, label: 'WARNING' },
                                            { value: LogLevel.ERROR, label: 'ERROR' },
                                            { value: LogLevel.CRITICAL, label: 'CRITICAL' },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-dark-900/50">
                                    <tr>
                                        <th className="px-4 py-3 w-10 text-left"></th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nível</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Origem</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Evento</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuário</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-dark-800 divide-y divide-slate-200 dark:divide-slate-700">
                                    {groupedLogs.map((group) => {
                                        const isExpanded = expandedClusters.has(group.parent.id);
                                        const hasChildren = group.children.length > 0;

                                        return (
                                            <React.Fragment key={group.parent.id}>
                                                {/* Parent Row */}
                                                <tr
                                                    className={`hover:bg-slate-50 dark:hover:bg-dark-900/50 transition-colors ${hasChildren ? 'cursor-pointer' : ''}`}
                                                    onClick={hasChildren ? (e) => toggleCluster(group.parent.id, e) : undefined}
                                                >
                                                    <td className="px-4 py-4 whitespace-nowrap text-center text-slate-400">
                                                        {hasChildren && (
                                                            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                                                        {new Date(group.parent.timestamp).toLocaleString('pt-BR')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getLevelBadge(group.parent.level)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                                                        <div className="flex items-center gap-2">
                                                            {getSourceIcon(group.parent.source)}
                                                            <span className="truncate max-w-[150px]">{group.parent.source}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                                                        {group.parent.event}
                                                        {hasChildren && (
                                                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                                +{group.children.length}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        {group.parent.user || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <Tooltip content="Ver payload completo">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleViewDetails(group.parent); }}
                                                                className="text-slate-400 hover:text-corp-500 transition-colors"
                                                            >
                                                                <Eye className="w-5 h-5" />
                                                            </button>
                                                        </Tooltip>
                                                    </td>
                                                </tr>

                                                {/* Children Rows */}
                                                {isExpanded && group.children.map((childLog, idx) => (
                                                    <tr key={childLog.id} className="bg-slate-50/50 dark:bg-dark-900/30 transition-colors border-t-0 hover:bg-slate-100 dark:hover:bg-dark-800">
                                                        <td className="px-4 py-2 border-t-0"></td>
                                                        <td className="px-6 py-2 border-t-0 whitespace-nowrap text-sm text-slate-500 font-mono relative">
                                                            <div className="flex items-center text-slate-400 dark:text-slate-600">
                                                                {/* Visual connection line */}
                                                                <div className={`absolute left-0 w-px bg-slate-200 dark:bg-slate-700 ${idx === group.children.length - 1 ? 'h-1/2 top-0' : 'h-full top-0'} ml-10`}></div>
                                                                <div className="w-3 h-px bg-slate-200 dark:bg-slate-700 ml-10 mr-2"></div>
                                                                <span className="text-xs">{new Date(childLog.timestamp).toLocaleTimeString('pt-BR')}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-2 border-t-0 whitespace-nowrap"></td>
                                                        <td className="px-6 py-2 border-t-0 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300"></td>
                                                        <td className="px-6 py-2 border-t-0 text-sm font-medium text-slate-600 dark:text-slate-400">
                                                            <div className="flex items-center">
                                                                <GitCommit className="w-3 h-3 text-slate-300 dark:text-slate-600 mr-2" />
                                                                {childLog.event}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-2 border-t-0 text-sm text-slate-500"></td>
                                                        <td className="px-6 py-2 border-t-0 whitespace-nowrap text-right text-sm font-medium">
                                                            <Tooltip content="Ver payload completo">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleViewDetails(childLog); }}
                                                                    className="text-slate-400 hover:text-corp-500 transition-colors"
                                                                >
                                                                    <Eye className="w-5 h-5" />
                                                                </button>
                                                            </Tooltip>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {loading ? (
                            <div className="text-center py-12 flex flex-col justify-center items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-corp-600 mb-4"></div>
                                <p className="text-slate-500">Conectando aos logs do servidor em tempo real...</p>
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-500">Nenhum log encontrado com os filtros atuais.</p>
                            </div>
                        ) : null}
                    </div>

                    {/* Detail Modal */}
                    <Modal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        title="Detalhes do Evento"
                        footer={<Button onClick={() => setIsModalOpen(false)}>Fechar</Button>}
                    >
                        {selectedLog && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-dark-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">ID do Evento</p>
                                        <p className="font-mono text-sm font-semibold">{selectedLog.id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Data/Hora</p>
                                        <p className="font-mono text-sm">{new Date(selectedLog.timestamp).toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nível de Severidade</label>
                                        {getLevelBadge(selectedLog.level)}
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Origem</label>
                                        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                            {getSourceIcon(selectedLog.source)}
                                            {selectedLog.source}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Usuário</label>
                                        <p className="text-sm font-mono bg-slate-100 dark:bg-dark-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                                            {selectedLog.user || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Endereço IP</label>
                                        <p className="text-sm font-mono bg-slate-100 dark:bg-dark-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                                            {selectedLog.ip || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Mensagem do Evento</label>
                                    <p className="text-base font-medium text-slate-900 dark:text-white p-3 bg-slate-50 dark:bg-dark-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                        {selectedLog.event}
                                    </p>
                                </div>

                                {selectedLog.details && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Payload / Detalhes (JSON)</label>
                                        <div className="relative">
                                            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-slate-700">
                                                {typeof selectedLog.details === 'object' ? JSON.stringify(selectedLog.details, null, 2) : selectedLog.details}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {selectedLog.userAgent && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">User Agent</label>
                                        <p className="text-xs text-slate-500 break-all bg-slate-50 dark:bg-dark-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                                            {selectedLog.userAgent}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </Modal>
                </>
            ) : activeTab === 'unknown_units' ? (
                <UnknownUnitsTracker />
            ) : (
                <ExternalIntegrationsTracker />
            )}
        </div >
    );
};

export default SystemLogs;