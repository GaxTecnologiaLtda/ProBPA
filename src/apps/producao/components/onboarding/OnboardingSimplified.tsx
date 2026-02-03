import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, LayoutDashboard, PlusCircle, UserCircle, History, Building2, LifeBuoy, Info, MapPin, Stethoscope } from 'lucide-react';
import { Card, Button } from '../ui/BaseComponents';

export const OnboardingSimplified: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            title: "O que é o Painel de Produção?",
            subtitle: "Visão Geral do Sistema",
            icon: Info,
            color: "text-blue-600 bg-blue-50",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        No contexto do profissional vinculado à entidade, este é o ambiente oficial onde suas produções
                        são registradas para <strong>faturamento</strong> e <strong>auditoria</strong> do SUS.
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        O painel garante que todos os seus atendimentos sejam contabilizados corretamente,
                        seguindo as regras do BPA/BPA-I e garantindo a conformidade das informações.
                    </p>
                </div>
            )
        },
        {
            title: "Dashboard",
            subtitle: "Seus Indicadores em Tempo Real",
            icon: LayoutDashboard,
            color: "text-purple-600 bg-purple-50",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Acompanhe sua produtividade em tempo real com indicadores precisos:
                    </p>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            <span>
                                <strong>Hoje vs. Ontem:</strong> Card de contagem diária para comparar seu ritmo de trabalho imediato.
                            </span>
                        </li>
                        <li className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            <span>
                                <strong>Total Mensal:</strong> Card consolidado e gráfico visual da sua produção no mês corrente.
                            </span>
                        </li>
                        <li className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            <span>
                                <strong>Acesso Rápido:</strong> Use o botão de destaque "Registrar Atendimento" para ir direto à ação.
                            </span>
                        </li>
                    </ul>
                </div>
            )
        },
        {
            title: "Registrar Atendimento",
            subtitle: "Modo Simplificado",
            icon: PlusCircle,
            color: "text-emerald-600 bg-emerald-50",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        O coração do sistema. Siga o fluxo otimizado para lançamentos rápidos:
                    </p>
                    <div className="space-y-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800">
                            <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm mb-1">1. Identificação e Competência</h4>
                            <p className="text-xs text-emerald-600 dark:text-emerald-300">
                                Escolha a <strong>Unidade</strong> (se atuar em múltiplas) e a <strong>Competência</strong> correta.
                                <br />
                                <span className="font-bold opacity-90">⚠️ Atenção:</span> O registro bloqueia após o fechamento da competência, o que prejudica seu faturamento. Mantenha em dia!
                            </p>
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800">
                            <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm mb-1">2. Paciente</h4>
                            <p className="text-xs text-emerald-600 dark:text-emerald-300">
                                Busque pacientes já cadastrados (por Nome ou CNS/CPF) ou use o insira CPF, nome e data de nascimento para cadastro rápido de novos usuários.
                            </p>
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800">
                            <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm mb-1">3. Procedimentos</h4>
                            <p className="text-xs text-emerald-600 dark:text-emerald-300">
                                Selecione o procedimento SIGTAP, defina a quantidade e adicione quantos forem necessários para o mesmo atendimento.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "Cadastro do Cidadão",
            subtitle: "Gestão de Usuários",
            icon: UserCircle,
            color: "text-orange-600 bg-orange-50",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Mantenha a base de pacientes sempre atualizada para evitar glosas no faturamento:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
                        <li><strong>Busca Rápida:</strong> Pesquise por CPF, CNS ou Nome.</li>
                        <li><strong>Cadastro Completo:</strong> Dados pessoais, endereço e condições de saúde.</li>
                        <li><strong>Edição:</strong> Correção de dados de pacientes já existentes.</li>
                    </ul>
                </div>
            )
        },
        {
            title: "Histórico",
            subtitle: "Consulta de Registros",
            icon: History,
            color: "text-indigo-600 bg-indigo-50",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Acesse todos os seus atendimentos passados para conferência ou edição:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
                        <li><strong>Filtros:</strong> Por data, tipo de procedimento ou paciente.</li>
                    </ul>
                </div>
            )
        },
        {
            title: "Unidades",
            subtitle: "Informações do Local",
            icon: Building2,
            color: "text-pink-600 bg-pink-50",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Uma visão completa dos estabelecimentos onde você atua.
                    </p>
                    <div className="bg-pink-50 dark:bg-pink-900/10 p-3 rounded-lg border border-pink-100 dark:border-pink-800">
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <li className="flex items-center gap-2">
                                <Building2 size={16} className="text-pink-500" />
                                <span><strong>Identificação:</strong> Nome Oficial e CNES do estabelecimento.</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <MapPin size={16} className="text-pink-500" />
                                <span><strong>Localização:</strong> Município de vínculo.</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Stethoscope size={16} className="text-pink-500" />
                                <span><strong>Vínculo:</strong> Sua ocupação (CBO) nesta unidade específica.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            title: "Dicas & Suporte",
            subtitle: "Ajuda e Instalação",
            icon: LifeBuoy,
            color: "text-red-600 bg-red-50",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Dicas extras para aproveitar o máximo do ProBPA:
                    </p>
                    <div className="space-y-4">
                        <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-800">
                            <h4 className="font-semibold text-orange-700 dark:text-orange-400 text-sm mb-1 flex items-center gap-2">
                                <Info size={14} /> Indicador de Conexão
                            </h4>
                            <p className="text-xs text-orange-600 dark:text-orange-300">
                                Localizado no topo, informa se você está Online ou Offline.
                                O sistema salva seus dados mesmo sem internet e sincroniza automaticamente quando a conexão voltar.
                            </p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                            <h4 className="font-semibold text-blue-700 dark:text-blue-400 text-sm mb-1 flex items-center gap-2">
                                <LayoutDashboard size={14} /> Instalar App (PWA)
                            </h4>
                            <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-1 list-disc pl-4">
                                <li><strong>Android (Chrome):</strong> Toque nos 3 pontos e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".</li>
                                <li><strong>iOS (Safari):</strong> Toque no botão Compartilhar e selecione "Adicionar à Tela de Início".</li>
                            </ul>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-800">
                            <h4 className="font-semibold text-red-700 dark:text-red-400 text-sm mb-1">Precisa de Ajuda?</h4>
                            <p className="text-xs text-red-600 dark:text-red-300">
                                Abra um chamado para a equipe de tecnologia relatando erros ou dificuldades.
                            </p>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) setCurrentSlide(curr => curr + 1);
    };

    const prevSlide = () => {
        if (currentSlide > 0) setCurrentSlide(curr => curr - 1);
    };

    return (
        <>
            {/* Main Card CTA */}
            <div className="p-8 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 shadow-sm relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-indigo-500/20" />

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1 text-center md:text-left">
                        <span className="inline-block px-3 py-1 mb-3 text-xs font-bold tracking-wider text-indigo-600 uppercase bg-indigo-100 rounded-full dark:bg-indigo-900/40 dark:text-indigo-300">
                            Modo Simplificado
                        </span>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Bem-vindo ao Painel
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 max-w-lg mx-auto md:mx-0">
                            Preparamos um tour rápido para você conhecer todas as funcionalidades essenciais da sua interface. Leva menos de 2 minutos!
                        </p>
                    </div>
                    <Button
                        onClick={() => setIsOpen(true)}
                        className="px-8 py-4 text-base shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px]"
                    >
                        Iniciar Tour
                    </Button>
                </div>
            </div>

            {/* Slide Modal */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] flex overflow-hidden relative"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-4 right-4 z-20 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-white/50 dark:bg-black/20 rounded-full backdrop-blur transition-colors"
                            >
                                <X size={20} />
                            </button>

                            {/* Left Side: Navigation & Progress */}
                            <div className="w-1/3 bg-gray-50 dark:bg-gray-900/50 p-8 border-r border-gray-100 dark:border-gray-700 flex flex-col justify-between hidden md:flex">
                                <div>
                                    <h4 className="font-bold text-gray-400 uppercase tracking-wider text-xs mb-6">
                                        Roteiro
                                    </h4>
                                    <div className="space-y-3">
                                        {slides.map((s, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentSlide(idx)}
                                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${currentSlide === idx
                                                    ? 'bg-white dark:bg-gray-800 shadow-md text-gray-900 dark:text-white ring-1 ring-gray-200 dark:ring-gray-700'
                                                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                                                    }`}
                                            >
                                                <div className={`w-2 h-2 rounded-full ${currentSlide === idx ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                                {s.title}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="text-xs text-center text-gray-400 mt-4">
                                    Passo {currentSlide + 1} de {slides.length}
                                </div>
                            </div>

                            {/* Right Side: Content */}
                            <div className="flex-1 p-6 md:p-12 flex flex-col relative h-full max-h-[600px] overflow-hidden">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentSlide}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex-1 flex flex-col overflow-hidden" // Use flex column and overflow hidden to contain scroll
                                    >
                                        {/* Header Section (Icon + Title) */}
                                        <div className="flex-shrink-0 mb-4">
                                            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4 ${slides[currentSlide].color}`}>
                                                {React.createElement(slides[currentSlide].icon, { size: 24 })} {/* Smaller icon on mobile */}
                                            </div>

                                            <h2 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                                {slides[currentSlide].title}
                                            </h2>
                                            <p className="text-sm md:text-lg text-indigo-600 dark:text-indigo-400 font-medium">
                                                {slides[currentSlide].subtitle}
                                            </p>
                                        </div>

                                        {/* Scrollable Content Area */}
                                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                                            <div className="prose dark:prose-invert max-w-none text-sm md:text-base pb-4">
                                                {slides[currentSlide].content}
                                            </div>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>

                                {/* Navigation Controls (Mobile & Desktop) - Fixed at bottom */}
                                <div className="flex-shrink-0 flex items-center justify-between pt-4 mt-2 border-t border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800 z-10">
                                    <Button
                                        variant="outline"
                                        onClick={prevSlide}
                                        disabled={currentSlide === 0}
                                        className="gap-2 text-xs md:text-sm px-3 py-2"
                                    >
                                        <ChevronLeft size={16} /> <span className="hidden md:inline">Anterior</span>
                                    </Button>

                                    <div className="flex gap-1 md:hidden">
                                        {slides.map((_, idx) => (
                                            <div key={idx} className={`w-1.5 h-1.5 rounded-full ${currentSlide === idx ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                                        ))}
                                    </div>

                                    {currentSlide === slides.length - 1 ? (
                                        <Button
                                            onClick={() => setIsOpen(false)}
                                            className="bg-green-600 hover:bg-green-700 text-white gap-2 text-xs md:text-sm px-3 py-2"
                                        >
                                            Concluir <ChevronRight size={16} />
                                        </Button>
                                    ) : (
                                        <Button onClick={nextSlide} className="gap-2 text-xs md:text-sm px-3 py-2">
                                            <span className="hidden md:inline">Próximo</span> <ChevronRight size={16} />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
