import React, { useState } from 'react';
import { MOCK_TICKETS } from '../constants';
import { SupportTicket, TicketStatus, TicketPriority, TicketSource, TicketLog } from '../types';
import { Card, Button, Badge, Modal, Tooltip, CollapsibleSection } from '../components/Common';
import { Headphones, Clock, MessageSquare, CheckCircle, AlertCircle, Monitor, Server, User, ArrowRight, Send, Archive } from 'lucide-react';

const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);
  
  // Filter/Collapse State
  const [isOpenTicketsOpen, setIsOpenTicketsOpen] = useState(true);
  const [isResolvedTicketsOpen, setIsResolvedTicketsOpen] = useState(false);

  // Modal State
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLogText, setNewLogText] = useState('');

  // --- DERIVED LISTS ---
  const openTickets = tickets.filter(t => t.status !== TicketStatus.RESOLVED);
  const resolvedTickets = tickets.filter(t => t.status === TicketStatus.RESOLVED);

  // --- HANDLERS ---
  
  const handleOpenTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
    setNewLogText('');
  };

  const handleAddLog = () => {
    if (!selectedTicket || !newLogText.trim()) return;

    const newLog: TicketLog = {
      id: Date.now().toString(),
      message: newLogText,
      createdAt: new Date().toISOString(),
      type: 'note',
      author: 'Admin Atual' // In a real app, this comes from auth context
    };

    const updatedTicket = {
      ...selectedTicket,
      status: TicketStatus.IN_PROGRESS, // Automatically move to In Progress if touched
      logs: [...selectedTicket.logs, newLog]
    };

    updateTicketState(updatedTicket);
    setNewLogText('');
  };

  const handleResolveTicket = () => {
    if (!selectedTicket) return;
    if (!newLogText.trim() && !window.confirm('Deseja concluir sem adicionar uma nota final?')) return;

    const resolutionLog: TicketLog = {
        id: Date.now().toString(),
        message: newLogText || 'Chamado concluído e encerrado.',
        createdAt: new Date().toISOString(),
        type: 'resolution',
        author: 'Admin Atual'
    };

    const updatedTicket = {
        ...selectedTicket,
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date().toISOString(),
        logs: [...selectedTicket.logs, resolutionLog]
    };

    updateTicketState(updatedTicket);
    setIsModalOpen(false);
  };

  const updateTicketState = (updated: SupportTicket) => {
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      setSelectedTicket(updated);
  };

  // --- HELPERS ---

  const getPriorityColor = (p: TicketPriority) => {
      switch(p) {
          case TicketPriority.CRITICAL: return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
          case TicketPriority.HIGH: return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
          case TicketPriority.MEDIUM: return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
          default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      }
  };

  const getSourceIcon = (s: TicketSource) => {
      return s === TicketSource.PRODUCTION ? <Monitor className="w-3 h-3 mr-1" /> : <Server className="w-3 h-3 mr-1" />;
  };

  const formatDateTime = (iso: string) => {
      return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // --- RENDER CARD ---
  const renderTicketCard = (ticket: SupportTicket) => (
    <div 
        key={ticket.id}
        onClick={() => handleOpenTicket(ticket)}
        className={`cursor-pointer group bg-white dark:bg-dark-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden ${ticket.status === TicketStatus.RESOLVED ? 'opacity-75 grayscale-[0.3]' : ''}`}
    >
        {/* Left color bar based on priority */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
            ticket.priority === TicketPriority.CRITICAL ? 'bg-red-500' :
            ticket.priority === TicketPriority.HIGH ? 'bg-orange-500' :
            ticket.priority === TicketPriority.MEDIUM ? 'bg-blue-500' : 'bg-slate-400'
        }`}></div>

        <div className="flex justify-between items-start mb-3 pl-3">
             <div className="flex items-center gap-2">
                 <span className="font-mono text-xs font-bold text-slate-500">{ticket.id}</span>
                 <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border flex items-center ${
                     ticket.source === TicketSource.PRODUCTION ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' : 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800'
                 }`}>
                     {getSourceIcon(ticket.source)}
                     {ticket.source === TicketSource.PRODUCTION ? 'Produção' : 'Gestão'}
                 </span>
             </div>
             <Badge variant={
                 ticket.status === TicketStatus.OPEN ? 'error' :
                 ticket.status === TicketStatus.IN_PROGRESS ? 'warning' : 'success'
             }>
                 {ticket.status}
             </Badge>
        </div>

        <h3 className="pl-3 text-base font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">{ticket.title}</h3>
        <p className="pl-3 text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{ticket.description}</p>

        <div className="pl-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
             <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                </span>
                <span className="text-xs text-slate-400 flex items-center" title="Criado em">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
             </div>
             <div className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center">
                <User className="w-3 h-3 mr-1" />
                {ticket.entityName.split(' ')[0]}...
             </div>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Chamados de Suporte</h1>
            <p className="text-slate-500">Central de atendimento ProBPA Gestão e Produção.</p>
         </div>
         <Button variant="ghost" disabled className="cursor-not-allowed opacity-50">
             <AlertCircle className="w-4 h-4 mr-2" /> SLAs em dia
         </Button>
      </div>

      {/* --- PENDING TICKETS --- */}
      <CollapsibleSection
         title="Fila de Atendimento (Pendentes)"
         count={openTickets.length}
         isOpen={isOpenTicketsOpen}
         onToggle={() => setIsOpenTicketsOpen(!isOpenTicketsOpen)}
         icon={MessageSquare}
         colorClass="text-orange-500"
         maxHeight="max-h-[70vh]"
      >
         {openTickets.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {openTickets.map(renderTicketCard)}
             </div>
         ) : (
             <div className="text-center py-8 text-slate-500">
                 <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-3 opacity-50" />
                 <p>Tudo limpo! Nenhum chamado pendente.</p>
             </div>
         )}
      </CollapsibleSection>

      {/* --- RESOLVED TICKETS --- */}
      <CollapsibleSection
         title="Histórico de Concluídos"
         count={resolvedTickets.length}
         isOpen={isResolvedTicketsOpen}
         onToggle={() => setIsResolvedTicketsOpen(!isResolvedTicketsOpen)}
         icon={Archive}
         colorClass="text-emerald-500"
         maxHeight="max-h-[50vh]"
      >
         {resolvedTickets.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {resolvedTickets.map(renderTicketCard)}
             </div>
         ) : (
             <p className="text-sm text-slate-500 italic">Nenhum histórico disponível.</p>
         )}
      </CollapsibleSection>

      {/* --- TICKET MANAGEMENT MODAL --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedTicket ? `Chamado #${selectedTicket.id}` : 'Detalhes'}
        footer={null} // Custom footer inside
      >
         {selectedTicket && (
             <div className="flex flex-col h-[70vh]">
                 {/* Header Info */}
                 <div className="bg-slate-50 dark:bg-dark-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 shrink-0">
                     <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedTicket.title}</h3>
                        <Badge variant={selectedTicket.status === TicketStatus.RESOLVED ? 'success' : 'warning'}>{selectedTicket.status}</Badge>
                     </div>
                     <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">{selectedTicket.description}</p>
                     
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-500">
                         <div>
                             <span className="font-bold block text-slate-700 dark:text-slate-400 uppercase">Solicitante</span>
                             {selectedTicket.requesterName}
                         </div>
                         <div>
                             <span className="font-bold block text-slate-700 dark:text-slate-400 uppercase">Entidade</span>
                             {selectedTicket.entityName}
                         </div>
                         <div>
                             <span className="font-bold block text-slate-700 dark:text-slate-400 uppercase">Origem</span>
                             {selectedTicket.source}
                         </div>
                         <div>
                             <span className="font-bold block text-slate-700 dark:text-slate-400 uppercase">Abertura</span>
                             {formatDateTime(selectedTicket.createdAt)}
                         </div>
                     </div>
                 </div>

                 {/* Timeline / Logs Area */}
                 <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
                     {selectedTicket.logs.map((log) => (
                         <div key={log.id} className={`flex gap-3 ${log.type === 'resolution' ? 'bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30' : ''}`}>
                             <div className="flex flex-col items-center">
                                 <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                     log.type === 'system' ? 'bg-slate-300' : 
                                     log.type === 'resolution' ? 'bg-emerald-500' : 'bg-corp-500'
                                 }`}></div>
                                 <div className="w-px h-full bg-slate-200 dark:bg-slate-700 my-1"></div>
                             </div>
                             <div className="flex-1 pb-4">
                                 <div className="flex justify-between items-start">
                                     <span className={`text-xs font-bold ${log.type === 'system' ? 'text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                                         {log.author}
                                     </span>
                                     <span className="text-[10px] text-slate-400">{formatDateTime(log.createdAt)}</span>
                                 </div>
                                 <p className={`text-sm mt-1 ${log.type === 'system' ? 'text-slate-500 italic' : 'text-slate-700 dark:text-slate-300'}`}>
                                     {log.message}
                                 </p>
                             </div>
                         </div>
                     ))}
                 </div>

                 {/* Action Area */}
                 {selectedTicket.status !== TicketStatus.RESOLVED ? (
                     <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
                         <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Registrar Atendimento / Nota</label>
                         <div className="flex gap-2">
                             <textarea 
                                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-950 px-3 py-2 text-sm focus:ring-2 focus:ring-corp-500 resize-none"
                                rows={2}
                                placeholder="Descreva a ação realizada ou adicione um comentário..."
                                value={newLogText}
                                onChange={(e) => setNewLogText(e.target.value)}
                             ></textarea>
                             <div className="flex flex-col gap-2">
                                <Tooltip content="Adicionar nota ao histórico">
                                    <Button size="sm" onClick={handleAddLog} disabled={!newLogText.trim()}>
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </Tooltip>
                                <Tooltip content="Concluir e Encerrar Chamado">
                                    <Button size="sm" variant="success" onClick={handleResolveTicket}>
                                        <CheckCircle className="w-4 h-4" />
                                    </Button>
                                </Tooltip>
                             </div>
                         </div>
                     </div>
                 ) : (
                     <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 shrink-0 text-center">
                         <Badge variant="success">Chamado Encerrado em {selectedTicket.resolvedAt ? formatDateTime(selectedTicket.resolvedAt) : ''}</Badge>
                     </div>
                 )}
             </div>
         )}
      </Modal>
    </div>
  );
};

export default SupportTickets;