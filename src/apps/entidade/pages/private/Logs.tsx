import React, { useState, useEffect } from 'react';
import { Badge, Button, Card, Select } from '../../components/ui/Components';
import { MOCK_MUNICIPALITIES } from '../../constants';
// @ts-ignore
import { fetchLogs, LogEntry } from '../../services/logsService';
import { useAuth } from '../../context/AuthContext';
import { useEntityData } from '../../hooks/useEntityData';
import {
   Search, Filter, History, Calendar, User,
   Activity, Globe, Server, FileText, CheckCircle2,
   AlertCircle, Download, RefreshCw, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Logs: React.FC = () => {
   const { claims } = useAuth();
   const { entity } = useEntityData(claims?.entityId || '');

   const [logs, setLogs] = useState<LogEntry[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedMunicipality, setSelectedMunicipality] = useState('all');
   const [selectedAction, setSelectedAction] = useState('all');
   const [activeTab, setActiveTab] = useState<'GENERAL' | 'ACTION_PROGRAM'>('GENERAL');
   const [selectedDate, setSelectedDate] = useState('');
   const [limitCount, setLimitCount] = useState(100);

   const loadLogs = async () => {
      if (!claims?.entityId) return;
      setLoading(true);
      try {
         const data = await fetchLogs(claims.entityId, selectedMunicipality, limitCount, selectedDate);
         setLogs(data);
      } catch (error) {
         console.error("Erro ao carregar logs:", error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      loadLogs();
   }, [claims?.entityId, selectedMunicipality, limitCount]);

   // Filtragem Client-Side adicional
   const filteredLogs = logs.filter(log => {
      // 1. Tab isolation
      if (activeTab === 'GENERAL' && log.target === 'ACTION_PROGRAM') return false;
      if (activeTab === 'ACTION_PROGRAM' && log.target !== 'ACTION_PROGRAM') return false;

      // 2. Action filter
      if (selectedAction !== 'all' && log.action !== selectedAction) return false;

      // 3. Search
      if (searchTerm) {
          const term = searchTerm.toLowerCase();
          if (
            !log.description.toLowerCase().includes(term) &&
            !log.user.email.toLowerCase().includes(term) &&
            !log.user.name.toLowerCase().includes(term)
          ) {
              return false;
          }
      }

      return true;
   });

   const getActionColor = (action: string) => {
      switch (action) {
         case 'CREATE': return 'text-green-600 bg-green-50 border-green-200';
         case 'UPDATE': return 'text-blue-600 bg-blue-50 border-blue-200';
         case 'DELETE': return 'text-red-600 bg-red-50 border-red-200';
         case 'LOGIN': return 'text-purple-600 bg-purple-50 border-purple-200';
         case 'LOGOUT': return 'text-gray-600 bg-gray-50 border-gray-200';
         case 'CONFIG': return 'text-amber-600 bg-amber-50 border-amber-200';
         case 'BLOCK': return 'text-rose-600 bg-rose-50 border-rose-200 ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]';
         default: return 'text-gray-600 bg-gray-50 border-gray-200';
      }
   };

   const getActionIcon = (action: string) => {
      switch (action) {
         case 'CREATE': return <CheckCircle2 className="w-3 h-3" />;
         case 'UPDATE': return <RefreshCw className="w-3 h-3" />;
         case 'DELETE': return <AlertCircle className="w-3 h-3" />;
         case 'LOGIN': return <User className="w-3 h-3" />;
         case 'CONFIG': return <Activity className="w-3 h-3" />;
         case 'BLOCK': return <AlertCircle className="w-3 h-3 animate-pulse" />;
         default: return <Activity className="w-3 h-3" />;
      }
   };

   return (
      <div className="space-y-6">
         <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
               <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-6 h-6 text-emerald-600" /> Logs de Uso
               </h1>
               <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Registro de auditoria de todas as ações realizadas no painel.
               </p>
            </div>
            <div className="flex gap-2">
               <Button variant="outline" onClick={loadLogs} title="Atualizar">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
               </Button>
               <Button variant="secondary" onClick={() => {/* Export Logic */ }}>
                  <Download className="w-4 h-4 mr-2" /> Exportar CSV
               </Button>
            </div>
         </div>

         <Card className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
               <button
                  className={`flex-1 py-3 px-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'GENERAL' ? 'text-indigo-600 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  onClick={() => setActiveTab('GENERAL')}
               >
                  Histórico Geral
               </button>
               <button
                  className={`flex-1 py-3 px-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'ACTION_PROGRAM' ? 'text-emerald-600 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  onClick={() => setActiveTab('ACTION_PROGRAM')}
               >
                  Ações e Programas
               </button>
            </div>
            
            <div className="p-4 flex flex-col lg:flex-row gap-4 items-center justify-between">
               <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <div className="relative flex-1 min-w-[200px]">
                     <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                     <input
                        type="text"
                        placeholder="Buscar por usuário, descrição..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                     />
                  </div>

                  <select
                     value={selectedMunicipality}
                     onChange={(e) => setSelectedMunicipality(e.target.value)}
                     className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                     <option value="all">Todas as Unidades/Municípios</option>
                     {MOCK_MUNICIPALITIES.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                     ))}
                  </select>

                  <select
                     value={selectedAction}
                     onChange={(e) => setSelectedAction(e.target.value)}
                     className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                     <option value="all">Todas as Ações</option>
                     <option value="CREATE">Criação</option>
                     <option value="UPDATE">Edição</option>
                     <option value="DELETE">Exclusão</option>
                     <option value="LOGIN">Acesso</option>
                     <option value="IMPORT">Importação</option>
                     <option value="CONFIG">Configuração</option>
                     <option value="BLOCK">Bloqueio do Sistema</option>
                  </select>

                  <input
                     type="date"
                     value={selectedDate}
                     onChange={(e) => setSelectedDate(e.target.value)}
                     className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
               </div>
            </div>
         </Card>

         <div className="space-y-4">
            {loading && filteredLogs.length === 0 ? (
               <div className="text-center py-12 text-gray-500">Carregando registros...</div>
            ) : (

               Object.entries(
                  filteredLogs.reduce((groups, log) => {
                     // Helper to handle timestamp safely
                     /* @ts-ignore */
                     const dateObj = log.timestamp?.toDate ? log.timestamp.toDate() : (log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000) : new Date());

                     // Format Date Key (e.g., '2025-01-23')
                     // We can use a readable key like "Hoje", "Ontem" or full date string title
                     const today = new Date();
                     const yesterday = new Date();
                     yesterday.setDate(yesterday.getDate() - 1);

                     let dateKey = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

                     if (dateObj.toDateString() === today.toDateString()) {
                        dateKey = 'Hoje';
                     } else if (dateObj.toDateString() === yesterday.toDateString()) {
                        dateKey = 'Ontem';
                     }

                     if (!groups[dateKey]) {
                        groups[dateKey] = [];
                     }
                     groups[dateKey].push({ ...log, dateObj });
                     return groups;
                  }, {} as Record<string, (LogEntry & { dateObj: Date })[]>)
               ).map(([dateLabel, groupLogs]: [string, any[]]) => (
                  <div key={dateLabel} className="space-y-4">
                     <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700">
                           {dateLabel}
                        </span>
                        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                     </div>

                     {groupLogs.map((log) => (
                        <motion.div
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           key={log.id}
                           className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center gap-4"
                        >
                           <div className="flex items-center gap-4 min-w-[180px]">
                              <div className={`p-2 rounded-lg border ${getActionColor(log.action)}`}>
                                 {getActionIcon(log.action)}
                              </div>
                              <div>
                                 <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block uppercase tracking-wider">
                                    {log.action}
                                 </span>
                                 <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                    <Calendar className="w-3 h-3" />
                                    {/* Display Time Only if grouped by date, or full date if preferred. User asked for date aggregation, so maybe time is enough inside the card, or full date/time. Let's keep Time. */}
                                    {log.dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                 </div>
                              </div>
                           </div>

                           <div className="flex-1">
                              <p className={`font-medium ${log.action === 'BLOCK' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-gray-900 dark:text-white'}`}>
                                 {log.description}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                 <div className="flex items-center gap-1 text-xs text-gray-500 border-r border-gray-200 pr-3">
                                    <User className="w-3 h-3" /> {log.user.name} ({log.user.email})
                                 </div>
                                 {log.user.role && (
                                    <Badge type={log.user.role === 'COORDENAÇÃO' || log.user.role === 'MASTER' ? 'warning' : 'neutral'} className="text-[10px] py-0 px-2 h-5">
                                       <span className="font-bold opacity-80 mr-1">Perfil: </span>{log.user.role}
                                    </Badge>
                                 )}
                                 {log.municipalityId && (
                                    <Badge type="neutral" className="text-[10px] py-0 px-2 h-5">
                                       {MOCK_MUNICIPALITIES.find(m => m.id === log.municipalityId)?.name || 'Global'}
                                    </Badge>
                                 )}
                              </div>
                           </div>

                           <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs font-mono text-gray-500 border border-gray-100 dark:border-gray-700 hidden lg:block">
                              ID: {log.id?.substring(0, 8)}...
                           </div>
                        </motion.div>
                     ))}
                  </div>
               ))
            )}

            {!loading && filteredLogs.length === 0 && (
               <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum log encontrado</h3>
                  <p className="text-gray-500 dark:text-gray-400">Nenhuma atividade registrada com os filtros atuais.</p>
               </div>
            )}
            {!loading && filteredLogs.length > 0 && logs.length >= limitCount && (
               <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={() => setLimitCount(prev => prev + 100)}>
                     Carregar Mais Antigos
                  </Button>
               </div>
            )}
         </div>
      </div>
   );
};

export default Logs;