import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Globe, Lock, ArrowRight, Activity, Eye, EyeOff, FileText, X } from 'lucide-react';
import { auth } from '../firebase';
import { getVersionString } from '../version';

const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setResetError('Por favor, informe seu e-mail.');
      return;
    }
    setResetLoading(true);
    setResetError('');

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      console.error(err);
      setResetError('Erro ao enviar e-mail. Verifique se o endereço está correto.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setResetSuccess(false);
    setResetEmail('');
    setResetError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdTokenResult();

      if (!token.claims.role || (token.claims.role !== "MASTER" && token.claims.role !== "COORDENAÇÃO" && token.claims.role !== "SUBSEDE")) {
        setError("Acesso restrito. Usuário não possui permissão MASTER, COORDENAÇÃO ou SUBSEDE.");
        await auth.signOut();
        return;
      }

      if (token.claims.entityType === "PUBLIC") {
        if (activeTab !== 'public') {
          setError("Acesso negado. Seu usuário está vinculado a uma Entidade Pública.");
          await auth.signOut();
          return;
        }

        // Log Login
        try {
          // @ts-ignore
          const { logAction } = await import('../services/logsService');
          await logAction({
            action: 'LOGIN',
            target: 'USER',
            description: 'Usuário realizou login no painel Público',
            user: { uid: user.uid, email: user.email || '', name: user.displayName || user.email || '' },
            entityId: token.claims.entityId as string
          });
        } catch (e) { console.error(e); }

        navigate("/publico/dashboard");
      } else {
        if (activeTab !== 'private') {
          setError("Acesso negado. Seu usuário está vinculado a uma Entidade Privada.");
          await auth.signOut();
          return;
        }

        // Log Login
        try {
          // @ts-ignore
          const { logAction } = await import('../services/logsService');
          await logAction({
            action: 'LOGIN',
            target: 'USER',
            description: 'Usuário realizou login no painel Privado',
            user: { uid: user.uid, email: user.email || '', name: user.displayName || user.email || '' },
            entityId: token.claims.entityId as string
          });
        } catch (e) { console.error(e); }

        navigate("/privado/dashboard");
      }

    } catch (err: any) {
      console.error("Login error:", err);
      setError("Falha no login. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className={`absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob ${activeTab === 'public' ? 'bg-blue-300' : 'bg-emerald-300'}`}></div>
        <div className={`absolute top-40 -left-20 w-[400px] h-[400px] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 ${activeTab === 'public' ? 'bg-indigo-300' : 'bg-teal-300'}`}></div>
        <div className="absolute -bottom-20 left-1/2 w-[400px] h-[400px] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 bg-purple-300"></div>
      </div>

      <div className="w-full max-w-md p-4 z-10">
        <div className="text-center mb-8">
          <div className={`inline-flex p-3 rounded-2xl mb-4 shadow-lg ${activeTab === 'public' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">ProBPA</h1>
          <h2 className="text-lg text-gray-600 dark:text-gray-300 font-medium">Painel da Entidade</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gestão inteligente de produção ambulatorial</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-500">
          {/* Tabs */}
          <div className="flex border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab('public')}
              className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'public'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Building2 className="w-4 h-4" />
                Entidade Pública
              </div>
            </button>
            <button
              onClick={() => setActiveTab('private')}
              className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'private'
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Globe className="w-4 h-4" />
                Entidade Privada
              </div>
            </button>
          </div>

          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {activeTab === 'public' ? 'Acesso Municipal' : 'Acesso Institucional'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {activeTab === 'public'
                  ? 'Entre com suas credenciais da prefeitura.'
                  : 'Gerencie múltiplos municípios com sua conta.'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:outline-none transition-all"
                  style={{
                    borderColor: 'transparent',
                    boxShadow: activeTab === 'public' ? '0 0 0 1px #e5e7eb' : '0 0 0 1px #e5e7eb'
                  }}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 rounded-lg font-medium text-white shadow-lg transform transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 ${activeTab === 'public'
                  ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                  }`}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    Entrar no Painel <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline focus:outline-none"
              >
                Esqueceu sua senha?
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 right-6 text-xs text-gray-400 font-mono">
        v{getVersionString()}
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 relative overflow-hidden"
            >
              <button
                onClick={handleBackToLogin}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Redefinir Senha
              </h2>

              {!resetSuccess ? (
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    Informe seu e-mail cadastrado para receber o link de redefinição de senha.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                  {resetError && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30">
                      {resetError}
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {resetLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Enviando...
                        </>
                      ) : (
                        'Enviar Link'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-xl font-medium text-green-600 dark:text-green-400">E-mail Enviado!</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Verifique sua caixa de entrada (e spam) para redefinir sua senha através do link enviado.
                  </p>
                  <button
                    onClick={handleBackToLogin}
                    className="w-full mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Voltar para Login
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;