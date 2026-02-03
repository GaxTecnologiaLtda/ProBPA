import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import { Card, Button, Badge, Input } from '../components/ui/BaseComponents';
import { Mail, Briefcase, CreditCard, LogOut, Building, Shield, Smartphone, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebase';
import { RecaptchaVerifier, multiFactor, PhoneAuthProvider, PhoneMultiFactorGenerator, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export const Profile: React.FC = () => {
    const { user, logout, currentUnit, selectUnit } = useApp();
    const [mfaStatus, setMfaStatus] = useState<'enabled' | 'disabled' | 'loading'>('loading');

    // Enrollment State
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [step, setStep] = useState<'password' | 'phone' | 'code' | 'success'>('password');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form Data
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationId, setVerificationId] = useState('');
    const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

    useEffect(() => {
        if (user) {
            checkMfaStatus();
            // Pre-fill phone if available in context
            if (user.phone) setPhoneNumber(user.phone);
        }
    }, [user]);

    const checkMfaStatus = async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const enrolledFactors = multiFactor(currentUser).enrolledFactors;
            setMfaStatus(enrolledFactors.length > 0 ? 'enabled' : 'disabled');
        }
    };

    const handleOpenEnroll = () => {
        setStep('password');
        setPassword('');
        setVerificationCode('');
        setError('');
        setShowEnrollModal(true);
    };

    const handleReauth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const currentUser = auth.currentUser;
            if (!currentUser || !currentUser.email) throw new Error("Usuário não autenticado");

            const credential = EmailAuthProvider.credential(currentUser.email, password);
            await reauthenticateWithCredential(currentUser, credential);

            setStep('phone');
        } catch (err: any) {
            console.error(err);
            setError("Senha incorreta. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    // Initialize Recaptcha when entering 'phone' step
    useEffect(() => {
        if (step === 'phone' && !recaptchaVerifier && showEnrollModal) {
            try {
                const verifier = new RecaptchaVerifier(auth, 'enroll-recaptcha', {
                    'size': 'invisible'
                });
                setRecaptchaVerifier(verifier);
            } catch (e) {
                console.error("Recaptcha init error", e);
            }
        }
    }, [step, showEnrollModal]);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recaptchaVerifier) return;

        setLoading(true);
        setError('');

        const currentUser = auth.currentUser;
        if (!currentUser) return;

        try {
            const multiFactorSession = await multiFactor(currentUser).getSession();

            // Format phone number to E.164 standard (+55...)
            let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
            if (!formattedPhone.startsWith('55')) {
                formattedPhone = '55' + formattedPhone;
            }
            formattedPhone = '+' + formattedPhone;

            console.log("Sending SMS to:", formattedPhone);

            const phoneInfoOptions = {
                phoneNumber: formattedPhone,
                session: multiFactorSession
            };

            const phoneAuthProvider = new PhoneAuthProvider(auth);
            const vid = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
            setVerificationId(vid);
            setStep('code');
        } catch (err: any) {
            console.error("MFA Error Full Object:", err);
            console.error("MFA Error Code:", err.code);
            console.error("MFA Error Message:", err.message);
            setError("Erro ao enviar SMS: " + (err.code === 'auth/internal-error' ? 'Erro interno. Verifique se o plano Blaze está ativo no Firebase.' : err.message));
            if (recaptchaVerifier) {
                try {
                    recaptchaVerifier.clear();
                } catch (e) {
                    console.warn("Failed to clear recaptcha", e);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const currentUser = auth.currentUser;
        if (!currentUser) return;

        try {
            const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
            const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);

            await multiFactor(currentUser).enroll(multiFactorAssertion, "Meu Celular");

            setStep('success');
            setMfaStatus('enabled');
        } catch (err: any) {
            console.error(err);
            setError("Código inválido ou expirado.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>

            <Card className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                        alt={user.name}
                        className="w-24 h-24 rounded-full border-4 border-gray-100 dark:border-gray-700 object-cover"
                    />
                    <div className="text-center sm:text-left flex-1 space-y-1">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                        <p className="text-medical-600 dark:text-medical-400 font-medium">{user.role}</p>
                        <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-500">
                            <Badge>Ativo</Badge>
                            <span>Desde 2021</span>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6 space-y-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Dados Pessoais</h3>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500">
                                <CreditCard size={18} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">CNS</p>
                                <p className="font-medium dark:text-gray-200">{user.cns}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500">
                                <Mail size={18} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">E-mail</p>
                                <p className="font-medium dark:text-gray-200">{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500">
                                <Briefcase size={18} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">CBO</p>
                                <p className="font-medium dark:text-gray-200">{user.cbo || 'Não informado'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500">
                                <Smartphone size={18} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Celular (Cadastro)</p>
                                <p className="font-medium dark:text-gray-200">{user.phone || 'Não informado'}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Unidades Vinculadas</h3>
                        <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                            {user.units.map(unit => {
                                const isActive = currentUnit?.id === unit.id;
                                return (
                                    <div key={unit.id} className={`flex items-center justify-between p-3 rounded-xl border ${isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'}`}>
                                        <div className="flex items-start gap-3">
                                            <Building className={`${isActive ? 'text-emerald-500' : 'text-gray-400'} mt-1`} size={18} />
                                            <div>
                                                <p className={`font-medium text-sm ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-white'}`}>{unit.name}</p>
                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                    <span className="text-xs text-gray-500">{unit.municipalityName} • {unit.occupation}</span>
                                                    {unit.type && <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-px rounded text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{unit.type}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {!isActive && (
                                            <Button size="sm" variant="outline" onClick={() => selectUnit(unit)}>
                                                Alternar
                                            </Button>
                                        )}
                                        {isActive && (
                                            <Badge type="success">Ativa</Badge>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Security Section */}
                    <Card className="p-6 space-y-4 border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-500" />
                                Segurança da Conta
                            </h3>
                            {mfaStatus === 'enabled' ? (
                                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle size={10} /> Protegida
                                </span>
                            ) : (
                                <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full flex items-center gap-1">
                                    <AlertTriangle size={10} /> Atenção
                                </span>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div>
                                <p className="font-medium text-sm text-gray-900 dark:text-white">Autenticação em Duas Etapas (2FA)</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Adicione uma camada extra de segurança exigindo um código SMS ao fazer login.
                                </p>
                            </div>

                            {mfaStatus === 'enabled' ? (
                                <Button variant="outline" className="w-full border-green-200 text-green-700 bg-green-50 hover:bg-green-100" disabled>
                                    <CheckCircle size={16} className="mr-2" />
                                    Ativado para seu celular
                                </Button>
                            ) : (
                                <Button onClick={handleOpenEnroll} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                    <Shield size={16} className="mr-2" />
                                    Ativar Autenticação de Dois Fatores
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            <Button onClick={logout} variant="danger" className="w-full sm:w-auto mt-6" size="lg">
                <LogOut size={18} className="mr-2" /> Sair do Sistema
            </Button>

            {/* MFA Enrollment Modal */}
            <AnimatePresence>
                {showEnrollModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 relative"
                        >
                            <button
                                onClick={() => setShowEnrollModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                ×
                            </button>

                            <div className="mb-6 text-center">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Shield size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configurar 2FA</h2>
                                <p className="text-sm text-gray-500">Proteja sua conta com verificação via SMS</p>
                            </div>

                            {/* Step 1: Password Re-auth */}
                            {step === 'password' && (
                                <form onSubmit={handleReauth} className="space-y-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                        Por segurança, confirme sua senha atual para continuar.
                                    </p>
                                    <Input
                                        label="Senha Atual"
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        className="bg-gray-50 dark:bg-gray-900/50"
                                    />
                                    {error && <p className="text-xs text-red-500">{error}</p>}
                                    <Button type="submit" isLoading={loading} className="w-full">
                                        Confirmar Senha
                                    </Button>
                                </form>
                            )}

                            {/* Step 2: Phone Input */}
                            {step === 'phone' && (
                                <form onSubmit={handleSendCode} className="space-y-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                        Confirme o número do seu celular para receber o código.
                                    </p>
                                    <Input
                                        label="Número de Celular"
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={e => setPhoneNumber(e.target.value)}
                                        placeholder="11999999999"
                                        required
                                        className="bg-gray-50 dark:bg-gray-900/50"
                                    />
                                    <p className="text-xs text-gray-400">
                                        Informe ddd + número. Ex: 11999999999 (O prefixo +55 será adicionado automaticamente)
                                    </p>
                                    <div id="enroll-recaptcha"></div>
                                    {error && <p className="text-xs text-red-500">{error}</p>}
                                    <Button type="submit" isLoading={loading} className="w-full">
                                        Enviar Código SMS
                                    </Button>
                                </form>
                            )}

                            {/* Step 3: Verify Code */}
                            {step === 'code' && (
                                <form onSubmit={handleVerifyCode} className="space-y-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                        Informe o código de 6 dígitos enviado para <strong>{phoneNumber}</strong>.
                                    </p>
                                    <Input
                                        label="Código de Verificação"
                                        value={verificationCode}
                                        onChange={e => setVerificationCode(e.target.value)}
                                        placeholder="123456"
                                        className="text-center text-lg tracking-widest bg-gray-50 dark:bg-gray-900/50"
                                        required
                                    />
                                    {error && <p className="text-xs text-red-500">{error}</p>}
                                    <Button type="submit" isLoading={loading} className="w-full">
                                        Verificar e Ativar
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => setStep('phone')}
                                        className="w-full text-xs text-gray-500 hover:underline mt-2"
                                    >
                                        Voltar / Corrigir Número
                                    </button>
                                </form>
                            )}

                            {/* Step 4: Success */}
                            {step === 'success' && (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sucesso!</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                        A Autenticação de Dois Fatores foi ativada na sua conta.
                                    </p>
                                    <Button onClick={() => setShowEnrollModal(false)} className="w-full bg-green-600 hover:bg-green-700">
                                        Fechar
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};