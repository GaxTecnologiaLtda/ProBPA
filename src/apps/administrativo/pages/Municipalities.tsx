import React, { useState, useEffect } from 'react';
import { MOCK_ENTITIES, BRAZILIAN_STATES } from '../constants';
import { Card, Button, Input, Badge, Modal, Select, Tooltip, CollapsibleSection } from '../components/Common';
import { Plus, Search, Link2, MapPin, Users, Building2, Hash, UserCircle, Phone, Mail, Trash2, Edit, Briefcase, AlertTriangle, LayoutTemplate, Database, Key, Copy, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { LicenseStatus, Municipality, EntityType, MunicipalityInput } from '../types';
import { fetchAllMunicipalities, createMunicipality, updateMunicipality, deleteMunicipality, fetchLediStatusStats } from '../services/municipalitiesService';
import { fetchEntitiesByType } from '../services/entitiesService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { DataPreviewTest } from './DataPreviewTest';

// Initial empty form state
const INITIAL_FORM_STATE: MunicipalityInput = {
    name: '',
    state: '',
    uf: '', // Sync with state
    codeIbge: '',
    population: 0,
    linkedEntityId: '',
    linkedEntityName: '',
    mayorName: '',
    secretaryName: '', // Mapped to healthSecretary
    email: '',
    phone: '',
    address: '',
    managerEntityType: 'Prefeitura',
    responsibleEntity: '',
    cnpj: '',
    status: LicenseStatus.ACTIVE,
    active: true,
    // LEDI Config
    lediConfig: {
        apiKey: '', // New API KEY Field
        schedule: '0 10 * * *', // Default Schedule
        adminPassword: '', // Connector Admin Password
        integrationStatus: 'NOT_CONFIGURED'
    },
    interfaceType: 'PEC' // Default setting
};

const Municipalities: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
    const [loading, setLoading] = useState(true);
    const [entities, setEntities] = useState<any[]>([]); // To store fetched entities
    const [lediStats, setLediStats] = useState<Record<string, { pending: number, errors: number }>>({}); // Map munId -> stats

    // Collapsible States
    const [isPublicOpen, setIsPublicOpen] = useState(true);
    const [isPrivateOpen, setIsPrivateOpen] = useState(true);

    // Form State
    const [formData, setFormData] = useState<MunicipalityInput>(INITIAL_FORM_STATE);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Filter state for the modal dropdowns
    const [entityTypeFilter, setEntityTypeFilter] = useState<'PUBLIC' | 'PRIVATE' | ''>('');

    // Preview State
    const [showPreview, setShowPreview] = useState(false);
    const [previewId, setPreviewId] = useState<string | null>(null);

    // Fetch Data
    const loadData = async () => {
        setLoading(true);
        try {
            const [munis, publicEnts, privateEnts] = await Promise.all([
                fetchAllMunicipalities(),
                fetchEntitiesByType("PUBLIC"),
                fetchEntitiesByType("PRIVATE")
            ]);
            setMunicipalities(munis);
            setEntities([...publicEnts, ...privateEnts]);

            // Load LEDI Stats Lazy/Async
            munis.forEach(async (m) => {
                if (m.lediConfig?.integrationStatus === 'ACTIVE') {
                    const stats = await fetchLediStatusStats(m.id);
                    setLediStats(prev => ({ ...prev, [m.id]: stats }));
                }
            });
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredMunicipalities = municipalities.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.linkedEntityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.codeIbge.includes(searchTerm)
    );

    // Grouping Logic
    const getEntityType = (entityId: string): 'PUBLIC' | 'PRIVATE' | undefined => {
        return entities.find(e => e.id === entityId)?.type as 'PUBLIC' | 'PRIVATE';
    };

    const publicMunicipalities = filteredMunicipalities.filter(m => getEntityType(m.linkedEntityId) === 'PUBLIC');
    const privateMunicipalities = filteredMunicipalities.filter(m => getEntityType(m.linkedEntityId) === 'PRIVATE');

    // Handlers
    const handleNew = () => {
        setEditingId(null);
        setFormData(INITIAL_FORM_STATE);
        setEntityTypeFilter(''); // Reset filter
        setIsModalOpen(true);
    };

    const handleEdit = (city: Municipality) => {
        setEditingId(city.id);

        // Find the entity to set the correct type filter automatically
        const linkedEntity = entities.find(e => e.id === city.linkedEntityId);
        setEntityTypeFilter(linkedEntity ? linkedEntity.type : '');

        setFormData({
            ...city,
            // Ensure all fields are present
            uf: city.uf || city.state,
            codeIbge: city.codeIbge || '',
            secretaryName: city.secretaryName || '',
            managerEntityType: city.managerEntityType || 'Prefeitura',
            responsibleEntity: city.responsibleEntity || '',
            cnpj: city.cnpj || '',

            address: city.address || '',
            interfaceType: city.interfaceType || 'PEC'
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja desvincular este município?')) {
            try {
                // Need to find the municipality to get its entity ID first
                const municipality = municipalities.find(m => m.id === id);
                if (municipality) {
                    await deleteMunicipality(id, { linkedEntityId: municipality.linkedEntityId });
                } else {
                    throw new Error("Municipality not found in local state");
                }
                setMunicipalities(prev => prev.filter(m => m.id !== id));
            } catch (error) {
                alert("Erro ao excluir: " + error);
            }
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.state || !formData.linkedEntityId) {
            alert("Preencha os campos obrigatórios.");
            return;
        }

        const linkedEntity = entities.find(e => e.id === formData.linkedEntityId);

        const dataToSave: MunicipalityInput = {
            ...formData,
            uf: formData.state, // Sync
            linkedEntityName: linkedEntity?.name || 'Entidade Desconhecida',
            codeIbge: formData.codeIbge || formData.ibgeCode || '', // Map legacy

            interfaceType: formData.interfaceType || 'PEC'
        };

        try {
            if (editingId) {
                await updateMunicipality(editingId, dataToSave, {
                    linkedEntityId: formData.linkedEntityId,
                    entityType: linkedEntity?.type // Pass type if available
                });
                setMunicipalities(prev => prev.map(m => m.id === editingId ? { ...m, ...dataToSave, id: editingId } as Municipality : m));
            } else {
                const newId = await createMunicipality(dataToSave);
                setMunicipalities(prev => [{ ...dataToSave, id: newId } as Municipality, ...prev]);
            }
            setIsModalOpen(false);
            loadData(); // Refresh to be sure
        } catch (error) {
            alert("Erro ao salvar: " + error);
        }
    };

    const handleInputChange = (field: keyof MunicipalityInput | 'ibgeCode' | 'healthSecretary', value: any) => {
        setFormData(prev => {
            const updates: any = { [field]: value };
            // Sync aliases
            if (field === 'state') updates.uf = value;
            if (field === 'ibgeCode') updates.codeIbge = value;
            if (field === 'healthSecretary') updates.secretaryName = value;
            return { ...prev, ...updates };
        });
    };

    // Helper to generate API Key
    const generateApiKey = () => {
        // Simple random string generation for MVP
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({
            ...prev,
            lediConfig: {
                ...prev.lediConfig,
                apiKey: result,
                integrationStatus: 'ACTIVE' // Activating immediately if key generated
            }
        }));
    };

    const generateAdminPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Readable chars
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({
            ...prev,
            lediConfig: {
                ...prev.lediConfig,
                adminPassword: result
            }
        }));
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Chave copiada para a área de transferência!");
    };


    // Helper to render the grid of cards
    const renderMunicipalityGrid = (list: Municipality[]) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {list.map((city) => (
                <div
                    key={city.id}
                    className="group bg-white dark:bg-dark-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden"
                >
                    {/* Status Indicator */}
                    <div className={`absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 transition-transform group-hover:scale-110`}>
                        <div className={`absolute transform rotate-45 text-center text-[10px] font-bold text-white w-24 py-1 right-0 bottom-0 translate-y-5 -translate-x-3 shadow-sm ${city.status === LicenseStatus.ACTIVE ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}>
                            {city.status === LicenseStatus.ACTIVE ? 'ATIVO' : 'SUSP.'}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-start mb-3 pr-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate max-w-[180px]" title={city.name}>{city.name}</h3>
                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-1.5 py-0.5 rounded font-medium border border-slate-200 dark:border-slate-600">
                                        {city.state}
                                    </span>
                                </div>
                                <div className="flex items-center text-xs text-slate-500">
                                    <Hash className="w-3 h-3 mr-1" /> Código IBGE: {city.codeIbge}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50 mb-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2 flex items-center">
                                <Link2 className="w-3 h-3 mr-1" /> Entidade Gestora
                            </p>
                            <div className="flex items-center gap-2 text-sm font-medium text-corp-600 dark:text-corp-400">
                                <Building2 className="w-4 h-4 opacity-70" />
                                <span className="line-clamp-1" title={city.linkedEntityName}>{city.linkedEntityName}</span>
                            </div>

                            {/* Conector PEC Status Small Card */}
                            {city.lediConfig?.integrationStatus === 'ACTIVE' && (
                                <div className="mt-2 text-xs flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded border border-emerald-100 dark:border-emerald-800/50">
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                        <Database className="w-3 h-3" /> Conector PEC
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="success" className="py-0 px-1.5 h-5 text-[10px]">ATIVO</Badge>
                                        <button
                                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewId(city.id);
                                                setShowPreview(true);
                                            }}
                                        >
                                            Ver Dados
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="flex flex-col p-2 rounded bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                                    <Users className="w-3 h-3" /> População
                                </span>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{city.population?.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col p-2 rounded bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Usuários
                                </span>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{city.usersCount || 0}</span>
                            </div>
                        </div>

                        {/* Interface Type Indicator */}
                        <div className="mb-4">
                            <div className={`text-xs flex items-center justify-between p-2 rounded border ${city.interfaceType === 'SIMPLIFIED'
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                }`}>
                                <span className="font-semibold flex items-center gap-1.5">
                                    <LayoutTemplate className="w-3.5 h-3.5" />
                                    Interface
                                </span>
                                <span className="font-bold text-[10px] uppercase tracking-wider">
                                    {city.interfaceType === 'SIMPLIFIED' ? 'Simplificada' : 'Padrão PEC'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                        {/* New Preview Button shortcut */}
                        {city.lediConfig?.integrationStatus === 'ACTIVE' && (
                            <Tooltip content="Visualizar dados extraídos">
                                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 !px-2" onClick={() => {
                                    setPreviewId(city.id);
                                    setShowPreview(true);
                                }}>
                                    <Database className="w-4 h-4" />
                                </Button>
                            </Tooltip>
                        )}

                        <Tooltip content="Editar dados do município">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-corp-500 !px-2" onClick={() => handleEdit(city)}>
                                <Edit className="w-4 h-4" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Desvincular município">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-500 !px-2" onClick={() => handleDelete(city.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </Tooltip>
                    </div>
                </div>
            ))
            }
        </div >
    );

    const EntityGroupCard: React.FC<{ entityName: string, municipalities: Municipality[] }> = ({ entityName, municipalities }) => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800 transition-all duration-200">
                <div
                    className="flex items-center gap-2 p-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-t-xl"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide select-none">
                        {entityName}
                    </h3>
                    <div className="ml-auto flex items-center gap-3">
                        <Badge variant="neutral" className="text-xs">{municipalities.length}</Badge>
                        {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                    </div>
                </div>

                {isOpen && (
                    <div className="p-4 pt-0 animate-fade-in-down border-t border-slate-100 dark:border-slate-700/50">
                        <div className="mt-4">
                            {renderMunicipalityGrid(municipalities)}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderGroupedList = (list: Municipality[]) => {
        const groups: Record<string, Municipality[]> = {};
        list.forEach(m => {
            const key = m.linkedEntityName || 'Outros / Sem Vínculo';
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });

        const sortedKeys = Object.keys(groups).sort();

        return (
            <div className="space-y-4">
                {sortedKeys.map(entityName => (
                    <EntityGroupCard
                        key={entityName}
                        entityName={entityName}
                        municipalities={groups[entityName]}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Municípios Vinculados</h1>
                    <p className="text-slate-500">Gestão das cidades e cobertura do sistema.</p>
                </div>
                <Tooltip content="Adicionar novo município à base">
                    <Button icon={Plus} onClick={handleNew}>
                        Vincular Município
                    </Button>
                </Tooltip>
            </div>

            <Card className="!p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <Input
                            placeholder="Buscar por município ou entidade..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select
                        className="w-full md:w-48"
                        options={[
                            { value: 'all', label: 'Estado: Todos' },
                            ...BRAZILIAN_STATES
                        ]}
                    />
                </div>
            </Card>

            {loading ? (
                <div className="text-center py-12">Carregando...</div>
            ) : filteredMunicipalities.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-dark-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                        <Search className="w-6 h-6 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">Nenhum município encontrado</h3>
                    <p className="text-slate-500">Tente ajustar os filtros de busca.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Public Entities Group */}
                    <CollapsibleSection
                        title="Vinculados a Entidades Públicas"
                        count={publicMunicipalities.length}
                        isOpen={isPublicOpen}
                        onToggle={() => setIsPublicOpen(!isPublicOpen)}
                        icon={Building2}
                        colorClass="text-blue-500"
                        maxHeight="max-h-[60vh]"
                    >
                        {publicMunicipalities.length > 0 ? (
                            renderGroupedList(publicMunicipalities)
                        ) : (
                            <p className="text-sm text-slate-500 italic">Nenhum município vinculado a entidades públicas.</p>
                        )}
                    </CollapsibleSection>

                    {/* Private Entities Group */}
                    <CollapsibleSection
                        title="Vinculados a Entidades Privadas"
                        count={privateMunicipalities.length}
                        isOpen={isPrivateOpen}
                        onToggle={() => setIsPrivateOpen(!isPrivateOpen)}
                        icon={Briefcase}
                        colorClass="text-purple-500"
                        maxHeight="max-h-[60vh]"
                    >
                        {privateMunicipalities.length > 0 ? (
                            renderGroupedList(privateMunicipalities)
                        ) : (
                            <p className="text-sm text-slate-500 italic">Nenhum município vinculado a entidades privadas.</p>
                        )}
                    </CollapsibleSection>
                </div>
            )}

            {/* Preview Modal */}
            {previewId && (
                <DataPreviewTest
                    municipalityId={previewId}
                    isOpen={showPreview}
                    onClose={() => {
                        setShowPreview(false);
                        setPreviewId(null);
                    }}
                />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Editar Município" : "Vincular Novo Município"}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Salvar Vínculo</Button>
                    </>
                }
            >
                <div className="space-y-6">
                    {/* ... (Previous sections same) ... */}
                    {/* Alert Box - Updated Text */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-lg border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                        <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded-full shrink-0">
                            <Building2 className="w-4 h-4" />
                        </div>
                        <p>
                            Adicionar um município <strong>aumenta proporcionalmente o valor da licença por município</strong> da entidade selecionada. Verifique o contrato antes de prosseguir.
                        </p>
                    </div>

                    {/* Section 1: Dados Básicos */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
                            Dados Territoriais
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                                <Input
                                    label="Nome do Município"
                                    placeholder="Ex: Salvador"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                />
                            </div>
                            <Select
                                label="Estado"
                                value={formData.state}
                                onChange={(e) => handleInputChange('state', e.target.value)}
                                options={[
                                    { value: '', label: 'UF' },
                                    ...BRAZILIAN_STATES
                                ]}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Código IBGE"
                                placeholder="0000000"
                                value={formData.codeIbge}
                                onChange={(e) => handleInputChange('ibgeCode', e.target.value)}
                            />
                            <Input
                                label="População Estimada"
                                placeholder="0"
                                value={formData.population}
                                onChange={(e) => handleInputChange('population', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Section 2 & 3: Vínculo & Gestão (Omitting for brevity, assume unchanged logic) */}

                    {/* Section 2: Vínculo (UPDATED LOGIC) */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
                            Vínculo Contratual
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Step 1: Select Type */}
                            <Select
                                label="Tipo de Entidade Gestora"
                                value={entityTypeFilter}
                                onChange={(e) => {
                                    setEntityTypeFilter(e.target.value as 'PUBLIC' | 'PRIVATE');
                                    // Clear specific selection when type changes
                                    handleInputChange('linkedEntityId', '');
                                }}
                                options={[
                                    { value: '', label: 'Selecione o tipo...' },
                                    { value: 'PUBLIC', label: 'Pública' },
                                    { value: 'PRIVATE', label: 'Privada' }
                                ]}
                            />

                            {/* Step 2: Select Entity (Filtered) */}
                            <Select
                                label="Entidade Responsável"
                                value={formData.linkedEntityId}
                                onChange={(e) => handleInputChange('linkedEntityId', e.target.value)}
                                disabled={!entityTypeFilter}
                                options={[
                                    { value: '', label: 'Selecione a entidade...' },
                                    ...entities
                                        .filter(e => e.type === entityTypeFilter)
                                        .map(e => ({ value: e.id, label: e.name }))
                                ]}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Status do Município"
                                value={formData.status}
                                onChange={(e) => handleInputChange('status', e.target.value)}
                                options={[
                                    { value: LicenseStatus.ACTIVE, label: 'Ativo' },
                                    { value: LicenseStatus.SUSPENDED, label: 'Suspenso' }
                                ]}
                            />
                        </div>
                        {/* Interface Configuration */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                <LayoutTemplate className="w-3.5 h-3.5" />
                                Configuração da Interface (Painel de Produção)
                            </h5>
                            {/* Radio buttons (same as before) */}
                            <div className="flex gap-4">
                                <label className={`flex-1 relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none ${formData.interfaceType === 'PEC' ? 'border-emerald-600 ring-1 ring-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                                    <input
                                        type="radio"
                                        name="interfaceType"
                                        value="PEC"
                                        className="sr-only"
                                        checked={formData.interfaceType === 'PEC'}
                                        onChange={() => setFormData(prev => ({ ...prev, interfaceType: 'PEC' }))}
                                    />
                                    <span className="flex flex-col">
                                        <span className={`block text-sm font-medium ${formData.interfaceType === 'PEC' ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-900 dark:text-slate-200'}`}>Interface PEC (Padrão)</span>
                                        <span className={`mt-1 flex items-center text-xs ${formData.interfaceType === 'PEC' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>
                                            Fichas Completas, Integração e-SUS, SOAP, Condições de Saúde.
                                        </span>
                                    </span>
                                </label>
                                <label className={`flex-1 relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none ${formData.interfaceType === 'SIMPLIFIED' ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                                    <input
                                        type="radio"
                                        name="interfaceType"
                                        value="SIMPLIFIED"
                                        className="sr-only"
                                        checked={formData.interfaceType === 'SIMPLIFIED'}
                                        onChange={() => setFormData(prev => ({ ...prev, interfaceType: 'SIMPLIFIED' }))}
                                    />
                                    <span className="flex flex-col">
                                        <span className={`block text-sm font-medium ${formData.interfaceType === 'SIMPLIFIED' ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-900 dark:text-slate-200'}`}>Interface Simplificada</span>
                                        <span className={`mt-1 flex items-center text-xs ${formData.interfaceType === 'SIMPLIFIED' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500'}`}>
                                            Apenas Produção, Identificação e Procedimentos. Sem Fichas.
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Gestão Local */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
                            Gestão e Contato
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Prefeito(a)"
                                placeholder="Nome completo"
                                value={formData.mayorName}
                                onChange={(e) => handleInputChange('mayorName', e.target.value)}
                            />
                            <Input
                                label="Secretário(a) de Saúde"
                                placeholder="Nome completo"
                                value={formData.secretaryName}
                                onChange={(e) => handleInputChange('healthSecretary', e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute left-3 top-9 text-slate-400" />
                                <Input
                                    label="E-mail de Contato"
                                    className="pl-9"
                                    placeholder="saude@municipio.gov.br"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <Phone className="w-4 h-4 absolute left-3 top-9 text-slate-400" />
                                <Input
                                    label="Telefone"
                                    className="pl-9"
                                    placeholder="(00) 0000-0000"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>


                    {/* Section 4: Importação de Dados */}
                    {editingId && (
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            {/* ... Same as before ... */}
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Database className="w-4 h-4 text-purple-500" />
                                    Base de Pacientes Offline
                                </h4>
                            </div>

                            <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800 flex items-center justify-between">
                                <div className="text-sm text-purple-800 dark:text-purple-200">
                                    <p className="font-medium">Importação de Dados</p>
                                    <p className="text-xs opacity-80 max-w-sm mt-1">
                                        Importe uma lista de pacientes (CSV/JSON/XML do e-SUS) para preencher o cache offline deste município.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-purple-200 hover:bg-purple-100 text-purple-700 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-800"
                                    onClick={() => alert("Funcionalidade de importação em breve!")}
                                >
                                    Importar Base
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Section 5: Integração Conector PEC (PostgreSQL SECURE) */}
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white pb-2 flex items-center gap-2">
                                <Database className="w-4 h-4 text-corp-500" />
                                Conector PEC (API Segura)
                            </h4>
                            <Badge variant={formData.lediConfig?.integrationStatus === 'ACTIVE' ? 'success' : 'neutral'}>
                                {formData.lediConfig?.integrationStatus === 'ACTIVE' ? 'Ativo' : 'Não Configurado'}
                            </Badge>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Chave de API (Instalador)
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Key className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                        <Input
                                            value={formData.lediConfig?.apiKey || ''}
                                            readOnly
                                            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 font-mono text-sm"
                                            placeholder="Gere uma chave para configurar o instalador"
                                        />
                                    </div>
                                    <Tooltip content="Copiar Chave">
                                        <Button
                                            variant="outline"
                                            className="px-3"
                                            onClick={() => formData.lediConfig?.apiKey && copyToClipboard(formData.lediConfig.apiKey)}
                                            disabled={!formData.lediConfig?.apiKey}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </Tooltip>
                                    <Tooltip content="Gerar Nova Chave">
                                        <Button
                                            variant="outline"
                                            className="px-3 text-corp-600 border-corp-200 hover:bg-corp-50"
                                            onClick={generateApiKey}
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </Button>
                                    </Tooltip>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Use esta chave e o ID do município no instalador local (<code>setup_connector.sh</code>).
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <Input
                                    label="Agendamento (CRON)"
                                    placeholder="0 10 * * * (Todas os dias às 10:00)"
                                    value={formData.lediConfig?.schedule || '0 10 * * *'}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        lediConfig: { ...prev.lediConfig, schedule: e.target.value }
                                    }))}
                                />


                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Senha de Administração (Edição Local)
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Key className="w-4 h-4 absolute left-3 top-3 text-purple-400" />
                                            <Input
                                                value={formData.lediConfig?.adminPassword || ''}
                                                readOnly
                                                className="pl-9 bg-white dark:bg-slate-900 border-slate-200 font-mono text-sm"
                                                placeholder="Senha para destravar configs no App"
                                            />
                                        </div>
                                        <Tooltip content="Gerar Senha">
                                            <Button
                                                variant="outline"
                                                className="px-3 text-purple-600 border-purple-200 hover:bg-purple-50"
                                                onClick={generateAdminPassword}
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                        </Tooltip>
                                        <Tooltip content="Copiar Senha">
                                            <Button
                                                variant="outline"
                                                className="px-3"
                                                onClick={() => formData.lediConfig?.adminPassword && copyToClipboard(formData.lediConfig.adminPassword)}
                                                disabled={!formData.lediConfig?.adminPassword}
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </Tooltip>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Esta senha será solicitada para alterar configurações críticas no App Conector.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Municipalities;