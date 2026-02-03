import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, GraduationCap, PlayCircle, FileText, ChevronRight } from 'lucide-react';
import { useApp } from '../context';
import { Card } from '../components/ui/BaseComponents';
import { OnboardingSimplified } from '../components/onboarding/OnboardingSimplified';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Placeholder Components for Onboarding
const OnboardingMedico = () => (
    <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
        <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-2">Onboarding Médico</h3>
        <p className="text-sm text-blue-600 dark:text-blue-300">Conteúdo específico para Médicos será carregado aqui.</p>
    </div>
);

const OnboardingEnfermeiro = () => (
    <div className="p-6 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800">
        <h3 className="text-lg font-bold text-teal-700 dark:text-teal-400 mb-2">Onboarding Enfermeiro</h3>
        <p className="text-sm text-teal-600 dark:text-teal-300">Conteúdo específico para Enfermeiros será carregado aqui.</p>
    </div>
);

const OnboardingDentista = () => (
    <div className="p-6 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-100 dark:border-cyan-800">
        <h3 className="text-lg font-bold text-cyan-700 dark:text-cyan-400 mb-2">Onboarding Dentista</h3>
        <p className="text-sm text-cyan-600 dark:text-cyan-300">Conteúdo específico para Dentistas/TSB será carregado aqui.</p>
    </div>
);

const OnboardingTecnico = () => (
    <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
        <h3 className="text-lg font-bold text-purple-700 dark:text-purple-400 mb-2">Onboarding Técnico</h3>
        <p className="text-sm text-purple-600 dark:text-purple-300">Conteúdo específico para Técnicos de Enfermagem será carregado aqui.</p>
    </div>
);

const OnboardingAgente = () => (
    <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
        <h3 className="text-lg font-bold text-orange-700 dark:text-orange-400 mb-2">Onboarding Agente (ACS/ACE)</h3>
        <p className="text-sm text-orange-600 dark:text-orange-300">Conteúdo específico para Agentes de Saúde será carregado aqui.</p>
    </div>
);

const OnboardingGeral = () => (
    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">Onboarding Geral</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Conteúdo geral do sistema.</p>
    </div>
);


export const Tutorials: React.FC = () => {
    const { user, currentUnit } = useApp();
    const [activeTab, setActiveTab] = useState<'onboarding' | 'videos' | 'docs'>('onboarding');
    const [interfaceType, setInterfaceType] = useState<'PEC' | 'SIMPLIFIED'>('PEC');
    const [loadingConfig, setLoadingConfig] = useState(true);

    // Fetch Municipality Config (Identical to Register.tsx logic)
    useEffect(() => {
        async function fetchConfig() {
            if (!currentUnit) {
                setLoadingConfig(false);
                return;
            }

            const mId = currentUnit.municipalityId;
            if (!mId) {
                setLoadingConfig(false);
                return;
            }

            // Check Cache
            const cached = localStorage.getItem(`probpa_config_${mId}`);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    setInterfaceType(parsed.type);
                    setLoadingConfig(false);
                    // Continue to fetch fresh in background? No, Register logic trusts cache + fallback.
                    // We'll mimic Register: Try fetch, if fail/wait, use cache.
                } catch (e) { console.error(e); }
            }

            try {
                const entityId = user?.entityId;
                if (!entityId) throw new Error("User Entity ID missing");

                // Try fetching from Public path first
                let docRef = doc(db, 'municipalities', 'PUBLIC', entityId, mId);
                let docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    // Try Private
                    docRef = doc(db, 'municipalities', 'PRIVATE', entityId, mId);
                    docSnap = await getDoc(docRef);
                }

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const type = data.interfaceType || 'PEC';
                    setInterfaceType(type);
                    // Update Cache
                    localStorage.setItem(`probpa_config_${mId}`, JSON.stringify({
                        type,
                        timestamp: Date.now()
                    }));
                }
            } catch (err) {
                console.warn("Error fetching config for Tutorials:", err);
            } finally {
                setLoadingConfig(false);
            }
        }
        fetchConfig();
    }, [currentUnit, user?.entityId]);

    // Identificação da Interface (Lógica espelhada do Register.tsx)
    const userInterface = useMemo(() => {
        const cbo = user?.cbo || '';

        // 1. Médicos (225)
        if (cbo.startsWith('225')) return 'MEDICO';

        // 2. Enfermeiros (2235)
        if (cbo.startsWith('2235')) return 'ENFERMEIRO';

        // 3. Dentistas (2232) & TSB (3224)
        if (cbo.startsWith('2232') || cbo.startsWith('3224')) return 'DENTISTA';

        // 4. Técnicos de Enfermagem (3222)
        if (cbo.startsWith('3222')) return 'TECNICO';

        // 5. ACS (5151) & ACE (5153)
        if (cbo.startsWith('5151') || cbo.startsWith('5153')) return 'AGENTE';

        return 'OUTROS';
    }, [user?.cbo]);

    // Selecionar componente de onboarding baseado na interface
    const OnboardingComponent = useMemo(() => {
        // Priority 1: Simplified Interface
        if (interfaceType === 'SIMPLIFIED') return OnboardingSimplified;

        // Priority 2: CBO-based
        switch (userInterface) {
            case 'MEDICO': return OnboardingMedico;
            case 'ENFERMEIRO': return OnboardingEnfermeiro;
            case 'DENTISTA': return OnboardingDentista;
            case 'TECNICO': return OnboardingTecnico;
            case 'AGENTE': return OnboardingAgente;
            default: return OnboardingGeral;
        }
    }, [userInterface, interfaceType]);

    const tabs = [
        { id: 'onboarding', label: 'Tudo sobre o painel', icon: GraduationCap },
        { id: 'videos', label: 'Vídeo Aulas', icon: PlayCircle }, // Placeholder
        { id: 'docs', label: 'Documentação', icon: FileText },   // Placeholder
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-8 h-8 text-medical-600" />
                        Central de Ajuda
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Materiais educativos e guias do sistema</p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex overflow-x-auto pb-2 gap-2 border-b border-gray-200 dark:border-gray-700 hide-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors relative whitespace-nowrap
                            ${activeTab === tab.id
                                ? 'text-medical-600 dark:text-medical-400 bg-white dark:bg-gray-800 border-x border-t border-gray-200 dark:border-gray-700'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }
                        `}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-white dark:bg-gray-800"
                            />
                        )}
                        {activeTab === tab.id && (
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-medical-500 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'onboarding' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Bem-vindo ao ProBPA
                                </h2>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                    Perfil: {userInterface}
                                </span>
                            </div>

                            <OnboardingComponent />
                        </div>
                    )}

                    {activeTab === 'videos' && (
                        <Card className="p-12 text-center text-gray-500">
                            <PlayCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <h3 className="text-lg font-medium">Biblioteca de Vídeos</h3>
                            <p>Em breve você terá acesso a vídeo-aulas detalhadas.</p>
                        </Card>
                    )}

                    {activeTab === 'docs' && (
                        <Card className="p-12 text-center text-gray-500">
                            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <h3 className="text-lg font-medium">Documentação Técnica</h3>
                            <p>Manuais e notas técnicas estarão disponíveis aqui.</p>
                        </Card>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
