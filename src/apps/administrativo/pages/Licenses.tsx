import React, { useState, useMemo } from 'react';
import { Card, Button, Badge, Modal, Select, Input, Tooltip, CollapsibleSection, Switch } from '../components/Common';
import { FileText, AlertCircle, CheckCircle, Calendar, Users, Map, Clock, DollarSign, Info, Calculator, Plus, Receipt, Upload, AlertTriangle, Download, Building2, Briefcase, RefreshCw, Trash2, Edit2, X } from 'lucide-react';
import { LicenseStatus, EntityType, License, PaymentStatus, Installment } from '../types';
import {
    fetchAllLicenses,
    createLicense,
    updateLicense,
    deleteLicense,
    addInstallments,
    markInstallmentAsPaid,
    updateInstallment,
    deleteInstallment,
    fetchInstallments
} from '../services/licensesService';
import { fetchAllEntities, AdminEntity } from '../services/entitiesService';
import { fetchAllMunicipalities } from '../services/municipalitiesService';

// Initial Form State
const INITIAL_FORM_STATE = {
    id: '',
    entityType: '',
    entityId: '',
    valuePerMunicipality: '',
    startDate: '',
    endDate: '',
};

const Licenses: React.FC = () => {
    const [licenses, setLicenses] = useState<License[]>([]);
    const [entities, setEntities] = useState<AdminEntity[]>([]);
    const [municipalitiesCount, setMunicipalitiesCount] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    // Load Data
    React.useEffect(() => {
        const loadData = async () => {
            try {
                const [lics, ents, munis] = await Promise.all([
                    fetchAllLicenses(),
                    fetchAllEntities(),
                    fetchAllMunicipalities()
                ]);
                setLicenses(lics);


                setEntities(ents);

                // Calculate municipalities count per entity
                const counts: Record<string, number> = {};
                munis.forEach(m => {
                    if (m.linkedEntityId) {
                        counts[m.linkedEntityId] = (counts[m.linkedEntityId] || 0) + 1;
                    }
                });
                setMunicipalitiesCount(counts);
            } catch (error) {
                console.error("Error loading licenses data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Section Collapse State
    const [isPublicOpen, setIsPublicOpen] = useState(true);
    const [isPrivateOpen, setIsPrivateOpen] = useState(true);

    // Creation Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);

    // Financial Management Modal State
    const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
    const [selectedLicense, setSelectedLicense] = useState<License | null>(null);

    // Renewal Modal State
    const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
    const [renewFormData, setRenewFormData] = useState({ startDate: '', endDate: '' });

    // Edit License State
    const [isEditing, setIsEditing] = useState(false);

    // Edit Installment State
    const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);
    const [editInstallmentData, setEditInstallmentData] = useState<{ amount: string, dueDate: string }>({ amount: '', dueDate: '' });

    // Financial Generation State
    const [genInstallmentsCount, setGenInstallmentsCount] = useState<number>(12);
    const [genFirstDueDate, setGenFirstDueDate] = useState<string>('');

    // --- HELPERS ---
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
    };

    // --- FILTERING & GROUPING ---
    const publicLicenses = licenses.filter(l => l.entityType === EntityType.PUBLIC);
    const privateLicenses = licenses.filter(l => l.entityType === EntityType.PRIVATE);

    // --- DERIVED STATE FOR CALCULATIONS (CREATION) ---

    const availableEntities = useMemo(() => {
        if (!formData.entityType) return [];
        return entities.filter(e => e.type === formData.entityType && e.status === 'ACTIVE');
    }, [formData.entityType, entities]);

    const linkedMunicipalitiesCount = useMemo(() => {
        if (!formData.entityId) return 0;
        return municipalitiesCount[formData.entityId] || 0;
    }, [formData.entityId, municipalitiesCount]);

    const financials = useMemo(() => {
        const value = parseFloat(formData.valuePerMunicipality) || 0;
        const count = linkedMunicipalitiesCount || 0;
        const monthlyTotal = value * (count > 0 ? count : 1);
        const annualTotal = monthlyTotal * 12;
        return {
            monthly: monthlyTotal,
            annual: annualTotal,
            count: count
        };
    }, [formData.valuePerMunicipality, linkedMunicipalitiesCount]);

    // --- HANDLERS ---

    const handleNewLicense = () => {
        const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
        const newId = `LIC-${new Date().getFullYear()}-${randomSuffix}`;
        setFormData({ ...INITIAL_FORM_STATE, id: newId });
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            if (field === 'entityType') newData.entityId = '';
            return newData;
        });
    };

    const handleSave = async () => {
        if (!formData.entityId || !formData.startDate || !formData.endDate) {
            alert("Preencha os campos obrigatórios.");
            return;
        }

        const selectedEntity = entities.find(e => e.id === formData.entityId);

        try {
            if (isEditing) {
                await updateLicense(formData.id, {
                    entityId: formData.entityId,
                    entityName: selectedEntity?.name || 'Entidade Desconhecida',
                    entityType: formData.entityType === 'PUBLIC' ? EntityType.PUBLIC : EntityType.PRIVATE,
                    totalMunicipalities: financials.count,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    monthlyValue: financials.monthly,
                    annualValue: financials.annual,
                    valuePerMunicipality: parseFloat(formData.valuePerMunicipality) || 0,
                    limitUsers: financials.count * 10,
                });

                setLicenses(prev => prev.map(l => l.id === formData.id ? {
                    ...l,
                    entityId: formData.entityId,
                    entityName: selectedEntity?.name || 'Entidade Desconhecida',
                    entityType: formData.entityType === 'PUBLIC' ? EntityType.PUBLIC : EntityType.PRIVATE,
                    totalMunicipalities: financials.count,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    monthlyValue: financials.monthly,
                    annualValue: financials.annual,
                    valuePerMunicipality: parseFloat(formData.valuePerMunicipality) || 0,
                    limitUsers: financials.count * 10,
                } : l));
            } else {
                const newLicenseInput = {
                    id: formData.id, // Use the ID from form data
                    entityId: formData.entityId,
                    entityName: selectedEntity?.name || 'Entidade Desconhecida',
                    entityType: formData.entityType === 'PUBLIC' ? EntityType.PUBLIC : EntityType.PRIVATE,
                    totalMunicipalities: financials.count,
                    status: LicenseStatus.ACTIVE,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    monthlyValue: financials.monthly,
                    annualValue: financials.annual,
                    valuePerMunicipality: parseFloat(formData.valuePerMunicipality) || 0,
                    limitUsers: financials.count * 10, // Legacy/Derived
                };

                const createdLicense = await createLicense(newLicenseInput);
                setLicenses(prev => [createdLicense, ...prev]);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving license:", error);
            alert("Erro ao salvar licença.");
        }
    };

    const handleOpenFinancial = async (lic: License) => {
        setSelectedLicense(lic);
        setGenFirstDueDate(lic.startDate);
        setIsFinancialModalOpen(true);

        // Fetch fresh installments
        try {
            const installments = await fetchInstallments(lic.id);
            setSelectedLicense(prev => prev ? { ...prev, installments } : null);
        } catch (error) {
            console.error("Error fetching installments:", error);
        }
    };

    // --- TOGGLE STATUS HANDLER ---
    const handleToggleStatus = async (license: License) => {
        let newStatus: LicenseStatus;

        if (license.status === LicenseStatus.INACTIVE) {
            const today = new Date();
            const end = new Date(license.endDate);
            today.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            if (today > end) {
                newStatus = LicenseStatus.EXPIRED;
            } else {
                newStatus = LicenseStatus.ACTIVE;
            }
        } else {
            newStatus = LicenseStatus.INACTIVE;
        }

        try {
            await updateLicense(license.id, { status: newStatus });
            setLicenses(prev => prev.map(l => l.id === license.id ? { ...l, status: newStatus } : l));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Erro ao atualizar status.");
        }
    };

    // --- RENEW HANDLERS ---
    const handleOpenRenew = (license: License) => {
        setSelectedLicense(license);
        setRenewFormData({
            startDate: license.startDate,
            endDate: license.endDate
        });
        setIsRenewModalOpen(true);
    };

    const handleSaveRenewal = async () => {
        if (!selectedLicense || !renewFormData.startDate || !renewFormData.endDate) return;

        try {
            await updateLicense(selectedLicense.id, {
                startDate: renewFormData.startDate,
                endDate: renewFormData.endDate,
                status: LicenseStatus.ACTIVE
            });

            setLicenses(prev => prev.map(l => {
                if (l.id === selectedLicense.id) {
                    return {
                        ...l,
                        startDate: renewFormData.startDate,
                        endDate: renewFormData.endDate,
                        status: LicenseStatus.ACTIVE
                    };
                }
                return l;
            }));
            setIsRenewModalOpen(false);
        } catch (error) {
            console.error("Error renewing license:", error);
            alert("Erro ao renovar licença.");
        }
    };

    // --- EDIT LICENSE HANDLER ---
    const handleOpenEditLicense = (license: License) => {
        const calculatedValuePerMunicipality = license.totalMunicipalities > 0
            ? (license.monthlyValue / license.totalMunicipalities).toFixed(2)
            : '0';

        setFormData({
            id: license.id,
            entityType: license.entityType === EntityType.PUBLIC ? 'PUBLIC' : 'PRIVATE',
            entityId: license.entityId,
            valuePerMunicipality: calculatedValuePerMunicipality,
            startDate: license.startDate,
            endDate: license.endDate
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    // --- EDIT INSTALLMENT HANDLER ---
    const handleStartEditInstallment = (inst: Installment) => {
        setEditingInstallmentId(inst.id);
        setEditInstallmentData({
            amount: inst.amount.toString(),
            dueDate: inst.dueDate
        });
    };

    const handleSaveEditInstallment = async (instId: string) => {
        if (!selectedLicense) return;
        try {
            const amount = parseFloat(editInstallmentData.amount);
            if (isNaN(amount)) {
                alert("Valor inválido");
                return;
            }

            await updateInstallment(selectedLicense.id, instId, {
                amount: amount,
                dueDate: editInstallmentData.dueDate
            });

            const updatedInstallments = selectedLicense.installments?.map(i => {
                if (i.id === instId) {
                    return { ...i, amount, dueDate: editInstallmentData.dueDate };
                }
                return i;
            });

            const updatedLicense = { ...selectedLicense, installments: updatedInstallments };
            setLicenses(prev => prev.map(l => l.id === selectedLicense.id ? updatedLicense : l));
            setSelectedLicense(updatedLicense);
            setEditingInstallmentId(null);
        } catch (error) {
            console.error("Error updating installment:", error);
            alert("Erro ao atualizar parcela.");
        }
    };

    // --- FINANCIAL LOGIC ---

    // --- DELETE LICENSE HANDLER ---
    const handleDeleteLicense = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir esta licença? Esta ação não pode ser desfeita.")) {
            try {
                await deleteLicense(id);
                setLicenses(prev => prev.filter(l => l.id !== id));
            } catch (error) {
                console.error("Error deleting license:", error);
                alert("Erro ao excluir licença.");
            }
        }
    };

    // --- FINANCIAL LOGIC ---

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const getDynamicStatus = (inst: Installment): PaymentStatus => {
        if (inst.paid) return PaymentStatus.PAID;
        // Parse date manually to avoid timezone issues
        const [y, m, d] = inst.dueDate.split('-').map(Number);
        const due = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (today > due) return PaymentStatus.OVERDUE;
        return PaymentStatus.PENDING;
    };

    const handleGenerateInstallments = async () => {
        if (!selectedLicense) return;

        const annualTotal = (selectedLicense.annualValue || 0);
        const installmentValue = annualTotal / genInstallmentsCount;
        const newInstallments: Omit<Installment, 'id'>[] = [];

        // Fix date parsing to avoid timezone offset issues
        const [y, m, d] = genFirstDueDate.split('-').map(Number);
        let currentDate = new Date(y, m - 1, d);

        for (let i = 1; i <= genInstallmentsCount; i++) {
            if (i > 1) {
                currentDate.setMonth(currentDate.getMonth() + 1);
            }

            // Format manually to YYYY-MM-DD to preserve local date
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const dueDateStr = `${year}-${month}-${day}`;

            newInstallments.push({
                number: i,
                dueDate: dueDateStr,
                amount: installmentValue,
                paid: false
            });
        }

        try {
            await addInstallments(selectedLicense.id, newInstallments);
            // Refresh installments
            const updatedInstallments = await fetchInstallments(selectedLicense.id);
            const updatedLicense = { ...selectedLicense, installments: updatedInstallments };

            setLicenses(prev => prev.map(l => l.id === selectedLicense.id ? updatedLicense : l));
            setSelectedLicense(updatedLicense);
        } catch (error) {
            console.error("Error generating installments:", error);
            alert("Erro ao gerar parcelas.");
        }
    };

    const handleDeleteInstallment = async (instId: string) => {
        if (!selectedLicense) return;
        if (confirm("Excluir esta parcela?")) {
            try {
                await deleteInstallment(selectedLicense.id, instId);
                const updatedInstallments = selectedLicense.installments?.filter(i => i.id !== instId);
                const updatedLicense = { ...selectedLicense, installments: updatedInstallments };
                setLicenses(prev => prev.map(l => l.id === selectedLicense.id ? updatedLicense : l));
                setSelectedLicense(updatedLicense);
            } catch (error) {
                console.error("Error deleting installment:", error);
                alert("Erro ao excluir parcela.");
            }
        }
    };

    const handleUploadReceipt = (installmentId: string) => {
        // Simulate file upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && selectedLicense) {
                try {
                    await markInstallmentAsPaid(selectedLicense.id, installmentId);

                    // Update local state
                    const updatedInstallments = selectedLicense.installments?.map(inst => {
                        if (inst.id === installmentId) {
                            return {
                                ...inst,
                                paid: true,
                                paidAt: new Date().toISOString().split('T')[0],
                                receiptUrl: URL.createObjectURL(file) // Mock URL for now
                            };
                        }
                        return inst;
                    });

                    const updatedLicense = { ...selectedLicense, installments: updatedInstallments };
                    setLicenses(prev => prev.map(l => l.id === selectedLicense.id ? updatedLicense : l));
                    setSelectedLicense(updatedLicense);
                } catch (error) {
                    console.error("Error paying installment:", error);
                    alert("Erro ao pagar parcela.");
                }
            }
        };
        input.click();
    };

    const handleMockNFSe = () => {
        alert("Módulo de emissão de NFS-e será integrado em breve. Ação registrada.");
    };

    // Helper Function to render the Grid of Licenses
    const renderLicenseGrid = (list: License[]) => (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {list.map((lic) => (
                <div key={lic.id} className={`flex flex-col bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${lic.status === LicenseStatus.INACTIVE ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded font-mono text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                    {lic.id}
                                </span>
                                <Tooltip content={lic.status === LicenseStatus.INACTIVE ? 'Ativar Licença' : 'Inativar Licença'}>
                                    <Switch
                                        checked={lic.status !== LicenseStatus.INACTIVE}
                                        onChange={() => handleToggleStatus(lic)}
                                    />
                                </Tooltip>
                                <Tooltip content="Excluir Licença">
                                    <button
                                        onClick={() => handleDeleteLicense(lic.id)}
                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Editar Licença">
                                    <button
                                        onClick={() => handleOpenEditLicense(lic)}
                                        className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                            </div>
                            <Badge variant={lic.status === LicenseStatus.ACTIVE ? 'success' : lic.status === LicenseStatus.EXPIRED ? 'error' : lic.status === LicenseStatus.INACTIVE ? 'neutral' : 'warning'}>
                                {lic.status}
                            </Badge>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1 truncate" title={lic.entityName}>{lic.entityName}</h3>
                        <p className="text-sm text-slate-500">{lic.entityType}</p>
                    </div>

                    {/* Body: Limits */}
                    <div className="p-6 grid grid-cols-2 gap-4 bg-slate-50/50 dark:bg-dark-900/30">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                                <Map className="w-3 h-3" /> Municípios
                            </p>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">{lic.totalMunicipalities}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                                <Map className="w-3 h-3" /> Municípios
                            </p>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">{lic.totalMunicipalities}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> Valor Anual
                            </p>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(lic.annualValue)}</p>
                        </div>
                        {lic.monthlyValue && (
                            <div className="col-span-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" /> Valor Mensal
                                </p>
                                <p className="text-lg font-bold text-corp-600 dark:text-corp-400">{formatCurrency(lic.monthlyValue)}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-6 mt-auto pt-0 space-y-3">
                        <div className="flex items-center gap-3 my-5 p-3 bg-white dark:bg-dark-800 rounded-lg border border-slate-100 dark:border-slate-700">
                            <Clock className="w-5 h-5 text-corp-500" />
                            <div className="flex-1 flex justify-between text-sm">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-400">Início</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(lic.startDate)}</span>
                                </div>
                                <div className="w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                                <div className="flex flex-col text-right">
                                    <span className="text-xs text-slate-400">Fim</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(lic.endDate)}</span>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={() => handleOpenFinancial(lic)}
                            variant="outline"
                            className="w-full justify-center border-corp-200 text-corp-600 hover:bg-corp-50 dark:border-corp-900 dark:text-corp-400 dark:hover:bg-corp-900/20 group"
                            disabled={lic.status === LicenseStatus.INACTIVE}
                        >
                            <DollarSign className="w-4 h-4 mr-2 group-hover:text-corp-700" />
                            Gerenciamento Financeiro
                        </Button>

                        <Button
                            onClick={handleMockNFSe}
                            variant="success"
                            className="w-full justify-center"
                            disabled={lic.status === LicenseStatus.INACTIVE}
                        >
                            <Receipt className="w-4 h-4 mr-2" />
                            Emissão de NFS-e
                        </Button>

                        <Button
                            onClick={() => handleOpenRenew(lic)}
                            variant="primary"
                            className="w-full justify-center"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Renovar Licença
                        </Button>

                        {/* History Section (Simple view for now) */}
                        {lic.history && lic.history.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Histórico Recente</p>
                                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                                    {lic.history.slice(0, 3).map((event, idx) => (
                                        <div key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex gap-2">
                                            <span className="font-mono text-slate-400">{formatDate(event.date)}</span>
                                            <span>{event.description}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Licenças</h1>
                    <p className="text-slate-500">Controle de contratos, valores e vigência.</p>
                </div>
                <Tooltip content="Criar novo contrato de licenciamento">
                    <Button icon={Plus} onClick={handleNewLicense}>Nova Licença</Button>
                </Tooltip>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-l-4 border-l-emerald-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Licenças Ativas</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {licenses.filter(l => l.status === LicenseStatus.ACTIVE).length}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Vencendo em 30 dias</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {licenses.filter(l => {
                                    if (l.status !== LicenseStatus.ACTIVE) return false;
                                    const end = new Date(l.endDate);
                                    const today = new Date();
                                    const diffTime = end.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    return diffDays >= 0 && diffDays <= 30;
                                }).length}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Expiradas</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {licenses.filter(l => l.status === LicenseStatus.EXPIRED).length}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Collapsible Sections */}
            <div className="space-y-6">
                {/* Public Section */}
                <CollapsibleSection
                    title="Licenças - Entidades Públicas"
                    count={publicLicenses.length}
                    isOpen={isPublicOpen}
                    onToggle={() => setIsPublicOpen(!isPublicOpen)}
                    icon={Building2}
                    colorClass="text-blue-500"
                    maxHeight="max-h-[60vh]"
                >
                    {publicLicenses.length > 0 ? (
                        renderLicenseGrid(publicLicenses)
                    ) : (
                        <p className="text-sm text-slate-500 italic">Nenhuma licença ativa para entidades públicas.</p>
                    )}
                </CollapsibleSection>

                {/* Private Section */}
                <CollapsibleSection
                    title="Licenças - Entidades Privadas"
                    count={privateLicenses.length}
                    isOpen={isPrivateOpen}
                    onToggle={() => setIsPrivateOpen(!isPrivateOpen)}
                    icon={Briefcase}
                    colorClass="text-purple-500"
                    maxHeight="max-h-[60vh]"
                >
                    {privateLicenses.length > 0 ? (
                        renderLicenseGrid(privateLicenses)
                    ) : (
                        <p className="text-sm text-slate-500 italic">Nenhuma licença ativa para entidades privadas.</p>
                    )}
                </CollapsibleSection>
            </div>

            {/* --- NEW/EDIT LICENSE MODAL --- */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? "Editar Licença" : "Nova Licença de Uso"}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={!formData.entityId}>
                            {isEditing ? "Salvar Alterações" : "Gerar Licença"}
                        </Button>
                    </>
                }
            >
                {/* ... Content same as before ... */}
                <div className="space-y-8">
                    <div className="flex justify-end">
                        <span className="inline-flex items-center px-3 py-1 rounded-full font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                            ID PREVISTO: {formData.id}
                        </span>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-corp-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center">
                            <FileText className="w-4 h-4 mr-2" /> 1. Vinculação da Entidade
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Select
                                label="Tipo de Entidade"
                                value={formData.entityType}
                                onChange={(e) => handleInputChange('entityType', e.target.value)}
                                options={[
                                    { value: '', label: 'Selecione...' },
                                    { value: 'PUBLIC', label: 'Entidade Pública' },
                                    { value: 'PRIVATE', label: 'Entidade Privada' },
                                ]}
                            />
                            <Select
                                label="Selecione a Entidade"
                                value={formData.entityId}
                                onChange={(e) => handleInputChange('entityId', e.target.value)}
                                disabled={!formData.entityType}
                                options={[
                                    { value: '', label: 'Selecione...' },
                                    ...availableEntities.map(e => ({ value: e.id, label: e.name }))
                                ]}
                            />
                        </div>
                    </div>
                    {formData.entityId && (
                        <div className="space-y-4 animate-fade-in-up">
                            <h4 className="text-sm font-semibold text-corp-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center">
                                <Calculator className="w-4 h-4 mr-2" /> 2. Base de Cálculo
                            </h4>
                            <div className="bg-slate-50 dark:bg-dark-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                        <Map className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">Municípios Vinculados</p>
                                        <p className="text-xs text-slate-500">Base atual de cadastro</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{linkedMunicipalitiesCount}</span>
                                    <span className="text-xs text-slate-500 block">cidades</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor por Município (R$)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-slate-400 text-sm">R$</span>
                                        <input
                                            type="number"
                                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-900 text-slate-900 dark:text-white focus:ring-corp-500 focus:border-corp-500"
                                            placeholder="0,00"
                                            value={formData.valuePerMunicipality}
                                            onChange={(e) => handleInputChange('valuePerMunicipality', e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Valor unitário mensal.</p>
                                </div>
                                <div className="bg-corp-50 dark:bg-corp-900/10 rounded-xl p-4 border border-corp-100 dark:border-corp-800/30">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs font-semibold text-corp-700 dark:text-corp-300 uppercase">Total Mensal</span>
                                        <span className="text-lg font-bold text-corp-700 dark:text-corp-300">{formatCurrency(financials.monthly)}</span>
                                    </div>
                                    <div className="w-full h-px bg-corp-200 dark:bg-corp-800 my-2"></div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-corp-600 dark:text-corp-400">Total Anual (Estimado)</span>
                                        <span className="text-sm font-medium text-corp-600 dark:text-corp-400">{formatCurrency(financials.annual)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-md border border-blue-100 dark:border-blue-800">
                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>
                                    <strong>Atenção:</strong> O valor total da licença é dinâmico. Ele aumentará ou diminuirá automaticamente conforme municípios forem vinculados ou removidos desta entidade na aba "Municípios".
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-corp-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center">
                            <Clock className="w-4 h-4 mr-2" /> 3. Período de Vigência
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Início do Contrato"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => handleInputChange('startDate', e.target.value)}
                            />
                            <Input
                                label="Término do Contrato"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => handleInputChange('endDate', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* --- FINANCIAL MANAGEMENT MODAL --- */}
            <Modal
                isOpen={isFinancialModalOpen}
                onClose={() => setIsFinancialModalOpen(false)}
                title={`Financeiro: ${selectedLicense?.entityName || ''}`}
                footer={<Button onClick={() => setIsFinancialModalOpen(false)}>Fechar</Button>}
            >
                <div className="space-y-8">
                    {/* Configuration Section */}
                    <div className="bg-slate-50 dark:bg-dark-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-corp-500" /> Configurar Parcelamento
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Qtd. Parcelas</label>
                                <input
                                    type="number"
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-950 px-3 py-2"
                                    value={genInstallmentsCount}
                                    onChange={(e) => setGenInstallmentsCount(parseInt(e.target.value))}
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">1ª Data de Pagamento</label>
                                <input
                                    type="date"
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-950 px-3 py-2"
                                    value={genFirstDueDate}
                                    onChange={(e) => setGenFirstDueDate(e.target.value)}
                                />
                            </div>
                            <Button
                                onClick={handleGenerateInstallments}
                                icon={Receipt}
                            >
                                Gerar Parcelas
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            * Gera parcelas baseadas no valor total anual do contrato ({formatCurrency(selectedLicense?.annualValue || 0)}).
                        </p>
                    </div>

                    {/* Installments List */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                            Demonstrativo de Pagamentos
                        </h4>

                        {(!selectedLicense?.installments || selectedLicense.installments.length === 0) ? (
                            <div className="text-center py-8 text-slate-500 bg-white dark:bg-dark-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                                Nenhuma parcela gerada para este contrato. Utilize a configuração acima.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedLicense.installments.map((inst) => {
                                    const currentStatus = getDynamicStatus(inst);
                                    const isEditing = editingInstallmentId === inst.id;

                                    return (
                                        <div key={inst.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-dark-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">

                                            <div className="flex items-center gap-4 mb-3 sm:mb-0">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                                                    {inst.number}
                                                </div>
                                                <div>
                                                    {isEditing ? (
                                                        <div className="flex gap-2 items-center">
                                                            <input
                                                                type="date"
                                                                className="text-sm border rounded px-2 py-1"
                                                                value={editInstallmentData.dueDate}
                                                                onChange={e => setEditInstallmentData({ ...editInstallmentData, dueDate: e.target.value })}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                            Vencimento: {formatDate(inst.dueDate)}
                                                        </p>
                                                    )}

                                                    {isEditing ? (
                                                        <div className="flex gap-2 items-center mt-1">
                                                            <input
                                                                type="number"
                                                                className="text-sm border rounded px-2 py-1 w-24"
                                                                value={editInstallmentData.amount}
                                                                onChange={e => setEditInstallmentData({ ...editInstallmentData, amount: e.target.value })}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                                                            {formatCurrency(inst.amount)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {isEditing ? (
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={() => handleSaveEditInstallment(inst.id)}>Salvar</Button>
                                                        <Button size="sm" variant="outline" onClick={() => setEditingInstallmentId(null)}>Cancelar</Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {currentStatus === PaymentStatus.PAID ? (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                                <CheckCircle className="w-3 h-3 mr-1" /> Pago
                                                            </span>
                                                        ) : currentStatus === PaymentStatus.OVERDUE ? (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                                                <AlertTriangle className="w-3 h-3 mr-1" /> Vencido
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                                                <Clock className="w-3 h-3 mr-1" /> Pendente
                                                            </span>
                                                        )}

                                                        {currentStatus !== PaymentStatus.PAID && (
                                                            <>
                                                                <Tooltip content="Anexar comprovante e marcar como pago">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleUploadReceipt(inst.id)}
                                                                    >
                                                                        <Upload className="w-4 h-4 mr-2" /> Pagar
                                                                    </Button>
                                                                </Tooltip>
                                                                <Tooltip content="Editar Parcela">
                                                                    <button
                                                                        onClick={() => handleStartEditInstallment(inst)}
                                                                        className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                </Tooltip>
                                                                <Tooltip content="Excluir Parcela">
                                                                    <button
                                                                        onClick={() => handleDeleteInstallment(inst.id)}
                                                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </Tooltip>
                                                            </>
                                                        )}
                                                        {currentStatus === PaymentStatus.PAID && (
                                                            <Tooltip content="Ver comprovante">
                                                                <Button size="sm" variant="ghost" className="text-corp-500">
                                                                    <Download className="w-4 h-4" />
                                                                </Button>
                                                            </Tooltip>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* --- RENEW LICENSE MODAL --- */}
            <Modal
                isOpen={isRenewModalOpen}
                onClose={() => setIsRenewModalOpen(false)}
                title="Renovação de Licença"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsRenewModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveRenewal}>Salvar Renovação</Button>
                    </>
                }
            >
                <div className="space-y-6">
                    <div className="p-4 bg-slate-50 dark:bg-dark-900 rounded-lg border border-slate-200 dark:border-slate-700">
                        <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Entidade</label>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">{selectedLicense?.entityName}</p>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-corp-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center">
                            <Clock className="w-4 h-4 mr-2" /> Nova Vigência
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Novo Início"
                                type="date"
                                value={renewFormData.startDate}
                                onChange={(e) => setRenewFormData({ ...renewFormData, startDate: e.target.value })}
                            />
                            <Input
                                label="Novo Término"
                                type="date"
                                value={renewFormData.endDate}
                                onChange={(e) => setRenewFormData({ ...renewFormData, endDate: e.target.value })}
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            Ao confirmar a renovação, o status da licença será automaticamente atualizado para <strong>Ativa</strong>.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Licenses;