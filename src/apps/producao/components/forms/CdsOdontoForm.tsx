import React from 'react';
import { Card, Select, Badge } from '../../components/ui/BaseComponents';
import { BpaRecordInput } from '../../services/bpaService';
import { MedicamentosList } from './fai/MedicamentosList';
import { EncaminhamentosList } from './fai/EncaminhamentosList';
import { ExamResultsList } from './fai/ExamResultsList';
import { ProblemaCondicaoList } from './fai/ProblemaCondicaoList';
import { IvcfForm } from './fai/IvcfForm';
import { SolicitacoesOciList } from './fai/SolicitacoesOciList';
import { Settings, AlertTriangle, CheckSquare, Pill, ClipboardList, Activity, FileText } from 'lucide-react';

const LISTA_TIPO_CONSULTA = [
    { value: '1', label: 'Primeira Consulta Odontológica Programática' },
    { value: '2', label: 'Consulta de Retorno em Odontologia' },
    { value: '4', label: 'Consulta de Manutenção em Odontologia' }
];

const LISTA_VIGILANCIA = [
    { value: '1', label: 'Abscesso dentoalveolar' },
    { value: '2', label: 'Alteração em tecidos moles' },
    { value: '3', label: 'Dor de dente' },
    { value: '4', label: 'Fenda palatina/labial' },
    { value: '5', label: 'Fluorose dentária' },
    { value: '6', label: 'Traumatismo dentoalveolar' },
    { value: '99', label: 'Não identificado' }
];

const LISTA_CONDUTA_ODONTO = [
    { value: '16', label: 'Retorno para consulta agendada' },
    { value: '12', label: 'Agendamento para outros profissionais da AB' },
    { value: '18', label: 'Agendamento para NASF/e-Multi' },
    { value: '14', label: 'Agendamento para grupos' },
    { value: '17', label: 'Alta do episódio' },
    { value: '15', label: 'Tratamento concluído' }
];

interface CdsOdontoFormProps {
    data: BpaRecordInput;
    onChange: (data: BpaRecordInput) => void;
}

export const CdsOdontoForm: React.FC<CdsOdontoFormProps> = ({ data, onChange }) => {

    const toggleVigilance = (value: string) => {
        const currentList = data.oralHealthVigilance || [];
        if (currentList.includes(value)) {
            // Uncheck
            onChange({ ...data, oralHealthVigilance: currentList.filter(v => v !== value) });
        } else {
            // Check (Handle exclusive logic for '99-Não identificado' if needed, but LEDI allows mix usually. For UI clarity, maybe auto-uncheck others if 99?)
            if (value === '99') {
                onChange({ ...data, oralHealthVigilance: ['99'] });
            } else {
                onChange({ ...data, oralHealthVigilance: [...currentList.filter(v => v !== '99'), value] });
            }
        }
    };

    const toggleConduct = (value: string) => {
        const currentList = data.odontoConduct || [];
        if (currentList.includes(value)) {
            onChange({ ...data, odontoConduct: currentList.filter(c => c !== value) });
        } else {
            onChange({ ...data, odontoConduct: [...currentList, value] });
        }
    };

    return (
        <div className="space-y-6">

            {/* 1. TIPO DE CONSULTA */}
            <Card className="p-5 border-l-4 border-l-teal-500">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Settings size={20} className="text-teal-500" />
                    Tipo de Consulta
                </h3>
                <div className="max-w-md">
                    <Select
                        label="Selecione o tipo de consulta"
                        value={data.consultationType || ''}
                        onChange={e => onChange({ ...data, consultationType: e.target.value })}
                        options={LISTA_TIPO_CONSULTA}
                    />
                    {!data.consultationType && (
                        <p className="text-xs text-red-500 mt-1">* Obrigatório para Dentistas</p>
                    )}
                </div>
            </Card>

            {/* 2. VIGILÂNCIA EM SAÚDE BUCAL */}
            <Card className="p-5 border-l-4 border-l-yellow-500">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-yellow-500" />
                    Vigilância em Saúde Bucal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {LISTA_VIGILANCIA.map(opt => (
                        <label key={opt.value} className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                            <input
                                type="checkbox"
                                className="mt-1 w-4 h-4 rounded text-yellow-600 focus:ring-yellow-500"
                                checked={(data.oralHealthVigilance || []).includes(opt.value)}
                                onChange={() => toggleVigilance(opt.value)}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                        </label>
                    ))}
                </div>
                {(data.oralHealthVigilance || []).length === 0 && (
                    <p className="text-xs text-red-500 mt-2">* Selecione ao menos uma opção (ou "Não identificado")</p>
                )}
            </Card>

            {/* 3. CONDUTA ODONTOLÓGICA */}
            <Card className="p-5 border-l-4 border-l-green-500">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <CheckSquare size={20} className="text-green-500" />
                    Conduta / Desfecho
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {LISTA_CONDUTA_ODONTO.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                                checked={(data.odontoConduct || []).includes(opt.value)}
                                onChange={() => toggleConduct(opt.value)}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                        </label>
                    ))}
                </div>
            </Card>

            {/* NEW V7.3.3 SECTIONS */}

            {/* IVCF (Age >= 60) - Reuse Component */}
            {Number(data.patientAge) >= 60 && (
                <IvcfForm
                    value={data.ivcf}
                    onChange={(val) => onChange({ ...data, ivcf: val })}
                    patientAge={data.patientAge}
                />
            )}

            {/* PROBLEMAS / CONDICOES */}
            <ProblemaCondicaoList
                value={data.problemasCondicoes || []}
                onChange={(val) => onChange({ ...data, problemasCondicoes: val })}
                patientDob={data.patientDob}
                attendanceDate={data.attendanceDate}
            />

            {/* MEDICAMENTOS */}
            <MedicamentosList
                value={data.medicamentos || []}
                onChange={(val) => onChange({ ...data, medicamentos: val })}
            />

            {/* ENCAMINHAMENTOS */}
            <EncaminhamentosList
                value={data.encaminhamentos || []}
                onChange={(val) => onChange({ ...data, encaminhamentos: val })}
            />

            {/* RESULTADOS EXAMES */}
            <ExamResultsList
                value={data.resultadosExames || []}
                onChange={(val) => onChange({ ...data, resultadosExames: val })}
            />

            {/* SOLICITACOES OCI */}
            <SolicitacoesOciList
                value={data.solicitacoesOci || []}
                onChange={(val) => onChange({ ...data, solicitacoesOci: val })}
                currentCompetence={data.competence}
            />

        </div>
    );
};
