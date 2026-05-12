import React, { useState } from 'react';
import { Card, Button } from '../../components/ui/BaseComponents';
import { ProcedureCard } from '../../components/ProcedureCard';
import { FileText, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { SigtapTreeSelector } from '../../components/SigtapTreeSelector';
import { getCompatibleCids, getAttendanceCharacterForProcedure, getServicesForProcedure } from '../../services/sigtapLookupService';

interface ProcedureSectionProps {
    procedures: any[];
    competence: string;
    onUpdate: (index: number, data: any) => void;
    onRemove: (index: number) => void;
    onOpenSigtap: (index: number) => void;
    onToggleExpand: (index: number) => void;
    onAdd: (proc?: any) => void;
    userCbo: string;
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    colorClass?: string;
}

const defaultProcedure = {
    procedureCode: '',
    procedureName: '',
    cidCodes: [],
    attendanceCharacter: '01-AGENDADA',
    attendanceType: '',
    authNumber: '',
    serviceCode: '',
    classCode: '',
    quantity: 1,
    obs: '',
    isExpanded: true
};

export const ProcedureSection: React.FC<ProcedureSectionProps> = ({
    procedures,
    competence,
    onUpdate,
    onRemove,
    onOpenSigtap,
    onToggleExpand,
    onAdd,
    userCbo,
    title = "Procedimentos Realizados",
    // description = "Adicione procedimentos realizados neste atendimento.",
    icon = <ShoppingCart size={20} className="text-green-500" />,
    colorClass = "border-l-green-500"
}) => {
    const [pendingProcedure, setPendingProcedure] = useState<any>(defaultProcedure);
    const [isSigtapModalOpen, setIsSigtapModalOpen] = useState(false);

    const handleSigtapSelect = async (proc: any) => {
        // CBO Validation will happen inside ProcedureCard when procedureCode changes.
        // ProcedureCard loads details based on procedureCode automatically.
        setPendingProcedure((prev: any) => ({
            ...prev,
            procedureCode: proc.code,
            procedureName: proc.name,
            cidCodes: [],
            serviceCode: '',
            classCode: proc.classCode,
            groupCode: proc.groupCode,
            subGroupCode: proc.subGroupCode,
            formCode: proc.formCode,
        }));
        setIsSigtapModalOpen(false);
    };

    const handleAddToCart = () => {
        if (!pendingProcedure.procedureCode) {
            alert('Selecione um procedimento (SIGTAP) antes de adicionar.');
            return;
        }
        
        // Push the pending procedure to the main array
        onAdd(pendingProcedure);
        
        // Reset the form for the next one
        setPendingProcedure({ ...defaultProcedure });
    };

    return (
        <div className="space-y-6">
            {/* Configuração do Novo Procedimento (The "Add Form") */}
            <div className="bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative">
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-3">
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-200 uppercase shadow-sm">
                        Barra de Busca
                    </span>
                </div>
                
                <ProcedureCard
                    index={-1} // Magic number to denote it's the pending one
                    data={pendingProcedure}
                    competence={competence}
                    onUpdate={(_, data) => setPendingProcedure(data)}
                    onRemove={() => setPendingProcedure({ ...defaultProcedure })}
                    // Open our local modal
                    onOpenSigtap={() => setIsSigtapModalOpen(true)} 
                    isExpanded={true}
                    onToggleExpand={() => {}} // Always expanded
                    userCbo={userCbo}
                    onAddAction={handleAddToCart}
                />
                
                <SigtapTreeSelector
                    isOpen={isSigtapModalOpen}
                    onClose={() => setIsSigtapModalOpen(false)}
                    onSelect={handleSigtapSelect}
                    currentCompetence={competence}
                />
                
            </div>

            {/* Lista de Procedimentos Adicionados (The "Cart") */}
            <div className="space-y-3 mt-8 border-t border-gray-100 dark:border-gray-700 pt-6">
                <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText size={16} />
                    Itens Adicionados ({procedures.filter(p => p.procedureCode).length})
                </h4>

                {procedures.filter(p => p.procedureCode).length === 0 && (
                    <div className="text-center p-6 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 border-dashed rounded-lg text-gray-400 text-sm">
                        Nenhum procedimento finalizado ainda. Configure um acima e clique em "Adicionar ao Atendimento".
                    </div>
                )}

                <div className="grid gap-3">
                    {procedures.map((proc, index) => {
                        if (!proc.procedureCode) return null; // Skip empty defaults just in case
                        
                        return (
                            <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                            {proc.procedureCode}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">
                                            {proc.procedureName}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-2 items-center mt-1">
                                        <div className="flex items-center gap-1.5">
                                            <strong className="text-gray-600 dark:text-gray-300">Qtd:</strong>
                                            <button 
                                                type="button" 
                                                onClick={() => onUpdate(index, { ...proc, quantity: Math.max(1, (proc.quantity || 1) - 1) })}
                                                className="w-5 h-5 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 select-none cursor-pointer border border-gray-200 dark:border-gray-600 transition-colors leading-none"
                                                title="Diminuir"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                value={proc.quantity || 1}
                                                onChange={e => onUpdate(index, { ...proc, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                                className="w-12 h-6 text-center text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none p-0 tabular-nums no-spinners"
                                                min={1}
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => onUpdate(index, { ...proc, quantity: (proc.quantity || 1) + 1 })}
                                                className="w-5 h-5 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 select-none cursor-pointer border border-gray-200 dark:border-gray-600 transition-colors leading-none"
                                                title="Aumentar"
                                            >
                                                +
                                            </button>
                                        </div>
                                        {proc.vaccinationData?.imunobiologico && (
                                            <span className="flex items-center">
                                                <strong className="text-gray-600 dark:text-gray-300 mr-1">Vacina:</strong> {proc.vaccinationData.imunobiologico}
                                                {proc.vaccinationData.dose && ` (Dose ${proc.vaccinationData.dose})`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="ml-4 pl-4 border-l border-gray-100 dark:border-gray-700">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8"
                                        onClick={() => onRemove(index)}
                                        title="Remover Item"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
