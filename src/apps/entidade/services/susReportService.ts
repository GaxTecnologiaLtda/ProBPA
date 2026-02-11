import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { municipalityReportService } from './municipalityReportService';

// SUS Logo Base64 (Standard Header Landscape) - Placeholder/Simplified
const SUS_LOGO_BASE64 = ''; // User to provide or I will implement a text header fallback

interface SusReportOptions {
    competence: string;
    municipalityName: string;
    entityName: string;
    logoUrl?: string;
    logoBase64?: string;
    professional: {
        name: string;
        cns: string;
        role: string;
        cbo: string;
        council?: string;
        unit: string;     // Default/Primary Unit
        unitCnes?: string; // Default/Primary CNES
    }
    signatureUrl?: string;
    signatureBase64?: string;
    // New Footer Fields
    entityAddress?: string;
    entityPhone?: string;
    entityCnpj?: string;
    entityCity?: string;
    entityResponsible?: string;
}

export const susReportService = {

    generateSusProductionPdf: async (records: any[], options: SusReportOptions) => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

        // --- Group Records by Unit ---
        const unitsMap = new Map<string, { cnes: string, name: string, items: any[] }>();

        records.forEach(r => {
            // In production records, we expect unitId or unitName.
            // If manual production, it might use the professional's current assignment if not explicitly stored.
            // We use unitName from record if available, else professional's unit.
            const uName = r.unitName || options.professional.unit || 'Não Identificada';
            // Try to find CNES in record (unitCnes) or fallback to professional's default if names match
            // Note: r.unitCnes might be undefined if not enriched before.
            const uCnes = r.unitCnes || (uName === options.professional.unit ? options.professional.unitCnes : '');

            const key = uName;
            if (!unitsMap.has(key)) {
                unitsMap.set(key, { cnes: uCnes || '', name: uName, items: [] });
            }
            unitsMap.get(key)!.items.push(r);
        });

        // Loop through each unit group
        let isFirstPage = true;

        for (const [unitKey, unitData] of unitsMap.entries()) {

            // Filter records for this unit
            const unitRecords = unitData.items;

            // --- INFO HEADER FUNCTION (REFACTORED for Reusability) ---
            const drawSusHeader = (doc: jsPDF, unitData: any) => {
                const pageWidth = doc.internal.pageSize.width;

                // 1. Entity Logo (Left)
                if (options.logoBase64) {
                    try {
                        doc.addImage(options.logoBase64, 'PNG', 10, 10, 40, 15, undefined, 'FAST');
                    } catch (e) { }
                } else if (options.logoUrl) {
                    // Note: Optimally we load this once outside, but for now relying on cached/base64 passed in options
                }

                // 2. SUS Logo (Right)
                if (SUS_LOGO_BASE64) {
                    try {
                        doc.addImage(SUS_LOGO_BASE64, 'PNG', pageWidth - 50, 10, 40, 15, undefined, 'FAST');
                    } catch (e) { }
                } else {
                    doc.setFontSize(20);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(0, 51, 153);
                    doc.text("SUS", pageWidth - 25, 20, { align: 'center' });
                }

                // 3. Title (Center)
                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text("BOLETIM DIÁRIO DE PRODUÇÃO AMBULATORIAL - BDPA", pageWidth / 2, 20, { align: 'center' });

                // --- DATA BLOCK ---
                let currentY = 35;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');

                // Using specific X coordinates for better alignment
                // Column 1 Labels
                doc.setFont('helvetica', 'bold');
                doc.text(`MUNICÍPIO:`, 14, currentY);
                doc.text(`UNIDADE DE SAÚDE:`, 14, currentY + 5);
                doc.text(`PROFISSIONAL:`, 14, currentY + 10);

                // Column 1 Values (Aligned at X=65)
                doc.setFont('helvetica', 'normal');
                doc.text((options.municipalityName || '').toUpperCase(), 65, currentY);
                doc.text((unitData.name || '').toUpperCase(), 65, currentY + 5);
                doc.text((options.professional.name || '').toUpperCase(), 65, currentY + 10);

                // Column 2 Labels (Aligned at X=PageWidth-80 for more space)
                const rightColLabelX = pageWidth - 80;
                const rightColValueX = pageWidth - 65;

                doc.setFont('helvetica', 'bold');
                doc.text(`CNES:`, rightColLabelX, currentY + 5);
                doc.text(`CBO:`, rightColLabelX, currentY + 10);

                // Column 2 Values
                doc.setFont('helvetica', 'normal');
                doc.text(unitData.cnes || '-', rightColValueX, currentY + 5);
                const cboText = `${options.professional.role || options.professional.cbo}`;
                doc.text(cboText, rightColValueX, currentY + 10);

                // Optional Council
                if (options.professional.council) {
                    doc.text(`CONSELHO: ${options.professional.council}`, rightColLabelX - 40, currentY + 10);
                }

                currentY += 16;

                // Period
                doc.setFillColor(245, 245, 245);
                doc.rect(14, currentY - 5, pageWidth - 28, 7, 'F');
                doc.setFont('helvetica', 'bold');
                doc.text(`PERÍODO: ${options.competence}`, pageWidth / 2, currentY, { align: 'center' });
            };


            if (!isFirstPage) {
                doc.addPage();
            }
            isFirstPage = false;

            // Load Global Images Once if possible (already handled in props or prior steps)
            if (!options.signatureBase64 && options.signatureUrl) {
                try {
                    const loadedSig = await municipalityReportService.loadImage(options.signatureUrl);
                    if (loadedSig) options.signatureBase64 = loadedSig;
                } catch (e) { }
            }

            // DO NOT MANUAL DRAW HEADER. Let autoTable handle it via didDrawPage.
            // But verify: autoTable didDrawPage runs for every page including the first? Yes.
            // We just need to manage `startY`.

            // --- Data Prep for this Unit ---
            unitRecords.sort((a, b) => {
                const dateA = a.attendanceDate || a.productionDate || '';
                const dateB = b.attendanceDate || b.productionDate || '';
                return dateA.localeCompare(dateB);
            });

            // Group by Date for Totals
            const dateGroups = new Map<string, any[]>();
            unitRecords.forEach(r => {
                let rDate = r.attendanceDate || r.productionDate || '';
                if (rDate.includes(' ')) rDate = rDate.split(' ')[0];
                if (!dateGroups.has(rDate)) {
                    dateGroups.set(rDate, []);
                }
                dateGroups.get(rDate)!.push(r);
            });

            const tableBody: any[] = [];

            // Iterate over sorted dates
            Array.from(dateGroups.keys()).sort().forEach(dateKey => {
                const groupRecords = dateGroups.get(dateKey)!;

                // Calculate Daily Total
                const dailyTotal = groupRecords.reduce((sum, r) => sum + (Number(r.quantity) || 1), 0);

                // Add Header Row (Just Date)
                const formattedDate = dateKey.includes('-') ? dateKey.split('-').reverse().join('/') : dateKey;

                tableBody.push([
                    {
                        content: `${formattedDate}`,
                        colSpan: 5,
                        styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] }
                    }
                ]);

                // Rows
                groupRecords.forEach(r => {
                    const code = r.procedureCode || (r.procedure && r.procedure.code) || 'S/C';
                    const name = r.procedureName || (r.procedure && r.procedure.name) || 'PROCEDIMENTO SEM NOME';

                    tableBody.push([
                        r.patientCns || r.patientCpf || '-',
                        (r.patientName || 'NÃO IDENTIFICADO').toUpperCase(),
                        code,
                        (name || '').toUpperCase(),
                        r.quantity || 1
                    ]);
                });

                // Add Footer Row (Daily Total)
                tableBody.push([
                    {
                        content: `TOTAL = ${dailyTotal}`,
                        colSpan: 5,
                        styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] }
                    }
                ]);
            });

            // Use autoTable
            autoTable(doc, {
                startY: 60, // Start below the header space
                head: [['CNS/CPF', 'Paciente', 'Código', 'Descrição do Procedimento', 'Qtd']],
                body: tableBody,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: {
                    fillColor: [220, 220, 220],
                    textColor: 0,
                    fontStyle: 'bold',
                    lineWidth: 0.1,
                    lineColor: 200
                },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 80 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 'auto' },
                    4: { cellWidth: 15, halign: 'center' }
                },
                alternateRowStyles: { fillColor: [255, 255, 255] },
                // FIX: Increase bottom margin to 65 to ensure table stops well before signature
                margin: { top: 60, bottom: 65, left: 14, right: 14 }, // Margin top ensures space for header on all pages
                didDrawPage: (data) => {
                    const pageSize = doc.internal.pageSize;
                    const pageHeight = pageSize.height;
                    const pageWidth = pageSize.width;

                    // ALWAYS DRAW FULL HEADER
                    drawSusHeader(doc, unitData);

                    // --- SIGNATURE BLOCK (Every Page) ---
                    const signatureY = pageHeight - 35; // Fixed position at bottom

                    // Signature Image
                    if (options.signatureBase64 && options.signatureBase64.length > 100) {
                        try {
                            const imgWidth = 40;
                            const imgHeight = 15;
                            doc.addImage(options.signatureBase64, 'PNG', (pageWidth / 2) - (imgWidth / 2), signatureY - 15, imgWidth, imgHeight);
                        } catch (e) { }
                    }

                    // Signature Line
                    doc.setDrawColor(0);
                    doc.setLineWidth(0.5);
                    doc.line((pageWidth / 2) - 40, signatureY, (pageWidth / 2) + 40, signatureY);

                    // Signature Text
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    doc.text((options.professional.name || '').toUpperCase(), pageWidth / 2, signatureY + 4, { align: 'center' });
                    doc.setFontSize(7);
                    doc.text(`${options.professional.role || options.professional.cbo}`, pageWidth / 2, signatureY + 8, { align: 'center' });

                    // Footer
                    doc.setFontSize(6);
                    doc.setTextColor(100);

                    let footerLine1 = `${options.entityName || 'ENTIDADE NÃO IDENTIFICADA'}`;
                    if (options.entityCnpj) footerLine1 += ` - CNPJ: ${options.entityCnpj}`;

                    let footerLine2 = `Gerado via ProBPA - Pág ${(doc as any).internal.getCurrentPageInfo().pageNumber}`;
                    if (options.entityAddress) footerLine2 = `${options.entityAddress} - ${options.entityCity || ''} | ${footerLine2}`;

                    doc.text(footerLine1, pageWidth / 2, pageHeight - 12, { align: 'center' });
                    doc.text(footerLine2, pageWidth / 2, pageHeight - 8, { align: 'center' });
                }
            });
        }

        doc.save(`BDPA_SUS_${options.competence.replace('/', '-')}_${options.professional.name.split(' ')[0]}.pdf`);
    }
};
