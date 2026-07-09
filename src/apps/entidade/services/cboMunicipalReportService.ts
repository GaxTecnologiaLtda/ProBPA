import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { municipalityReportService } from './municipalityReportService';

export interface CboMunicipalReportMeta {
    competence: string;
    municipalityName: string;
    entityName: string;
    logoUrl?: string;
    logoBase64?: string;
    entityAddress?: string;
    entityCnpj?: string;
    entityCity?: string;
}

export interface CboMunicipalUnitData {
    unitId: string;
    unitName: string;
    totalQuantity: number;
    cbos: {
        code: string;
        name: string;
        quantity: number;
    }[];
}

export const cboMunicipalReportService = {
    generateCboMunicipalPdf: async (data: CboMunicipalUnitData[], meta: CboMunicipalReportMeta) => {
        try {
            const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
            const pageWidth = doc.internal.pageSize.getWidth();

            // 1. Logos
            if (meta.logoBase64) {
                try {
                    doc.addImage(meta.logoBase64, 'PNG', 14, 10, 40, 16);
                } catch (e) {
                    console.warn("Could not add Base64 logo to PDF:", e);
                }
            } else if (meta.logoUrl) {
                try {
                    const base64Img = await municipalityReportService.loadImage(meta.logoUrl);
                    if (base64Img) {
                        doc.addImage(base64Img, 'PNG', 14, 10, 40, 16);
                    }
                } catch (e) {
                    console.warn("Could not add URL logo to PDF:", e);
                }
            }

            // 2. Headings (Centered as in the request image)
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            
            let startY = 15;
            
            // If there's a logo on the left, we can center text or push it right. The image shows the logo on the left and text centered.
            // Let's do completely centered for the text block.
            doc.text("RELATÓRIO DE PRODUÇÃO", pageWidth / 2, startY, { align: 'center' });
            startY += 5;
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`COMPETÊNCIA: ${meta.competence}`, pageWidth / 2, startY, { align: 'center' });
            startY += 5;
            doc.text(`${meta.municipalityName.toUpperCase()}`, pageWidth / 2, startY, { align: 'center' });
            startY += 10;

            // 3. Table Construction
            const tableBody: any[] = [];
            let totalGeneral = 0;

            if (data.length === 0) {
                 tableBody.push([{ content: 'Nenhuma produção encontrada para os filtros selecionados.', colSpan: 2, styles: { halign: 'center' } }]);
            }

            data.forEach(unit => {
                totalGeneral += unit.totalQuantity;

                // Unit Header (Gray Band)
                tableBody.push([
                    {
                        content: `${unit.unitName.toUpperCase()}`,
                        colSpan: 2,
                        styles: { fontStyle: 'bold', fillColor: [156, 163, 175], textColor: [0, 0, 0], halign: 'center', cellPadding: 2 }
                    }
                ]);

                if (unit.cbos.length === 0) {
                     tableBody.push([
                         { content: 'Unidade sem produção', colSpan: 2, styles: { halign: 'center', textColor: [100, 100, 100], fontStyle: 'italic' } }
                     ]);
                } else {
                    unit.cbos.forEach(cbo => {
                        tableBody.push([
                            `${cbo.code} - ${cbo.name}`,
                            cbo.quantity.toString()
                        ]);
                    });

                    // Unit Footer (Total)
                    tableBody.push([
                        {
                            content: 'Produção total da unidade',
                            styles: { fontStyle: 'bold', halign: 'left', fillColor: [209, 213, 219], textColor: [31, 41, 55] }
                        },
                        {
                            content: unit.totalQuantity.toString(),
                            styles: { fontStyle: 'bold', halign: 'right', fillColor: [209, 213, 219], textColor: [17, 24, 39] }
                        }
                    ]);
                }
            });

            if (data.length > 0) {
                tableBody.push([
                    {
                        content: 'PRODUÇÃO TOTAL GERAL',
                        styles: { fontStyle: 'bold', halign: 'left', fillColor: [75, 85, 99], textColor: [255, 255, 255] }
                    },
                    {
                        content: totalGeneral.toString(),
                        styles: { fontStyle: 'bold', halign: 'right', fillColor: [75, 85, 99], textColor: [255, 255, 255], fontSize: 10 }
                    }
                ]);
            }

            // 4. Generate autotable
            autoTable(doc, {
                startY: startY,
                body: tableBody,
                theme: 'plain',
                styles: {
                    fontSize: 9,
                    cellPadding: 2,
                    lineColor: [0, 0, 0],
                    lineWidth: 0.1,
                    textColor: [0, 0, 0]
                },
                columnStyles: {
                    0: { halign: 'left', cellWidth: 'auto' },
                    1: { halign: 'right', cellWidth: 30 }
                },
                margin: { left: 14, right: 14 }
            });

            // 5. Grand Total (Optional, but good to have)
            // let finalY = (doc as any).lastAutoTable.finalY + 10;
            // doc.setFont("helvetica", "bold");
            // doc.setFontSize(11);
            // doc.text(`PRODUÇÃO TOTAL DO MUNICÍPIO: ${totalGeneral}`, 14, finalY);

            // Apply global footer
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                doc.setFontSize(6);
                doc.setTextColor(100);

                let footerLine1 = `${meta.entityName || 'ENTIDADE NÃO IDENTIFICADA'}`;
                if (meta.entityCnpj) footerLine1 += ` - CNPJ: ${meta.entityCnpj}`;

                let footerLine2 = `Gerado via ProBPA - Pág ${i}`;
                if (meta.entityAddress) {
                    footerLine2 = `${meta.entityAddress}`;
                    if (meta.entityCity) {
                        footerLine2 += ` - ${meta.entityCity}`;
                    }
                    footerLine2 += ` | Gerado via ProBPA - Pág ${i}`;
                }

                doc.text(footerLine1, pageWidth / 2, doc.internal.pageSize.getHeight() - 12, { align: 'center' });
                doc.text(footerLine2, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
            }

            // 6. Output to new tab
            const pdfBlobUrl = doc.output('bloburl');
            window.open(pdfBlobUrl, '_blank');

        } catch (error) {
            console.error("Erro ao gerar PDF CBO Municipal:", error);
            throw error;
        }
    }
};
