import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { municipalityReportService } from './municipalityReportService';

const SUS_LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAFVBMVEVHcEw+QJU+QJU+QJU+QJU+QJU+QJW/nn/gAAAABnRSTlMAfT7FE6a2Lr+ZAAADxklEQVR42u2aS1ebQBiGh4tZgx5ZI21Zq6SsSXPM2jY9rgWS+f8/ocrNGZibaIe0eZ+VMgEe3oGZj0kIAQAAAAAAAAAAAAAAAAAAAAAAAAAAn8xVNuHOqkBEJ9QQgAAEIAABCEAAAhCAAAQgAAEIQAACEIDAeQnchFPI/0wyl0J1uEJzOqb9RxKG+4y+n0Bw+G99Y0yI1yyytp9yKS2b9pzfeZWFl/GgFl5n2ccEtpQRWDGf6gQexjs3n6m/h5fJcIyLDwi4VC3gUqFA96Rld2GYJF/J03yBSCOQqgSGPS9mC7hULeBSE4GK5HMFds3m3/2/EwGv2bBmdxEI0Hg7VyDiB82JQNtDhU6g8vN5An6ztZQL5Hy7TMA4gkB4C1RSgXG7VOBgGMFYwNEkMG6XCtTF9gMCb30sFqCxVoCuzSKQCNxrBCq9gGEEEgF6FysFaBnrBAwjkAlQ+rOQ34SNYqERMItA/Bg2HAvRY8icIFYLmEUwGYiYfUqRwBPfrhKoyXbuSNjxKBBI2UtUC9BHgwgmAh7lLlEyF3SdpBE4GkSgnA1fhoOJgE/56VIlYBKBsh546QNlPfDaR0oBgwiUFRF9FlVEzEUdNAIGEQhqwge2rhDUhBu2XSOgj0BUFW/2SgHi7PkHcaU6vi6CQFj3u1f9CUQCL39ds4+BSqDURRBIXj2+KAX62r3WCmgjkAn4GoH2sAYClSYCmUD7tMkF2nYDAV0EUoFdK+DxAqNa7WggoIlAKrBqBdrp+bafqit+yC4NBDQRqLvgwBWp3uvIxCVUmQioI5AKPHVXnr/ViFE/9g4j9q2JAI39GQIP/WQTDTWiwxajDrO3TqDi5g+dQLu2c53391g3/f4iN3lz12+Y9poYCdDYnVmQrMfT84GfDCtDgYMiAqVAPNyNbxvSSTmgF1BFoBK4H9XJzRWn48nYREBxFygEyoKdFvoyOOWrZjMBWrjvFxiO73eb6oDrkWNMzAXW0ggC2QpnwkxMV8wJN137pbiOlVXohZuJCYyWIf0kSZTNYaaN4O+vlYb7XBWBlQVb/3WZUqyxdiwuVifNui3fK/XG8nJ9Vzwyq9LREgIsFzYFRN+XuDYF0lMU8JcWIHRZAbq8QG5RYHWSAtG5C8SLC6QWBTyhQLGwwC5eViBYnZOAIxLwzl3g1jknAfcUBZ7dxQUCewJEuE6ysEBlVSA/QYGSWLwJRT9iKa2+COLHdMIXA5vsRCWRTYHV0gLee74asDYfn5WAaGHUqgAAAAAAAAAAAAAAAAAAAAAAAAAAwL/HHxczmFYWNlJzAAAAAElFTkSuQmCC';

export interface FinancialEvolutionReportOptions {
    year: string;
    startDate?: string;
    endDate?: string;
    reportMonths: { key: string, label: string }[];
    municipalityName: string;
    entityName: string;
    logoBase64?: string;
    logoUrl?: string;
    goals: any[];
    stats: Record<string, Record<string, number>>; // monthKey -> { procedureCode -> qty }
}

const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];


const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const financialEvolutionReportService = {

    generatePdf: async (options: FinancialEvolutionReportOptions) => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for many columns
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
            if (logoData) {
                try {
                    doc.addImage(logoData, 'PNG', 5, 5, 30, 20, undefined, 'FAST');
                } catch (e) {}
            }
            if (SUS_LOGO_BASE64) {
                try { doc.addImage(SUS_LOGO_BASE64, 'PNG', pageWidth - 25, 5, 20, 20, undefined, 'FAST'); } catch (e) {}
            } else {
                doc.setFontSize(24);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 51, 153);
                doc.text("SUS", pageWidth - 10, 20, { align: 'right' });
            }

            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(`Relatório de Evolução Financeira - Série Histórica ${options.year}`, pageWidth / 2, 20, { align: 'center' });

            doc.setFontSize(16);
            doc.text((options.municipalityName || 'MUNICÍPIO NÃO INFORMADO').toUpperCase(), pageWidth / 2, 28, { align: 'center' });

            if (options.startDate && options.endDate) {
                doc.setFontSize(9);
                doc.setTextColor(150, 0, 0);
                doc.text(`Nota: A contagem cobre rigorosamente do dia ${options.startDate.split('-').reverse().join('/')} até ${options.endDate.split('-').reverse().join('/')}.`, pageWidth / 2, 34, { align: 'center' });
            }
        };

        const head: any[] = [
            [
                { content: 'Cód.', styles: { halign: 'center' as const, cellWidth: 14 } },
                { content: 'Procedimento (Meta)', styles: { cellWidth: 46 } },
                ...options.reportMonths.map(m => ({ content: m.label, styles: { halign: 'center' as const, cellWidth: 'auto' } })),
                { content: 'Valor Unitário', styles: { halign: 'center' as const, cellWidth: 20 } },
                { content: 'Total Alcançado (R$)', styles: { halign: 'center' as const, cellWidth: 24, fillColor: [224, 255, 255] } }
            ]
        ];

        const body: any[] = [];
        options.goals.forEach(goal => {
            const cleanProcKey = goal.procedureCode.replace(/\D/g, '');
            
            let totalAnual = 0;
            const monthlyData = [];

                for (const rm of options.reportMonths) {
                const monthKey = rm.key;
                let monthQty = 0;
                
                const monthStats = options.stats[monthKey] || {};
                Object.keys(monthStats).forEach(actualProcKey => {
                    const cleanActualProcKey = actualProcKey.replace(/\D/g, '');
                    if (cleanActualProcKey.startsWith(cleanProcKey)) {
                        monthQty += monthStats[actualProcKey];
                    }
                });
                
                totalAnual += monthQty;
                monthlyData.push(monthQty);
            }

            const metaAnual = goal.annualTargetQuantity || ((goal.targetQuantity || 0) * 12);
            const percentual = metaAnual > 0 ? ((totalAnual / metaAnual) * 100).toFixed(1) + '%' : '0%';
            const percentualNum = metaAnual > 0 ? (totalAnual / metaAnual) * 100 : 0;
            const falta = Math.max(0, metaAnual - totalAnual);

            let percentColor = [0, 0, 0];
            let percentFillColor = [255, 255, 255];
            if (percentualNum >= 100) {
                percentColor = [0, 100, 0];
                percentFillColor = [245, 255, 245];
            } else if (percentualNum >= 80) {
                percentColor = [0, 0, 200];
                percentFillColor = [245, 245, 255];
            } else {
                percentColor = [200, 0, 0];
                percentFillColor = [255, 240, 240];
            }

            body.push([
                { content: goal.procedureCode, styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [240, 240, 240] } },
                { content: goal.procedureName, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
                ...monthlyData.map(q => ({ content: q > 0 ? q.toString() : '-', styles: { halign: 'center' as const } })),
                { content: formatCurrency(goal.unitValue || 0), styles: { halign: 'center' as const } },
                { content: formatCurrency(totalAnual * (goal.unitValue || 0)), styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [230, 250, 255] } }
            ]);
        });

        if (options.goals.length === 0) {
            body.push([{ content: 'Nenhuma meta encontrada.', colSpan: 18, styles: { halign: 'center' as const } }]);
        } else {
            const footerRow: any[] = [
                { content: 'TOTAL', colSpan: 2, styles: { halign: 'right' as const, fontStyle: 'bold', fillColor: [186, 218, 255] } },
            ];

            let grandTotalAnual = 0;
            let grandMetaAnual = 0;
            
            const monthlyTotals = Array(options.reportMonths.length).fill(0);
            
            options.goals.forEach(goal => {
                const cleanProcKey = goal.procedureCode.replace(/\D/g, '');
                grandMetaAnual += goal.annualTargetQuantity || ((goal.targetQuantity || 0) * 12);
                
                for (let i = 0; i < options.reportMonths.length; i++) {
                    const monthKey = options.reportMonths[i].key;
                    const monthStats = options.stats[monthKey] || {};
                    Object.keys(monthStats).forEach(actualProcKey => {
                        const cleanActualProcKey = actualProcKey.replace(/\D/g, '');
                        if (cleanActualProcKey.startsWith(cleanProcKey)) {
                            monthlyTotals[i] += monthStats[actualProcKey] * (goal.unitValue || 0);
                            grandTotalAnual += monthStats[actualProcKey] * (goal.unitValue || 0);
                        }
                    });
                }
            });

            monthlyTotals.forEach(q => {
                footerRow.push({ content: q > 0 ? q.toString() : '-', styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [186, 218, 255] } } as any);
            });

            footerRow.push({ content: '-', styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [186, 218, 255] } } as any);
            footerRow.push({ content: formatCurrency(grandTotalAnual), styles: { halign: 'center' as const, fontStyle: 'bold', fillColor: [186, 218, 255] } } as any);

            body.push(footerRow);
        }

        autoTable(doc, {
            startY: 40,
            head: head,
            body: body,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: { top: 2, right: 1, bottom: 2, left: 1 }, lineWidth: 0.1, lineColor: 200, overflow: 'linebreak', halign: 'center', valign: 'middle' },
            headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 14, halign: 'center' },
                1: { cellWidth: 46, halign: 'left' }
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

        window.open(doc.output('bloburl').toString(), '_blank');
    },

    generateExcel: async (options: FinancialEvolutionReportOptions) => {
        const { utils, writeFile } = await import('xlsx');
        const sheetData: any[][] = [];
        
        sheetData.push([`Relatório de Evolução Financeira - Série Histórica ${options.year}`]);
        sheetData.push([options.municipalityName.toUpperCase()]);
        if (options.startDate && options.endDate) {
            sheetData.push([`Nota: A contagem cobre rigorosamente do dia ${options.startDate.split('-').reverse().join('/')} até ${options.endDate.split('-').reverse().join('/')}.`]);
        }
        sheetData.push([]);

        const headerRow = [
            'Cód.',
            'Procedimento (Meta Global)',
            ...options.reportMonths.map(m => m.label),
            'Valor Unitário (R$)',
            'Total Alcançado (R$)'
        ];
        sheetData.push(headerRow);

        let grandTotalAnual = 0;
        let grandMetaAnual = 0;
        const monthlyTotals = Array(options.reportMonths.length).fill(0);

        options.goals.forEach(goal => {
            const cleanProcKey = goal.procedureCode.replace(/\D/g, '');
            const monthlyData = [];
            let totalAnual = 0;

            for (let i = 0; i < options.reportMonths.length; i++) {
                const monthKey = options.reportMonths[i].key;
                let monthQty = 0;
                
                const monthStats = options.stats[monthKey] || {};
                Object.keys(monthStats).forEach(actualProcKey => {
                    const cleanActualProcKey = actualProcKey.replace(/\D/g, '');
                    if (cleanActualProcKey.startsWith(cleanProcKey)) {
                        monthQty += monthStats[actualProcKey];
                    }
                });
                
                totalAnual += monthQty;
                monthlyTotals[i] += monthQty;
                monthlyData.push(monthQty);
            }

            const metaAnual = goal.annualTargetQuantity || ((goal.targetQuantity || 0) * 12);
            grandTotalAnual += totalAnual;
            grandMetaAnual += metaAnual;

            const percentualNum = metaAnual > 0 ? (totalAnual / metaAnual) * 100 : 0;
            const falta = Math.max(0, metaAnual - totalAnual);

            sheetData.push([
                goal.procedureCode,
                goal.procedureName,
                ...monthlyData,
                goal.unitValue || 0,
                totalAnual * (goal.unitValue || 0)
            ]);
        });

        if (options.goals.length === 0) {
            sheetData.push(['Nenhuma meta encontrada.']);
        } else {
            const overallPercentual = grandMetaAnual > 0 ? (grandTotalAnual / grandMetaAnual) * 100 : 0;
            const overallFalta = Math.max(0, grandMetaAnual - grandTotalAnual);

            sheetData.push([
    'TOTAL',
    '',
    ...monthlyTotals,
    grandTotalAnual
]);
        }

        const ws = utils.aoa_to_sheet(sheetData);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Evolução Financeira");
        
        writeFile(wb, `Evolucao_Financeira_${options.municipalityName.replace(/\s+/g, '_')}_${options.year}.xlsx`);
    }
};
