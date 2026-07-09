import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge, Modal, Tooltip } from '../components/Common';
import { unknownUnitsService, UnknownUnitRecord } from '../services/unknownUnitsService';
import { fetchAllEntities } from '../services/entitiesService';
import { fetchAllMunicipalities } from '../services/municipalitiesService';
import { Eye, RefreshCw, AlertTriangle, Monitor, User, Database, ChevronDown, ChevronRight, Download, FileJson } from 'lucide-react';

export const UnknownUnitsTracker: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<UnknownUnitRecord[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Caches for resolving IDs to Names
    const [entitiesMap, setEntitiesMap] = useState<Record<string, string>>({});
    const [municipalitiesMap, setMunicipalitiesMap] = useState<Record<string, string>>({});

    // Modal state for raw data
    const [selectedRecord, setSelectedRecord] = useState<UnknownUnitRecord | null>(null);
    const [rawDocs, setRawDocs] = useState<any[]>([]);
    const [loadingRaw, setLoadingRaw] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Expanded states for table rows
    const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
    const [expandedMunicipalities, setExpandedMunicipalities] = useState<Set<string>>(new Set());

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [data, entities, municipalities] = await Promise.all([
                unknownUnitsService.fetchAggregatedUnknowns(),
                fetchAllEntities(),
                fetchAllMunicipalities()
            ]);

            const eMap: Record<string, string> = {};
            entities.forEach(e => eMap[e.id] = e.name);
            setEntitiesMap(eMap);

            const mMap: Record<string, string> = {};
            municipalities.forEach(m => mMap[m.id] = m.name);
            setMunicipalitiesMap(mMap);

            setRecords(data);
        } catch (err: any) {
            console.error('Failed to fetch unknown units:', err);
            setError('Erro ao buscar as glosas de unidades desconhecidas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const toggleEntity = (entityId: string) => {
        setExpandedEntities(prev => {
            const next = new Set(prev);
            if (next.has(entityId)) next.delete(entityId);
            else next.add(entityId);
            return next;
        });
    };

    const toggleMunicipality = (munKey: string) => {
        setExpandedMunicipalities(prev => {
            const next = new Set(prev);
            if (next.has(munKey)) next.delete(munKey);
            else next.add(munKey);
            return next;
        });
    };

    const handleViewRaw = async (record: UnknownUnitRecord) => {
        setSelectedRecord(record);
        setIsModalOpen(true);
        setLoadingRaw(true);
        setRawDocs([]);
        try {
            const docs = await unknownUnitsService.fetchRawUnknownRecords(
                record.entityId,
                record.municipalityId,
                record.competence,
                record.professionalId,
                record.professionalName,
                record.date
            );
            setRawDocs(docs);
        } catch (err) {
            console.error('Error fetching raw docs:', err);
        } finally {
            setLoadingRaw(false);
        }
    };

    // Grouping records
    const groupedData = useMemo(() => {
        const groups: Record<string, {
            entityId: string;
            totalProcedures: number;
            municipalities: Record<string, {
                municipalityId: string;
                totalProcedures: number;
                records: UnknownUnitRecord[];
            }>
        }> = {};

        records.forEach(req => {
            const totalProcs = Object.values<number>(req.procedures as Record<string, number>).reduce((sum, qty) => sum + qty, 0);

            if (!groups[req.entityId]) {
                groups[req.entityId] = { entityId: req.entityId, totalProcedures: 0, municipalities: {} };
            }
            groups[req.entityId].totalProcedures += totalProcs;

            if (!groups[req.entityId].municipalities[req.municipalityId]) {
                groups[req.entityId].municipalities[req.municipalityId] = {
                    municipalityId: req.municipalityId,
                    totalProcedures: 0,
                    records: []
                };
            }

            groups[req.entityId].municipalities[req.municipalityId].totalProcedures += totalProcs;
            groups[req.entityId].municipalities[req.municipalityId].records.push(req);
        });

        // Sort records within municipalities by date descending
        Object.values(groups).forEach(en => {
            Object.values(en.municipalities).forEach(mun => {
                mun.records.sort((a, b) => {
                    // Primitive sort (DD-MM-YYYY)
                    const [d1, m1, y1] = a.date.split('-');
                    const [d2, m2, y2] = b.date.split('-');
                    const date1 = new Date(`${y1}-${m1}-${d1}`).getTime();
                    const date2 = new Date(`${y2}-${m2}-${d2}`).getTime();
                    return date2 - date1;
                });
            });
        });

        return groups;
    }, [records]);

    if (loading && records.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <RefreshCw className="w-8 h-8 text-corp-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Rastreando Unidades Desconhecidas (unknown_unit) em todo o banco...</p>
                <p className="text-sm text-slate-400 mt-2">Isso pode levar alguns instantes.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-200">
                <AlertTriangle className="w-5 h-5" />
                {error}
                <Button variant="outline" size="sm" onClick={loadData} className="ml-auto">Tentar Novamente</Button>
            </div>
        );
    }

    const totalUnknownProcedures = records.reduce((sum, r) => sum + Object.values<number>(r.procedures as Record<string, number>).reduce((a, b) => a + b, 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">Glosas de Unidade (unknown_unit)</h2>
                        <p className="text-sm text-amber-700 dark:text-amber-400/80">Monitoramento ativo de todos os registros brutos órfãos de CNES em `resumo_producao`.</p>
                    </div>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs uppercase font-bold text-amber-600/70 dark:text-amber-500/70">Total de Procedimentos Órfãos</p>
                        <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{totalUnknownProcedures.toLocaleString()}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            {records.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <Monitor className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Nenhuma "unknown_unit" encontrada!</h3>
                    <p className="text-slate-500 mt-2">O banco está limpo. Nenhum município reportou produção órfã de unidade.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-dark-900/50">
                                <tr>
                                    <th className="px-4 py-3 w-10"></th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Entidade / Município / Data</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Profissional</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Competência</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Procedimentos</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-dark-800">
                                {Object.values(groupedData).map((entity: any) => {
                                    const isEntityExpanded = expandedEntities.has(entity.entityId);
                                    return (
                                        <React.Fragment key={entity.entityId}>
                                            <tr
                                                className="bg-slate-50 dark:bg-dark-900/20 hover:bg-slate-100 dark:hover:bg-dark-900/40 cursor-pointer transition-colors"
                                                onClick={() => toggleEntity(entity.entityId)}
                                            >
                                                <td className="px-4 py-3 text-center text-slate-400">
                                                    {isEntityExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </td>
                                                <td className="px-6 py-3 text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    <Database className="w-4 h-4 text-corp-500" />
                                                    Entidade: {entitiesMap[entity.entityId] || entity.entityId}
                                                </td>
                                                <td className="px-6 py-3"></td>
                                                <td className="px-6 py-3"></td>
                                                <td className="px-6 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                                                    {entity.totalProcedures.toLocaleString()} proc.
                                                </td>
                                                <td className="px-6 py-3"></td>
                                            </tr>

                                            {isEntityExpanded && Object.values(entity.municipalities).map((mun: any) => {
                                                const munKey = `${entity.entityId}_${mun.municipalityId}`;
                                                const isMunExpanded = expandedMunicipalities.has(munKey);

                                                return (
                                                    <React.Fragment key={munKey}>
                                                        <tr
                                                            className="bg-slate-50/50 dark:bg-dark-900/10 hover:bg-slate-100/80 dark:hover:bg-dark-900/30 cursor-pointer transition-colors"
                                                            onClick={() => toggleMunicipality(munKey)}
                                                        >
                                                            <td className="px-4 py-3 text-right text-slate-400 pr-2">
                                                                {isMunExpanded ? <ChevronDown className="w-4 h-4 inline-block" /> : <ChevronRight className="w-4 h-4 inline-block" />}
                                                            </td>
                                                            <td className="px-6 py-3 pl-10 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                                Município: <span className="text-slate-900 dark:text-white">{municipalitiesMap[mun.municipalityId] || mun.municipalityId}</span>
                                                            </td>
                                                            <td className="px-6 py-3"></td>
                                                            <td className="px-6 py-3"></td>
                                                            <td className="px-6 py-3 text-right font-semibold text-amber-600 dark:text-amber-400/80">
                                                                {mun.totalProcedures.toLocaleString()} proc.
                                                            </td>
                                                            <td className="px-6 py-3"></td>
                                                        </tr>

                                                        {isMunExpanded && mun.records.map((record: UnknownUnitRecord, idx: number) => {
                                                            const totalProcCount = Object.values<number>(record.procedures as Record<string, number>).reduce((sum, qty) => sum + qty, 0);
                                                            const procSummaries = Object.entries(record.procedures)
                                                                .map(([code, qty]) => `${code} (${qty})`)
                                                                .join(', ');

                                                            return (
                                                                <tr key={`${munKey}_${record.professionalId}_${record.date}_${idx}`} className="hover:bg-slate-50 dark:hover:bg-dark-800 transition-colors">
                                                                    <td className="px-4 py-3"></td>
                                                                    <td className="px-6 py-3 pl-16 whitespace-nowrap">
                                                                        <div className="flex items-center">
                                                                            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 mr-2"></span>
                                                                            <span className="text-sm font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-dark-900 px-2 py-0.5 rounded">{record.date}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-3">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                                                                                <User className="w-3 h-3 text-slate-400" />
                                                                                {record.professionalName}
                                                                            </span>
                                                                            <span className="text-xs font-mono text-slate-500">ID: {record.professionalId}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-3 whitespace-nowrap">
                                                                        <Badge variant="neutral">{record.competence}</Badge>
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right">
                                                                        <Tooltip content={procSummaries}>
                                                                            <div className="inline-flex items-center px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-bold border border-amber-200 dark:border-amber-800">
                                                                                {totalProcCount}
                                                                            </div>
                                                                        </Tooltip>
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right">
                                                                        <Button variant="outline" size="sm" onClick={() => handleViewRaw(record)} className="text-xs gap-1 h-8">
                                                                            <Eye className="w-3 h-3" /> Ficha Bruta
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Raw JSON Details Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Detalhes Brutos (extraction_records)"
                size="lg"
            >
                {selectedRecord && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-dark-900 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Data (Resumo)</p>
                                <p className="font-mono text-sm">{selectedRecord.date}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Competência</p>
                                <p className="font-mono text-sm">{selectedRecord.competence}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-slate-500 uppercase font-bold">Profissional</p>
                                <p className="text-sm font-semibold">{selectedRecord.professionalName}</p>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Fichas Encontradas no Banco
                                    {rawDocs.length > 0 && <span className="ml-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs">{rawDocs.length}</span>}
                                </h3>

                                {rawDocs.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 py-0 gap-1 text-xs"
                                        onClick={() => {
                                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rawDocs, null, 2));
                                            const a = document.createElement('a');
                                            a.href = dataStr;
                                            a.download = `unknown_records_${selectedRecord.date}_${selectedRecord.professionalId}.json`;
                                            a.click();
                                        }}
                                    >
                                        <Download className="w-3 h-3" /> JSO N
                                    </Button>
                                )}
                            </div>

                            {loadingRaw ? (
                                <div className="flex flex-col items-center justify-center py-12 bg-slate-50 dark:bg-dark-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <RefreshCw className="w-6 h-6 animate-spin text-corp-500 mb-2" />
                                    <p className="text-sm text-slate-500">Minerando coleções de extratos brutos...</p>
                                </div>
                            ) : rawDocs.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 dark:bg-dark-900 rounded-lg border border-slate-200 dark:border-slate-700 h-48 flex flex-col justify-center">
                                    <p className="text-slate-500 font-medium">Nenhuma ficha bruta órfã encontrada para estes filtros.</p>
                                    <p className="text-xs text-slate-400 mt-1">A consulta usou a data `{selectedRecord.date}` prefixada e buscou fichas sem `unit.cnes` correspondentes ao profissional.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                    {rawDocs.map((doc, i) => (
                                        <div key={i} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                                            <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
                                                <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                                    <FileJson className="w-4 h-4 text-emerald-500" />
                                                    ID da Ficha: <span className="text-slate-300">{doc.id}</span>
                                                </span>
                                                <Badge variant="neutral">{doc.status || 'SYNCED'}</Badge>
                                            </div>
                                            <pre className="text-xs font-mono text-emerald-400 overflow-x-auto">
                                                {JSON.stringify(doc, null, 2)}
                                            </pre>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
