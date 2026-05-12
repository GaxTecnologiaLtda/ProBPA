import React, { useState, useEffect } from 'react';
import { Skeleton, Button, Select } from '../ui/Components';
import { Unit, Professional } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Download, AlertCircle, Building2, Users, Calendar } from 'lucide-react';
import { goalService } from '../../services/goalService';
import { cboMunicipalReportService, CboMunicipalUnitData } from '../../services/cboMunicipalReportService';

interface CboMunicipalReportProps {
    municipalityId: string;
    onMunicipalityChange: (id: string) => void;
    allMunicipalities: { id: string; name: string }[];
    competence: string; // MM/YYYY
    allUnits: Unit[];
    professionals: Professional[];
    entityName?: string;
}

const getDaysInMonth = (year: string, month: string) => {
    if (!year || !month || month === 'all' || month === 'custom') return [];
    return Array.from({ length: new Date(Number(year), Number(month), 0).getDate() }, (_, i) => String(i + 1).padStart(2, '0'));
};

export const CboMunicipalReport: React.FC<CboMunicipalReportProps> = ({
    municipalityId,
    onMunicipalityChange,
    allMunicipalities,
    competence,
    allUnits,
    professionals,
    entityName
}) => {
    const { claims } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [stats, setStats] = useState<CboMunicipalUnitData[]>([]);

    // Vigency States
    const [vigencyOptions, setVigencyOptions] = useState<any[]>([]);
    const [selectedVigency, setSelectedVigency] = useState<string>('');

    // Filter states
    const initialMonth = competence && competence.includes('/') ? competence.split('/')[0].replace(/^0/, '') : String(new Date().getMonth() + 1);
    const initialYear = competence && competence.includes('/') ? competence.split('/')[1] : new Date().getFullYear().toString();

    const [uiYear, setUiYear] = useState<string>(initialYear);
    const [uiMonth, setUiMonth] = useState<string>(initialMonth);
    const [uiDay, setUiDay] = useState<string>('all');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

    const [resolvedStartDate, setResolvedStartDate] = useState<string>('');
    const [resolvedEndDate, setResolvedEndDate] = useState<string>('');
    const [resolvedCompetence, setResolvedCompetence] = useState<string>('');

    const currentYearNum = new Date().getFullYear();
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Sincroniza competência global inicial
    useEffect(() => {
        if (competence && competence.includes('/')) {
            const [m, y] = competence.split('/');
            setUiMonth(m.replace(/^0/, ''));
            setUiYear(y);
            setUiDay('all');
        }
    }, [competence]);

    // Resolução dos dias em payload pro Backend
    useEffect(() => {
        let start = '';
        let end = '';
        let comp = '';

        if (uiMonth === 'custom') {
            start = customStartDate;
            end = customEndDate;
            comp = '';
        } else if (uiMonth === 'all') {
            if (uiYear === 'multi' && selectedVigency) {
                const vig = vigencyOptions.find(v => v.label === selectedVigency);
                if (vig) {
                    start = vig.startDate;
                    end = vig.endDate;
                } else {
                    start = `${currentYearNum}-01-01`;
                    end = `${currentYearNum}-12-31`;
                }
            } else {
                start = `${uiYear}-01-01`;
                end = `${uiYear}-12-31`;
            }
            comp = '';
        } else {
            const m = uiMonth.padStart(2, '0');
            if (uiDay === 'all') {
                comp = `${m}/${uiYear}`;
            } else {
                const d = uiDay.padStart(2, '0');
                start = `${uiYear}-${m}-${d}`;
                end = `${uiYear}-${m}-${d}`;
            }
        }
        setResolvedStartDate(start);
        setResolvedEndDate(end);
        setResolvedCompetence(comp);
    }, [uiYear, uiMonth, uiDay, customStartDate, customEndDate]);

    // Carregar Metas/Vigências (Logic aligned with UnitComparativeReport)
    useEffect(() => {
        if (!municipalityId) return;

        const loadVigencies = async () => {
            try {
                const allGoals = await goalService.getGoalsForEntityPrivate(claims);
                const munGoals = allGoals.filter(g => g.municipalityId === municipalityId);

                const vigMap = new Map<string, any>();

                const getYearFromComp = (comp: string | undefined): string => {
                    if (!comp) return String(currentYearNum);
                    if (comp.startsWith('20')) return comp.substring(0, 4);
                    return comp.length >= 4 ? comp.substring(0, 4) : String(currentYearNum);
                };

                munGoals.forEach(g => {
                    if (g.startMonth && g.endMonth) {
                        const sY = getYearFromComp(g.startMonth);
                        const eY = getYearFromComp(g.endMonth);
                        const label = sY === eY ? sY : `${sY} - ${eY}`;

                        const formatFullDate = (compStr: string, isEnd: boolean) => {
                            if (!compStr) return '';
                            if (compStr.length >= 10 && compStr.includes('-')) return compStr.substring(0, 10);
                            if (compStr.includes('/')) {
                                const parts = compStr.split('/');
                                if (parts.length === 2) {
                                    if (isEnd) {
                                        const lastDay = new Date(parseInt(parts[1]), parseInt(parts[0]), 0).getDate();
                                        return `${parts[1]}-${parts[0].padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                                    }
                                    return `${parts[1]}-${parts[0].padStart(2, '0')}-01`;
                                }
                            }
                            if (compStr.length === 4) return isEnd ? `${compStr}-12-31` : `${compStr}-01-01`;
                            return '';
                        };

                        const sIso = g.startMonth.substring(0, 7);
                        const eIso = g.endMonth.substring(0, 7);
                        const sDate = formatFullDate(g.startMonth, false) || `${sY}-01-01`;
                        const eDate = formatFullDate(g.endMonth, true) || `${eY}-12-31`;

                        if (!vigMap.has(label)) {
                            vigMap.set(label, { label, startYear: sY, endYear: eY, minMonth: sIso, maxMonth: eIso, startDate: sDate, endDate: eDate });
                        } else {
                            const current = vigMap.get(label)!;
                            if (sIso && (!current.minMonth || sIso < current.minMonth)) current.minMonth = sIso;
                            if (eIso && (!current.maxMonth || eIso > current.maxMonth)) current.maxMonth = eIso;
                            if (sDate && (!current.startDate || sDate < current.startDate)) current.startDate = sDate;
                            if (eDate && (!current.endDate || eDate > current.endDate)) current.endDate = eDate;
                        }
                    }
                });

                let vopts = Array.from(vigMap.values()).sort((a, b) => b.startYear.localeCompare(a.startYear));
                if (vopts.length === 0) {
                    vopts = [{ label: String(currentYearNum), startYear: String(currentYearNum), endYear: String(currentYearNum), minMonth: `${currentYearNum}-01`, maxMonth: `${currentYearNum}-12`, startDate: `${currentYearNum}-01-01`, endDate: `${currentYearNum}-12-31` }];
                }
                setVigencyOptions(vopts);

                if (!selectedVigency && vopts.length > 0) {
                    setSelectedVigency(vopts[0].label);
                }

            } catch (err) {
                console.error("Error loading vigencies:", err);
            }
        };

        loadVigencies();
    }, [municipalityId, claims?.entityId]);

    // Sincroniza Datas ao Mudar Vigência (Alinhado com Comparativo de Unidades)
    useEffect(() => {
        if (!selectedVigency || vigencyOptions.length === 0) return;
        const vig = vigencyOptions.find(v => v.label === selectedVigency);
        if (vig) {
            setUiMonth('custom');
            if (vig.startDate) setCustomStartDate(vig.startDate);
            if (vig.endDate) setCustomEndDate(vig.endDate);
            
            if (vig.startYear !== vig.endYear) {
                setUiYear('multi');
            } else if (vig.startYear) {
                setUiYear(vig.startYear);
            }
        }
    }, [selectedVigency, vigencyOptions]);

    // Efect para carregar dados
    useEffect(() => {
        if (!municipalityId || (!resolvedCompetence && (!resolvedStartDate || !resolvedEndDate))) return;

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                setStats([]);

                const actualMunId = allMunicipalities.find(m => m.name === municipalityId || m.id === municipalityId)?.id || municipalityId;
                
                // Fetch Goals to restrict procedures (Parity with UnitComparative)
                const allGoals = await goalService.getGoalsForEntityPrivate(claims);
                const currentVig = vigencyOptions.find(v => v.label === selectedVigency);
                const munGoals = allGoals.filter(g => {
                    const isMunScope = g.municipalityId === actualMunId && (g.goalType === 'municipal' || !g.unitId);
                    if (!isMunScope) return false;
                    if (!currentVig) return true;
                    
                    const getYearFromComp = (comp: string | undefined): string => {
                        if (!comp) return '';
                        if (comp.startsWith('20')) return comp.substring(0, 4);
                        return comp.length >= 4 ? comp.substring(0, 4) : '';
                    };
                    return getYearFromComp(g.startMonth) === currentVig.startYear && getYearFromComp(g.endMonth) === currentVig.endYear;
                });
                const allowedProcedureCodes = Array.from(new Set(munGoals.map(g => g.procedureCode).filter(Boolean)));

                const essentialUnits = allUnits
                    .filter(u => u.municipalityId === actualMunId)
                    .map(u => ({ id: u.id, cnes: u.cnes, name: u.name }));
                
                const payloadCompetence = resolvedCompetence;
                const payloadStart = resolvedStartDate;
                const payloadEnd = resolvedEndDate;

                const getCBOMunicipalStats = httpsCallable(functions, 'getCBOMunicipalStats', { timeout: 540000 });
                const response = await getCBOMunicipalStats({
                    municipalityId: actualMunId,
                    competence: payloadCompetence || undefined,
                    startDate: payloadStart || undefined,
                    endDate: payloadEnd || undefined,
                    units: essentialUnits,
                    allowedProcedureCodes,
                    professionals: professionals.map(p => ({ 
                        id: p.id, 
                        name: p.name, 
                        cns: p.cns || '', 
                        cpf: p.cpf || '', 
                        cbo: p.cbo || '',
                        unitId: p.unitId || '',
                        occupation: p.occupation || '',
                        assignments: p.assignments || [] 
                    }))
                });

                const data = response.data as CboMunicipalUnitData[];
                setStats(data || []);

            } catch (err: any) {
                console.error('Failed to load CBO report:', err);
                setError('Falha ao carregar os dados de CBO. Tente novamente mais tarde.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [municipalityId, resolvedStartDate, resolvedEndDate, resolvedCompetence, professionals, allUnits]);

    const handleExport = async () => {
        try {
            setLoading(true);
            const municipalityName = allMunicipalities.find(m => m.id === municipalityId)?.name || '';
            const eName = claims?.entityName || entityName || '';

            let logoUrl = '';
            let logoBase64 = '';
            let entityAddress = '';
            let entityCnpj = '';
            let entityCity = '';

            if (claims?.entityId) {
                try {
                    const entityDocSnap = await getDoc(doc(db, 'entities', claims.entityId));
                    if (entityDocSnap.exists()) {
                        const entityData = entityDocSnap.data();
                        logoUrl = entityData.logoUrl || '';
                        logoBase64 = entityData.logoBase64 || '';
                        entityAddress = entityData.address || '';
                        entityCnpj = entityData.cnpj || '';
                        entityCity = entityData.location || '';
                    }
                } catch (e) {
                    console.error("Error fetching entity context details:", e);
                }
            }

            await cboMunicipalReportService.generateCboMunicipalPdf(stats, {
                competence: resolvedCompetence || `${resolvedStartDate} - ${resolvedEndDate}`,
                municipalityName,
                entityName: eName,
                logoUrl,
                logoBase64,
                entityAddress,
                entityCnpj,
                entityCity
            });

        } catch (err: any) {
            console.error('Error exporting PDF:', err);
            setError('Erro ao gerar relatório em PDF.');
        } finally {
            setLoading(false);
        }
    };

    if (!municipalityId) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Users className="w-12 h-12 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Selecione um Município</h3>
                <p className="text-sm mb-6 text-center max-w-md">Para visualizar a Produção por CBO, selecione o município desejado abaixo.</p>
                <div className="w-64">
                    <Select
                        value={municipalityId}
                        onChange={(e) => onMunicipalityChange(e.target.value)}
                        className="w-full"
                    >
                        <option value="">Selecione...</option>
                        {allMunicipalities.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </Select>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                {/* Linha 1: Município e Vigência */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
                        <div className="w-full sm:w-64 shrink-0">
                            <Select
                                value={municipalityId}
                                onChange={(e) => onMunicipalityChange(e.target.value)}
                                className="bg-white dark:bg-gray-800 w-full border-gray-300 dark:border-gray-700"
                            >
                                <option value="">Selecione o Município...</option>
                                {allMunicipalities.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </Select>
                        </div>
                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider whitespace-nowrap">Pactuação Vigente:</span>
                            <div className="relative">
                                <Select
                                    value={selectedVigency}
                                    onChange={(e) => setSelectedVigency(e.target.value)}
                                    className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-semibold text-sm border-emerald-200 dark:border-emerald-800 min-w-[140px] pr-8"
                                >
                                    {vigencyOptions.length === 0 && <option value="">Sem Vigência</option>}
                                    {vigencyOptions.map(v => (
                                        <option key={v.label} value={v.label}>{v.label}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    </div>

                    <Button size="sm" variant="outline" className="gap-2 w-full xl:w-auto shrink-0" onClick={handleExport} disabled={loading || stats.length === 0}>
                        <Download className="w-4 h-4 shrink-0" />
                        Exportar PDF
                    </Button>
                </div>

                {/* Linha 2: Escopo de Produção */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-2.5 rounded-lg w-full xl:w-auto">
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                            <Calendar className="w-4 h-4" />
                            Escopo de Produção:
                        </span>

                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <div className={`relative transition-all duration-200 ${uiMonth === 'custom' ? 'hidden' : 'block'}`}>
                                <select
                                    value={uiYear}
                                    onChange={(e) => setUiYear(e.target.value)}
                                    className="pl-3 pr-8 py-1.5 border rounded bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 font-medium text-sm border-blue-200 dark:border-blue-800/50 outline-none focus:ring-2 focus:ring-blue-500 h-9"
                                >
                                    {Array.from({ length: 5 }, (_, i) => String(currentYearNum - i)).map(y => (
                                        <option key={y} value={y}>Ano {y}</option>
                                    ))}
                                </select>
                            </div>
                            <select
                                value={uiMonth}
                                onChange={(e) => {
                                    setUiMonth(e.target.value);
                                    setUiDay('all');
                                }}
                                className="pl-3 pr-8 py-1.5 border rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 h-9"
                            >
                                <option value="all">Todos os Meses</option>
                                <option value="custom">Período Personalizado</option>
                                {monthNames.map((m, i) => (
                                    <option key={i + 1} value={String(i + 1)}>{m}</option>
                                ))}
                            </select>
                            <select
                                value={uiDay}
                                onChange={(e) => setUiDay(e.target.value)}
                                disabled={uiMonth === 'all' || uiMonth === 'custom'}
                                className={`pl-3 pr-8 py-1.5 border rounded text-sm outline-none focus:ring-2 disabled:opacity-50 h-9 transition-colors
                                 ${uiMonth === 'custom' ? 'hidden' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 focus:ring-blue-500 disabled:cursor-not-allowed'}`}
                            >
                                <option value="all">Dias</option>
                                {getDaysInMonth(uiYear, uiMonth).map(d => (
                                    <option key={d} value={d}>Dia {d}</option>
                                ))}
                            </select>

                            {uiMonth === 'custom' && (
                                <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-1 duration-200">
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="px-2 py-1.5 border rounded bg-white dark:bg-gray-800 text-xs border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 h-9"
                                        min={vigencyOptions.find(v => v.label === selectedVigency)?.startDate}
                                        max={vigencyOptions.find(v => v.label === selectedVigency)?.endDate}
                                    />
                                    <span className="text-gray-400 text-xs">até</span>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="px-2 py-1.5 border rounded bg-white dark:bg-gray-800 text-xs border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 h-9"
                                        min={customStartDate || vigencyOptions.find(v => v.label === selectedVigency)?.startDate}
                                        max={vigencyOptions.find(v => v.label === selectedVigency)?.endDate}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 border rounded-lg shadow-sm border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Carregando Informações...</h3>
                    <p className="text-sm text-gray-500 mt-1">Aguarde enquanto os dados da competência são agregados.</p>
                </div>
            ) : (
                <div className="overflow-x-auto pb-4 border rounded-lg shadow-sm border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4">
                    {stats.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                            Nenhuma produção encontrada para os filtros selecionados.
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto border border-gray-300 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900 mb-8">
                            {/* PDF Preview Header */}
                            <div className="text-center py-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">RELATÓRIO DE PRODUÇÃO</h2>
                                <h3 className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    PERÍODO: {resolvedCompetence || `${resolvedStartDate} até ${resolvedEndDate}`}
                                </h3>
                                <h3 className="text-sm text-gray-600 dark:text-gray-400 mt-1 uppercase">
                                    {allMunicipalities.find(m => m.id === municipalityId)?.name || 'MUNICÍPIO'}
                                </h3>
                            </div>

                            {/* PDF Preview Body */}
                            <div className="p-0">
                                {stats.map((unit, idx) => (
                                    <div key={unit.unitId} className={`w-full ${idx > 0 ? 'mt-0' : ''}`}>
                                        <div className="bg-gray-400 dark:bg-gray-700 text-black dark:text-white font-bold py-2 px-4 text-center border-b border-t border-gray-300 dark:border-gray-600">
                                            {unit.unitName.toUpperCase()}
                                        </div>

                                        {unit.cbos.length === 0 ? (
                                            <div className="py-3 px-4 text-center text-gray-500 italic text-sm">
                                                Unidade sem produção
                                            </div>
                                        ) : (
                                            <>
                                                {unit.cbos.map(cbo => (
                                                    <div key={cbo.code} className="flex justify-between py-1.5 px-6 border-b border-gray-100 dark:border-gray-800 text-sm">
                                                        <span className="text-gray-800 dark:text-gray-300">{cbo.code} - {cbo.name}</span>
                                                        <span className="text-gray-900 dark:text-gray-200 ml-4 font-medium">{cbo.quantity}</span>
                                                    </div>
                                                ))}

                                                <div className="flex justify-between py-2 px-6 bg-gray-200 dark:bg-gray-800/80 font-bold border-b border-gray-300 dark:border-gray-700">
                                                    <span className="text-gray-800 dark:text-gray-200">Produção total da unidade</span>
                                                    <span className="text-gray-900 dark:text-white">{unit.totalQuantity}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}

                                {stats.length > 0 && (
                                    <div className="flex justify-between py-3 px-6 bg-gray-600 dark:bg-gray-900 font-bold border-t border-gray-100 dark:border-black">
                                        <span className="text-white">PRODUÇÃO TOTAL GERAL</span>
                                        <span className="text-white text-lg">{stats.reduce((acc, curr) => acc + (curr.totalQuantity || 0), 0)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center gap-2 p-3 text-sm text-blue-700 bg-blue-50 rounded-lg dark:bg-blue-900/30 dark:text-blue-400">
                <AlertCircle className="w-4 h-4" />
                <p>O somatório é baseado em todos os registros do conector e produção manual que possuem CBO identificado no período selecionado.</p>
            </div>
        </div>
    );
};
