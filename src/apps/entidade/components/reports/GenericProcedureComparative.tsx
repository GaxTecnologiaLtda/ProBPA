import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Goal } from '../../types';

interface GenericProcedureComparativeProps {
    stats: Record<string, Record<string, number>>;
    procedureDetails: Record<string, any>;
    goals: Goal[];
    municipalityUnits: { id: string; name: string }[];
    breakdown?: Record<string, Record<string, any>>;
}

interface SigtapHierarchy {
    groupCode: string;
    groupName: string;
    subgroups: Record<string, SigtapSubgroup>;
    totalQty: number; // For grand totals if needed
}

interface SigtapSubgroup {
    subGroupCode: string;
    subGroupName: string;
    formas: Record<string, SigtapForma>;
    totalQty: number;
}

interface SigtapForma {
    formCode: string;
    formName: string;
    procedures: SigtapProcedureItem[];
    totalQty: number;
}

interface SigtapProcedureItem {
    procedureCode: string;
    procedureName: string;
    unitQuantities: Record<string, number>;
    totalQty: number;
}

export const GenericProcedureComparative: React.FC<GenericProcedureComparativeProps> = ({
    stats,
    procedureDetails,
    goals,
    municipalityUnits,
    breakdown
}) => {
    // Popover portal state
    const [hoveredData, setHoveredData] = useState<{ x: number; y: number; data: any } | null>(null);

    const { pactuatedHierarchy, nonPactuatedHierarchy, hasData } = useMemo(() => {
        const pactHM: Record<string, SigtapHierarchy> = {};
        const nonPactHM: Record<string, SigtapHierarchy> = {};

        // 1. Identify which procedure prefixes are covered by Goals
        // Goals are usually 10 digits or macros (e.g. 030101004). We will check if a procedure starts with any goal code.
        const pactuatedPrefixes = goals.map(g => g.procedureCode.replace(/\D/g, ''));

        const isPactuated = (code: string) => {
            return pactuatedPrefixes.some(prefix => code.startsWith(prefix));
        };

        // 2. Map all procedures that have > 0 production
        const allProcedIds = new Set<string>();
        Object.values(stats).forEach(unitRecord => {
            Object.entries(unitRecord).forEach(([code, qty]) => {
                if (qty > 0) allProcedIds.add(code);
            });
        });

        let dataCount = 0;

        allProcedIds.forEach(code => {
            const isPact = isPactuated(code);
            const targetHierarchy = isPact ? pactHM : nonPactHM;

            // Get Details
            const details = procedureDetails[code] || {
                procedureCode: code,
                procedureName: `Procedimento ${code}`,
                groupCode: code.substring(0, 2) || 'XX',
                groupName: 'Grupo Desconhecido',
                subGroupCode: code.substring(2, 4) || 'XX',
                subGroupName: 'Subgrupo Desconhecido',
                formCode: code.substring(4, 6) || 'XX',
                formName: 'Forma Desconhecida'
            };

            // Build Unit Quantities
            const unitQuantities: Record<string, number> = {};
            let procTotal = 0;

            municipalityUnits.forEach(unit => {
                const qty = stats[unit.id]?.[code] || 0;
                unitQuantities[unit.id] = qty;
                procTotal += qty;
            });

            if (procTotal === 0) return; // Skip if it somehow ended up empty

            dataCount++;

            // 1. Group
            if (!targetHierarchy[details.groupCode]) {
                targetHierarchy[details.groupCode] = {
                    groupCode: details.groupCode,
                    groupName: details.groupName,
                    subgroups: {},
                    totalQty: 0
                };
            }
            const gNode = targetHierarchy[details.groupCode];
            gNode.totalQty += procTotal;

            // 2. Subgroup
            if (!gNode.subgroups[details.subGroupCode]) {
                gNode.subgroups[details.subGroupCode] = {
                    subGroupCode: details.subGroupCode,
                    subGroupName: details.subGroupName,
                    formas: {},
                    totalQty: 0
                };
            }
            const sNode = gNode.subgroups[details.subGroupCode];
            sNode.totalQty += procTotal;

            // 3. Forma
            if (!sNode.formas[details.formCode]) {
                sNode.formas[details.formCode] = {
                    formCode: details.formCode,
                    formName: details.formName,
                    procedures: [],
                    totalQty: 0
                };
            }
            const fNode = sNode.formas[details.formCode];
            fNode.totalQty += procTotal;

            // 4. Procedure
            fNode.procedures.push({
                procedureCode: details.procedureCode,
                procedureName: details.procedureName,
                unitQuantities,
                totalQty: procTotal
            });
        });

        // 3. Sort everything for deterministic render
        const sortHierarchy = (hm: Record<string, SigtapHierarchy>) => {
            const groups = Object.values(hm).sort((a, b) => a.groupCode.localeCompare(b.groupCode));
            groups.forEach(g => {
                const subgroups = Object.values(g.subgroups).sort((a, b) => a.subGroupCode.localeCompare(b.subGroupCode));
                // Convert back to Record sorted? No, we will array-ify it on render or here. Let's keep as Record and Object.values() during render.
                g.subgroups = subgroups.reduce((acc, sub) => ({ ...acc, [sub.subGroupCode]: sub }), {});

                Object.values(g.subgroups).forEach(s => {
                    const formas = Object.values(s.formas).sort((a, b) => a.formCode.localeCompare(b.formCode));
                    s.formas = formas.reduce((acc, f) => ({ ...acc, [f.formCode]: f }), {});

                    Object.values(s.formas).forEach(f => {
                        f.procedures.sort((a, b) => a.procedureCode.localeCompare(b.procedureCode));
                    });
                });
            });
            return groups;
        };

        return {
            pactuatedHierarchy: sortHierarchy(pactHM),
            nonPactuatedHierarchy: sortHierarchy(nonPactHM),
            hasData: dataCount > 0
        };

    }, [stats, procedureDetails, goals, municipalityUnits]);

    const renderTableBlock = (title: string, dataArray: SigtapHierarchy[], theme: 'blue' | 'gray') => {
        if (dataArray.length === 0) return null;

        const themeColors = {
            blue: {
                header: 'bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100',
                group: 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
            },
            gray: {
                header: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
                group: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300'
            }
        };

        return (
            <div className="mb-8 border rounded-lg shadow-sm border-gray-100 dark:border-gray-800 overflow-visible">
                <div className={`p-3 font-bold text-sm tracking-wide uppercase ${themeColors[theme].header}`}>
                    {title}
                </div>
                <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 border-collapse">
                        <thead>
                            <tr className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                <th className="sticky left-0 bg-white dark:bg-gray-900 z-10 w-24 min-w-[100px] p-2 text-center text-xs font-semibold text-gray-500 border-r border-gray-200 dark:border-gray-700">
                                    Cód.
                                </th>
                                <th className="sticky left-24 bg-white dark:bg-gray-900 z-10 w-64 min-w-[250px] p-2 text-xs font-semibold text-gray-500 border-r border-gray-200 dark:border-gray-700">
                                    Procedimento
                                </th>
                                {municipalityUnits.map(unit => (
                                    <th key={unit.id} className="text-center font-semibold text-gray-500 text-[10px] p-2 max-w-[100px] border-r border-gray-200 dark:border-gray-700 leading-tight" title={unit.name}>
                                        {unit.name.toUpperCase()}
                                    </th>
                                ))}
                                <th className="text-center font-bold bg-cyan-50 dark:bg-cyan-900/10 text-cyan-800 dark:text-cyan-200 p-2 text-xs">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {dataArray.map(group => (
                                <React.Fragment key={group.groupCode}>
                                    {/* Group Row */}
                                    <tr className={themeColors[theme].group}>
                                        <td colSpan={2} className={`sticky left-0 z-10 p-2 font-bold text-xs border-r border-white/50 dark:border-gray-700 ${themeColors[theme].group}`}>
                                            {group.groupCode} - {group.groupName}
                                        </td>
                                        {municipalityUnits.map(() => <td key={Math.random()} className="border-r border-white/50 dark:border-gray-700"></td>)}
                                        <td className="text-center font-bold p-2 text-xs">{group.totalQty}</td>
                                    </tr>

                                    {Object.values(group.subgroups).map(subgroup => (
                                        <React.Fragment key={subgroup.subGroupCode}>
                                            {/* Subgroup Row */}
                                            <tr className="bg-gray-50 dark:bg-gray-800/80">
                                                <td colSpan={2} className="sticky left-0 bg-gray-50 dark:bg-gray-800/80 z-10 p-2 pl-6 font-semibold text-xs border-r border-white dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                                    {subgroup.subGroupCode} - {subgroup.subGroupName}
                                                </td>
                                                {municipalityUnits.map(() => <td key={Math.random()} className="border-r border-white dark:border-gray-700"></td>)}
                                                <td className="text-center font-semibold p-2 text-xs text-gray-700 dark:text-gray-300">{subgroup.totalQty}</td>
                                            </tr>

                                            {Object.values(subgroup.formas).map(forma => (
                                                <React.Fragment key={forma.formCode}>
                                                    {/* Forma Row */}
                                                    <tr className="bg-white dark:bg-gray-900">
                                                        <td colSpan={2} className="sticky left-0 bg-white dark:bg-gray-900 z-10 p-2 pl-10 font-medium text-[11px] border-r border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                                                            {forma.formCode} - {forma.formName}
                                                        </td>
                                                        {municipalityUnits.map(() => <td key={Math.random()} className="border-r border-gray-100 dark:border-gray-800"></td>)}
                                                        <td className="text-center font-medium p-2 text-[11px] text-gray-500 dark:text-gray-400">{forma.totalQty}</td>
                                                    </tr>

                                                    {/* Procedure Rows */}
                                                    {forma.procedures.map(proc => (
                                                        <tr key={proc.procedureCode} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors bg-white dark:bg-gray-900">
                                                            <td className="sticky left-0 bg-white dark:bg-gray-900 z-10 p-2 text-center text-xs font-mono text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-gray-800">
                                                                {proc.procedureCode}
                                                            </td>
                                                            <td className="sticky left-24 bg-white dark:bg-gray-900 z-10 p-2 text-xs border-r border-gray-100 dark:border-gray-800">
                                                                <span className="text-gray-900 dark:text-gray-100 block" title={proc.procedureName}>
                                                                    {proc.procedureName}
                                                                </span>
                                                            </td>
                                                            {municipalityUnits.map(unit => {
                                                                const qty = proc.unitQuantities[unit.id] || 0;
                                                                const breakdownData = breakdown?.[unit.id]?.[proc.procedureCode];
                                                                
                                                                return (
                                                                    <td 
                                                                        key={unit.id} 
                                                                        className="text-center text-xs p-2 border-r border-gray-100 dark:border-gray-800 cursor-default"
                                                                        onMouseEnter={(e) => {
                                                                            if (breakdownData) {
                                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                                setHoveredData({
                                                                                    x: rect.left + rect.width / 2,
                                                                                    y: rect.top, // anchor to top of cell
                                                                                    data: breakdownData
                                                                                });
                                                                            }
                                                                        }}
                                                                        onMouseLeave={() => setHoveredData(null)}
                                                                    >
                                                                        {qty > 0 ? (
                                                                            <span className="font-medium text-gray-800 dark:text-gray-300">{qty}</span>
                                                                        ) : (
                                                                            <span className="text-gray-300 dark:text-gray-600">-</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="text-center font-bold text-cyan-800 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-900/10 p-2 text-xs">
                                                                {proc.totalQty}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (!hasData) {
        return (
            <div className="py-12 text-center text-gray-500 border rounded-lg dark:border-gray-800">
                Nenhum procedimento processado neste período.
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-4">
            {renderTableBlock("Meta Pactuada (Planejado)", pactuatedHierarchy, 'blue')}
            {renderTableBlock("Fora da Meta (Excedentes / Demanda Espontânea)", nonPactuatedHierarchy, 'gray')}
            
            {hoveredData && createPortal(
                <div 
                    className="fixed pointer-events-none z-[9999] p-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl text-left w-64 transform -translate-x-1/2 -translate-y-full mt-[-8px] transition-all duration-100 ease-out"
                    style={{ left: hoveredData.x, top: hoveredData.y }}
                >
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white/95 dark:bg-gray-900/95 border-b border-r border-gray-200 dark:border-gray-700 rotate-45"></div>
                    <div className="relative z-10">
                        <div className="text-[10px] uppercase font-bold text-gray-400 mb-2 border-b border-gray-100 dark:border-gray-800 pb-1 flex justify-between">
                            <span>Origem dos Dados</span>
                        </div>
                        <div className="flex gap-2 mb-2">
                            <span className="flex-1 text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md text-center">
                                ✍️ Manual: {hoveredData.data.manual || 0}
                            </span>
                            <span className="flex-1 text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md text-center">
                                🤖 Conector: {hoveredData.data.connector || 0}
                            </span>
                        </div>
                        {hoveredData.data.professionals && Object.keys(hoveredData.data.professionals).length > 0 && (
                            <div className="flex flex-col gap-1 mt-2">
                                <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Profissionais:</div>
                                {Object.entries(hoveredData.data.professionals).map(([pId, pData]: [string, any]) => (
                                    <div key={pId} className="flex justify-between items-center text-[10px] bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded">
                                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-2 max-w-[170px]" title={pData.name}>{pData.name}</span>
                                        <span className="font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-1.5 rounded">{pData.qty}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
