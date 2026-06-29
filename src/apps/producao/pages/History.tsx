import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ProductionRecord } from '../types';
import { Card, Badge, cn, Button } from '../components/ui/BaseComponents';
import { FileText, Calendar, ChevronDown, ChevronRight, Loader2, Trash2, Edit, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context';
import { getProfessionalHistory, softDeleteBpaRecord } from '../services/bpaService';
import { useNavigate } from 'react-router-dom';
import { EditAttendanceModal } from '../components/EditAttendanceModal';
export const History: React.FC = () => {
    const { user } = useApp();
    const navigate = useNavigate();
    const [historyData, setHistoryData] = useState<ProductionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const [selectedRecord, setSelectedRecord] = useState<ProductionRecord | null>(null);
    const [selectedPatientGroup, setSelectedPatientGroup] = useState<{ displayName: string, items: ProductionRecord[] } | null>(null);
    const [editingAttendanceGroup, setEditingAttendanceGroup] = useState<ProductionRecord[] | null>(null);
    // Delete Logic State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [recordsToDelete, setRecordsToDelete] = useState<ProductionRecord[]>([]);
    const [deleteJustification, setDeleteJustification] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const loadHistory = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const data = await getProfessionalHistory(user.professionalId || user.id, user.entityId);
            setHistoryData(data);
        } catch (error) {
            console.error("Failed to load history:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.id, user?.professionalId, user?.entityId]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const toggleGroup = (competence: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [competence]: !prev[competence]
        }));
    };

    // Lógica de Agrupamento por Competência, Dia e Paciente
    const groupedHistory = useMemo(() => {
        // 1. Garantir ordenação por data (decrescente)
        const sorted = [...historyData].sort((a, b) =>
            new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime()
        );

        // 2. Agrupar por Competência -> Unidade -> Dia -> Paciente
        const groups: Record<string, Record<string, Record<string, Record<string, ProductionRecord[]>>>> = {};

        sorted.forEach(item => {
            const date = new Date(item.date + 'T12:00:00');
            // Competence: "Maio de 2024"
            const competence = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const formattedComp = competence.charAt(0).toUpperCase() + competence.slice(1);

            // Unit Key: "unitId|unitName"
            const unitName = user?.units?.find(u => u.id === item.unitId)?.name || 'Sem Lotação';
            const unitKey = `${item.unitId}|${unitName}`;

            // Day Key: "2024-05-20" (ISO for sorting/key)
            const dayKey = item.date;
            
            // Patient Key: "CNS-Name" or "Sem Identificação"
            const identifier = item.patientCns || item.patientCpf || "SEM_DOC";
            const patientKey = item.patientName ? `${item.patientName}|${identifier}` : `SEM_NOME|${identifier}`;

            if (!groups[formattedComp]) {
                groups[formattedComp] = {};
            }
            if (!groups[formattedComp][unitKey]) {
                groups[formattedComp][unitKey] = {};
            }
            if (!groups[formattedComp][unitKey][dayKey]) {
                groups[formattedComp][unitKey][dayKey] = {};
            }
            if (!groups[formattedComp][unitKey][dayKey][patientKey]) {
                groups[formattedComp][unitKey][dayKey][patientKey] = [];
            }
            groups[formattedComp][unitKey][dayKey][patientKey].push(item);
        });

        return groups;
    }, [historyData]);

    const handleEdit = (records: ProductionRecord[]) => {
        setSelectedRecord(null);
        setEditingAttendanceGroup(records);
    };

    const handleDeleteClick = (record: ProductionRecord) => {
        setRecordsToDelete([record]);
        setDeleteJustification('');
        setIsDeleteModalOpen(true);
        setSelectedRecord(null); // Close details if open
    };

    const handleDeleteGroupClick = (records: ProductionRecord[]) => {
        // Exclui apenas os não cancelados
        const validRecords = records.filter(r => r.status !== 'canceled');
        if (validRecords.length === 0) return;

        setRecordsToDelete(validRecords);
        setDeleteJustification('');
        setIsDeleteModalOpen(true);
        setSelectedPatientGroup(null); // Close patient list modal if open
    };

    const confirmDelete = async () => {
        if (recordsToDelete.length === 0 || !user || !deleteJustification.trim()) return;

        setIsDeleting(true);
        try {
            // Cancelar em Lote Sequencialmente para evitar sobrecarga excessiva ou concorrência
            for (const record of recordsToDelete) {
                // Context for deletion path reconstruction
                const contextData = {
                    date: record.date,
                    competenceMonth: record.date.substring(0, 7), // YYYY-MM
                    municipalityId: user.municipalityId || '', 
                    entityId: user.entityId,
                    entityType: 'PUBLIC', 
                    unitId: record.unitId,
                    professionalId: user.professionalId || user.id,
                    patientId: record.patientCns ? undefined : undefined 
                };

                await softDeleteBpaRecord(
                    record.id,
                    deleteJustification,
                    {
                        ...contextData,
                        patientId: (record as any).patientId, // Assume it's there hidden
                        firestorePath: record.firestorePath
                    }
                );
            }

            // Update Local State UI
            const deletedIds = new Set(recordsToDelete.map(r => r.id));
            setHistoryData(prev => prev.map(item =>
                deletedIds.has(item.id)
                    ? { ...item, status: 'canceled' as const }
                    : item
            ));

            setIsDeleteModalOpen(false);
            setRecordsToDelete([]);
            
        } catch (error) {
            console.error("Failed to delete records:", error);
            alert("Erro ao excluir o(s) registro(s). Tente novamente.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-medical-500" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Histórico de Produção</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Registro completo de atendimentos.</p>
                </div>
                <div className="text-sm font-medium bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg text-gray-600 dark:text-gray-300">
                    Total Geral: {historyData.filter(r => r.status !== 'canceled').length}
                </div>
            </div>

            {Object.keys(groupedHistory).length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    Nenhum registro encontrado.
                </div>
            ) : (
                Object.entries(groupedHistory).map(([competence, daysMap], groupIndex) => {
                    const isCollapsed = !!collapsedGroups[competence];

                    return (
                        <motion.div
                            key={competence}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: groupIndex * 0.1 }}
                            className="space-y-4"
                        >
                            {/* Cabeçalho da Competência (Clicável) */}
                            <div
                                onClick={() => toggleGroup(competence)}
                                className="flex items-center gap-3 sticky top-16 z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm py-3 px-2 -mx-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer select-none group/header border-b border-gray-200 dark:border-gray-700"
                            >
                                <div className="p-1.5 bg-medical-100 dark:bg-medical-900/30 text-medical-600 dark:text-medical-400 rounded-lg">
                                    <Calendar size={18} />
                                </div>
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white capitalize flex-1">
                                    {competence}
                                </h2>

                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full text-gray-500">
                                        {Object.values(daysMap).flatMap(unitMap => Object.values(unitMap).flatMap(dayMap => Object.values(dayMap).flat())).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)} procedimentos
                                    </span>
                                    <ChevronDown
                                        size={20}
                                        className={cn(
                                            "text-gray-400 group-hover/header:text-gray-600 dark:group-hover/header:text-gray-200 transition-transform duration-200",
                                            isCollapsed && "-rotate-90"
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Lista de Dias e Itens */}
                            <AnimatePresence initial={false}>
                                {!isCollapsed && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden space-y-6"
                                    >
                                        {Object.entries(daysMap as unknown as Record<string, Record<string, Record<string, ProductionRecord[]>>>).map(([unitKey, unitDaysMap], unitIndex) => {
                                            const [unitId, unitName] = unitKey.split('|');
                                            const allItemsInUnit = Object.values(unitDaysMap).flatMap(dayMap => Object.values(dayMap).flat());
                                            const totalItemsInUnit = allItemsInUnit.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

                                            return (
                                                <div key={unitKey} className="space-y-4 pt-2">
                                                    {/* Unit Sub-Header */}
                                                    <div className="flex items-center gap-2 px-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                                        <div className="w-1.5 h-4 bg-medical-500 rounded-full" />
                                                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{unitName}</h3>
                                                        <span className="text-[10px] text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded ml-auto">
                                                            {totalItemsInUnit} proced. nesta unidade
                                                        </span>
                                                    </div>

                                                    <div className="space-y-6">
                                        {Object.entries(unitDaysMap).map(([dayKey, patientsMap], dayIndex) => {
                                            const dayDate = new Date(dayKey + 'T12:00:00');
                                            const dayLabel = dayDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                                            const weekDay = dayDate.toLocaleDateString('pt-BR', { weekday: 'long' });
                                            
                                            // Calcula o total de registros no dia unindo todos os itens dos pacientes e somando as quantidades
                                            const totalItemsInDay = Object.values(patientsMap).flat().reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

                                            return (
                                                <div key={dayKey} className="ml-2 sm:ml-4 border-l-2 border-gray-100 dark:border-gray-800 pl-4 sm:pl-6 pb-2">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 -ml-[21px] sm:-ml-[29px] ring-4 ring-white dark:ring-gray-900" />
                                                        <span className="font-bold text-gray-700 dark:text-gray-200 capitalize text-sm">
                                                            {weekDay}, {dayLabel}
                                                        </span>
                                                        <span className="text-xs text-gray-400 font-medium bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                            {totalItemsInDay} proced.
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {Object.entries(patientsMap).map(([patientKey, _items]) => {
                                                            const items = _items as ProductionRecord[];
                                                            const firstItem = items[0];
                                                            // Se for coletivo ou sem identificação, tentamos exibir de forma amigável
                                                            const isUnidentified = patientKey.startsWith('SEM_NOME|SEM_DOC');
                                                            const patientDisplayName = isUnidentified ? 'Procedimento Não Identificado / Coletivo' : firstItem.patientName || 'Paciente Sem Nome';
                                                            
                                                            const activeItems = items.filter(item => item.status !== 'canceled');
                                                            const canceledItems = items.filter(item => item.status === 'canceled');
                                                            
                                                            const activeQtd = activeItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
                                                            const canceledQtd = canceledItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
                                                            const totalQtd = activeQtd + canceledQtd;

                                                            return (
                                                                <div key={patientKey} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                                    {/* Header do Paciente */}
                                                                    <div className="bg-gray-50/50 dark:bg-gray-900/30 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-1">
                                                                        <div className="flex justify-between items-start">
                                                                            <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">
                                                                                {patientDisplayName}
                                                                            </h3>
                                                                            <Badge variant="neutral" className="px-1.5 py-0 min-w-max text-[10px]">
                                                                                {totalQtd} proced(s) {canceledItems.length > 0 ? `(${activeQtd} ativos, ${canceledQtd} canc.)` : ''}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                                            {firstItem.patientCpf && (
                                                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium font-mono">
                                                                                    CPF {firstItem.patientCpf}
                                                                                </span>
                                                                            )}
                                                                            {firstItem.patientCns && (
                                                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium xl">
                                                                                    CNS {firstItem.patientCns}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Botão Resumo de Procedimentos e Ações */}
                                                                    <div className="flex flex-col sm:flex-row border-t border-gray-100 dark:border-gray-700/50">
                                                                        <div className="flex-1 p-3 flex gap-2 justify-start sm:border-r border-gray-100 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/20">
                                                                            <Button
                                                                                onClick={(e) => { e.stopPropagation(); handleEdit(items); }}
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="flex-1 sm:flex-none gap-2 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                                            >
                                                                                <Edit size={14} />
                                                                                <span className="hidden sm:inline">Editar Atendimento</span>
                                                                                <span className="sm:hidden">Editar</span>
                                                                            </Button>
                                                                            <Button
                                                                                onClick={(e) => { 
                                                                                    e.stopPropagation(); 
                                                                                    handleDeleteGroupClick(items); 
                                                                                }}
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="flex-1 sm:flex-none gap-2 text-xs border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                                <span className="hidden sm:inline">Excluir Tudo</span>
                                                                                <span className="sm:hidden">Excluir</span>
                                                                            </Button>
                                                                        </div>
                                                                        
                                                                        <div 
                                                                            onClick={() => setSelectedPatientGroup({ displayName: patientDisplayName, items })}
                                                                            className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors flex items-center justify-between sm:justify-end gap-3 group flex-shrink-0"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="flex gap-1.5">
                                                                                    <div className="w-8 h-8 rounded-full bg-medical-50 dark:bg-medical-900/20 text-medical-600 dark:text-medical-400 flex items-center justify-center font-bold text-sm" title={`${activeQtd} Ativo(s)`}>
                                                                                        {activeQtd}
                                                                                    </div>
                                                                                    {canceledItems.length > 0 && (
                                                                                        <div className="w-8 h-8 rounded-full border-dashed border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm" title={`${canceledQtd} Cancelado(s)`}>
                                                                                            {canceledQtd}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-tight">
                                                                                        Procedimentos
                                                                                    </span>
                                                                                    {canceledItems.length > 0 && (
                                                                                        <span className="text-[10px] text-gray-400 font-medium leading-tight">
                                                                                            Total: {totalQtd}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <ChevronRight size={18} className="text-gray-400 group-hover:text-medical-500 transition-colors ml-1" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </motion.div>
                                )
                                }
                            </AnimatePresence>
                        </motion.div >
                    );
                })
            )}

            {/* Patient Procedures List Modal */}
            <AnimatePresence>
                {selectedPatientGroup && (
                    <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPatientGroup(null)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl relative overflow-hidden z-10 flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center gap-4 bg-white dark:bg-gray-800">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                                        {selectedPatientGroup.displayName}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Lista de {selectedPatientGroup.items.reduce((s, i) => s + (Number(i.quantity) || 1), 0)} procedimento(s) realizados.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedPatientGroup(null)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <ChevronDown size={24} className="rotate-180" />
                                </button>
                            </div>

                            {/* Procedure List */}
                            <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
                                {selectedPatientGroup.items.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedRecord(item)}
                                        className={cn(
                                            "bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-medical-300 dark:hover:border-medical-800 cursor-pointer transition-all relative overflow-hidden group",
                                            item.status === 'canceled' && "opacity-60 grayscale bg-gray-50 dark:bg-gray-900 border-gray-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute left-0 top-0 bottom-0 w-1 transition-opacity",
                                            item.status === 'canceled' ? "bg-red-400" : "bg-medical-500 opacity-0 group-hover:opacity-100"
                                        )} />
                                        
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="font-mono text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                    {item.procedure.code}
                                                </div>
                                                {item.cidCodes && item.cidCodes.length > 0 && (
                                                    <span className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded font-medium">
                                                        CID: {item.cidCodes[0]}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="text-xs font-bold text-medical-700 dark:text-medical-300 bg-medical-50 dark:bg-medical-900/20 px-2 py-0.5 rounded">
                                                    Qtd: {item.quantity}
                                                </div>
                                                {item.status === 'canceled' && (
                                                    <span className="text-[10px] font-bold text-red-500 border border-red-200 bg-red-50 px-1.5 py-0.5 rounded">
                                                        CANCELADO
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 pr-12">
                                            {item.procedure.name}
                                        </h4>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Details Modal */}
            <AnimatePresence>
                {selectedRecord && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedRecord(null)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg relative overflow-hidden z-10 flex flex-col max-h-[90vh]"
                        >
                            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-mono text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                                            {selectedRecord.procedure.code}
                                        </span>
                                        <Badge variant={selectedRecord.procedure.type === 'BPA-I' ? 'warning' : 'neutral'}>
                                            {selectedRecord.procedure.type}
                                        </Badge>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                                        {selectedRecord.procedure.name}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedRecord(null)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <ChevronDown size={24} className="rotate-180" /> {/* Close icon lookalike or specific X icon if imported */}
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6">
                                {/* Actions Toolbar */}
                                {selectedRecord.status !== 'canceled' && (
                                    <div className="flex gap-3 mb-2">
                                        <Button
                                            onClick={() => handleDeleteClick(selectedRecord)}
                                            variant="outline"
                                            className="flex-1 gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                                        >
                                            <Trash2 size={16} />
                                            Excluir
                                        </Button>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50">
                                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider block mb-1">Data</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {selectedRecord.date.split('-').reverse().join('/')}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50">
                                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider block mb-1">Quantidade</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {selectedRecord.quantity} procedimento(s)
                                        </span>
                                    </div>
                                </div>

                                {(selectedRecord.patientCns || selectedRecord.patientCpf) && (
                                    <div className="p-4 border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl">
                                        <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            Dados do Paciente
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                                            {selectedRecord.patientCns && (
                                                <div>
                                                    <span className="text-xs text-gray-500 block">CNS</span>
                                                    <span className="font-mono text-sm font-medium text-gray-700 dark:text-gray-300">{selectedRecord.patientCns}</span>
                                                </div>
                                            )}
                                            {selectedRecord.patientCpf && (
                                                <div>
                                                    <span className="text-xs text-gray-500 block">CPF</span>
                                                    <span className="font-mono text-sm font-medium text-gray-700 dark:text-gray-300">{selectedRecord.patientCpf}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {selectedRecord.cidCodes && selectedRecord.cidCodes.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">CIDs Registrados</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedRecord.cidCodes.map(cid => (
                                                <span key={cid} className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-md text-xs font-bold border border-orange-100 dark:border-orange-800/30">
                                                    {cid}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedRecord.observations && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Observações</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg italic">
                                            "{selectedRecord.observations}"
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                                <button
                                    onClick={() => setSelectedRecord(null)}
                                    className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                                >
                                    Fechar Detalhes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            {/* DELETE MODAL */}
            <AnimatePresence>
                {
                    isDeleteModalOpen && (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md relative z-10 p-6"
                            >
                                <div className="flex flex-col items-center text-center mb-6">
                                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Confirmar {recordsToDelete.length > 1 ? `Exclusão de ${recordsToDelete.length} Registro(s)` : 'Exclusão de Registro'}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                        {recordsToDelete.length > 1 
                                            ? 'Você está prestes a cancelar estes registros e não poderão ser revertidos para Ativo facilmente.' 
                                            : 'Você está prestes a cancelar este registro. Esta ação não pode ser desfeita facilmente.'}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Justificativa (Obrigatório)
                                        </label>
                                        <textarea
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm p-3 focus:ring-2 focus:ring-red-500 outline-none"
                                            rows={3}
                                            placeholder="Por que este registro está sendo excluído?"
                                            value={deleteJustification}
                                            onChange={e => setDeleteJustification(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setIsDeleteModalOpen(false)}
                                            disabled={isDeleting}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white border-transparent"
                                            onClick={confirmDelete}
                                            disabled={!deleteJustification.trim() || isDeleting}
                                            isLoading={isDeleting}
                                        >
                                            Confirmar Exclusão
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            <EditAttendanceModal
                isOpen={!!editingAttendanceGroup}
                onClose={() => setEditingAttendanceGroup(null)}
                attendanceRecords={editingAttendanceGroup || []}
                onSaveSuccess={() => {
                    setEditingAttendanceGroup(null);
                    loadHistory();
                }}
            />
        </motion.div >
    );
};