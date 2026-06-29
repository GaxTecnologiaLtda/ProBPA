import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Badge, Select } from '../../components/ui/Components';
import { Users, Building2, Calendar, ChevronDown, ChevronRight, Loader2, FileText, Activity, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

interface GlobalProductionHistoryProps {
    entityId: string;
    municipalities: any[];
    competence: string; // e.g. "05/2026"
    day: string; // "all" or "01", "02", etc
}

const GlobalProductionHistory: React.FC<GlobalProductionHistoryProps> = ({
    municipalities,
    competence,
    day
}) => {
    const [localMunicipalityId, setLocalMunicipalityId] = useState<string>('');
    const [historyRecords, setHistoryRecords] = useState<any[]>([]);
    const [serverGroupedHistory, setServerGroupedHistory] = useState<Record<string, Record<string, Record<string, Record<string, any[]>>>>>({});
    const [loading, setLoading] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    // Inicializa o município local com o primeiro da lista, se disponível
    useEffect(() => {
        if (municipalities && municipalities.length > 0 && !localMunicipalityId) {
            setLocalMunicipalityId(municipalities[0].id);
        }
    }, [municipalities, localMunicipalityId]);

    const loadHistory = useCallback(async () => {
        if (!localMunicipalityId || !competence) {
            setHistoryRecords([]);
            setServerGroupedHistory({});
            return;
        }

        setLoading(true);
        try {
            const competenceMonth = competence.includes('/') 
               ? `${competence.split('/')[1]}${competence.split('/')[0]}` 
               : competence;

            const attendanceDate = day !== 'all' 
               ? `${competence.split('/')[1]}-${competence.split('/')[0]}-${day.padStart(2, '0')}`
               : undefined;

            const getHistoryApi = httpsCallable(functions, 'getGlobalProductionHistory');
            
            const response = await getHistoryApi({
                municipalityId: localMunicipalityId,
                competenceMonth,
                attendanceDate,
                searchTerm: ''
            });

            const responseData = response.data as any;
            setHistoryRecords(responseData.history || []);
            setServerGroupedHistory(responseData.groupedHistory || {});
        } catch (error) {
            console.error("Failed to load global history:", error);
        } finally {
            setLoading(false);
        }
    }, [localMunicipalityId, competence, day]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const toggleGroup = (key: string) => {
        setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Filter server-grouped tree (se necessário futuramente) ou apenas repassa
    const groupedHistory = useMemo(() => {
        const filteredGroups: Record<string, Record<string, Record<string, Record<string, any[]>>>> = {};

        for (const [unitKey, profsMap] of Object.entries(serverGroupedHistory)) {
            for (const [profKey, daysMap] of Object.entries(profsMap)) {
                for (const [dayKey, patientsMap] of Object.entries(daysMap)) {
                    for (const [patientKey, records] of Object.entries(patientsMap)) {
                        // Não filtra mais por origem, todos os registros válidos aparecem aqui juntos
                        if (records.length > 0) {
                            if (!filteredGroups[unitKey]) filteredGroups[unitKey] = {};
                            if (!filteredGroups[unitKey][profKey]) filteredGroups[unitKey][profKey] = {};
                            if (!filteredGroups[unitKey][profKey][dayKey]) filteredGroups[unitKey][profKey][dayKey] = {};
                            filteredGroups[unitKey][profKey][dayKey][patientKey] = records;
                        }
                    }
                }
            }
        }

        return filteredGroups;
    }, [serverGroupedHistory]);

    const renderRecords = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                    <p>Buscando produções no servidor...</p>
                </div>
            );
        }

        if (!localMunicipalityId) {
            return (
                <div className="text-center py-16 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    Selecione um município nos filtros acima para visualizar o histórico.
                </div>
            );
        }

        if (Object.keys(groupedHistory).length === 0) {
            return (
                <div className="text-center py-16 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    Nenhum registro encontrado para este filtro.
                </div>
            );
        }

        return Object.entries(groupedHistory).map(([unitKey, profsMap], unitIndex) => {
            const [unitId, unitName] = unitKey.split('|');
            const isUnitCollapsed = !!collapsedGroups[unitKey];
            
            const totalUnitItems = Object.values(profsMap).flatMap(dayMap => 
                Object.values(dayMap).flatMap(patMap => 
                    Object.values(patMap).flat()
                )
            ).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

            return (
                <motion.div
                    key={unitKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: unitIndex * 0.05 }}
                    className="mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm"
                >
                    <div
                        onClick={() => toggleGroup(unitKey)}
                        className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer select-none group border-b border-gray-100 dark:border-gray-700/50"
                    >
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Building2 size={20} />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">
                                {unitName}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {totalUnitItems} procedimento(s) nesta unidade
                            </p>
                        </div>
                        <ChevronDown
                            size={20}
                            className={cn(
                                "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-transform duration-200",
                                isUnitCollapsed && "-rotate-90"
                            )}
                        />
                    </div>

                    <AnimatePresence initial={false}>
                        {!isUnitCollapsed && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-gray-50 dark:bg-gray-900/20"
                            >
                                <div className="p-4 space-y-6">
                                    {Object.entries(profsMap).map(([profKey, daysMap]) => {
                                        const [profId, profName] = profKey.split('|');
                                        const profGroupKey = unitKey + '|' + profKey;
                                        const isProfCollapsed = !!collapsedGroups[profGroupKey];

                                        return (
                                            <div key={profKey} className="space-y-3">
                                                <div 
                                                    onClick={() => toggleGroup(profGroupKey)}
                                                    className="flex items-center gap-2 cursor-pointer select-none group"
                                                >
                                                    <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                                                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                                                        {profName}
                                                    </h3>
                                                    <ChevronDown
                                                        size={16}
                                                        className={cn(
                                                            "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-transform duration-200 ml-auto mr-2",
                                                            isProfCollapsed && "-rotate-90"
                                                        )}
                                                    />
                                                </div>

                                                <AnimatePresence initial={false}>
                                                    {!isProfCollapsed && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="pl-3 border-l-2 border-gray-200 dark:border-gray-700 space-y-4 pt-2">
                                                    {Object.entries(daysMap).map(([dayKey, patientsMap]) => {
                                                        const [year, month, dayStr] = dayKey.split('-');
                                                        const formattedDate = `${dayStr}/${month}/${year}`;
                                                        
                                                        return (
                                                            <div key={dayKey} className="space-y-2">
                                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs font-medium text-gray-600 dark:text-gray-300">
                                                                    <Calendar size={12} className="text-blue-500" />
                                                                    {formattedDate}
                                                                </div>

                                                                <div className="space-y-2 pl-2">
                                                                    {Object.entries(patientsMap).map(([patientKey, records]) => {
                                                                        const [patName, doc] = patientKey.split('|');
                                                                        const isPacSemIdentificacao = patName === "SEM_NOME";
                                                                        const isAtivColetiva = records.some(r => r.procedure?.type === 'BPA-C' || r.procedureType === 'BPA-C' || r.formType === 'COLETIVA');

                                                                        const patGroupKey = profGroupKey + '|' + dayKey + '|' + patientKey;
                                                                        const isPatCollapsed = !!collapsedGroups[patGroupKey];

                                                                        return (
                                                                            <Card key={patientKey} className="p-0 overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                                                                <div 
                                                                                    onClick={() => toggleGroup(patGroupKey)}
                                                                                    className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center cursor-pointer select-none group"
                                                                                >
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Users size={14} className="text-gray-400" />
                                                                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                                                            {isAtivColetiva ? "Atividade Coletiva / BPA-C" : (isPacSemIdentificacao ? "Paciente Não Identificado" : patName)}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3">
                                                                                        {!isAtivColetiva && doc !== "SEM_DOC" && (
                                                                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                                                                {doc}
                                                                                            </span>
                                                                                        )}
                                                                                        <ChevronDown
                                                                                            size={16}
                                                                                            className={cn(
                                                                                                "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-transform duration-200",
                                                                                                isPatCollapsed && "-rotate-90"
                                                                                            )}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <AnimatePresence initial={false}>
                                                                                    {!isPatCollapsed && (
                                                                                        <motion.div
                                                                                            initial={{ height: 0, opacity: 0 }}
                                                                                            animate={{ height: "auto", opacity: 1 }}
                                                                                            exit={{ height: 0, opacity: 0 }}
                                                                                            className="overflow-hidden"
                                                                                        >
                                                                                            <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                                                                    {records.map((record) => (
                                                                                        <div key={record.id} className="p-3 flex items-start gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                                                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded mt-0.5">
                                                                                                <Activity size={16} />
                                                                                            </div>
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div className="flex justify-between items-start gap-4">
                                                                                                    <div>
                                                                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                                                                                                            {record.procedure?.code || record.procedureCode} - {record.procedure?.name || record.procedureName}
                                                                                                        </p>
                                                                                                        <div className="flex items-center gap-2 mt-1">
                                                                                                            <Badge type="neutral">{record.procedure?.type || record.procedureType || 'BPA-I'}</Badge>
                                                                                                            <span className="text-xs text-gray-500">
                                                                                                                Qtd: <strong className="text-gray-700 dark:text-gray-300">{record.quantity || 1}</strong>
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex flex-col items-end gap-1">
                                                                                                        {(() => {
                                                                                                            const isSubsede = ['subsede_panel', 'subsede'].includes(record.source);
                                                                                                            const isMaster = ['master_panel', 'master'].includes(record.source);
                                                                                                            
                                                                                                            if (isSubsede) return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Via Subsede</span>;
                                                                                                            if (isMaster) return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">Via Master</span>;
                                                                                                            return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Via Profissional</span>;
                                                                                                        })()}
                                                                                                        {record.status === 'canceled' ? (
                                                                                                            <Badge type="error">Cancelado</Badge>
                                                                                                        ) : (
                                                                                                            <Badge type="success">Processado</Badge>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                                {record.cidCodes?.length > 0 && (
                                                                                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                                                                        <span className="font-medium mr-1">CIDs:</span> 
                                                                                                        {record.cidCodes.join(', ')}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                            </div>
                                                                                        </motion.div>
                                                                                    )}
                                                                                </AnimatePresence>
                                                                            </Card>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            );
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="w-full sm:w-80">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-4 w-4 text-gray-400" />
                        </div>
                        <select
                            value={localMunicipalityId}
                            onChange={(e) => setLocalMunicipalityId(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out shadow-sm font-medium"
                        >
                            <option value="" disabled>Selecione um Município</option>
                            {municipalities.map((mun: any) => (
                                <option key={mun.id} value={mun.id}>
                                    {mun.name} - {mun.uf}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {renderRecords()}
            </div>
        </div>
    );
};

export default GlobalProductionHistory;
