import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Button, Badge } from '../../components/ui/Components';
import {
    Database, Activity, RefreshCw, Eye, Calendar, User, FileText, Filter
} from 'lucide-react';
import { collection, query, where, getDocs, collectionGroup, orderBy, limit, doc, getCountFromServer, startAfter } from 'firebase/firestore';
import { db } from '../../firebase';
import { Municipality, Professional } from '../../types';
import { fetchProfessionalsByEntity } from '../../services/professionalsService';

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

const ConnectorDashboard: React.FC<ConnectorDashboardProps> = ({ entityId, municipalities, competence }) => {
    const [selectedMunId, setSelectedMunId] = useState<string>(municipalities[0]?.id || '');

    // Entity-Driven State
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [profStats, setProfStats] = useState<Record<string, number>>({}); // CNS -> Count
    const [loadingProfs, setLoadingProfs] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);

    // Total for the municipality (Sum of all prof counts)
    const totalProduction = useMemo(() => Object.values(profStats).reduce((a: number, b: number) => a + b, 0), [profStats]);

    // Modal State for Details
    const [selectedProf, setSelectedProf] = useState<Professional | null>(null);
    const [detailsData, setDetailsData] = useState<ExtractedRecord[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Sync selected mun if list changes
    useEffect(() => {
        if (!selectedMunId && municipalities.length > 0) {
            setSelectedMunId(municipalities[0].id);
        }
    }, [municipalities]);

    // 1. Fetch Professionals when Municipality changes
    useEffect(() => {
        if (selectedMunId && entityId) {
            loadProfessionals();
        }
    }, [selectedMunId, entityId]);

    const loadProfessionals = async () => {
        setLoadingProfs(true);
        try {
            const allProfs = await fetchProfessionalsByEntity(entityId);
            // Filter only those linked to the selected municipality
            const filtered = allProfs.filter(p =>
                p.assignments?.some(a => a.municipalityId === selectedMunId) ||
                // Legacy fallback
                (p.municipalityId === selectedMunId)
            );
            setProfessionals(filtered);
            // Reset stats when changing mun
            setProfStats({});
        } catch (error) {
            console.error("Error loading professionals:", error);
        } finally {
            setLoadingProfs(false);
        }
    };

    // 2. Fetch Aggregated Counts when Professionals OR Competence changes
    useEffect(() => {
        if (professionals.length > 0 && competence && selectedMunId) {
            loadStats();
        }
    }, [professionals, competence, selectedMunId]);

    // Cache for stats: Competence -> Stats
    const statsCache = React.useRef<Record<string, Record<string, number>>>({});
    // Cache for raw records: Competence -> Array of Records
    const recordsCache = React.useRef<Record<string, any[]>>({});

    const normalizeCns = (cns: string) => String(cns || '').replace(/\D/g, '');

    const loadStats = async (forceRefresh = false) => {
        // Check Cache first
        if (!forceRefresh && statsCache.current[competence]) {
            setProfStats(statsCache.current[competence]);
            return;
        }

        setLoadingStats(true);
        const newStats: Record<string, number> = {};

        try {
            const selectedMun = municipalities.find(m => m.id === selectedMunId);
            if (!selectedMun) {
                setLoadingStats(false);
                return;
            }

            // Parse Competence
            const [month, year] = competence.split('/');
            const startDate = `${year}-${month}-01`;
            const endDate = `${year}-${month}-31 23:59:59`;

            console.log('[CONNECTOR_DASHBOARD] Loading stats for', selectedMunId, competence);

            // NEW: Query nested schema structure
            // Path: municipalities/{entityType}/{entityId}/{munId}/extractions/{YYYY}/competences/{MM-YYYY}/extraction_records
            let allDocs: any[] = [];

            try {
                const { entityType, entityId: ctxEntityId } = selectedMun._pathContext || { entityType: 'public_entities', entityId };

                // Build competence ID from parsed month/year
                const competenceId = `${month}-${year}`;

                // Reference to extraction_records for this competence
                const recordsRef = collection(
                    db,
                    'municipalities',
                    entityType,
                    ctxEntityId,
                    selectedMunId,
                    'extractions',
                    year,
                    'competences',
                    competenceId,
                    'extraction_records'
                );

                console.log(`[CONNECTOR_DASHBOARD] Querying path: municipalities/${entityType}/${ctxEntityId}/${selectedMunId}/extractions/${year}/competences/${competenceId}/extraction_records`);

                // Fetch all records for this competence
                let lastDoc = null;
                let keepFetching = true;
                let safetyCounter = 0;
                const BATCH_SIZE = 2000;

                while (keepFetching && safetyCounter < 50) {
                    safetyCounter++;

                    const constraints: any[] = [
                        where('productionDate', '>=', startDate),
                        where('productionDate', '<=', endDate),
                        orderBy('productionDate', 'asc'),
                        limit(BATCH_SIZE)
                    ];

                    if (lastDoc) {
                        constraints.push(startAfter(lastDoc));
                    }

                    const q = query(recordsRef, ...constraints);
                    const snapshot = await getDocs(q);

                    if (snapshot.empty) {
                        keepFetching = false;
                    } else {
                        const chunk = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
                        allDocs = [...allDocs, ...chunk];
                        lastDoc = snapshot.docs[snapshot.docs.length - 1];
                        if (snapshot.docs.length < BATCH_SIZE) {
                            keepFetching = false;
                        }
                    }
                }

                console.log(`[CONNECTOR_DASHBOARD] Fetched ${allDocs.length} records from ${year}/${competenceId}`);

            } catch (err) {
                console.error('[CONNECTOR_DASHBOARD] Error fetching nested schema:', err);
                // Fallback: Try flat schema (legacy)
                console.log('[CONNECTOR_DASHBOARD] Falling back to flat schema...');

                let recordsRef;
                if (selectedMun._pathContext) {
                    const { entityType, entityId } = selectedMun._pathContext;
                    recordsRef = collection(db, 'municipalities', entityType, entityId, selectedMunId, 'extractions');
                } else {
                    recordsRef = collectionGroup(db, 'extractions');
                }

                let lastDoc = null;
                let keepFetching = true;
                let safetyCounter = 0;
                const BATCH_SIZE = 2000;

                while (keepFetching && safetyCounter < 50) {
                    safetyCounter++;

                    const constraints: any[] = [
                        where('productionDate', '>=', startDate),
                        where('productionDate', '<=', endDate),
                        orderBy('productionDate', 'asc'),
                        limit(BATCH_SIZE)
                    ];

                    if (!selectedMun._pathContext) {
                        constraints.push(where('municipalityId', '==', selectedMunId));
                    }

                    if (lastDoc) {
                        constraints.push(startAfter(lastDoc));
                    }

                    const q = query(recordsRef, ...constraints);
                    const snapshot = await getDocs(q);

                    if (snapshot.empty) {
                        keepFetching = false;
                    } else {
                        const chunk = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
                        allDocs = [...allDocs, ...chunk];
                        lastDoc = snapshot.docs[snapshot.docs.length - 1];
                        if (snapshot.docs.length < BATCH_SIZE) {
                            keepFetching = false;
                        }
                    }
                }

                console.log(`[CONNECTOR_DASHBOARD] Fell back to flat schema, fetched ${allDocs.length} records`);
            }

            // Aggregation Client-Side with COMPREHENSIVE SMART MATCHING
            // Create Lookup Maps for O(1) matching
            const cnsMap = new Map<string, string>();
            const cpfMap = new Map<string, string>();
            const nameMap = new Map<string, string>(); // Norm Name -> Prof ID

            professionals.forEach(p => {
                if (p.cns) cnsMap.set(normalizeCns(p.cns), p.id);
                if (p.cpf) cpfMap.set(normalizeCns(p.cpf), p.id);
                if (p.name) nameMap.set(p.name.trim().toLowerCase(), p.id);
            });

            const countsByProfId: Record<string, number> = {};

            allDocs.forEach(doc => {
                // A. FILTER DUPLICATES (Same logic as connectorService)
                const rawCode = String(doc.procedure?.code || doc.procedureCode || '').toUpperCase();
                const rawName = String(doc.procedure?.name || doc.procedureName || '').toUpperCase();

                if (rawCode === 'CONSULTA' && rawName.includes('ATENDIMENTO INDIVIDUAL')) {
                    return; // SKIP DUPLICATE
                }

                if (doc.professional) {
                    const recCns = normalizeCns(doc.professional.cns);
                    const recCpf = normalizeCns((doc.professional as any).cpf); // Some extractors put CPF here or in 'cpf' field?
                    // Verify if 'cpf' field exists in ExtractedRecord, if not use cns field as fallback
                    const recRealCpf = normalizeCns((doc.professional as any).cpf) || ((recCns.length === 11) ? recCns : '');
                    const recName = (doc.professional.name || '').trim().toLowerCase();

                    // Match Priority: CNS > CPF > Name
                    let profId = cnsMap.get(recCns);

                    if (!profId && recRealCpf) {
                        profId = cpfMap.get(recRealCpf);
                    }

                    if (!profId && recName) {
                        profId = nameMap.get(recName);
                    }

                    if (profId) {
                        countsByProfId[profId] = (countsByProfId[profId] || 0) + 1;
                    }
                }
            });

            // Map to Displayed Professionals
            professionals.forEach(prof => {
                newStats[prof.cns] = countsByProfId[prof.id] || 0;
            });

            // Update Caches
            statsCache.current[competence] = newStats;
            recordsCache.current[competence] = allDocs; // Cache FULL records

            setProfStats(newStats);

        } catch (error) {
            console.error("Error loading stats:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    // 3. Fetch Details on Click
    const handleViewDetails = async (prof: Professional) => {
        setSelectedProf(prof);
        setLoadingDetails(true);
        setDetailsData([]);

        try {
            // Use In-Memory Cache!
            const cachedRecords = recordsCache.current[competence];
            if (!cachedRecords) {
                // Should not happen if stats are loaded. But if so, empty.
                setLoadingDetails(false);
                return;
            }

            // Client-Side Filter with Smart Matching
            const pCns = normalizeCns(prof.cns);
            const pCpf = normalizeCns(prof.cpf);
            const pName = (prof.name || '').trim().toLowerCase();

            const filtered = cachedRecords.filter(r => {
                const recCns = normalizeCns(r.professional?.cns);
                const recRealCpf = normalizeCns((r.professional as any).cpf) || ((recCns.length === 11) ? recCns : '');
                const recName = (r.professional?.name || '').trim().toLowerCase();

                // 1. CNS Match
                if (pCns && recCns && pCns === recCns) return true;
                // 2. CPF Match
                if (pCpf && recRealCpf && pCpf === recRealCpf) return true;
                // 3. Name Match
                if (pName && recName && pName === recName) return true;

                return false;
            });

            // Sort DESC by date (as in original query)
            filtered.sort((a, b) => {
                return (b.productionDate || '').localeCompare(a.productionDate || '');
            });

            // Paginate (Top 100)
            setDetailsData(filtered.slice(0, 100) as ExtractedRecord[]);

        } catch (error) {
            console.error("Error loading details:", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const refreshAll = () => {
        // Invalidate cache for current view
        if (statsCache.current[competence]) {
            delete statsCache.current[competence];
        }
        loadProfessionals(); // Will trigger stats reload
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 py-4">

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

                {/* Stats Summary */}
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Produção Total ({competence})</span>
                        <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                            {totalProduction.toLocaleString()}
                            {loadingStats && <RefreshCw className="w-3 h-3 animate-spin opacity-50" />}
                        </div>
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

                    <Button onClick={refreshAll} variant="outline" size="sm" className="h-10 w-10 p-2">
                        <RefreshCw className={`w-4 h-4 ${loadingProfs || loadingStats ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            {professionals.length === 0 && !loadingProfs ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum profissional cadastrado neste município.</p>
                    <p className="text-sm text-gray-400">Cadastre profissionais na aba "Profissionais" para ver a produção.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {professionals.map(prof => {
                        const count = profStats[prof.cns] || 0;
                        const hasProduction = count > 0;

                        return (
                            <Card key={prof.id} className={`hover:shadow-lg transition-all duration-200 border-l-4 ${hasProduction ? 'border-l-blue-500 dark:border-l-blue-400' : 'border-l-gray-300 dark:border-l-gray-600'} dark:bg-gray-800 overflow-hidden group`}>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                                                {prof.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-1" title={prof.name}>{prof.name}</h4>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <Badge variant="neutral" className="text-[10px] px-1 py-0">{prof.occupation || 'Profissional'}</Badge>
                                                    <span className="text-[10px] text-gray-400">CNS: {prof.cns}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold">Produção</p>
                                            <div className="text-2xl font-bold text-gray-700 dark:text-white transition-all">
                                                {loadingStats && profStats[prof.cns] === undefined ? (
                                                    <span className="animate-pulse text-gray-300">...</span>
                                                ) : (
                                                    count.toLocaleString()
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={!hasProduction}
                                            onClick={() => handleViewDetails(prof)}
                                            className={`
                                                ${hasProduction ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'} 
                                                hover:bg-blue-50 dark:hover:bg-blue-900/30
                                            `}
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            Ver Detalhes
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
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
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        CNS: {selectedProf.cns} • Total: {profStats[selectedProf.cns]?.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedProf(null)}>✕</Button>
                        </div>

                        {/* Modal Body - Table */}
                        <div className="overflow-auto flex-1 p-0 relative">
                            {loadingDetails ? (
                                <div className="flex items-center justify-center h-48">
                                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                                </div>
                            ) : detailsData.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-400">Nenhum registro encontrado para a visualização detalhada.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Data</th>
                                            <th className="px-6 py-3 font-medium">Procedimento</th>
                                            <th className="px-6 py-3 font-medium">Paciente</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {detailsData.map(row => {
                                            const code = (row.procedure.code || '').toUpperCase();
                                            const name = (row.procedure.name || '').toUpperCase();
                                            const isDuplicate = code === 'CONSULTA' && name.includes('ATENDIMENTO INDIVIDUAL');

                                            return (
                                                <tr key={row.id} className={`bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isDuplicate ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                        {row.productionDate?.split(' ')[0].split('-').reverse().join('/')}
                                                        <span className="text-xs text-gray-400 ml-1">{row.productionDate?.split(' ')[1]?.substring(0, 5)}</span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        {isDuplicate ? (
                                                            <div className="relative">
                                                                <span className="absolute -top-3 -left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800 transform scale-90 origin-bottom-left">
                                                                    DUPLICIDADE
                                                                </span>
                                                                <div className="opacity-50 grayscale select-none">
                                                                    <div className="font-medium text-gray-800 dark:text-gray-200 line-through Decoration-red-400">{row.procedure.code}</div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px] line-through">{row.procedure.name}</div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="font-medium text-gray-800 dark:text-gray-200">{row.procedure.code}</div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{row.procedure.name}</div>
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                                                        {row.patient.name || 'Não identificado'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex justify-between items-center">
                            <span className="text-xs text-gray-400 ml-2">Exibindo os últimos 100 registros.</span>
                            <Button variant="outline" onClick={() => setSelectedProf(null)}>Fechar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConnectorDashboard;
