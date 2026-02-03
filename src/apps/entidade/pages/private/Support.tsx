import React, { useState } from 'react';
import { Card, Badge, Button, Modal, Input, Select, Table } from '../../components/ui/Components';
import { MOCK_TICKETS } from '../../constants';
import { SupportTicket } from '../../types';
import {
  LifeBuoy, Plus, MessageSquare, Paperclip, Send,
  Clock, CheckCircle2, AlertCircle, Search, Filter,
  Terminal, FileText, Headphones
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

const Support: React.FC = () => {
  const { claims } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form State
  const [formData, setFormData] = useState<Partial<SupportTicket>>({
    type: 'Dúvida',
    priority: 'medium',
    subject: '',
    description: '',
  });

  const filteredTickets = tickets.filter(t =>
    (filterStatus === 'all' || t.status === filterStatus) &&
    (t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || t.protocol.includes(searchTerm))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTicket: SupportTicket = {
      id: Math.random().toString(36).substr(2, 9),
      protocol: `${new Date().getFullYear()}${new Date().getMonth()}${Math.floor(Math.random() * 10000)}`,
      type: formData.type as any,
      priority: formData.priority as any,
      subject: formData.subject || '',
      description: formData.description || '',
      status: 'open',
      createdAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      hasAttachment: false // Simulação
    };

    setTickets([newTicket, ...tickets]);

    // Log Action
    if (claims?.entityId) {
      // @ts-ignore
      import('../../services/logsService').then(({ logAction }) => {
        logAction({
          action: 'SUPPORT',
          target: 'SYSTEM',
          description: `Abriu chamado de suporte: ${newTicket.subject} (Protocolo: ${newTicket.protocol})`,
          entityId: claims.entityId
        });
      }).catch(console.error);
    }

    setIsModalOpen(false);
    setFormData({
      type: 'Dúvida',
      priority: 'medium',
      subject: '',
      description: '',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge type="warning">Aberto</Badge>;
      case 'in_progress': return <Badge type="neutral" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Em Atendimento</Badge>;
      case 'resolved': return <Badge type="success">Resolvido</Badge>;
      case 'closed': return <Badge type="neutral">Fechado</Badge>;
      default: return <Badge type="neutral">{status}</Badge>;
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suporte Técnico</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Canal direto com a equipe de engenharia do ProBPA (GAX Tecnologia).
          </p>
        </div>
        <Button
          variant="secondary"
          className="flex items-center gap-2"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-4 h-4" /> Novo Chamado
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 border-l-4 border-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Chamados Abertos</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <LifeBuoy className="w-6 h-6 text-emerald-600" />
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-blue-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Resolvidos este Mês</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-purple-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tempo Médio Resposta</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">45 min</h3>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Clock className="w-6 h-6 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por Protocolo ou Assunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todos os Status</option>
            <option value="open">Aberto</option>
            <option value="in_progress">Em Andamento</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </select>
        </div>
      </Card>

      {/* Ticket List */}
      <Card className="overflow-hidden">
        <Table headers={['Protocolo', 'Assunto', 'Tipo', 'Prioridade', 'Atualização', 'Status', 'Ações']}>
          {filteredTickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="px-6 py-4 font-mono text-xs text-gray-500">{ticket.protocol}</td>
              <td className="px-6 py-4">
                <div className="font-medium text-gray-900 dark:text-white">{ticket.subject}</div>
                {ticket.hasAttachment && (
                  <div className="flex items-center text-xs text-gray-400 mt-1">
                    <Paperclip className="w-3 h-3 mr-1" /> Anexo
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{ticket.type}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority === 'low' ? 'Baixa' : ticket.priority === 'medium' ? 'Média' : ticket.priority === 'high' ? 'Alta' : 'Crítica'}
                </span>
              </td>
              <td className="px-6 py-4 text-xs text-gray-500">
                {new Date(ticket.lastUpdate).toLocaleString()}
              </td>
              <td className="px-6 py-4">
                {getStatusBadge(ticket.status)}
              </td>
              <td className="px-6 py-4">
                <button className="text-emerald-600 hover:text-emerald-800 text-sm font-medium flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" /> Ver
                </button>
              </td>
            </tr>
          ))}
        </Table>
        {filteredTickets.length === 0 && (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <Headphones className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>Nenhum chamado encontrado.</p>
          </div>
        )}
      </Card>

      {/* Modal de Abertura de Chamado */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Abrir Solicitação de Suporte"
      >
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Destinatário Fixo */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800 flex items-center">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-full mr-3">
              <Terminal className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase block">Destinatário</span>
              <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Suporte Técnico ProBPA - GAX Tecnologia</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipo de Solicitação"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as any })}
            >
              <option value="Erro no Sistema">Erro no Sistema (Bug)</option>
              <option value="Dúvida">Dúvida de Utilização</option>
              <option value="Solicitação de Acesso">Solicitação de Acesso</option>
              <option value="Financeiro">Questão Financeira/Contrato</option>
              <option value="Sugestão">Sugestão de Melhoria</option>
            </Select>

            <Select
              label="Prioridade"
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
            >
              <option value="low">Baixa - Não urgente</option>
              <option value="medium">Média - Impacto parcial</option>
              <option value="high">Alta - Impede trabalho</option>
              <option value="critical">Crítica - Sistema indisponível</option>
            </Select>

            <div className="md:col-span-2">
              <Input
                label="Assunto"
                placeholder="Resumo do problema..."
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição Detalhada</label>
              <textarea
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-32"
                placeholder="Descreva o que aconteceu, passos para reproduzir o erro, ou sua dúvida em detalhes..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anexos (Prints/Logs)</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <span className="text-sm text-gray-500">Clique para adicionar arquivos ou arraste aqui</span>
                <input type="file" className="hidden" multiple />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="secondary" className="flex items-center">
              <Send className="w-4 h-4 mr-2" /> Enviar Solicitação
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Support;