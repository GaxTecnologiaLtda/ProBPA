import React from 'react';
import { Card, Button } from '../../components/ui/BaseComponents';
import { ProcedureCard } from '../../components/ProcedureCard';
import { FileText, Plus } from 'lucide-react';

interface ProcedureSectionProps {
    procedures: any[];
    competence: string;
    onUpdate: (index: number, data: any) => void;
    onRemove: (index: number) => void;
    onOpenSigtap: (index: number) => void;
    onToggleExpand: (index: number) => void;
    onAdd: () => void;
    userCbo: string;
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    colorClass?: string;
}

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
    icon = <FileText size={20} className="text-green-500" />,
    colorClass = "border-l-green-500"
}) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    {icon}
                    {title}
                </h3>
            </div>

            {/* Lista de Procedimentos */}
            <div className="space-y-4">
                {procedures.length === 0 && (
                    <div className="text-center p-6 bg-gray-50 border border-gray-100 rounded-lg text-gray-400">
                        Nenhum procedimento adicionado ainda.
                    </div>
                )}

                {procedures.map((proc, index) => (
                    <ProcedureCard
                        key={index}
                        index={index}
                        data={proc}
                        competence={competence}
                        onUpdate={onUpdate}
                        onRemove={onRemove}
                        onOpenSigtap={onOpenSigtap}
                        isExpanded={proc.isExpanded}
                        onToggleExpand={onToggleExpand}
                        userCbo={userCbo}
                    />
                ))}

                {/* Add Button */}
                <Button variant="outline" onClick={onAdd} className="w-full border-dashed border-2 py-6">
                    <Plus className="mr-2" size={20} />
                    Adicionar Outro Procedimento
                </Button>
            </div>
        </div>
    );
};
