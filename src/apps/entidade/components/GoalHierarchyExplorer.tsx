import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Check, Loader2, Archive, Folder, FileText, Activity, Info, Network, Stethoscope, BookOpen } from 'lucide-react';
import { sigtapService } from '../../administrativo/services/sigtapService';
import { Goal } from '../types';
import { SigtapProcedureDetail } from '../../administrativo/types';
import { Badge } from './ui/Components';

interface TreeItem {
    id: string;
    code: string;
    name: string;
    type: 'Group' | 'SubGroup' | 'Form' | 'Procedure';
    hasChildren: boolean;
    loaded: boolean;
    children: TreeItem[];
    details?: SigtapProcedureDetail; // Only for Procedure
    parentCodes: string[];
}

interface GoalHierarchyExplorerProps {
    goal: Goal;
}

export const GoalHierarchyExplorer: React.FC<GoalHierarchyExplorerProps> = ({ goal }) => {
    const [treeData, setTreeData] = useState<TreeItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

    useEffect(() => {
        console.log('GoalHierarchyExplorer v2.1 mounted', goal);
        buildFullHierarchy();
    }, [goal]);

    const buildFullHierarchy = async () => {
        setLoading(true);
        try {
            const goalCode = goal.procedureCode.replace(/\D/g, '');
            const comp = goal.sigtapSourceCompetence || goal.competence || '202501';

            let targetType = goal.sigtapTargetType;
            if (!targetType) {
                if (goalCode.length === 2) targetType = 'Group';
                else if (goalCode.length === 4) targetType = 'SubGroup';
                else if (goalCode.length === 6) targetType = 'Form';
                else if (goalCode.length === 10) targetType = 'Procedure';
                else targetType = 'Procedure';
            }

            // Extract codes
            const gCode = goalCode.substring(0, 2);
            const sCode = goalCode.length >= 4 ? goalCode.substring(2, 4) : '';
            const fCode = goalCode.length >= 6 ? goalCode.substring(4, 6) : '';
            const pCode = goalCode.length === 10 ? goalCode : '';

            // 1. Fetch Group (Always 1)
            const groupData = await sigtapService.getGroup(comp, gCode);
            if (!groupData) {
                setTreeData([]);
                setLoading(false);
                return;
            }

            const rootNode: TreeItem = {
                id: groupData.code,
                code: groupData.code,
                name: groupData.name,
                type: 'Group',
                hasChildren: true,
                loaded: true,
                children: [],
                parentCodes: []
            };

            // If Target is just Group, fetch ALL SubGroups and we are done (Macro View)
            if (targetType === 'Group' || !sCode) {
                // Fetch ALL subgroups for this group
                const allSubs = await sigtapService.getSubGroups(comp, gCode);
                rootNode.children = allSubs.map((s: any) => ({
                    id: `${gCode}-${s.code}`,
                    code: s.code, name: s.name, type: 'SubGroup', hasChildren: true, loaded: false, children: [], parentCodes: [gCode]
                }));
                // Set Tree
                setTreeData([rootNode]);
                setExpandedMap(prev => ({ ...prev, [rootNode.id]: true }));
                setLoading(false);
                return;
            }

            // 2. Fetch Target SubGroup (Single)
            const subData = await sigtapService.getSubGroup(comp, gCode, sCode);
            if (!subData) {
                setTreeData([rootNode]); // Show at least group
                setLoading(false);
                return;
            }

            const subNode: TreeItem = {
                id: `${gCode}-${subData.code}`,
                code: subData.code,
                name: subData.name,
                type: 'SubGroup',
                hasChildren: true,
                loaded: true,
                children: [],
                parentCodes: [gCode]
            };
            rootNode.children = [subNode]; // Only THIS subgroup is attached
            setExpandedMap(prev => ({ ...prev, [rootNode.id]: true, [subNode.id]: true }));

            // If Target is SubGroup, fetch ALL Forms for this SubGroup
            if (targetType === 'SubGroup' || !fCode) {
                const allForms = await sigtapService.getForms(comp, gCode, sCode);
                subNode.children = allForms.map((f: any) => ({
                    id: `${subNode.id}-${f.code}`,
                    code: f.code, name: f.name, type: 'Form', hasChildren: true, loaded: false, children: [], parentCodes: [gCode, sCode]
                }));
                setTreeData([rootNode]);
                setLoading(false);
                return;
            }

            // 3. Fetch Target Form (Single)
            const formData = await sigtapService.getForm(comp, gCode, sCode, fCode);
            if (!formData) {
                setTreeData([rootNode]);
                setLoading(false);
                return;
            }

            const formNode: TreeItem = {
                id: `${subNode.id}-${formData.code}`,
                code: formData.code,
                name: formData.name,
                type: 'Form',
                hasChildren: true,
                loaded: true,
                children: [],
                parentCodes: [gCode, sCode]
            };
            subNode.children = [formNode]; // Only THIS form
            setExpandedMap(prev => ({ ...prev, [formNode.id]: true }));

            // 4. Fetch Procedures
            // If Target is Form, fetch ALL Procedures
            // If Target is Procedure, fetch ALL but filter to display ONLY the target? Or just Highlight?
            // User requirement: "se eu seleciono diretamente o procedimento, basta apanas ele..."
            // So if type is Procedure, filtering is required.

            const strategies = await sigtapService.getProcedures(comp, gCode, sCode, fCode);
            let relevantProcedures = strategies;

            if (targetType === 'Procedure') {
                relevantProcedures = strategies.filter((p: any) => p.code === pCode);
            }

            formNode.children = relevantProcedures.map((p: any) => ({
                id: `${formNode.id}-${p.code}`,
                code: p.code,
                name: p.name,
                type: 'Procedure',
                hasChildren: false,
                loaded: true,
                children: [],
                details: p,
                parentCodes: [gCode, sCode, fCode]
            }));

            // Auto-expand procedure if it's the target (to show details)
            if (targetType === 'Procedure' && formNode.children.length > 0) {
                setExpandedMap(prev => ({ ...prev, [formNode.children[0].id]: true }));
            }

            setTreeData([rootNode]);

        } catch (err) {
            console.error("Error building hierarchy:", err);
            // Fallback to empty
            setTreeData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (item: TreeItem) => {
        const isExpanded = expandedMap[item.id];

        if (!isExpanded && !item.loaded && item.hasChildren) {
            // Load Children Logic (Same as before, simplified reuse)
            try {
                let children: TreeItem[] = [];
                const comp = goal.competence || '202501';

                if (item.type === 'Group') {
                    const res = await sigtapService.getSubGroups(comp, item.code);
                    children = res.map((x: any) => ({
                        id: `${item.id}-${x.code}`,
                        code: x.code, name: x.name, type: 'SubGroup', hasChildren: true, loaded: false, children: [],
                        parentCodes: [item.code]
                    }));
                } else if (item.type === 'SubGroup') {
                    const groupCode = item.parentCodes[0] || item.code.substring(0, 2);
                    const res = await sigtapService.getForms(comp, groupCode, item.code);
                    children = res.map((x: any) => ({
                        id: `${item.id}-${x.code}`,
                        code: x.code, name: x.name, type: 'Form', hasChildren: true, loaded: false, children: [],
                        parentCodes: [...item.parentCodes, item.code]
                    }));
                } else if (item.type === 'Form') {
                    const groupCode = item.parentCodes[0];
                    const subGroupCode = item.parentCodes[1];
                    const res = await sigtapService.getProcedures(comp, groupCode, subGroupCode, item.code);
                    children = res.map((x: any) => ({
                        id: `${item.id}-${x.code}`,
                        code: x.code, name: x.name, type: 'Procedure', hasChildren: false, loaded: true, children: [],
                        details: x,
                        parentCodes: [...item.parentCodes, item.code]
                    }));
                }

                // Recursive Update Tree Data to insert children at right place
                const insertChildren = (nodes: TreeItem[]): TreeItem[] => {
                    return nodes.map(node => {
                        if (node.id === item.id) {
                            return { ...node, children, loaded: true };
                        }
                        if (node.children.length > 0) {
                            return { ...node, children: insertChildren(node.children) };
                        }
                        return node;
                    });
                };

                setTreeData(prev => insertChildren(prev));

            } catch (err) {
                console.error(err);
            }
        }

        setExpandedMap(prev => ({ ...prev, [item.id]: !isExpanded }));
    };


    // Render Helpers (Unchanged, just ensuring access)
    const renderDetails = (details: SigtapProcedureDetail) => (
        <div className="mt-2 ml-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs space-y-3 border border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2">
            {/* CBOs */}
            <div>
                <h5 className="font-bold flex items-center gap-1 text-blue-600 mb-1"><Briefcase size={12} /> Compatibilidade CBO</h5>
                <div className="flex flex-wrap gap-1">
                    {details.ocupacoes?.map((cbo: any) => (
                        <span key={cbo.code} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px]" title={cbo.name}>
                            {cbo.code}
                        </span>
                    )) || <span className="text-gray-400 italic">Nenhuma registrada</span>}
                </div>
            </div>

            {/* CIDs */}
            <div>
                <h5 className="font-bold flex items-center gap-1 text-red-600 mb-1"><Stethoscope size={12} /> CIDs Compatíveis</h5>
                <div className="flex flex-wrap gap-1">
                    {details.cids?.map((cid: any) => (
                        <span key={cid.code} className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-[10px]" title={cid.name}>
                            {cid.code}
                        </span>
                    )) || <span className="text-gray-400 italic">Nenhum registrado</span>}
                </div>
            </div>

            {/* Attributes */}
            <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
                <div>Idade: {details.ageMin / 12}a - {details.ageMax === 9999 ? '999a' : (details.ageMax / 12) + 'a'}</div>
                <div>Permanência: {details.daysStay} dias</div>
                <div>Pontos: {details.points}</div>
                <div>Sexo: {details.sex}</div>
            </div>
        </div>
    );

    const renderTree = (list: TreeItem[], level = 0) => {
        return list.map(item => (
            <div key={item.id} style={{ marginLeft: level * 0 }}> {/* Reduced indent for cleaner look */}
                <div
                    className={`flex items-start gap-2 py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer border-l-2 ${expandedMap[item.id] ? 'border-emerald-500 bg-gray-50 dark:bg-gray-800' : 'border-transparent'}`}
                    style={{ marginLeft: level * 12 }}
                    onClick={() => handleToggle(item)}
                >
                    <button
                        className={`mt-0.5 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${!item.hasChildren ? 'invisible' : ''}`}
                    >
                        {expandedMap[item.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            {item.type === 'Group' && <Archive size={14} className="text-purple-500" />}
                            {item.type === 'SubGroup' && <Folder size={14} className="text-blue-500" />}
                            {item.type === 'Form' && <FileText size={14} className="text-orange-500" />}
                            {item.type === 'Procedure' && <Activity size={14} className="text-emerald-500" />}

                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs ${item.type === 'Procedure' ? 'font-mono font-bold' : 'font-medium'}`}>
                                        {item.code}
                                    </span>
                                    <span className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1">
                                        {item.name}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">{item.type}</span>
                            </div>
                        </div>

                        {/* Render Details ONLY if expanded and it is a Procedure that has details loaded */}
                        {item.type === 'Procedure' && item.details && expandedMap[item.id] && renderDetails(item.details)}
                    </div>
                </div>

                {expandedMap[item.id] && item.children.length > 0 && (
                    <div className="">
                        {renderTree(item.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-900 max-h-[60vh] overflow-y-auto">


            {loading && treeData.length === 0 && (
                <div className="p-4 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Carregando estrutura SIGTAP...
                </div>
            )}

            {!loading && treeData.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-xs">
                    <p className="font-bold mb-1">Nenhum dado encontrado.</p>
                    <p>Verifique se os dados da competência {goal.sigtapSourceCompetence || goal.competence} foram importados.</p>
                    <button onClick={buildFullHierarchy} className="mt-2 text-blue-600 underline">Tentar Novamente</button>
                </div>
            )}

            {renderTree(treeData)}
        </div>
    );
};

// Simple icon replacement for Briefcase since I forgot to import it
const Briefcase = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
);
