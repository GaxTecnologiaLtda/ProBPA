import React, { useState } from 'react';
import { Card, Button, Input, Select, Badge, cn } from '../../../components/ui/BaseComponents';
import { Activity, Calculator } from 'lucide-react';

interface IvcfData {
    resultado: number; // Score
    dataResultado: string;
    hasSgIdade?: boolean;
    hasSgPercepcaoSaude?: boolean;
    hasSgAvdInstrumental?: boolean;
    hasSgAvdBasica?: boolean;
    hasSgCognicao?: boolean;
    hasSgHumor?: boolean;
    hasSgAlcancePreensaoPinca?: boolean;
    hasSgCapAerobicaMuscular?: boolean;
    hasSgMarcha?: boolean;
    hasSgContinencia?: boolean;
    hasSgVisao?: boolean;
    hasSgAudicao?: boolean;
    hasSgComorbidade?: boolean;
}

interface IvcfFormProps {
    value?: IvcfData;
    onChange: (val: IvcfData | undefined) => void;
    disabled?: boolean;
}

const FLAG_LABELS: { key: keyof IvcfData; label: string }[] = [
    { key: 'hasSgIdade', label: 'Idade (>= 75 anos)' },
    { key: 'hasSgPercepcaoSaude', label: 'Percepção da Saúde' },
    { key: 'hasSgAvdInstrumental', label: 'AVD Instrumental' },
    { key: 'hasSgAvdBasica', label: 'AVD Básica' },
    { key: 'hasSgCognicao', label: 'Cognição' },
    { key: 'hasSgHumor', label: 'Humor' },
    { key: 'hasSgAlcancePreensaoPinca', label: 'Alcance, Preensão e Pinça' },
    { key: 'hasSgCapAerobicaMuscular', label: 'Capacidade Aeróbica/Muscular' },
    { key: 'hasSgMarcha', label: 'Marcha' },
    { key: 'hasSgContinencia', label: 'Continência' },
    { key: 'hasSgVisao', label: 'Visão' },
    { key: 'hasSgAudicao', label: 'Audição' },
    { key: 'hasSgComorbidade', label: 'Comorbidades Múltiplas' },
];

export const IvcfForm: React.FC<IvcfFormProps> = ({ value, onChange, disabled }) => {
    // If value is undefined, show "Start Assessment" button?
    // Or just render empty form.
    const data = value || { resultado: 0, dataResultado: '' };
    const [isOpen, setIsOpen] = useState(!!value);

    const handleChange = (key: keyof IvcfData, val: any) => {
        const next = { ...data, [key]: val };
        onChange(next);
    };

    if (!isOpen) {
        return (
            <Button variant="outline" size="sm" onClick={() => { setIsOpen(true); onChange({ resultado: 0, dataResultado: new Date().toISOString().split('T')[0] }); }}>
                <Activity className="w-4 h-4 mr-2 text-orange-600" />
                Iniciar Avaliação IVCF-20 (Idoso)
            </Button>
        );
    }

    return (
        <Card className="p-4 border border-orange-200 shadow-sm mt-4 bg-orange-50/30">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <Activity className="w-4 h-4 text-orange-600" />
                    IVCF-20 (Índice de Vulnerabilidade)
                </h3>
                <Button variant="ghost" size="xs" onClick={() => { setIsOpen(false); onChange(undefined); }}>
                    Remover
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    {FLAG_LABELS.map(flag => (
                        <label key={flag.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded">
                            <input
                                name={flag.key}
                                type="checkbox"
                                checked={!!data[flag.key as keyof IvcfData]}
                                onChange={e => handleChange(flag.key, e.target.checked)}
                                disabled={disabled}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            />
                            {flag.label}
                        </label>
                    ))}
                </div>

                <div className="space-y-4 bg-white p-4 rounded border">
                    <div>
                        <label className="text-xs font-medium mb-1 block">Data do Resultado</label>
                        <Input
                            type="date"
                            value={data.dataResultado}
                            onChange={e => handleChange('dataResultado', e.target.value)}
                            disabled={disabled}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block">Pontuação Total (0-40)</label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                value={data.resultado}
                                onChange={e => handleChange('resultado', parseInt(e.target.value) || 0)}
                                disabled={disabled}
                                className="font-bold text-lg"
                            />
                            {/* Placeholder for auto-calc */}
                            {/* <Button variant="secondary" size="icon"><Calculator className="w-4 h-4" /></Button> */}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                            0-6: Robusto | 7-14: Pré-frágil | 15+: Frágil
                        </p>
                    </div>
                </div>
            </div>
        </Card>
    );
};
