import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal, Input, Select } from '../../components/ui/Components';
import { Plus, Search, User, Stethoscope, MapPin, Edit2, Trash2, Filter, Building2, ChevronDown, Briefcase, RefreshCw, Key, Mail, CheckCircle, Send, X, Upload, Link, Copy } from 'lucide-react';
import { ImportProfessionalsModal } from './components/ImportProfessionalsModal';
import { Professional, Unit, Municipality, ProfessionalAssignment } from '../../types';
import { CBO_LIST } from '../../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useEntityData } from '../../hooks/useEntityData';
import {
  fetchProfessionalsGrouped,
  createProfessional,
  updateProfessional,
  deleteProfessional,
  toggleAccess as toggleAccessService,
  HierarchicalData
} from '../../services/professionalsService';
import { fetchUnitsByEntity } from '../../services/unitsService';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

const Professionals: React.FC = () => {
  const { claims } = useAuth();
  const isCoordenacao = !!claims?.coordenation;
  const isSubsede = claims?.role === 'SUBSEDE';
  const canEdit = !isCoordenacao && !isSubsede;
  const { entity } = useEntityData(claims?.entityId || '');

  const [hierarchicalData, setHierarchicalData] = useState<HierarchicalData[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProfForAccess, setSelectedProfForAccess] = useState<Professional | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedMunicipalities, setCollapsedMunicipalities] = useState<Record<string, boolean>>({});

  // Feedback de envio de email
  const [emailSent, setEmailSent] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Professional>>({});
  const [formAssignments, setFormAssignments] = useState<ProfessionalAssignment[]>([]);

  // New Assignment State
  const [newAssignment, setNewAssignment] = useState<Partial<ProfessionalAssignment>>({ active: true });
  const [editingAssignmentIndex, setEditingAssignmentIndex] = useState<number | null>(null);

  const loadData = async () => {
    if (!claims?.entityId) return;
    setLoading(true);
    try {
      const [groupedData, unitsData, municipalitiesData] = await Promise.all([
        fetchProfessionalsGrouped(claims.entityId),
        fetchUnitsByEntity(claims.entityId),
        fetchMunicipalitiesByEntity(claims.entityId, claims.municipalityId)
      ]);
      setHierarchicalData(groupedData);
      setUnits(unitsData);
      setMunicipalities(municipalitiesData);
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [claims?.entityId]);

  const toggleMunicipality = (munId: string) => {
    setCollapsedMunicipalities(prev => ({
      ...prev,
      [munId]: !prev[munId]
    }));
  };

  // --- Actions ---

  const toggleStatus = async (prof: Professional) => {
    try {
      handleOpenModal(prof);
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  const handleOpenModal = (professional?: Professional) => {
    if (professional) {
      setEditingId(professional.id);
      setFormData({ ...professional });

      // Normalize assignments
      if (professional.assignments && professional.assignments.length > 0) {
        setFormAssignments(professional.assignments);
      } else if (professional.unitId && professional.municipalityId) {
        // Legacy fallback
        setFormAssignments([{
          unitId: professional.unitId,
          unitName: professional.unitName || '',
          municipalityId: professional.municipalityId,
          municipalityName: professional.municipalityName || '',
          occupation: professional.occupation || '',
          registerClass: professional.registerClass || '',
          active: professional.active ?? true
        }]);
      } else {
        setFormAssignments([]);
      }
    } else {
      setEditingId(null);
      setFormData({
        entityId: claims?.entityId || '',
        entityName: entity?.name || '',
        name: '',
        cns: '',
        email: '',
        cpf: '',
        phone: '',
        accessGranted: false
      });
      setFormAssignments([]);
    }
    setNewAssignment({ active: true });
    setEditingAssignmentIndex(null);
    setIsModalOpen(true);
  };

  const handleOpenAccessModal = (professional: Professional) => {
    setSelectedProfForAccess(professional);
    setEmailSent(false);
    setGeneratedPassword(null);
    setIsAccessModalOpen(true);
  };

  const handleGrantAccess = async (resetPassword = false) => {
    if (!selectedProfForAccess || !claims?.entityId) return;

    setAccessLoading(true);
    try {
      const setClaims = httpsCallable(functions, 'professionalSetClaims');

      const email = selectedProfForAccess.email ? selectedProfForAccess.email.trim() : '';
      if (!email) {
        alert("E-mail inválido.");
        setAccessLoading(false);
        return;
      }

      // Prepare assignments for the cloud function
      const assignments = selectedProfForAccess.assignments || [];
      if (assignments.length === 0 && selectedProfForAccess.unitId) {
        assignments.push({
          unitId: selectedProfForAccess.unitId,
          unitName: selectedProfForAccess.unitName || '',
          municipalityId: selectedProfForAccess.municipalityId || '',
          municipalityName: selectedProfForAccess.municipalityName || '',
          occupation: selectedProfForAccess.occupation || '',
          registerClass: selectedProfForAccess.registerClass || '',
          active: selectedProfForAccess.active ?? true
        });
      }

      const result = await setClaims({
        professionalId: selectedProfForAccess.id,
        email: email,
        entityId: claims.entityId,
        entityName: entity?.name,
        name: selectedProfForAccess.name,
        assignments: assignments,
        resetPassword: resetPassword
      });

      const data = result.data as any;
      if (data.password) {
        setGeneratedPassword(data.password);
      }

      setEmailSent(true);

      setTimeout(() => {
        loadData();
      }, 1000);

    } catch (error) {
      console.error("Erro ao liberar acesso:", error);
      alert("Erro ao liberar acesso. Verifique os logs.");
    } finally {
      setAccessLoading(false);
    }
  };

  const handleEditAssignment = (index: number) => {
    const assignment = formAssignments[index];
    setNewAssignment({ ...assignment });
    setEditingAssignmentIndex(index);
  };

  const handleCancelEdit = () => {
    setNewAssignment({ active: true, unitId: '', occupation: '', registerClass: '' });
    setEditingAssignmentIndex(null);
  };

  const handleAddAssignment = () => {
    if (!newAssignment.unitId || !newAssignment.occupation) {
      alert("Selecione a Unidade e informe a Ocupação.");
      return;
    }

    const unit = units.find(u => u.id === newAssignment.unitId);
    if (!unit) return;

    const municipality = municipalities.find(m => m.id === unit.municipalityId);

    const assignmentToAdd: ProfessionalAssignment = {
      unitId: unit.id,
      unitName: unit.name,
      municipalityId: unit.municipalityId,
      municipalityName: municipality?.name || 'Desconhecido',
      occupation: newAssignment.occupation || '',
      registerClass: newAssignment.registerClass || '',
      active: newAssignment.active ?? true
    };

    if (editingAssignmentIndex !== null) {
      const updated = [...formAssignments];
      updated[editingAssignmentIndex] = assignmentToAdd;
      setFormAssignments(updated);
      setEditingAssignmentIndex(null);
    } else {
      setFormAssignments([...formAssignments, assignmentToAdd]);
    }

    setNewAssignment({ active: true, unitId: '', occupation: '', registerClass: '' });
  };

  const handleRemoveAssignment = (index: number) => {
    const updated = [...formAssignments];
    updated.splice(index, 1);
    setFormAssignments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formAssignments.length === 0) {
      alert("Adicione pelo menos um vínculo (unidade).");
      return;
    }

    // Use the first assignment for legacy fields
    const primaryAssignment = formAssignments[0];

    const dataToSave = {
      ...formData,
      assignments: formAssignments,
      // Legacy fields
      unitId: primaryAssignment.unitId,
      unitName: primaryAssignment.unitName,
      municipalityId: primaryAssignment.municipalityId,
      municipalityName: primaryAssignment.municipalityName,
      occupation: primaryAssignment.occupation,
      registerClass: primaryAssignment.registerClass,
      active: primaryAssignment.active,
      // Pass Entity Type for Context Storage
      entityType: entity?.type || 'private'
    } as Professional;

    try {
      if (editingId) {
        await updateProfessional(editingId, dataToSave);
      } else {
        await createProfessional(dataToSave);
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar profissional.");
    }
  };

  const handleDelete = async (id: string, unitId: string) => {
    if (confirm('Deseja remover este profissional do cadastro?')) {
      try {
        if (claims?.entityId) {
          await deleteProfessional(id, unitId, claims.entityId);
          loadData();
        }
      } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir.");
      }
    }
  };

  // Filtragem local
  const filteredData = hierarchicalData.map(group => {
    const filteredUnits = group.units.map(unit => {
      const filteredProfs = unit.professionals.filter(p =>
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cns.includes(searchTerm) ||
        // Check assignments for occupation match
        (p.assignments || []).some(a => a.occupation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.occupation?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return { ...unit, professionals: filteredProfs };
    }).filter(u => u.professionals.length > 0);

    return { ...group, units: filteredUnits };
  }).filter(g => g.units.length > 0);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando corpo clínico...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Corpo Clínico</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestão de profissionais organizada por Município e Unidade de Saúde.
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setIsLinkModalOpen(true)}
            >
              <Link className="w-4 h-4" /> Link Cadastro
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="w-4 h-4" /> Importar
            </Button>
            <Button
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => handleOpenModal()}
            >
              <Plus className="w-4 h-4" /> Novo Profissional
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <Card className="p-4 bg-white dark:bg-gray-800 sticky top-0 z-20 shadow-sm border-b border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por Nome, CNS ou Cargo..."
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

      {/* Lista Hierárquica */}
      <div className="space-y-8">
        {filteredData.map((munGroup) => {
          const isCollapsed = collapsedMunicipalities[munGroup.municipalityId];

          return (
            <div key={munGroup.municipalityId} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">

              {/* Nível 1: Cabeçalho do Município */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800/70 transition-colors border-b border-gray-200 dark:border-gray-700"
                onClick={() => toggleMunicipality(munGroup.municipalityId)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-sm">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{munGroup.municipalityName}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {munGroup.units.length} unidades vinculadas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge type="neutral" className="hidden md:inline-flex">
                    {munGroup.units.reduce((acc, u) => acc + u.professionals.length, 0)} Profissionais
                  </Badge>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 transform rotate-180 transition-transform" />}
                  </button>
                </div>
              </div>

              {/* Conteúdo do Município */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="p-6 space-y-8 bg-white dark:bg-gray-800">

                      {/* Nível 2: Iterar sobre as Unidades */}
                      {munGroup.units.map((unit) => (
                        <div key={unit.unitId} className="relative">
                          {/* Cabeçalho da Unidade */}
                          <div className="flex items-center gap-2 mb-4">
                            <Building2 className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">
                              {unit.unitName}
                            </h3>
                            <span className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                              CNES: {unit.cnes}
                            </span>
                          </div>

                          {/* Nível 3: Lista Horizontal de Profissionais */}
                          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent -mx-2 px-2 min-h-[220px]">

                            {/* Botão "Adicionar Nesta Unidade" */}
                            {canEdit && (
                              <div className="min-w-[200px] w-[200px] flex-shrink-0">
                                <button
                                  onClick={() => {
                                    handleOpenModal();
                                    setNewAssignment(prev => ({ ...prev, unitId: unit.unitId }));
                                  }}
                                  className="w-full h-full min-h-[180px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all"
                                >
                                  <div className="p-3 rounded-full bg-gray-50 dark:bg-gray-700 mb-3 group-hover:bg-white shadow-sm">
                                    <Plus className="w-6 h-6" />
                                  </div>
                                  <span className="text-sm font-medium">Adicionar aqui</span>
                                </button>
                              </div>
                            )}

                            {/* Cards dos Profissionais */}
                            {unit.professionals.map((prof) => {
                              // Find assignment for this unit to display correct occupation/status
                              const assignment = (prof.assignments || []).find(a => a.unitId === unit.unitId) || {
                                occupation: prof.occupation,
                                active: prof.active
                              };

                              return (
                                <div key={prof.id} className="min-w-[260px] w-[260px] flex-shrink-0">
                                  <Card className="h-full hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 flex flex-col relative group bg-gray-50/50 dark:bg-gray-800/50">
                                    {/* Status Badge */}
                                    <div className="absolute top-3 right-3 z-10">
                                      <Badge type={assignment.active ? 'success' : 'neutral'} className="text-[10px]">
                                        {assignment.active ? 'Ativo' : 'Inativo'}
                                      </Badge>
                                    </div>

                                    <div className="p-5 flex flex-col h-full items-center text-center">
                                      <div className="h-14 w-14 rounded-full bg-white dark:bg-gray-700 text-emerald-600 flex items-center justify-center text-xl font-bold mb-3 border border-emerald-100 dark:border-emerald-900 shadow-sm relative">
                                        {prof.name.charAt(0)}
                                        {prof.accessGranted && (
                                          <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white dark:border-gray-800" title="Acesso ao Painel Liberado">
                                            <Key className="w-3 h-3" />
                                          </div>
                                        )}
                                      </div>

                                      <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1 w-full" title={prof.name}>
                                        {prof.name}
                                      </h3>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-mono bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                        CPF: {prof.cpf}
                                      </span>

                                      <div className="w-full pt-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
                                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-2 flex items-center justify-center gap-1">
                                          <Stethoscope className="w-3 h-3" /> {assignment.occupation}
                                        </p>

                                        {/* Botões de Ação */}
                                        <div className="flex justify-center gap-2 mt-2">
                                          {canEdit && (
                                            <button
                                              onClick={() => handleOpenAccessModal(prof)}
                                              className={`p-1.5 rounded-lg transition-colors shadow-sm ${prof.accessGranted ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-700'}`}
                                              title={prof.accessGranted ? "Acesso já liberado" : "Liberar Acesso ao Painel"}
                                            >
                                              <Key className="w-4 h-4" />
                                            </button>
                                          )}
                                          {canEdit && (
                                            <button
                                              onClick={() => handleOpenModal(prof)}
                                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm"
                                              title="Editar"
                                            >
                                              <Edit2 className="w-4 h-4" />
                                            </button>
                                          )}
                                          {canEdit && (
                                            <button
                                              onClick={() => handleDelete(prof.id, unit.unitId)}
                                              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm"
                                              title="Excluir"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </Card>
                                </div>
                              );
                            })}
                          </div>
                          {/* Divisor entre unidades (exceto na última) */}
                          {unit !== munGroup.units[munGroup.units.length - 1] && (
                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-6" />
                          )}
                        </div>
                      ))}

                      {munGroup.units.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 italic">
                          Nenhuma unidade com profissionais cadastrados neste município.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filteredData.length === 0 && (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum resultado encontrado</h3>
            <p className="text-gray-500 dark:text-gray-400">Tente ajustar os filtros ou cadastre um novo profissional.</p>
          </div>
        )}
      </div>

      {/* Modal de Links de Cadastro */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Links de Auto-Cadastro Público"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 flex gap-2">
              <Link className="w-5 h-5 flex-shrink-0" />
              Compartilhe estes links com os profissionais para que eles possam realizar o próprio cadastro no sistema.
            </p>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {municipalities.map(mun => {
              const link = `${window.location.origin}${window.location.pathname}#/portal-cadastro/profissionais/${claims?.entityId}/${mun.id}`;

              return (
                <div key={mun.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="font-bold text-sm text-gray-900 dark:text-white mb-2">{mun.name}</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={link}
                      className="flex-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-600 dark:text-gray-300 select-all"
                    />
                    <Button
                      variant="secondary"
                      className="p-1 px-3 h-8 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(link);
                        alert("Link copiado!");
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copiar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setIsLinkModalOpen(false)}>Fechar</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        title="Liberação de Acesso ao ProBPA"
      >
        <div className="space-y-6 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            {emailSent ? <CheckCircle className="w-10 h-10 text-blue-600" /> : <Key className="w-10 h-10 text-blue-600" />}
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {emailSent
                ? (generatedPassword ? 'Senha Gerada com Sucesso!' : 'Acesso Liberado com Sucesso!')
                : (selectedProfForAccess?.accessGranted ? `Redefinir Senha de ${selectedProfForAccess?.name}` : `Conceder acesso a ${selectedProfForAccess?.name}`)}
            </h3>

            {emailSent && generatedPassword && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200 mb-2 font-medium">
                  Usuário criado com sucesso! Copie a senha abaixo:
                </p>
                <div className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 p-3 rounded border border-green-100 dark:border-green-900">
                  <code className="text-lg font-mono font-bold text-gray-800 dark:text-white select-all">
                    {generatedPassword}
                  </code>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Esta senha é temporária e também foi enviada para o e-mail do profissional.
                </p>
              </div>
            )}

            {emailSent && !generatedPassword && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 px-6">
                O acesso foi liberado para o usuário existente.
              </p>
            )}

            {!emailSent && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 px-6">
                O profissional receberá as credenciais de acesso ao Painel de Produção no e-mail cadastrado (se o envio estiver configurado).
              </p>
            )}
          </div>

          {!emailSent && (
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg text-left border border-gray-100 dark:border-gray-600 max-w-md mx-auto">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail de Destino</label>
              <div className="flex items-center text-gray-900 dark:text-white font-medium">
                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                {selectedProfForAccess?.email || (
                  <span className="text-red-500 text-sm italic">E-mail não cadastrado. Edite o profissional.</span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            {!emailSent ? (
              <>
                <Button variant="outline" onClick={() => setIsAccessModalOpen(false)}>Cancelar</Button>

                {selectedProfForAccess?.accessGranted ? (
                  <Button
                    variant="primary"
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    onClick={() => handleGrantAccess(true)}
                    disabled={!selectedProfForAccess?.email || accessLoading}
                  >
                    {accessLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
                    Redefinir Senha e Reenviar
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleGrantAccess(true)}
                    disabled={!selectedProfForAccess?.email || accessLoading}
                  >
                    {accessLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Liberar Acesso e Enviar Senha
                  </Button>
                )}
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsAccessModalOpen(false)}>Fechar</Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de Cadastro Principal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Profissional" : "Cadastrar Novo Profissional"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Seção 1: Identificação Pessoal */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <User className="w-4 h-4 mr-2 text-emerald-600" /> Identificação
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome Completo"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="md:col-span-2"
                required
              />
              <Input
                label="CPF"
                value={formData.cpf || ''}
                onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
              <Input
                label="CNS (Cartão Nacional de Saúde)"
                value={formData.cns || ''}
                onChange={e => setFormData({ ...formData, cns: e.target.value })}
                placeholder="700000000000000"
              />
            </div>
          </div>

          {/* Seção 2: Contato e Acesso */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <Mail className="w-4 h-4 mr-2 text-emerald-600" /> Contato e Acesso
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="E-mail Profissional"
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                className="md:col-span-2"
              />
              <Input
                label="Telefone Celular"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Seção 3: Vínculos (Lotações) */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <Briefcase className="w-4 h-4 mr-2 text-emerald-600" /> Vínculos e Lotações
            </h4>
            <div className="space-y-3 mb-4">
              {formAssignments.map((assignment, index) => (
                <div key={index} className={`flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border shadow-sm ${editingAssignmentIndex === index ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200 dark:border-gray-600'}`}>
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{assignment.unitName}</p>
                    <p className="text-xs text-gray-500">{assignment.occupation} • {assignment.municipalityName}</p>
                    {assignment.registerClass && <p className="text-xs text-gray-400">Reg: {assignment.registerClass}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge type={assignment.active ? 'success' : 'neutral'} className="text-[10px]">
                      {assignment.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => handleEditAssignment(index)}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Editar Vínculo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignment(index)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remover Vínculo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {formAssignments.length === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-2">Nenhum vínculo adicionado.</p>
              )}
            </div>

            {/* Adicionar Novo Vínculo */}
            <div className={`bg-white dark:bg-gray-800 p-3 rounded-lg border border-dashed ${editingAssignmentIndex !== null ? 'border-emerald-500 bg-emerald-50/10' : 'border-gray-300 dark:border-gray-600'}`}>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase">{editingAssignmentIndex !== null ? 'Editando Vínculo' : 'Adicionar Novo Vínculo'}</p>
                {editingAssignmentIndex !== null && (
                  <button type="button" onClick={handleCancelEdit} className="text-xs text-red-500 hover:underline">Cancelar Edição</button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select
                  label="Município"
                  value={newAssignment.municipalityId || ''}
                  onChange={e => setNewAssignment({ ...newAssignment, municipalityId: e.target.value, unitId: '' })}
                  className="md:col-span-2"
                >
                  <option value="">Selecione o Município...</option>
                  {municipalities.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </Select>

                <Select
                  label="Unidade de Saúde"
                  value={newAssignment.unitId || ''}
                  onChange={e => setNewAssignment({ ...newAssignment, unitId: e.target.value })}
                  className="md:col-span-2"
                  disabled={!newAssignment.municipalityId}
                >
                  <option value="">{newAssignment.municipalityId ? 'Selecione a Unidade...' : 'Selecione um município primeiro'}</option>
                  {units
                    .filter(u => !newAssignment.municipalityId || u.municipalityId === newAssignment.municipalityId)
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.name} (CNES: {u.cnes})</option>
                    ))}
                </Select>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ocupação (CBO)
                  </label>
                  <input
                    list="cbo-list-options"
                    value={newAssignment.occupation || ''}
                    onChange={e => setNewAssignment({ ...newAssignment, occupation: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                    placeholder="Digite para buscar..."
                  />
                  <datalist id="cbo-list-options">
                    {CBO_LIST.map((group) => (
                      group.options.map(opt => (
                        <option key={opt.value} value={opt.label} />
                      ))
                    ))}
                  </datalist>
                </div>
                <Input
                  label="Registro de Classe"
                  value={newAssignment.registerClass || ''}
                  onChange={e => setNewAssignment({ ...newAssignment, registerClass: e.target.value })}
                  placeholder="Ex: CRM 12345/SP"
                />

                <div className="md:col-span-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant={editingAssignmentIndex !== null ? 'primary' : 'secondary'}
                    onClick={handleAddAssignment}
                    disabled={!newAssignment.unitId || !newAssignment.occupation}
                  >
                    {editingAssignmentIndex !== null ? <RefreshCw className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                    {editingAssignmentIndex !== null ? 'Atualizar Vínculo' : 'Adicionar Vínculo'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="secondary">{editingId ? 'Salvar Alterações' : 'Cadastrar Profissional'}</Button>
          </div>
        </form >
      </Modal >
      <ImportProfessionalsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        units={units}
        municipalities={municipalities}
        entityId={claims?.entityId || ''}
        entityName={entity?.name || ''}
        onSuccess={loadData}
      />
    </div >
  );
};

export default Professionals;