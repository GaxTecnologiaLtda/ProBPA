
import React, { useState, useEffect } from "react";
import { useApp } from "../context";
import { searchPatients } from "../services/bpaService";
import { Card, Button, Input, Select } from "../components/ui/BaseComponents";
import { UserCircle, Search, Save, Edit, History, Plus } from "lucide-react";
import { cn } from "../components/ui/BaseComponents";
import { motion, AnimatePresence } from "framer-motion";

interface PatientsListProps {
    onEdit: (patient: any) => void;
}

export const PatientsList: React.FC<PatientsListProps> = ({ onEdit }) => {
    const { user, currentUnit } = useApp();
    const [searchTerm, setSearchTerm] = useState("");
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterUnit, setFilterUnit] = useState(true); // Default to 'My Unit'

    const handleSearch = async (term: string = searchTerm) => {
        if (!currentUnit?.municipalityId || !user?.entityId) return;

        setLoading(true);
        try {
            const results = await searchPatients(
                term,
                currentUnit.municipalityId,
                user.entityId,
                user.entityType || 'PUBLIC',
                filterUnit ? currentUnit.id : undefined
            );
            setPatients(results);
        } catch (error) {
            console.error("Error searching patients:", error);
        } finally {
            setLoading(false);
        }
    };

    // Initial load - show recent
    useEffect(() => {
        handleSearch("");
    }, [filterUnit, currentUnit]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex-1 w-full relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por Nome, CPF ou CNS..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                    />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                        <input
                            type="checkbox"
                            checked={filterUnit}
                            onChange={(e) => setFilterUnit(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        Apenas minha Unidade
                    </label>
                    <Button onClick={() => handleSearch()}>
                        Buscar
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500 animate-pulse">
                    Buscando pacientes...
                </div>
            ) : patients.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <UserCircle size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Nenhum paciente encontrado.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {patients.map(patient => (
                        <motion.div
                            key={patient.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-bold">
                                    {patient.name?.charAt(0) || 'U'}
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="sm" variant="ghost" onClick={() => onEdit(patient)}>
                                        <Edit size={16} className="text-gray-500 hover:text-blue-500" />
                                    </Button>
                                </div>
                            </div>

                            <h3 className="font-bold text-gray-900 dark:text-white truncate" title={patient.name}>
                                {patient.name}
                            </h3>

                            <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                <p className="flex items-center gap-2">
                                    <span className="font-medium text-gray-400 w-8">CPF:</span>
                                    {patient.cpf || '-'}
                                </p>
                                <p className="flex items-center gap-2">
                                    <span className="font-medium text-gray-400 w-8">CNS:</span>
                                    {patient.cns || '-'}
                                </p>
                                <p className="flex items-center gap-2">
                                    <span className="font-medium text-gray-400 w-8">Mãe:</span>
                                    <span className="truncate">{patient.motherName || '-'}</span>
                                </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center">
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                    patient.unitId === currentUnit?.id
                                        ? "bg-green-50 text-green-700 border border-green-100"
                                        : "bg-gray-50 text-gray-500 border border-gray-100"
                                )}>
                                    {patient.unitId === currentUnit?.id ? "Minha Unidade" : "Outra Unidade"}
                                </span>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onEdit(patient)}>
                                    Detalhes
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};
