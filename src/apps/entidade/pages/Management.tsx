import React from 'react';
import { EntityType } from '../types';
import { Card, Table, Badge, Button } from '../components/ui/Components';
import { MOCK_UNITS, MOCK_PROFESSIONALS } from '../constants';
import { Plus, Search, Filter, MoreHorizontal } from 'lucide-react';

interface PageProps {
  type: EntityType;
}

// --- Units Page ---
export const UnitsPage: React.FC<PageProps> = ({ type }) => {
  const isPrivate = type === 'private';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Unidades de Saúde</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isPrivate ? 'Gerencie as unidades de todos os municípios vinculados.' : 'Gerencie as unidades do seu município.'}
          </p>
        </div>
        <Button variant={isPrivate ? 'secondary' : 'primary'} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova Unidade
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por CNES ou Nome..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {isPrivate && (
             <select className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
               <option>Todos os Municípios</option>
               <option>São Paulo do Sul</option>
               <option>Rio Verde do Norte</option>
             </select>
          )}
          <button className="flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </button>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden">
        <Table headers={['CNES', 'Nome da Unidade', ...(isPrivate ? ['Município'] : []), 'Status', 'Ações']}>
          {MOCK_UNITS.map((unit) => (
            <tr key={unit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{unit.cnes}</td>
              <td className="px-6 py-4">{unit.name}</td>
              {isPrivate && (
                <td className="px-6 py-4 text-gray-500">
                  {unit.municipalityId === 'm1' ? 'São Paulo do Sul' : unit.municipalityId === 'm2' ? 'Rio Verde' : 'Belo Campo'}
                </td>
              )}
              <td className="px-6 py-4">
                <Badge type={unit.active ? 'success' : 'error'}>
                  {unit.active ? 'Ativa' : 'Inativa'}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                  <MoreHorizontal className="w-5 h-5 text-gray-500" />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
};

// --- Professionals Page ---
export const ProfessionalsPage: React.FC<PageProps> = ({ type }) => {
  const isPrivate = type === 'private';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profissionais</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Cadastro e monitoramento de CBOs e CNS.
          </p>
        </div>
        <Button variant={isPrivate ? 'secondary' : 'primary'} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Profissional
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar profissional..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <Table headers={['CNS', 'Nome', 'Ocupação (CBO)', ...(isPrivate ? ['Município'] : []), 'Status', 'Ações']}>
          {MOCK_PROFESSIONALS.map((prof) => (
            <tr key={prof.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="px-6 py-4 font-mono text-xs text-gray-500">{prof.cns}</td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3">
                    {prof.name.charAt(0)}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{prof.name}</span>
                </div>
              </td>
              <td className="px-6 py-4">{prof.occupation}</td>
              {isPrivate && (
                 <td className="px-6 py-4 text-gray-500">
                  {prof.municipalityId === 'm1' ? 'São Paulo do Sul' : 'Outro'}
                 </td>
              )}
              <td className="px-6 py-4">
                <Badge type={prof.active ? 'success' : 'neutral'}>
                  {prof.active ? 'Ativo' : 'Licença'}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Editar</button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
};