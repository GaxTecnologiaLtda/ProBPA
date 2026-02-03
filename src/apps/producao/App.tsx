import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Register } from './pages/Register';
import { Citizens } from './pages/Citizens';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { Units } from './pages/Units';
import { Reports } from './pages/Reports';
import { Goals } from './pages/Goals';
import { Support } from './pages/Support';
import { Tutorials } from './pages/Tutorials';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useApp();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

import { PwaUpdater } from './components/PwaUpdater';

const AppRoutes = () => {
  const { user } = useApp();
  return (
    <>
      <PwaUpdater />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/registrar" element={
          <ProtectedRoute><Register /></ProtectedRoute>
        } />
        <Route path="/cidadao" element={
          <ProtectedRoute><Citizens /></ProtectedRoute>
        } />
        <Route path="/relatorios" element={
          <ProtectedRoute><Reports /></ProtectedRoute>
        } />
        <Route path="/metas" element={
          <ProtectedRoute><Goals /></ProtectedRoute>
        } />
        <Route path="/historico" element={
          <ProtectedRoute><History /></ProtectedRoute>
        } />
        <Route path="/unidades" element={
          <ProtectedRoute><Units /></ProtectedRoute>
        } />
        <Route path="/perfil" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />
        <Route path="/tutoriais" element={
          <ProtectedRoute><Tutorials /></ProtectedRoute>
        } />
        <Route path="/suporte" element={
          <ProtectedRoute><Support /></ProtectedRoute>
        } />
      </Routes>
    </>
  );
};

function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
}

export default App;