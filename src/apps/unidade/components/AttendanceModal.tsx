import React, { useState } from 'react';
import { X, Search, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: any) => void;
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [step, setStep] = useState<'search' | 'details'>('search');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [observation, setObservation] = useState('');
    const [isPriority, setIsPriority] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock search
        if (searchTerm.length > 2) {
            // Simulate finding a patient
            setSelectedPatient({ name: 'Maria da Silva', cns: '700123456789012', birthDate: '15/05/1980' });
            setStep('details');
        }
    };

    const handleConfirm = () => {
        onConfirm({ patient: selectedPatient, reason: observation, isPriority, type: 'DEMANDA_ESPONTANEA' });
        onClose();
        // Reset
        setStep('search');
        setSearchTerm('');
        setSelectedPatient(null);
        setObservation('');
        setIsPriority(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="text-lg font-bold text-gray-900">
                            Demanda Espontânea
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="bg-blue-50/50 p-4 border-b border-gray-100 flex gap-3 text-sm text-blue-800">
                        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                        <p>
                            Use esta opção quando o cidadão chegar <strong>sem agendamento</strong>.
                            Se estiver agendado, registre a presença pela Agenda.
                        </p>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        {step === 'search' ? (
                            <form onSubmit={handleSearch} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Cidadão</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            autoFocus
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-medical-500 outline-none transition-shadow"
                                            placeholder="Nome, CNS ou Data de Nascimento..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={searchTerm.length < 3}
                                    className="w-full py-3 bg-medical-600 text-white rounded-xl font-bold hover:bg-medical-700 disabled:opacity-50 transition-all shadow-md"
                                >
                                    Buscar Cidadão
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center gap-4">
                                    <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                                        <User className="w-6 h-6 text-gray-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{selectedPatient.name}</h3>
                                        <p className="text-sm text-gray-500">CNS: {selectedPatient.cns}</p>
                                    </div>
                                    <button onClick={() => setStep('search')} className="ml-auto text-sm text-medical-600 hover:underline">
                                        Trocar
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Observação Administrativa</label>
                                    <textarea
                                        className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-medical-500 outline-none h-24 resize-none"
                                        placeholder="Ex: Dor, Retorno, Renovação de Receita..."
                                        value={observation}
                                        onChange={(e) => setObservation(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-400 mt-1 text-right">Esta observação auxiliará a equipe interna.</p>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-100 cursor-pointer" onClick={() => setIsPriority(!isPriority)}>
                                    <input
                                        type="checkbox"
                                        id="priority"
                                        checked={isPriority}
                                        onChange={(e) => setIsPriority(e.target.checked)}
                                        className="w-5 h-5 text-medical-600 rounded focus:ring-medical-500"
                                    />
                                    <label htmlFor="priority" className="text-gray-900 font-medium cursor-pointer select-none flex-1">
                                        Prioritário
                                        <span className="block text-xs text-gray-500 font-normal mt-0.5">Se marcado, o cidadão aparece no topo da fila.</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        type="button"
                                        className="py-3 px-4 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                        onClick={onClose}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        className="py-3 px-4 bg-medical-600 text-white rounded-xl font-bold hover:bg-medical-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                        onClick={handleConfirm}
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                        Registrar Chegada
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AttendanceModal;
