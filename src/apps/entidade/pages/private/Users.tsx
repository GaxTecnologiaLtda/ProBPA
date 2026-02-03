import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal, Input, Select } from '../../components/ui/Components';
import { Plus, Mail, Briefcase, MoreHorizontal, User, Key, Trash2, Ban, RefreshCw, CheckCircle, Send, Search, Filter, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEntityData } from '../../hooks/useEntityData';
import { UserData, subscribeToEntityUsers, createUser, updateUser, deleteUser, toggleUserStatus, resetUserPassword } from '../../services/usersService';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { Municipality } from '../../types';

const Users: React.FC = () => {
  const { claims } = useAuth();
  const isCoordenacao = !!claims?.coordenation;
  const entityId = claims?.entityId;
  const { entity } = useEntityData(entityId);

  const [users, setUsers] = useState<UserData[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // Estados de Ação
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState<UserData | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<UserData>>({});

  // Fetch Users
  useEffect(() => {
    if (!entityId) return;
    const unsubscribe = subscribeToEntityUsers(entityId, (fetchedUsers) => {
      setUsers(fetchedUsers);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [entityId]);

  // Fetch Municipalities
  useEffect(() => {
    async function loadMunicipalities() {
      if (entityId) {
        try {
          const muns = await fetchMunicipalitiesByEntity(entityId);
          setMunicipalities(muns);
        } catch (err) {
          console.error("Failed to load municipalities", err);
        }
      }
    }
    loadMunicipalities();
  }, [entityId]);

  // --- Handlers ---

  const handleOpenForm = (user?: UserData) => {
    if (isCoordenacao && user) {
      if (user.role !== 'Coordenador Local' && user.role !== 'COORDENAÇÃO') { // Allow editing self-like or subsede?
        // Rules: Coordenacao manages SubSede.
        // But IF we changed "Coordenador Local" to "COORDENAÇÃO" role for everyone... 
        // Assuming users created NOW will be COORDENAÇÃO.
        // Let's stick to rule: can manage role 'Coordenador Local' OR new 'COORDENAÇÃO' if allowed?
        // Actually, if prompt says "Perfil de Acesso... apenas COORDENAÇÃO", we assume we are creating COORDENAÇÃO users.
        // If a COORDENAÇÃO user tries to edit a COORDENAÇÃO user... permissions?
        // Cloud function says: Coordenação can ONLY manage 'Coordenador Local'.
        // If we are creating 'COORDENAÇÃO' users now, then 'Coordenação' CANNOT manage them?
        // Only MASTER can.
        // So if I am Coordenação, and the list contains COORDENAÇÃO users... I can't edit them.
        // I can only edit 'Coordenador Local'.
        // So if I select a 'Coordenador Local' user, I can edit.
      }
    }

    if (user) {
      setEditingId(user.id);
      setFormData(user);
    } else {
      setEditingId(null);
      setFormData({
        name: '', cpf: '', email: '', phone: '',
        role: 'COORDENAÇÃO', organizationId: 'matriz', status: 'pending'
      });
    }
    setIsFormModalOpen(true);
    setOpenMenuId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      // Resolve organization Name
      let orgName = entity?.name ? `Matriz (${entity.name})` : 'Matriz (Sede)';
      if (formData.organizationId && formData.organizationId !== 'matriz') {
        const mun = municipalities.find(m => m.id === formData.organizationId);
        orgName = mun ? `Filial: ${mun.name} (${mun.uf})` : 'Desconhecido';
      }

      const dataToSave = { ...formData, organizationName: orgName };

      if (editingId) {
        await updateUser(editingId, dataToSave);
      } else {
        const result = await createUser(dataToSave);
        if (result.password) {
          alert(`Usuário criado com sucesso! Senha temporária: ${result.password}`);
        }
      }
      setIsFormModalOpen(false);
    } catch (error: any) {
      console.error("Error saving user:", error);
      alert(`Erro ao salvar usuário: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    if (isCoordenacao && userToDelete?.role !== 'Coordenador Local') {
      alert('Você não tem permissão para excluir este usuário.');
      return;
    }

    if (confirm('Tem certeza que deseja excluir este usuário? O acesso será revogado imediatamente.')) {
      try {
        await deleteUser(id);
      } catch (error: any) {
        alert(`Erro ao excluir: ${error.message}`);
      }
    }
    setOpenMenuId(null);
  };

  const handleSuspend = async (id: string) => {
    const userToSuspend = users.find(u => u.id === id);
    if (isCoordenacao && userToSuspend?.role !== 'Coordenador Local') {
      alert('Você não tem permissão para suspender este usuário.');
      return;
    }
    try {
      await toggleUserStatus(id, 'suspended');
    } catch (error: any) {
      alert(`Erro ao suspender: ${error.message}`);
    }
    setOpenMenuId(null);
  };

  const handleReactivate = async (id: string) => {
    try {
      await toggleUserStatus(id, 'active');
    } catch (error: any) {
      alert(`Erro ao reativar: ${error.message}`);
    }
    setOpenMenuId(null);
  };

  const handleResetPassword = async (user: UserData) => {
    if (isCoordenacao && user.role !== 'Coordenador Local') {
      alert('Você não tem permissão para redefinir a senha deste usuário.');
      return;
    }
    if (confirm(`Deseja redefinir a senha para ${user.email}?`)) {
      try {
        const result = await resetUserPassword(user.id);
        if (result.password) {
          alert(`Senha redefinida com sucesso! Nova senha: ${result.password}`);
        } else {
          alert('Senha redefinida com sucesso! E-mail de recuperação enviado.');
        }
      } catch (error: any) {
        alert(`Erro ao redefinir senha: ${error.message}`);
      }
    }
    setOpenMenuId(null);
  };

  const handleOpenAccess = (user: UserData) => {
    setSelectedUserForAccess(user);
    setGeneratedPassword(null);
    setIsAccessModalOpen(true);
    setOpenMenuId(null);
  };

  const confirmGrantAccess = async () => {
    if (!selectedUserForAccess) return;
    setActionLoading(true);
    try {
      await toggleUserStatus(selectedUserForAccess.id, 'active');
      const result = await resetUserPassword(selectedUserForAccess.id);

      setGeneratedPassword(result.password || "Senha enviada por e-mail");
    } catch (error: any) {
      alert("Erro ao liberar acesso: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.organizationName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" onClick={() => setOpenMenuId(null)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Acesso Institucional</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie usuários da sede e coordenadores municipais.</p>
        </div>
        <Button variant="secondary" className="flex items-center gap-2" onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4" /> Convidar Usuário
        </Button>
      </div>

      <Card className="p-4 bg-white dark:bg-gray-800">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou unidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
            />
          </div>
          <button className="flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </button>
        </div>
      </Card>

      <Card className="overflow-visible">
        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando usuários...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum usuário encontrado.</div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-medium text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4">Colaborador</th>
                  <th className="px-6 py-4">Função / Perfil</th>
                  <th className="px-6 py-4">Vínculo (Origem)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mr-3 border-2 border-white dark:border-gray-800 shadow-sm">
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
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-gray-500">
                        <Briefcase className="w-4 h-4 mr-2 text-emerald-600" />
                        {user.organizationName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge type={user.status === 'active' ? 'success' : user.status === 'pending' ? 'warning' : 'error'}>
                        {user.status === 'active' ? 'Ativo' : user.status === 'pending' ? 'Pendente' : 'Suspenso'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex items-center justify-end gap-2">
                        {user.status === 'pending' && (
                          <Button
                            variant="secondary"
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
                                <button onClick={() => handleSuspend(user.id)} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 ${(isCoordenacao && user.role !== 'Coordenador Local') ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                  <Ban className="w-4 h-4" /> Suspender Acesso
                                </button>
                              ) : (
                                <button onClick={() => handleReactivate(user.id)} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                                  <CheckCircle className="w-4 h-4" /> Reativar Acesso
                                </button>
                              )}
                              <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                              <button onClick={() => handleDelete(user.id)} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 ${(isCoordenacao && user.role !== 'Coordenador Local') ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
          )}
        </div>
      </Card>

      {/* Modal de Liberação de Acesso */}
      <Modal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        title="Liberar Acesso Institucional"
      >
        <div className="space-y-6 text-center">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            {generatedPassword ? <CheckCircle className="w-10 h-10 text-emerald-600" /> : <Key className="w-10 h-10 text-emerald-600" />}
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {generatedPassword ? 'Acesso Liberado!' : `Conceder acesso a ${selectedUserForAccess?.name}`}
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 px-6">
              {generatedPassword ? (
                <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg text-left">
                  <p className="mb-2">Acesso liberado com sucesso. Informe a senha temporária abaixo:</p>
                  <code className="block bg-white dark:bg-black p-2 rounded border border-gray-200 dark:border-gray-700 text-center text-lg font-mono font-bold">{generatedPassword}</code>
                </div>
              ) : (
                "O colaborador será ativado e uma senha temporária será gerada."
              )}
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            {!generatedPassword ? (
              <>
                <Button variant="outline" onClick={() => setIsAccessModalOpen(false)}>Cancelar</Button>
                <Button
                  variant="secondary"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={confirmGrantAccess}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Processando..." : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Liberar Acesso e Gerar Senha
                    </>
                  )}
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
        title={editingId ? "Editar Colaborador" : "Cadastrar Novo Colaborador"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <User className="w-4 h-4 mr-2 text-emerald-600" /> Dados Pessoais
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome Completo"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                className="md:col-span-2"
              />
              <Input
                label="CPF"
                value={formData.cpf || ''}
                onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
                required
              />
              <Input
                label="Telefone Corporativo"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label="E-mail"
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
                className="md:col-span-2"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-emerald-600" /> Vínculo e Permissões
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Vínculo Organizacional (Origem)"
                value={formData.organizationId || 'matriz'}
                onChange={e => setFormData({ ...formData, organizationId: e.target.value })}
                required
                className="md:col-span-2"
              >
                <option value="matriz">{entity?.name ? `Matriz (${entity.name})` : 'Matriz (Sede Administrativa)'}</option>
                {municipalities.map(m => (
                  <option key={m.id} value={m.id}>Filial: {m.name} ({m.uf})</option>
                ))}
              </Select>

              <Select
                label="Perfil de Acesso"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                required
                className="md:col-span-2"
              >
                <option value="COORDENAÇÃO">Gestão Central (Coordenação)</option>
                <option value="SUBSEDE">Coordenador Local (Subsede)</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="secondary" disabled={actionLoading}>
              {actionLoading ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Cadastrar Colaborador')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;