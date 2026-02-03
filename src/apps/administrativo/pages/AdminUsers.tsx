import React, { useState } from 'react';
import { MOCK_USERS } from '../constants';
import { AdminUser, UserRole } from '../types';
import { Button, Table, Badge, Switch, Modal, Input, Select, Tooltip } from '../components/Common';
import { Plus, Shield, Trash2, Edit, Search, User, Lock, Mail } from 'lucide-react';

const INITIAL_FORM_STATE = {
  name: '',
  email: '',
  password: '',
  role: '',
  active: true
};

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- HANDLERS ---

  const handleNew = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM_STATE);
    setIsModalOpen(true);
  };

  const handleEdit = (user: AdminUser) => {
    setEditingId(user.id);
    setFormData({
        name: user.name,
        email: user.email,
        password: '', // Don't show existing password, empty means "don't change"
        role: user.role,
        active: user.active
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário? O acesso será revogado imediatamente.')) {
        setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleToggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => {
        if (u.id === id) {
            return { ...u, active: !u.active };
        }
        return u;
    }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.role) {
        alert("Preencha os campos obrigatórios.");
        return;
    }

    if (!editingId && !formData.password) {
        alert("Uma senha provisória é obrigatória para novos usuários.");
        return;
    }

    const newUser: AdminUser = {
        id: editingId || `U${Date.now()}`,
        name: formData.name,
        email: formData.email,
        role: formData.role as UserRole,
        active: formData.active,
        lastLogin: editingId ? (users.find(u => u.id === editingId)?.lastLogin || 'Nunca') : 'Nunca'
    };

    if (editingId) {
        setUsers(prev => prev.map(u => u.id === editingId ? newUser : u));
    } else {
        setUsers(prev => [newUser, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper for Role Badge Color
  const getRoleColor = (role: UserRole) => {
      switch (role) {
          case UserRole.SUPER_ADMIN: return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
          case UserRole.SUPPORT: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
          case UserRole.AUDITOR: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
          default: return '';
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Usuários Administrativos</h1>
                <p className="text-slate-500">Gerencie a equipe GAX com acesso ao painel.</p>
            </div>
            <Tooltip content="Cadastrar novo usuário do sistema">
                <Button icon={Plus} onClick={handleNew}>Novo Usuário</Button>
            </Tooltip>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4">
                 <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <Input 
                        placeholder="Buscar usuário por nome ou e-mail..." 
                        className="pl-9" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
            </div>

            <Table headers={["Usuário", "Email", "Perfil de Acesso", "Status", "Último Acesso", "Ações"]}>
                {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-dark-900/50 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                                user.active 
                                ? 'bg-gradient-to-tr from-corp-500 to-gax-500 text-white' 
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            }`}>
                                {user.name.charAt(0)}
                            </div>
                            <div>
                                <span className={`text-sm font-semibold block ${!user.active && 'text-slate-400'}`}>{user.name}</span>
                                <span className="text-xs text-slate-400">ID: {user.id}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{user.email}</td>
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded border ${getRoleColor(user.role)}`}>
                                <Shield className="w-3 h-3 mr-1" />
                                {user.role}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <Switch 
                                    checked={user.active} 
                                    onChange={() => handleToggleStatus(user.id)} 
                                />
                                <span className={`text-xs font-medium ${user.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                    {user.active ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                            {user.lastLogin}
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <Tooltip content="Editar cadastro">
                                    <button 
                                        onClick={() => handleEdit(user)}
                                        className="p-1 text-slate-400 hover:text-corp-500 transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Excluir usuário">
                                    <button 
                                        onClick={() => handleDelete(user.id)}
                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                            </div>
                        </td>
                    </tr>
                ))}
            </Table>
            
            {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                    Nenhum usuário encontrado.
                </div>
            )}
        </div>

        {/* --- USER MODAL --- */}
        <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingId ? "Editar Usuário" : "Novo Usuário Admin"}
            footer={
                <>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar Usuário</Button>
                </>
            }
        >
            <div className="space-y-6">
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-corp-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center">
                        <User className="w-4 h-4 mr-2" /> Dados Pessoais
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input 
                            label="Nome Completo" 
                            placeholder="Ex: João Silva" 
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                        <div className="relative">
                             <Mail className="w-4 h-4 absolute left-3 top-9 text-slate-400" />
                             <Input 
                                label="E-mail Corporativo" 
                                className="pl-9"
                                placeholder="usuario@gax.com" 
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                             />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-corp-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center">
                        <Shield className="w-4 h-4 mr-2" /> Acesso e Segurança
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select 
                            label="Perfil de Acesso" 
                            value={formData.role}
                            onChange={(e) => handleInputChange('role', e.target.value)}
                            options={[
                                {value: '', label: 'Selecione...'},
                                {value: UserRole.SUPER_ADMIN, label: 'Super Admin (Acesso Total)'},
                                {value: UserRole.SUPPORT, label: 'Suporte (Tickets e Visualização)'},
                                {value: UserRole.AUDITOR, label: 'Auditor (Apenas Leitura)'},
                            ]}
                        />
                        <div className="relative">
                             <Lock className="w-4 h-4 absolute left-3 top-9 text-slate-400" />
                             <Input 
                                label={editingId ? "Alterar Senha (Opcional)" : "Senha Provisória"}
                                className="pl-9"
                                placeholder="******" 
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                             />
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-dark-900 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Status da Conta</p>
                            <p className="text-xs text-slate-500">Define se o usuário pode efetuar login no painel.</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className={`text-xs font-bold uppercase ${formData.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                 {formData.active ? 'Ativo' : 'Inativo'}
                             </span>
                             <Switch 
                                checked={formData.active}
                                onChange={(val) => handleInputChange('active', val)}
                             />
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default AdminUsers;