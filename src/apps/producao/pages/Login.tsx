import React, { useState, useEffect } from 'react';
import { Button, Input } from '../components/ui/BaseComponents';
import { useApp } from '../context';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Unit } from '../types';
import { Building2, MapPin, Stethoscope, Activity, FileText, Globe, Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { ParticlesBackground } from '../components/ParticlesBackground';
import { DEVELOPER_INFO, getVersionString } from '../version';
import { auth } from '../firebase';
import { sendPasswordResetEmail, getMultiFactorResolver, PhoneAuthProvider, PhoneMultiFactorGenerator, RecaptchaVerifier, MultiFactorAssertion } from 'firebase/auth';

export const Login: React.FC = () => {
    const { login, logout, user, currentUnit, selectUnit } = useApp();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showUnits, setShowUnits] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Password Reset States
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetError, setResetError] = useState('');

    // MFA States
    const [showMFA, setShowMFA] = useState(false);
    const [mfaCode, setMfaCode] = useState('');
    const [verificationId, setVerificationId] = useState('');
    const [mfaResolver, setMfaResolver] = useState<any>(null); // Store the resolver
    const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

    useEffect(() => {
        if (user && !currentUnit) {
            setShowUnits(true);
        } else if (user && currentUnit) {
            navigate('/dashboard');
        }
    }, [user, currentUnit, navigate]);

    // Initialize Recaptcha for MFA
    useEffect(() => {
        if (!recaptchaVerifier && showMFA) {
            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible'
            });
            setRecaptchaVerifier(verifier);
        }
    }, [showMFA]);


    const handleUnitSelect = (unit: Unit) => {
        selectUnit(unit);
        navigate('/dashboard');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/multi-factor-auth-required') {
                const resolver = getMultiFactorResolver(auth, err);
                setMfaResolver(resolver);

                // Assuming user has enrolled sending SMS to the first hint
                // In production with multiple factors, user should choose.
                const hints = resolver.hints;
                const phoneHint = hints.find((hint: any) => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID);

                if (phoneHint) {
                    setShowMFA(true);
                    // The recaptcha verification will happen when user clicks "Send Code" or we can auto-trigger it
                    // Let's auto trigger verifyPhoneNumber in a separate useEffect or function when showing MFA
                    // But we need the verifier first.
                } else {
                    setError('Autenticação de dois fatores requerida, mas nenhum método suportado foi encontrado.');
                    setLoading(false);
                }
            } else {
                setError('Email ou senha inválidos');
                setLoading(false);
            }
        }
    };

    const sendMfaCode = async () => {
        if (!mfaResolver || !recaptchaVerifier) return;

        const hints = mfaResolver.hints;
        const phoneHint = hints.find((hint: any) => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID);

        const phoneInfoOptions = {
            multiFactorHint: phoneHint,
            session: mfaResolver.session
        };

        const phoneAuthProvider = new PhoneAuthProvider(auth);

        try {
            const vid = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
            setVerificationId(vid);
        } catch (err: any) {
            console.error("MFA Login Error Full Object:", err);
            console.error("MFA Login Error Code:", err.code);
            console.error("MFA Login Error Message:", err.message);
            setError("Erro ao enviar SMS: " + (err.code === 'auth/internal-error' ? 'Erro interno. Verifique configuração do projeto.' : err.message));

            if (recaptchaVerifier) {
                try {
                    recaptchaVerifier.clear();
                } catch (e) {
                    console.warn("Failed to clear recaptcha", e);
                }
            }
        }
    };

    // Trigger SMS send when MFA modal opens and verifier is ready
    useEffect(() => {
        if (showMFA && mfaResolver && recaptchaVerifier && !verificationId) {
            sendMfaCode();
        }
    }, [showMFA, mfaResolver, recaptchaVerifier, verificationId]);


    const verifyMfaCode = async () => {
        setLoading(true);
        try {
            const cred = PhoneAuthProvider.credential(verificationId, mfaCode);
            const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);

            // Complete sign-in
            // Complete sign-in
            await mfaResolver.resolveSignIn(multiFactorAssertion);

            // Login successful
            setLoading(false);
            setShowMFA(false);

            // Force robust state refresh
            if (auth.currentUser) {
                // Force token refresh
                await auth.currentUser.getIdToken(true);

                // WORKAROUND: If the context effect is stuck, a hard reload ensures 
                // we start fresh with the now-valid session.
                // This fixes the "stuck on login" issue after MFA modal closes.
                window.location.reload();
            }

        } catch (err: any) {
            console.error(err);
            setError("Código inválido. Tente novamente.");
            setLoading(false);
        }
    }


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

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
            <ParticlesBackground />

            {/* Developer Info */}
            <div className="absolute top-4 right-4 z-10">
                <div className="group relative">
                    <button className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all text-xs font-medium text-white/50 hover:text-white">
                        {getVersionString()}
                    </button>

                    <div className="absolute right-0 top-full mt-2 w-64 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto transform translate-y-2 group-hover:translate-y-0">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 border-b border-white/10 pb-2">
                                <img
                                    src="https://github.com/gabrielalves1.png"
                                    alt="Developer"
                                    className="w-10 h-10 rounded-full border-2 border-primary-500/50"
                                />
                                <div>
                                    <p className="text-white font-medium text-sm">{DEVELOPER_INFO.name}</p>
                                    <p className="text-white/50 text-xs">{DEVELOPER_INFO.role}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <a href={`mailto:${DEVELOPER_INFO.email}`} className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors p-1.5 rounded bg-white/5 hover:bg-white/10">
                                    <FileText size={12} />
                                    Email
                                </a>
                                <a href={DEVELOPER_INFO.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors p-1.5 rounded bg-white/5 hover:bg-white/10">
                                    <Globe size={12} />
                                    Website
                                </a>
                                <a href={DEVELOPER_INFO.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors p-1.5 rounded bg-white/5 hover:bg-white/10">
                                    <Building2 size={12} />
                                    LinkedIn
                                </a>
                                <a href={DEVELOPER_INFO.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors p-1.5 rounded bg-white/5 hover:bg-white/10">
                                    <Activity size={12} />
                                    GitHub
                                </a>
                            </div>

                            <div className="text-[10px] text-white/30 text-center pt-1 border-t border-white/10">
                                {DEVELOPER_INFO.company} © {new Date().getFullYear()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-md mx-4 relative z-10">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border-0 relative group">
                    {/* Gradient Border Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 opacity-100 p-[2px] rounded-2xl pointer-events-none -z-10">
                        <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl" />
                    </div>
                    {/* Top Accent Line */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
                    <div className="p-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mb-8"
                        >
                            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30 transform rotate-0 hover:rotate-3 transition-transform duration-300">
                                <Stethoscope className="text-white w-10 h-10" />
                            </div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
                                ProBPA
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                                Sistema de Gestão de Produção BPA/BPA-I
                            </p>
                        </motion.div>

                        <AnimatePresence mode="wait">
                            {showUnits ? (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                        Selecione uma Unidade
                                    </h2>
                                    <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {user?.units?.map((unit) => (
                                            <button
                                                key={unit.id}
                                                onClick={() => handleUnitSelect(unit)}
                                                className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/10 hover:border-primary-200 dark:hover:border-primary-700/30 transition-all duration-200 group relative overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="flex items-start gap-3 relative z-10">
                                                    <div className="p-2 rounded-lg bg-primary-100/50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform duration-300">
                                                        <Building2 size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                            {unit.name}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                            <MapPin size={12} />
                                                            {unit.municipality_name} - {unit.municipality_uf}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 dark:text-gray-500">
                                                            <span>CNES: {unit.cnes}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full mt-4"
                                        onClick={logout}
                                    >
                                        Voltar
                                    </Button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="login-form"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-4"
                                >
                                    <form onSubmit={handleLogin} className="space-y-4">
                                        <Input
                                            label="Email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="seu@email.com"
                                            required
                                            startAdornment={<Mail size={18} />}
                                            className="bg-white/50 dark:bg-gray-900/50"
                                        />
                                        <div className="space-y-1">
                                            <div className="relative">
                                                <Input
                                                    label="Senha"
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    required
                                                    startAdornment={<Lock size={18} />}
                                                    className="bg-white/50 dark:bg-gray-900/50"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowForgotPassword(true)}
                                                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                                                >
                                                    Esqueceu a senha?
                                                </button>
                                            </div>
                                        </div>

                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-900/30"
                                            >
                                                {error}
                                            </motion.div>
                                        )}

                                        <Button
                                            type="submit"
                                            className="w-full justify-center py-6 text-base font-medium shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all duration-300"
                                            isLoading={loading}
                                        >
                                            Entrar no Sistema
                                        </Button>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Copyright */}
                {/* Footer */}
                <div className="mt-12 text-center space-y-1">
                    <p className="text-gray-400 dark:text-gray-500 text-xs font-medium">
                        &copy; {DEVELOPER_INFO.year} - {DEVELOPER_INFO.company} - Desenvolvido por:
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-bold tracking-wide">
                        {DEVELOPER_INFO.company}
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-[10px]">
                        {DEVELOPER_INFO.cnpj}
                    </p>
                    <div className="pt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Versão {getVersionString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal use Native Firebase Reset */}
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
                                ×
                            </button>

                            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                                Redefinir Senha
                            </h2>

                            {!resetSuccess ? (
                                <div className="space-y-4">
                                    <p className="text-gray-600 dark:text-gray-300">
                                        Informe seu e-mail cadastrado para receber o link de redefinição de senha.
                                    </p>
                                    <Input
                                        label="E-mail"
                                        type="email"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        className="bg-gray-50 dark:bg-gray-900/50"
                                    />
                                    {resetError && (
                                        <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
                                            {resetError}
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="outline" onClick={handleBackToLogin}>Cancelar</Button>
                                        <Button onClick={handleForgotPassword} isLoading={resetLoading}>Enviar Link</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 text-center">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <FileText size={32} />
                                    </div>
                                    <h3 className="text-xl font-medium text-green-600">E-mail Enviado!</h3>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        Verifique sua caixa de entrada (e spam) para redefinir sua senha através do link enviado.
                                    </p>
                                    <Button className="w-full mt-4" onClick={handleBackToLogin}>
                                        Voltar para Login
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MFA Verification Modal */}
            <AnimatePresence>
                {showMFA && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 relative"
                        >
                            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                                Verificação em Duas Etapas
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                Um código SMS foi enviado para o seu número cadastrado. Informe-o abaixo para continuar.
                            </p>

                            <div id="recaptcha-container"></div>

                            <Input
                                label="Código de Verificação"
                                type="text"
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value)}
                                placeholder="123456"
                                className="bg-gray-50 dark:bg-gray-900/50 text-center text-lg tracking-widest"
                            />

                            {error && (
                                <div className="mt-2 p-3 bg-red-100 text-red-700 rounded text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowMFA(false);
                                        setLoading(false);
                                        setError('');
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={verifyMfaCode}
                                    isLoading={loading}
                                    disabled={mfaCode.length < 6}
                                >
                                    Verificar
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};