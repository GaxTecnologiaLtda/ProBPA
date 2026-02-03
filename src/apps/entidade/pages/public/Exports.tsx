import React, { useState } from 'react';
import { Badge, Button, Card } from '../../components/ui/Components';
import { MOCK_EXPORTS, MOCK_DOCUMENTS } from '../../constants';
import { 
  FileDown, Eye, AlertTriangle, Download, Search, 
  FileText, Paperclip, History, CheckCircle2, Shield
} from 'lucide-react';

type TabType = 'production' | 'documents';

const Exports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('production');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Simulação: Município Logado "São Paulo do Sul"
  const currentMunicipalityName = 'São Paulo do Sul';
  const currentMunicipalityId = 'm1';

  // Filter Helpers
  const filteredExports = MOCK_EXPORTS.filter(file => 
    file.municipalityName === currentMunicipalityName &&
    (file.type.toLowerCase().includes(searchTerm.toLowerCase()) || file.competence.includes(searchTerm))
  );

  const filteredDocuments = MOCK_DOCUMENTS.filter(doc =>
    (doc.municipalityId === currentMunicipalityId || !doc.municipalityId) &&
    (doc.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // --- Renders ---

  const renderProductionHistory = () => (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-6 flex items-start gap-3">
        <History className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-blue-900 dark:text-blue-100">Histórico de Remessas (BPA/SIA)</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Lista de todos os arquivos gerados pela área técnica na aba "Produção". Use esta lista para reemitir ou consultar o que foi processado.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-medium text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4">Arquivo</th>
                <th className="px-6 py-4">Competência</th>
                <th className="px-6 py-4">Detalhes Técnicos</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredExports.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${file.type === 'BPA-MAG' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                           <FileDown className="w-5 h-5" />
                        </div>
                        <div>
                           <span className="font-bold text-gray-900 dark:text-white block">{file.type}</span>
                           <span className="text-xs text-gray-500">Gerado em {new Date(file.generatedAt).toLocaleDateString()}</span>
                        </div>
                     </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-white">
                    {file.competence}
                  </td>
                  <td className="px-6 py-4">
                     <div className="space-y-1">
                        <div className="text-xs flex items-center gap-1">
                           <span className="font-medium">Linhas:</span> {file.lines.toLocaleString()}
                        </div>
                        {file.hash && (
                          <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded w-fit" title="Hash MD5 de validação">
                             <Shield className="w-3 h-3" /> {file.hash.substring(0, 8)}...
                          </div>
                        )}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    {file.status === 'processed' ? (
                      <Badge type="success" className="flex w-fit items-center gap-1">
                         <CheckCircle2 className="w-3 h-3" /> Validado
                      </Badge>
                    ) : (
                      <Badge type="error" className="flex w-fit items-center gap-1">
                         <AlertTriangle className="w-3 h-3" /> Erro
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Visualizar Detalhes">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        disabled={file.status !== 'processed'}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                        title="Baixar Arquivo"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredExports.length === 0 && (
             <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Nenhum arquivo de produção encontrado.
             </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderEntityDocuments = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card de Upload Rápido (Desabilitado para Público, ou permitido se for regra) */}
          <button className="group flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
             <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 group-hover:bg-white group-hover:shadow-md transition-all">
                <FileText className="w-8 h-8 text-gray-400 group-hover:text-blue-600" />
             </div>
             <span className="font-medium text-gray-900 dark:text-white">Solicitar Documento</span>
             <span className="text-sm text-gray-500 mt-1">Enviar para administração</span>
          </button>

          {filteredDocuments.map((doc) => (
             <Card key={doc.id} className="p-5 flex flex-col relative group hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-4">
                   <div className={`p-3 rounded-xl ${doc.type === 'Contrato' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                      <Paperclip className="w-6 h-6" />
                   </div>
                   <Badge type={doc.status === 'active' ? 'success' : 'neutral'}>
                      {doc.status === 'active' ? 'Vigente' : 'Expirado'}
                   </Badge>
                </div>
                
                <h3 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-1" title={doc.title}>{doc.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1">
                   {doc.type}
                </p>

                <div className="mt-auto space-y-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                   <div className="flex justify-between text-xs text-gray-500">
                      <span>Tamanho:</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{doc.size}</span>
                   </div>
                   <div className="flex justify-between text-xs text-gray-500">
                      <span>Validade:</span>
                      <span className={`font-medium ${doc.status === 'expired' ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                         {doc.validUntil ? new Date(doc.validUntil).toLocaleDateString() : 'Indeterminado'}
                      </span>
                   </div>
                   
                   <Button variant="outline" className="w-full mt-2 text-xs h-8">
                      <Download className="w-3 h-3 mr-2" /> Baixar Documento
                   </Button>
                </div>
             </Card>
          ))}
       </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Central de Arquivos</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
             Repositório de arquivos do município.
          </p>
        </div>
      </div>

      {/* Controls & Filters */}
      <Card className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
         <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-full lg:w-auto">
               <button 
                  onClick={() => setActiveTab('production')}
                  className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'production' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
               >
                  <FileDown className="w-4 h-4" /> Histórico de Remessas
               </button>
               <button 
                  onClick={() => setActiveTab('documents')}
                  className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'documents' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
               >
                  <FileText className="w-4 h-4" /> Documentos da Entidade
               </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
               <div className="relative flex-1 min-w-[250px]">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                     type="text" 
                     placeholder={activeTab === 'production' ? "Buscar remessa (Tipo, Data)..." : "Buscar documento..."}
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
               </div>
            </div>
         </div>
      </Card>

      {/* Content */}
      <div className="min-h-[400px]">
         {activeTab === 'production' ? renderProductionHistory() : renderEntityDocuments()}
      </div>
    </div>
  );
};

export default Exports;