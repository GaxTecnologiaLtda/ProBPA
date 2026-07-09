import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Hospital, LayoutDashboard, LogOut, Menu, Bell, ChevronLeft, ChevronRight, ActivitySquare, ListTodo, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TriagemLayout: React.FC = () => {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<{name: string, role: string, email: string} | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const mockUser = localStorage.getItem('hospitalar_mock_user');
    if (mockUser) {
      setUser(JSON.parse(mockUser));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('hospitalar_mock_user');
    navigate('/login');
  };

  const navItems = [
    { path: '/triagem', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/triagem/fila', icon: ListTodo, label: 'Fila de Triagem' },
    { path: '/triagem/historico', icon: ClipboardList, label: 'Histórico' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 flex font-sans">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isSidebarOpenMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpenMobile(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Desktop & Mobile */}
      <motion.aside
        className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 lg:static shadow-sm
          ${isSidebarOpenMobile ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed && !isSidebarOpenMobile ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        <div className={`h-16 flex items-center border-b border-gray-200 dark:border-gray-700 transition-all ${isSidebarCollapsed && !isSidebarOpenMobile ? 'justify-center px-0' : 'px-6 gap-3'}`}>
          <div className="p-2 bg-emerald-600 rounded-xl shadow-sm flex-shrink-0">
            <Hospital className="w-5 h-5 text-white" />
          </div>
          {(!isSidebarCollapsed || isSidebarOpenMobile) && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-lg text-gray-900 dark:text-white whitespace-nowrap">
              ProBPA
            </motion.span>
          )}
        </div>

        <div className="flex-1 py-6 overflow-y-auto overflow-x-hidden flex flex-col gap-2 px-3">
          {(!isSidebarCollapsed || isSidebarOpenMobile) && (
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2 flex items-center gap-2">
              <ActivitySquare className="w-3 h-3" />
              Módulo Triagem
            </div>
          )}
          
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/triagem' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isSidebarCollapsed && !isSidebarOpenMobile ? item.label : undefined}
                  className={`flex items-center gap-3 py-3 rounded-xl font-medium transition-all group relative
                    ${isSidebarCollapsed && !isSidebarOpenMobile ? 'justify-center px-0' : 'px-3'}
                    ${isActive
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                  {(!isSidebarCollapsed || isSidebarOpenMobile) && (
                    <span className="whitespace-nowrap">{item.label}</span>
                  )}
                  {isActive && (!isSidebarCollapsed || isSidebarOpenMobile) && (
                    <motion.div layoutId="activeNavTriagem" className="absolute right-2 w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Collapse Button (Desktop only) */}
        <div className="hidden lg:flex items-center justify-center p-2">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-full flex justify-center"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <div className={`p-4 border-t border-gray-200 dark:border-gray-700 transition-all ${isSidebarCollapsed && !isSidebarOpenMobile ? 'items-center flex flex-col' : ''}`}>
          {(!isSidebarCollapsed || isSidebarOpenMobile) ? (
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm flex-shrink-0">
                {user?.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-[10px] text-gray-500 font-medium tracking-wide uppercase truncate">
                  {user?.role.replace('HOSPITALAR_', '')}
                </p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-4" title={user?.name}>
              {user?.name.charAt(0)}
            </div>
          )}
          
          <button
            onClick={handleLogout}
            title={isSidebarCollapsed && !isSidebarOpenMobile ? 'Sair' : undefined}
            className={`flex items-center gap-2 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors
              ${isSidebarCollapsed && !isSidebarOpenMobile ? 'justify-center w-10 h-10 px-0' : 'w-full px-3'}`}
          >
            <LogOut className="w-4 h-4" />
            {(!isSidebarCollapsed || isSidebarOpenMobile) && <span>Sair do Sistema</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50/50 dark:bg-gray-900">
        {/* Top Header */}
        <header className="h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpenMobile(true)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:block">
              <span className="text-sm font-medium text-gray-500">Classificação de Risco (Triagem)</span>
            </div>
          </div>

          <div className="flex-1 flex justify-end items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800"></span>
            </button>
          </div>
        </header>

        {/* Main scrollable area */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TriagemLayout;
