import React, { useState } from 'react';
import { MOCK_SYSTEM_LOGS } from '../constants';
import { LogEntry, LogLevel, LogSource } from '../types';
import { Card, Button, Input, Select, Badge, Table, Modal, Tooltip } from '../components/Common';
import { ScrollText, Search, Filter, Monitor, Server, Shield, Eye, Download, Info, AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react';

const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_SYSTEM_LOGS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  
  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Helpers
  const getLevelBadge = (level: LogLevel) => {
    switch(level) {
        case LogLevel.INFO: return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800"><Info className="w-3 h-3 mr-1"/> INFO</span>;
        case LogLevel.WARNING: return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><AlertTriangle className="w-3 h-3 mr-1"/> WARN</span>;
        case LogLevel.ERROR: return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"><AlertOctagon className="w-3 h-3 mr-1"/> ERROR</span>;
        case LogLevel.CRITICAL: return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-300 dark:border-rose-700"><AlertOctagon className="w-3 h-3 mr-1"/> CRITICAL</span>;
        default: return <Badge variant="neutral">{level}</Badge>;
    }
  };

  const getSourceIcon = (source: LogSource) => {
      switch(source) {
          case LogSource.ADMIN_PANEL: return <Shield className="w-4 h-4 text-purple-500" />;
          case LogSource.ENTITY_PANEL: return <Server className="w-4 h-4 text-blue-500" />;
          case LogSource.PRODUCTION_PANEL: return <Monitor className="w-4 h-4 text-emerald-500" />;
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
            <p className="text-slate-500">Auditoria centralizada de eventos e segurança.</p>
         </div>
         <Button variant="outline" icon={Download} onClick={handleExport}>
             Exportar Logs
         </Button>
      </div>

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
                            {value: 'all', label: 'Origem: Todas'},
                            {value: LogSource.ADMIN_PANEL, label: 'Painel Admin'},
                            {value: LogSource.ENTITY_PANEL, label: 'Painel Entidade'},
                            {value: LogSource.PRODUCTION_PANEL, label: 'Painel Produção'},
                        ]}
                   />
               </div>
               <div className="w-full sm:w-48">
                   <Select 
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        options={[
                            {value: 'all', label: 'Nível: Todos'},
                            {value: LogLevel.INFO, label: 'INFO'},
                            {value: LogLevel.WARNING, label: 'WARNING'},
                            {value: LogLevel.ERROR, label: 'ERROR'},
                            {value: LogLevel.CRITICAL, label: 'CRITICAL'},
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nível</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Origem</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Evento</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuário</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-dark-900/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                                {new Date(log.timestamp).toLocaleString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {getLevelBadge(log.level)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                                <div className="flex items-center gap-2">
                                    {getSourceIcon(log.source)}
                                    <span className="truncate max-w-[150px]">{log.source}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                                {log.event}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                                {log.user || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Tooltip content="Ver payload completo">
                                    <button 
                                        onClick={() => handleViewDetails(log)}
                                        className="text-slate-400 hover:text-corp-500 transition-colors"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                </Tooltip>
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
          {filteredLogs.length === 0 && (
             <div className="text-center py-12">
                 <p className="text-slate-500">Nenhum log encontrado com os filtros atuais.</p>
             </div>
          )}
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
    </div>
  );
};

export default SystemLogs;