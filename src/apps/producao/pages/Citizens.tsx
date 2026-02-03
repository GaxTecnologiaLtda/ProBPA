
import React, { useState } from 'react';
import { useApp } from '../context';
import { PatientsList } from '../components/PatientsList';
import { PatientRegistration } from './PatientRegistration';
import { Button } from '../components/ui/BaseComponents';
import { Plus, User, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Citizens: React.FC = () => {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingPatient, setEditingPatient] = useState<any>(null);

    const handleNew = () => {
        setEditingPatient(null);
        setView('form');
    };

    const handleEdit = (patient: any) => {
        setEditingPatient(patient);
        setView('form');
    };

    const handleBack = () => {
        setView('list');
        setEditingPatient(null);
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <User className="text-blue-600" />
                        Cidadãos
                    </h1>
                    <p className="text-gray-500 text-sm">Gerenciamento da base de pacientes do município</p>
                </div>

                {view === 'list' && (
                    <Button onClick={handleNew} className="gap-2">
                        <Plus size={18} />
                        Novo Cadastro
                    </Button>
                )}
                {view === 'form' && (
                    <Button variant="outline" onClick={handleBack} className="gap-2">
                        <ArrowLeft size={18} />
                        Voltar para Lista
                    </Button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {view === 'list' ? (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <PatientsList onEdit={handleEdit} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        <PatientRegistration
                            initialData={editingPatient}
                            onCancel={handleBack}
                            onSaveSuccess={() => {
                                handleBack();
                                // Optional: Trigger toast
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
