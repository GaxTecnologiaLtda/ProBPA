import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, ClipboardList, Settings, Store, Building2, LogOut, ShieldCheck, Pill } from 'lucide-react';
import { AppRoutes } from './routes';
import AgendaPage from './pages/AgendaPage';
import AtendimentosPage from './pages/AtendimentosPage';
import EscalaPage from './pages/EscalaPage';
import FarmaciaPage from './pages/FarmaciaPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import { UnidadeAuthProvider, useUnidadeAuth } from './contexts/AuthContext';

// Layout Component
const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const { user, logout } = useUnidadeAuth();

    const isActive = (path: string) => location.pathname === path;

    // RBAC: Filter items based on role
    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['RECEPCIONISTA', 'COORDENADOR'] },
        { path: '/agenda', label: 'Agenda', icon: Calendar, roles: ['RECEPCIONISTA', 'COORDENADOR'] },
        { path: '/atendimentos', label: 'Atendimentos', icon: Users, badge: 12, roles: ['RECEPCIONISTA', 'COORDENADOR'] },
        { path: '/farmacia', label: 'Farmácia (UBS)', icon: Pill, roles: ['RECEPCIONISTA', 'COORDENADOR'] }, // New Pharmacy Module
        { path: '/escala', label: 'Escala', icon: ClipboardList, roles: ['COORDENADOR'] }, // Only Coordinator
        // Add Unit Data later
        // { path: '/unidade', label: 'Dados da Unidade', icon: Building2, roles: ['RECEPCIONISTA', 'COORDENADOR'] },
    ];

    const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role || ''));

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-gray-100 hidden md:flex flex-col shadow-sm z-10">
                <div className="p-6">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 bg-medical-600 rounded-xl flex items-center justify-center text-white shadow-medical-200 shadow-lg">
                            <Store className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 leading-tight">Painel da Unidade</h1>
                            <p className="text-xs text-gray-500 font-medium">UBS Central</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 mt-2">
                    {filteredNavItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`
                                flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group relative
                                ${isActive(item.path)
                                    ? 'bg-medical-50 text-medical-700 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }
                            `}
                        >
                            <item.icon className={`w-5 h-5 transition-colors ${isActive(item.path) ? 'text-medical-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                            <span>{item.label}</span>
                            {item.badge && (
                                <span className={`ml-auto py-0.5 px-2.5 rounded-full text-xs font-bold ${isActive(item.path) ? 'bg-medical-100 text-medical-700' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                                    }`}>
                                    {item.badge}
                                </span>
                            )}
                            {isActive(item.path) && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-medical-600 rounded-r-full" />
                            )}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 mt-auto border-t border-gray-100">
                    <button className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all">
                        <Settings className="w-5 h-5 text-gray-400" />
                        <span>Configurações</span>
                    </button>

                    <div className="mt-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between group cursor-default">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                                {user?.avatar}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.role === 'RECEPCIONISTA' ? 'Recepção' : 'Coordenação'}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Sair"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>
            <main className="flex-1 overflow-auto bg-gray-50 relative">
                {children}
            </main>
        </div>
    );
};

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
    const { user } = useUnidadeAuth();

    if (!user) {
        return <LoginPage />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="text-center max-w-md p-6">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
                    <p className="text-gray-500">Seu perfil de <strong>{user.role}</strong> não tem permissão para acessar esta área.</p>
                    <Link to="/dashboard" className="inline-block mt-6 text-medical-600 font-medium hover:underline">Voltar ao Dashboard</Link>
                </div>
            </div>
        );
    }

    return <MainLayout>{children}</MainLayout>;
};

const AppContent: React.FC = () => {
    const { user } = useUnidadeAuth();

    if (!user) return <LoginPage />;

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                } />
                <Route path="/agenda" element={
                    <ProtectedRoute>
                        <AgendaPage />
                    </ProtectedRoute>
                } />
                <Route path="/atendimentos" element={
                    <ProtectedRoute>
                        <AtendimentosPage />
                    </ProtectedRoute>
                } />
                <Route path="/farmacia" element={
                    <ProtectedRoute>
                        <FarmaciaPage />
                    </ProtectedRoute>
                } />
                <Route path="/escala" element={
                    <ProtectedRoute allowedRoles={['COORDENADOR']}>
                        <EscalaPage />
                    </ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
};

const App: React.FC = () => {
    return (
        <UnidadeAuthProvider>
            <AppContent />
        </UnidadeAuthProvider>
    );
};

export default App;
