import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../components/Common';
import { X, RefreshCw, FileText, User, Calendar, Activity, Stethoscope, Hash, MapPin, Building2 } from 'lucide-react';
import { getFirestore, collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';

interface ExtractedRecord {
    id: string;
    professional: { name: string; cns: string; cbo: string };
    patient: { name?: string; cns: string; sex: string; birthDate?: string; cpf?: string };
    unit: { cnes: string };
    procedure: { code: string; name: string; type?: string; cid?: string; ciap?: string };
    productionDate: string;
    type?: string;
    status: string;
}

interface DataPreviewTestProps {
    municipalityId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const DataPreviewTest: React.FC<DataPreviewTestProps> = ({ municipalityId, isOpen, onClose }) => {
    const [data, setData] = useState<ExtractedRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<ExtractedRecord | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const db = getFirestore();
            // Note: Ideally requires composite index: [municipalityId ASC, productionDate DESC]
            // If failing, fallback to simple where
            const q = query(
                collection(db, 'extracted_production'),
                where('municipalityId', '==', municipalityId),
                limit(50)
            );

            const snapshot = await getDocs(q);
            const records = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ExtractedRecord[];

            setData(records);
        } catch (error) {
            console.error("Error fetching preview:", error);
            alert("Erro ao buscar dados. Verifique o console.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && municipalityId) {
            fetchData();
        }
    }, [isOpen, municipalityId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-xl shadow-2xl flex flex-col h-[90vh] relative overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-corp-500" />
                            Preview de Dados Extraídos
                        </h3>
                        <p className="text-xs text-slate-500">
                            Município ID: {municipalityId} • Exibindo últimos {data.length} registros
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-1 overflow-hidden relative">

                    {/* List Column */}
                    <div className={`flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-950/50 ${selectedRecord ? 'hidden md:block w-1/2' : 'w-full'}`}>
                        {data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <FileText className="w-12 h-12 mb-4 opacity-20" />
                                <p>Nenhum dado encontrado.</p>
                                <p className="text-xs mt-2 opacity-70">Execute o conector na ponta para sincronizar.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {data.map((record) => (
                                    <div
                                        key={record.id}
                                        onClick={() => setSelectedRecord(record)}
                                        className={`p-3 rounded-lg border shadow-sm flex flex-col gap-2 cursor-pointer transition-all
                                            ${selectedRecord?.id === record.id
                                                ? 'bg-corp-50 border-corp-300 ring-1 ring-corp-300 dark:bg-corp-900/20 dark:border-corp-700'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-corp-200 hover:shadow-md'}
                                        `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-corp-600 dark:text-corp-400 truncate max-w-[200px]" title={record.procedure.name}>
                                                {record.procedure.code} - {record.procedure.name}
                                            </span>
                                            {record.procedure.type && (
                                                <Badge variant="neutral" className="text-[10px] px-1 py-0">{record.procedure.type}</Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                <span className="truncate max-w-[120px]">{record.professional.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>{String(record.productionDate).split(' ')[0]}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Detail Column (Slide-over on mobile, split on desktop) */}
                    {selectedRecord && (
                        <div className="absolute inset-0 md:static md:w-[60%] flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 animate-in slide-in-from-right-10 z-10">
                            {/* Detail Header */}
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                                <h4 className="font-bold text-slate-800 dark:text-slate-200">Detalhes do Registro</h4>
                                <button onClick={() => setSelectedRecord(null)} className="md:hidden p-2 text-slate-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-6 space-y-6">
                                {/* Section: IDs */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">ID Único</label>
                                        <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">{selectedRecord.id}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Tipo de Registro</label>
                                        <Badge variant="success" className="mt-1">{selectedRecord.procedure.type || 'N/A'}</Badge>
                                    </div>
                                </div>

                                {/* Section: Clinical Info */}
                                <div>
                                    <h5 className="flex items-center gap-2 text-sm font-bold text-corp-600 dark:text-corp-400 mb-3 border-b border-slate-100 pb-2">
                                        <Activity className="w-4 h-4" />
                                        Dados Clínicos
                                    </h5>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Procedimento</label>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {recordHasValue(selectedRecord.procedure.code) ? `${selectedRecord.procedure.code} - ${selectedRecord.procedure.name}` : 'N/A'}
                                            </p>
                                        </div>
                                        {(selectedRecord.procedure.cid || selectedRecord.procedure.ciap) && (
                                            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-md border border-yellow-100 dark:border-yellow-800">
                                                <label className="block text-xs font-bold text-yellow-700 dark:text-yellow-400 mb-2">Diagnóstico</label>
                                                {recordHasValue(selectedRecord.procedure.cid) && (
                                                    <div className="text-sm mb-1">
                                                        <span className="font-bold text-slate-700 dark:text-slate-300">CID:</span> {selectedRecord.procedure.cid}
                                                    </div>
                                                )}
                                                {recordHasValue(selectedRecord.procedure.ciap) && (
                                                    <div className="text-sm">
                                                        <span className="font-bold text-slate-700 dark:text-slate-300">CIAP:</span> {selectedRecord.procedure.ciap}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Section: Actors */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Professional */}
                                    <div>
                                        <h5 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-100 pb-2">
                                            <Stethoscope className="w-4 h-4" />
                                            Profissional
                                        </h5>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="text-slate-500">Nome:</span> {selectedRecord.professional.name}</p>
                                            <p><span className="text-slate-500">CNS:</span> {selectedRecord.professional.cns}</p>
                                            <p><span className="text-slate-500">CBO:</span> {selectedRecord.professional.cbo}</p>
                                        </div>
                                    </div>

                                    {/* Patient */}
                                    <div>
                                        <h5 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-100 pb-2">
                                            <User className="w-4 h-4" />
                                            Paciente
                                        </h5>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="text-slate-500">Nome:</span> {selectedRecord.patient.name || 'N/A'}</p>
                                            <p><span className="text-slate-500">CNS:</span> {selectedRecord.patient.cns}</p>
                                            <p><span className="text-slate-500">Sexo:</span> {selectedRecord.patient.sex}</p>
                                            {selectedRecord.patient.birthDate && <p><span className="text-slate-500">Nascimento:</span> {selectedRecord.patient.birthDate}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Location */}
                                <div>
                                    <h5 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-100 pb-2">
                                        <MapPin className="w-4 h-4" />
                                        Local de Atendimento
                                    </h5>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded text-slate-500">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Unidade de Saúde</p>
                                            <p className="text-xs text-slate-500">CNES: {selectedRecord.unit.cnes}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Raw Data Inspector */}
                                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                                    <details className="group">
                                        <summary className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-600">
                                            <Hash className="w-3 h-3" />
                                            VER DADOS BRUTOS (JSON)
                                        </summary>
                                        <pre className="mt-4 p-4 bg-slate-900 text-slate-50 rounded-lg text-xs overflow-auto max-h-60 font-mono">
                                            {JSON.stringify(selectedRecord, null, 2)}
                                        </pre>
                                    </details>
                                </div>

                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper
const recordHasValue = (val: any) => val && val !== 'NULL' && val !== '';

