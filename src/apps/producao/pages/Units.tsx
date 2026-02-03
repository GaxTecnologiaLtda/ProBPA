import React from 'react';
import { useApp } from '../context';
import { Card } from '../components/ui/BaseComponents';
import { MapPin, Phone, Building2, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';

export const Units: React.FC = () => {
    const { user } = useApp();

    if (!user) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Unidades</h1>
            <div className="grid gap-6 md:grid-cols-2">
                {user.units.map((unit, idx) => (
                    <motion.div
                        key={unit.id}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Card className="p-6 h-full flex flex-col">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-medical-100 dark:bg-medical-900/30 flex items-center justify-center text-medical-600 dark:text-medical-400">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg text-gray-900 dark:text-white">{unit.name}</h2>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {unit.cnes && <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">CNES: {unit.cnes}</span>}
                                        {unit.type && <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800">{unit.type}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 flex-1">
                                {unit.municipalityName && (
                                    <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                                        <MapPin size={18} className="shrink-0 mt-0.5" />
                                        <span>{unit.municipalityName}</span>
                                    </div>
                                )}
                                {unit.occupation && (
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                        <Stethoscope size={18} className="shrink-0" />
                                        <span>{unit.occupation}</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};