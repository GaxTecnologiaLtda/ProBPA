import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bed, User, Activity, AlertCircle, Droplets, ArrowRight } from 'lucide-react';

const MOCK_LEITOS = [
  {
    ala: 'Quarto 101',
    leitos: [
      { id: '101-A', status: 'ocupado', paciente: 'João da Silva', risco: 'Laranja', info: 'Soro correndo (termina 15h)' },
      { id: '101-B', status: 'ocupado', paciente: 'Antônio Ferreira', risco: 'Amarelo', info: 'Jejum para exames' },
      { id: '101-C', status: 'livre' }
    ]
  },
  {
    ala: 'Quarto 102',
    leitos: [
      { id: '102-A', status: 'ocupado', paciente: 'Maria Souza', risco: 'Verde', info: 'Alta prevista para hoje' },
      { id: '102-B', status: 'limpeza', info: 'Aguardando higienização' }
    ]
  },
  {
    ala: 'Observação (Curta Duração)',
    leitos: [
      { id: 'OBS-1', status: 'ocupado', paciente: 'Sofia Lima', risco: 'Vermelho', info: 'Pico febril 39°C' },
      { id: 'OBS-2', status: 'livre' },
      { id: 'OBS-3', status: 'livre' },
    ]
  }
];

const GestaoLeitos: React.FC = () => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ocupado': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      case 'livre': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'limpeza': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getRiscoDot = (risco?: string) => {
    switch(risco) {
      case 'Vermelho': return 'bg-red-500';
      case 'Laranja': return 'bg-orange-500';
      case 'Amarelo': return 'bg-yellow-400';
      case 'Verde': return 'bg-green-500';
      case 'Azul': return 'bg-blue-500';
      default: return 'bg-transparent';
    }
  };

  const handleLeitoClick = (leito: any) => {
    if (leito.status === 'ocupado') {
      navigate(`/enfermaria/paciente/${leito.id}`);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mapa de Leitos</h1>
          <p className="text-gray-500 mt-1">Visão estrutural dos leitos, ocupações e status de higienização.</p>
        </div>
        
        {/* Legenda */}
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-200 border border-purple-400"></div>
            <span className="text-gray-600 dark:text-gray-400">Ocupado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-200 border border-green-400"></div>
            <span className="text-gray-600 dark:text-gray-400">Livre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-200 border border-orange-400"></div>
            <span className="text-gray-600 dark:text-gray-400">Limpeza</span>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {MOCK_LEITOS.map((quarto, qIdx) => (
          <div key={qIdx} className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-700 pb-2">
              {quarto.ala}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quarto.leitos.map((leito, lIdx) => (
                <div 
                  key={lIdx}
                  onClick={() => handleLeitoClick(leito)}
                  className={`relative p-5 rounded-2xl border-2 transition-all ${getStatusColor(leito.status)} ${leito.status === 'ocupado' ? 'cursor-pointer hover:shadow-md hover:border-purple-400 group' : 'opacity-80'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bed className={`w-5 h-5 ${leito.status === 'ocupado' ? 'text-purple-600' : leito.status === 'livre' ? 'text-green-600' : 'text-orange-600'}`} />
                      <span className="font-black text-lg text-gray-900 dark:text-white">{leito.id}</span>
                    </div>
                    {leito.risco && (
                      <div className={`w-3 h-3 rounded-full ${getRiscoDot(leito.risco)} shadow-sm`} title={`Risco: ${leito.risco}`}></div>
                    )}
                  </div>

                  {leito.status === 'ocupado' && (
                    <>
                      <div className="mb-4">
                        <p className="text-xs font-bold text-gray-500 uppercase">Paciente</p>
                        <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <User className="w-4 h-4 text-purple-400" />
                          {leito.paciente}
                        </p>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-900/50 p-3 rounded-xl border border-purple-100 dark:border-purple-800/50 text-sm flex items-start gap-2">
                        {leito.info?.includes('Soro') ? <Droplets className="w-4 h-4 text-blue-500 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />}
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{leito.info}</span>
                      </div>

                      {/* Hover Action */}
                      <div className="absolute inset-0 bg-purple-600/90 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 font-bold backdrop-blur-sm">
                        Abrir Prontuário <ArrowRight className="w-5 h-5" />
                      </div>
                    </>
                  )}

                  {leito.status === 'livre' && (
                    <div className="h-20 flex items-center justify-center text-green-600 dark:text-green-400 font-bold uppercase tracking-widest text-sm opacity-50">
                      Disponível
                    </div>
                  )}

                  {leito.status === 'limpeza' && (
                    <div className="h-20 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold uppercase tracking-widest text-sm opacity-50">
                      {leito.info}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default GestaoLeitos;
