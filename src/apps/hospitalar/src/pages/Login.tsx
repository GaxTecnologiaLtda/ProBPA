import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Eye, EyeOff, Hospital, FlaskConical, Stethoscope, UserCog, LogIn, HeartPulse, Beaker, Tent } from 'lucide-react';
import { auth } from '../firebase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'official' | 'mock'>('official');

  const navigate = useNavigate();

  const handleMockLoginRecepcao = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      localStorage.setItem('hospitalar_mock_user', JSON.stringify({
        uid: 'mock-recepcao-123',
        role: 'HOSPITALAR_RECEPCAO',
        name: 'Recepcionista Padrão',
        email: 'recepcao@mock.com'
      }));
      navigate('/recepcao');
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar login de teste.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleMockLoginTriagem = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      localStorage.setItem('hospitalar_mock_user', JSON.stringify({
        uid: 'mock-triagem-123',
        role: 'HOSPITALAR_TRIAGEM',
        name: 'Enfermeira Chefe',
        email: 'triagem@mock.com'
      }));
      navigate('/triagem');
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar login de teste.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockLoginClinica = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      localStorage.setItem('hospitalar_mock_user', JSON.stringify({
        uid: 'mock-clinica-123',
        role: 'HOSPITALAR_CLINICA',
        name: 'Dr. Roberto Mendes',
        email: 'clinica@mock.com'
      }));
      navigate('/clinica');
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar login de teste.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockLoginEnfermaria = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      localStorage.setItem('hospitalar_mock_user', JSON.stringify({
        uid: 'mock-enfermaria-123',
        role: 'HOSPITALAR_ENFERMARIA',
        name: 'Enf. Juliana Castro',
        email: 'enfermaria@mock.com'
      }));
      navigate('/enfermaria');
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar login de teste.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockLoginLaboratorio = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      localStorage.setItem('hospitalar_mock_user', JSON.stringify({
        uid: 'mock-lab-123',
        role: 'HOSPITALAR_LABORATORIO',
        name: 'Biomédica Ana Costa',
        email: 'lab@mock.com'
      }));
      navigate('/laboratorio');
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar login de teste.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockLoginFeiras = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      localStorage.setItem('hospitalar_mock_user', JSON.stringify({
        uid: 'mock-feiras-123',
        role: 'HOSPITALAR_FEIRAS',
        name: 'Digitador Roberto',
        email: 'digitacao@mock.com'
      }));
      navigate('/feiras');
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar login de teste.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdTokenResult();
      const roleClaim = token.claims.role as string | undefined;

      if (!roleClaim || typeof roleClaim !== 'string' || !roleClaim.startsWith("HOSPITALAR")) {
        setError("Acesso restrito. Seu usuário não possui permissão Hospitalar.");
        await auth.signOut();
        return;
      }

      // Check specific role and redirect
      // Example: HOSPITALAR_RECEPCAO -> /recepcao
      const role = roleClaim;
      if (role === 'HOSPITALAR_RECEPCAO') navigate('/recepcao');
      else if (role === 'HOSPITALAR_TRIAGEM') navigate('/triagem');
      else if (role === 'HOSPITALAR_CLINICA') navigate('/clinica');
      else if (role === 'HOSPITALAR_ENFERMARIA') navigate('/enfermaria');
      else if (role === 'HOSPITALAR_LABORATORIO') navigate('/laboratorio');
      else if (role === 'HOSPITALAR_GESTAO') navigate('/gestao');
      else navigate('/'); // fallback dashboard

    } catch (err: any) {
      console.error(err);
      setError("Falha no login. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob bg-teal-300 dark:bg-teal-900/40"></div>
        <div className="absolute top-40 -left-20 w-[400px] h-[400px] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 bg-cyan-300 dark:bg-cyan-900/40"></div>
        <div className="absolute -bottom-20 left-1/2 w-[400px] h-[400px] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 bg-blue-300 dark:bg-blue-900/40"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-4 z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl mb-4 shadow-lg bg-teal-600">
            <Hospital className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">IVS - Hospitalar</h1>
          <h2 className="text-lg text-gray-600 dark:text-gray-300 font-medium">Ecossistema de Saúde</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Recepção, Triagem, Clínica, Internação e Externas</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden p-8 backdrop-blur-lg bg-white/90 dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700">
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('official')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'official' ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              Acesso Institucional
            </button>
            <button
              onClick={() => setActiveTab('mock')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'mock' ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              Acesso Teste
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {activeTab === 'official' ? 'Acesso Institucional' : 'Acesso de Demonstração'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {activeTab === 'official' ? 'Gerencie o atendimento hospitalar com sua conta.' : 'Selecione um módulo para visualizar as funcionalidades.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 dark:bg-red-900/20 dark:border-red-900/30">
              {error}
            </div>
          )}

          {activeTab === 'official' ? (
            <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Profissional</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-4 rounded-lg font-medium text-white shadow-lg shadow-teal-500/30 transform transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  Entrar no Sistema <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          ) : (
          <div className="space-y-3">
            <button
              onClick={handleMockLoginRecepcao}
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 transition-colors flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/30 disabled:opacity-50"
            >
              <FlaskConical className="w-4 h-4" />
              Acesso Teste (Recepção)
            </button>
            <button
              onClick={handleMockLoginTriagem}
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400 transition-colors flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-900/30 disabled:opacity-50"
            >
              <Stethoscope className="w-4 h-4" />
              Acesso Teste (Triagem)
            </button>
            <button
              onClick={handleMockLoginClinica}
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 transition-colors flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-900/30 disabled:opacity-50"
            >
              <Stethoscope className="w-4 h-4" />
              Acesso Teste (Clínica)
            </button>
            <button
              onClick={handleMockLoginEnfermaria}
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 dark:text-purple-400 transition-colors flex items-center justify-center gap-2 border border-purple-200 dark:border-purple-900/30 disabled:opacity-50"
            >
              <Hospital className="w-4 h-4" />
              Acesso Teste (Enfermaria)
            </button>
            <button
              onClick={handleMockLoginLaboratorio}
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg font-medium text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/40 dark:text-cyan-400 transition-colors flex items-center justify-center gap-2 border border-cyan-200 dark:border-cyan-900/30 disabled:opacity-50"
            >
              <Beaker className="w-4 h-4" />
              Acesso Teste (Laboratório)
            </button>
            <button
              onClick={handleMockLoginFeiras}
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 dark:text-orange-400 transition-colors flex items-center justify-center gap-2 border border-orange-200 dark:border-orange-900/30 disabled:opacity-50"
            >
              <Tent className="w-4 h-4" />
              Acesso Teste (Feiras de Saúde)
            </button>
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3 pt-2">
              Acesso temporário para desenvolvimento.
            </p>
          </div>
          )}
        </div>
      </motion.div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
        Sistema ProBPA de Saúde - GAX Soluções Tecnológicas - 62.054.372/0001-58
      </div>
    </div>
  );
};

export default Login;
