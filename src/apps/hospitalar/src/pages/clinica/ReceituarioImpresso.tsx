import React from 'react';

interface ReceituarioImpressoProps {
  pacienteNome: string;
  idade: number | string;
  data: string;
  prescricao: string;
  medicoNome: string;
  crm: string;
}

const ReceituarioImpresso: React.FC<ReceituarioImpressoProps> = ({ 
  pacienteNome, 
  idade, 
  data, 
  prescricao, 
  medicoNome,
  crm 
}) => {
  return (
    <div className="hidden print:block bg-white text-black p-8 max-w-4xl mx-auto w-full h-full min-h-screen">
      
      {/* Cabeçalho do Hospital/Clínica */}
      <div className="border-b-2 border-black pb-6 mb-8 text-center">
        <h1 className="text-3xl font-black uppercase tracking-widest">ProBPA Hospitalar</h1>
        <p className="text-sm mt-2 font-medium">Rua da Saúde, 123 - Centro, São Paulo/SP</p>
        <p className="text-sm">Telefone: (11) 4002-8922 | CNPJ: 00.000.000/0001-00</p>
      </div>

      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold uppercase tracking-widest border-2 border-black inline-block px-8 py-2 rounded-lg">Receituário Médico</h2>
      </div>

      {/* Identificação do Paciente */}
      <div className="mb-12">
        <p className="text-lg"><strong>Para:</strong> {pacienteNome}</p>
        <div className="flex justify-between mt-2">
          <p><strong>Idade:</strong> {idade} anos</p>
          <p><strong>Data:</strong> {data}</p>
        </div>
      </div>

      {/* Prescrição / Uso */}
      <div className="min-h-[400px]">
        <h3 className="font-bold text-lg mb-6 border-b border-gray-300 pb-2">Uso Interno / Externo:</h3>
        
        <pre className="whitespace-pre-wrap font-sans text-base leading-loose ml-4">
          {prescricao || 'Nenhuma medicação prescrita.'}
        </pre>
      </div>

      {/* Assinatura e Carimbo */}
      <div className="mt-24 pt-8 flex flex-col items-center">
        <div className="border-t border-black w-64 mb-2"></div>
        <p className="font-bold text-lg">{medicoNome}</p>
        <p className="text-sm">CRM: {crm}</p>
        <p className="text-xs mt-4 text-gray-500 italic">Carimbo e Assinatura</p>
      </div>

      <style>{`
        @media print {
          @page {
            margin: 20mm;
            size: A4 portrait;
          }
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceituarioImpresso;
