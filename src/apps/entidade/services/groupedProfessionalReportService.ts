import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { municipalityReportService } from './municipalityReportService';

interface GroupedProfessionalReportMeta {
    competence: string;
    municipalityName: string;
    entityName: string;
    logoUrl?: string;
    logoBase64?: string;
    signatureUrl?: string;
    signatureBase64?: string;
    entityAddress?: string;
    entityCnpj?: string;
    entityCity?: string;
    professional: {
        name: string;
        cns: string;
        role: string;
        unit: string;
    };
}

export const groupedProfessionalReportService = {
    generateGroupedProfessionalPdf: async (records: any[], meta: GroupedProfessionalReportMeta) => {
        try {
            // --- EXCLUDE CANCELED RECORDS ---
            records = records.filter(r => r.status !== 'canceled');

            const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
            const pageWidth = doc.internal.pageSize.getWidth();

            // 1. Logos (Reduced size 40x16, moved a bit right)
            if (meta.logoBase64) {
                try {
                    doc.addImage(meta.logoBase64, 'PNG', pageWidth - 55, 10, 40, 16);
                } catch (e) {
                    console.warn("Could not add Base64 logo to PDF:", e);
                }
            } else if (meta.logoUrl) {
                try {
                    const base64Img = await municipalityReportService.loadImage(meta.logoUrl);
                    if (base64Img) {
                        doc.addImage(base64Img, 'PNG', pageWidth - 55, 10, 40, 16);
                    }
                } catch (e) {
                    console.warn("Could not add URL logo to PDF:", e);
                }
            }

            // 2. Header
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text("Relatório de Produção por Profissional (Agrupado)", 14, 20);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(`Município: ${meta.municipalityName}`, 14, 30);
            doc.text(`Entidade: ${meta.entityName}`, 14, 35);
            doc.text(`Competência: ${meta.competence}`, 14, 40);

            // 3. Professional Info Box
            doc.setDrawColor(200);
            doc.setFillColor(250, 250, 250);
            doc.rect(14, 50, 180, 25, 'FD');

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(`Profissional: ${meta.professional.name}`, 18, 58);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(`CNS: ${meta.professional.cns || 'N/A'}`, 18, 65);
            doc.text(`Cargo/CBO: ${meta.professional.role || 'N/A'}`, 18, 70);

            const unitText = `Unidade: ${meta.professional.unit || 'N/A'}`;
            const unitLines = doc.splitTextToSize(unitText, 70); // Wrap at 70 width
            doc.text(unitLines, 120, 58);

            // 4. Grouping Logic
            // Group by date, then by procedure name
            const groupedData: Record<string, Record<string, { code: string, quantity: number }>> = {};

            records.forEach(r => {
                const date = r.attendanceDate || 'Sem Data';
                const procCode = r.procedureCode || '-';
                const procName = r.procedureName || 'Procedimento Não Identificado';
                const qty = Number(r.quantity) || 1;

                if (!groupedData[date]) {
                    groupedData[date] = {};
                }

                if (!groupedData[date][procName]) {
                    groupedData[date][procName] = {
                        code: procCode,
                        quantity: 0
                    };
                }

                groupedData[date][procName].quantity += qty;
            });

            // Sort dates
            const sortedDates = Object.keys(groupedData).sort((a, b) => {
                const normalizeDate = (d: string) => d.includes('/') ? d.split('/').reverse().join('') : d;
                return normalizeDate(a).localeCompare(normalizeDate(b));
            });

            // 5. Table Body Construction
            const tableBody: any[] = [];
            let totalGeneral = 0;

            sortedDates.forEach(date => {
                // Header for the Date
                tableBody.push([
                    {
                        content: `DATA: ${date}`,
                        colSpan: 3,
                        styles: { fontStyle: 'bold', fillColor: [243, 244, 246], textColor: [31, 41, 55], halign: 'left' }
                    }
                ]);

                const procs = groupedData[date];
                const sortedProcs = Object.keys(procs).sort((a, b) => a.localeCompare(b));

                let totalDate = 0;

                sortedProcs.forEach(procName => {
                    const proc = procs[procName];
                    tableBody.push([
                        proc.code,
                        procName,
                        proc.quantity.toString()
                    ]);
                    totalDate += proc.quantity;
                    totalGeneral += proc.quantity;
                });

                // Footer for the Date
                tableBody.push([
                    {
                        content: 'SUBTOTAL DO DIA:',
                        colSpan: 2,
                        styles: { fontStyle: 'bold', halign: 'right', textColor: [107, 114, 128] }
                    },
                    {
                        content: totalDate.toString(),
                        styles: { fontStyle: 'bold', halign: 'center', textColor: [17, 24, 39] }
                    }
                ]);
            });

            // 6. Generate autotable
            autoTable(doc, {
                startY: 85,
                head: [['CÓDIGO', 'PROCEDIMENTO', 'QTD']],
                body: tableBody,
                theme: 'grid',
                headStyles: {
                    fillColor: [240, 240, 240], // Light Grey
                    textColor: 0,
                    fontSize: 9,
                    fontStyle: 'bold',
                    halign: 'center',
                    lineWidth: 0.1,
                    lineColor: 200
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 30, fontSize: 8 }, // Code
                    1: { halign: 'left', cellWidth: 'auto', fontSize: 8 }, // Name
                    2: { halign: 'center', cellWidth: 30, fontSize: 8, fontStyle: 'bold' } // Qtd
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 3,
                }
            });

            // 7. Grand Total
            let finalY = (doc as any).lastAutoTable.finalY + 10;

            // Allow page break if too close to end
            if (finalY > doc.internal.pageSize.getHeight() - 40) {
                doc.addPage();
                finalY = 20;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(16, 185, 129); // Emerald-500
            doc.text(`PRODUÇÃO TOTAL DA COMPETÊNCIA: ${totalGeneral} PROCEDIMENTOS`, 14, finalY);

            // 8. Signature Block
            finalY += 30;
            if (finalY > doc.internal.pageSize.getHeight() - 50) {
                doc.addPage();
                finalY = 40;
            }

            if (meta.signatureBase64 || meta.signatureUrl) {
                try {
                    let sigBase64 = meta.signatureBase64;
                    if (!sigBase64 && meta.signatureUrl) {
                        sigBase64 = await municipalityReportService.loadImage(meta.signatureUrl);
                    }
                    if (sigBase64) {
                        // Position the signature just above the line
                        doc.addImage(sigBase64, 'PNG', pageWidth / 2 - 25, finalY - 14, 50, 15);
                    }
                } catch (e) {
                    console.warn("Could not add signature to PDF:", e);
                }
            }

            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.line(pageWidth / 2 - 40, finalY, pageWidth / 2 + 40, finalY);
            doc.setFontSize(8);
            doc.setTextColor(0);
            doc.setFont("helvetica", "normal");
            doc.text(meta.professional.name.toUpperCase(), pageWidth / 2, finalY + 3, { align: 'center' });
            doc.setFontSize(7);
            doc.text(`${meta.professional.role || meta.professional.cns || "CNS não informado"}`, pageWidth / 2, finalY + 6.5, { align: 'center' });

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

            const safeName = meta.professional.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            window.open(doc.output('bloburl'), '_blank');

        } catch (error) {
            console.error("Erro ao gerar PDF agrupado:", error);
            throw error;
        }
    },

    generateBatchGroupedProfessionalPdf: async (batchData: {records: any[], meta: GroupedProfessionalReportMeta}[]) => {
        try {
            const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
            let isFirst = true;

            for (const item of batchData) {
                let records = item.records.filter(r => r.status !== 'canceled');
                const meta = item.meta;
                const pageWidth = doc.internal.pageSize.getWidth();

                if (!isFirst) {
                    doc.addPage();
                }
                isFirst = false;

                // 1. Logos
                if (meta.logoBase64) {
                    try {
                        doc.addImage(meta.logoBase64, 'PNG', pageWidth - 55, 10, 40, 16);
                    } catch (e) {}
                } else if (meta.logoUrl) {
                    try {
                        const base64Img = await municipalityReportService.loadImage(meta.logoUrl);
                        if (base64Img) {
                            doc.addImage(base64Img, 'PNG', pageWidth - 55, 10, 40, 16);
                        }
                    } catch (e) {}
                }

                // 2. Header
                doc.setFontSize(16);
                doc.setTextColor(0, 0, 0);
                doc.setFont("helvetica", "bold");
                doc.text("Relatório de Produção por Profissional (Agrupado)", 14, 20);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.text(`Município: ${meta.municipalityName}`, 14, 30);
                doc.text(`Entidade: ${meta.entityName}`, 14, 35);
                doc.text(`Competência: ${meta.competence}`, 14, 40);

                // 3. Professional Info Box
                doc.setDrawColor(200);
                doc.setFillColor(250, 250, 250);
                doc.rect(14, 50, 180, 25, 'FD');

                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.text(`Profissional: ${meta.professional.name}`, 18, 58);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.text(`CNS: ${meta.professional.cns || 'N/A'}`, 18, 65);
                doc.text(`Cargo/CBO: ${meta.professional.role || 'N/A'}`, 18, 70);

                const unitText = `Unidade: ${meta.professional.unit || 'N/A'}`;
                const unitLines = doc.splitTextToSize(unitText, 70);
                doc.text(unitLines, 120, 58);

                // 4. Grouping Logic
                const groupedData: Record<string, Record<string, { code: string, quantity: number }>> = {};

                records.forEach(r => {
                    const date = r.attendanceDate || 'Sem Data';
                    const procCode = r.procedureCode || '-';
                    const procName = r.procedureName || 'Procedimento Não Identificado';
                    const qty = Number(r.quantity) || 1;

                    if (!groupedData[date]) {
                        groupedData[date] = {};
                    }

                    if (!groupedData[date][procName]) {
                        groupedData[date][procName] = {
                            code: procCode,
                            quantity: 0
                        };
                    }

                    groupedData[date][procName].quantity += qty;
                });

                const sortedDates = Object.keys(groupedData).sort((a, b) => {
                    const normalizeDate = (d: string) => d.includes('/') ? d.split('/').reverse().join('') : d;
                    return normalizeDate(a).localeCompare(normalizeDate(b));
                });

                // 5. Table Body Construction
                const tableBody: any[] = [];
                let totalGeneral = 0;

                sortedDates.forEach(date => {
                    tableBody.push([
                        {
                            content: `DATA: ${date}`,
                            colSpan: 3,
                            styles: { fontStyle: 'bold', fillColor: [243, 244, 246], textColor: [31, 41, 55], halign: 'left' }
                        }
                    ]);

                    const procs = groupedData[date];
                    const sortedProcs = Object.keys(procs).sort((a, b) => a.localeCompare(b));

                    let totalDate = 0;

                    sortedProcs.forEach(procName => {
                        const proc = procs[procName];
                        tableBody.push([
                            proc.code,
                            procName,
                            proc.quantity.toString()
                        ]);
                        totalDate += proc.quantity;
                        totalGeneral += proc.quantity;
                    });

                    tableBody.push([
                        {
                            content: 'SUBTOTAL DO DIA:',
                            colSpan: 2,
                            styles: { fontStyle: 'bold', halign: 'right', textColor: [107, 114, 128] }
                        },
                        {
                            content: totalDate.toString(),
                            styles: { fontStyle: 'bold', halign: 'center', textColor: [17, 24, 39] }
                        }
                    ]);
                });

                // 6. Generate autotable
                autoTable(doc, {
                    startY: 85,
                    head: [['CÓDIGO', 'PROCEDIMENTO', 'QTD']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [240, 240, 240],
                        textColor: 0,
                        fontSize: 9,
                        fontStyle: 'bold',
                        halign: 'center',
                        lineWidth: 0.1,
                        lineColor: 200
                    },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 30, fontSize: 8 },
                        1: { halign: 'left', cellWidth: 'auto', fontSize: 8 },
                        2: { halign: 'center', cellWidth: 30, fontSize: 8, fontStyle: 'bold' }
                    },
                    styles: {
                        fontSize: 8,
                        cellPadding: 3,
                    }
                });

                // 7. Grand Total
                let finalY = (doc as any).lastAutoTable.finalY + 10;

                if (finalY > doc.internal.pageSize.getHeight() - 40) {
                    doc.addPage();
                    finalY = 20;
                }

                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.setTextColor(16, 185, 129);
                doc.text(`PRODUÇÃO TOTAL DA COMPETÊNCIA: ${totalGeneral} PROCEDIMENTOS`, 14, finalY);

                // 8. Signature Block
                finalY += 30;
                if (finalY > doc.internal.pageSize.getHeight() - 50) {
                    doc.addPage();
                    finalY = 40;
                }

                if (meta.signatureBase64 || meta.signatureUrl) {
                    try {
                        let sigBase64 = meta.signatureBase64;
                        if (!sigBase64 && meta.signatureUrl) {
                            sigBase64 = await municipalityReportService.loadImage(meta.signatureUrl);
                        }
                        if (sigBase64) {
                            doc.addImage(sigBase64, 'PNG', pageWidth / 2 - 25, finalY - 18, 50, 15);
                        }
                    } catch (e) {}
                }

                doc.setDrawColor(0);
                doc.setLineWidth(0.5);
                doc.line(pageWidth / 2 - 40, finalY, pageWidth / 2 + 40, finalY);
                doc.setFontSize(8);
                doc.setTextColor(0);
                doc.setFont("helvetica", "normal");
                doc.text(meta.professional.name.toUpperCase(), pageWidth / 2, finalY + 4, { align: 'center' });
                doc.setFontSize(7);
                doc.text(`${meta.professional.role || meta.professional.cns || "CNS não informado"}`, pageWidth / 2, finalY + 8, { align: 'center' });
                
                // Apply global footer for THIS professional pages so far? No, better do it at the end for all pages
                // Actually, if we do it at the end to ALL pages, the entity/professional might be different per page?
                // Wait, if it's the SAME unit and SAME entity, the footer is mostly the same except page numbers.
                // We'll apply footer later globally or inside the loop keeping track of start and end page for this prof.
            }
            
            // Apply global footer to all pages now
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                doc.setFontSize(6);
                doc.setTextColor(100);
                
                // We just use the meta from the first item since entity is the same
                const meta = batchData[0].meta;

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

                doc.text(footerLine1, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 12, { align: 'center' });
                doc.text(footerLine2, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
            }

            window.open(doc.output('bloburl'), '_blank');

        } catch (error) {
            console.error("Erro ao gerar PDF agrupado em lote:", error);
            throw error;
        }
    }
};
