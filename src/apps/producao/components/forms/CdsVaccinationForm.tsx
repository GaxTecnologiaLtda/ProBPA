
import React from 'react';
import { Card, Input, Select } from '../../components/ui/BaseComponents';
import { Activity, AlertCircle, Syringe, ShieldCheck } from 'lucide-react';
import { BpaRecordInput } from '../../services/bpaService';
import { LISTA_IMUNOBIOLOGICOS, LISTA_ESTRATEGIA_VACINACAO, LISTA_DOSE_VACINACAO, LISTA_VIA_ADMINISTRACAO, LISTA_LOCAL_APLICACAO } from '../../constants';

interface CdsVaccinationFormProps {
    data: BpaRecordInput;
    onChange: (data: BpaRecordInput) => void;
}

export const CdsVaccinationForm: React.FC<CdsVaccinationFormProps> = ({ data, onChange }) => {

    // Helper to update nested vaccinationData
    const updateVaccine = (field: string, value: any) => {
        onChange({
            ...data,
            vaccinationData: {
                ...data.vaccinationData,
                [field]: value
            } as any
        });
    };

    // Ensure vaccinationData exists
    React.useEffect(() => {
        if (!data.vaccinationData) {
            onChange({
                ...data,
                vaccinationData: {
                    imunobiologico: '',
                    estrategia: '1', // Default Rotina
                    dose: '1',      // Default 1ª Dose
                    lote: '',
                    fabricante: ''
                }
            });
        }
    }, []);

    const vData = data.vaccinationData || { imunobiologico: '', estrategia: '1', dose: '1', lote: '', fabricante: '' };

    return (
        <div className="space-y-6">
            <Card className="p-5 border-l-4 border-l-purple-500">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-purple-500" />
                    Dados da Vacinação (CDS 10)
                </h3>

                <div className="space-y-4">
                    {/* Linha 1: Imunobiológico + Estratégia */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-1">
                            <Select
                                label="Imunobiológico"
                                value={vData.imunobiologico}
                                onChange={e => updateVaccine('imunobiologico', e.target.value)}
                                options={[{ value: '', label: 'Selecione...' }, ...LISTA_IMUNOBIOLOGICOS]}
                            />
                        </div>
                        <div className="sm:col-span-1">
                            <Select
                                label="Estratégia"
                                value={vData.estrategia}
                                onChange={e => updateVaccine('estrategia', e.target.value)}
                                options={LISTA_ESTRATEGIA_VACINACAO}
                            />
                        </div>
                    </div>

                    {/* Linha 2: Dose, Via, Local */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Select
                            label="Dose"
                            value={vData.dose}
                            onChange={e => updateVaccine('dose', e.target.value)}
                            options={LISTA_DOSE_VACINACAO}
                        />
                        <Select
                            label="Via de Administração"
                            value={vData.viaAdministracao || ''}
                            onChange={e => updateVaccine('viaAdministracao', e.target.value)}
                            options={[{ value: '', label: 'Selecione...' }, ...LISTA_VIA_ADMINISTRACAO]}
                        />
                        <Select
                            label="Local de Aplicação"
                            value={vData.localAplicacao || ''}
                            onChange={e => updateVaccine('localAplicacao', e.target.value)}
                            options={[{ value: '', label: 'Selecione...' }, ...LISTA_LOCAL_APLICACAO]}
                        />
                    </div>

                    {/* Linha 3: Lote, Fabricante */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Lote"
                            placeholder="Ex: AB1234"
                            value={vData.lote}
                            onChange={e => updateVaccine('lote', e.target.value)}
                        />
                        <Input
                            label="Fabricante"
                            placeholder="Ex: FIOCRUZ"
                            value={vData.fabricante}
                            onChange={e => updateVaccine('fabricante', e.target.value)}
                        />
                    </div>

                    {/* Alert for user */}
                    <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg flex items-start gap-3 text-sm text-purple-700 dark:text-purple-300">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>
                            Para vacinas da COVID-19, certifique-se de preencher corretamente o <strong>Lote</strong> e <strong>Fabricante</strong> conforme orientado pelo Ministério da Saúde.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Conditions Section - Simplified from Patient Data but specific to Vaccination Context if needed */}
            {/* Note: Register.tsx usually handles patient conditions in the main Patient Card. 
                However, CDS 10 specifically asks for "Condição" checkboxes (Gestante, Puérpera, Viajante).
                Ideally, these should be synced with the main Patient Form demographics if possible, 
                or explicitly asked here if they are transient conditions for the vaccine record.
                For now, we assume the main Patient Form covers "Gestante/Puérpera". 
                "Viajante" is specific.
            */}
            <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.isTraveler || false}
                        onChange={e => onChange({ ...data, isTraveler: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Viajante</span>
                </label>
            </div>
        </div>
    );
};
