import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Stethoscope, LayoutDashboard, ListChecks, History, LogOut, Menu, X, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ClinicaLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const mockUser = localStorage.getItem('hospitalar_mock_user');
    if (!mockUser) {
      navigate('/login');
      return;
    }
    
    try {
      const user = JSON.parse(mockUser);
      if (user.role !== 'HOSPITALAR_CLINICA') {
        navigate('/login');
        return;
      }
      setUserName(user.name);
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('hospitalar_mock_user');
    navigate('/login');
  };

  const navItems = [
    { path: '/clinica', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/clinica/fila', label: 'Fila Médica', icon: ListChecks },
    { path: '/clinica/historico', label: 'Histórico', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex text-gray-900 dark:text-white font-sans">
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Principal */}
      <motion.aside 
        animate={{ 
          width: isSidebarCollapsed ? '80px' : '280px',
        }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ease-in-out lg:transform-none ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className={`p-6 flex items-center border-b border-gray-100 dark:border-gray-700 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <Stethoscope className="w-6 h-6" />
            </div>
            {!isSidebarCollapsed && (
              <div>
                <h1 className="font-black text-xl tracking-tight text-gray-900 dark:text-white">Pro<span className="text-blue-600">BPA</span></h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Módulo Médico</p>
              </div>
            )}
          </div>
          
          {/* Mobile close button */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-bold' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 font-medium'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={isSidebarCollapsed ? item.label : ''}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'} transition-colors`} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
                
                {isActive && !isSidebarCollapsed && (
                  <motion.div layoutId="activeNavIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100 dark:border-gray-700 space-y-2">
          {/* Collapse Button Desktop */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`hidden lg:flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!isSidebarCollapsed && <span className="font-medium text-sm">Recolher Menu</span>}
          </button>

          {/* User / Logout */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold flex-shrink-0">
              {userName.charAt(0)}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{userName}</p>
                <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">CLÍNICA MÉDICA</p>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold transition-colors group ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Sair' : ''}
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            {!isSidebarCollapsed && <span>Sair do Sistema</span>}
          </button>
        </div>
      </motion.aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header Mobile / Topbar */}
        <header className="h-16 lg:h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8 z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Clínica Médica</h2>
              <p className="text-sm text-gray-500">Gestão de Consultório e Prontuários</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              Plantão Ativo
            </div>
            <button className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
            </button>
          </div>
        </header>

        {/* Viewport de Rotas */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-0 lg:p-4">
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default ClinicaLayout;
