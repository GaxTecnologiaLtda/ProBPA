import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Activity, FileText, CheckCircle, Clock } from 'lucide-react';
import { BpaSharedData, getPatientHistory } from '../services/bpaService';
import { Card, Badge } from './ui/BaseComponents';

interface PatientTimelineProps {
    isOpen: boolean;
    onClose: () => void;
    patientCns: string;
    patientName: string;
    entityId: string;
}

// Helper: Format Date String YYYY-MM-DD -> DD/MM/YYYY without timezone shift
const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

export const PatientTimeline: React.FC<PatientTimelineProps> = ({
    isOpen,
    onClose,
    patientCns,
    patientName,
    entityId
}) => {
    const [history, setHistory] = useState<BpaSharedData[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && patientCns && entityId) {
            setLoading(true);
            getPatientHistory(patientCns, entityId)
                .then(data => setHistory(data))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, patientCns]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex justify-end">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                />

                {/* Drawer */}
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    className="relative w-full max-w-lg bg-white dark:bg-gray-800 h-full shadow-2xl overflow-y-auto"
                >
                    <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Activity size={20} className="text-blue-600" />
                                Histórico Clínico
                            </h2>
                            <p className="text-sm text-gray-500 truncate max-w-[250px]">{patientName}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="p-4 space-y-6">
                        {loading ? (
                            <div className="flex flex-col items-center py-10 text-gray-400">
                                <Clock className="animate-spin mb-2" size={32} />
                                <span className="text-sm">Carregando histórico...</span>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-gray-400">
                                <FileText className="mb-2" size={32} />
                                <span className="text-sm">Nenhum atendimento encontrado.</span>
                            </div>
                        ) : (
                            <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8">
                                {history.map((record, idx) => (
                                    <div key={record.id || idx} className="relative pl-6">
                                        {/* Dot */}
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-800" />

                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                        {record.originFicha || 'ATENDIMENTO'}
                                                    </span>
                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                                        {formatDate(record.attendanceDate)}
                                                    </h3>
                                                </div>
                                                <Badge color="gray" className="text-[10px]">
                                                    {record.professionalName?.split(' ')[0]}
                                                </Badge>
                                            </div>

                                            {/* SOAP Summary */}
                                            {record.soaps && (
                                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300 space-y-2">
                                                    {record.soaps.evaluation?.problemConditions && record.soaps.evaluation.problemConditions.length > 0 && (
                                                        <div>
                                                            <strong className="text-xs uppercase text-gray-400 block mb-1">Problemas / Condições</strong>
                                                            <div className="flex flex-wrap gap-1">
                                                                {record.soaps.evaluation.problemConditions.map((p, i) => (
                                                                    <Badge key={i} color="red" size="sm">{p.label}</Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Vitals Summary */}
                                                    {(record.pressaoArterialSistolica || record.weight) && (
                                                        <div>
                                                            <strong className="text-xs uppercase text-gray-400 block mb-1">Cenas / Vitais</strong>
                                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                                {record.pressaoArterialSistolica && <span>PA: {record.pressaoArterialSistolica}/{record.pressaoArterialDiastolica}</span>}
                                                                {record.weight && <span>Peso: {record.weight}kg</span>}
                                                                {record.glicemiaCapilar && <span>Glicemia: {record.glicemiaCapilar}</span>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Procedures / Exams */}
                                            {((record as any).procedureCode || (record.soaps?.plan?.exames?.length || 0) > 0) && (
                                                <div className="mt-1">
                                                    <ul className="list-disc list-inside text-xs text-gray-500">
                                                        {(record as any).procedureName && <li>{(record as any).procedureName}</li>}
                                                        {record.soaps?.plan?.exames?.map((ex, i) => (
                                                            <li key={i}>
                                                                Exame: {ex.nomeExame || ex.codigoExame}
                                                                {ex.solicitadoAvaliado?.includes('S') && <span className="ml-1 text-amber-500">(Solic.)</span>}
                                                                {ex.solicitadoAvaliado?.includes('A') && <span className="ml-1 text-green-500">(Aval.)</span>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
