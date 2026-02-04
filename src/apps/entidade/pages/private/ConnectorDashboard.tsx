import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge } from '../../components/ui/Components';
import {
    Database, Activity, RefreshCw, Eye, Calendar, User, FileText
} from 'lucide-react'; // Using Lucide icons as requested for typical PROBPA style
import { collection, query, where, getDocs, collectionGroup, orderBy, limit, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Municipality } from '../../types';

interface ConnectorDashboardProps {
    entityId: string;
    municipalities: Municipality[];
    competence: string; // MM/YYYY
}

interface ExtractedRecord {
    id: string;
    professional: { name: string; cns: string; cbo: string };
    patient: { name?: string; sex: string; birthDate?: string };
    procedure: { code: string; name: string; type?: string };
    productionDate: string;
    municipalityId: string;
}

interface ProfessionalStats {
    id: string; // cns or unique key
    name: string;
    cbo: string;
    cns: string;
    count: number;
    records: ExtractedRecord[];
}

const ConnectorDashboard: React.FC<ConnectorDashboardProps> = ({ entityId, municipalities, competence }) => {
    const [selectedMunId, setSelectedMunId] = useState<string>(municipalities[0]?.id || '');
    const [data, setData] = useState<ExtractedRecord[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State for Details
    const [selectedProf, setSelectedProf] = useState<ProfessionalStats | null>(null);

    // Sync selected mun if list changes
    useEffect(() => {
        if (!selectedMunId && municipalities.length > 0) {
            setSelectedMunId(municipalities[0].id);
        }
    }, [municipalities]);

    // Fetch when Mun or Competence changes
    useEffect(() => {
        if (selectedMunId && competence) {
            fetchData();
        }
    }, [selectedMunId, competence]);

    const fetchData = async () => {
        setLoading(true);
        setData([]); // Clear old data to avoid confusion
        try {
            const selectedMun = municipalities.find(m => m.id === selectedMunId);
            if (!selectedMun) return;

            let recordsRef;

            // PREFERRED: Direct Path Access (Secure & Efficient)
            if (selectedMun._pathContext) {
                const { entityType, entityId } = selectedMun._pathContext;
                recordsRef = collection(db, 'municipalities', entityType, entityId, selectedMunId, 'extractions');
            } else {
                console.warn("Using fallback collectionGroup query due to missing path context");
                recordsRef = collectionGroup(db, 'extractions');
            }

            // Parse Competence (MM/YYYY) -> Date Range (YYYY-MM-01 to YYYY-MM-31)
            const [month, year] = competence.split('/');
            const startDate = `${year}-${month}-01`;
            const endDate = `${year}-${month}-31 23:59:59`; // Simple upper bound

            // Build query
            const q = query(
                recordsRef,
                where('municipalityId', '==', selectedMunId),
                where('productionDate', '>=', startDate),
                where('productionDate', '<=', endDate),
                orderBy('productionDate', 'desc'),
                limit(10000) // Increased limit for v3.4.0
            );

            const snapshot = await getDocs(q);
            const records = snapshot.docs.map(doc => {
                const data = doc.data() as any;
                return { id: doc.id, ...data } as ExtractedRecord;
            });

            setData(records);

        } catch (error) {
            console.error("Error fetching connector data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Aggregate Data by Professional
    const professionals = useMemo(() => {
        const map = new Map<string, ProfessionalStats>();

        data.forEach(rec => {
            const key = rec.professional.cns || rec.professional.name;
            if (!map.has(key)) {
                map.set(key, {
                    id: key,
                    name: rec.professional.name,
                    cbo: rec.professional.cbo,
                    cns: rec.professional.cns,
                    count: 0,
                    records: []
                });
            }
            const prof = map.get(key)!;
            prof.count++;
            prof.records.push(rec);
        });

        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    }, [data]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 py-4">

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

                {/* Stats Summary - Integrated into Header Context */}
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Registros ({competence})</span>
                        <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200">{data.length}</div>
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium hidden md:inline">Município:</span>
                    <select
                        className="p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-700 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px]"
                        value={selectedMunId}
                        onChange={(e) => setSelectedMunId(e.target.value)}
                    >
                        {municipalities.length === 0 && <option>Nenhum conector ativo</option>}
                        {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>

                    <Button onClick={fetchData} variant="outline" size="sm" className="h-10 w-10 p-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            {data.length === 0 && !loading ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <Database className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum dado encontrado para a competência {competence}.</p>
                    <p className="text-sm text-gray-400">Verifique se a extração foi realizada no conector.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {professionals.map(prof => (
                        <Card key={prof.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 dark:border-l-blue-400 dark:bg-gray-800 overflow-hidden group">
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                                            {prof.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-1" title={prof.name}>{prof.name}</h4>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Badge variant="neutral" className="text-[10px] px-1 py-0">{prof.cbo}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold">Produção</p>
                                        <p className="text-2xl font-bold text-gray-700 dark:text-white">{prof.count}</p>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedProf(prof)}
                                        className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30"
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Ver Detalhes
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Details Modal */}
            {selectedProf && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 rounded-t-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 flex items-center justify-center font-bold">
                                    {selectedProf.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">{selectedProf.name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">CNS: {selectedProf.cns} • CBO: {selectedProf.cbo}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedProf(null)}>✕</Button>
                        </div>

                        {/* Modal Body - Table */}
                        <div className="overflow-auto flex-1 p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Data</th>
                                        <th className="px-6 py-3 font-medium">Procedimento</th>
                                        <th className="px-6 py-3 font-medium">Paciente</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {selectedProf.records.map(row => (
                                        <tr key={row.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-6 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                {row.productionDate?.split(' ')[0].split('-').reverse().join('/')}
                                                <span className="text-xs text-gray-400 ml-1">{row.productionDate?.split(' ')[1]?.substring(0, 5)}</span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="font-medium text-gray-800 dark:text-gray-200">{row.procedure.code}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{row.procedure.name}</div>
                                            </td>
                                            <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                                                {row.patient.name || 'Não identificado'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex justify-end">
                            <Button variant="outline" onClick={() => setSelectedProf(null)}>Fechar Visualização</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConnectorDashboard;
