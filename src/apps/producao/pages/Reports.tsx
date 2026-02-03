import React, { useState, useEffect } from 'react';
import { Card, Button, cn, Badge } from '../components/ui/BaseComponents';
import { MOCK_HISTORY, MOCK_USER } from '../constants';
import { Download, Filter, Table, FileSpreadsheet, User, X, FileText, FileType, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvailableCompetences } from '../services/sigtapLookupService';
import { useApp } from '../context';
import {
    loadBpaIRecords,
    clearPreviousConsolidated,
    generateConsolidated,
    getConsolidated,
    BpaConsolidatedRecord
} from '../services/bpaConsolidationService';
import { loadBpaIForCompetence, prepareBpaIExportData } from '../services/bpaIService';
import { exportReport } from '../services/bpaExportService';

export const Reports: React.FC = () => {
    const { user } = useApp();
    const [activeTab, setActiveTab] = useState<'bpai' | 'bpac'>('bpac');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedUnit, setSelectedUnit] = useState(user?.units?.[0]?.id || '');
    const [availableCompetences, setAvailableCompetences] = useState<{ competence: string; label: string }[]>([]);

    // BPA-C State
    const [consolidatedData, setConsolidatedData] = useState<BpaConsolidatedRecord[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // BPA-I State
    const [bpaIRecords, setBpaIRecords] = useState<any[]>([]);
    const [isLoadingBpaI, setIsLoadingBpaI] = useState(false);
    const [bpaIError, setBpaIError] = useState<string | null>(null);

    // Export State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportType, setExportType] = useState<'bpac' | 'bpai'>('bpac');
    const [exportFormat, setExportFormat] = useState<'pdf' | 'xlsx' | 'txt' | 'csv'>('pdf');
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);

    // Update selected unit if user loads later
    useEffect(() => {
        if (user?.units?.length && !selectedUnit) {
            setSelectedUnit(user.units[0].id);
        }
    }, [user, selectedUnit]);

    // Load Competences
    useEffect(() => {
        async function loadCompetences() {
            const comps = await getAvailableCompetences();
            setAvailableCompetences(comps);
            if (comps.length > 0 && !selectedMonth) {
                // Default to the most recent one
                setSelectedMonth(comps[0].competence); // e.g., "202511"
            }
        }
        loadCompetences();
    }, []);

    // Load Data when Tab or Month changes
    useEffect(() => {
        if (activeTab === 'bpac' && selectedMonth) {
            loadConsolidatedData();
        } else if (activeTab === 'bpai' && selectedMonth) {
            // Optional: Auto-load BPA-I or wait for button click?
            // The prompt says "Integrar botão 'Carregar BPA-I'... O botão deve chamar loadBpaI()".
            // So we might NOT auto-load, or we can auto-load for better UX.
            // Given the explicit instruction for the button to call it, I'll rely on the button or initial load.
            // Let's auto-load for convenience but keep the button for refresh.
            loadBpaI();
        }
    }, [activeTab, selectedMonth]);

    // Sync export type with active tab when opening modal
    useEffect(() => {
        if (isExportModalOpen) {
            setExportType(activeTab);
            setExportSuccess(false);
        }
    }, [isExportModalOpen, activeTab]);

    const loadConsolidatedData = async () => {
        setIsLoadingData(true);
        try {
            const formattedMonth = selectedMonth.length === 6
                ? `${selectedMonth.substring(0, 4)}-${selectedMonth.substring(4, 6)}`
                : selectedMonth;

            const data = await getConsolidated(formattedMonth);
            setConsolidatedData(data);
        } catch (error) {
            console.error("Error loading consolidated data:", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const loadBpaI = async () => {
        if (!selectedMonth || !user) return;
        setIsLoadingBpaI(true);
        setBpaIError(null);
        try {
            const formattedMonth = selectedMonth.length === 6
                ? `${selectedMonth.substring(0, 4)}-${selectedMonth.substring(4, 6)}`
                : selectedMonth;

            const records = await loadBpaIForCompetence(formattedMonth, user);
            setBpaIRecords(records);
        } catch (error) {
            console.error("Error loading BPA-I data:", error);
            setBpaIError("Erro ao carregar registros BPA-I.");
        } finally {
            setIsLoadingBpaI(false);
        }
    };

    const handleGenerateBpaC = async () => {
        if (!selectedMonth || !user) return;
        setIsGenerating(true);
        try {
            const formattedMonth = selectedMonth.length === 6
                ? `${selectedMonth.substring(0, 4)}-${selectedMonth.substring(4, 6)}`
                : selectedMonth;

            // 1. Load BPA-I
            const records = await loadBpaIRecords(formattedMonth, user);

            // 2. Clear old BPA-C
            await clearPreviousConsolidated(formattedMonth);

            // 3. Generate new BPA-C
            if (records.length > 0) {
                await generateConsolidated(records, formattedMonth);
            }

            // 4. Reload Table
            await loadConsolidatedData();

        } catch (error) {
            console.error("Error generating BPA-C:", error);
            alert("Erro ao gerar BPA-C. Verifique o console.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportReport({
                type: exportType,
                format: exportFormat,
                competence: selectedMonth,
                user,
                unit: user?.units?.find(u => u.id === selectedUnit),
                records: exportType === "bpac" ? consolidatedData : bpaIRecords,
            });

            setExportSuccess(true);
            setTimeout(() => {
                setIsExportModalOpen(false);
                setExportSuccess(false);
            }, 1500);
        } catch (error) {
            console.error("Export error:", error);
            alert("Erro ao gerar arquivo.");
        } finally {
            setIsExporting(false);
        }
    };

    const TabButton = ({ id, label, icon: Icon }: { id: 'bpai' | 'bpac', label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative",
                activeTab === id
                    ? "text-medical-600 dark:text-medical-400"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            )}
        >
            <Icon size={18} />
            {label}
            {activeTab === id && (
                <motion.div
                    layoutId="tabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-medical-600 dark:bg-medical-400"
                />
            )}
        </button>
    );

    // Helper to calculate age (duplicated logic, but kept isolated as requested)
    const getAge = (dob: string, date: string) => {
        if (!dob || !date) return '-';
        const birthDate = new Date(dob);
        const attendDate = new Date(date);
        let age = attendDate.getFullYear() - birthDate.getFullYear();
        const m = attendDate.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && attendDate.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios de Produção</h1>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Filter size={16} className="mr-2" /> Filtros
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setIsExportModalOpen(true)}>
                        <Download size={16} className="mr-2" /> Exportar
                    </Button>
                </div>
            </div>

            {/* Filtros Globais */}
            <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Competência (Mês/Ano)</label>
                    <div className="flex gap-2">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm dark:text-white"
                        >
                            <option value="">Selecione...</option>
                            {availableCompetences.map(comp => (
                                <option key={comp.competence} value={comp.competence}>
                                    {comp.label}
                                </option>
                            ))}
                        </select>

                        {activeTab === 'bpac' && (
                            <Button
                                variant="primary"
                                onClick={handleGenerateBpaC}
                                disabled={isGenerating || !selectedMonth}
                                className="whitespace-nowrap"
                            >
                                {isGenerating ? (
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                ) : (
                                    <RefreshCw size={16} className="mr-2" />
                                )}
                                Gerar BPA-C
                            </Button>
                        )}
                        {activeTab === 'bpai' && (
                            <Button
                                variant="primary"
                                onClick={loadBpaI}
                                disabled={isLoadingBpaI || !selectedMonth}
                                className="whitespace-nowrap"
                            >
                                {isLoadingBpaI ? (
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                ) : (
                                    <RefreshCw size={16} className="mr-2" />
                                )}
                                Carregar BPA-I
                            </Button>
                        )}
                    </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500">Unidade de Saúde</label>
                    <select
                        className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm dark:text-white"
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(e.target.value)}
                    >
                        {user?.units?.map(u => (
                            <option key={u.id} value={u.id}>{u.cnes} - {u.name}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Navegação de Abas */}
            <Card className="overflow-hidden flex border-b border-gray-200 dark:border-gray-700 rounded-b-none">
                <TabButton id="bpac" label="BPA-C (Consolidado)" icon={Table} />
                <TabButton id="bpai" label="BPA-I (Individualizado)" icon={FileSpreadsheet} />
            </Card>

            {/* Conteúdo */}
            <div className="mt-0">
                {activeTab === 'bpac' ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <Card className="overflow-hidden rounded-t-none border-t-0">
                            {/* Header Estilo Formulário SUS */}
                            <div className="bg-gray-100 dark:bg-gray-800/50 p-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Dados Operacionais</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500 block text-xs">Estabelecimento de Saúde</span>
                                        <span className="font-semibold text-gray-900 dark:text-white uppercase">
                                            {user?.units?.find(u => u.id === selectedUnit)?.name || 'UNIDADE DESCONHECIDA'}
                                        </span>
                                        <span className="text-xs text-gray-400 ml-2">CNES: {user?.units?.find(u => u.id === selectedUnit)?.cnes}</span>
                                    </div>
                                    <div className="flex gap-8">
                                        <div>
                                            <span className="text-gray-500 block text-xs">Competência</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {availableCompetences.find(c => c.competence === selectedMonth)?.label || selectedMonth}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs">Folha</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">001</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabela Consolidada */}
                            <div className="overflow-x-auto">
                                {isLoadingData ? (
                                    <div className="flex justify-center items-center py-10">
                                        <Loader2 className="w-8 h-8 animate-spin text-medical-500" />
                                    </div>
                                ) : consolidatedData.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">
                                        Nenhum registro consolidado para esta competência.
                                        <br />
                                        Clique em "Gerar BPA-C" para processar os dados.
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                                            <tr>
                                                <th className="px-4 py-3 w-16 text-center border-r dark:border-gray-700">Seq</th>
                                                <th className="px-4 py-3 border-r dark:border-gray-700">Procedimento</th>
                                                <th className="px-4 py-3 w-32 border-r dark:border-gray-700">CBO</th>
                                                <th className="px-4 py-3 w-20 text-center border-r dark:border-gray-700">Idade</th>
                                                <th className="px-4 py-3 w-24 text-center">Qtd</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {consolidatedData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="px-4 py-3 text-center font-mono text-gray-400 border-r dark:border-gray-700">{idx + 1}</td>
                                                    <td className="px-4 py-3 border-r dark:border-gray-700">
                                                        <div className="font-medium text-gray-900 dark:text-white">{row.procedureCode}</div>
                                                        <div className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-none">{row.procedureName}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 border-r dark:border-gray-700">{row.cbo}</td>
                                                    <td className="px-4 py-3 text-center border-r dark:border-gray-700">{row.age}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-medical-600 dark:text-medical-400">{row.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 dark:bg-gray-800 font-semibold text-gray-900 dark:text-white border-t dark:border-gray-700">
                                            <tr>
                                                <td colSpan={4} className="px-4 py-3 text-right border-r dark:border-gray-700">TOTAL DA FOLHA</td>
                                                <td className="px-4 py-3 text-center text-medical-600 dark:text-medical-400">
                                                    {consolidatedData.reduce((acc, curr) => acc + curr.quantity, 0)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                        </Card>
                        <p className="text-xs text-gray-400 text-center italic">
                            * Dados consolidados gerados automaticamente a partir dos registros individuais.
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <Card className="overflow-hidden rounded-t-none border-t-0">
                            {/* Header Estilo Formulário SUS (Reused) */}
                            <div className="bg-gray-100 dark:bg-gray-800/50 p-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Dados Operacionais (Individualizado)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500 block text-xs">Estabelecimento de Saúde</span>
                                        <span className="font-semibold text-gray-900 dark:text-white uppercase">
                                            {user?.units?.find(u => u.id === selectedUnit)?.name || 'UNIDADE DESCONHECIDA'}
                                        </span>
                                        <span className="text-xs text-gray-400 ml-2">CNES: {user?.units?.find(u => u.id === selectedUnit)?.cnes}</span>
                                    </div>
                                    <div className="flex gap-8">
                                        <div>
                                            <span className="text-gray-500 block text-xs">Competência</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {availableCompetences.find(c => c.competence === selectedMonth)?.label || selectedMonth}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs">Folha</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">001</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabela BPA-I */}
                            <div className="overflow-x-auto">
                                {isLoadingBpaI ? (
                                    <div className="flex justify-center items-center py-10">
                                        <Loader2 className="w-8 h-8 animate-spin text-medical-500" />
                                    </div>
                                ) : bpaIRecords.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">
                                        {bpaIError ? (
                                            <span className="text-red-500">{bpaIError}</span>
                                        ) : (
                                            "Nenhum registro individualizado encontrado para esta competência."
                                        )}
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                                            <tr>
                                                <th className="px-4 py-3 border-r dark:border-gray-700 whitespace-nowrap">Data</th>
                                                <th className="px-4 py-3 border-r dark:border-gray-700 whitespace-nowrap">CNS Paciente</th>
                                                <th className="px-4 py-3 border-r dark:border-gray-700 min-w-[150px]">Paciente</th>
                                                <th className="px-4 py-3 border-r dark:border-gray-700 min-w-[200px]">Procedimento</th>
                                                <th className="px-4 py-3 border-r dark:border-gray-700 text-center">Qtd</th>
                                                <th className="px-4 py-3 border-r dark:border-gray-700">CBO</th>
                                                <th className="px-4 py-3 border-r dark:border-gray-700 text-center">Idade</th>
                                                <th className="px-4 py-3 border-r dark:border-gray-700">Unidade</th>
                                                <th className="px-4 py-3 border-r dark:border-gray-700 min-w-[150px]">Profissional</th>
                                                <th className="px-4 py-3 border-r dark:border-gray-700">CID</th>
                                                <th className="px-4 py-3">Caráter</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {bpaIRecords.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 border-r dark:border-gray-700 whitespace-nowrap">
                                                        {row.attendanceDate ? row.attendanceDate.split('-').reverse().join('/') : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-gray-500 border-r dark:border-gray-700 whitespace-nowrap">
                                                        {row.patientCns || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white border-r dark:border-gray-700">
                                                        {row.patientName}
                                                    </td>
                                                    <td className="px-4 py-3 border-r dark:border-gray-700">
                                                        <div className="font-medium text-gray-900 dark:text-white">{row.procedureCode}</div>
                                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{row.procedureName}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-medical-600 dark:text-medical-400 border-r dark:border-gray-700">
                                                        {row.quantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 border-r dark:border-gray-700">
                                                        {row.cbo}
                                                    </td>
                                                    <td className="px-4 py-3 text-center border-r dark:border-gray-700">
                                                        {getAge(row.patientDob, row.attendanceDate)}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 text-xs border-r dark:border-gray-700">
                                                        {user?.units?.find(u => u.id === row.unitId)?.name || row.unitId}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 border-r dark:border-gray-700 text-xs">
                                                        {row.professionalName}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 border-r dark:border-gray-700 text-xs">
                                                        {row.cidCodes?.join(', ') || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                                                        {row.attendanceCharacter}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </Card>
                        <p className="text-xs text-gray-400 text-center italic">
                            * Registros individualizados carregados diretamente da base de dados.
                        </p>
                    </motion.div>
                )}
            </div>

            {/* Export Modal */}
            <AnimatePresence>
                {isExportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Exportar Relatório</h3>
                                <button
                                    onClick={() => setIsExportModalOpen(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {exportSuccess ? (
                                    <div className="flex flex-col items-center justify-center py-4 space-y-3 text-center animate-in fade-in zoom-in">
                                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                                            <CheckCircle size={32} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Exportação Concluída!</p>
                                            <p className="text-sm text-gray-500">O arquivo foi baixado com sucesso.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Step 1: Select Type */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Relatório</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setExportType('bpac')}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                                                        exportType === 'bpac'
                                                            ? "border-medical-500 bg-medical-50 dark:bg-medical-900/20 text-medical-700 dark:text-medical-400"
                                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-600 dark:text-gray-400"
                                                    )}
                                                >
                                                    <Table size={24} className="mb-2" />
                                                    <span className="text-xs font-bold">BPA-C</span>
                                                    <span className="text-[10px] opacity-70">Consolidado</span>
                                                </button>
                                                <button
                                                    onClick={() => setExportType('bpai')}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                                                        exportType === 'bpai'
                                                            ? "border-medical-500 bg-medical-50 dark:bg-medical-900/20 text-medical-700 dark:text-medical-400"
                                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-600 dark:text-gray-400"
                                                    )}
                                                >
                                                    <FileSpreadsheet size={24} className="mb-2" />
                                                    <span className="text-xs font-bold">BPA-I</span>
                                                    <span className="text-[10px] opacity-70">Individualizado</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Step 2: Select Format */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Formato do Arquivo</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {[
                                                    { id: 'pdf', label: 'PDF', icon: FileType },
                                                    { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
                                                    { id: 'csv', label: 'CSV', icon: FileText },
                                                    { id: 'txt', label: 'TXT', icon: FileText },
                                                ].map((fmt) => (
                                                    <button
                                                        key={fmt.id}
                                                        onClick={() => setExportFormat(fmt.id as any)}
                                                        className={cn(
                                                            "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                                                            exportFormat === fmt.id
                                                                ? "border-medical-500 bg-medical-50 dark:bg-medical-900/20 text-medical-700 dark:text-medical-400"
                                                                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                                                        )}
                                                    >
                                                        <fmt.icon size={18} />
                                                        <span className="text-xs font-semibold">{fmt.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <Button
                                            onClick={handleExport}
                                            className="w-full h-12 mt-2"
                                            disabled={isExporting}
                                        >
                                            {isExporting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Gerando Arquivo...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="mr-2 h-4 w-4" />
                                                    Baixar Relatório
                                                </>
                                            )}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};