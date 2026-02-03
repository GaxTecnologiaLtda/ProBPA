import { useState, useEffect } from 'react';
import { Download, Shield, Zap, TrendingUp, Users, FileCheck, BarChart3, Database, Lock, CheckCircle2, Terminal, Server, RefreshCw, Settings, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function ConnectorPage() {
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [downloadInfo, setDownloadInfo] = useState({
        version: "3.3",
        url: "https://github.com/GaxTecnologiaLtda/ProBPA/releases/latest"
    });

    useEffect(() => {
        fetch('/connector_version.json')
            .then(res => {
                if (!res.ok) throw new Error("Version manifest not found");
                return res.json();
            })
            .then(data => {
                if (data.url && data.version) {
                    setDownloadInfo({
                        version: data.version,
                        url: data.url
                    });
                }
            })
            .catch(err => console.warn("Failed to load latest version info, using default.", err));
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-emerald-500/30">
            {/* Navbar */}
            <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Database className="text-white w-6 h-6" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Conector <span className="text-emerald-400">ProBPA</span></span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#beneficios" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Benefícios</a>
                        <a href="#seguranca" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Segurança & LGPD</a>
                        <a href="#como-funciona" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Instalação</a>
                        <a
                            href={downloadInfo.url}
                            className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-full text-sm hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            Baixar Agora
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-24 pb-32 overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-900/20 rounded-full blur-[120px] -z-10" />

                <div className="max-w-5xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 text-sm font-semibold mb-8 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Nova Versão {downloadInfo.version} Disponível
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent leading-tight">
                        Transforme Dados Operacionais <br />
                        em <span className="text-emerald-400">Inteligência Gerencial</span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                        O Conector ProBPA extrai e consolida informações do e-SUS APS sem interferir na rotina das unidades.
                        Monitore indicadores de desempenho, faturamento e cobertura em tempo real (D+1).
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href={downloadInfo.url}
                            className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 group"
                        >
                            <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                            Baixar Conector
                        </a>
                        <button
                            onClick={() => setIsDocsOpen(true)}
                            className="w-full sm:w-auto px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-white rounded-xl font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2 backdrop-blur-sm cursor-pointer"
                        >
                            <Terminal className="w-5 h-5 text-slate-400" />
                            Documentação Técnica
                        </button>
                    </div>

                    <div className="mt-12 flex items-center justify-center gap-8 text-slate-500 text-sm font-medium">
                        <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500" /> LGPD Compliant</span>
                        <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-500" /> Zero Impacto no PEC</span>
                        <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Foco em Resultados</span>
                    </div>
                </div>
            </section>

            {/* Main Benefits Grid */}
            <section id="beneficios" className="py-24 bg-slate-900/30">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <BenefitCard
                            icon={BarChart3}
                            title="Gestão Estratégica"
                            desc="Estude seus indicadores de cobertura antes mesmo do MS. Antecipe cenários e aborde ações de saúde de forma estratégica com dados de D+1."
                        />
                        <BenefitCard
                            icon={TrendingUp}
                            title="Sustentabilidade Financeira"
                            desc="Apoio direto ao faturamento: monitore repasses, incentivos e programas federais. Identifique gargalos e subutilização de recursos."
                        />
                        <BenefitCard
                            icon={FileCheck}
                            title="Transparência e Governança"
                            desc="Relatórios claros para gestão e órgãos de controle. Torne a gestão municipal mais organizada, rastreável e auditável."
                        />
                        <BenefitCard
                            icon={Users}
                            title="Para Gestores e OSCs"
                            desc="Ideal para prefeituras e Organizações da Sociedade Civil que trabalham com saúde complementar e precisam de métricas precisas."
                        />
                        <BenefitCard
                            icon={Zap}
                            title="Zero Impacto Operacional"
                            desc="Nada muda na rotina das UBS. Profissionais continuam usando o PEC normalmente, sem telas extras ou retrabalho."
                        />
                        <BenefitCard
                            icon={Database}
                            title="Base Sólida para Decisão"
                            desc="Planeje ações com base em evidência real. Dimensione equipes, identifique áreas descobertas e justifique decisões administrativas."
                        />
                    </div>
                </div>
            </section>

            {/* Security & LGPD Section */}
            <section id="seguranca" className="py-24 relative overflow-hidden">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-3xl -z-10" />

                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold mb-6">
                                <Lock className="w-3 h-3" /> SEGURANÇA MÁXIMA
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">Respeito Absoluto à LGPD e Dados Clínicos</h2>
                            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                                O Conector ProBPA foi desenhado seguindo rigorosamente os princípios da Lei Geral de Proteção de Dados e da Lei Orgânica da Saúde.
                            </p>

                            <ul className="space-y-4">
                                <FeatureItem text="Não acessa prontuários clínicos dos pacientes" />
                                <FeatureItem text="Não extrai anamnese ou evolução SOAP" />
                                <FeatureItem text="Trabalha apenas com dados administrativos de produção" />
                                <FeatureItem text="Não interfere nem altera o banco de dados oficial (Leitura)" />
                            </ul>
                        </div>

                        <div className="lg:w-1/2 relative">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 md:p-12 relative z-10 shadow-2xl">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6">
                                    <Shield className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">Soberania dos Dados</h3>
                                <p className="text-slate-400 mb-6">
                                    "O conector não substitui o e-SUS APS. Os dados continuam pertencendo integralmente ao Município e a base oficial permanece intacta."
                                </p>
                                <div className="h-px w-full bg-slate-800 mb-6" />
                                <div className="flex items-center gap-4 text-sm text-slate-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <span>Município mantém controle total</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-300 mt-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <span>Sem dependência técnica proprietária</span>
                                </div>
                            </div>
                            {/* Decorative behind card */}
                            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl opacity-20 blur-xl -z-10" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Quote Section */}
            <section className="py-20 bg-emerald-950/30 border-y border-emerald-900/30">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-2xl md:text-3xl font-medium italic leading-relaxed text-emerald-100/90">
                        "O Conector PEC transforma dados operacionais do e-SUS em informação gerencial confiável,
                        sem interferir no sistema oficial, garantindo segurança, eficiência e melhor tomada de decisão."
                    </h2>
                </div>
            </section>

            {/* Installation CTA (Restored) */}
            <section id="como-funciona" className="py-24">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 md:p-16 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Pronto para modernizar sua gestão?</h2>
                        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                            A instalação é simples e segura.
                        </p>

                        <div className="grid md:grid-cols-3 gap-8 mb-12 text-left bg-slate-950/50 p-6 rounded-2xl border border-slate-800/50">
                            <div className="space-y-3">
                                <span className="text-emerald-500 font-bold text-lg">01. Download</span>
                                <p className="text-slate-400 text-sm">Baixe o instalador seguro diretamente nesta página.</p>
                            </div>
                            <div className="space-y-3">
                                <span className="text-emerald-500 font-bold text-lg">02. Instalação</span>
                                <p className="text-slate-400 text-sm">Execute no servidor e-SUS. O processo é rápido e leve.</p>
                            </div>
                            <div className="space-y-3">
                                <span className="text-emerald-500 font-bold text-lg">03. Configuração</span>
                                <p className="text-slate-400 text-sm">Solicite a configuração assistida com nosso administrador.</p>
                            </div>
                        </div>

                        <a
                            href={downloadInfo.url}
                            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-950 hover:bg-emerald-50 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-white/5"
                        >
                            <Download className="w-5 h-5" />
                            Baixar Instalador
                        </a>
                        <p className="mt-6 text-sm text-slate-500">
                            Compatível com Windows 10/11 e Server 2016+. <br />
                            Necessário acesso local (físico ou remoto) ao servidor da aplicação.
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-slate-800 bg-slate-950 text-slate-400">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-emerald-500" />
                        <span className="font-semibold text-slate-200">ProBPA Conector</span>
                    </div>
                    <p className="text-sm">© 2026 GAX Tecnologia. Soluções Inteligentes para Saúde Pública.</p>
                    <div className="flex gap-6 text-sm">
                        <a href="#" className="hover:text-emerald-400 transition-colors">Suporte</a>
                        <a href="#" className="hover:text-emerald-400 transition-colors">Privacidade</a>
                    </div>
                </div>
            </footer>

            {/* Docs Modal */}
            <AnimatePresence>
                {isDocsOpen && (
                    <DocsModal onClose={() => setIsDocsOpen(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}

function DocsModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl mr-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Terminal className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Documentação Técnica</h2>
                            <p className="text-xs text-slate-400">Especificações e Arquitetura v3.2</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8">
                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Architecture Column */}
                        <div className="space-y-8">
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-blue-500/30 transition-colors">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
                                        <Server className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Arquitetura & Conexão</h3>
                                </div>
                                <ul className="space-y-4 text-slate-400 text-sm leading-relaxed">
                                    <li className="flex gap-3">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                        <span><strong>Agente Local (Windows Service):</strong> Executa como processo de background, gerenciado via System Tray e Registry Run Key.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                        <span><strong>Conexão Banco de Dados:</strong> Conecta-se diretamente ao PostgreSQL local do e-SUS APS (usualmente porta 5432 ou 5433).</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                        <span><strong>Modo Somente Leitura:</strong> As credenciais utilizadas permitem apenas operações SELECT, garantindo integridade total da base oficial.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-emerald-500/30 transition-colors">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Segurança & Criptografia</h3>
                                </div>
                                <ul className="space-y-4 text-slate-400 text-sm leading-relaxed">
                                    <li className="flex gap-3">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        <span><strong>Comunicação Outbound:</strong> O conector inicia todas as conexões (HTTPS porta 443). Nenhuma porta de entrada é aberta no firewall do município.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        <span><strong>Criptografia em Trânsito:</strong> Todos os dados trafegam via TLS 1.3 (SSL Pinning).</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        <span><strong>Segurança Local:</strong> Configurações sensíveis (credenciais do banco) são armazenadas criptografadas localmente (AES-256).</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Requirements & Flow Column */}
                        <div className="space-y-8">
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-purple-500/30 transition-colors">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center">
                                        <Settings className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Requisitos de Sistema</h3>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ambiente</span>
                                        <p className="text-slate-300 text-sm">Windows 10, Windows 11 ou Windows Server 2016+ (x64).</p>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dependências</span>
                                        <p className="text-slate-300 text-sm">Acesso local ou via rede ao PostgreSQL do e-SUS APS (Versões 4.x ou 5.x).</p>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rede</span>
                                        <p className="text-slate-300 text-sm">Conexão estável com internet. Liberação de saída HTTPS para o endpoint da API da GAX Tecnologia.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-amber-500/30 transition-colors">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center">
                                        <RefreshCw className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Ciclo de Vida dos Dados</h3>
                                </div>
                                <ol className="relative border-l border-slate-800 ml-3 space-y-6">
                                    <li className="ml-6">
                                        <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-slate-900 bg-amber-500"></span>
                                        <h4 className="text-sm font-bold text-slate-200">1. Coleta e Extração</h4>
                                        <p className="text-xs text-slate-500 mt-1">O agendador dispara a query SQL otimizada no banco local.</p>
                                    </li>
                                    <li className="ml-6">
                                        <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-slate-900 bg-amber-500"></span>
                                        <h4 className="text-sm font-bold text-slate-200">2. Processamento (Edge)</h4>
                                        <p className="text-xs text-slate-500 mt-1">Os dados brutos são anonimizados e estruturados em pacotes JSON compactados.</p>
                                    </li>
                                    <li className="ml-6">
                                        <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-slate-900 bg-amber-500"></span>
                                        <h4 className="text-sm font-bold text-slate-200">3. Transmissão Segura</h4>
                                        <p className="text-xs text-slate-500 mt-1">Envio assíncrono para a nuvem via API REST autenticada.</p>
                                    </li>
                                    <li className="ml-6">
                                        <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-slate-900 bg-amber-500"></span>
                                        <h4 className="text-sm font-bold text-slate-200">4. Consolidação (Cloud)</h4>
                                        <p className="text-xs text-slate-500 mt-1">Ingestão no Data Warehouse para alimentar dashboards em tempo real.</p>
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function BenefitCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/30 transition-all hover:shadow-2xl hover:shadow-emerald-500/5 group">
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
            <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
        </div>
    )
}

function FeatureItem({ text }: { text: string }) {
    return (
        <li className="flex items-start gap-3">
            <div className="mt-1 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            </div>
            <span className="text-slate-300">{text}</span>
        </li>
    )
}
