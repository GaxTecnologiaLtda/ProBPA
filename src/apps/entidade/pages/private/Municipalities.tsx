import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Modal, Input, Select } from '../../components/ui/Components';
import { MOCK_UNITS, MOCK_PROFESSIONALS, BRAZILIAN_STATES } from '../../constants'; // Keep stats mocks for now
import { Municipality, MunicipalityInput, LicenseStatus } from '../../types';
import { Users, Edit2, Trash2, MapPin, Phone, Plus, Building2, Stethoscope, RefreshCw, Activity, Crown, Briefcase, Eye, AlertTriangle, ShieldCheck, Search, LayoutTemplate } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEntityData } from '../../hooks/useEntityData';
import { fetchMunicipalitiesByEntity, createMunicipality, updateMunicipality, deleteMunicipality } from '../../services/municipalitiesService';
import { fetchUnitsByEntity } from '../../services/unitsService';
import { fetchProfessionalsByEntity } from '../../services/professionalsService';
import { goalService } from '../../services/goalService';
import { connectorService } from '../../services/connectorService';
import { statsCache } from '../../services/statsCache';
import { Unit, Professional } from '../../types';

const Municipalities: React.FC = () => {
  const { user, claims, logout } = useAuth();
  const isCoordenacao = !!claims?.coordenation;
  const { entity, loading: loadingEntity } = useEntityData(claims?.entityId || '');

  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [productionStats, setProductionStats] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true); // Structure loading
  const [loadingStats, setLoadingStats] = useState(false); // Stats loading (background)

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMunicipalities = municipalities.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.codeIbge.includes(searchTerm)
  );

  // Form State
  const [formData, setFormData] = useState<Partial<MunicipalityInput>>({});

  // Security Check
  useEffect(() => {
    // Access control is handled by Layout/AuthContext
  }, [claims]);

  // 1. Load Structure (Blocking - Fast)
  const loadStructure = async () => {
    if (!claims?.entityId) return;
    setLoading(true);
    try {
      const [municipalitiesData, unitsData, professionalsData] = await Promise.all([
        fetchMunicipalitiesByEntity(claims.entityId),
        fetchUnitsByEntity(claims.entityId),
        fetchProfessionalsByEntity(claims.entityId)
      ]);
      setMunicipalities(municipalitiesData);
      setUnits(unitsData);
      setProfessionals(professionalsData);
    } catch (error) {
      console.error("Error loading municipalities structure:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Load Production (Non-Blocking - Heavy)
  const loadProduction = async () => {
    if (!claims?.entityId || municipalities.length === 0) return;

    const currentYear = new Date().getFullYear().toString();

    setLoadingStats(true);
    try {
      const [manualProduction, connectorProduction] = await Promise.all([
        statsCache.getOrFetch(claims.entityId, currentYear, async () => {
          return await goalService.getEntityProductionStats(
            claims.entityId,
            currentYear,
            undefined,
            municipalities,
            professionals
          );
        }),
        connectorService.fetchAggregateConnectorData(
          claims.entityId,
          currentYear,
          municipalities,
          professionals
        )
      ]);

      const manualFiltered = (manualProduction || []).filter((r: any) => r.source !== 'connector');
      const allProduction = [...manualFiltered, ...connectorProduction];

      processAndSetStats(allProduction);

    } catch (error) {
      console.error("Error loading production stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const processAndSetStats = (rawProduction: any[]) => {
    const statsByMun: Record<string, number> = {};
    rawProduction.forEach(record => {
      if (record.municipalityId) {
        const qty = record.quantity || 1;
        statsByMun[record.municipalityId] = (statsByMun[record.municipalityId] || 0) + qty;
      }
    });
    setProductionStats(statsByMun);
  };

  // Initial Load (Structure)
  useEffect(() => {
    loadStructure();
  }, [claims?.entityId]);

  // Secondary Load (Production) - Depends on Structure
  useEffect(() => {
    if (!loading && municipalities.length > 0) {
      loadProduction();
    }
  }, [loading, municipalities]); // Triggered after structure loads

  const handleOpenModal = (municipality?: Municipality, viewMode: boolean = false) => {
    setIsViewMode(viewMode);
    if (municipality) {
      setEditingId(municipality.id);
      setFormData({
        ...municipality,
        // Ensure fields are mapped correctly if needed
      });
    } else {
      setEditingId(null);
      // Preenchimento automático com dados da Entidade Logada
      setFormData({
        name: '',
        state: 'SP', // Default
        uf: 'SP',
        codeIbge: '',

        // Dados Contratuais Automáticos
        managerEntityType: (entity?.entityKind as any) || 'Prefeitura',
        responsibleEntity: entity?.name || '',
        cnpj: entity?.cnpj || '',
        linkedEntityId: claims?.entityId || '',
        linkedEntityName: entity?.name || '',

        secretaryName: '',
        mayorName: '',
        email: '',
        phone: '',
        address: '',
        population: 0,
        active: true,
        status: LicenseStatus.ACTIVE,
        interfaceType: 'PEC'
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este vínculo?')) {
      try {
        // We know the entityId from claims
        await deleteMunicipality(id, { linkedEntityId: claims?.entityId || '' });
        setMunicipalities(prev => prev.filter(m => m.id !== id));
      } catch (error) {
        alert("Erro ao excluir: " + error);
      }
    }
  };

  const toggleStatus = async (id: string) => {
    const muni = municipalities.find(m => m.id === id);
    if (!muni) return;

    const newStatus = !muni.active;

    if (!newStatus) {
      alert("Suspender o município não diminui automaticamente o valor da licença. Para alterações no valor da licença, exclua o município da sua base ou entre em contato com o suporte.");
    }

    try {
      await updateMunicipality(id, { active: newStatus }, { linkedEntityId: claims?.entityId || '' });
      setMunicipalities(prev => prev.map(m =>
        m.id === id ? { ...m, active: newStatus, status: newStatus ? LicenseStatus.ACTIVE : LicenseStatus.SUSPENDED } : m
      ));
    } catch (error) {
      alert("Erro ao atualizar status: " + error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    if (!claims?.entityId) {
      alert("Erro de autenticação: Entity ID não encontrado.");
      return;
    }

    const dataToSave: MunicipalityInput = {
      ...formData as MunicipalityInput,
      linkedEntityId: claims.entityId, // Enforce linkage
      linkedEntityName: entity?.name || formData.linkedEntityName || '',
      uf: formData.state || formData.uf || 'SP', // Sync
      state: formData.uf || formData.state || 'SP', // Sync

      active: formData.active !== undefined ? formData.active : true,
      status: formData.active ? LicenseStatus.ACTIVE : LicenseStatus.SUSPENDED,
      interfaceType: formData.interfaceType || 'PEC'
    };

    try {
      if (editingId) {
        await updateMunicipality(editingId, dataToSave, {
          linkedEntityId: claims.entityId
        });
        setMunicipalities(prev => prev.map(m => m.id === editingId ? { ...m, ...dataToSave, id: editingId } as Municipality : m));
      } else {
        const newId = await createMunicipality(dataToSave);
        setMunicipalities(prev => [...prev, { ...dataToSave, id: newId } as Municipality]);
      }
      setIsModalOpen(false);
    } catch (error) {
      alert("Erro ao salvar: " + error);
    }
  };

  // Helper para contar dados vinculados
  const getStats = (municipalityId: string) => {
    const municipality = municipalities.find(m => m.id === municipalityId);
    const munUnits = units.filter(u => u.municipalityId === municipalityId);

    const unitsCount = municipality?.unitsCount || munUnits.length;

    // Count unique professionals linked to this municipality via assignments
    const prosCount = professionals.filter(p => {
      // Check assignments
      if (p.assignments && p.assignments.length > 0) {
        return p.assignments.some(a => a.municipalityId === municipalityId);
      }
      // Fallback for legacy data
      return p.municipalityId === municipalityId;
    }).length;

    // Real Production Count (Manual + Extracted)
    const productionCount = productionStats[municipalityId] || 0;

    return { unitsCount, prosCount, productionCount };
  };

  if (loading || loadingEntity) {
    return <div className="p-8 text-center text-gray-500">Carregando municípios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Municípios Gerenciados</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Visão geral das cidades parceiras.</p>
        </div>
        {!isCoordenacao && (
          <Button variant="secondary" className="flex items-center gap-2" onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" /> Vincular Município
          </Button>
        )}
      </div>

      <Card className="!p-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou código IBGE..."
            className="pl-9 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMunicipalities.map((mun) => {
          const { unitsCount, prosCount, productionCount } = getStats(mun.id);

          return (
            <Card key={mun.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow group">
              <div className="h-24 bg-gradient-to-r from-emerald-500 to-teal-600 relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  <button onClick={() => handleOpenModal(mun, true)} className="bg-white/20 backdrop-blur-sm p-1.5 rounded-lg text-white cursor-pointer hover:bg-white/30 transition-colors" title="Visualizar Detalhes">
                    <Eye className="w-4 h-4" />
                  </button>
                  {!isCoordenacao && (
                    <>
                      <button onClick={() => handleOpenModal(mun)} className="bg-white/20 backdrop-blur-sm p-1.5 rounded-lg text-white cursor-pointer hover:bg-white/30 transition-colors" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(mun.id)} className="bg-white/20 backdrop-blur-sm p-1.5 rounded-lg text-white cursor-pointer hover:bg-red-500/50 transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
                <div className="absolute -bottom-8 left-6">
                  <div className="h-16 w-16 rounded-xl bg-white dark:bg-gray-800 shadow-md flex items-center justify-center border-2 border-white dark:border-gray-700 text-2xl font-bold text-emerald-600">
                    {mun.uf || mun.state}
                  </div>
                </div>
              </div>
              <div className="pt-10 px-6 pb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-none">{mun.name}</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center font-medium">
                  <Crown className="w-3 h-3 mr-1" /> Pref. {mun.mayorName}
                </p>

                <div className="space-y-3 mt-4">
                  {/* População */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" /> População Est.
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{mun.population?.toLocaleString()}</span>
                  </div>

                  {/* Novos Contadores */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" /> Quant. Unidades
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{unitsCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-gray-400" /> Quant. Profissionais
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{prosCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-400" /> Produção Realizada
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      {loadingStats && productionStats[mun.id] === undefined ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
                      ) : (
                        productionCount.toLocaleString()
                      )}
                    </span>
                  </div>

                  {/* Endereço e Contato */}
                  <div className="text-sm space-y-1 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                    <div className="flex items-center gap-2 text-gray-500">
                      <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{mun.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <Phone className="w-3 h-3 shrink-0" /> <span>{mun.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Interface Type Indicator */}
                <div className="text-xs flex items-center justify-between p-2 rounded border mt-4 mb-2 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700">
                  <span className="font-semibold flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    Interface
                  </span>
                  <Badge type={mun.interfaceType === 'SIMPLIFIED' ? 'warning' : 'neutral'} className="text-[10px]">
                    {mun.interfaceType === 'SIMPLIFIED' ? 'Simplificada' : 'Padrão PEC'}
                  </Badge>
                </div>

                {/* Conector PEC Status */}
                {mun.lediConfig?.integrationStatus === 'ACTIVE' && (
                  <div className="text-xs flex items-center justify-between p-2 rounded border mt-2 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50">
                    <span className="font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <LayoutTemplate className="w-3.5 h-3.5" />
                      Conector PEC
                    </span>
                    <Badge type="success" className="text-[10px]">
                      ATIVO
                    </Badge>
                  </div>
                )}

                {/* Footer com Status Clicável */}
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <button
                    onClick={() => toggleStatus(mun.id)}
                    className="group/btn flex items-center gap-2 focus:outline-none"
                    title="Clique para alterar o status"
                  >
                    <Badge type={mun.active ? 'success' : 'error'} className="transition-transform group-hover/btn:scale-105 cursor-pointer">
                      {mun.active ? 'Contrato Ativo' : 'Inativo'}
                    </Badge>
                    <RefreshCw className="w-3 h-3 text-gray-400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal de Cadastro/Edição/Visualização */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isViewMode ? "Detalhes do Município" : (editingId ? "Editar Município" : "Vincular Novo Município")}
      >
        {/* Alerta de Licenciamento - Apenas na Criação */}
        {!editingId && !isViewMode && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 mb-6 rounded-r-lg dark:bg-emerald-900/20 dark:border-emerald-500">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-emerald-600 dark:text-emerald-500" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-emerald-700 dark:text-emerald-200">
                  Adicionar um município aumenta proporcionalmente o valor da licença por município desta entidade.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Seção 1: Dados Territoriais */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-emerald-600" /> Dados Territoriais
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Município"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                disabled={isViewMode}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="UF"
                  value={formData.uf || 'SP'}
                  onChange={e => setFormData({ ...formData, uf: e.target.value, state: e.target.value })}
                  disabled={isViewMode}
                >
                  {BRAZILIAN_STATES.map(state => (
                    <option key={state.value} value={state.value}>{state.value}</option>
                  ))}
                </Select>
                <Input
                  label="Cód. IBGE"
                  value={formData.codeIbge || ''}
                  onChange={e => setFormData({ ...formData, codeIbge: e.target.value })}
                  disabled={isViewMode}
                  required
                />
              </div>
              <Input
                label="População Estimada"
                type="number"
                value={formData.population || ''}
                onChange={e => setFormData({ ...formData, population: Number(e.target.value) })}
                disabled={isViewMode}
                required
              />
            </div>
          </div>

          {/* Seção 2: Vínculo Contratual (Preenchido Automaticamente) */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                <Briefcase className="w-4 h-4 mr-2 text-emerald-600" /> Vínculo Contratual
              </h4>
              {!editingId && !isViewMode && (
                <Badge type="neutral" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Auto-preenchido
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Tipo de Entidade Gestora"
                value={formData.managerEntityType || 'Prefeitura'}
                onChange={e => setFormData({ ...formData, managerEntityType: e.target.value as any })}
                disabled={true} // Locked
              >
                <option value="Prefeitura">Prefeitura Municipal</option>
                <option value="Consórcio">Consórcio Intermunicipal</option>
                <option value="Fundação">Fundação Pública</option>
                <option value="OS">Organização Social (OS)</option>
              </Select>
              <Input
                label="Entidade Responsável (Jurídica)"
                value={formData.responsibleEntity || ''}
                onChange={e => setFormData({ ...formData, responsibleEntity: e.target.value })}
                placeholder="Ex: Fundação..."
                disabled={true} // Locked
                required
              />
              <Input
                label="CNPJ da Entidade"
                value={formData.cnpj || ''}
                onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
                disabled={true} // Locked
                required
              />
              <div className="flex items-end mb-4">
                <label className={`flex items-center space-x-2 p-2 rounded-lg transition-colors w-full border border-transparent ${isViewMode ? 'opacity-70' : 'hover:bg-white dark:hover:bg-gray-600 hover:border-gray-200 dark:hover:border-gray-500 cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={formData.active || false}
                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                    disabled={isViewMode}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Contrato Ativo e Vigente</span>
                </label>
              </div>
            </div>
          </div>

          {/* Configuração de Interface (Novo) */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <LayoutTemplate className="w-4 h-4 mr-2 text-emerald-600" /> Configuração de Interface
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`relative flex cursor-pointer rounded-lg border p-3 shadow-sm focus:outline-none ${formData.interfaceType === 'PEC' ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'}`}>
                <input
                  type="radio"
                  name="interfaceType"
                  value="PEC"
                  className="sr-only"
                  checked={(!formData.interfaceType || formData.interfaceType === 'PEC')}
                  onChange={() => setFormData(prev => ({ ...prev, interfaceType: 'PEC' }))}
                  disabled={isViewMode}
                />
                <span className="flex flex-col">
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Interface PEC (Padrão)</span>
                  <span className="mt-1 flex items-center text-xs text-gray-500">
                    Fichas completas, SOAP e integração e-SUS.
                  </span>
                </span>
              </label>
              <label className={`relative flex cursor-pointer rounded-lg border p-3 shadow-sm focus:outline-none ${formData.interfaceType === 'SIMPLIFIED' ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'}`}>
                <input
                  type="radio"
                  name="interfaceType"
                  value="SIMPLIFIED"
                  className="sr-only"
                  checked={formData.interfaceType === 'SIMPLIFIED'}
                  onChange={() => setFormData(prev => ({ ...prev, interfaceType: 'SIMPLIFIED' }))}
                  disabled={isViewMode}
                />
                <span className="flex flex-col">
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Interface Simplificada</span>
                  <span className="mt-1 flex items-center text-xs text-gray-500">
                    Apenas produção básica e procedimentos.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Seção 3: Gestão e Contato */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <Users className="w-4 h-4 mr-2 text-emerald-600" /> Gestão e Contato
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Prefeito(a)"
                value={formData.mayorName || ''}
                onChange={e => setFormData({ ...formData, mayorName: e.target.value })}
                disabled={isViewMode}
                required
              />
              <Input
                label="Nome do Secretário(a) de Saúde"
                value={formData.secretaryName || ''}
                onChange={e => setFormData({ ...formData, secretaryName: e.target.value })}
                disabled={isViewMode}
                required
              />
              <Input
                label="Email Oficial"
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                disabled={isViewMode}
                required
              />
              <Input
                label="Telefone de Contato"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                disabled={isViewMode}
                required
              />
              <Input
                label="Endereço da Secretaria"
                className="md:col-span-2"
                value={formData.address || ''}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                disabled={isViewMode}
                required
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              {isViewMode ? 'Fechar' : 'Cancelar'}
            </Button>
            {!isViewMode && (
              <Button type="submit" variant="secondary">{editingId ? 'Salvar Alterações' : 'Vincular Município'}</Button>
            )}
          </div>
        </form>
      </Modal>
    </div >
  );
};

export default Municipalities;