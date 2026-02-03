import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from './ui/Components';
import { ChevronRight, ChevronDown, Check, Loader2, Archive, Folder, FileText, Activity } from 'lucide-react';
import { sigtapService } from '../../administrativo/services/sigtapService'; // Importing service only

interface SigtapNode {
    code: string;
    name: string;
    type: 'Group' | 'SubGroup' | 'Form' | 'Procedure';
    children?: SigtapNode[];
    hasChildren?: boolean; // For lazy loading indicator
    loaded?: boolean; // If children are loaded
}

interface SigtapSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (selectedNodes: SigtapNode[]) => void;
    competence: string;
}

export const SigtapSelector: React.FC<SigtapSelectorProps> = ({ isOpen, onClose, onSelect, competence }) => {
    const [nodes, setNodes] = useState<SigtapNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedMap, setSelectedMap] = useState<Record<string, SigtapNode>>({});
    const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

    // Initial Load: Groups
    useEffect(() => {
        if (isOpen && competence && nodes.length === 0) {
            loadGroups();
        }
    }, [isOpen, competence]);

    const loadGroups = async () => {
        setLoading(true);
        try {
            const groups = await sigtapService.getGroups(competence);
            const mapped: SigtapNode[] = groups.map((g: any) => ({
                code: g.code,
                name: g.name,
                type: 'Group',
                hasChildren: true,
                loaded: false,
                children: []
            }));
            setNodes(mapped);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = async (node: SigtapNode) => {
        const isExpanded = expandedMap[node.code];

        if (!isExpanded && !node.loaded) {
            // Lazy Load Children
            await loadChildren(node);
        }

        setExpandedMap(prev => ({ ...prev, [node.code]: !isExpanded }));
    };

    const loadChildren = async (node: SigtapNode) => {
        // Find reference to node in state tree allows generic update? 
        // We'll update state by mapping.

        let newChildren: SigtapNode[] = [];

        try {
            if (node.type === 'Group') {
                const subGroups = await sigtapService.getSubGroups(competence, node.code);
                newChildren = subGroups.map((s: any) => ({ code: s.code, name: s.name, type: 'SubGroup', hasChildren: true, loaded: false, children: [] }));
            } else if (node.type === 'SubGroup') {
                const groupCode = node.code.substring(0, 2); // Assuming structure, but cleaner to find parent. Sigtap nodes usually don't have parent ref here.
                // We need parent codes. 
                // Hack: Pass parent codes in traversal or store in ID?
                // Let's implement a recursive update that finds the node and we'll have access to parent chain if we pass it, but querying service needs IDs.
                // sigtapService needs parent IDs.
                // WORKAROUND: Store full context in code or separate field?
                // Actually, the node.code should be unique enough, but service needs contextual IDs.
                // Sigtap structure: Group (2) -> Sub (2) -> Form (2) -> Proc (10)
                // Subgroup code is usually 0201 (Group+Sub). Let's verify service expectation.
                // Service: getSubGroups(competence, groupCode). 
                // getForms(competence, groupCode, subGroupCode).
                // getProcedures(competence, groupCode, subGroupCode, formCode).
                // If the "code" in node is just "01", we need parent.
                // SigtapParser usually stores full code "0201" or separated?
                // Looking at sigtapService.getGroups: returns { code, name }. Usually just "02".
                // getSubGroups(groupCode) returns items.

                // Let's assume we need to traverse to update.
            }
        } catch (err) {
            console.error(err);
            return;
        }

        // We need a helper to find and update node in the tree
        // Doing strictly recursive update
    };

    // Better approach for Tree state management with Lazy Loading:
    // Store flattening or use a Map cache for data, but tree render needs structure.
    // Let's stick to recursive update, but we need the Parent IDs for the Service calls.
    // Let's store "args" in the node?

    // Simplification: We only display the list.
    // When expanding a node, we fetch children and set them.
    // We need to know which node we are expanding.

    // Updated Node Interface with Unique ID for Tree State
    interface TreeItem extends SigtapNode {
        id: string; // Composite ID (e.g., "02-01-01") to ensure uniqueness in tree
        parentCodes: string[]; // [groupCode, subGroupCode, formCode]
    }

    // Re-implement loadGroups with TreeItem
    const [treeData, setTreeData] = useState<TreeItem[]>([]);

    const loadGroupsTree = async () => {
        setLoading(true);
        try {
            const groups = await sigtapService.getGroups(competence);
            const mapped: TreeItem[] = groups.map((g: any) => ({
                id: g.code, // Groups are root, code is unique
                code: g.code,
                name: g.name,
                type: 'Group',
                hasChildren: true,
                loaded: false,
                children: [],
                parentCodes: []
            }));
            setTreeData(mapped);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setTreeData([]); // Clear on open/competence change
        if (isOpen && competence) {
            loadGroupsTree();
        }
    }, [isOpen, competence]);

    const handleToggle = async (item: TreeItem) => {
        const isExpanded = expandedMap[item.id];

        if (!isExpanded && !item.loaded) {
            // LOAD CHILDREN
            let children: TreeItem[] = [];
            try {
                if (item.type === 'Group') {
                    // Fetch SubGroups
                    const res = await sigtapService.getSubGroups(competence, item.code);
                    children = res.map((x: any) => ({
                        id: `${item.id}-${x.code}`,
                        code: x.code, name: x.name, type: 'SubGroup', hasChildren: true, loaded: false, children: [],
                        parentCodes: [item.code]
                    }));
                } else if (item.type === 'SubGroup') {
                    // Fetch Forms
                    const groupCode = item.parentCodes[0];
                    const res = await sigtapService.getForms(competence, groupCode, item.code);
                    children = res.map((x: any) => ({
                        id: `${item.id}-${x.code}`,
                        code: x.code, name: x.name, type: 'Form', hasChildren: true, loaded: false, children: [],
                        parentCodes: [groupCode, item.code]
                    }));
                } else if (item.type === 'Form') {
                    // Fetch Procedures
                    const groupCode = item.parentCodes[0];
                    const subGroupCode = item.parentCodes[1];
                    const res = await sigtapService.getProcedures(competence, groupCode, subGroupCode, item.code);
                    children = res.map((x: any) => ({
                        id: `${item.id}-${x.code}`,
                        code: x.code, name: x.name, type: 'Procedure', hasChildren: false, loaded: true, children: [],
                        parentCodes: [groupCode, subGroupCode, item.code]
                    }));
                }

                // Update Tree using Unique ID
                const updateTree = (list: TreeItem[]): TreeItem[] => {
                    return list.map(node => {
                        if (node.id === item.id) {
                            return { ...node, loaded: true, children };
                        }
                        if (node.children && node.children.length > 0) {
                            return { ...node, children: updateTree(node.children as TreeItem[]) };
                        }
                        return node;
                    });
                };

                setTreeData(prev => updateTree(prev));

            } catch (err) {
                console.error(err);
            }
        }

        setExpandedMap(prev => ({ ...prev, [item.id]: !isExpanded }));
    };

    const handleCheck = (item: TreeItem, checked: boolean) => {
        if (checked) {
            setSelectedMap(prev => ({ ...prev, [item.id]: item }));
        } else {
            setSelectedMap(prev => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
        }
    };

    const renderTree = (list: TreeItem[], level = 0) => {
        return list.map(item => (
            <div key={item.id} style={{ marginLeft: level * 16 }}>
                <div className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedMap[item.id] ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                    <button
                        onClick={() => handleToggle(item)}
                        className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${!item.hasChildren ? 'opacity-0 disabled' : ''}`}
                        disabled={!item.hasChildren}
                    >
                        {expandedMap[item.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    <input
                        type="checkbox"
                        checked={!!selectedMap[item.id]}
                        onChange={(e) => handleCheck(item, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />

                    <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => handleToggle(item)}>
                        {item.type === 'Group' && <Archive size={16} className="text-purple-500" />}
                        {item.type === 'SubGroup' && <Folder size={16} className="text-blue-500" />}
                        {item.type === 'Form' && <FileText size={16} className="text-orange-500" />}
                        {item.type === 'Procedure' && <Activity size={16} className="text-emerald-500" />}

                        <span className={`text-sm ${item.type === 'Procedure' ? 'font-mono' : 'font-medium'}`}>
                            {item.code}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            {item.name}
                        </span>
                        <Badge type="neutral" className="text-[10px] py-0">{item.type}</Badge>
                    </div>
                </div>

                {expandedMap[item.id] && item.children && (
                    <div className="border-l border-gray-200 dark:border-gray-700 ml-4">
                        {renderTree(item.children as TreeItem[], level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    const handleConfirm = () => {
        const selectedWithFullCodes = Object.values(selectedMap).map(i => {
            const item = i as TreeItem;
            // Construct full code for hierarchical items (Group/SubGroup/Form)
            // Procedure usually comes with full code, but hierarchy items come with relative codes (01, 02...)
            let fullCode = item.code;
            if (item.type !== 'Procedure') {
                fullCode = [...item.parentCodes, item.code].join('');
            }
            return { ...item, code: fullCode };
        });
        onSelect(selectedWithFullCodes);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Vincular Metas do SIGTAP (${competence})`}>
            <div className="flex flex-col h-[70vh]">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4 text-sm text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-900">
                    <p className="font-bold mb-1">Selecione os itens que deseja pactuar.</p>
                    <p>Você pode selecionar Grupos Inteiros, Subgrupos, Formas ou Procedimentos individuais. Itens maiores (Grupos) abrangem toda a produção vinculada a eles.</p>
                </div>

                <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-900">
                    {loading && treeData.length === 0 ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                        </div>
                    ) : (
                        renderTree(treeData)
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-sm text-gray-500">{Object.keys(selectedMap).length} itens selecionados</span>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleConfirm} disabled={Object.keys(selectedMap).length === 0}>
                            Confirmar Vinculação
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
