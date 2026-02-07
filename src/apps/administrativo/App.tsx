

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import PublicEntities from './pages/PublicEntities';
import PrivateEntities from './pages/PrivateEntities';
import Municipalities from './pages/Municipalities';
import Licenses from './pages/Licenses';
import AdminUsers from './pages/AdminUsers';
import Settings from './pages/Settings';
import Login from './pages/Login';
import SupportTickets from './pages/SupportTickets';
import SigtapTables from './pages/SigtapTables';
import SystemLogs from './pages/SystemLogs';
import LediBatches from './pages/LediBatches';
import { AuthProvider, useAuth } from './context/AuthContext';

// Placeholder for Reports
const Reports = () => (
  <div className="p-12 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
    <h2 className="text-xl font-semibold text-slate-600 dark:text-slate-400">Módulo de Relatórios</h2>
    <p className="text-slate-400 dark:text-slate-500 mt-2">Gráficos complexos e exportação de dados em desenvolvimento.</p>
  </div>
);
const AppRoutes: React.FC = () => {
  const { user, logout } = useAuth(); // Destructure logout

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/*" element={user ? (
        <Layout onLogout={logout}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/support-tickets" element={<SupportTickets />} />
            <Route path="/public-entities" element={<PublicEntities />} />
            <Route path="/private-entities" element={<PrivateEntities />} />
            <Route path="/municipalities" element={<Municipalities />} />
            <Route path="/licenses" element={<Licenses />} />
            <Route path="/admin-users" element={<AdminUsers />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/sigtap" element={<SigtapTables />} />
            <Route path="/system-logs" element={<SystemLogs />} />
            <Route path="/lotes-ledi" element={<LediBatches />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      ) : <Navigate to="/login" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;