import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../constants';
import { Menu, Bell, Moon, Sun, ChevronDown, Search, LogOut } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const location = useLocation();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-dark-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-slate-800">
            <div className="w-8 h-8 bg-gradient-to-tr from-gax-500 to-corp-500 rounded-md flex items-center justify-center text-white font-bold mr-3">
              G
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              GAX <span className="text-slate-400 font-light">Admin</span>
            </span>
        </div>

        {/* Nav Links */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 mt-2">Menu Principal</p>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-corp-600/20 text-corp-500' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-corp-500' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
          
          {/* Bottom Section */}
          <div className="pt-8 mt-8 border-t border-slate-800">
             <button 
                onClick={onLogout}
                className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
             >
                <LogOut className="w-5 h-5 mr-3" />
                Sair do Sistema
             </button>
          </div>
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header */}
        <header className="h-16 bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0">
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Breadcrumb simulation */}
            <div className="hidden md:flex items-center text-sm text-slate-500 ml-4">
                <span className="hover:text-corp-500 cursor-pointer">ProBPA</span>
                <span className="mx-2">/</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                    {NAV_ITEMS.find(i => i.path === location.pathname)?.name || 'Dashboard'}
                </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="hidden md:flex items-center relative">
                <Search className="w-4 h-4 absolute left-3 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-dark-800 border-none rounded-full text-sm focus:ring-2 focus:ring-corp-500 w-64 transition-all"
                />
            </div>

            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-dark-900"></span>
            </button>

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Profile Dropdown */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">Admin Gax</p>
                    <p className="text-xs text-slate-500">Super Admin</p>
                </div>
                <div className="w-8 h-8 bg-corp-600 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-slate-100 dark:ring-slate-700 cursor-pointer">
                    AG
                </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};