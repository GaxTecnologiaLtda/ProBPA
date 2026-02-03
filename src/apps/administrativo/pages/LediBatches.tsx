import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Badge, Modal } from '../components/Common';
import { Search, RefreshCw, AlertCircle, CheckCircle, Clock, Eye, Code, FileText, Activity, Send } from 'lucide-react';
import { fetchAllMunicipalities } from '../services/municipalitiesService';
import { getFirestore, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';


// Batch Interface
interface LediBatch {
    id: string;
    batchId: string;
    competence: string;
    municipalityId: string;
    municipalityName: string;
    cnes: string;
    unitName: string;
    batchType: 'PEC_APS';
    recordsCount: number;
    status: 'GENERATED' | 'SENT' | 'ERROR' | 'PARTIAL';
    fileName: string;
    generatedAt: any;
    sentAt?: any;
    payload?: string; // Optional full payload
}

// Log Interface (Subcollection)
interface LediLogEntry {
    id: string;
    type: 'SUCCESS' | 'ERROR';
    message: string;
    payloadDebug?: string;
    timestamp: any;
}

const LediBatches: React.FC = () => {
    const [batches, setBatches] = useState<LediBatch[]>([]);
    const [loading, setLoading] = useState(false);
    const [municipalities, setMunicipalities] = useState<any[]>([]);

    // Filters
    const [selectedMunicipality, setSelectedMunicipality] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Modal State
    const [selectedBatch, setSelectedBatch] = useState<LediBatch | null>(null);
    const [batchLogs, setBatchLogs] = useState<LediLogEntry[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    useEffect(() => {
        loadFilters();
        loadBatches();
    }, []);

    const loadFilters = async () => {
        const munis = await fetchAllMunicipalities();
        setMunicipalities(munis);
    };

    const handleManualSend = async () => {
        if (!selectedMunicipality) {
            alert("Selecione um município para forçar o envio.");
            return;
        }

        const confirm = window.confirm("Deseja forçar o envio dos registros pendentes agora? Isso pode levar alguns segundos.");
        if (!confirm) return;

        setLoading(true);
        try {
            const functions = getFunctions();
            // Note: Function name in backend is 'resendPendingLediRecords'
            const triggerSend = httpsCallable(functions, 'resendPendingLediRecords');

            const result: any = await triggerSend({
                municipalityId: selectedMunicipality,
                forceBypassStatus: true
            });

            if (result.data.success) {
                alert(`Processamento concluído!\n${result.data.message}`);
                loadBatches(); // Reload list
            }
        } catch (error: any) {
            console.error("Manual send error", error);
            alert(`Erro ao processar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const loadBatches = async () => {
        setLoading(true);
        try {
            const db = getFirestore();
            let q = query(
                collection(db, "ledi_batches"),
                orderBy("generatedAt", "desc"),
                limit(50)
            );

            if (selectedMunicipality) {
                q = query(
                    collection(db, "ledi_batches"),
                    where("municipalityId", "==", selectedMunicipality),
                    orderBy("generatedAt", "desc"),
                    limit(50)
                );
            }

            const snapshot = await getDocs(q);
            const loadedBatches = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as LediBatch[];

            setBatches(loadedBatches);
        } catch (error) {
            console.error("Error loading batches", error);
        } finally {
            setLoading(false);
        }
    };

    // Load logs when a batch is selected
    useEffect(() => {
        if (selectedBatch) {
            loadBatchLogs(selectedBatch.id);
        } else {
            setBatchLogs([]);
        }
    }, [selectedBatch]);

    const loadBatchLogs = async (batchDocId: string) => {
        setLoadingLogs(true);
        try {
            const db = getFirestore();
            const logsRef = collection(db, "ledi_batches", batchDocId, "logs");
            const q = query(logsRef, orderBy("timestamp", "asc"));

            const snapshot = await getDocs(q);
            const loadedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as LediLogEntry[];

            setBatchLogs(loadedLogs);
        } catch (err) {
            console.error("Error loading subcollection logs", err);
        } finally {
            setLoadingLogs(false);
        }
    };

    const filteredBatches = batches.filter(batch => {
        if (statusFilter === 'ALL') return true;
        return batch.status === statusFilter;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SENT': return <Badge variant="success">Enviado</Badge>;
            case 'ERROR': return <Badge variant="danger">Erro</Badge>;
            case 'GENERATED': return <Badge variant="warning">Gerado</Badge>; // Or Blue
            case 'PARTIAL': return <Badge variant="warning">Parcial</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lotes LEDI Enviados</h1>
                    <p className="text-slate-500">Histórico de transmissões e arquivos gerados (e-SUS APS).</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="primary"
                        icon={Send}
                        onClick={handleManualSend}
                        disabled={!selectedMunicipality || loading}
                        title={!selectedMunicipality ? "Selecione um município para habilitar" : "Forçar envio imediato"}
                    >
                        Forçar Envio
                    </Button>
                    <Button variant="outline" icon={RefreshCw} onClick={loadBatches} isLoading={loading}>
                        Atualizar
                    </Button>
                </div>
            </div>

            <Card className="!p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <Select
                        className="w-full md:w-64"
                        label="Filtrar por Município"
                        value={selectedMunicipality}
                        onChange={(e) => setSelectedMunicipality(e.target.value)}
                        options={[
                            { value: '', label: 'Todos os Municípios' },
                            ...municipalities.map(m => ({ value: m.id, label: m.name }))
                        ]}
                    />
                    <Select
                        className="w-full md:w-48"
                        label="Filtrar por Status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        options={[
                            { value: 'ALL', label: 'Todos' },
                            { value: 'SENT', label: 'Enviado' },
                            { value: 'ERROR', label: 'Erro' },
                            { value: 'GENERATED', label: 'Gerado' }
                        ]}
                    />
                </div>
            </Card>

            <div className="bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-medium">
                            <tr>
                                <th className="px-4 py-3">Competência</th>
                                <th className="px-4 py-3">Município</th>
                                <th className="px-4 py-3">Unidade / CNES</th>
                                <th className="px-4 py-3">Arquivo</th>
                                <th className="px-4 py-3 text-center">Registros</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                        Carregando lotes...
                                    </td>
                                </tr>
                            ) : filteredBatches.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                        Nenhum lote encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredBatches.map((batch) => (
                                    <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                                            {batch.competence}
                                        </td>
                                        <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                                            {batch.municipalityName}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold">{batch.unitName}</span>
                                                <span className="text-[10px] font-mono">{batch.cnes}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs truncate max-w-[150px]" title={batch.fileName}>
                                            {batch.fileName || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge variant="neutral">{batch.recordsCount}</Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(batch.status)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedBatch(batch)}>
                                                <Eye className="w-4 h-4 text-slate-400 hover:text-corp-500" /> Ver Lote
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Drill Down Modal */}
            <Modal
                isOpen={!!selectedBatch}
                onClose={() => setSelectedBatch(null)}
                title={`Detalhes do Lote ${selectedBatch?.batchId || ''}`}
                maxWidth="max-w-4xl"
            >
                {selectedBatch && (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Gerado em</span>
                                <span className="font-medium text-sm text-slate-900 dark:text-white">
                                    {selectedBatch.generatedAt?.toDate ? selectedBatch.generatedAt.toDate().toLocaleString() : 'N/A'}
                                </span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Status</span>
                                {getStatusBadge(selectedBatch.status)}
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Registros</span>
                                <span className="font-bold text-lg text-slate-900 dark:text-white">{selectedBatch.recordsCount}</span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Arquivo</span>
                                <span className="font-mono text-xs text-slate-900 dark:text-white break-all">{selectedBatch.fileName}</span>
                            </div>
                        </div>

                        {/* Logs Feed */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                <Activity className="w-4 h-4" /> Log de Eventos do Lote
                            </div>
                            <div className="max-h-[300px] overflow-auto bg-white dark:bg-slate-900 p-0">
                                {loadingLogs ? (
                                    <div className="p-4 text-center text-slate-500 text-sm">Carregando logs do lote...</div>
                                ) : batchLogs.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500 text-sm">Nenhum evento registrado para este lote. (Subcoleção vazia)</div>
                                ) : (
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2">Hora</th>
                                                <th className="px-4 py-2">Tipo</th>
                                                <th className="px-4 py-2">Mensagem</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {batchLogs.map(log => (
                                                <React.Fragment key={log.id}>
                                                    <tr className={log.type === 'ERROR' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-slate-500">
                                                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            {log.type === 'SUCCESS' ? <span className="text-green-600 font-bold">OK</span> : <span className="text-red-600 font-bold">ERRO</span>}
                                                        </td>
                                                        <td className="px-4 py-2 text-slate-700 dark:text-slate-300 font-mono">
                                                            {log.message}
                                                        </td>
                                                    </tr>
                                                    {log.payloadDebug && (
                                                        <tr>
                                                            <td colSpan={3} className="px-4 pb-2 pt-0">
                                                                <details className="text-[10px] text-slate-400 cursor-pointer">
                                                                    <summary>Ver Payload Debug</summary>
                                                                    <pre className="mt-1 p-2 bg-slate-950 text-green-400 rounded overflow-x-auto max-w-[700px]">
                                                                        {log.payloadDebug}
                                                                    </pre>
                                                                </details>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button variant="outline" onClick={() => setSelectedBatch(null)}>Fechar</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default LediBatches;
