import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from '../../components/ui/Components';
import { Search, Stethoscope, MapPin, Filter, Building2, ChevronDown, Key } from 'lucide-react';
import { Professional, Unit, Municipality } from '../../types';
import { SigtapBrowserModal } from '../private/components/SigtapBrowserModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useEntityData } from '../../hooks/useEntityData';
import { subscribeToProfessionalsGrouped, HierarchicalData } from '../../services/professionalsService';
import { fetchUnitsByEntity } from '../../services/unitsService';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';

const ProfessionalsSubsede: React.FC = () => {
    const { claims } = useAuth();
    const { entity } = useEntityData(claims?.entityId || '');

    const [hierarchicalData, setHierarchicalData] = useState<HierarchicalData[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
    const [loading, setLoading] = useState(true);

    const [isSigtapModalOpen, setIsSigtapModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedMunicipalities, setExpandedMunicipalities] = useState<Record<string, boolean>>({});

    // Advanced Filters State
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        unitId: '',
        cbo: ''
    });

    useEffect(() => {
        if (!claims?.entityId) return;

        let unsubscribeProfessionals: (() => void) | undefined;

        const loadStaticData = async () => {
            setLoading(true);
            try {
                const [unitsData, municipalitiesData] = await Promise.all([
                    fetchUnitsByEntity(claims.entityId),
                    fetchMunicipalitiesByEntity(claims.entityId, claims.municipalityId)
                ]);
                setUnits(unitsData);
                setMunicipalities(municipalitiesData);

                if (claims?.municipalityId) {
                    setExpandedMunicipalities({ [claims.municipalityId]: true });
                }

                unsubscribeProfessionals = await subscribeToProfessionalsGrouped(
                    claims.entityId,
                    claims.municipalityId,
                    (data) => {
                        setHierarchicalData(data);
                        setLoading(false);
                    }
                );

            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                setLoading(false);
            }
        };

        loadStaticData();

        return () => {
            if (unsubscribeProfessionals) unsubscribeProfessionals();
        };
    }, [claims?.entityId, claims?.municipalityId]);

    const toggleMunicipality = (munId: string) => {
        setExpandedMunicipalities(prev => ({
            ...prev,
            [munId]: !prev[munId]
        }));
    };

    // Filtragem local
    const filteredData = hierarchicalData.map(group => {
        const filteredUnits = group.units.map(unit => {
            let filteredProfs = unit.professionals.filter(p => {
                // Text Search
                const matchesSearch = !searchTerm ||
                    unit.unitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.cns.includes(searchTerm) ||
                    p.cpf.includes(searchTerm) ||
                    (p.assignments || []).some(a => a.occupation.toLowerCase().includes(searchTerm.toLowerCase()));

                if (!matchesSearch) return false;

                // Advanced Filters
                const pDate = p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000) : (p.createdAt ? new Date(p.createdAt) : new Date(0));
                const pYear = pDate.getFullYear();
                const pMonth = String(pDate.getMonth() + 1).padStart(2, '0');
                const pDay = String(pDate.getDate()).padStart(2, '0');
                const pDateStr = `${pYear}-${pMonth}-${pDay}`;

                if (filters.startDate && pDateStr < filters.startDate) return false;
                if (filters.endDate && pDateStr > filters.endDate) return false;
                if (filters.unitId && unit.unitId !== filters.unitId) return false;

                if (filters.cbo) {
                    const hasCbo = (p.assignments || []).some(a => a.occupation.toLowerCase().includes(filters.cbo.toLowerCase())) ||
                        p.occupation?.toLowerCase().includes(filters.cbo.toLowerCase());
                    if (!hasCbo) return false;
                }

                return true;
            });

            filteredProfs.sort((a, b) => {
                const dateA = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : (a.createdAt ? new Date(a.createdAt) : new Date(0));
                const dateB = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : (b.createdAt ? new Date(b.createdAt) : new Date(0));
                return dateB.getTime() - dateA.getTime();
            });

            return { ...unit, professionals: filteredProfs };
        }).filter(u => u.professionals.length > 0);

        return { ...group, units: filteredUnits };
    }).filter(g => g.units.length > 0);

    const formatDate = (date: any) => {
        if (!date) return '-';
        try {
            if (date.seconds) {
                return new Date(date.seconds * 1000).toLocaleDateString('pt-BR');
            }
            return new Date(date).toLocaleDateString('pt-BR');
        } catch (e) {
            return '-';
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando corpo clínico local...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Corpo Clínico Local</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Visualização dos profissionais vinculados às unidades do seu município.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => setIsSigtapModalOpen(true)}
                    >
                        <Search className="w-4 h-4" /> Tabela SIGTAP
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <Card className="bg-white dark:bg-gray-800 sticky top-0 z-20 shadow-sm border-b border-gray-100 dark:border-gray-700 overflow-visible transition-all duration-300">
                <div className="p-4 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por Nome, CNS ou CPF..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center justify-center px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${showFilters ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            <Filter className="w-4 h-4 mr-2" /> Filtros
                            {(filters.startDate || filters.endDate || filters.unitId || filters.cbo) && (
                                <span className="ml-2 w-2 h-2 rounded-full bg-orange-500"></span>
                            )}
                        </button>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-2 pb-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">De</label>
                                        <input
                                            type="date"
                                            value={filters.startDate}
                                            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Até</label>
                                        <input
                                            type="date"
                                            value={filters.endDate}
                                            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Unidade</label>
                                        <select
                                            value={filters.unitId}
                                            onChange={(e) => setFilters(prev => ({ ...prev, unitId: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                        >
                                            <option value="">Todas as Unidades Locais</option>
                                            {units.filter(u => u.municipalityId === claims?.municipalityId).map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Cargo / CBO</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Enfermeiro, Médico..."
                                            value={filters.cbo}
                                            onChange={(e) => setFilters(prev => ({ ...prev, cbo: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="md:col-span-4 flex justify-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-500 hover:text-gray-700"
                                            onClick={() => setFilters({ startDate: '', endDate: '', unitId: '', cbo: '' })}
                                        >
                                            Limpar Filtros
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </Card>

            {/* Lista Hierárquica */}
            <div className="space-y-8">
                {filteredData.map((munGroup) => {
                    const isExpanded = expandedMunicipalities[munGroup.municipalityId];

                    return (
                        <div key={munGroup.municipalityId} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div
                                className="flex items-center justify-between p-5 cursor-pointer bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800/70 transition-colors border-b border-gray-200 dark:border-gray-700"
                                onClick={() => toggleMunicipality(munGroup.municipalityId)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-orange-600 text-white rounded-lg flex items-center justify-center shadow-sm">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{munGroup.municipalityName}</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {munGroup.units.length} unidades vinculadas
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge type="neutral" className="hidden md:inline-flex">
                                        {new Set(munGroup.units.flatMap(u => u.professionals.map(p => p.id))).size} Profissionais
                                    </Badge>
                                    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        {isExpanded ? <ChevronDown className="w-5 h-5 transform rotate-180 transition-transform" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                    >
                                        <div className="p-6 space-y-8 bg-white dark:bg-gray-800">
                                            {munGroup.units.map((unit) => (
                                                <div key={unit.unitId} className="relative">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Building2 className="w-5 h-5 text-orange-600" />
                                                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">
                                                            {unit.unitName}
                                                        </h3>
                                                        <span className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                            CNES: {unit.cnes}
                                                        </span>
                                                    </div>

                                                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent -mx-2 px-2 min-h-[220px]">
                                                        {unit.professionals.map((prof) => {
                                                            const assignment = (prof.assignments || []).find(a => a.unitId === unit.unitId) || {
                                                                occupation: prof.occupation,
                                                                active: prof.active
                                                            };

                                                            return (
                                                                <div key={prof.id} className="min-w-[260px] w-[260px] flex-shrink-0">
                                                                    <Card className="h-full hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 flex flex-col relative group bg-gray-50/50 dark:bg-gray-800/50">
                                                                        <div className="absolute top-3 right-3 z-10">
                                                                            <Badge type={assignment.active ? 'success' : 'neutral'} className="text-[10px]">
                                                                                {assignment.active ? 'Ativo' : 'Inativo'}
                                                                            </Badge>
                                                                        </div>

                                                                        <div className="p-5 flex flex-col h-full items-center text-center">
                                                                            <div className="h-14 w-14 rounded-full bg-white dark:bg-gray-700 text-orange-600 flex items-center justify-center text-xl font-bold mb-3 border border-orange-100 dark:border-orange-900 shadow-sm relative">
                                                                                {prof.name.charAt(0)}
                                                                            </div>

                                                                            <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1 w-full" title={prof.name}>
                                                                                {prof.name}
                                                                            </h3>
                                                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-mono bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                                                                CNS: {prof.cns || 'Não informado'}
                                                                            </span>
                                                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-mono bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                                                                CPF: {prof.cpf}
                                                                            </span>

                                                                            <span className="text-[10px] text-orange-600 dark:text-orange-500 mb-3 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full border border-orange-100 dark:border-orange-800/30 w-full truncate">
                                                                                Vinculado: {formatDate(prof.createdAt)}
                                                                            </span>

                                                                            <div className="w-full pt-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
                                                                                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium flex items-center justify-center gap-1 line-clamp-2" title={assignment.occupation}>
                                                                                    <Stethoscope className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{assignment.occupation}</span>
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </Card>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {unit !== munGroup.units[munGroup.units.length - 1] && (
                                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-6" />
                                                    )}
                                                </div>
                                            ))}

                                            {munGroup.units.length === 0 && (
                                                <div className="text-center py-8 text-gray-500 dark:text-gray-400 italic">
                                                    Nenhuma unidade com profissionais cadastrados neste município.
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}

                {filteredData.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum resultado encontrado</h3>
                        <p className="text-gray-500 dark:text-gray-400">Tente ajustar os filtros da sua busca.</p>
                    </div>
                )}
            </div>

            <SigtapBrowserModal
                isOpen={isSigtapModalOpen}
                onClose={() => setIsSigtapModalOpen(false)}
            />
        </div>
    );
};

export default ProfessionalsSubsede;
