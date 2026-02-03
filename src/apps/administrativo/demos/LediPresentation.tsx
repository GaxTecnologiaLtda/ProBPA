
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Building2, Server, Activity, FileText, CheckCircle, Shield, AlertCircle, Database, LayoutDashboard, Search, FileDown } from 'lucide-react';
import { Card, Button, Input, Select, Badge } from '../components/Common';

// --- SLIDE COMPONENTS (ZeroLogic - Just UI) ---

// SLIDE 1: Configuration (Admin)
const SlideConfig = () => (
    <div className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <h3 className="text-lg font-bold">Editar Município: Salvador - BA</h3>
            <Badge variant="success">Ativo</Badge>
        </div>
        <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4 opacity-50 pointer-events-none">
                <Input label="Nome" value="Salvador" readOnly />
                <Input label="Código IBGE" value="2927408" readOnly />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold flex items-center gap-2 text-corp-600">
                        <Server className="w-4 h-4" /> Integração e-SUS APS (LEDI)
                    </h4>
                    <Badge variant="success">Conectado</Badge>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                    <Input label="URL do PEC" value="https://pec.saude.salvador.ba.gov.br" readOnly />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Usuário API" value="integra.probpa" readOnly />
                        <Input label="Senha" type="password" value="********" readOnly />
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button variant="outline" size="sm" icon={CheckCircle} className="text-green-600 border-green-200 bg-green-50">
                            Conexão Estabelecida
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// SLIDE 2: Production (Register)
const SlideProduction = () => (
    <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
        {/* Banner LEDI */}
        <div className="bg-blue-600 text-white p-3 text-center text-sm font-bold flex items-center justify-center gap-2 shadow-md z-10 relative">
            <Server className="w-4 h-4" /> Integração e-SUS APS Ativa
        </div>

        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-xl font-bold">Registrar Atendimento</h2>
                <div className="text-sm text-slate-500">UBS Dr. Mario Gattis</div>
            </div>

            <div className="grid grid-cols-12 gap-4">
                {/* Patient Search */}
                <div className="col-span-12 bg-blue-50 dark:bg-slate-700/30 p-4 rounded-lg border border-blue-100 dark:border-slate-600 flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Paciente (CNS Obrigatório)</label>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">JD</div>
                            <div>
                                <div className="font-bold text-slate-900 dark:text-white">João da Silva</div>
                                <div className="text-xs font-mono text-slate-500">CNS: 700.1234.5678.9000</div>
                            </div>
                        </div>
                    </div>
                    <Badge variant="neutral">Validado</Badge>
                </div>

                <div className="col-span-4">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data</label>
                    <div className="h-10 border rounded flex items-center px-3 bg-slate-50">29/12/2025</div>
                </div>
                <div className="col-span-8">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Local de Atendimento</label>
                    <div className="h-10 border border-blue-300 rounded flex items-center px-3 bg-white text-blue-900 font-medium">
                        01 - UBS (Unidade Básica de Saúde)
                    </div>
                </div>

                {/* Sigtap */}
                <div className="col-span-12 border-t border-slate-100 pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Procedimento</label>
                    <div className="p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                        <span className="font-mono font-bold text-slate-700">03.01.01.007-2</span>
                        <span className="font-medium">Consulta Médica em Atenção Básica</span>
                        <Badge variant="warning">Ativ. Coletiva</Badge>
                    </div>
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto shadow-lg shadow-blue-500/30">
                    <Server className="w-4 h-4 mr-2" />
                    Registrar (PEC / e-SUS)
                </Button>
            </div>
        </div>
    </div>
);

// SLIDE 3: Batches (Admin Audit)
const SlideBatches = () => (
    <div className="w-full max-w-5xl space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h3 className="font-bold text-slate-700 dark:text-slate-200">Lotes LEDI Enviados</h3>
                <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-white border rounded text-slate-500">Filtro: Todos</span>
                </div>
            </div>
            <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3 text-left">Competência</th>
                        <th className="px-4 py-3 text-left">Arquivo (XML)</th>
                        <th className="px-4 py-3 text-center">Registros</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    <tr className="bg-green-50/30">
                        <td className="px-4 py-3 font-mono">202512</td>
                        <td className="px-4 py-3 font-mono text-xs">LEDI_2927408_20251229_001.zip</td>
                        <td className="px-4 py-3 text-center font-bold">1,250</td>
                        <td className="px-4 py-3"><Badge variant="success">Enviado</Badge></td>
                        <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost">Detalhes</Button></td>
                    </tr>
                    <tr>
                        <td className="px-4 py-3 font-mono">202512</td>
                        <td className="px-4 py-3 font-mono text-xs">LEDI_2927408_20251229_002.zip</td>
                        <td className="px-4 py-3 text-center font-bold">45</td>
                        <td className="px-4 py-3"><Badge variant="warning">Processando</Badge></td>
                        <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost">Detalhes</Button></td>
                    </tr>
                    <tr className="bg-red-50/30">
                        <td className="px-4 py-3 font-mono">202512</td>
                        <td className="px-4 py-3 font-mono text-xs">LEDI_2927408_20251228_ERROR.xml</td>
                        <td className="px-4 py-3 text-center font-bold">3</td>
                        <td className="px-4 py-3"><Badge variant="danger">Erro Schema</Badge></td>
                        <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost">Ver Log</Button></td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* Mock Modal Overlay */}
        <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs relative shadow-2xl border border-slate-700 max-w-2xl mx-auto -mt-8"
        >
            <div className="absolute top-2 right-2 text-slate-500 text-[10px]">DEBUG PAYLOAD</div>
            <div>{'<ns3:dadoTransporteTransportXml xmlns:ns3="http://esus.ufsc.br/dadotransporte">'}</div>
            <div className="pl-4">{'<uuidDadoSerializado>1234-5678-90AB-CDEF</uuidDadoSerializado>'}</div>
            <div className="pl-4">{'<cnesDadoSerializado>1234567</cnesDadoSerializado>'}</div>
            <div className="pl-4 text-green-300">{'<!-- XML Assinado Digitalmente -->'}</div>
            <div>{'</ns3:dadoTransporteTransportXml>'}</div>
        </motion.div>
    </div>
);

// SLIDE 4: Entity Dashboard
const SlideEntity = () => (
    <div className="w-full max-w-4xl space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
            <Activity className="text-emerald-400" /> Monitoramento Global
        </h2>
        <div className="grid grid-cols-3 gap-6">
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FileDown size={48} /></div>
                <div className="text-slate-400 text-sm uppercase font-bold tracking-wider">Pendentes de Envio</div>
                <div className="text-4xl font-bold text-white mt-2">142</div>
                <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">Próximo lote: 03:00h</div>
            </div>
            <div className="bg-emerald-900/40 border border-emerald-800 p-6 rounded-xl shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-500"><CheckCircle size={48} /></div>
                <div className="text-emerald-100/70 text-sm uppercase font-bold tracking-wider">Enviados (Mês)</div>
                <div className="text-4xl font-bold text-emerald-400 mt-2">12,450</div>
                <div className="text-xs text-emerald-300/50 mt-1">100% Sucesso</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-red-500"><AlertCircle size={48} /></div>
                <div className="text-slate-400 text-sm uppercase font-bold tracking-wider">Erros de Validação</div>
                <div className="text-4xl font-bold text-white mt-2">3</div>
                <div className="text-xs text-red-400 mt-1 font-bold">Verificar Lotes</div>
            </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-xl relative mt-4">
            <h3 className="text-slate-800 font-bold mb-4">Volume de Transmissão (Últimos 7 dias)</h3>
            <div className="flex items-end gap-2 h-32 w-full px-4">
                {[40, 65, 30, 80, 55, 90, 75].map((h, i) => (
                    <div key={i} className="flex-1 bg-blue-100 rounded-t-lg relative group hover:bg-blue-200 transition-colors">
                        <motion.div
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className="bg-blue-600 w-full absolute bottom-0 rounded-t-lg"
                        />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// --- MAIN PRESENTER ---

const slides = [
    {
        title: "Integração LEDI: Visão Geral",
        subtitle: "Fluxo completo de interoperabilidade com e-SUS APS",
        content: (
            <div className="text-center space-y-8">
                <div className="flex justify-center gap-8">
                    <div className="p-6 bg-blue-100 rounded-full text-blue-600"><LayoutDashboard size={48} /></div>
                    <div className="flex items-center text-slate-300"><ChevronRight size={32} /></div>
                    <div className="p-6 bg-purple-100 rounded-full text-purple-600"><Server size={48} /></div>
                    <div className="flex items-center text-slate-300"><ChevronRight size={32} /></div>
                    <div className="p-6 bg-emerald-100 rounded-full text-emerald-600"><Database size={48} /></div>
                </div>
                <p className="text-slate-400 text-xl max-w-2xl mx-auto">
                    O ProBPA agora gerencia todo o ciclo de vida do dado, desde a **captura qualificada** na ponta até a **auditoria do lote XML** enviado ao Ministério.
                </p>
            </div>
        )
    },
    {
        title: "1. Configuração (Administrativo)",
        subtitle: "Conectando o Município ao PEC",
        content: <SlideConfig />
    },
    {
        title: "2. Captura (Produção)",
        subtitle: "Validando o dado na fonte (Standard XSD)",
        content: <SlideProduction />
    },
    {
        title: "3. Auditoria (Administrativo)",
        subtitle: "Rastreabilidade total dos lotes XML",
        content: <SlideBatches />
    },
    {
        title: "4. Monitoramento (Entidade)",
        subtitle: "Visão estratégica para Gestores",
        chartMode: true,
        content: <SlideEntity />
    }
];

const LediPresentation: React.FC = () => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const nextSlide = () => setCurrentSlide(p => Math.min(slides.length - 1, p + 1));
    const prevSlide = () => setCurrentSlide(p => Math.max(0, p - 1));

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0" />

            {/* Controls */}
            <div className="absolute top-8 right-8 z-50 flex gap-2">
                <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={prevSlide} disabled={currentSlide === 0}>
                    <ChevronLeft size={24} />
                </Button>
                <div className="bg-slate-800 px-4 py-2 rounded-full font-mono text-sm">
                    {currentSlide + 1} / {slides.length}
                </div>
                <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={nextSlide} disabled={currentSlide === slides.length - 1}>
                    <ChevronRight size={24} />
                </Button>
            </div>

            {/* Content Area */}
            <AnimatePresence mode='wait'>
                <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.5, ease: "circOut" }}
                    className="z-10 w-full max-w-6xl flex flex-col items-center gap-8"
                >
                    <div className="text-center space-y-2 mb-8">
                        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                            {slides[currentSlide].title}
                        </h1>
                        <p className="text-xl text-slate-400 font-light">
                            {slides[currentSlide].subtitle}
                        </p>
                    </div>

                    <div className="w-full flex justify-center perspective-1000">
                        {slides[currentSlide].content}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Footer */}
            <div className="absolute bottom-8 text-slate-700 font-mono text-xs z-10">
                GAX TECNOLOGIA • INTEGRALIDADE LEDI v1.5 • 2025
            </div>
        </div>
    );
};

export default LediPresentation;
