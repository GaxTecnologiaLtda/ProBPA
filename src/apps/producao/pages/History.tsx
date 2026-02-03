import React, { useMemo, useState, useEffect } from 'react';
import { ProductionRecord } from '../types';
import { Card, Badge, cn } from '../components/ui/BaseComponents';
import { FileText, Calendar, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context';
import { getProfessionalHistory } from '../services/bpaService';

export const History: React.FC = () => {
    const { user } = useApp();
    const [historyData, setHistoryData] = useState<ProductionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const [selectedRecord, setSelectedRecord] = useState<ProductionRecord | null>(null);

    useEffect(() => {
        async function loadHistory() {
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
        }
        loadHistory();
    }, [user?.id]);

    const toggleGroup = (competence: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [competence]: !prev[competence]
        }));
    };

    // Lógica de Agrupamento por Competência e Dia
    const groupedHistory = useMemo(() => {
        // 1. Garantir ordenação por data (decrescente)
        const sorted = [...historyData].sort((a, b) =>
            new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime()
        );

        // 2. Agrupar por Competência
        const groups: Record<string, Record<string, ProductionRecord[]>> = {};

        sorted.forEach(item => {
            const date = new Date(item.date + 'T12:00:00');
            // Competence: "Maio de 2024"
            const competence = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const formattedComp = competence.charAt(0).toUpperCase() + competence.slice(1);

            // Day Key: "2024-05-20" (ISO for sorting/key)
            const dayKey = item.date;

            if (!groups[formattedComp]) {
                groups[formattedComp] = {};
            }
            if (!groups[formattedComp][dayKey]) {
                groups[formattedComp][dayKey] = [];
            }
            groups[formattedComp][dayKey].push(item);
        });

        return groups;
    }, [historyData]);

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
                    Total Geral: {historyData.length}
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
                                        {Object.values(daysMap).flat().length} registros
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
                                        {Object.entries(daysMap).map(([dayKey, items], dayIndex) => {
                                            const dayDate = new Date(dayKey + 'T12:00:00');
                                            const dayLabel = dayDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                                            const weekDay = dayDate.toLocaleDateString('pt-BR', { weekday: 'long' });

                                            return (
                                                <div key={dayKey} className="ml-2 sm:ml-4 border-l-2 border-gray-100 dark:border-gray-800 pl-4 sm:pl-6 pb-2">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 -ml-[21px] sm:-ml-[29px] ring-4 ring-white dark:ring-gray-900" />
                                                        <span className="font-bold text-gray-700 dark:text-gray-200 capitalize text-sm">
                                                            {weekDay}, {dayLabel}
                                                        </span>
                                                        <span className="text-xs text-gray-400 font-medium bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                            {items.length}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {items.map((item) => (
                                                            <div
                                                                key={item.id}
                                                                onClick={() => setSelectedRecord(item)}
                                                                className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-xl p-3 hover:shadow-md hover:border-medical-200 dark:hover:border-medical-900 transition-all cursor-pointer relative overflow-hidden"
                                                            >
                                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-medical-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700/50 px-1.5 py-0.5 rounded">
                                                                        {item.procedure.code}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-medical-600 dark:text-medical-400 bg-medical-50 dark:bg-medical-900/20 px-1.5 py-0.5 rounded">
                                                                        x{item.quantity}
                                                                    </div>
                                                                </div>

                                                                <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-2 min-h-[2.5em]">
                                                                    {item.procedure.name}
                                                                </h4>

                                                                <div className="flex flex-wrap gap-1">
                                                                    {item.patientCns && (
                                                                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                            CNS {item.patientCns}
                                                                        </span>
                                                                    )}
                                                                    {item.cidCodes && item.cidCodes.length > 0 && (
                                                                        <span className="text-[10px] bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded">
                                                                            CID: {item.cidCodes[0]}{item.cidCodes.length > 1 ? ` +${item.cidCodes.length - 1}` : ''}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })
            )}

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
        </motion.div>
    );
};