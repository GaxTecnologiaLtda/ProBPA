import React, { useState } from 'react';
import { Tent, UserCog, User, Save, ListPlus, X, HeartPulse, ShieldAlert, Activity } from 'lucide-react';

const MOCK_SIGTAP = [
  { cod: '03.01.01.004-7', desc: 'Aferição de Pressão Arterial', icon: HeartPulse },
  { cod: '02.14.01.001-5', desc: 'Teste Rápido para Sífilis', icon: ShieldAlert },
  { cod: '02.14.01.002-3', desc: 'Teste Rápido para HIV', icon: ShieldAlert },
  { cod: '02.14.01.008-2', desc: 'Teste Rápido de Glicemia Capilar', icon: Activity },
];

const LancamentoProducao: React.FC = () => {
  const [feira, setFeira] = useState('1');
  const [profissional, setProfissional] = useState('1');
  
  // Dados do paciente atual
  const [pacienteNome, setPacienteNome] = useState('');
  const [pacienteSus, setPacienteSus] = useState('');
  
  // Procedimentos
  const [procedimentos, setProcedimentos] = useState<typeof MOCK_SIGTAP>([]);
  const [buscaSigtap, setBuscaSigtap] = useState('');

  const procedimentosFiltrados = MOCK_SIGTAP.filter(
    p => p.desc.toLowerCase().includes(buscaSigtap.toLowerCase()) || p.cod.includes(buscaSigtap)
  );

  const addProcedimento = (proc: typeof MOCK_SIGTAP[0]) => {
    if (!procedimentos.find(p => p.cod === proc.cod)) {
      setProcedimentos([...procedimentos, proc]);
    }
    setBuscaSigtap(''); // limpa a busca rápida
  };

  const removeProcedimento = (cod: string) => {
    setProcedimentos(procedimentos.filter(p => p.cod !== cod));
  };

  const handleSalvarProximo = () => {
    if (!pacienteNome || procedimentos.length === 0) {
      alert('Preencha os dados do paciente e adicione pelo menos um procedimento.');
      return;
    }
    
    // Simula salvar
    alert(`Produção salva com sucesso!\nPaciente: ${pacienteNome}\nProcedimentos: ${procedimentos.length}`);
    
    // Limpa apenas o paciente, mantém o cabeçalho travado para o digitador
    setPacienteNome('');
    setPacienteSus('');
    setProcedimentos([]);
    setBuscaSigtap('');
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      
      {/* Cabeçalho Fixo (Feira e Profissional) */}
      <div className="bg-orange-50 dark:bg-orange-900/10 rounded-3xl p-6 border border-orange-200 dark:border-orange-900/30 flex flex-col md:flex-row gap-6 shadow-sm">
        <div className="flex-1">
          <label className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase flex items-center gap-1 mb-2">
            <Tent className="w-4 h-4" /> Feira / Evento Atual
          </label>
          <select 
            value={feira} 
            onChange={(e) => setFeira(e.target.value)}
            className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border border-orange-200 dark:border-orange-900/50 focus:ring-2 focus:ring-orange-500 font-bold outline-none text-gray-900 dark:text-white"
          >
            <option value="1">Mutirão de Check-up (Centro Comunitário)</option>
            <option value="2">Feira da Saúde da Mulher (Praça da Matriz)</option>
          </select>
        </div>
        
        <div className="flex-1">
          <label className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase flex items-center gap-1 mb-2">
            <UserCog className="w-4 h-4" /> Profissional da Folha
          </label>
          <select 
            value={profissional} 
            onChange={(e) => setProfissional(e.target.value)}
            className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border border-orange-200 dark:border-orange-900/50 focus:ring-2 focus:ring-orange-500 font-bold outline-none text-gray-900 dark:text-white"
          >
            <option value="1">Enf. Juliana Castro (COREN: 12345)</option>
            <option value="2">Dr. Carlos Souza (CRM: 54321)</option>
            <option value="3">Tec. Roberto (COREN: 98765)</option>
          </select>
        </div>
      </div>

      {/* Formulário Ágil do Paciente */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col lg:flex-row">
        
        {/* Lado Esquerdo: Paciente e Busca de Procedimentos */}
        <div className="w-full lg:w-1/2 p-6 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700">
          <div className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <User className="w-5 h-5 text-gray-400" />
            Dados do Paciente
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
              <input 
                type="text" 
                value={pacienteNome}
                onChange={(e) => setPacienteNome(e.target.value)}
                placeholder="Ex: Maria José da Silva" 
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500 dark:text-white" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Cartão SUS (Opcional na digitação rápida)</label>
              <input 
                type="text" 
                value={pacienteSus}
                onChange={(e) => setPacienteSus(e.target.value)}
                placeholder="700.0000.0000.0000" 
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500 dark:text-white font-mono" 
              />
            </div>
          </div>

          <div className="mt-8 mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <ListPlus className="w-5 h-5 text-gray-400" />
            Lançar Procedimentos (SIGTAP)
          </div>

          <div className="relative">
            <input 
              type="text" 
              value={buscaSigtap}
              onChange={(e) => setBuscaSigtap(e.target.value)}
              placeholder="Digite o código SIGTAP ou nome do procedimento..." 
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-orange-200 dark:border-orange-700 outline-none focus:ring-2 focus:ring-orange-500 dark:text-white font-bold" 
            />
            {/* Dropdown de sugestões (só aparece se estiver buscando) */}
            {buscaSigtap && (
              <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden">
                {procedimentosFiltrados.length > 0 ? (
                  procedimentosFiltrados.map((proc, idx) => {
                    const Icon = proc.icon;
                    return (
                      <button 
                        key={idx}
                        onClick={() => addProcedimento(proc)}
                        className="w-full text-left p-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-start gap-3 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors"
                      >
                        <Icon className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">{proc.desc}</p>
                          <p className="font-mono text-xs text-gray-500">{proc.cod}</p>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="p-3 text-sm text-gray-500 text-center">Nenhum procedimento encontrado.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Resumo e Salvar */}
        <div className="w-full lg:w-1/2 bg-gray-50 dark:bg-gray-900/50 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Procedimentos Adicionados</h3>
            
            <div className="space-y-3">
              {procedimentos.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400 text-sm">
                  Nenhum procedimento adicionado ainda. Busque e clique ao lado para adicionar.
                </div>
              ) : (
                procedimentos.map((proc, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between group">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{proc.desc}</p>
                      <p className="font-mono text-xs text-gray-500">{proc.cod}</p>
                    </div>
                    <button 
                      onClick={() => removeProcedimento(proc.cod)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <button 
            onClick={handleSalvarProximo}
            className="mt-8 w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20 text-lg"
          >
            <Save className="w-6 h-6" />
            Salvar e Próximo
          </button>
        </div>

      </div>

    </div>
  );
};

export default LancamentoProducao;
