import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';

// Public Pages
import DashboardPublic from './pages/public/Dashboard';
import UnitsPublic from './pages/public/Units';
import ProfessionalsPublic from './pages/public/Professionals';
import ProductionPublic from './pages/public/Production';
import ExportsPublic from './pages/public/Exports';
import GoalsPublic from './pages/public/Goals';
import UsersPublic from './pages/public/Users';
import SettingsPublic from './pages/public/Settings';
import SupportPublic from './pages/public/Support';
import ProfessionalRegistration from './pages/private/ProfessionalRegistration';

// Private Pages
import DashboardPrivate from './pages/private/Dashboard';
import MunicipalitiesPrivate from './pages/private/Municipalities';
import ActionsAndPrograms from './pages/private/ActionsAndPrograms';
import UnitsPrivate from './pages/private/Units';
import ProfessionalsPrivate from './pages/private/Professionals';
import GoalsPrivate from './pages/private/Goals';
import ProductionPrivate from './pages/private/Production';
import LogsPrivate from './pages/private/Logs';
import UsersPrivate from './pages/private/Users';
import SettingsPrivate from './pages/private/Settings';
import SupportPrivate from './pages/private/Support';
import NotificationsPage from './pages/private/NotificationsPage';

import { AuthProvider } from './context/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Rotas Públicas */}
          <Route path="/publico" element={<Layout type="public" />}>
            <Route path="dashboard" element={<DashboardPublic />} />
            <Route path="unidades" element={<UnitsPublic />} />
            <Route path="profissionais" element={<ProfessionalsPublic />} />
            <Route path="metas" element={<GoalsPublic />} />
            <Route path="producao" element={<ProductionPublic />} />
            <Route path="logs" element={<LogsPrivate />} />
            <Route path="exportacoes" element={<ExportsPublic />} />
            <Route path="usuarios" element={<UsersPublic />} />
            <Route path="suporte" element={<SupportPublic />} />
            <Route path="configuracoes" element={<SettingsPublic />} />
          </Route>

          {/* Rota Pública de Cadastro (Mascarada de Privada na URL) - Deve vir ANTES ou separada do Layout Privado para não exigir auth */}
          <Route path="/portal-cadastro/profissionais/:entityId/:municipalityId" element={<ProfessionalRegistration />} />

          {/* Rotas Privadas (Protegidas) */}
          <Route path="/privado" element={<Layout type="private" />}>
            <Route path="dashboard" element={<DashboardPrivate />} />
            <Route path="municipios" element={<MunicipalitiesPrivate />} />
            <Route path="acoes" element={<ActionsAndPrograms />} />
            <Route path="unidades" element={<UnitsPrivate />} />
            <Route path="profissionais" element={<ProfessionalsPrivate />} />
            <Route path="metas" element={<GoalsPrivate />} />
            <Route path="producao" element={<ProductionPrivate />} />
            <Route path="logs" element={<LogsPrivate />} />
            <Route path="usuarios" element={<UsersPrivate />} />
            <Route path="suporte" element={<SupportPrivate />} />
            <Route path="notificacoes" element={<NotificationsPage />} />
            <Route path="configuracoes" element={<SettingsPrivate />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider >
  );
};

export default App;