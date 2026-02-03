import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { LayoutDashboard, PlusCircle, History, UserCircle, Menu, Moon, Sun, Wifi, WifiOff, LogOut, Building2, FileBarChart, X, ChevronRight, LifeBuoy, Target, RefreshCw, Database, AlertCircle, CheckCircle, BookOpen } from 'lucide-react';
import { cn } from './ui/BaseComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { getVersionString, LATEST_CHANGES } from '../version';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme, toggleTheme, user, logout, isOnline, currentUnit } = useApp();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [hasNewVersion, setHasNewVersion] = useState(false);

    React.useEffect(() => {
        const lastVersion = localStorage.getItem('proBPA_last_version_prod');
        const currentVersion = getVersionString();

        if (lastVersion !== currentVersion) {
            setHasNewVersion(true);
        }
    }, []);

    const isActive = (path: string) => location.pathname === path;

    // Navigation Items Data
    const mainNavItems = [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/registrar", icon: PlusCircle, label: "Registrar Atendimento" },
        { to: "/cidadao", icon: UserCircle, label: "Cadastro do Cidadão" },
        { to: "/historico", icon: History, label: "Histórico" },
        { to: "/unidades", icon: Building2, label: "Unidades" },
        { to: "/tutoriais", icon: BookOpen, label: "Tutoriais" },
        { to: "/suporte", icon: LifeBuoy, label: "Suporte Técnico" },
    ];

    // Component for Sidebar/Drawer Links
    const SidebarLink: React.FC<{ to: string; icon: React.ElementType; label: string }> = ({ to, icon: Icon, label }) => (
        <Link
            to={to}
            onClick={() => setIsMobileMenuOpen(false)}
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mb-1",
                isActive(to)
                    ? "bg-medical-50 text-medical-700 dark:bg-medical-900/20 dark:text-medical-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
        >
            <Icon size={20} className={cn(isActive(to) && "text-medical-600 dark:text-medical-400")} />
            <span>{label}</span>
            {isActive(to) && <ChevronRight size={16} className="ml-auto text-medical-500" />}
        </Link>
    );

    // Connection Status Logic
    const [showConnectionInfo, setShowConnectionInfo] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const wasOffline = React.useRef(!navigator.onLine);

    useEffect(() => {
        if (!isOnline) {
            wasOffline.current = true;
        } else if (wasOffline.current) {
            // Check if we actually came from offline
            setIsSyncing(true);
            const timer = setTimeout(() => setIsSyncing(false), 4000); // 4s visual sync
            wasOffline.current = false;
            return () => clearTimeout(timer);
        }
    }, [isOnline]);

    // SIGTAP SYNC LOGIC
    const [isSyncingSigtap, setIsSyncingSigtap] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncMessage, setSyncMessage] = useState('');
    const [lastSyncDate, setLastSyncDate] = useState<string | null>(localStorage.getItem('probpa_sigtap_last_sync'));

    const handleSyncSigtap = async () => {
        setIsSyncingSigtap(true);
        setSyncProgress(0);
        setSyncMessage("Iniciando...");

        try {
            // Dynamic import to avoid circular dependency if any (unlikely here but good practice)
            const { prefetchSigtapData } = await import('../services/sigtapLookupService');

            await prefetchSigtapData((msg, progress) => {
                setSyncMessage(msg);
                setSyncProgress(progress);
            });

            // Success feedback
            setSyncMessage("Concluído!");
            setLastSyncDate(new Date().toISOString());
            setTimeout(() => {
                setIsSyncingSigtap(false);
                setSyncMessage('');
                setSyncProgress(0);
            }, 2000);

        } catch (error) {
            console.error("Sync Failed", error);
            setSyncMessage("Erro na sincronização.");
            setTimeout(() => setIsSyncingSigtap(false), 3000);
        }
    }

    // PATIENT SYNC LOGIC
    const [isSyncingPatients, setIsSyncingPatients] = useState(false);
    const [patientsSyncProgress, setPatientsSyncProgress] = useState(0);
    const [patientsSyncMessage, setPatientsSyncMessage] = useState('');

    const handleSyncPatients = async () => {
        if (!currentUnit?.municipalityId || !user?.entityId) return;

        setIsSyncingPatients(true);
        setPatientsSyncProgress(0);
        setPatientsSyncMessage("Iniciando...");

        try {
            const { prefetchPatientsData } = await import('../services/bpaService');

            await prefetchPatientsData(
                currentUnit.municipalityId,
                user.entityId,
                user.entityType || 'PUBLIC',
                (msg, progress) => {
                    setPatientsSyncMessage(msg);
                    setPatientsSyncProgress(progress);
                }
            );

            setPatientsSyncMessage("Base de Pacientes Atualizada!");
            setTimeout(() => {
                setIsSyncingPatients(false);
                setPatientsSyncMessage('');
                setPatientsSyncProgress(0);
            }, 2000);

        } catch (error) {
            console.error("Patient Sync Failed", error);
            setPatientsSyncMessage("Erro na sincronização.");
            setTimeout(() => setIsSyncingPatients(false), 3000);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900">

            {/* --- DESKTOP SIDEBAR --- */}
            <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 fixed h-full z-30">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-3">
                    <div className="w-10 h-10 bg-medical-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-medical-500/30 shrink-0">P</div>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-xl text-gray-900 dark:text-white leading-tight tracking-tight">ProBPA</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Painel de Produção</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 overflow-y-auto space-y-1">
                    {mainNavItems.map(item => (
                        <SidebarLink key={item.to} {...item} />
                    ))}
                    <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                        <SidebarLink to="/perfil" icon={UserCircle} label="Meu Perfil" />
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
                    <div className="mb-4 px-2 flex justify-center">
                        <button
                            onClick={() => {
                                setShowChangelog(true);
                                setHasNewVersion(false);
                                localStorage.setItem('proBPA_last_version_prod', getVersionString());
                            }}
                            className="text-xs text-gray-400 dark:text-gray-600 font-mono flex items-center gap-1 hover:text-medical-600 dark:hover:text-medical-400 transition-colors"
                        >
                            v{getVersionString()}
                            {hasNewVersion && (
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Nova atualização disponível!" />
                            )}
                        </button>
                    </div>
                    <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        {user?.avatar ? (
                            <img src={user.avatar} alt="User" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                <UserCircle size={24} />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate break-all">
                                {currentUnit?.occupation || user?.cbo || user?.role}
                            </p>
                            {(currentUnit?.registerClass || user?.registry) && (
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate">
                                    {currentUnit?.registerClass || user?.registry}
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={logout} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 dark:text-red-400 w-full px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </aside>

            {/* --- MOBILE DRAWER (SLIDE-OVER MENU) --- */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        />

                        {/* Drawer Content */}
                        <motion.aside
                            initial={{ x: "-100%" }} animate={{ x: "0%" }} exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="md:hidden fixed inset-y-0 left-0 w-[85%] max-w-[320px] bg-white dark:bg-gray-800 z-50 shadow-2xl flex flex-col"
                        >
                            <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-medical-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-medical-500/30 shrink-0">P</div>
                                    <div className="flex flex-col">
                                        <h1 className="font-bold text-xl text-gray-900 dark:text-white leading-tight tracking-tight">ProBPA</h1>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Painel de Produção</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                                <div className="mb-4">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">Menu Principal</p>
                                    {mainNavItems.map(item => (
                                        <SidebarLink key={item.to} {...item} />
                                    ))}
                                </div>
                                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">Conta</p>
                                    <SidebarLink to="/perfil" icon={UserCircle} label="Meu Perfil" />
                                </div>
                                <div className="mt-4 px-4 text-xs text-center text-gray-400 font-mono"></div>
                            </div>

                            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 pb-safe">
                                <div className="mb-4 flex justify-center">
                                    <button
                                        onClick={() => {
                                            setShowChangelog(true);
                                            setHasNewVersion(false);
                                            localStorage.setItem('proBPA_last_version_prod', getVersionString());
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="text-xs text-gray-400 dark:text-gray-600 font-mono flex items-center gap-1 hover:text-medical-600 dark:hover:text-medical-400 transition-colors"
                                    >
                                        v{getVersionString()}
                                        {hasNewVersion && (
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Nova atualização disponível!" />
                                        )}
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 mb-4">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="User" className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-700" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 ring-2 ring-white dark:ring-gray-700">
                                            <UserCircle size={24} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name}</p>
                                        <p className="text-xs text-gray-500 font-medium truncate break-all">
                                            {currentUnit?.occupation || user?.cbo || user?.role}
                                        </p>
                                        {(currentUnit?.registerClass || user?.registry) && (
                                            <p className="text-[10px] text-gray-400 font-mono truncate">
                                                {currentUnit?.registerClass || user?.registry}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button onClick={logout} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 py-3 rounded-xl transition-colors shadow-md shadow-red-500/20">
                                    <LogOut size={16} /> Sair do Sistema
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* --- MAIN CONTENT WRAPPER --- */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative">

                {/* Header (Mobile & Desktop) */}
                <header className="h-16 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 px-4 flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden p-2 -ml-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="md:hidden font-bold text-lg text-gray-800 dark:text-white">
                            ProBPA
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 ml-auto">
                        {/* Interactive Connection Indicator */}
                        <button
                            onClick={() => setShowConnectionInfo(true)}
                            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95",
                                isSyncing
                                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                                    : isOnline
                                        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 hover:bg-green-100"
                                        : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 hover:bg-orange-100"
                            )}>
                            {isSyncing ? (
                                <RefreshCw size={14} className="animate-spin" />
                            ) : isOnline ? (
                                <Wifi size={14} />
                            ) : (
                                <WifiOff size={14} />
                            )}
                            <span className="hidden sm:inline">
                                {isSyncing ? 'Sincronizando...' : isOnline ? 'Online' : 'Trabalhando Offline'}
                            </span>
                        </button>

                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors active:rotate-12">
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>

                        <div className="md:hidden">
                            <Link to="/perfil">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                                        <UserCircle size={20} />
                                    </div>
                                )}
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Scrollable Page Content */}
                <main className="flex-1 p-4 pb-6 pb-safe md:p-8 w-full max-w-7xl mx-auto">
                    {children}
                </main>

            </div>

            {/* Connection Info Modal */}
            <AnimatePresence>
                {showConnectionInfo && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={cn("p-6 text-center border-b", isOnline ? "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900" : "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900")}>
                                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", isOnline ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600")}>
                                    {isOnline ? <Wifi size={32} /> : <WifiOff size={32} />}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                    {isOnline ? 'Conectado à Internet' : 'Modo Offline Ativo'}
                                </h3>
                                <p className={cn("text-sm font-medium", isOnline ? "text-green-700 dark:text-green-400" : "text-orange-700 dark:text-orange-400")}>
                                    {isOnline ? 'Sincronização Ativada' : 'Salvando no dispositivo'}
                                </p>
                            </div>

                            <div className="p-6 space-y-4">
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-center">
                                    {isOnline
                                        ? "Qualquer alteração feita agora é salva automaticamente na nuvem em tempo real."
                                        : "Você pode continuar cadastrando e editando normalmente. Seus dados serão enviados automaticamente assim que a conexão for restabelecida."}
                                </p>

                                {/* SYNC STATUS INDICATOR */}
                                {!isSyncingSigtap && lastSyncDate && (
                                    <div className="flex items-center justify-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 py-2 px-3 rounded-lg border border-green-100 dark:border-green-800">
                                        <CheckCircle size={14} />
                                        <span>Tabelas offline atualizadas em {new Date(lastSyncDate).toLocaleDateString()}</span>
                                    </div>
                                )}

                                {!isSyncingSigtap && !lastSyncDate && isOnline && (
                                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 py-2 px-3 rounded-lg border border-amber-100 dark:border-amber-800 animate-pulse">
                                        <AlertCircle size={14} />
                                        <span>Você ainda não baixou as tabelas para uso offline!</span>
                                    </div>
                                )}

                            </div>


                            {/* OFFLINE CACHE ACTIONS */}
                            {isOnline && (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50 space-y-2">
                                    {/* 1. SIGTAP SYNC */}
                                    {!isSyncingSigtap ? (
                                        <button
                                            onClick={handleSyncSigtap}
                                            disabled={isSyncingPatients}
                                            className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                                        >
                                            <Database size={16} />
                                            Baixar Tabelas Auxiliares (SIGTAP)
                                        </button>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 font-medium">
                                                <span>{syncMessage}</span>
                                                <span>{syncProgress}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-blue-500"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${syncProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. PATIENTS CACHE SYNC (NEW) */}
                                    {currentUnit?.municipalityId && (
                                        !isSyncingPatients ? (
                                            <div className="space-y-2">
                                                <button
                                                    onClick={handleSyncPatients}
                                                    disabled={isSyncingSigtap}
                                                    className="w-full flex items-center justify-center gap-2 p-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                                                >
                                                    <UserCircle size={16} />
                                                    Baixar Base de Pacientes
                                                </button>

                                                {/* Cache Preview Stats */}
                                                {(() => {
                                                    const count = localStorage.getItem(`probpa_patient_count_${currentUnit.municipalityId}`);
                                                    if (count) {
                                                        return (
                                                            <div className="flex items-center justify-between px-2 text-xs text-gray-500 dark:text-gray-400">
                                                                <span className="flex items-center gap-1">
                                                                    <CheckCircle size={12} className="text-green-500" />
                                                                    {count} Pacientes em Cache
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        setShowConnectionInfo(false);
                                                                        navigate('/cidadao'); // Correct SPA navigation
                                                                    }}
                                                                    className="text-purple-600 hover:underline"
                                                                >
                                                                    Verificar
                                                                </button>
                                                            </div>
                                                        )
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs text-purple-600 dark:text-purple-400 font-medium">
                                                    <span>{patientsSyncMessage}</span>
                                                    <span>{patientsSyncProgress}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-purple-100 dark:bg-purple-900/30 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-purple-500"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${patientsSyncProgress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    )}

                                    <p className="text-[10px] text-gray-400 text-center mt-2">
                                        Recomendado fazer isso com Wi-Fi. (SIGTAP ~5MB / Pacientes Variável)
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => setShowConnectionInfo(false)}
                                className="w-full py-2.5 rounded-xl font-medium text-white bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                            >
                                Entendido
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Changelog Modal (Existing) */}
            <AnimatePresence>
                {
                    showChangelog && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setShowChangelog(false)}
                                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden flex flex-col max-h-[80vh]"
                            >
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Target className="w-5 h-5 text-medical-500" />
                                            Novidades da Versão
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">O que mudou no ProBPA v{getVersionString()}</p>
                                    </div>
                                    <button onClick={() => setShowChangelog(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-6 overflow-y-auto">
                                    {LATEST_CHANGES.map((release, i) => (
                                        <div key={i} className="mb-6 last:mb-0">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="px-2 py-1 bg-medical-50 dark:bg-medical-900/30 text-medical-700 dark:text-medical-300 text-xs font-bold rounded-md">
                                                    v{release.version}
                                                </span>
                                                <span className="text-xs text-gray-400">{release.date}</span>
                                            </div>
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{release.title}</h4>
                                            <ul className="space-y-3">
                                                {release.changes.map((change, idx) => (
                                                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                                                        <div className="mt-0.5 shrink-0">
                                                            {change.scope === 'SIMPLIFIED' && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                                    SIMP
                                                                </span>
                                                            )}
                                                            {change.scope === 'PEC' && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                    PEC
                                                                </span>
                                                            )}
                                                            {change.scope === 'GLOBAL' && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                                                    GERAL
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="flex-1 leading-relaxed">{change.text}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}

                                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
                                        <button
                                            onClick={() => setShowChangelog(false)}
                                            className="text-sm text-medical-600 dark:text-medical-400 font-medium hover:underline"
                                        >
                                            Fechar e continuar trabalhando
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >
        </div >
    );
};