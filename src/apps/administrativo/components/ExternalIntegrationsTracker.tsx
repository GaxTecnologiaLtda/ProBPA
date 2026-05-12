import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { APIIntegrationLog } from '../types';
import { Card, Badge, Table } from './Common';
import { Activity, Globe, Shield, Clock, CheckCircle, AlertOctagon, ArrowUpRight } from 'lucide-react';

export const ExternalIntegrationsTracker: React.FC = () => {
    const [logs, setLogs] = useState<APIIntegrationLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'externalApiIntegrationLogs'),
            orderBy('timestamp', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as APIIntegrationLog[];
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching integration logs:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const formatTimestamp = (ts: any) => {
        if (!ts) return '-';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleString('pt-BR');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="!p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Sucesso (Últimos 100)</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {logs.filter(l => l.status === 'SUCCESS').length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="!p-4 bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                            <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Falhas (Últimos 100)</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {logs.filter(l => l.status === 'ERROR').length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="!p-4 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <ArrowUpRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total Registros Processados</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {logs.reduce((acc, curr) => acc + (curr.recordCount || 0), 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-dark-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Município</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Entidade</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Volume</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">IP de Origem</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-dark-900/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            {formatTimestamp(log.timestamp)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                                            {log.municipalityName || 'Desconhecido'}
                                        </div>
                                        <div className="text-xs text-slate-500 font-mono">
                                            {log.municipalityId}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${log.entityType === 'PRIVATE' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                            {log.entityType || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-xs font-medium text-slate-900 dark:text-white">
                                            {log.dateRange || '-'}
                                        </div>
                                        <div className="flex gap-1 mt-1">
                                            {log.competencies?.map(c => (
                                                <span key={c} className="px-1.5 py-0.5 bg-slate-100 dark:bg-dark-900 text-[10px] font-bold text-slate-500 rounded border border-slate-200 dark:border-slate-700">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                                                {log.recordCount?.toLocaleString() || 0}
                                            </div>
                                            <span className="text-xs text-slate-500">registros</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {log.status === 'SUCCESS' ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                <CheckCircle className="w-3 h-3 mr-1" /> SUCESSO
                                            </span>
                                        ) : (
                                            <Tooltip content={log.errorMessage || 'Erro desconhecido'}>
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                                    <AlertOctagon className="w-3 h-3 mr-1" /> ERRO
                                                </span>
                                            </Tooltip>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-slate-400" />
                                            {log.clientIp}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {loading && (
                    <div className="text-center py-12 flex flex-col justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-corp-600 mb-4"></div>
                        <p className="text-slate-500">Carregando logs de integração...</p>
                    </div>
                )}

                {!loading && logs.length === 0 && (
                    <div className="text-center py-12">
                        <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-500 text-lg font-medium">Nenhuma integração externa registrada.</p>
                        <p className="text-slate-400 text-sm">Os logs aparecerão aqui assim que sistemas externos começarem a enviar dados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Simple Tooltip shim since we might not have it exported everywhere
const Tooltip = ({ children, content }: { children: React.ReactNode, content: string }) => {
    return (
        <div className="group relative inline-block">
            {children}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {content}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
            </div>
        </div>
    );
};
