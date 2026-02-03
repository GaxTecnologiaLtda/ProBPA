import React, { useState } from 'react';
import { Card, Table, Button, Badge, Modal } from '../../components/ui/Components';
import { 
  CheckCircle, FileText, Users, Filter, ArrowUpRight, 
  Download, BarChart2, PieChart, AlertTriangle, FileCode, Database,
  Calendar, ChevronRight, TrendingUp, Activity, Eye, Target, Building2, DollarSign,
  ClipboardCheck, Share2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, LineChart, Line, PieChart as RechartsPieChart, Cell, AreaChart, Area,
  ComposedChart, Pie
} from 'recharts';

// --- Mock Data Adaptado para Município ---

const EVOLUTION_DATA = [
  { month: 'Jan', real: 4200, meta: 4000, valor: 42000 },
  { month: 'Fev', real: 4500, meta: 4000, valor: 45000 },
  { month: 'Mar', real: 3800, meta: 4200, valor: 38000 },
  { month: 'Abr', real: 4900, meta: 4500, valor: 49000 },
  { month: 'Mai', real: 5200, meta: 4500, valor: 52000 },
  { month: 'Jun', real: 5100, meta: 4800, valor: 51000 },
  { month: 'Jul', real: 5500, meta: 4800, valor: 55000 },
];

const TOP_PROCEDURES = [
  { name: 'Consulta em Atenção Básica', qtd: 1500, val: 15000 },
  { name: 'Aferição de Pressão Arterial', qtd: 1200, val: 0 },
  { name: 'Glicemia Capilar', qtd: 900, val: 1800 },
  { name: 'Visita Domiciliar', qtd: 450, val: 0 },
  { name: 'Curativo Grau II', qtd: 300, val: 1500 },
];

const DEMOGRAPHICS_AGE = [
  { name: '0-12 anos', value: 18 },
  { name: '13-19 anos', value: 12 },
  { name: '20-59 anos', value: 40 },
  { name: '60+ anos', value: 30 },
];

const PROFESSIONAL_RANKING = [
  { id: 1, name: 'Dr. Carlos Silva', role: 'Médico Clínico', unit: 'UBS Central', qtd: 450, meta: 98, val: 4500 },
  { id: 2, name: 'Enf. Maria Souza', role: 'Enfermeira', unit: 'UBS Central', qtd: 320, meta: 110, val: 0 },
  { id: 3, name: 'Dr. Pedro Álvares', role: 'Cirurgião', unit: 'Hosp. Municipal', qtd: 120, meta: 85, val: 12000 },
  { id: 4, name: 'Tec. Ana Lima', role: 'Técnico Enf.', unit: 'PSF Vila Nova', qtd: 290, meta: 100, val: 0 },
];

const UNIT_PERFORMANCE = [
  { name: 'UBS Central', producao: 5400, faturamento: 15000 },
  { name: 'Hosp. Municipal', producao: 3200, faturamento: 85000 },
  { name: 'PSF Vila Nova', producao: 1600, faturamento: 5000 },
];

const COLORS_BLUE = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

type TabType = 'dashboard' | 'reports' | 'technical';

interface ReportType {
  id: string;
  title: string;
  desc: string;
  icon: any;
  color: string;
}

const Production: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedCompetence, setSelectedCompetence] = useState('07/2024');
  
  // Estado para Relatórios
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Estado de simulação de geração de arquivo
  const [generatingFile, setGeneratingFile] = useState<string | null>(null);

  const handleGenerate = (fileType: string) => {
    setGeneratingFile(fileType);
    setTimeout(() => {
      setGeneratingFile(null);
      alert(`Arquivo ${fileType} gerado com sucesso para a competência ${selectedCompetence}!`);
    }, 2000);
  };

  const handleOpenReport = (report: ReportType) => {
    setSelectedReport(report);
    setIsReportModalOpen(true);
  };

  // --- Renders de Conteúdo dos Modais ---

  const renderReportDetail = () => {
    if (!selectedReport) return null;

    switch (selectedReport.id) {
      case 'metas': // Cumprimento de Metas
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Meta Municipal</p>
                  <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">92%</h3>
                  <p className="text-xs text-blue-600 mt-1">Atingimento médio</p>
               </Card>
               <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Unidades na Meta</p>
                  <h3 className="text-2xl font-bold text-green-700 dark:text-green-300">3/4</h3>
                  <p className="text-xs text-green-600 mt-1">Acima de 90%</p>
               </Card>
            </div>
            {/* Gráfico de barras simples */}
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={UNIT_PERFORMANCE}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="producao" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Produção (Qtd)" />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        );
      
      case 'profissional': 
        return (
          <div className="space-y-6">
            <Table headers={['Ranking', 'Profissional', 'Lotação', 'Procedimentos', 'Meta', 'Faturamento']}>
              {PROFESSIONAL_RANKING.map((prof, index) => (
                <tr key={prof.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                   <td className="px-6 py-4 font-bold text-gray-500">#{index + 1}</td>
                   <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{prof.name}</div>
                      <div className="text-xs text-gray-500">{prof.role}</div>
                   </td>
                   <td className="px-6 py-4 text-sm">{prof.unit}</td>
                   <td className="px-6 py-4 font-mono">{prof.qtd}</td>
                   <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${prof.meta >= 100 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {prof.meta}%
                      </span>
                   </td>
                   <td className="px-6 py-4 font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prof.val)}
                   </td>
                </tr>
              ))}
            </Table>
          </div>
        );

      default:
        return <div className="text-center py-10 text-gray-500">Visualização em desenvolvimento para este relatório.</div>;
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-5 border-l-4 border-blue-500">
          <div className="text-sm text-gray-500 font-medium">Produção Total (Qtd)</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">14,250</div>
          <div className="flex items-center mt-2 text-sm text-blue-600 font-medium">
            <ArrowUpRight className="w-4 h-4 mr-1" /> +3.2% vs anterior
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-emerald-500">
          <div className="text-sm text-gray-500 font-medium">Faturamento SIA (R$)</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">R$ 105.000,00</div>
          <div className="flex items-center mt-2 text-sm text-emerald-600 font-medium">
            <Activity className="w-4 h-4 mr-1" /> Consolidado
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-amber-500">
          <div className="text-sm text-gray-500 font-medium">Metas Alcançadas</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">92.5%</div>
          <div className="text-xs text-gray-500 mt-2">Média das unidades</div>
        </Card>
        <Card className="p-5 border-l-4 border-purple-500">
          <div className="text-sm text-gray-500 font-medium">Pacientes Atendidos</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">3,850</div>
          <div className="flex items-center mt-2 text-sm text-purple-600 font-medium">
            <Users className="w-4 h-4 mr-1" /> Únicos
          </div>
        </Card>
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolução Temporal */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Evolução da Produção Municipal
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={EVOLUTION_DATA}>
                <defs>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Area type="monotone" dataKey="real" name="Produção Realizada" stroke="#3b82f6" fillOpacity={1} fill="url(#colorReal)" strokeWidth={3} />
                <Area type="monotone" dataKey="meta" name="Meta Estipulada" stroke="#9ca3af" fillOpacity={0} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Procedimentos */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top 5 Procedimentos</h3>
          <div className="space-y-5">
            {TOP_PROCEDURES.map((proc, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300 truncate max-w-[180px]" title={proc.name}>{proc.name}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{proc.qtd}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(proc.qtd / 1500) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col h-56">
             <p className="text-sm font-semibold mb-2 text-center text-gray-600 dark:text-gray-400">Pacientes por Idade</p>
             <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={DEMOGRAPHICS_AGE}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {DEMOGRAPHICS_AGE.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_BLUE[index % COLORS_BLUE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
             </div>
          </div>
        </Card>
      </div>

      {/* Ranking de Profissionais */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance por Profissional</h3>
          <Button variant="outline" className="text-xs" onClick={() => setActiveTab('reports')}>Ver Detalhes</Button>
        </div>
        <Table headers={['Profissional', 'Cargo/Unidade', 'Produção (Qtd)', 'Meta Atingida', 'Valor Produzido', 'Status']}>
          {PROFESSIONAL_RANKING.map((prof) => (
            <tr key={prof.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{prof.name}</td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {prof.role}<br/>
                <span className="text-xs opacity-75">{prof.unit}</span>
              </td>
              <td className="px-6 py-4 font-mono">{prof.qtd}</td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mr-2">
                    <div className={`h-1.5 rounded-full ${prof.meta >= 100 ? 'bg-green-500' : prof.meta >= 80 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${Math.min(prof.meta, 100)}%` }}></div>
                  </div>
                  <span className="text-xs font-bold">{prof.meta}%</span>
                </div>
              </td>
              <td className="px-6 py-4 font-mono text-sm">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prof.val)}
              </td>
              <td className="px-6 py-4">
                {prof.meta >= 90 ? (
                  <Badge type="success">Excelente</Badge>
                ) : prof.meta >= 70 ? (
                   <Badge type="neutral">Na Média</Badge>
                ) : (
                  <Badge type="warning">Abaixo</Badge>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );

  const renderReports = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {[
        { id: 'metas', title: 'Cumprimento de Metas', desc: 'Acompanhamento do pactuado vs realizado nas unidades.', icon: Target, color: 'text-blue-600' },
        { id: 'profissional', title: 'Produção por Profissional', desc: 'Ranking de produtividade individual.', icon: Users, color: 'text-purple-600' },
        { id: 'unidades', title: 'Performance da Rede', desc: 'Comparativo de produção entre UBS, Hospital e outros.', icon: Building2, color: 'text-emerald-600' },
        { id: 'procedimentos', title: 'Curva ABC Procedimentos', desc: 'Quais procedimentos geram mais demanda ou custo.', icon: BarChart2, color: 'text-amber-600' },
        { id: 'financeiro', title: 'Evolução do Faturamento', desc: 'Valores aprovados para exportação SIA/SUS.', icon: DollarSign, color: 'text-green-600' },
      ].map((rep, idx) => {
          const Icon = rep.icon; 
          return (
            <Card key={idx} className="p-6 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700">
              <div>
                <div className={`p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 w-fit mb-4 ${rep.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{rep.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{rep.desc}</p>
              </div>
              <div className="flex gap-2 mt-auto">
                 <Button 
                    variant="outline" 
                    className="flex-1 text-xs"
                    onClick={() => handleOpenReport(rep)}
                 >
                   <Eye className="w-3 h-3 mr-2" /> Visualizar
                 </Button>
                 <Button variant="primary" className="flex-1 text-xs">
                   <Download className="w-3 h-3 mr-2" /> PDF
                 </Button>
              </div>
            </Card>
          )
      })}
    </div>
  );

  const renderTechnical = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Cabeçalho de Validação */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-900 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
           <Database className="w-48 h-48" />
        </div>
        <div className="relative z-10 max-w-2xl">
           <h2 className="text-2xl font-bold mb-2">Central de Arquivos BPA/SIA</h2>
           <p className="text-blue-100 mb-6">
             Gere os arquivos oficiais para importação no SIA/SUS. O sistema consolida automaticamente a produção de todas as unidades municipais.
           </p>
           <div className="flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                 <span className="block text-xs text-blue-200 uppercase">Competência</span>
                 <span className="font-bold text-lg">{selectedCompetence}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                 <span className="block text-xs text-blue-200 uppercase">Validação</span>
                 <span className="font-bold text-lg text-emerald-400 flex items-center">
                   <CheckCircle className="w-4 h-4 mr-1" /> Dados Integros
                 </span>
              </div>
           </div>
        </div>
      </div>

      {/* Fluxo de Geração */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Coluna 1: Relatórios Pré-Envio */}
         <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
               <FileText className="w-5 h-5 mr-2 text-blue-600" /> Relatórios de Conferência
            </h3>
            
            <Card className="p-5 flex items-center justify-between border-l-4 border-blue-500">
               <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">BPA-I (Individualizado)</h4>
                  <p className="text-sm text-gray-500 mt-1">Espelho analítico por paciente.</p>
                  <Badge type="neutral" className="mt-2">4,250 Registros</Badge>
               </div>
               <Button onClick={() => handleGenerate('BPA-I')} disabled={!!generatingFile} variant="outline">
                  {generatingFile === 'BPA-I' ? 'Gerando...' : <Download className="w-4 h-4" />}
               </Button>
            </Card>

            <Card className="p-5 flex items-center justify-between border-l-4 border-indigo-500">
               <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">BPA-C (Consolidado)</h4>
                  <p className="text-sm text-gray-500 mt-1">Espelho sintético por procedimento.</p>
                  <Badge type="neutral" className="mt-2">10,000 Registros</Badge>
               </div>
               <Button onClick={() => handleGenerate('BPA-C')} disabled={!!generatingFile} variant="outline">
                  {generatingFile === 'BPA-C' ? 'Gerando...' : <Download className="w-4 h-4" />}
               </Button>
            </Card>

            <Card className="p-5 flex items-center justify-between border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10">
               <div>
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center">
                     <ClipboardCheck className="w-4 h-4 mr-2 text-emerald-600" /> Validação de Críticas
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">Verificação de regras do SIGTAP.</p>
                  <Badge type="success" className="mt-2">Sem Erros</Badge>
               </div>
               <Button variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                  Verificar
               </Button>
            </Card>
         </div>

         {/* Coluna 2: Arquivo Final */}
         <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
               <FileCode className="w-5 h-5 mr-2 text-blue-600" /> Arquivo de Transmissão
            </h3>

            <Card className="p-6 bg-gray-50 dark:bg-gray-800 border-dashed border-2 border-gray-300 dark:border-gray-700 text-center">
               <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
               <h4 className="text-xl font-bold text-gray-900 dark:text-white">Arquivo BPA-MAG (.TXT)</h4>
               <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6 max-w-md mx-auto">
                  Arquivo final formatado para importação direta no SIA/SUS. Contém a produção de todas as unidades.
               </p>
               
               <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-left mb-6 max-w-sm mx-auto">
                  <div className="flex justify-between text-sm mb-2">
                     <span className="text-gray-500">Competência:</span>
                     <span className="font-mono font-bold">{selectedCompetence}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                     <span className="text-gray-500">Total Linhas:</span>
                     <span className="font-mono font-bold">14,250</span>
                  </div>
               </div>

               <Button 
                  onClick={() => handleGenerate('BPA-MAG')} 
                  disabled={!!generatingFile} 
                  variant="primary" 
                  className="w-full max-w-sm mx-auto py-3 text-lg shadow-lg shadow-blue-500/20"
               >
                  {generatingFile === 'BPA-MAG' ? (
                     <span className="flex items-center"><Activity className="animate-spin mr-2" /> Processando...</span>
                  ) : (
                     <span className="flex items-center"><Download className="mr-2" /> Baixar BPA-MAG</span>
                  )}
               </Button>
               <p className="text-xs text-gray-400 mt-4">
                  Ao baixar, o arquivo será automaticamente registrado na Central de Arquivos.
               </p>
            </Card>
         </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produção Municipal</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestão da produção, auditoria e geração do BPA.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
           {/* Seletor de Competência */}
           <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <select 
                 value={selectedCompetence}
                 onChange={(e) => setSelectedCompetence(e.target.value)}
                 className="pl-10 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-gray-50"
              >
                 <option>09/2024</option>
                 <option>08/2024</option>
                 <option>07/2024</option>
                 <option>06/2024</option>
              </select>
              <ChevronRight className="absolute right-3 top-3 w-3 h-3 text-gray-500 transform rotate-90" />
           </div>
           
           <Button variant="outline" className="flex items-center gap-2">
             <Filter className="w-4 h-4" /> Filtros
           </Button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="border-b border-gray-200 dark:border-gray-700">
         <nav className="flex space-x-8 overflow-x-auto">
            {[
               { id: 'dashboard', label: 'Dashboard & Monitoramento', icon: BarChart2 },
               { id: 'reports', label: 'Relatórios Gerenciais', icon: FileText },
               { id: 'technical', label: 'Arquivos Técnicos (BPA/SIA)', icon: Database },
            ].map(tab => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`
                     py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                     ${activeTab === tab.id 
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                  `}
               >
                  <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`} />
                  {tab.label}
               </button>
            ))}
         </nav>
      </div>

      {/* Conteúdo das Abas */}
      <div className="min-h-[500px]">
         {activeTab === 'dashboard' && renderDashboard()}
         {activeTab === 'reports' && renderReports()}
         {activeTab === 'technical' && renderTechnical()}
      </div>

      {/* Modal de Visualização de Relatório */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={selectedReport?.title || 'Detalhes do Relatório'}
      >
        <div className="mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
           <p className="text-gray-500 dark:text-gray-400">{selectedReport?.desc}</p>
           <div className="mt-2 flex items-center gap-2">
              <Badge type="neutral">Competência: {selectedCompetence}</Badge>
           </div>
        </div>
        
        {renderReportDetail()}

        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
           <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>Fechar</Button>
           <Button variant="primary" className="flex items-center">
              <Download className="w-4 h-4 mr-2" /> Baixar em Excel
           </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Production;