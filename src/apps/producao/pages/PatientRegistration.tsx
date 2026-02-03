import React, { useState } from 'react';
import { useApp } from '../context'; // Import Context
import { Card, Button, Input, Select, cn } from '../components/ui/BaseComponents';
import { User, Save, MapPin, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { LISTA_RACA_COR, LISTA_SEXO, LISTA_ESCOLARIDADE, LISTA_ORIENTACAO_SEXUAL, LISTA_IDENTIDADE_GENERO, LISTA_SITUACAO_MERCADO, LISTA_CONDICOES_SAUDE } from '../constants';
import { saveOrUpdatePatient } from '../services/bpaService'; // Import Service
import { validateCNS, validatePatientName } from '../utils/lediValidation';

interface PatientRegistrationProps {
    initialData?: any;
    onCancel?: () => void;
    onSaveSuccess?: () => void;
}

export const PatientRegistration: React.FC<PatientRegistrationProps> = ({ initialData, onCancel, onSaveSuccess }) => {
    const [step, setStep] = useState<number>(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [patient, setPatient] = useState(initialData || {
        cns: '',
        cpf: '',
        name: '',
        dob: '',
        sex: '',
        race: '',
        nationality: '010', // Brasileira
        phone: '',
        motherName: '',
        fatherName: '', // Optional

        // Address
        cep: '',
        municipalityCode: '',
        street: '',
        number: '',
        complement: '',
        district: '',
        uf: '',

        // Social / CDS 02 Specifics
        schooling: '', // Escolaridade
        occupation: '', // Ocupação
        isHomeless: false,
        // Condições de Saúde (LEDI Map)
        healthConditions: {} as Record<string, boolean>,

        // Legacy/Helpers (Derived or Specific)
        // isHomeless is already defined above
        // isPregnant removed from root, now in healthConditions['statusEhGestante']

        // Household (Simplify for now, maybe linking to family later)
    });

    // Context
    const { user, currentUnit } = useApp();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation (Basic)
        if (!patient.cns && !patient.cpf) {
            setError('CNS ou CPF Obrigatório');
            return;
        }
        if (!patient.name) {
            setError('Nome Obrigatório');
            return;
        }

        setLoading(true);
        try {
            // New Scoped Save
            await saveOrUpdatePatient(
                {
                    ...patient,
                    searchKeywords: patient.name.toLowerCase().split(' ')
                },
                currentUnit?.municipalityId,
                user?.entityId,
                user?.entityType,
                currentUnit?.id
            );

            if (onSaveSuccess) {
                onSaveSuccess();
            } else {
                setSuccess(true);
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar cadastro.');
        } finally {
            setLoading(false);
        }
    };

    if (success && !onSaveSuccess) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[60vh]">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle size={48} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Cadastro Realizado!</h2>
                <p className="text-gray-500 mb-6">O cidadão foi cadastrado com sucesso na base.</p>
                <div className="flex gap-4">
                    <Button onClick={() => { setSuccess(false); setPatient({ ...patient, cns: '', name: '' }); }}>
                        Novo Cadastro
                    </Button>
                    {onCancel && (
                        <Button variant="outline" onClick={onCancel}>
                            Voltar para Lista
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto p-4 pb-24"
        >
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="text-blue-600" />
                    Cadastro e-SUS (CDS 02)
                </h1>
                <p className="text-gray-500">Ficha de Cadastro Individual e Sociodemográfico</p>

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl flex gap-3 text-sm text-blue-700 dark:text-blue-300">
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <p>
                            <strong>Atenção:</strong> Esta aba deve ser utilizada apenas quando o paciente <strong>não estiver cadastrado</strong> na base do município.
                        </p>
                        <p className="opacity-90">
                            No modo de <strong>Interface Simplificada</strong>, os pacientes são importados diretamente do e-SUS APS municipal, conforme autorização da <strong>Secretaria de Educação Municipal</strong>, respeitando rigorosamente os critérios da <strong>LGPD</strong>.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave}>
                <Card className="p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">1. Identificação Pessoal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="CNS (Cartão SUS)" value={patient.cns} onChange={e => setPatient({ ...patient, cns: e.target.value })} />
                        <Input label="CPF" value={patient.cpf} onChange={e => setPatient({ ...patient, cpf: e.target.value })} />
                        <Input label="Data de Nascimento" type="date" value={patient.dob} onChange={e => setPatient({ ...patient, dob: e.target.value })} />

                        <div className="md:col-span-2">
                            <Input label="Nome Completo" value={patient.name} onChange={e => setPatient({ ...patient, name: e.target.value })} />
                        </div>

                        <Select label="Sexo" value={patient.sex} onChange={e => setPatient({ ...patient, sex: e.target.value })} options={LISTA_SEXO} />
                        <Select label="Raça/Cor" value={patient.race} onChange={e => setPatient({ ...patient, race: e.target.value })} options={LISTA_RACA_COR} />

                        <div className="md:col-span-2">
                            <Input label="Nome da Mãe" value={patient.motherName} onChange={e => setPatient({ ...patient, motherName: e.target.value })} />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
                        <MapPin size={18} /> Endereço e Moradia
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input label="CEP" value={patient.cep} onChange={e => setPatient({ ...patient, cep: e.target.value })} />
                        <div className="md:col-span-3">
                            <Input label="Logradouro" value={patient.street} onChange={e => setPatient({ ...patient, street: e.target.value })} />
                        </div>
                        <Input label="Número" value={patient.number} onChange={e => setPatient({ ...patient, number: e.target.value })} />
                        <div className="md:col-span-2">
                            <Input label="Bairro" value={patient.district} onChange={e => setPatient({ ...patient, district: e.target.value })} />
                        </div>
                        <Select
                            label="Situação de Moradia"
                            value={patient.isHomeless ? 'rua' : 'casa'}
                            onChange={e => setPatient({ ...patient, isHomeless: e.target.value === 'rua' })}
                            options={[{ value: 'casa', label: 'Domiciliar' }, { value: 'rua', label: 'Situação de Rua' }]}
                        />
                    </div>
                </Card>

                <Card className="p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
                        <User size={18} /> Dados Sociodemográficos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="Escolaridade" value={patient.schooling} onChange={e => setPatient({ ...patient, schooling: e.target.value })} options={LISTA_ESCOLARIDADE} />
                        <Select label="Situação Mercado de Trabalho" value={patient.occupation} onChange={e => setPatient({ ...patient, occupation: e.target.value })} options={LISTA_SITUACAO_MERCADO} />
                        <Select label="Orientação Sexual" value={patient.sexualOrientation} onChange={e => setPatient({ ...patient, sexualOrientation: e.target.value })} options={LISTA_ORIENTACAO_SEXUAL} />
                        <Select label="Identidade de Gênero" value={patient.genderIdentity} onChange={e => setPatient({ ...patient, genderIdentity: e.target.value })} options={LISTA_IDENTIDADE_GENERO} />
                    </div>
                </Card>

                <Card className="p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
                        <AlertCircle size={18} /> Condições de Saúde
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {LISTA_CONDICOES_SAUDE.map(cond => (
                            <label key={cond.key} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={!!patient.healthConditions[cond.key]}
                                    onChange={e => {
                                        setPatient({
                                            ...patient,
                                            healthConditions: {
                                                ...patient.healthConditions,
                                                [cond.key]: e.target.checked
                                            }
                                        });
                                    }}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{cond.label}</span>
                            </label>
                        ))}
                    </div>
                </Card>

                {patient.isHomeless && (
                    <Card className="p-6 mb-6 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/10">
                        <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2 text-amber-800 dark:text-amber-200">
                            <AlertCircle size={18} /> Situação de Rua
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Tempo em situação de rua (meses)" type="number"
                                value={(patient as any).timeOnStreet || ''}
                                onChange={e => setPatient({ ...patient, timeOnStreet: e.target.value } as any)}
                            />
                            <Select label="Recebe Benefício?"
                                value={(patient as any).hasBenefit || 'no'}
                                onChange={e => setPatient({ ...patient, hasBenefit: e.target.value } as any)}
                                options={[{ value: 'yes', label: 'Sim' }, { value: 'no', label: 'Não' }]}
                            />
                            <Select label="Possui referência familiar?"
                                value={(patient as any).hasFamilyRef || 'no'}
                                onChange={e => setPatient({ ...patient, hasFamilyRef: e.target.value } as any)}
                                options={[{ value: 'yes', label: 'Sim' }, { value: 'no', label: 'Não' }]}
                            />
                        </div>
                    </Card>
                )}

                {/* Error Feedback */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 flex items-center gap-2">
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                {/* Better layout for buttons */}
                <div className="flex justify-between items-center mt-6">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} className="text-gray-500">
                            Cancelar
                        </Button>
                    )}
                    <div className={cn("flex gap-4", !onCancel && "w-full justify-end")}>
                        <Button onClick={handleSave} isLoading={loading} className="px-8">
                            <Save size={20} className="mr-2" />
                            Salvar {initialData ? 'Alterações' : 'Cadastro'}
                        </Button>
                    </div>
                </div>
            </form>
        </motion.div >
    );
};
