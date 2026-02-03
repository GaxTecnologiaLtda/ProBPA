import React from 'react';
import { EntityType } from '../types';
import { Card, Table, Badge, Button } from '../components/ui/Components';
import { MOCK_EXPORTS } from '../constants';
import { FileDown, Eye, CheckCircle, AlertTriangle, Download } from 'lucide-react';

interface PageProps {
  type: EntityType;
}

// --- Production Page ---
export const ProductionPage: React.FC<PageProps> = ({ type }) => {
  const isPrivate = type === 'private';

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produção Ambulatorial</h1>
        <Button variant="outline">Exportar Relatório</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 border-l-4 border-blue-500">
          <div className="text-sm text-gray-500">Total de Procedimentos</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">45,230</div>
        </Card>
        <Card className="p-5 border-l-4 border-green-500">
          <div className="text-sm text-gray-500">Aprovados na Auditoria</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">44,890</div>
        </Card>
        <Card className="p-5 border-l-4 border-red-500">
          <div className="text-sm text-gray-500">Rejeitados</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">340</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white">Registros Recentes</h3>
        </div>
        <Table headers={['Data', 'Procedimento', 'Profissional', 'Qtd', 'Valor', 'Status']}>
           {[1,2,3,4,5].map(i => (
             <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
               <td className="px-6 py-4 text-sm">12/06/2024</td>
               <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">03.01.01.007-2 - Consulta Médica</td>
               <td className="px-6 py-4 text-sm">Dr. Carlos Silva</td>
               <td className="px-6 py-4 text-sm">1</td>
               <td className="px-6 py-4 text-sm">R$ 10,00</td>
               <td className="px-6 py-4">
                 <span className="flex items-center text-green-600 text-xs font-bold">
                   <CheckCircle className="w-3 h-3 mr-1" /> Aprovado
                 </span>
               </td>
             </tr>
           ))}
        </Table>
      </Card>
    </div>
  );
};

// --- Exports Page ---
export const ExportsPage: React.FC<PageProps> = ({ type }) => {
  const isPrivate = type === 'private';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Central de Exportações BPA</h1>
        <Button variant={isPrivate ? 'secondary' : 'primary'}>
          <FileDown className="w-4 h-4 mr-2 inline" />
          Gerar Nova Remessa
        </Button>
      </div>

      <div className="grid gap-4">
        {MOCK_EXPORTS.map((file) => (
          <div key={file.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between transition-all hover:shadow-md">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg ${file.type === 'BPA-C' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                <FileDown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{file.type} - {file.competence}</h3>
                <p className="text-sm text-gray-500">{file.municipalityName}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                   <span>{file.lines} linhas</span>
                   <span>Gerado em: {new Date(file.generatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4 md:mt-0">
              {file.status === 'processed' ? (
                <Badge type="success">Disponível</Badge>
              ) : (
                <Badge type="error"><AlertTriangle className="w-3 h-3 inline mr-1"/>Erro</Badge>
              )}
              
              <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Visualizar Detalhes">
                <Eye className="w-5 h-5" />
              </button>
              <button 
                disabled={file.status !== 'processed'}
                className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" 
                title="Baixar Arquivo"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};