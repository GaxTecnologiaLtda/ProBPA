import React, { useState } from 'react';
import { Card, Button, Input, Select, Badge, cn } from '../../components/ui/BaseComponents';
import { BpaRecordInput } from '../../services/bpaService';
import { Search, MapPin, Activity, TestTube, ClipboardList, Trash2 } from 'lucide-react'; // Removing separate Stethoscope, CheckCircle unused? Or kept?
import { searchProcedures } from '../../services/sigtapLookupService';
import { SigtapTreeSelector } from '../SigtapTreeSelector';
import { ProblemaCondicaoList } from './fai/ProblemaCondicaoList';

const LISTA_AD_MODALIDADE = [
    { value: '1', label: 'AD1' },
    { value: '2', label: 'AD2' },
    { value: '3', label: 'AD3' },
];

const LISTA_TIPO_ATENDIMENTO_FAD = [
    { value: '1', label: 'Atendimento Programado / Cuidado Continuado' },
    { value: '2', label: 'Atendimento Agendado' },
    { value: '3', label: 'Demanda Espontânea' }, // FAD typically reuses standard types for 1-6? Or strictly 7,8,9?
    // Dictionary said: "Apenas 7, 8 ou 9". Let's restrict.
    { value: '7', label: 'Visita Domiciliar' },
    { value: '8', label: 'Sessão de Cuidados / Procedimentos' }, // Educated guess description
    { value: '9', label: 'Visita Domiciliar Pós-Óbito' },
];

const LISTA_CONDICOES_AVALIADAS = [
    { value: '1', label: 'Acamado' },
    { value: '2', label: 'Domiciliado' },
    { value: '3', label: 'Úlceras / Feridas (grau III ou IV)' },
    { value: '4', label: 'Acompanhamento nutricional' },
    { value: '5', label: 'Uso de sonda naso-gástrica - SNG' },
    { value: '6', label: 'Uso de sonda naso-enteral - SNE' },
    { value: '7', label: 'Uso de gastrostomia' },
    { value: '8', label: 'Uso de colostomia' },
    { value: '9', label: 'Uso de cistostomia' },
    { value: '10', label: 'Uso de sonda vesical de demora - SVD' },
    { value: '11', label: 'Acompanhamento pré-operatório' },
    { value: '12', label: 'Acompanhamento pós-operatório' },
    { value: '13', label: 'Adaptação ao uso de órtese / prótese' },
    { value: '14', label: 'Reabilitação domiciliar' },
    { value: '15', label: 'Cuidados paliativos oncológico' },
    { value: '16', label: 'Cuidados paliativos não-oncológico' },
    { value: '17', label: 'Oxigenoterapia domiciliar' },
    { value: '18', label: 'Uso de traqueostomia' },
    { value: '19', label: 'Uso de aspirador de vias aéreas para higiene brônquica' },
    { value: '20', label: 'Suporte ventilatório não invasivo - CPAP' },
    { value: '21', label: 'Suporte ventilatório não invasivo - BiPAP' },
    { value: '22', label: 'Diálise peritonial' },
    { value: '23', label: 'Paracentese' },
    { value: '24', label: 'Medicação parenteral' }
];

const LISTA_CONDUTA_DESFECHO = [
    { value: '7', label: 'Permanência' },
    { value: '1', label: 'Alta Clínica' },
    { value: '2', label: 'Encaminhamento - Atenção Básica (AD1)' },
    { value: '4', label: 'Encaminhamento - Urgência e Emergência' },
    { value: '5', label: 'Encaminhamento - Internação Hospitalar' },
    { value: '9', label: 'Óbito' },
];

interface CdsDomiciliarFormProps {
    data: BpaRecordInput;
    onChange: (data: BpaRecordInput) => void;
}

export const CdsDomiciliarForm: React.FC<CdsDomiciliarFormProps> = ({ data, onChange }) => {
    // Procedure Search
    const [isProcModalOpen, setIsProcModalOpen] = useState(false);

    // Helpers
    const updateFad = (field: string, value: any) => {
        const currentFad = data.fadData || {};
        onChange({
            ...data,
            fadData: {
                ...currentFad,
                [field]: value
            }
        });
    };

    // Handler for ProblemaCondicaoList
    const handleProblemasChange = (newProblems: any[]) => {
        onChange({
            ...data,
            soaps: {
                ...data.soaps,
                evaluation: {
                    ...data.soaps?.evaluation,
                    problemConditions: newProblems
                }
            }
        });
    };

    const handleSelectProcedure = (proc: any) => {
        const currentProcs = data.fadData?.procedimentos || [];
        if (!currentProcs.includes(proc.code)) {
            updateFad('procedimentos', [...currentProcs, proc.code]);
        }
        setIsProcModalOpen(false);
    };

    const removeProcedure = (code: string) => {
        const currentProcs = data.fadData?.procedimentos || [];
        updateFad('procedimentos', currentProcs.filter(c => c !== code));
    };

    return (
        <div className="space-y-6">
            {/* Header / Context */}
            <Card className="p-5 border-l-4 border-l-teal-500 bg-teal-50/50 dark:bg-teal-900/10">
                <h3 className="text-lg font-semibold text-teal-800 dark:text-teal-200 mb-2 flex items-center gap-2">
                    <MapPin size={20} />
                    Ficha de Atendimento Domiciliar (FAD)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Você selecionou "Domicílio". Esta ficha é específica para atendimentos realizados no ambiente domiciliar pelo profissional médico/enfermeiro ou equipe multiprofissional.
                </p>
            </Card>

            {/* AD Details */}
            <Card className="p-5 border-l-4 border-l-blue-500">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-blue-500" />
                    Dados do Atendimento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Modalidade AD"
                        value={data.fadData?.atencaoDomiciliarModalidade?.toString() || ''}
                        onChange={e => updateFad('atencaoDomiciliarModalidade', parseInt(e.target.value))}
                        options={LISTA_AD_MODALIDADE}
                    />
                    <Select
                        label="Tipo de Atendimento"
                        value={data.fadData?.tipoAtendimento?.toString() || ''}
                        onChange={e => updateFad('tipoAtendimento', parseInt(e.target.value))}
                        options={LISTA_TIPO_ATENDIMENTO_FAD}
                    />
                </div>

                <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">Condições Avaliadas</label>
                    <div className="flex flex-wrap gap-2">
                        {LISTA_CONDICOES_AVALIADAS.map(cond => (
                            <Badge
                                key={cond.value}
                                variant={data.fadData?.condicoesAvaliadas?.includes(parseInt(cond.value)) ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => {
                                    const current = data.fadData?.condicoesAvaliadas || [];
                                    const val = parseInt(cond.value);
                                    updateFad('condicoesAvaliadas', current.includes(val)
                                        ? current.filter(c => c !== val)
                                        : [...current, val]
                                    );
                                }}
                            >
                                {cond.label}
                            </Badge>
                        ))}
                    </div>
                </div>
            </Card>

            {/* SOAP Problems (Shared) */}
            <Card className="p-5 border-l-4 border-l-orange-500 overflow-visible">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-orange-500" />
                    Problema / Condição Avaliada
                </h3>

                <ProblemaCondicaoList
                    value={data.soaps?.evaluation?.problemConditions || []}
                    onChange={handleProblemasChange}
                    patientDob={data.patientDob}
                    attendanceDate={data.attendanceDate}
                />
            </Card>

            {/* Procedures */}
            <Card className="p-5 border-l-4 border-l-purple-500">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <TestTube size={20} className="text-purple-500" />
                    Procedimentos Realizados
                </h3>
                <Button variant="outline" onClick={() => setIsProcModalOpen(true)}>
                    <Search className="mr-2" size={16} /> Adicionar Procedimento
                </Button>

                <div className="mt-4 space-y-2">
                    {(data.fadData?.procedimentos || []).map((proc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                            <span className="font-mono">{proc}</span>
                            <button type="button" onClick={() => removeProcedure(proc)} className="text-red-500">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Outcome */}
            <Card className="p-5 border-l-4 border-l-green-500">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <ClipboardList size={20} className="text-green-500" />
                    Conduta / Desfecho
                </h3>
                <Select
                    label="Desfecho do Atendimento"
                    value={data.fadData?.condutaDesfecho?.toString() || ''}
                    onChange={e => updateFad('condutaDesfecho', parseInt(e.target.value))}
                    options={LISTA_CONDUTA_DESFECHO}
                />
            </Card>

            <SigtapTreeSelector
                isOpen={isProcModalOpen}
                onClose={() => setIsProcModalOpen(false)}
                onSelect={handleSelectProcedure}
                currentCompetence={data.competence}
            />
        </div>
    );
};
