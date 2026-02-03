import React, { useState } from 'react';
import { Card, Button, Input, Select, Badge, cn } from '../../components/ui/BaseComponents';
import { BpaRecordInput } from '../../services/bpaService';
import { Search, Plus, Trash2, Activity, Stethoscope, ClipboardList, Baby, TestTube, CheckCircle, HelpCircle, AlertCircle, FileText } from 'lucide-react';
import { searchCids, searchCiap, searchProcedures } from '../../services/sigtapLookupService';
import { SigtapTreeSelector } from '../SigtapTreeSelector';
import { MedicamentosList } from './fai/MedicamentosList';
import { EncaminhamentosList } from './fai/EncaminhamentosList';
import { ExamResultsList } from './fai/ExamResultsList';
import { ProblemaCondicaoList } from './fai/ProblemaCondicaoList';
import { RequestedExamsList } from './fai/RequestedExamsList';

import { IvcfForm } from './fai/IvcfForm';
import { SolicitacoesOciList } from './fai/SolicitacoesOciList';
import { ProcedureSection } from './ProcedureSection';

// Constants for Dropdowns
// Constants for Dropdowns
const LISTA_CONDUTAS = [
    { value: '1', label: '1 - Retorno para consulta agendada' },
    { value: '2', label: '2 - Retorno para cuidado continuado/programado' },
    { value: '12', label: '12 - Agendamento para grupos' },
    { value: '14', label: '14 - Agendamento para NASF/e-Multi' },
    { value: '9', label: '9 - Alta do episódio' },
    { value: '11', label: '11 - Encaminhamento interno no dia' },
    { value: '4', label: '4 - Encaminhamento para serviço especializado' },
    { value: '5', label: '5 - Encaminhamento para CAPS' },
    { value: '6', label: '6 - Encaminhamento para internação hospitalar' },
    { value: '7', label: '7 - Encaminhamento para urgência' },
    { value: '8', label: '8 - Encaminhamento para serviço de atenção domiciliar' },
    { value: '10', label: '10 - Encaminhamento intersetorial' }
];

// ... (Rest of existing constants if needed, but I am replacing the block)

const LISTA_ALEITAMENTO = [
    { value: '', label: 'Selecione...' },
    { value: '1', label: 'A.M. Exclusivo' },
    { value: '2', label: 'A.M. Predominante' },
    { value: '3', label: 'A.M. Complementado' },
    { value: '4', label: 'A.M. Inexistente' },
];

const LISTA_AD_MODALIDADE = [
    { value: '', label: 'Selecione...' },
    { value: '1', label: 'AD1' },
    { value: '2', label: 'AD2' },
    { value: '3', label: 'AD3' },
];

const LISTA_PICs = [
    { value: '', label: 'Selecione...' },
    { value: '1', label: 'Acupuntura' },
    { value: '2', label: 'Homeopatia' },
    { value: '3', label: 'Fitoterapia' },
    // ... truncated for brevity, assume similar structure
    { value: '4', label: 'Arteterapia' },
    { value: '5', label: 'Ayurveda' },
    { value: '6', label: 'Biodança' },
    { value: '7', label: 'Dança Circular' },
    { value: '8', label: 'Meditação' },
    { value: '9', label: 'Musicoterapia' },
    { value: '10', label: 'Naturopatia' },
    { value: '11', label: 'Osteopatia' },
    { value: '12', label: 'Quiropraxia' },
    { value: '13', label: 'Reflexoterapia' },
    { value: '14', label: 'Reiki' },
    { value: '15', label: 'Shantala' },
    { value: '16', label: 'Terapia Comunitária' },
    { value: '17', label: 'Yoga' },
    { value: '18', label: 'Outras' },
    { value: '19', label: 'Termalismo/Crenoterapia' },
    { value: '20', label: 'Constelação Familiar' },
    { value: '21', label: 'Dança Circular' },
    { value: '22', label: 'Meditação' },
    { value: '23', label: 'Musicoterapia' },
    { value: '24', label: 'Naturopatia' },
    { value: '25', label: 'Osteopatia' },
    { value: '26', label: 'Quiropraxia' },
    { value: '27', label: 'Reflexoterapia' },
    { value: '28', label: 'Reiki' },
    { value: '29', label: 'Shantala' }
];

// ...

const LISTA_NASF = [
    { value: '1', label: 'Psicólogo' },
    { value: '2', label: 'Fisioterapeuta' },
    { value: '3', label: 'Nutricionista' },
    { value: '4', label: 'Assistente Social' },
    { value: '5', label: 'Educador Físico' },
    { value: '6', label: 'Farmacêutico' },
    { value: '7', label: 'Fonoaudiólogo' },
    { value: '8', label: 'Terapeuta Ocupacional' },
    { value: '9', label: 'Médico' },
    { value: '10', label: 'Outros' }
];





interface CdsIndividualFormProps {
    data: BpaRecordInput;
    onChange: (data: BpaRecordInput) => void;
    // Procedure Handlers
    procedures: any[];
    onUpdateProcedure: (index: number, data: any) => void;
    onRemoveProcedure: (index: number) => void;
    onOpenSigtap: (index: number) => void;
    onToggleExpand: (index: number) => void;
    onAddProcedure: () => void;
    userCbo: string;
    competence: string;
    isHypertensiveOrDiabetic?: boolean;
    pendingExams?: { code: string, name: string, date: string }[];
}

export const CdsIndividualForm: React.FC<CdsIndividualFormProps> = ({
    data,
    onChange,
    procedures,
    onUpdateProcedure,
    onRemoveProcedure,
    onOpenSigtap,
    onToggleExpand,
    onAddProcedure,
    userCbo,
    competence,
    isHypertensiveOrDiabetic = false,
    pendingExams = []
}) => {
    // Problem Search State
    const [problemSearch, setProblemSearch] = useState('');
    const [problemResults, setProblemResults] = useState<any[]>([]);
    const [isSearchingProblem, setIsSearchingProblem] = useState(false);

    // State for Exam Search
    const [examSearch, setExamSearch] = React.useState(''); // Used for fallback or display if needed
    const [isExamModalOpen, setIsExamModalOpen] = React.useState(false);
    const [examResults, setExamResults] = React.useState<any[]>([]);
    const [isSearchingExam, setIsSearchingExam] = React.useState(false);

    // Helper to identify "Fertile Age Female" for Pregnancy Block
    const isFertileFemale = React.useMemo(() => {
        const age = parseInt(data.patientAge || '0');
        return data.patientSex === 'F' && age >= 9 && age <= 60;
        return data.patientSex === 'F' && age >= 9 && age <= 60;
    }, [data.patientSex, data.patientAge]);

    const isElderly = React.useMemo(() => {
        const age = parseInt(data.patientAge || '0');
        return age >= 60;
    }, [data.patientAge]);

    // Helper to update specific SOAP fields deeply
    const updateSoap = (section: 'subjective' | 'objective' | 'evaluation' | 'plan', field: string, value: any) => {
        const currentSoaps = data.soaps || {};
        const currentSection = currentSoaps[section] || {};

        onChange({
            ...data,
            soaps: {
                ...currentSoaps,
                [section]: {
                    ...currentSection,
                    [field]: value
                }
            }
        });
    };

    const handleSearchProblem = async () => {
        if (problemSearch.length < 3) return;
        setIsSearchingProblem(true);
        try {
            // 1. Search Local CIAP/CID Mapping
            const ciapResults = await searchCiap(problemSearch);

            // 2. Search Remote SIGTAP CIDs (Backup)
            const sigtapResults = await searchCids(problemSearch);

            // 3. Merge and Format
            const mappedCiap = ciapResults.map(r => ({
                code: r.ciap,
                label: `${r.ciap_desc} (CID: ${r.cid})`,
                type: 'CIAP2'
            }));

            const mappedCid = sigtapResults.map(r => ({
                code: r.code,
                label: r.name,
                type: 'CID10'
            }));

            // Combine, prioritizing CIAP
            setProblemResults([...mappedCiap, ...mappedCid]);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearchingProblem(false);
        }
    };

    const addProblem = (problem: { code: string, label: string, type: 'CIAP2' | 'CID10' }) => {
        const currentList = data.soaps?.evaluation?.problemConditions || [];
        if (!currentList.some(p => p.code === problem.code)) {
            // Default isAvaliado to true when adding? Or false? Usually true if I'm adding it.
            // Thrift definition: isAvaliado?: boolean;
            updateSoap('evaluation', 'problemConditions', [...currentList, { ...problem, isAvaliado: true }]);
        }
        setProblemSearch('');
        setProblemResults([]);
    };

    const removeProblem = (code: string) => {
        const currentList = data.soaps?.evaluation?.problemConditions || [];
        updateSoap('evaluation', 'problemConditions', currentList.filter(p => p.code !== code));
    };

    const toggleConduct = (value: string) => {
        const currentList = data.soaps?.plan?.conduct || [];
        if (currentList.includes(value)) {
            updateSoap('plan', 'conduct', currentList.filter(c => c !== value));
        } else {
            updateSoap('plan', 'conduct', [...currentList, value]);
        }
    };

    // Effect: Enforce Conduct '4' if Referrals exist
    React.useEffect(() => {
        const hasReferrals = data.encaminhamentos && data.encaminhamentos.length > 0;
        const currentConducts = data.soaps?.plan?.conduct || [];

        if (hasReferrals && !currentConducts.includes('4')) {
            updateSoap('plan', 'conduct', [...currentConducts, '4']);
        }
    }, [data.encaminhamentos]);

    const handleSearchExam = async () => {
        if (examSearch.length < 3) return;
        setIsSearchingExam(true);
        try {
            // Search Procedures (Group 02 is often exams, but we search by name/code)
            // Filter Group 02 = Procedures Diagnósticos
            const results = await searchProcedures(examSearch, 20, data.competence || '202412', '02');
            setExamResults(results);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearchingExam(false);
        }
    };

    const handleSelectExamFromModal = (proc: any) => {
        // Validation: Must be Group 02 (Diagnósticos) per LEDI recommendation (though not strict blocker, good practice)
        if (proc.groupCode !== '02') {
            // In a real app we might show a toast. For now, we allow but maybe warn?
            // Actually user asked for "Exames", so usually Group 02.
            // Let's enforce it to avoid confusion with treatments.
            alert("Atenção: Selecione um procedimento do Grupo 02 (Procedimentos com Finalidade Diagnóstica) para esta seção.");
            return;
        }
        addExam(proc);
    };

    const addExam = (proc: any) => {
        // Check duplicate
        if (data.soaps?.plan?.exames?.some((e: any) => e.codigoExame === proc.code)) return;

        const currentExams = data.soaps?.plan?.exames || [];
        const newExam = {
            codigoExame: proc.code,
            nomeExame: proc.name, // Helper for UI
            solicitadoAvaliado: ['S'] // Default to Solicitado
        };

        updateSoap('plan', 'exames', [...currentExams, newExam]);
        setIsExamModalOpen(false);
    };

    const removeExam = (codigoExame: string) => {
        const currentExams = data.soaps?.plan?.exames || [];
        updateSoap('plan', 'exames', currentExams.filter(e => e.codigoExame !== codigoExame));
    };

    return (
        <div className="space-y-6">

            {/* 1. ANTHROPOMETRY & VITALS */}
            <Card className={cn("p-5 border-l-4 transition-colors", isHypertensiveOrDiabetic ? "border-l-red-500 bg-red-50/10" : "border-l-blue-500")}>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-blue-500" />
                    Avaliação Antropométrica e Sinais Vitais
                </h3>

                {/* Antropometria Básica */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Input
                        label="Peso (kg)"
                        type="number"
                        step="0.1"
                        value={data.weight || ''}
                        onChange={e => onChange({ ...data, weight: e.target.value })}
                        placeholder="00.0"
                    />
                    <Input
                        label="Altura (cm)"
                        type="number"
                        value={data.height || ''}
                        onChange={e => onChange({ ...data, height: e.target.value })}
                        placeholder="000"
                    />

                    {/* Conditional: Child Fields */}
                    {parseInt(data.patientAge || '0') < 2 && (
                        <Select
                            label="Aleitamento Materno"
                            value={data.breastfeedingType || ''}
                            onChange={e => onChange({ ...data, breastfeedingType: e.target.value })}
                            options={LISTA_ALEITAMENTO}
                        />
                    )}

                    <div className="flex items-end mb-2">
                        <label className="flex items-center gap-2 cursor-pointer bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-800 w-full hover:bg-blue-100 transition-colors">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                                checked={data.vacinaEmDia || false}
                                onChange={e => onChange({ ...data, vacinaEmDia: e.target.checked })}
                            />
                            <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Vacinação em Dia?</span>
                        </label>
                    </div>
                </div>

                {/* Extended Anthropometry for FAI */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Input
                        label="Perímetro Cefálico (cm)"
                        type="number"
                        step="0.1"
                        placeholder="00.0"
                        value={data.perimetroCefalico || ''}
                        onChange={e => onChange({ ...data, perimetroCefalico: e.target.value })}
                    />
                    <Input
                        label="Perímetro Panturrilha (cm)"
                        type="number"
                        step="0.1"
                        placeholder="00.0"
                        value={data.perimetroPanturrilha || ''}
                        onChange={e => onChange({ ...data, perimetroPanturrilha: e.target.value })}
                    />
                    <Input
                        label="Circ. Abdominal (cm)"
                        type="number"
                        step="0.1"
                        placeholder="00.0"
                        value={data.circunferenciaAbdominal || ''}
                        onChange={e => onChange({ ...data, circunferenciaAbdominal: e.target.value })}
                    />
                    <div className="flex items-end mb-2">
                        <label className={cn(
                            "flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border w-full transition-colors",
                            data.ficouEmObservacao
                                ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200"
                                : "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700"
                        )}>
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500"
                                checked={data.ficouEmObservacao || false}
                                onChange={e => onChange({ ...data, ficouEmObservacao: e.target.checked })}
                            />
                            <span className="text-sm font-bold">Ficou em Observação?</span>
                        </label>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <label className={cn(
                        "text-xs font-bold uppercase block mb-3 border-b pb-1 flex justify-between items-center",
                        isHypertensiveOrDiabetic ? "text-red-600 border-red-200" : "text-gray-500 border-gray-200 dark:border-gray-700"
                    )}>
                        <span>Sinais Vitais {isHypertensiveOrDiabetic ? '(Obrigatórios: Hipertenso/Diabético)' : ''}</span>
                        {isHypertensiveOrDiabetic && <AlertCircle size={14} className="text-red-500 animate-pulse" />}
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <div className="col-span-1">
                            <Input
                                label="PA Sistólica (mmHg)"
                                placeholder="120"
                                type="number"
                                value={data.pressaoArterialSistolica || ''}
                                onChange={e => onChange({ ...data, pressaoArterialSistolica: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1">
                            <Input
                                label="PA Diastólica (mmHg)"
                                placeholder="80"
                                type="number"
                                value={data.pressaoArterialDiastolica || ''}
                                onChange={e => onChange({ ...data, pressaoArterialDiastolica: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1">
                            <Input
                                label="Freq. Cardíaca (BPM)"
                                placeholder="80"
                                type="number"
                                value={data.frequenciaCardiaca || ''}
                                onChange={e => onChange({ ...data, frequenciaCardiaca: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1">
                            <Input
                                label="Temp. (ºC)"
                                placeholder="36.5"
                                type="number"
                                step="0.1"
                                value={data.temperatura || ''}
                                onChange={e => onChange({ ...data, temperatura: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1">
                            <Input
                                label="Sat. O2 (%)"
                                placeholder="98"
                                type="number"
                                value={data.saturacaoO2 || ''}
                                onChange={e => onChange({ ...data, saturacaoO2: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1">
                            <Input
                                label="Freq. Respiratória"
                                placeholder="18"
                                type="number"
                                value={data.frequenciaRespiratoria || ''}
                                onChange={e => onChange({ ...data, frequenciaRespiratoria: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="md:col-span-1">
                            <Input
                                label="Glicemia Capilar (mg/dL)"
                                placeholder="100"
                                type="number"
                                value={data.glicemiaCapilar || ''}
                                onChange={e => onChange({ ...data, glicemiaCapilar: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Select
                                label="Momento da Coleta (Glicemia)"
                                value={data.tipoGlicemiaCapilar || ''}
                                onChange={e => onChange({ ...data, tipoGlicemiaCapilar: e.target.value })}
                                options={[
                                    { value: '', label: 'Selecione...' },
                                    { value: '1', label: 'Jejum' },
                                    { value: '2', label: 'Pós-Prandial' },
                                    { value: '3', label: 'Outro Momento' }
                                ]}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* NEW: IVCF (Vulnerability Index) */}
            <div className={`relative transition-opacity ${!isElderly ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                    {!isElderly && (
                        <div className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded border border-gray-200 flex items-center gap-1 w-fit">
                            <AlertCircle size={12} />
                            Habilitado apenas para Idosos (60+)
                        </div>
                    )}
                    {isElderly && (
                        <div className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded border border-purple-200 shadow-sm flex items-center gap-1 w-fit">
                            <AlertCircle size={12} />
                            Recomendado para Idosos (60+)
                        </div>
                    )}
                </div>
                {/* Visual Lock Overlay for non-elderly */}
                {!isElderly && (
                    <div className="absolute inset-0 z-10 cursor-not-allowed" title="Apenas para pacientes com 60 anos ou mais" />
                )}
                <IvcfForm
                    value={data.ivcf}
                    onChange={(val) => onChange({ ...data, ivcf: val })}
                />
            </div>

            {/* NEW: PREGNANCY BLOCK (Conditional) */}
            {isFertileFemale && (
                <Card className="p-5 border-l-4 border-l-pink-400 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <Baby size={20} className="text-pink-400" />
                        Acompanhamento da Gestante
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="flex items-end mb-2 lg:col-span-1">
                            <label className="flex items-center gap-2 cursor-pointer bg-pink-50 dark:bg-pink-900/10 px-3 py-2 rounded-lg border border-pink-100 dark:border-pink-800 w-full hover:bg-pink-100 transition-colors">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded text-pink-500 focus:ring-pink-400"
                                    checked={data.isPregnant || false}
                                    onChange={e => onChange({ ...data, isPregnant: e.target.checked })}
                                />
                                <span className="text-sm font-bold text-pink-700 dark:text-pink-300">É Gestante?</span>
                            </label>
                        </div>

                        {data.isPregnant && (
                            <>
                                <Input
                                    label="DUM (Última Menstruação)"
                                    type="date"
                                    value={data.dumDaGestante || ''}
                                    onChange={e => onChange({ ...data, dumDaGestante: e.target.value })}
                                />
                                <Input
                                    label="Idade Gestacional (Semanas)"
                                    type="number"
                                    placeholder="Sem."
                                    value={data.idadeGestacional || ''}
                                    onChange={e => onChange({ ...data, idadeGestacional: e.target.value })}
                                />
                                <div className="flex items-end mb-2">
                                    <label className="flex items-center gap-2 cursor-pointer w-full">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-pink-500"
                                            checked={data.stGravidezPlanejada || false}
                                            onChange={e => onChange({ ...data, stGravidezPlanejada: e.target.checked })}
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Gravidez Planejada?</span>
                                    </label>
                                </div>
                            </>
                        )}

                        {/* Always show History for fertile women? Or only if pregnant? Manual implies history can be collected anytime */}
                        {/* Audit says: Cannot be filled if Sex Male. Doesn't strictly say Pregnant Only. */}
                        <div className="lg:col-span-1">
                            <Input
                                label="Gestas Prévias"
                                type="number"
                                placeholder="0"
                                value={data.nuGestasPrevias || ''}
                                onChange={e => onChange({ ...data, nuGestasPrevias: e.target.value })}
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <Input
                                label="Partos Prévios"
                                type="number"
                                placeholder="0"
                                value={data.nuPartos || ''}
                                onChange={e => onChange({ ...data, nuPartos: e.target.value })}
                            />
                        </div>
                    </div>
                </Card>
            )}

            {/* 2. SOAP - PROBLEM LIST */}
            <Card className="p-5 border-l-4 border-l-orange-500 overflow-visible">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Stethoscope size={20} className="text-orange-500" />
                    Problema / Condição Avaliada
                </h3>

                <div className="space-y-4">
                    <div className="relative z-50">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Buscar CID-10 ou CIAP-2..."
                                value={problemSearch}
                                onChange={e => setProblemSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearchProblem()}
                                className="flex-1"
                            />
                            <Button type="button" onClick={handleSearchProblem} disabled={isSearchingProblem}>
                                <Search size={18} />
                            </Button>
                        </div>

                        {/* Search Results List (Inline to avoid clipping) */}
                        {problemResults.length > 0 && (
                            <div className="mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg shadow-inner max-h-60 overflow-y-auto">
                                <div className="sticky top-0 bg-gray-50 dark:bg-gray-800 p-2 text-xs text-center text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                    {problemResults.length} resultados encontrados. Selecione um abaixo:
                                </div>
                                {problemResults.map((res) => (
                                    <div
                                        key={res.code}
                                        className="p-3 hover:bg-teal-50 dark:hover:bg-teal-900/30 cursor-pointer text-sm border-b border-gray-100 dark:border-gray-700/50 last:border-none transition-colors flex flex-col"
                                        onClick={() => addProblem(res)}
                                    >
                                        <span className="font-bold text-gray-900 dark:text-gray-100">{res.code}</span>
                                        <span className="text-gray-600 dark:text-gray-400 text-xs uppercase">{res.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Problems List */}
                    <div className="flex flex-wrap gap-2">
                        <ProblemaCondicaoList
                            value={data.soaps?.evaluation?.problemConditions}
                            onChange={(val) => updateSoap('evaluation', 'problemConditions', val)}
                            patientDob={data.patientDob}
                            attendanceDate={data.attendanceDate}
                        />
                    </div>
                </div>
            </Card>

            {/* NEW: PRESCRIPTIONS & REFERRALS */}
            <Card className="p-5 border-l-4 border-l-emerald-500 overflow-visible">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <ClipboardList size={20} className="text-emerald-500" />
                    Prescrições e Encaminhamentos
                    <div className="group relative ml-2">
                        <HelpCircle size={16} className="text-gray-400 cursor-help hover:text-emerald-500 transition-colors" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] whitespace-normal">
                            Registre aqui Sinais Vitais do paciente, Medicamentos receitados e Encaminhamentos para especialidades.
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800"></div>
                        </div>
                    </div>
                </h3>
                <MedicamentosList
                    value={data.medicamentos}
                    onChange={(val) => onChange({ ...data, medicamentos: val })}
                />
                <EncaminhamentosList
                    value={data.encaminhamentos}
                    onChange={(val) => onChange({ ...data, encaminhamentos: val })}
                    userCbo={userCbo}
                />
            </Card>

            {/* 4. EXAMS BLOCK (New) */}
            <Card className="p-5 border-l-4 border-l-purple-500 overflow-visible">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <TestTube size={20} className="text-purple-500" />
                    Exames Solicitados / Avaliados
                    <div className="group relative ml-2">
                        <HelpCircle size={16} className="text-gray-400 cursor-help hover:text-purple-500 transition-colors" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] whitespace-normal">
                            Utilize para solicitar novos exames (SIA) ou registrar que um exame trazido pelo paciente foi avaliado nesta consulta.
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800"></div>
                        </div>
                    </div>
                </h3>
                <RequestedExamsList
                    value={data.soaps?.plan?.exames}
                    onChange={(val) => {
                        updateSoap('plan', 'exames', val);

                        // Auto-populate Results for Evaluated Exams
                        const evaluated = val.filter((v: any) => v.solicitadoAvaliado.includes('A'));
                        const currentResults = data.resultadosExames || [];
                        const newResults = [...currentResults];
                        let hasChanges = false;

                        evaluated.forEach((exam: any) => {
                            // Check if already exists in results
                            if (!newResults.some((res: any) => res.exame === exam.codigoExame)) {
                                // Find solicitation date from pending list if possible
                                const pendingInfo = pendingExams.find((p: any) => p.code === exam.codigoExame);
                                const dateSolicited = pendingInfo ? pendingInfo.date : data.attendanceDate; // Default to today/attendance date if new

                                newResults.push({
                                    exame: exam.codigoExame,
                                    dataSolicitacao: dateSolicited,
                                    dataRealizacao: data.attendanceDate, // Assume realized today if evaluated today
                                    dataResultado: data.attendanceDate,
                                    resultado: [] // Empty result to be filled
                                });
                                hasChanges = true;
                            }
                        });

                        if (hasChanges) {
                            onChange({ ...data, resultadosExames: newResults });
                        }
                    }}
                    currentCompetence={competence}
                    pendingExams={pendingExams}
                />
            </Card>

            {/* NEW: EXAM RESULTS */}
            <Card className="p-5 border-l-4 border-l-purple-500 overflow-visible">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <TestTube size={20} className="text-purple-500" />
                    Resultados de Exames
                    <div className="group relative ml-2">
                        <HelpCircle size={16} className="text-gray-400 cursor-help hover:text-purple-500 transition-colors" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] whitespace-normal">
                            Registre os valores dos resultados (numéricos ou texto) para exames realizados, para fins de monitoramento e histórico.
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800"></div>
                        </div>
                    </div>
                </h3>
                {/* Content of Exam Results */}
                <ExamResultsList
                    value={data.resultadosExames}
                    onChange={(val) => onChange({ ...data, resultadosExames: val })}
                    patientDob={data.patientDob}
                    attendanceDate={data.attendanceDate}
                />
            </Card>

            {/* NEW: OCI REQUESTS (Above Procedures) */}
            <Card className="p-5 border-l-4 border-l-cyan-600 overflow-visible">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-cyan-600" />
                    Solicitações OCI (Oferta de Cuidado Integrado)
                    <div className="group relative ml-2">
                        <HelpCircle size={16} className="text-gray-400 cursor-help hover:text-cyan-600 transition-colors" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] whitespace-normal">
                            Insira procedimentos do SigTap (Grupo 09) que estão sendo solicitados como oferta de cuidado integrado.
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800"></div>
                        </div>
                    </div>
                </h3>
                <SolicitacoesOciList
                    value={data.solicitacoesOci}
                    onChange={(val) => onChange({ ...data, solicitacoesOci: val })}
                    currentCompetence={competence}
                    existingProcedureCodes={procedures.map(p => p.procedureCode)}
                />
            </Card>

            {/* 7. PROCEDURES (Moved Here) */}
            <Card className="p-5 border-l-4 border-l-blue-500">
                <ProcedureSection
                    procedures={procedures}
                    competence={competence}
                    onUpdate={onUpdateProcedure}
                    onRemove={onRemoveProcedure}
                    onOpenSigtap={onOpenSigtap}
                    onToggleExpand={onToggleExpand}
                    onAdd={onAddProcedure}
                    userCbo={userCbo}
                    title="Procedimentos Realizados"
                    icon={<FileText size={20} className="text-blue-500" />}
                    colorClass="border-l-blue-500"
                />
            </Card>

            {/* NEW: FAI - NASF & PICs & AD */}
            {/* NEW: FAI - NASF & PICs & AD */}
            <Card className="p-5 border-l-4 border-l-indigo-500 overflow-visible">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <ClipboardList size={20} className="text-indigo-500" />
                    Outras Informações (NASF, PICs, AD)
                    <div className="group relative ml-2">
                        <HelpCircle size={16} className="text-gray-400 cursor-help hover:text-indigo-500 transition-colors" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] whitespace-normal">
                            Preencha se houver acompanhamento compartilhado (NASF), uso de Práticas Integrativas (PICs) ou Admissão em Atenção Domiciliar (AD).
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800"></div>
                        </div>
                    </div>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block flex justify-between items-center">
                            <span>e-Multi (Antigo NASF)</span>
                            <span className="text-[10px] font-normal text-gray-500 bg-gray-100 px-1 rounded">v7.3.3 (ID 38)</span>
                        </label>

                        {/* Validation Warning for NASF/e-Multi */}
                        {data.soaps?.plan?.conduct?.includes('14') && (!data.emultis || data.emultis.length === 0) && (
                            <div className="mb-2 text-amber-600 text-xs flex items-center gap-1 bg-amber-50 p-1.5 rounded border border-amber-200">
                                <AlertCircle size={14} />
                                Conduta 14 selecionada: Indique quais profissionais e-Multi participaram.
                            </div>
                        )}
                        {/* Suggestion for Conduct 14 */}
                        {data.emultis && data.emultis.length > 0 && !data.soaps?.plan?.conduct?.includes('14') && (
                            <div className="mb-2 text-indigo-600 text-xs flex items-center gap-1 bg-indigo-50 p-1.5 rounded border border-indigo-200 cursor-pointer hover:bg-indigo-100"
                                onClick={() => {
                                    const currentConducts = data.soaps?.plan?.conduct || [];
                                    updateSoap('plan', 'conduct', [...currentConducts, '14']);
                                }}
                            >
                                <HelpCircle size={14} />
                                Profissionais selecionados. Clique para adicionar "Conduta 14 - Agendamento e-Multi".
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {LISTA_NASF.map(item => (
                                <Badge
                                    key={`emulti-${item.value}`}
                                    variant={data.emultis?.includes(item.value) ? 'default' : 'outline'}
                                    className={cn(
                                        "cursor-pointer px-3 py-1.5 text-sm select-none hover:opacity-80 transition-all",
                                        data.emultis?.includes(item.value)
                                            ? "ring-2 ring-offset-1 ring-teal-500 bg-teal-600 hover:bg-teal-700"
                                            : "hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200"
                                    )}
                                    // Use explicit onClick on the span (Badge passes spread props now)
                                    onClick={() => {
                                        const current = data.emultis || [];
                                        const newVal = current.includes(item.value)
                                            ? current.filter(c => c !== item.value)
                                            : [...current, item.value];
                                        onChange({ ...data, emultis: newVal });
                                    }}
                                >
                                    {item.label}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <div>
                            <Select
                                label="Modalidade Atenção Domiciliar (AD)"
                                value={data.atencaoDomiciliarModalidade || ''}
                                onChange={e => onChange({ ...data, atencaoDomiciliarModalidade: e.target.value })}
                                options={LISTA_AD_MODALIDADE}
                            />
                            {data.atencaoDomiciliarModalidade && data.localAtendimento !== '4' && (
                                <div className="mt-1 text-amber-600 text-xs flex items-start gap-1">
                                    <AlertCircle size={14} className="mt-0.5" />
                                    <span>Atenção: Paciente em AD. Se esta for uma visita domiciliar, verifique se o <b>Local de Atendimento</b> está "04 - Domicílio".</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <Select
                                label="Práticas Integrativas (PICs)"
                                value={data.pic || ''}
                                onChange={e => onChange({ ...data, pic: e.target.value })}
                                options={LISTA_PICs}
                            />
                            <p className="text-[10px] text-gray-400 mt-1 pl-1">
                                (ID 19) Preenche Práticas Integrativas v7.3.3.
                            </p>
                        </div>
                    </div>
                </div>


            </Card>

            {/* 3. SOAP - CONDUCT */}
            < Card className="p-5 border-l-4 border-l-green-500" >
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <ClipboardList size={20} className="text-green-500" />
                    Conduta / Desfecho
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {LISTA_CONDUTAS.map(opt => (
                        <label key={opt.value} className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                            <input
                                type="checkbox"
                                className="mt-1 w-4 h-4 rounded text-green-600 focus:ring-green-500"
                                checked={(data.soaps?.plan?.conduct || []).includes(opt.value)}
                                onChange={() => toggleConduct(opt.value)}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                        </label>
                    ))}
                </div>
            </Card >


            {/* Modal de Exames */}
            < SigtapTreeSelector
                isOpen={isExamModalOpen}
                onClose={() => setIsExamModalOpen(false)}
                onSelect={handleSelectExamFromModal}
                currentCompetence={data.competence}
            />
        </div >
    );
};
