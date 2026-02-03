import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Modal, Input, Select } from '../../components/ui/Components';
import { Plus, Search, Filter, Building2, MapPin, MoreHorizontal, ChevronDown, Layers, User, Copy, Trash2, RefreshCw, History, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useEntityData } from '../../hooks/useEntityData';
import { Municipality, Unit, UnitInput } from '../../types';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { fetchUnitsByEntity, createUnit, updateUnit, deleteUnit } from '../../services/unitsService';
import { patientsService, Patient, PatientHistoryItem } from '../../services/patientsService';

type GroupedUnits = Record<string, {
  name: string;
  units: Unit[];
}>;

const Units: React.FC = () => {
  const { claims } = useAuth();
  const isCoordenacao = !!claims?.coordenation;
  const isSubsede = claims?.role === 'SUBSEDE';
  const canEdit = !isCoordenacao && !isSubsede;
  const { entity } = useEntityData(claims?.entityId || '');

  const [units, setUnits] = useState<Unit[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<UnitInput>>({});
  const [originalMunicipalityId, setOriginalMunicipalityId] = useState<string | undefined>(undefined);

  // Patient History State
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedUnitForPatient, setSelectedUnitForPatient] = useState<Unit | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<PatientHistoryItem[]>([]);
  const [selectedPatientName, setSelectedPatientName] = useState('');

  // Dropdown Menu State
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadData = async () => {
    if (!claims?.entityId) return;
    setLoading(true);
    try {
      const [munis, unitsData] = await Promise.all([
        fetchMunicipalitiesByEntity(claims.entityId, claims.municipalityId),
        fetchUnitsByEntity(claims.entityId)
      ]);
      setMunicipalities(munis);
      setUnits(unitsData);
    } catch (error) {
      console.error("Error loading units or municipalities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (claims?.entityId) {
      loadData();
    }
  }, [claims?.entityId]);

  const toggleSection = (munId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [munId]: !prev[munId]
    }));
  };

  // Actions
  const toggleStatus = async (unit: Unit) => {
    try {
      await updateUnit(unit.id, { active: !unit.active });
      setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, active: !u.active } : u));
    } catch (error) {
      console.error("Error toggling status:", error);
      alert("Erro ao alterar status da unidade.");
    }
  };

  const handleDelete = async (id: string, municipalityId: string) => {
    if (confirm('Tem certeza que deseja excluir esta unidade?')) {
      try {
        await deleteUnit(id, municipalityId);
        setUnits(prev => prev.filter(u => u.id !== id));
        setOpenMenuId(null);
      } catch (error) {
        console.error("Error deleting unit:", error);
        alert("Erro ao excluir unidade.");
      }
    }
  };

  const handleDuplicate = async (unit: Unit) => {
    try {
      const newUnitData: UnitInput = {
        entityId: unit.entityId,
        entityName: unit.entityName,
        cnes: `${unit.cnes.slice(0, 6)}X`, // Exemplo de alteração para evitar duplicidade exata de CNES se houver validação
        name: `${unit.name} (Cópia)`,
        municipalityId: unit.municipalityId,
        active: unit.active,
        type: unit.type,
        address: unit.address,
        neighborhood: unit.neighborhood,
        directorName: unit.directorName,
        phone: unit.phone,
        email: unit.email
      };

      const newId = await createUnit(newUnitData);
      setUnits(prev => [...prev, { ...newUnitData, id: newId } as Unit]);
      setOpenMenuId(null);
    } catch (error) {
      console.error("Error duplicating unit:", error);
      alert("Erro ao duplicar unidade.");
    }
  };

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  // Form Handlers
  const handleOpenModal = (unit?: Unit) => {
    if (unit) {
      setEditingId(unit.id);
      setOriginalMunicipalityId(unit.municipalityId);
      setFormData({
        entityId: unit.entityId,
        entityName: unit.entityName,
        cnes: unit.cnes,
        name: unit.name,
        municipalityId: unit.municipalityId,
        type: unit.type,
        address: unit.address,
        neighborhood: unit.neighborhood,
        directorName: unit.directorName,
        phone: unit.phone,
        email: unit.email,
        active: unit.active
      });
    } else {
      setEditingId(null);
      setOriginalMunicipalityId(undefined);
      setFormData({
        entityId: claims?.entityId || '',
        entityName: entity?.name || '',
        cnes: '',
        name: '',
        municipalityId: municipalities[0]?.id || '',
        type: 'UBS',
        address: '',
        neighborhood: '',
        directorName: '',
        phone: '',
        email: '',
        active: true
      });
    }
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const handleOpenPatients = (unit: Unit) => {
    setSelectedUnitForPatient(unit);
    setPatientSearchTerm('');
    setPatientResults([]);
    setIsPatientModalOpen(true);
  };

  const handleSearchPatients = async () => {
    if (patientSearchTerm.length < 3) return;
    const results = await patientsService.searchPatients(patientSearchTerm);
    setPatientResults(results);
  };

  const handleViewHistory = async (patient: Patient) => {
    setSelectedPatientName(patient.name);
    const history = await patientsService.getPatientHistory(patient.id);
    setSelectedPatientHistory(history);
    setIsHistoryModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateUnit(editingId, formData, originalMunicipalityId);
        setUnits(prev => prev.map(u => u.id === editingId ? { ...u, ...formData, id: editingId } as Unit : u));
      } else {
        const newId = await createUnit(formData as UnitInput);
        setUnits(prev => [...prev, { ...formData, id: newId } as Unit]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving unit:", error);
      alert("Erro ao salvar unidade.");
    }
  };

  // Group units by Municipality
  const municipalityMap = municipalities.reduce((acc, mun) => {
    acc[mun.id] = mun.name;
    return acc;
  }, {} as Record<string, string>);

  const getMunName = (id: string) => municipalityMap[id] || 'Município Desconhecido';

  const groupedUnits = units.reduce<GroupedUnits>((acc, unit) => {
    if (searchTerm && !unit.name.toLowerCase().includes(searchTerm.toLowerCase()) && !unit.cnes.includes(searchTerm)) {
      return acc;
    }
    const munId = unit.municipalityId;
    if (!acc[munId]) {
      acc[munId] = { name: getMunName(munId), units: [] };
    }
    acc[munId].units.push(unit);
    return acc;
  }, {});

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando unidades...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rede de Unidades</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gerencie as unidades de todos os municípios vinculados.
          </p>
        </div>
        {canEdit && (
          <Button variant="secondary" className="flex items-center gap-2" onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" /> Nova Unidade
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white dark:bg-gray-800 sticky top-0 z-20 shadow-sm border-b border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por CNES ou Nome da Unidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button className="flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            <Filter className="w-4 h-4 mr-2" /> Filtros Avançados
          </button>
        </div>
      </Card>

      {/* Municipality Sections */}
      <div className="space-y-8">
        {Object.keys(groupedUnits).map((munId) => {
          const { name, units } = groupedUnits[munId];
          const isCollapsed = collapsedSections[munId];

          return (
            <div key={munId} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              {/* Section Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => toggleSection(munId)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                    <Layers className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {units.length} {units.length === 1 ? 'unidade vinculada' : 'unidades vinculadas'}
                    </p>
                  </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 transform rotate-180 transition-transform" />}
                </button>
              </div>

              {/* Section Content */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent -mx-2 px-2 min-h-[280px]">

                        {/* Add New Card Placeholder */}
                        {canEdit && (
                          <div className="min-w-[260px] w-[260px] flex-shrink-0">
                            <button
                              onClick={() => handleOpenModal()}
                              className="w-full h-full min-h-[200px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all"
                            >
                              <div className="p-3 rounded-full bg-gray-50 dark:bg-gray-800 mb-3 group-hover:bg-white shadow-sm">
                                <Plus className="w-6 h-6" />
                              </div>
                              <span className="text-sm font-medium">Nova Unidade em<br />{name.split(' ')[0]}</span>
                            </button>
                          </div>
                        )}

                        {/* Unit Cards */}
                        {units.map((unit) => (
                          <div key={unit.id} className="min-w-[280px] w-[280px] flex-shrink-0">
                            <Card className="h-full hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                              <div className={`absolute top-0 left-0 right-0 h-1 ${unit.active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />

                              <div className="p-5 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                  <div className={`p-2.5 rounded-xl ${unit.active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                    <Building2 className="w-5 h-5" />
                                  </div>

                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (canEdit) toggleStatus(unit); }}
                                    className={`group/status flex items-center gap-1 focus:outline-none ${!canEdit ? 'cursor-default' : ''}`}
                                    title={canEdit ? (unit.active ? "Desativar Unidade" : "Ativar Unidade") : ''}
                                  >
                                    <Badge type={unit.active ? 'success' : 'neutral'} className="text-[10px] cursor-pointer transition-transform group-hover/status:scale-105">
                                      {unit.active ? 'Ativa' : 'Inativa'}
                                    </Badge>
                                    {canEdit && <RefreshCw className="w-3 h-3 text-gray-400 opacity-0 group-hover/status:opacity-100 transition-opacity" />}
                                  </button>
                                </div>

                                <div className="mb-auto">
                                  <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1" title={unit.name}>
                                    {unit.name}
                                  </h3>
                                  <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {name}
                                  </div>
                                  {unit.type && (
                                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium uppercase">
                                      {unit.type}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-6 space-y-3 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-400 font-medium uppercase">CNES</span>
                                    <span className="text-sm font-mono font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded">
                                      {unit.cnes}
                                    </span>
                                  </div>

                                  <div className="flex gap-2 relative">
                                    {canEdit && (
                                      <button
                                        onClick={() => handleOpenModal(unit)}
                                        className="flex-1 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                      >
                                        Editar
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleOpenPatients(unit)}
                                      className="flex-1 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center justify-center gap-1"
                                    >
                                      <User className="w-3 h-3" /> Pacientes
                                    </button>

                                    <div className="relative">
                                      {/* Menu Actions - Only for authorized (NOT Coordenacao/Subsede) */}
                                      {canEdit && (
                                        <>
                                          <button
                                            onClick={(e) => toggleMenu(unit.id, e)}
                                            className={`p-1.5 rounded-lg transition-colors ${openMenuId === unit.id ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                          >
                                            <MoreHorizontal className="w-4 h-4" />
                                          </button>

                                          {openMenuId === unit.id && (
                                            <>
                                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                              <div className="absolute right-0 bottom-full mb-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-20 overflow-hidden py-1">
                                                <button
                                                  onClick={() => handleDuplicate(unit)}
                                                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                >
                                                  <Copy className="w-3 h-3" /> Duplicar
                                                </button>
                                                <button
                                                  onClick={() => handleDelete(unit.id, unit.municipalityId)}
                                                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                  <Trash2 className="w-3 h-3" /> Excluir
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {Object.keys(groupedUnits).length === 0 && (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhuma unidade encontrada</h3>
            <p className="text-gray-500 dark:text-gray-400">Tente ajustar os filtros ou adicione uma nova unidade.</p>
          </div>
        )}
      </div>

      {/* Modal de Cadastro de Unidade */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Unidade de Saúde" : "Cadastrar Nova Unidade"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção 1: Dados Cadastrais */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-emerald-600" /> Dados Cadastrais
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Estabelecimento"
                placeholder="Ex: UBS Central Dr. Fulano"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="CNES"
                  placeholder="0000000"
                  value={formData.cnes || ''}
                  onChange={e => setFormData({ ...formData, cnes: e.target.value })}
                  required
                />
                <Select
                  label="Tipo de Unidade"
                  value={formData.type || 'UBS'}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="UBS">UBS / ESF</option>
                  <option value="NASF">e-Multi (NASF)</option>
                  <option value="Academia">Academia da Saúde</option>
                  <option value="Rua">Consultório na Rua</option>
                  <option value="Movel">Unidade Móvel</option>
                  <option value="Hospital">Hospital Geral</option>
                  <option value="UPA">UPA 24h</option>
                  <option value="CAPS">CAPS</option>
                  <option value="Policlínica">Policlínica</option>
                  <option value="CEO">Centro Odontológico</option>
                  <option value="Centro">Centro</option>
                  <option value="Outros">Outros</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção 2: Localização e Vínculo */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-emerald-600" /> Localização e Vínculo
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Município Vinculado"
                value={formData.municipalityId || ''}
                onChange={e => setFormData({ ...formData, municipalityId: e.target.value })}
                className="md:col-span-2"
              >
                {municipalities.map(m => (
                  <option key={m.id} value={m.id}>{m.name} - {m.uf}</option>
                ))}
              </Select>
              <Input
                label="Endereço Completo"
                placeholder="Rua, Número, Complemento"
                value={formData.address || ''}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
              <Input
                label="Bairro"
                value={formData.neighborhood || ''}
                onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
              />
            </div>
          </div>

          {/* Seção 3: Gestão e Contato */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <User className="w-4 h-4 mr-2 text-emerald-600" /> Gestão e Contato
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Diretor/Responsável"
                value={formData.directorName || ''}
                onChange={e => setFormData({ ...formData, directorName: e.target.value })}
              />
              <Input
                label="Telefone da Unidade"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />

              <div className="md:col-span-2 flex items-end">
                <label className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-600 hover:border-gray-200 dark:hover:border-gray-500 cursor-pointer transition-colors w-full border border-transparent">
                  <input
                    type="checkbox"
                    checked={formData.active || false}
                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Unidade Ativa (Recebe produção)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="secondary">{editingId ? 'Salvar Alterações' : 'Cadastrar Unidade'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Busca de Pacientes */}
      <Modal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        title={`Pacientes - ${selectedUnitForPatient?.name || 'Unidade'}`}
      >
        <div className="space-y-6">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por Nome, CNS ou CPF..."
              value={patientSearchTerm}
              onChange={e => setPatientSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearchPatients} disabled={patientSearchTerm.length < 3}>
              <Search className="w-4 h-4" />
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {patientResults.map(p => (
              <div key={p.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white">{p.name}</div>
                  <div className="text-xs text-gray-500 font-mono">CNS: {p.cns} {p.cpf ? `| CPF: ${p.cpf}` : ''}</div>
                </div>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => handleViewHistory(p)}>
                  <History className="w-3 h-3 mr-1" /> Histórico
                </Button>
              </div>
            ))}
            {patientResults.length === 0 && patientSearchTerm.length >= 3 && (
              <p className="text-center text-sm text-gray-500 py-4">Nenhum paciente encontrado.</p>
            )}
            {patientResults.length === 0 && patientSearchTerm.length < 3 && (
              <p className="text-center text-sm text-gray-500 py-4">Digite ao menos 3 caracteres para buscar.</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de Histórico do Paciente */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Histórico de Atendimentos - ${selectedPatientName}`}
      >
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {selectedPatientHistory.map((item) => (
            <div key={item.id} className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-700 pb-6 last:pb-0">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-800"></div>
              <div className="text-xs text-gray-400 font-mono mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {item.date.split('-').reverse().join('/')}
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">{item.procedureName}</h4>
                <p className="text-xs text-emerald-600 font-mono mt-0.5">{item.procedureCode}</p>

                <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                  <p><span className="font-semibold">Profissional:</span> {item.professionalName} ({item.cbo})</p>
                  <p><span className="font-semibold">Unidade:</span> {item.unitName}</p>
                </div>
              </div>
            </div>
          ))}
          {selectedPatientHistory.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-4">Nenhum atendimento registrado para este paciente.</p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Units;