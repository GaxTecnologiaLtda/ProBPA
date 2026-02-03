import React from 'react';
import { useUnidadeAuth, UserRole } from '../contexts/AuthContext';
import { ShieldCheck, UserCircle, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';

const LoginPage: React.FC = () => {
    const { login } = useUnidadeAuth();

    const handleLogin = (role: UserRole) => {
        login(role);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8 text-center bg-medical-600 text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Stethoscope className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Painel da Unidade</h1>
                    <p className="text-medical-100 mt-2 text-sm">Selecione seu perfil para acessar o ambiente de simulação.</p>
                </div>

                <div className="p-8 space-y-4">
                    <button
                        onClick={() => handleLogin('RECEPCIONISTA')}
                        className="w-full p-4 rounded-xl border border-gray-200 hover:border-medical-500 hover:bg-medical-50 hover:shadow-md transition-all group flex items-center gap-4 text-left"
                    >
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-200 transition-colors">
                            <UserCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 group-hover:text-medical-700">Recepcionista</p>
                            <p className="text-sm text-gray-500">Acesso a agenda, atendimentos e dashboard básico.</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleLogin('COORDENADOR')}
                        className="w-full p-4 rounded-xl border border-gray-200 hover:border-medical-500 hover:bg-medical-50 hover:shadow-md transition-all group flex items-center gap-4 text-left"
                    >
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-full group-hover:bg-purple-200 transition-colors">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 group-hover:text-medical-700">Coordenador</p>
                            <p className="text-sm text-gray-500">Acesso total, gestão de escalas e configurações.</p>
                        </div>
                    </button>

                    <div className="pt-4 text-center space-y-2">
                        <p className="text-xs text-gray-400">Ambiente de Homologação • v1.0.0</p>
                        <p className="text-[10px] text-gray-300 uppercase tracking-wide">
                            Acesso restrito a profissionais autorizados. Monitoramento de IP ativo.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
