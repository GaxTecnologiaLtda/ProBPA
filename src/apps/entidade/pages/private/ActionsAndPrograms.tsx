import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Input, Select, Badge } from '../../components/ui/Components';
import { Plus, Calendar, MapPin, Users, Activity, Trash2, Edit2, Search, Stethoscope, Save, X, FileText, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEntityData } from '../../hooks/useEntityData';
import {
    fetchActionsByEntity,
    createAction,
    updateAction,
    deleteAction,
    registerProduction,
    fetchActionProduction,
    Action,
    ActionProduction
} from '../../services/actionsService';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { fetchProfessionalsByEntity } from '../../services/professionalsService';
import { SigtapBrowserModal } from './components/SigtapBrowserModal';
// import { format } from 'date-fns';

const ActionsAndPrograms: React.FC = () => {
    const { claims } = useAuth();
    const { entity } = useEntityData(claims?.entityId);

    // Data State
    const [actions, setActions] = useState<Action[]>([]);
    const [municipalities, setMunicipalities] = useState<any[]>([]);
    const [professionals, setProfessionals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals State
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
    const [isSigtapModalOpen, setIsSigtapModalOpen] = useState(false);

    // Form State (Action)
    const [editingActionId, setEditingActionId] = useState<string | null>(null);
    const [actionForm, setActionForm] = useState<Partial<Action>>({
        professionals: [],
        procedures: []
    });

    // Form State (Production)
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const [productionForm, setProductionForm] = useState<Partial<ActionProduction>>({
        patient: { name: '', cns: '', cpf: '', birthDate: '', sex: 'M' },
        competence: new Date().toISOString().slice(0, 7).replace('-', '') // YYYYMM
    });
    const [productionHistory, setProductionHistory] = useState<ActionProduction[]>([]);

    // Constants
    const [customLocationMode, setCustomLocationMode] = useState(false);
    const [manualProfessionalMode, setManualProfessionalMode] = useState(false);
    const [manualProfForm, setManualProfForm] = useState({ name: '', cns: '', occupation: '' });

    const loadData = async () => {
        if (!claims?.entityId) return;
        setLoading(true);

        try {
            // Load in parallel but fail gracefully independently
            const actionsPromise = fetchActionsByEntity(claims.entityId)
                .then(setActions)
                .catch(err => console.error("Failed to load actions:", err));

            const municipalitiesPromise = fetchMunicipalitiesByEntity(claims.entityId)
                .then(setMunicipalities)
                .catch(err => console.error("Failed to load municipalities:", err));

            const professionalsPromise = fetchProfessionalsByEntity(claims.entityId)
                .then(setProfessionals)
                .catch(err => console.error("Failed to load professionals:", err));

            await Promise.all([actionsPromise, municipalitiesPromise, professionalsPromise]);
        } catch (error) {
            console.error("Error in loadData:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [claims?.entityId]);

    // --- ACTION MANAGEMENT ---

    const handleOpenActionModal = (action?: Action) => {
        if (action) {
            setEditingActionId(action.id || null);
            setActionForm({ ...action });
            setCustomLocationMode(!action.municipalityId);
        } else {
            setEditingActionId(null);
            setActionForm({
                entityId: claims?.entityId,
                professionals: [],
                procedures: [],
                municipalityName: ''
            });
            setCustomLocationMode(false);
        }
        setIsActionModalOpen(true);
    };

    const handleSaveAction = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Validate
            if (!actionForm.name || !actionForm.date) {
                alert("Nome e Data são obrigatórios.");
                return;
            }

            if (!customLocationMode && !actionForm.municipalityId) {
                alert("Selecione um município ou marque 'Outro Local'.");
                return;
            }

            // If custom location, clear ID
            const payload = {
                ...actionForm,
                municipalityId: customLocationMode ? undefined : actionForm.municipalityId,
                municipalityName: customLocationMode ? actionForm.municipalityName : municipalities.find(m => m.id === actionForm.municipalityId)?.name
            } as Action;

            if (editingActionId) {
                await updateAction(editingActionId, payload, actions.find(a => a.id === editingActionId)!);
            } else {
                await createAction(payload);
            }
            setIsActionModalOpen(false);
            loadData();
        } catch (error) {
            alert("Erro ao salvar ação: " + error);
        }
    };

    const handleDeleteAction = async (action: Action) => {
        if (confirm("Tem certeza que deseja excluir esta ação?")) {
            try {
                await deleteAction(action.id!, action.entityId, action.municipalityId);
                loadData();
            } catch (error) {
                alert("Erro ao excluir: " + error);
            }
        }
    };

    // --- PROFESSIONALS & PROCEDURES ---

    const handleAddProfessional = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const profId = e.target.value;
        if (!profId) return;

        const prof = professionals.find(p => p.id === profId);
        if (prof) {
            const exists = actionForm.professionals?.find(p => p.id === prof.id);
            if (!exists) {
                setActionForm(prev => ({
                    ...prev,
                    professionals: [...(prev.professionals || []), {
                        id: prof.id,
                        name: prof.name,
                        cns: prof.cns,
                        occupation: prof.occupation || 'Não informado'
                    }]
                }));
            }
        }
        e.target.value = ''; // Reset select
    };

    const handleManualProfSubmit = () => {
        if (!manualProfForm.name) return;
        setActionForm(prev => ({
            ...prev,
            professionals: [...(prev.professionals || []), { ...manualProfForm }]
        }));
        setManualProfForm({ name: '', cns: '', occupation: '' });
        setManualProfessionalMode(false);
    };

    const handleRemoveProfessional = (index: number) => {
        const updated = [...(actionForm.professionals || [])];
        updated.splice(index, 1);
        setActionForm(prev => ({ ...prev, professionals: updated }));
    };

    // Callback for Sigtap Modal
    const handleAddProcedure = (procedure: any) => {
        // Adapt 'procedure' object from SigtapBrowser (updated to use consistent keys)
        const code = procedure.code || procedure.co_procedimento;
        const name = procedure.name || procedure.no_procedimento;

        if (!code) {
            console.error("Invalid procedure selected:", procedure);
            return;
        }

        const exists = actionForm.procedures?.find(p => p.code === code);
        if (!exists) {
            setActionForm(prev => ({
                ...prev,
                procedures: [...(prev.procedures || []), { code, name }]
            }));
        }
        setIsSigtapModalOpen(false);
    };

    const handleRemoveProcedure = (index: number) => {
        const updated = [...(actionForm.procedures || [])];
        updated.splice(index, 1);
        setActionForm(prev => ({ ...prev, procedures: updated }));
    };

    // --- PRODUCTION ---

    const handleOpenProduction = async (action: Action) => {
        setSelectedAction(action);
        setProductionForm({
            patient: { name: '', cns: '', cpf: '', birthDate: '', sex: 'M' },
            competence: new Date().toISOString().slice(0, 7).replace('-', ''),
            actionId: action.id
        });

        // Load history
        if (action.id && claims?.entityId) {
            const hist = await fetchActionProduction(claims.entityId, action.id);
            setProductionHistory(hist);
        }

        setIsProductionModalOpen(true);
    };

    const handleRegisterProduction = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Procedure and Patient Name are strictly required
        if (!selectedAction || !productionForm.procedureCode || !productionForm.patient?.name) {
            alert("Preencha o Nome do Paciente e selecione o procedimento.");
            return;
        }

        // Validation: At least one ID (CNS or CPF) is required
        if (!productionForm.patient?.cns && !productionForm.patient?.cpf) {
            alert("Informe o CNS ou o CPF do paciente.");
            return;
        }

        // Validation: CNS length (15 digits) if provided
        if (productionForm.patient.cns && productionForm.patient.cns.length !== 15) {
            alert("O CNS deve conter exatamente 15 dígitos.");
            return;
        }

        try {
            await registerProduction(
                selectedAction.id!,
                selectedAction.entityId,
                selectedAction.municipalityId,
                productionForm as ActionProduction
            );

            // Refresh history
            const hist = await fetchActionProduction(selectedAction.entityId, selectedAction.id!);
            setProductionHistory(hist);

            // Reset form but keep competence and clear patient data
            setProductionForm(prev => ({
                ...prev,
                patient: { name: '', cns: '', cpf: '', birthDate: '', sex: '' }, // Sex removed/empty
                procedureCode: '' // Should we keep procedure? User didn't specify, but cleared is safer for bulk entry of different procs.
            }));

            // Optional: Toast or simple visual feedback instead of alert for speed? 
            // Keeping alert for now as per current pattern, but could optimize later.
            alert("Produção registrada!");
        } catch (error) {
            alert("Erro ao registrar: " + error);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ações e Programas</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie campanhas e atividades externas.</p>
                </div>
                {claims?.role === 'MASTER' && (
                    <Button onClick={() => handleOpenActionModal()} variant="secondary" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Nova Ação
                    </Button>
                )}
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {actions.map(action => (
                    <Card key={action.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:bg-gray-800/90 dark:backdrop-blur-sm border-t-4 border-t-emerald-500">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate" title={action.name}>
                                        {action.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1 truncate">
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{action.municipalityName || 'Local não informado'}</span>
                                    </p>
                                </div>
                                <div className="flex flex-col items-end shrink-0">
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full mb-1 border border-emerald-200 dark:border-emerald-800">
                                        {new Date(action.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="flex flex-col p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 transition-colors group-hover:bg-gray-100 dark:group-hover:bg-gray-700">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                                        <Users className="w-3.5 h-3.5" /> Profissionais
                                    </span>
                                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                                        {action.professionals.length}
                                    </span>
                                </div>
                                <div className="flex flex-col p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 transition-colors group-hover:bg-gray-100 dark:group-hover:bg-gray-700">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                                        <Stethoscope className="w-3.5 h-3.5" /> Procedimentos
                                    </span>
                                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                                        {action.procedures.length}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <Button
                                    onClick={() => handleOpenProduction(action)}
                                    variant="primary"
                                    className="flex-1 text-xs shadow-sm hover:shadow-md transition-all active:scale-95"
                                >
                                    <Activity className="w-3.5 h-3.5 mr-2" /> Produção
                                </Button>
                                {claims?.role === 'MASTER' && (
                                    <>
                                        <button
                                            onClick={() => handleOpenActionModal(action)}
                                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAction(action)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {actions.length === 0 && (
                <div className="text-center py-16 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white">Nenhuma ação registrada</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                        Crie campanhas ou atividades externas para registrar a produção da sua equipe.
                    </p>
                    {claims?.role === 'MASTER' && (
                        <Button onClick={() => handleOpenActionModal()} variant="secondary" className="mt-6">
                            Criar Primeira Ação
                        </Button>
                    )}
                </div>
            )}

            {/* Modal: Create/Edit Action */}
            <Modal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                title={editingActionId ? "Editar Ação" : "Nova Ação / Campanha"}
            >
                <form onSubmit={handleSaveAction} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Input
                            label="Nome da Ação"
                            className="md:col-span-2"
                            value={actionForm.name || ''}
                            onChange={e => setActionForm({ ...actionForm, name: e.target.value })}
                            placeholder="Ex: Campanha de vacinação, Atendimento domiciliar..."
                            required
                        />
                        <Input
                            label="Data de Realização"
                            type="date"
                            value={actionForm.date || ''}
                            onChange={e => setActionForm({ ...actionForm, date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-emerald-500" /> Local de Realização
                            </label>
                            <button
                                type="button"
                                onClick={() => setCustomLocationMode(!customLocationMode)}
                                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline flex items-center gap-1"
                            >
                                <Edit2 className="w-3 h-3" />
                                {customLocationMode ? "Selecionar Município Vinculado" : "Digitar Outro Local"}
                            </button>
                        </div>

                        {customLocationMode ? (
                            <Input
                                label=""
                                placeholder="Digite o nome do local (Ex: Praça Central, Escola...)"
                                value={actionForm.municipalityName || ''}
                                onChange={e => setActionForm({ ...actionForm, municipalityName: e.target.value })}
                                autoFocus
                            />
                        ) : (
                            <Select
                                label=""
                                value={actionForm.municipalityId || ''}
                                onChange={e => setActionForm({ ...actionForm, municipalityId: e.target.value })}
                            >
                                <option value="">Selecione um município...</option>
                                {municipalities.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </Select>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
                            {customLocationMode ? "Este local será salvo apenas como texto." : "Os dados serão sincronizados com o painel do município selecionado."}
                        </p>
                    </div>

                    {/* Professionals Section */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Equipe Envolvida</label>
                            <button type="button" onClick={() => setManualProfessionalMode(!manualProfessionalMode)} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                                {manualProfessionalMode ? "Selecionar da Lista" : "Adicionar Manualmente"}
                            </button>
                        </div>

                        {manualProfessionalMode ? (
                            <div className="flex gap-2 items-end bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                                <Input label="" placeholder="Nome" value={manualProfForm.name} onChange={e => setManualProfForm({ ...manualProfForm, name: e.target.value })} containerClassName="flex-1 mb-0" className="mb-0" />
                                <Input label="" placeholder="CNS" value={manualProfForm.cns} onChange={e => setManualProfForm({ ...manualProfForm, cns: e.target.value })} containerClassName="w-32 mb-0" className="mb-0" />
                                <Input label="" placeholder="CBO" value={manualProfForm.occupation} onChange={e => setManualProfForm({ ...manualProfForm, occupation: e.target.value })} containerClassName="w-24 mb-0" className="mb-0" />
                                <Button type="button" onClick={handleManualProfSubmit} size="sm" className="mb-0 px-3">OK</Button>
                            </div>
                        ) : (
                            <Select
                                label=""
                                value=""
                                onChange={handleAddProfessional}
                            >
                                <option value="">Adicionar Profissional...</option>
                                {professionals.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </Select>
                        )}

                        <div className="flex flex-wrap gap-2 mt-3 min-h-[40px] p-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                            {actionForm.professionals?.length === 0 && (
                                <span className="text-xs text-gray-400 w-full text-center py-2">Nenhum profissional selecionado</span>
                            )}
                            {actionForm.professionals?.map((p, i) => (
                                <Badge key={i} type="neutral" className="pr-1 flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-200">{p.name}</span>
                                    <span className="opacity-60 text-[10px] text-gray-500 dark:text-gray-400 border-l border-gray-300 dark:border-gray-600 pl-1 ml-1">
                                        {p.occupation}
                                    </span>
                                    <div
                                        className="ml-1 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
                                        onClick={() => handleRemoveProfessional(i)}
                                    >
                                        <X className="w-3 h-3" />
                                    </div>
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Procedures Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Procedimentos Realizados</label>
                        <Button type="button" variant="outline" className="w-full text-left justify-start border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400" onClick={() => setIsSigtapModalOpen(true)}>
                            <Search className="w-4 h-4 mr-2" /> Buscar e Adicionar do SIGTAP...
                        </Button>

                        <div className="space-y-2 mt-3 max-h-48 overflow-y-auto custom-scrollbar">
                            {actionForm.procedures?.length === 0 && (
                                <div className="text-center py-4 text-xs text-gray-500 dark:text-gray-400 italic">
                                    Nenhum procedimento adicionado ainda.
                                </div>
                            )}
                            {actionForm.procedures?.map((proc, i) => (
                                <div key={i} className="flex justify-between items-center text-sm p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm group hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-colors">
                                    <span className="truncate flex-1 text-gray-700 dark:text-gray-200" title={proc.name}>
                                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded text-xs mr-2">
                                            {proc.code}
                                        </strong>
                                        {proc.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveProcedure(i)}
                                        className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors p-1"
                                        title="Remover"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="outline" onClick={() => setIsActionModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="secondary">Salvar Ação</Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Production */}
            <Modal
                isOpen={isProductionModalOpen}
                onClose={() => setIsProductionModalOpen(false)}
                title={`Registrar Produção: ${selectedAction?.name}`}
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Form Side */}
                    <form onSubmit={handleRegisterProduction} className="space-y-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg text-sm text-emerald-800 dark:text-emerald-200 mb-4 border border-emerald-100 dark:border-emerald-800/50">
                            Lançamento Simplificado: Preencha os dados do paciente para vincular ao procedimento.
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Competência"
                                placeholder="YYYYMM"
                                value={productionForm.competence || ''}
                                onChange={e => setProductionForm({ ...productionForm, competence: e.target.value })}
                                maxLength={6}
                                required
                                className="dark:text-white dark:bg-gray-800"
                            />
                            <Select
                                label="Procedimento Realizado"
                                value={productionForm.procedureCode || ''}
                                onChange={e => setProductionForm({ ...productionForm, procedureCode: e.target.value })}
                                required
                                className="dark:text-white dark:bg-gray-800"
                            >
                                <option value="">Selecione...</option>
                                {(selectedAction?.procedures || []).map(p => (
                                    <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="space-y-4 p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                            <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
                                Dados do Paciente
                            </h4>
                            <Input
                                label="Nome Completo"
                                value={productionForm.patient?.name || ''}
                                onChange={e => setProductionForm({ ...productionForm, patient: { ...productionForm.patient!, name: e.target.value } })}
                                required
                                className="dark:text-white dark:bg-gray-800"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="CNS"
                                    value={productionForm.patient?.cns || ''}
                                    onChange={e => setProductionForm({ ...productionForm, patient: { ...productionForm.patient!, cns: e.target.value } })}
                                    maxLength={15}
                                    placeholder="15 dígitos"
                                    className="dark:text-white dark:bg-gray-800"
                                />
                                <Input
                                    label="CPF"
                                    value={productionForm.patient?.cpf || ''}
                                    onChange={e => setProductionForm({ ...productionForm, patient: { ...productionForm.patient!, cpf: e.target.value } })}
                                    maxLength={11}
                                    placeholder="11 dígitos (apenas números)"
                                    className="dark:text-white dark:bg-gray-800"
                                />
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right -mt-2">
                                *Informe pelo menos um (CNS ou CPF)
                            </p>

                            <Input
                                label="Data de Nascimento"
                                type="date"
                                value={productionForm.patient?.birthDate || ''}
                                onChange={e => setProductionForm({ ...productionForm, patient: { ...productionForm.patient!, birthDate: e.target.value } })}
                                className="dark:text-white dark:bg-gray-800 w-full"
                            />
                        </div>

                        <Button type="submit" variant="secondary" className="w-full h-10 font-bold shadow-md hover:shadow-lg transition-all">
                            Registrar Atendimento
                        </Button>
                    </form>

                    {/* History Side */}
                    <div className="border-l border-gray-100 dark:border-gray-700 pl-8 hidden lg:block">
                        <h4 className="font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200">
                            <FileText className="w-4 h-4" /> Últimos Registros
                        </h4>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {productionHistory.map(prod => (
                                <div key={prod.id} className="text-sm p-3 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                                    <p className="font-bold text-gray-900 dark:text-white truncate" title={prod.patient.name}>
                                        {prod.patient.name}
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">CNS:</span> {prod.patient.cns || '-'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">CPF:</span> {prod.patient.cpf || '-'}
                                        </span>
                                        <span className="flex items-center gap-1 col-span-2">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Nascimento:</span>
                                            {prod.patient.birthDate ? new Date(prod.patient.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                                        </span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
                                        <span className="text-xs font-mono bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                                            {prod.procedureCode}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {prod.createdAt ? new Date(prod.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : '-'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {productionHistory.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-gray-400 dark:text-gray-600 italic text-sm">Nenhum registro encontrado.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            <SigtapBrowserModal
                isOpen={isSigtapModalOpen}
                onClose={() => setIsSigtapModalOpen(false)}
                onSelect={handleAddProcedure}
            />
        </div>
    );
};

export default ActionsAndPrograms;
