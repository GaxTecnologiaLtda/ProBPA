import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Target,
  Activity,
  FileDown,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Map,
  LifeBuoy,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EntityType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useEntityData } from '../hooks/useEntityData';
import { getVersionString, LATEST_CHANGES, APP_VERSION } from '../version';
import NotificationMenu from './NotificationMenu';

interface LayoutProps {
  type: EntityType;
}

const Layout: React.FC<LayoutProps> = ({ type }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showChangelog, setShowChangelog] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, claims, loading: authLoading, logout } = useAuth();

  // Fetch entity data based on claims
  const { entity, loading: entityLoading } = useEntityData(claims?.entityId);

  const [accessDenied, setAccessDenied] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(false);

  useEffect(() => {
    // Version Check
    const lastVersion = localStorage.getItem('proBPA_last_version');
    const currentVersion = getVersionString();

    if (lastVersion !== currentVersion) {
      setHasNewVersion(true);
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user has MASTER or COORDENAÇÃO or SUBSEDE role
      if (claims.role !== 'MASTER' && claims.role !== 'COORDENAÇÃO' && claims.role !== 'SUBSEDE') {
        alert('Acesso não autorizado. Permissão MASTER, COORDENAÇÃO ou SUBSEDE necessária.');
        logout();
        navigate('/login');
        return;
      }

      // Check if user entity type matches the layout type
      // claims.entityType should be "PUBLIC" or "PRIVATE"
      // type prop is "public" or "private"
      const userType = claims.entityType === 'PUBLIC' ? 'public' : 'private';

      if (userType !== type) {
        setAccessDenied(true);
      } else {
        setAccessDenied(false);
      }
    }
  }, [user, claims, authLoading, type, navigate, logout]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItemsPublic = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/publico/dashboard' },
    { icon: Building2, label: 'Unidades de Saúde', path: '/publico/unidades' },
    { icon: Users, label: 'Profissionais', path: '/publico/profissionais' },
    { icon: Target, label: 'Metas Municipais', path: '/publico/metas' },
    { icon: Activity, label: 'Produção', path: '/publico/producao' },
    { icon: FileText, label: 'Logs de Uso', path: '/publico/logs' },
    { icon: Users, label: 'Usuários', path: '/publico/usuarios' },
    { icon: LifeBuoy, label: 'Suporte Técnico', path: '/publico/suporte' },
    { icon: Settings, label: 'Configurações', path: '/publico/configuracoes' },
  ];

  const menuItemsPrivateAll = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/privado/dashboard' },
    { icon: Map, label: 'Municípios', path: '/privado/municipios' },
    { icon: Building2, label: 'Rede de Unidades', path: '/privado/unidades' },
    { icon: Users, label: 'Corpo Clínico', path: '/privado/profissionais' },
    { icon: Calendar, label: 'Ações e Programas', path: '/privado/acoes' },
    { icon: Target, label: 'Metas Globais', path: '/privado/metas' },
    { icon: Activity, label: 'Produção Global', path: '/privado/producao' },
    { icon: FileText, label: 'Logs de Uso', path: '/privado/logs' },
    { icon: Users, label: 'Gestão Acessos', path: '/privado/usuarios' },
    { icon: LifeBuoy, label: 'Suporte Técnico', path: '/privado/suporte' },
    { icon: Settings, label: 'Configuração', path: '/privado/configuracoes' },
  ];

  // Filter menu items for SUBSEDE
  const menuItemsPrivate = claims?.role === 'SUBSEDE'
    ? menuItemsPrivateAll.filter(item => item.label !== 'Gestão Acessos')
    : menuItemsPrivateAll;

  const menuItems = type === 'public' ? menuItemsPublic : menuItemsPrivate;
  const primaryColor = type === 'public' ? 'bg-blue-600' : 'bg-emerald-600';
  const primaryColorText = type === 'public' ? 'text-blue-600' : 'text-emerald-600';
  const hoverColor = type === 'public' ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20';

  if (authLoading || entityLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Acesso Negado</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Seu usuário não tem permissão para acessar o painel de
            <span className="font-bold"> {type === 'public' ? 'Entidade Pública' : 'Entidade Privada'}</span>.
            Por favor, verifique suas credenciais ou contate o administrador.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth < 1024 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? '280px' : '0px' }}
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 shadow-xl overflow-hidden flex flex-col border-r border-gray-100 dark:border-gray-700`}
      >
        <div className="p-6 flex items-center gap-3">
          <div className={`p-2 rounded-lg ${primaryColor} shrink-0`}>
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">
              ProBPA
            </span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 whitespace-nowrap">
              Painel da Entidade {type === 'public' ? 'Pública' : 'Privada'}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                  ? `${primaryColor} text-white shadow-md shadow-gray-200 dark:shadow-none`
                  : `text-gray-600 dark:text-gray-400 ${hoverColor} hover:text-gray-900 dark:hover:text-white`
                  }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                <span className="font-medium whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => {
              setShowChangelog(true);
              setHasNewVersion(false);
              localStorage.setItem('proBPA_last_version', getVersionString());
            }}
            className="w-full flex justify-center mb-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded py-1 transition-colors group"
          >
            <span className="text-[10px] text-gray-400 group-hover:text-emerald-500 font-mono flex items-center gap-1">
              v{getVersionString()}
              {hasNewVersion && (
                <span className="ml-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Nova atualização disponível!" />
              )}
              <span className="hidden group-hover:inline text-[9px] ml-1">• Ver novidades</span>
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair do Painel</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white dark:bg-gray-800 h-16 shadow-sm border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-6 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              {isSidebarOpen ? <Menu className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {/* Breadcrumb simples */}
            <div className="hidden md:flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span className="capitalize">{type === 'public' ? 'Entidade Pública' : 'Entidade Privada'}</span>
              <span className="mx-2">/</span>
              <span className="capitalize text-gray-900 dark:text-white font-medium">
                {location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {type !== 'public' && <NotificationMenu />}

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.displayName || (claims?.role === 'SUBSEDE' ? 'Coordenador Local' : 'Usuário Master/Coordenação')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {entity?.name || (type === 'public' ? 'Gestão Municipal' : 'Gestão Institucional')}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-full ${primaryColor} text-white flex items-center justify-center font-bold shadow-md`}>
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Changelog Modal */}
      <AnimatePresence>
        {showChangelog && (
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
                    <Activity className="w-5 h-5 text-emerald-500" />
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
                      <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-md">
                        v{release.version}
                      </span>
                      <span className="text-xs text-gray-400">{release.date}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{release.title}</h4>
                    <ul className="space-y-2">
                      {release.changes.map((change, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <span className="mt-1.5 w-1 h-1 bg-gray-400 rounded-full shrink-0" />
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
                  <button
                    onClick={() => setShowChangelog(false)}
                    className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                  >
                    Fechar e continuar trabalhando
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;