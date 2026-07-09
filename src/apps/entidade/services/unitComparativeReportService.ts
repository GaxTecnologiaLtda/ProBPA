import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { municipalityReportService } from './municipalityReportService';

const SUS_LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAFVBMVEVHcEw+QJU+QJU+QJU+QJU+QJU+QJW/nn/gAAAABnRSTlMAfT7FE6a2Lr+ZAAADxklEQVR42u2aS1ebQBiGh4tZgx5ZI21Zq6SsSXPM2jY9rgWS+f8/ocrNGZibaIe0eZ+VMgEe3oGZj0kIAQAAAAAAAAAAAAAAAAAAAAAAAAAAn8xVNuHOqkBEJ9QQgAAEIAABCEAAAhCAAAQgAAEIQAACEIDAeQnchFPI/0wyl0J1uEJzOqb9RxKG+4y+n0Bw+G99Y0yI1yyytp9yKS2b9pzfeZWFl/GgFl5n2ccEtpQRWDGf6gQexjs3n6m/h5fJcIyLDwi4VC3gUqFA96Rld2GYJF/J03yBSCOQqgSGPS9mC7hULeBSE4GK5HMFds3m3/2/EwGv2bBmdxEI0Hg7VyDiB82JQNtDhU6g8vN5An6ztZQL5Hy7TMA4gkB4C1RSgXG7VOBgGMFYwNEkMG6XCtTF9gMCb30sFqCxVoCuzSKQCNxrBCq9gGEEEgF6FysFaBnrBAwjkAlQ+rOQ34SNYqERMItA/Bg2HAvRY8icIFYLmEUwGYiYfUqRwBPfrhKoyXbuSNjxKBBI2UtUC9BHgwgmAh7lLlEyF3SdpBE4GkSgnA1fhoOJgE/56VIlYBKBsh546QNlPfDaR0oBgwiUFRF9FlVEzEUdNAIGEQhqwge2rhDUhBu2XSOgj0BUFW/2SgHi7PkHcaU6vi6CQFj3u1f9CUQCL39ds4+BSqDURRBIXj2+KAX62r3WCmgjkAn4GoH2sAYClSYCmUD7tMkF2nYDAV0EUoFdK+DxAqNa7WggoIlAKrBqBdrp+bafqit+yC4NBDQRqLvgwBWp3uvIxCVUmQioI5AKPHVXnr/ViFE/9g4j9q2JAI39GQIP/WQTDTWiwxajDrO3TqDi5g+dQLu2c53391g3/f4iN3lz12+Y9poYCdDYnVmQrMfT84GfDCtDgYMiAqVAPNyNbxvSSTmgF1BFoBK4H9XJzRWn48nYREBxFygEyoKdFvoyOOWrZjMBWrjvFxiO73eb6oDrkWNMzAXW0ggC2QpnwkxMV8wJN137pbiOlVXohZuJCYyWIf0kSZTNYaaN4O+vlYb7XBWBlQVb/3WZUqyxdiwuVifNui3fK/XG8nJ9Vzwyq9LREgIsFzYFRN+XuDYF0lMU8JcWIHRZAbq8QG5RYHWSAtG5C8SLC6QWBTyhQLGwwC5eViBYnZOAIxLwzl3g1jknAfcUBZ7dxQUCewJEuE6ysEBlVSA/QYGSWLwJRT9iKa2+COLHdMIXA5vsRCWRTYHV0gLee74asDYfn5WAaGHUqgAAAAAAAAAAAAAAAAAAAAAAAAAAwL/HHxczmFYWNlJzAAAAAElFTkSuQmCC';

export interface UnitComparativeReportOptions {
    competence: string;
    startDate?: string;
    endDate?: string;
    municipalityName: string;
    entityName: string;
    logoBase64?: string;
    logoUrl?: string;
    goals: any[];
    municipalityUnits: { id: string; name: string }[];
    stats: Record<string, Record<string, number>>;
    mode?: 'metas' | 'procedimentos';
    procedureDetails?: Record<string, any>;
}

export const unitComparativeReportService = {

    generatePdf: async (options: UnitComparativeReportOptions) => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        let logoData = options.logoBase64;
        if (!logoData && options.logoUrl) {
            try {
                logoData = await municipalityReportService.loadImage(options.logoUrl) || undefined;
            } catch (e) {
                console.error("Failed to load logo", e);
            }
        }

        const drawHeader = () => {
            // Entity Logo (Left)
            if (logoData) {
                try {
                    // To maintain aspect ratio and fit well, we set a max width and height relative to our design.
                    doc.addImage(logoData, 'PNG', 5, 5, 30, 20, undefined, 'FAST');
                } catch (e) {
                    console.error("Error drawing logo", e);
                }
            }
            // SUS Logo (Right)
            if (SUS_LOGO_BASE64) {
                try { doc.addImage(SUS_LOGO_BASE64, 'PNG', pageWidth - 25, 5, 20, 20, undefined, 'FAST'); } catch (e) { }
            } else {
                doc.setFontSize(24);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 51, 153);
                doc.text("SUS", pageWidth - 10, 20, { align: 'right' });
            }

            // Title (Center)
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            const titleDate = (options.startDate && options.endDate)
                ? `de ${options.startDate.split('-').reverse().join('/')} até ${options.endDate.split('-').reverse().join('/')}`
                : `mês de ${options.competence}`;
            const titlePrefix = options.mode === 'procedimentos'
                ? 'Relatório de produção por procedimento por unidade'
                : 'Relatório de metas de produção por unidade';
            doc.text(`${titlePrefix} ${titleDate}`, pageWidth / 2, 20, { align: 'center' });

            // Subtitle
            doc.setFontSize(16);
            doc.text((options.municipalityName || 'MUNICÍPIO NÃO INFORMADO').toUpperCase(), pageWidth / 2, 28, { align: 'center' });
        };

        const numUnits = options.municipalityUnits.length;
        const isDense = numUnits > 12;
        const isVeryDense = numUnits > 20;

        const baseFontSize = isVeryDense ? 3.5 : (isDense ? 4 : 5);
        const headFontSize = isVeryDense ? 3.5 : (isDense ? 4 : 4.5);
        const procCellWidth = isVeryDense ? 20 : (isDense ? 28 : 35);
        const unitMinCellWidth = isVeryDense ? 5 : (isDense ? 7 : 10);
        const codCellWidth = isVeryDense ? 8 : 10;

        const head: any[] = [
            [
                { content: 'Cód.', styles: { halign: 'center' as const, cellWidth: codCellWidth } },
                { content: 'Procedimento (Meta Global)', styles: { cellWidth: procCellWidth } },
                ...options.municipalityUnits.map(u => ({ content: u.name.toUpperCase(), styles: { halign: 'center' as const, minCellWidth: unitMinCellWidth, overflow: 'linebreak' as const } })),
                { content: 'Total\nUnid.', styles: { halign: 'center' as const, fillColor: [224, 255, 255] } },
                { content: 'Meta\nmês IRB', styles: { halign: 'center' as const, fillColor: [255, 255, 255] } },
                { content: 'Diferença', styles: { halign: 'center' as const, fillColor: [255, 200, 200] } },
                { content: 'Meta\nAnual', styles: { halign: 'center' as const, fillColor: [255, 236, 179] } }
            ]
        ];

        const body: any[] = [];
        options.goals.forEach(goal => {
            const cleanProcKey = goal.procedureCode.replace(/\D/g, '');
            const rowData = options.municipalityUnits.map(unit => {
                let qty = 0;
                const unitStats = options.stats[unit.id] || {};
                Object.keys(unitStats).forEach(actualProcKey => {
                    if (actualProcKey.startsWith(cleanProcKey)) qty += unitStats[actualProcKey];
                });
                return qty;
            });

            const totalRowQty = rowData.reduce((sum, q) => sum + q, 0);

            body.push([
                { content: goal.procedureCode, styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [240, 240, 240] } },
                { content: goal.procedureName, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
                ...rowData.map(q => ({ content: q > 0 ? q.toString() : '0', styles: { halign: 'center' as const } })),
                { content: totalRowQty.toString(), styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [230, 250, 255] } },
                { content: goal.targetQuantity.toString(), styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [255, 255, 255] } },
                { content: (totalRowQty - goal.targetQuantity).toString(), styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [255, 220, 220], textColor: totalRowQty >= goal.targetQuantity ? [0, 100, 0] : [200, 0, 0] } },
                { content: (goal.targetQuantity * 12).toString(), styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [255, 243, 205] } }
            ]);
        });

        if (options.goals.length === 0) {
            body.push([{ content: 'Nenhuma meta encontrada.', colSpan: options.municipalityUnits.length + 6, styles: { halign: 'center' as const } }]);
        } else {
            const footerRow: any[] = [
                { content: 'Total procedimentos', colSpan: 2, styles: { halign: 'right' as const, fontStyle: 'bold', fillColor: [186, 218, 255], textColor: [0, 0, 0] } },
            ];

            const totalUnitArr = options.municipalityUnits.map(unit => {
                let qty = 0;
                options.goals.forEach(goal => {
                    const cleanProcKey = goal.procedureCode.replace(/\D/g, '');
                    const unitStats = options.stats[unit.id] || {};
                    Object.keys(unitStats).forEach(actualProcKey => {
                        if (actualProcKey.startsWith(cleanProcKey)) qty += unitStats[actualProcKey];
                    });
                });
                return qty;
            });

            const grandTotalProd = totalUnitArr.reduce((a, b) => a + b, 0);
            const grandTotalMeta = options.goals.reduce((a, g) => a + (Number(g.targetQuantity) || 0), 0);

            totalUnitArr.forEach(q => {
                footerRow.push({ content: q.toString(), styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [186, 218, 255] } } as any);
            });

            footerRow.push({ content: grandTotalProd.toString(), styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [186, 218, 255] } } as any);
            footerRow.push({ content: grandTotalMeta.toString(), styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [186, 218, 255] } } as any);
            footerRow.push({ content: (grandTotalProd - grandTotalMeta).toString(), styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [186, 218, 255] } } as any);
            footerRow.push({ content: (grandTotalMeta * 12).toString(), styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [186, 218, 255] } } as any);

            body.push(footerRow);
        }

        if (options.mode === 'procedimentos' && options.procedureDetails) {

            // Re-build hierarchy
            const pactHM: Record<string, any> = {};
            const nonPactHM: Record<string, any> = {};

            const pactuatedPrefixes = options.goals.map(g => g.procedureCode.replace(/\D/g, ''));
            const isPactuated = (code: string) => pactuatedPrefixes.some(prefix => code.startsWith(prefix));

            const allProcedIds = new Set<string>();
            Object.values(options.stats).forEach(unitRecord => {
                Object.entries(unitRecord).forEach(([code, qty]) => {
                    if (qty > 0) allProcedIds.add(code);
                });
            });

            allProcedIds.forEach(code => {
                const targetHierarchy = isPactuated(code) ? pactHM : nonPactHM;
                const details = options.procedureDetails![code] || {
                    procedureCode: code, procedureName: `PROCEDIMENTO ${code}`, groupCode: code.substring(0, 2) || 'XX', groupName: '...', subGroupCode: code.substring(2, 4) || 'XX', subGroupName: '...', formCode: code.substring(4, 6) || 'XX', formName: '...'
                };

                let procTotal = 0;
                const unitQuantities: Record<string, number> = {};
                options.municipalityUnits.forEach(unit => {
                    const qty = options.stats[unit.id]?.[code] || 0;
                    unitQuantities[unit.id] = qty;
                    procTotal += qty;
                });
                if (procTotal === 0) return;

                if (!targetHierarchy[details.groupCode]) targetHierarchy[details.groupCode] = { code: details.groupCode, name: details.groupName, subs: {}, total: 0 };
                const gNode = targetHierarchy[details.groupCode]; gNode.total += procTotal;

                if (!gNode.subs[details.subGroupCode]) gNode.subs[details.subGroupCode] = { code: details.subGroupCode, name: details.subGroupName, forms: {}, total: 0 };
                const sNode = gNode.subs[details.subGroupCode]; sNode.total += procTotal;

                if (!sNode.forms[details.formCode]) sNode.forms[details.formCode] = { code: details.formCode, name: details.formName, procs: [], total: 0 };
                const fNode = sNode.forms[details.formCode]; fNode.total += procTotal;

                fNode.procs.push({ ...details, unitQuantities, totalQty: procTotal });
            });

            const drawBlock = (title: string, hm: Record<string, any>, startY: number, themeArr: number[]) => {
                const groups = Object.values(hm).sort((a, b) => a.code.localeCompare(b.code));
                if (groups.length === 0) return startY;

                const tableBody: any[] = [];
                groups.forEach(g => {
                    tableBody.push([{ content: `${g.code} - ${g.name}`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: themeArr, textColor: [50, 50, 50] } }, ...options.municipalityUnits.map(() => ''), { content: g.total.toString(), styles: { fontStyle: 'bold', halign: 'center' } }]);
                    const subs = Object.values(g.subs).sort((a: any, b: any) => a.code.localeCompare(b.code));
                    subs.forEach((s: any) => {
                        tableBody.push([{ content: `${s.code} - ${s.name}`, colSpan: 2, styles: { fontStyle: 'bold', cellPadding: { left: 4, top: 1, bottom: 1 }, fillColor: [245, 245, 245] } }, ...options.municipalityUnits.map(() => ''), { content: s.total.toString(), styles: { fontStyle: 'bold', halign: 'center' } }]);
                        const forms = Object.values(s.forms).sort((a: any, b: any) => a.code.localeCompare(b.code));
                        forms.forEach((f: any) => {
                            tableBody.push([{ content: `${f.code} - ${f.name}`, colSpan: 2, styles: { fontStyle: 'italic', cellPadding: { left: 8, top: 1, bottom: 1 }, fillColor: [255, 255, 255] } }, ...options.municipalityUnits.map(() => ''), { content: f.total.toString(), styles: { halign: 'center' } }]);
                            const procs = f.procs.sort((a: any, b: any) => a.procedureCode.localeCompare(b.procedureCode));
                            procs.forEach((p: any) => {
                                tableBody.push([
                                    { content: p.procedureCode, styles: { halign: 'center', fillColor: [255, 255, 255] } },
                                    { content: p.procedureName, styles: { fillColor: [255, 255, 255] } },
                                    ...options.municipalityUnits.map(u => ({ content: p.unitQuantities[u.id] > 0 ? p.unitQuantities[u.id].toString() : '-', styles: { halign: 'center', fillColor: [255, 255, 255] } })),
                                    { content: p.totalQty.toString(), styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 250, 255] } }
                                ]);
                            });
                        });
                    });
                });

                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(title, 5, startY);

                autoTable(doc, {
                    startY: startY + 2,
                    head: [
                        [
                            { content: 'Cód.', styles: { halign: 'center' as const, cellWidth: codCellWidth } },
                            { content: 'Procedimento', styles: { cellWidth: procCellWidth } },
                            ...options.municipalityUnits.map(u => ({ content: u.name.toUpperCase(), styles: { halign: 'center' as const, minCellWidth: unitMinCellWidth, overflow: 'linebreak' as const } })),
                            { content: 'Total', styles: { halign: 'center' as const, fillColor: [224, 255, 255] } }
                        ]
                    ],
                    body: tableBody,
                    theme: 'grid',
                    styles: { fontSize: baseFontSize, cellPadding: { top: 1, right: 0.5, bottom: 1, left: 0.5 }, lineWidth: 0.1, lineColor: 200, overflow: 'linebreak', halign: 'left', valign: 'middle' },
                    headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold', fontSize: headFontSize, cellPadding: 1 },
                    columnStyles: {
                        0: { cellWidth: codCellWidth, halign: 'center' },
                        1: { cellWidth: procCellWidth, halign: 'left' }
                    },
                    didDrawPage: (data) => {
                        drawHeader();
                        doc.setFontSize(8);
                        doc.setTextColor(0, 0, 0);
                        doc.setFont('helvetica', 'italic');
                        doc.text("Gerado Eletronicamente no Sistema de ProBPA/IRB", 5, pageHeight - 5);
                    },
                    margin: { top: 35, bottom: 10, left: 5, right: 5 }
                });

                return (doc as any).lastAutoTable.finalY + 10;
            };

            let currentY = 40;
            currentY = drawBlock("Meta Pactuada (Planejado)", pactHM, currentY, [210, 230, 255]);
            drawBlock("Fora da Meta (Excedentes / Demanda Espontânea)", nonPactHM, currentY, [230, 230, 230]);
        } else {
            // Original Metas render
            autoTable(doc, {
                startY: 40,
                head: head,
                body: body,
                theme: 'grid',
                styles: { fontSize: baseFontSize, cellPadding: { top: 1, right: 0.5, bottom: 1, left: 0.5 }, lineWidth: 0.1, lineColor: 200, overflow: 'linebreak', halign: 'center', valign: 'middle' },
                headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold', fontSize: headFontSize, cellPadding: 1 },
                columnStyles: {
                    0: { cellWidth: codCellWidth, halign: 'center' },
                    1: { cellWidth: procCellWidth, halign: 'left' }
                },
                didDrawPage: (data) => {
                    drawHeader();
                    doc.setFontSize(8);
                    doc.setTextColor(0, 0, 0);
                    doc.setFont('helvetica', 'italic');
                    doc.text("Gerado Eletronicamente no Sistema de ProBPA/IRB", 5, pageHeight - 5);
                },
                margin: { top: 35, bottom: 10, left: 5, right: 5 }
            });
        }

        const fileNameSuffix = (options.startDate && options.endDate)
            ? `${options.startDate}_a_${options.endDate}`
            : options.competence.replace('/', '-');

        const pdfBlobUrl = doc.output('bloburl');
        window.open(pdfBlobUrl, '_blank');
    },

    generateExcel: async (options: UnitComparativeReportOptions) => {
        const { utils, writeFile } = await import('xlsx');
        
        const sheetData: any[][] = [];
        
        const titleDate = (options.startDate && options.endDate)
            ? `de ${options.startDate.split('-').reverse().join('/')} até ${options.endDate.split('-').reverse().join('/')}`
            : `mês de ${options.competence}`;

        const titlePrefix = options.mode === 'procedimentos'
            ? 'Relatório de Produção por Procedimento por Unidade'
            : 'Relatório de Metas de Produção por Unidade';

        sheetData.push([`${titlePrefix}: ${titleDate}`]);
        sheetData.push([options.municipalityName.toUpperCase()]);
        sheetData.push([]); // Empty row

        if (options.mode === 'metas') {
            const headerRow = [
                'Cód.',
                'Procedimento (Meta Global)',
                ...options.municipalityUnits.map(u => u.name),
                'Total Unid.',
                'Meta Mês',
                'Diferença',
                'Meta Anual'
            ];
            sheetData.push(headerRow);

            let grandTotalProd = 0;
            let grandTotalMeta = 0;
            const unitTotals = options.municipalityUnits.map(() => 0);

            options.goals.forEach(goal => {
                const cleanProcKey = goal.procedureCode.replace(/\D/g, '');
                const rowData = options.municipalityUnits.map((unit, i) => {
                    let qty = 0;
                    const unitStats = options.stats[unit.id] || {};
                    Object.keys(unitStats).forEach(actualProcKey => {
                        if (actualProcKey.startsWith(cleanProcKey)) qty += unitStats[actualProcKey];
                    });
                    unitTotals[i] += qty;
                    return qty;
                });

                const totalRowQty = rowData.reduce((sum, q) => sum + q, 0);
                grandTotalProd += totalRowQty;
                grandTotalMeta += (Number(goal.targetQuantity) || 0);

                sheetData.push([
                    goal.procedureCode,
                    goal.procedureName,
                    ...rowData,
                    totalRowQty,
                    goal.targetQuantity,
                    totalRowQty - goal.targetQuantity,
                    goal.targetQuantity * 12
                ]);
            });

            if (options.goals.length === 0) {
                sheetData.push(['Nenhuma meta encontrada.']);
            } else {
                sheetData.push([
                    'Total',
                    '',
                    ...unitTotals,
                    grandTotalProd,
                    grandTotalMeta,
                    grandTotalProd - grandTotalMeta,
                    grandTotalMeta * 12
                ]);
            }
        } 
        
        if (options.mode === 'procedimentos') {
            const headerRow = [
                'Cód.',
                'Procedimento Geral (Consolidado)',
                ...options.municipalityUnits.map(u => u.name),
                'Total Unid.'
            ];
            sheetData.push(headerRow);

            if (options.procedureDetails) {
                const allProcedIds = new Set<string>();
                Object.values(options.stats).forEach(unitRecord => {
                    Object.entries(unitRecord).forEach(([code, qty]) => {
                        if (qty > 0) allProcedIds.add(code);
                    });
                });

                const procArray = Array.from(allProcedIds).sort();
                let tableTotal = 0;
                const unitTotals = options.municipalityUnits.map(() => 0);

                procArray.forEach(code => {
                    const details = options.procedureDetails![code] || { procedureCode: code, procedureName: `PROCEDIMENTO ${code}` };
                    
                    let rowTotal = 0;
                    const rowData = options.municipalityUnits.map((unit, idx) => {
                        const qty = options.stats[unit.id]?.[code] || 0;
                        rowTotal += qty;
                        unitTotals[idx] += qty;
                        return qty;
                    });

                    if (rowTotal > 0) {
                        tableTotal += rowTotal;
                        sheetData.push([
                            details.procedureCode,
                            details.procedureName,
                            ...rowData,
                            rowTotal
                        ]);
                    }
                });

                sheetData.push([
                    'TOTAIS',
                    '',
                    ...unitTotals,
                    tableTotal
                ]);
            }
        }

        const ws = utils.aoa_to_sheet(sheetData);
        // Add auto-filtering and auto column widths if possible
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Comparativo");

        const fileName = `Comparativo_${options.mode === 'procedimentos' ? 'Procedimentos' : 'Metas'}_${options.municipalityName.replace(/\s+/g, '_')}_${options.competence.replace('/', '')}.xlsx`;
        writeFile(wb, fileName);
    }
};
