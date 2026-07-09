import React, { useState } from 'react';
import { Tent, Plus, Search, MapPin, Calendar, Users, CheckCircle2 } from 'lucide-react';

const GestaoFeiras: React.FC = () => {
  const [showNovo, setShowNovo] = useState(false);

  const feiras = [
    { id: 1, nome: 'Feira da Saúde da Mulher', local: 'Praça da Matriz', data: '15/10/2026', profs: 4, status: 'Concluída' },
    { id: 2, nome: 'Mutirão de Check-up', local: 'Centro Comunitário', data: '22/05/2026', profs: 12, status: 'Em Andamento' }
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Feiras</h1>
          <p className="text-gray-500 mt-1">Cadastre novos eventos e aloque os profissionais responsáveis.</p>
        </div>
        <button 
          onClick={() => setShowNovo(!showNovo)}
          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/30"
        >
          <Plus className="w-5 h-5" />
          Nova Feira
        </button>
      </div>

      {showNovo && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Cadastrar Novo Evento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nome do Evento</label>
              <input type="text" placeholder="Ex: Feira de Vacinação" className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Local</label>
              <input type="text" placeholder="Ex: Praça Central" className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500 dark:text-white" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowNovo(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-bold">Cancelar</button>
            <button className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-bold hover:bg-gray-800 transition-colors">Salvar Evento</button>
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex items-center shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar evento..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white outline-none"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {feiras.map((feira) => (
          <div key={feira.id} className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl">
                    <Tent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{feira.nome}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <MapPin className="w-4 h-4" /> {feira.local}
                    </div>
                  </div>
                </div>
                {feira.status === 'Em Andamento' ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Ativa
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase rounded-full">
                    Concluída
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> Data</p>
                  <p className="font-bold text-gray-900 dark:text-white mt-1">{feira.data}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Users className="w-3.5 h-3.5"/> Profissionais</p>
                  <p className="font-bold text-gray-900 dark:text-white mt-1">{feira.profs} Alocados</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
              <button className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors">
                Ver Equipe
              </button>
              <button className="flex-1 py-2.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4"/> Add Profissional
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GestaoFeiras;
