import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import RecepcaoLayout from './pages/recepcao/RecepcaoLayout';
import Dashboard from './pages/recepcao/Dashboard';
import Acolhimento from './pages/recepcao/Acolhimento';

import TriagemLayout from './pages/triagem/TriagemLayout';
import TriagemDashboard from './pages/triagem/TriagemDashboard';
import FilaTriagem from './pages/triagem/FilaTriagem';
import AtendimentoTriagem from './pages/triagem/AtendimentoTriagem';
import HistoricoTriagem from './pages/triagem/HistoricoTriagem';

import ClinicaLayout from './pages/clinica/ClinicaLayout';
import ClinicaDashboard from './pages/clinica/ClinicaDashboard';
import FilaClinica from './pages/clinica/FilaClinica';
import AtendimentoClinico from './pages/clinica/AtendimentoClinico';
import HistoricoClinica from './pages/clinica/HistoricoClinica';

import EnfermariaLayout from './pages/enfermaria/EnfermariaLayout';
import EnfermariaDashboard from './pages/enfermaria/EnfermariaDashboard';
import GestaoLeitos from './pages/enfermaria/GestaoLeitos';
import ControlePaciente from './pages/enfermaria/ControlePaciente';

import LaboratorioLayout from './pages/laboratorio/LaboratorioLayout';
import LaboratorioDashboard from './pages/laboratorio/LaboratorioDashboard';
import FilaColeta from './pages/laboratorio/FilaColeta';
import CentralLaudos from './pages/laboratorio/CentralLaudos';

import FeirasLayout from './pages/feiras/FeirasLayout';
import FeirasDashboard from './pages/feiras/FeirasDashboard';
import GestaoFeiras from './pages/feiras/GestaoFeiras';
import LancamentoProducao from './pages/feiras/LancamentoProducao';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Módulo Recepção */}
        <Route path="/recepcao" element={<RecepcaoLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="acolhimento" element={<Acolhimento />} />
          <Route path="espera" element={<div className="p-6">Fila de Espera (Em breve)</div>} />
        </Route>

        {/* Módulo Triagem */}
        <Route path="/triagem" element={<TriagemLayout />}>
          <Route index element={<TriagemDashboard />} />
          <Route path="fila" element={<FilaTriagem />} />
          <Route path="atendimento/:ticket" element={<AtendimentoTriagem />} />
          <Route path="historico" element={<HistoricoTriagem />} />
        </Route>

        {/* Módulo Clínica */}
        <Route path="/clinica" element={<ClinicaLayout />}>
          <Route index element={<ClinicaDashboard />} />
          <Route path="fila" element={<FilaClinica />} />
          <Route path="atendimento/:ticket" element={<AtendimentoClinico />} />
          <Route path="historico" element={<HistoricoClinica />} />
        </Route>

        {/* Módulo Enfermaria */}
        <Route path="/enfermaria" element={<EnfermariaLayout />}>
          <Route index element={<EnfermariaDashboard />} />
          <Route path="leitos" element={<GestaoLeitos />} />
          <Route path="paciente/:leitoId" element={<ControlePaciente />} />
        </Route>

        {/* Módulo Laboratório */}
        <Route path="/laboratorio" element={<LaboratorioLayout />}>
          <Route index element={<LaboratorioDashboard />} />
          <Route path="coleta" element={<FilaColeta />} />
          <Route path="laudos" element={<CentralLaudos />} />
        </Route>

        {/* Módulo Ações Externas / Feiras */}
        <Route path="/feiras" element={<FeirasLayout />}>
          <Route index element={<FeirasDashboard />} />
          <Route path="gestao" element={<GestaoFeiras />} />
          <Route path="lancamento" element={<LancamentoProducao />} />
        </Route>

        <Route path="/gestao" element={<div>Gestão</div>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
