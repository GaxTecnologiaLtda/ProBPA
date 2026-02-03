import React, { useState } from 'react';
import { Card, Table, Badge, Button, Modal, Input, Select } from '../../components/ui/Components';
import { Plus, Mail, Shield, MoreHorizontal, User, Phone, Key, Trash2, Ban, RefreshCw, CheckCircle, Send, Search, Filter } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: 'active' | 'pending' | 'suspended';
  lastAccess?: string;
}

const MOCK_PUBLIC_USERS: UserData[] = [
  { id: '1', name: 'Ana Silva', cpf: '123.456.789-00', email: 'ana.silva@saude.gov.br', phone: '(11) 99999-0000', role: 'Gestor Municipal', department: 'Gabinete', status: 'active', lastAccess: '2024-08-20 10:30' },
  { id: '2', name: 'Roberto Santos', cpf: '234.567.890-11', email: 'roberto@saude.gov.br', phone: '(11) 98888-1111', role: 'Auditor', department: 'Regulação', status: 'active', lastAccess: '2024-08-19 15:45' },
  { id: '3', name: 'Maria Oliveira', cpf: '345.678.901-22', email: 'maria.o@saude.gov.br', phone: '(11) 97777-2222', role: 'Digitador', department: 'Faturamento', status: 'pending' },
];

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>(MOCK_PUBLIC_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  
  // Estados de Edição/Ação
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState<UserData | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // Formulário
  const [formData, setFormData] = useState<Partial<UserData>>({});

  // --- Actions ---

  const handleOpenForm = (user?: UserData) => {
    if (user) {
      setEditingId(user.id);
      setFormData(user);
    } else {
      setEditingId(null);
      setFormData({
        name: '', cpf: '', email: '', phone: '',
        role: 'Digitador', department: '', status: 'pending'
      });
    }
    setIsFormModalOpen(true);
    setOpenMenuId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setUsers(prev => prev.map(u => u.id === editingId ? { ...u, ...formData } as UserData : u));
    } else {
      const newUser = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending' // Sempre nasce pendente até liberar acesso
      } as UserData;
      setUsers([newUser, ...users]);
    }
    setIsFormModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário? O acesso será revogado imediatamente.')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
    setOpenMenuId(null);
  };

  const handleSuspend = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'suspended' } : u));
    setOpenMenuId(null);
  };

  const handleResetPassword = (user: UserData) => {
    if(confirm(`Deseja enviar um e-mail de redefinição de senha para ${user.email}?`)) {
        alert('E-mail de redefinição enviado com sucesso!');
    }
    setOpenMenuId(null);
  };

  // --- Grant Access Flow ---

  const handleOpenAccess = (user: UserData) => {
    setSelectedUserForAccess(user);
    setEmailSent(false);
    setIsAccessModalOpen(true);
    setOpenMenuId(null);
  };

  const confirmGrantAccess = () => {
    setEmailSent(true);
    setTimeout(() => {
        if (selectedUserForAccess) {
            setUsers(prev => prev.map(u => u.id === selectedUserForAccess.id ? { ...u, status: 'active' } : u));
        }
        setTimeout(() => {
            setIsAccessModalOpen(false);
            setEmailSent(false);
        }, 1500);
    }, 1000);
  };

  // --- Render Helpers ---

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" onClick={() => setOpenMenuId(null)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuários da Gestão</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie o acesso ao painel da secretaria municipal.</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2" onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      <Card className="p-4 bg-white dark:bg-gray-800">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou e-mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>
          <button className="flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </button>
        </div>
      </Card>

      <Card className="overflow-visible">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-medium text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Função/Setor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Último Acesso</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3 border-2 border-white dark:border-gray-800 shadow-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-blue-500" /> {user.role}
                        </span>
                        <span className="text-xs text-gray-500">{user.department}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge type={user.status === 'active' ? 'success' : user.status === 'pending' ? 'warning' : 'error'}>
                      {user.status === 'active' ? 'Ativo' : user.status === 'pending' ? 'Pendente' : 'Suspenso'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono">
                    {user.lastAccess || '-'}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <div className="flex items-center justify-end gap-2">
                      {user.status === 'pending' && (
                          <Button 
                            variant="primary" 
                            className="h-8 px-3 text-xs flex items-center gap-1 shadow-sm"
                            onClick={() => handleOpenAccess(user)}
                          >
                             <Key className="w-3 h-3" /> Liberar Acesso
                          </Button>
                      )}
                      
                      <div className="relative">
                        <button 
                            onClick={(e) => toggleMenu(user.id, e)}
                            className={`p-2 rounded-lg transition-colors ${openMenuId === user.id ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                        
                        {openMenuId === user.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden py-1">
                                <button onClick={() => handleOpenForm(user)} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <User className="w-4 h-4" /> Editar Dados
                                </button>
                                <button onClick={() => handleResetPassword(user)} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <RefreshCw className="w-4 h-4" /> Redefinir Senha
                                </button>
                                {user.status !== 'suspended' ? (
                                    <button onClick={() => handleSuspend(user.id)} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                                        <Ban className="w-4 h-4" /> Suspender Acesso
                                    </button>
                                ) : (
                                    <button onClick={() => handleOpenAccess(user)} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                                        <CheckCircle className="w-4 h-4" /> Reativar Acesso
                                    </button>
                                )}
                                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                <button onClick={() => handleDelete(user.id)} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <Trash2 className="w-4 h-4" /> Excluir Usuário
                                </button>
                            </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Liberação de Acesso */}
      <Modal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        title="Liberar Acesso ao Sistema"
      >
        <div className="space-y-6 text-center">
           <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
               {emailSent ? <CheckCircle className="w-10 h-10 text-blue-600" /> : <Key className="w-10 h-10 text-blue-600" />}
           </div>

           <div>
               <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                   {emailSent ? 'Acesso Concedido!' : `Conceder acesso a ${selectedUserForAccess?.name}`}
               </h3>
               <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 px-6">
                   {emailSent 
                     ? `Uma senha temporária foi enviada para ${selectedUserForAccess?.email}. O usuário poderá acessar o painel imediatamente.`
                     : "O usuário receberá um e-mail com as credenciais de acesso e um link para definição de senha."
                   }
               </p>
           </div>

           {!emailSent && (
               <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg text-left border border-gray-100 dark:border-gray-600 max-w-md mx-auto">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail de Destino</label>
                   <div className="flex items-center text-gray-900 dark:text-white font-medium">
                       <Mail className="w-4 h-4 mr-2 text-gray-400" />
                       {selectedUserForAccess?.email}
                   </div>
               </div>
           )}

           <div className="flex justify-center gap-3 pt-2">
               {!emailSent ? (
                    <>
                        <Button variant="outline" onClick={() => setIsAccessModalOpen(false)}>Cancelar</Button>
                        <Button 
                            variant="primary" 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={confirmGrantAccess}
                        >
                            <Send className="w-4 h-4 mr-2" />
                            Liberar Acesso e Enviar Senha
                        </Button>
                    </>
               ) : (
                    <Button variant="outline" onClick={() => setIsAccessModalOpen(false)}>Fechar</Button>
               )}
           </div>
        </div>
      </Modal>

      {/* Modal de Cadastro/Edição */}
      <Modal 
        isOpen={isFormModalOpen} 
        onClose={() => setIsFormModalOpen(false)} 
        title={editingId ? "Editar Usuário" : "Cadastrar Novo Usuário"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
             <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
               <User className="w-4 h-4 mr-2 text-blue-600" /> Dados Pessoais
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                   label="Nome Completo" 
                   value={formData.name || ''} 
                   onChange={e => setFormData({...formData, name: e.target.value})}
                   required
                   className="md:col-span-2"
                />
                <Input 
                   label="CPF" 
                   value={formData.cpf || ''} 
                   onChange={e => setFormData({...formData, cpf: e.target.value})}
                   placeholder="000.000.000-00"
                   required
                />
                <Input 
                   label="Telefone" 
                   value={formData.phone || ''} 
                   onChange={e => setFormData({...formData, phone: e.target.value})}
                />
                <Input 
                   label="E-mail Institucional" 
                   type="email"
                   value={formData.email || ''} 
                   onChange={e => setFormData({...formData, email: e.target.value})}
                   required
                   className="md:col-span-2"
                />
             </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
             <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
               <Shield className="w-4 h-4 mr-2 text-blue-600" /> Permissões e Função
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select 
                   label="Perfil de Acesso"
                   value={formData.role}
                   onChange={e => setFormData({...formData, role: e.target.value})}
                   required
                >
                   <option value="Gestor Municipal">Gestor Municipal (Total)</option>
                   <option value="Auditor">Auditor (Visualização + Relatórios)</option>
                   <option value="Operador">Operador (Cadastro)</option>
                   <option value="Digitador">Digitador (BPA)</option>
                </Select>
                <Input 
                   label="Setor / Departamento" 
                   value={formData.department || ''} 
                   onChange={e => setFormData({...formData, department: e.target.value})}
                   placeholder="Ex: Regulação"
                />
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
             <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>Cancelar</Button>
             <Button type="submit" variant="primary">{editingId ? 'Salvar Alterações' : 'Cadastrar Usuário'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;