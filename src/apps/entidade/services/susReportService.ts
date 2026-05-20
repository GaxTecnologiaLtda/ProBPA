import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { municipalityReportService, resolveSigtapCode, formatCpfOrCns, getFormattedCpfOrCns } from './municipalityReportService';

const SUS_LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAFVBMVEVHcEw+QJU+QJU+QJU+QJU+QJU+QJW/nn/gAAAABnRSTlMAfT7FE6a2Lr+ZAAADxklEQVR42u2aS1ebQBiGh4tZgx5ZI21Zq6SsSXPM2jY9rgWS+f8/ocrNGZibaIe0eZ+VMgEe3oGZj0kIAQAAAAAAAAAAAAAAAAAAAAAAAAAAn8xVNuHOqkBEJ9QQgAAEIAABCEAAAhCAAAQgAAEIQAACEIDAeQnchFPI/0wyl0J1uEJzOqb9RxKG+4y+n0Bw+G99Y0yI1yyytp9yKS2b9pzfeZWFl/GgFl5n2ccEtpQRWDGf6gQexjs3n6m/h5fJcIyLDwi4VC3gUqFA96Rld2GYJF/J03yBSCOQqgSGPS9mC7hULeBSE4GK5HMFds3m3/2/EwGv2bBmdxEI0Hg7VyDiB82JQNtDhU6g8vN5An6ztZQL5Hy7TMA4gkB4C1RSgXG7VOBgGMFYwNEkMG6XCtTF9gMCb30sFqCxVoCuzSKQCNxrBCq9gGEEEgF6FysFaBnrBAwjkAlQ+rOQ34SNYqERMItA/Bg2HAvRY8icIFYLmEUwGYiYfUqRwBPfrhKoyXbuSNjxKBBI2UtUC9BHgwgmAh7lLlEyF3SdpBE4GkSgnA1fhoOJgE/56VIlYBKBsh546QNlPfDaR0oBgwiUFRF9FlVEzEUdNAIGEQhqwge2rhDUhBu2XSOgj0BUFW/2SgHi7PkHcaU6vi6CQFj3u1f9CUQCL39ds4+BSqDURRBIXj2+KAX62r3WCmgjkAn4GoH2sAYClSYCmUD7tMkF2nYDAV0EUoFdK+DxAqNa7WggoIlAKrBqBdrp+bafqit+yC4NBDQRqLvgwBWp3uvIxCVUmQioI5AKPHVXnr/ViFE/9g4j9q2JAI39GQIP/WQTDTWiwxajDrO3TqDi5g+dQLu2c53391g3/f4iN3lz12+Y9poYCdDYnVmQrMfT84GfDCtDgYMiAqVAPNyNbxvSSTmgF1BFoBK4H9XJzRWn48nYREBxFygEyoKdFvoyOOWrZjMBWrjvFxiO73eb6oDrkWNMzAXW0ggC2QpnwkxMV8wJN137pbiOlVXohZuJCYyWIf0kSZTNYaaN4O+vlYb7XBWBlQVb/3WZUqyxdiwuVifNui3fK/XG8nJ9Vzwyq9LREgIsFzYFRN+XuDYF0lMU8JcWIHRZAbq8QG5RYHWSAtG5C8SLC6QWBTyhQLGwwC5eViBYnZOAIxLwzl3g1jknAfcUBZ7dxQUCewJEuE6ysEBlVSA/QYGSWLwJRT9iKa2+COLHdMIXA5vsRCWRTYHV0gLee74asDYfn5WAaGHUqgAAAAAAAAAAAAAAAAAAAAAAAAAAwL/HHxczmFYWNlJzAAAAAElFTkSuQmCC';

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

export interface ActionSusReportOptions {
    competence: string;
    municipalityName: string;
    entityName: string;
    actionName: string;
    logoUrl?: string;
    logoBase64?: string;
    professionals: {
        name: string;
        cns: string;
        role: string;
        cbo: string;
        unit: string;
        signatureUrl?: string;
        signatureBase64?: string;
    }[];
    entityAddress?: string;
    entityPhone?: string;
    entityCnpj?: string;
    entityCity?: string;
    entityResponsible?: string;
}


export const susReportService = {

    generateSusProductionPdf: async (records: any[], options: SusReportOptions) => {
        // --- EXCLUDE CANCELED RECORDS ---
        records = records.filter(r => r.status !== 'canceled');

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

                if (SUS_LOGO_BASE64) {
                    try {
                        // FIX: SUS Logo size increased further (previously 26x18, now 34x24)
                        doc.addImage(SUS_LOGO_BASE64, 'PNG', pageWidth - 44, 8, 34, 24, undefined, 'FAST');
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
                // Reverted back to unit name for the Global Report per user request
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
                const cboLines = doc.splitTextToSize(`${options.professional.role || options.professional.cbo}`, 60);
                doc.text(cboLines, rightColValueX, currentY + 10);

                // Optional Council
                if (options.professional.council) {
                    doc.text(`CONSELHO: ${options.professional.council}`, rightColLabelX - 40, currentY + 10);
                }

                // Adjust Y based on CBO lines
                currentY += 16 + (Math.max(0, cboLines.length - 1) * 4);

                // Period hidden to prevent overlap with DATA DA PRODUÇÃO
                // doc.setFillColor(245, 245, 245);
                // doc.rect(14, currentY - 5, pageWidth - 28, 7, 'F');
                // doc.setFont('helvetica', 'bold');
                // doc.text(`PERÍODO: ${options.competence}`, pageWidth / 2, currentY, { align: 'center' });
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
                const normalizeDate = (d: string) => d.includes('/') ? d.split('/').reverse().join('') : d;
                return normalizeDate(dateA).localeCompare(normalizeDate(dateB));
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

            let currentTableY = 68; // Start below the dynamic Period rectangle
            const drawnPages = new Set<string>();

            Array.from(dateGroups.keys()).forEach((dateKey, index) => {
                const groupRecords = dateGroups.get(dateKey)!;

                // Sort alphabetically by patient name
                groupRecords.sort((a, b) => {
                    const nameA = (a.patientName || a.patient?.name || 'NÃO IDENTIFICADO').toUpperCase();
                    const nameB = (b.patientName || b.patient?.name || 'NÃO IDENTIFICADO').toUpperCase();
                    return nameA.localeCompare(nameB);
                });

                // Calculate Daily Total
                const dailyTotal = groupRecords.reduce((sum, r) => sum + (Number(r.quantity) || 1), 0);
                const formattedDate = dateKey.includes('-') ? dateKey.split('-').reverse().join('/') : dateKey;

                const tableBody: any[] = [];

                // Rows
                groupRecords.forEach(r => {
                    const resolved = resolveSigtapCode(r);
                    const code = resolved ? resolved.code : (r.procedureCode || (r.procedure && r.procedure.code) || 'S/C');
                    const name = resolved ? resolved.name : (r.procedureName || (r.procedure && r.procedure.name) || 'PROCEDIMENTO SEM NOME');

                    // FORCE robust document extraction for the PDF
                    const docDisplay = getFormattedCpfOrCns(r);

                    tableBody.push([
                        docDisplay,
                        (r.patientName || r.patient?.name || 'NÃO IDENTIFICADO').toUpperCase(),
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

                // Check if we need to manually add page before drawing Date title to avoid orphan titles at bottom
                if (currentTableY > doc.internal.pageSize.height - 65 && index > 0) {
                     doc.addPage();
                     currentTableY = 68;
                } else if (index > 0) {
                     currentTableY += 4; // Add a small gap between tables
                }

                // Draw Date Header OUTSIDE the table
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(`DATA DA PRODUÇÃO: ${formattedDate}`, doc.internal.pageSize.width / 2, currentTableY, { align: 'center' });

                // Use autoTable for this group
                autoTable(doc, {
                    startY: currentTableY + 4,
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
                    // Adjusted margins to fit more records and fit nicely below the new header
                    margin: { top: 73, bottom: 40, left: 14, right: 14 }, 
                    didDrawPage: (data) => {
                        const pageSize = doc.internal.pageSize;
                        const pageHeight = pageSize.height;
                        const pageWidth = pageSize.width;
                        const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
                        const pageId = `${unitData.cnes || unitData.name}-${pageNum}`;

                        // Evitar desenhar o cabeçalho master múltiplas vezes na mesma página (já que chamamos autoTable várias vezes)
                        if (!drawnPages.has(pageId)) {
                             drawnPages.add(pageId);
                             
                             // ALWAYS DRAW FULL HEADER
                             drawSusHeader(doc, unitData);

                             // --- SIGNATURE BLOCK ---
                             const signatureY = pageHeight - 22; // Moved lower

                             // Signature Image
                             if (options.signatureBase64 && options.signatureBase64.length > 100) {
                                  try {
                                       const imgWidth = 40;
                                       const imgHeight = 15;
                                       doc.addImage(options.signatureBase64, 'PNG', (pageWidth / 2) - (imgWidth / 2), signatureY - 14, imgWidth, imgHeight);
                                  } catch (e) { }
                             }

                             // NOTE: Removed `doc.line` drawing for the signature line per user request

                             // Signature Text
                             doc.setFontSize(8);
                             doc.setFont('helvetica', 'normal');
                             doc.setTextColor(0, 0, 0);
                             doc.text((options.professional.name || '').toUpperCase(), pageWidth / 2, signatureY + 3, { align: 'center' });
                             doc.setFontSize(7);
                             doc.text(`${options.professional.role || options.professional.cbo}`, pageWidth / 2, signatureY + 6.5, { align: 'center' });

                             // Footer
                             doc.setFontSize(6);
                             doc.setTextColor(100);

                             let footerLine1 = `${options.entityName || 'ENTIDADE NÃO IDENTIFICADA'}`;
                             if (options.entityCnpj) footerLine1 += ` - CNPJ: ${options.entityCnpj}`;

                             let footerLine2 = `Gerado via ProBPA - Pág ${pageNum}`;
                             if (options.entityAddress) footerLine2 = `${options.entityAddress} - ${options.entityCity || ''} | ${footerLine2}`;

                             doc.text(footerLine1, pageWidth / 2, pageHeight - 12, { align: 'center' });
                             doc.text(footerLine2, pageWidth / 2, pageHeight - 8, { align: 'center' });
                        }

                        // Se a sub-tabela cruzar múltiplas páginas, reinserir a sub-título de Data no topo
                        if (data.pageNumber > 1) {
                             doc.setFontSize(11);
                             doc.setFont('helvetica', 'bold');
                             doc.setTextColor(0, 0, 0);
                             doc.text(`DATA DA PRODUÇÃO: ${formattedDate}`, pageWidth / 2, 68, { align: 'center' });
                        }
                    }
                });

                currentTableY = (doc as any).lastAutoTable.finalY + 4;
            });
        }

        window.open(doc.output('bloburl'), '_blank');
    },

    generateBatchSusProductionPdf: async (batchData: {records: any[], options: SusReportOptions}[]) => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
        let isOverallFirstPage = true;

        for (const item of batchData) {
            let records = item.records.filter(r => r.status !== 'canceled');
            const options = item.options;

            // --- Group Records by Unit ---
            const unitsMap = new Map<string, { cnes: string, name: string, items: any[] }>();

            records.forEach(r => {
                const uName = r.unitName || options.professional.unit || 'Não Identificada';
                const uCnes = r.unitCnes || (uName === options.professional.unit ? options.professional.unitCnes : '');

                const key = uName;
                if (!unitsMap.has(key)) {
                    unitsMap.set(key, { cnes: uCnes || '', name: uName, items: [] });
                }
                unitsMap.get(key)!.items.push(r);
            });

            // Loop through each unit group
            for (const [unitKey, unitData] of unitsMap.entries()) {
                const unitRecords = unitData.items;

                const drawSusHeader = (doc: jsPDF, unitData: any) => {
                    const pageWidth = doc.internal.pageSize.width;

                    if (options.logoBase64) {
                        try { doc.addImage(options.logoBase64, 'PNG', 10, 10, 40, 15, undefined, 'FAST'); } catch (e) { }
                    }

                    if (SUS_LOGO_BASE64) {
                        try {
                            doc.addImage(SUS_LOGO_BASE64, 'PNG', pageWidth - 44, 8, 34, 24, undefined, 'FAST');
                        } catch (e) { }
                    } else {
                        doc.setFontSize(20);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(0, 51, 153);
                        doc.text("SUS", pageWidth - 25, 20, { align: 'center' });
                    }

                    doc.setFontSize(14);
                    doc.setTextColor(0, 0, 0);
                    doc.setFont('helvetica', 'bold');
                    doc.text("BOLETIM DIÁRIO DE PRODUÇÃO AMBULATORIAL - BDPA", pageWidth / 2, 20, { align: 'center' });

                    let currentY = 35;
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');

                    doc.setFont('helvetica', 'bold');
                    doc.text(`MUNICÍPIO:`, 14, currentY);
                    doc.text(`UNIDADE DE SAÚDE:`, 14, currentY + 5);
                    doc.text(`PROFISSIONAL:`, 14, currentY + 10);

                    doc.setFont('helvetica', 'normal');
                    doc.text((options.municipalityName || '').toUpperCase(), 65, currentY);
                    doc.text((unitData.name || '').toUpperCase(), 65, currentY + 5);
                    doc.text((options.professional.name || '').toUpperCase(), 65, currentY + 10);

                    const rightColLabelX = pageWidth - 80;
                    const rightColValueX = pageWidth - 65;

                    doc.setFont('helvetica', 'bold');
                    doc.text(`CNES:`, rightColLabelX, currentY + 5);
                    doc.text(`CBO:`, rightColLabelX, currentY + 10);

                    doc.setFont('helvetica', 'normal');
                    doc.text(unitData.cnes || '-', rightColValueX, currentY + 5);
                    const cboLines = doc.splitTextToSize(`${options.professional.role || options.professional.cbo}`, 60);
                    doc.text(cboLines, rightColValueX, currentY + 10);

                    if (options.professional.council) {
                        doc.text(`CONSELHO: ${options.professional.council}`, rightColLabelX - 40, currentY + 10);
                    }

                    currentY += 16 + (Math.max(0, cboLines.length - 1) * 4);
                    // Period hidden to prevent overlap with DATA DA PRODUÇÃO
                    // doc.setFillColor(245, 245, 245);
                    // doc.rect(14, currentY - 5, pageWidth - 28, 7, 'F');
                    // doc.setFont('helvetica', 'bold');
                    // doc.text(`PERÍODO: ${options.competence}`, pageWidth / 2, currentY, { align: 'center' });
                };


                if (!isOverallFirstPage) {
                    doc.addPage();
                }
                isOverallFirstPage = false;

                if (!options.signatureBase64 && options.signatureUrl) {
                    try {
                        const loadedSig = await municipalityReportService.loadImage(options.signatureUrl);
                        if (loadedSig) options.signatureBase64 = loadedSig;
                    } catch (e) { }
                }

                unitRecords.sort((a, b) => {
                    const dateA = a.attendanceDate || a.productionDate || '';
                    const dateB = b.attendanceDate || b.productionDate || '';
                    const normalizeDate = (d: string) => d.includes('/') ? d.split('/').reverse().join('') : d;
                    return normalizeDate(dateA).localeCompare(normalizeDate(dateB));
                });

                const dateGroups = new Map<string, any[]>();
                unitRecords.forEach(r => {
                    let rDate = r.attendanceDate || r.productionDate || '';
                    if (rDate.includes(' ')) rDate = rDate.split(' ')[0];
                    if (!dateGroups.has(rDate)) {
                        dateGroups.set(rDate, []);
                    }
                    dateGroups.get(rDate)!.push(r);
                });

                let currentTableY = 68; 
                const drawnPages = new Set<string>();
                const currentBatchIndex = batchData.indexOf(item); 
                const prefixKey = `${currentBatchIndex}-${unitKey}`;

                Array.from(dateGroups.keys()).forEach((dateKey, index) => {
                    const groupRecords = dateGroups.get(dateKey)!;

                    groupRecords.sort((a, b) => {
                        const nameA = (a.patientName || a.patient?.name || 'NÃO IDENTIFICADO').toUpperCase();
                        const nameB = (b.patientName || b.patient?.name || 'NÃO IDENTIFICADO').toUpperCase();
                        return nameA.localeCompare(nameB);
                    });

                    const dailyTotal = groupRecords.reduce((sum, r) => sum + (Number(r.quantity) || 1), 0);
                    const formattedDate = dateKey.includes('-') ? dateKey.split('-').reverse().join('/') : dateKey;

                    const tableBody: any[] = [];

                    groupRecords.forEach(r => {
                        const resolved = resolveSigtapCode(r);
                        const code = resolved ? resolved.code : (r.procedureCode || (r.procedure && r.procedure.code) || 'S/C');
                        const name = resolved ? resolved.name : (r.procedureName || (r.procedure && r.procedure.name) || 'PROCEDIMENTO SEM NOME');

                        tableBody.push([
                            getFormattedCpfOrCns(r),
                            (r.patientName || r.patient?.name || 'NÃO IDENTIFICADO').toUpperCase(),
                            code,
                            (name || '').toUpperCase(),
                            r.quantity || 1
                        ]);
                    });

                    tableBody.push([
                        {
                            content: `TOTAL = ${dailyTotal}`,
                            colSpan: 5,
                            styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] }
                        }
                    ]);

                    if (currentTableY > doc.internal.pageSize.height - 65 && index > 0) {
                         doc.addPage();
                         currentTableY = 68;
                    } else if (index > 0) {
                         currentTableY += 4; 
                    }

                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(0, 0, 0);
                    doc.text(`DATA DA PRODUÇÃO: ${formattedDate}`, doc.internal.pageSize.width / 2, currentTableY, { align: 'center' });

                    autoTable(doc, {
                        startY: currentTableY + 4,
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
                        margin: { top: 73, bottom: 40, left: 14, right: 14 }, 
                        didDrawPage: (data) => {
                            const pageSize = doc.internal.pageSize;
                            const pageHeight = pageSize.height;
                            const pageWidth = pageSize.width;
                            const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
                            const pageId = `${prefixKey}-${unitData.cnes || unitData.name}-${pageNum}`;

                            if (!drawnPages.has(pageId)) {
                                 drawnPages.add(pageId);
                                 
                                 drawSusHeader(doc, unitData);

                                 const signatureY = pageHeight - 22;

                                 if (options.signatureBase64 && options.signatureBase64.length > 100) {
                                      try {
                                           const imgWidth = 40;
                                           const imgHeight = 15;
                                           doc.addImage(options.signatureBase64, 'PNG', (pageWidth / 2) - (imgWidth / 2), signatureY - 14, imgWidth, imgHeight);
                                      } catch (e) { }
                                 }

                                 doc.setFontSize(8);
                                 doc.setFont('helvetica', 'normal');
                                 doc.setTextColor(0, 0, 0);
                                 doc.text((options.professional.name || '').toUpperCase(), pageWidth / 2, signatureY + 3, { align: 'center' });
                                 doc.setFontSize(7);
                                 doc.text(`${options.professional.role || options.professional.cbo}`, pageWidth / 2, signatureY + 6.5, { align: 'center' });

                                 doc.setFontSize(6);
                                 doc.setTextColor(100);

                                 let footerLine1 = `${options.entityName || 'ENTIDADE NÃO IDENTIFICADA'}`;
                                 if (options.entityCnpj) footerLine1 += ` - CNPJ: ${options.entityCnpj}`;

                                 let footerLine2 = `Gerado via ProBPA - Pág ${pageNum}`;
                                 if (options.entityAddress) footerLine2 = `${options.entityAddress} - ${options.entityCity || ''} | ${footerLine2}`;

                                 doc.text(footerLine1, pageWidth / 2, pageHeight - 12, { align: 'center' });
                                 doc.text(footerLine2, pageWidth / 2, pageHeight - 8, { align: 'center' });
                            }

                            if (data.pageNumber > 1) {
                                 doc.setFontSize(11);
                                 doc.setFont('helvetica', 'bold');
                                 doc.setTextColor(0, 0, 0);
                                 doc.text(`DATA DA PRODUÇÃO: ${formattedDate}`, pageWidth / 2, 68, { align: 'center' });
                            }
                        }
                    });

                    currentTableY = (doc as any).lastAutoTable.finalY + 4;
                });
            }
        }
        
        window.open(doc.output('bloburl'), '_blank');
    },

    generateActionSusProductionPdf: async (records: any[], options: ActionSusReportOptions) => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

        if (!options.professionals || options.professionals.length === 0) {
            alert("A ação necessita de pelo menos um profissional para gerar o PDF.");
            return;
        }

        // Combine all professionals for the header
        const combinedNames = options.professionals.map(p => p.name).join(' / ');
        const combinedCbos = options.professionals.map(p => p.cbo).join(' / ');
        // We use the first professional's unit as fallback, or the action's municipality name
        const unitName = options.professionals[0]?.unit || 'Não Identificada';

        // --- INFO HEADER FUNCTION ---
        const drawSusHeader = (doc: jsPDF) => {
            const pageWidth = doc.internal.pageSize.width;

            // 1. Entity Logo (Left)
            if (options.logoBase64) {
                try { doc.addImage(options.logoBase64, 'PNG', 10, 10, 40, 15, undefined, 'FAST'); } catch (e) { }
            }

            // 2. SUS Logo (Right)
            if (SUS_LOGO_BASE64) {
                try {
                    // FIX: SUS Logo size increased further (previously 26x18, now 34x24)
                    doc.addImage(SUS_LOGO_BASE64, 'PNG', pageWidth - 44, 8, 34, 24, undefined, 'FAST');
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
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`AÇÃO: ${options.actionName.toUpperCase()}`, pageWidth / 2, 26, { align: 'center' });

            // --- DATA BLOCK ---
            let currentY = 35;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            doc.setFont('helvetica', 'bold');
            doc.text(`MUNICÍPIO:`, 14, currentY);
            doc.text(`UNIDADE DE SAÚDE:`, 14, currentY + 5);
            doc.text(`PROFISSIONAL:`, 14, currentY + 10);

            doc.setFont('helvetica', 'normal');
            doc.text((options.municipalityName || '').toUpperCase(), 65, currentY);
            // FIX: User requested that "UNIDADE DE SAÚDE" be the entity name
            doc.text((options.entityName || '').toUpperCase(), 65, currentY + 5);

            // Handle long professional names line
            const maxNameWidth = pageWidth - 65 - 85; // space between start and right column
            let nameText = combinedNames.toUpperCase();
            if (doc.getTextWidth(nameText) > maxNameWidth) {
                nameText = doc.splitTextToSize(nameText, maxNameWidth)[0] + '...';
            }
            doc.text(nameText, 65, currentY + 10);

            const rightColLabelX = pageWidth - 80;
            const rightColValueX = pageWidth - 65;

            doc.setFont('helvetica', 'bold');
            doc.text(`CBO:`, rightColLabelX, currentY + 10);

            doc.setFont('helvetica', 'normal');
            const cboLines = doc.splitTextToSize(combinedCbos, 60);
            doc.text(cboLines, rightColValueX, currentY + 10);

            currentY += 16 + (Math.max(0, cboLines.length - 1) * 4);
            // Period hidden to prevent overlap with DATA DA PRODUÇÃO
            // doc.setFillColor(245, 245, 245);
            // doc.rect(14, currentY - 5, pageWidth - 28, 7, 'F');
            // doc.setFont('helvetica', 'bold');
            // doc.text(`PERÍODO: ${options.competence}`, pageWidth / 2, currentY, { align: 'center' });
        };

        // Sort logic for records
        const sortedRecords = [...records].filter(r => r.status !== 'canceled').sort((a, b) => {
            const dateA = a.attendanceDate || a.actionDate || a.createdAt || ''; // usually stored as timestamp in Actions
            const dateB = b.attendanceDate || b.actionDate || b.createdAt || '';
            const getTime = (d: any) => d?.seconds ? d.seconds : (new Date(d).getTime() || 0);
            return getTime(dateA) - getTime(dateB);
        });

        // Calculate dynamic Y based on CBO lines length to avoid overlapping
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const cboLinesForHeight = doc.splitTextToSize(combinedCbos, 60);
        const dynamicPeriodY = 35 + 16 + (Math.max(0, cboLinesForHeight.length - 1) * 4);
        const baseTableY = dynamicPeriodY + 11; // Spacing below period text
        const tableMarginTop = baseTableY + 5;

        // Group by Date for Totals
        const dateGroups = new Map<string, any[]>();
        sortedRecords.forEach(r => {
            let rDate = r.attendanceDate
                ? r.attendanceDate
                : r.actionDate
                    ? r.actionDate
                    : (r.createdAt?.seconds
                        ? new Date(r.createdAt.seconds * 1000).toISOString().split('T')[0]
                        : 'Data Não Informada');

            if (!dateGroups.has(rDate)) {
                dateGroups.set(rDate, []);
            }
            dateGroups.get(rDate)!.push(r);
        });

        let currentTableY = baseTableY;
        const drawnPages = new Set<string>();

        Array.from(dateGroups.keys()).forEach((dateKey, index) => {
            const groupRecords = dateGroups.get(dateKey)!;

            // Sort alphabetically by patient name
            groupRecords.sort((a, b) => {
                const nameA = (a.patient?.name || 'NÃO IDENTIFICADO').toUpperCase();
                const nameB = (b.patient?.name || 'NÃO IDENTIFICADO').toUpperCase();
                return nameA.localeCompare(nameB);
            });

            let dailyTotal = 0;

            const formattedDate = dateKey.includes('-') ? dateKey.split('-').reverse().join('/') : dateKey;

            const tableBody: any[] = [];

            groupRecords.forEach(r => {
                const proceduresArray = Array.isArray(r.procedures) && r.procedures.length > 0
                    ? r.procedures
                    : [r]; // Fallback for legacy single-procedure records on root

                proceduresArray.forEach((proc: any) => {
                    const resolved = resolveSigtapCode(proc);
                    const code = proc.code || (resolved ? resolved.code : (proc.procedureCode || '-'));
                    const name = proc.name || (resolved ? resolved.name : '-');

                    tableBody.push([
                        getFormattedCpfOrCns(r),
                        (r.patient?.name || 'NÃO IDENTIFICADO').toUpperCase(),
                        code,
                        (name || '-').toUpperCase(),
                        '1'
                    ]);
                    dailyTotal += 1;
                });
            });

            // Add Footer Row (Daily Total)
            tableBody.push([
                {
                    content: `TOTAL = ${dailyTotal}`,
                    colSpan: 5,
                    styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] }
                }
            ]);

            // Check if we need to manually add page before drawing Date title to avoid orphan titles at bottom
            if (currentTableY > doc.internal.pageSize.height - 65 && index > 0) {
                 doc.addPage();
                 currentTableY = baseTableY; // Reset starting Y
            } else if (index > 0) {
                 currentTableY += 4; // Add a small gap between tables
            }

            // Draw Date Header OUTSIDE the table
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`DATA DA PRODUÇÃO: ${formattedDate}`, doc.internal.pageSize.width / 2, currentTableY, { align: 'center' });

            // Use autoTable for this group
            autoTable(doc, {
                startY: currentTableY + 4,
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
                // Adjusted margins to fit more records and fit nicely below the new header
                margin: { top: tableMarginTop, bottom: 40, left: 14, right: 14 },
                didDrawPage: (data) => {
                    const pageSize = doc.internal.pageSize;
                    const pageHeight = pageSize.height;
                    const pageWidth = pageSize.width;
                    const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
                    const pageId = `Acao-${pageNum}`;

                    if (!drawnPages.has(pageId)) {
                         drawnPages.add(pageId);

                         // ALWAYS DRAW FULL HEADER
                         drawSusHeader(doc);

                         // --- SIGNATURE BLOCK ---
                         const signatureY = pageHeight - 22; // Moved lower
                         const primaryProf = options.professionals[0];

                         // Signature Image
                         if (primaryProf?.signatureBase64 && primaryProf.signatureBase64.length > 100) {
                              try {
                                   const imgWidth = 40;
                                   const imgHeight = 15;
                                   doc.addImage(primaryProf.signatureBase64, 'PNG', (pageWidth / 2) - (imgWidth / 2), signatureY - 14, imgWidth, imgHeight);
                              } catch (e) { }
                         }

                         // NOTE: Removed `doc.line` drawing for the signature line per user request

                         // Signature Text
                         doc.setFontSize(8);
                         doc.setFont('helvetica', 'normal');
                         doc.setTextColor(0, 0, 0);
                         const sigName = options.professionals.length > 1 ? `Resp: ${primaryProf.name} (+${options.professionals.length - 1} profs)` : primaryProf.name;
                         doc.text(sigName.toUpperCase(), pageWidth / 2, signatureY + 3, { align: 'center' });
                         doc.setFontSize(7);
                         doc.text(`${primaryProf.role || primaryProf.cbo}`, pageWidth / 2, signatureY + 6.5, { align: 'center' });

                         // Footer
                         doc.setFontSize(6);
                         doc.setTextColor(100);

                         let footerLine1 = `${options.entityName || 'ENTIDADE NÃO IDENTIFICADA'}`;
                         if (options.entityCnpj) footerLine1 += ` - CNPJ: ${options.entityCnpj}`;

                         let footerLine2 = `Gerado via ProBPA - Pág ${pageNum}`;
                         if (options.entityAddress) footerLine2 = `${options.entityAddress} - ${options.entityCity || ''} | ${footerLine2}`;

                         doc.text(footerLine1, pageWidth / 2, pageHeight - 12, { align: 'center' });
                         doc.text(footerLine2, pageWidth / 2, pageHeight - 8, { align: 'center' });
                    }

                    if (data.pageNumber > 1) {
                         doc.setFontSize(11);
                         doc.setFont('helvetica', 'bold');
                         doc.setTextColor(0, 0, 0);
                         doc.text(`DATA DA PRODUÇÃO: ${formattedDate}`, pageWidth / 2, baseTableY, { align: 'center' });
                    }
                }
            });

            currentTableY = (doc as any).lastAutoTable.finalY + 4;
        });

        window.open(doc.output('bloburl'), '_blank');
    },

    generateSusProductionExcel: async (records: any[], options: SusReportOptions) => {
        const { utils, writeFile } = await import('xlsx');
        
        // Exclude canceled records
        records = records.filter(r => r.status !== 'canceled');

        // Group Records by Unit
        const unitsMap = new Map<string, { cnes: string, name: string, items: any[] }>();

        records.forEach(r => {
            const uName = r.unitName || options.professional.unit || 'Não Identificada';
            const uCnes = r.unitCnes || (uName === options.professional.unit ? options.professional.unitCnes : '');

            const key = uName;
            if (!unitsMap.has(key)) {
                unitsMap.set(key, { cnes: uCnes || '', name: uName, items: [] });
            }
            unitsMap.get(key)!.items.push(r);
        });

        const sheetData: any[][] = [];

        // Header Info
        sheetData.push([`Boletim de Produção Ambulatorial (BPA)`]);
        sheetData.push([`Período (Competência): ${options.competence}`]);
        sheetData.push([`Profissional: ${options.professional.name.toUpperCase()}`]);
        sheetData.push([`CNS do Profissional: ${options.professional.cns}`]);
        sheetData.push([`CBO / Cargo: ${options.professional.role || options.professional.cbo || '-'}`]);

        let grandTotal = 0;

        for (const [unitKey, unitData] of unitsMap.entries()) {
            sheetData.push([]); // Empty spacing
            sheetData.push([`Unidade Lotação: ${unitData.name.toUpperCase()} (CNES: ${unitData.cnes || '-'})`]);
            sheetData.push([]);

            const unitRecords = unitData.items.sort((a, b) => {
                const dateA = a.attendanceDate || a.productionDate || '';
                const dateB = b.attendanceDate || b.productionDate || '';
                const normalizeDate = (d: string) => d.includes('/') ? d.split('/').reverse().join('') : d;
                return normalizeDate(dateA).localeCompare(normalizeDate(dateB));
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

            Array.from(dateGroups.keys()).forEach(dateKey => {
                const groupRecords = dateGroups.get(dateKey)!;

                // Sort alphabetically by patient name
                groupRecords.sort((a, b) => {
                    const nameA = (a.patientName || a.patient?.name || 'NÃO IDENTIFICADO').toUpperCase();
                    const nameB = (b.patientName || b.patient?.name || 'NÃO IDENTIFICADO').toUpperCase();
                    return nameA.localeCompare(nameB);
                });

                const dailyTotal = groupRecords.reduce((sum, r) => sum + (Number(r.quantity) || 1), 0);
                const formattedDate = dateKey.includes('-') ? dateKey.split('-').reverse().join('/') : dateKey;

                sheetData.push([`DATA do Atendimento: ${formattedDate}`, '', '', '', `Qtd Total do Dia: ${dailyTotal}`]);
                sheetData.push(['CPF/CNS do Paciente', 'Nome do Paciente', 'Cód Procedimento', 'Nome do Procedimento', 'Quantidade']);

                groupRecords.forEach(r => {
                    const resolved = resolveSigtapCode(r);
                    const code = resolved ? resolved.code : (r.procedureCode || (r.procedure && r.procedure.code) || 'S/C');
                    const name = resolved ? resolved.name : (r.procedureName || (r.procedure && r.procedure.name) || 'PROCEDIMENTO SEM NOME');
                    
                    const pName = (r.patientName || r.patient?.name || 'NÃO IDENTIFICADO').toUpperCase();
                    
                    sheetData.push([
                        getFormattedCpfOrCns(r),
                        pName,
                        code,
                        (name || '').toUpperCase(),
                        Number(r.quantity) || 1
                    ]);
                    grandTotal += (Number(r.quantity) || 1);
                });
                
                sheetData.push([]); // Spacing after daily block
            });
        }
        
        sheetData.push([]);
        sheetData.push(['TOTAL GERAL PROCEDIMENTOS EXECUTADOS:', '', '', '', grandTotal]);

        const ws = utils.aoa_to_sheet(sheetData);
        // Column widths
        const wscols = [
            { wch: 18 },  // Documento
            { wch: 45 },  // Nome Paciente
            { wch: 20 },  // Cód Procedimento
            { wch: 50 },  // Nome Procedimento
            { wch: 15 }   // Qtd
        ];
        ws['!cols'] = wscols;

        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Produção");

        const fileName = `BoletimBPA_${options.professional.name.replace(/[^a-z0-9]/gi, '_')}_${options.competence.replace('/', '')}.xlsx`;
        writeFile(wb, fileName);
    },

    generateZeroProductionPdf: async (groupedZeros: Record<string, Record<string, any[]>>, options: { competence: string; logoBase64?: string; filename?: string }) => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;

        let isFirstPage = true;

        const munis = Object.keys(groupedZeros).sort();
        for (const muniName of munis) {
            const units = Object.keys(groupedZeros[muniName]).sort();
            for (const unitName of units) {
                const professionals = groupedZeros[muniName][unitName];
                if (!professionals || professionals.length === 0) continue;
                
                if (!isFirstPage) {
                    doc.addPage();
                }
                isFirstPage = false;

                // --- HEADER ---
                if (options.logoBase64) {
                    try { doc.addImage(options.logoBase64, 'PNG', 14, 10, 40, 15, undefined, 'FAST'); } catch (e) { }
                }

                if (SUS_LOGO_BASE64) {
                    try { doc.addImage(SUS_LOGO_BASE64, 'PNG', pageWidth - 48, 8, 34, 24, undefined, 'FAST'); } catch (e) { }
                }

                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text("RELATÓRIO DE PRODUTIVIDADE CRÍTICA (ZERADA)", pageWidth / 2, 20, { align: 'center' });

                let currentY = 35;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`MUNICÍPIO:`, 14, currentY);
                doc.text(`UNIDADE DE SAÚDE:`, 14, currentY + 5);
                
                doc.setFont('helvetica', 'normal');
                doc.text(muniName.toUpperCase(), 55, currentY);
                doc.text(unitName.toUpperCase(), 55, currentY + 5);

                doc.setFillColor(254, 242, 242);
                doc.rect(14, currentY + 10, pageWidth - 28, 7, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(220, 38, 38);
                doc.text(`PERÍODO: ${options.competence}`, pageWidth / 2, currentY + 15, { align: 'center' });
                
                doc.setTextColor(0, 0, 0); // reset text color

                // --- TABLE ---
                const rows = professionals.map((prof: any) => [
                    (prof.name || '').toUpperCase(),
                    prof.cns || 'S/N',
                    prof.cpf || 'S/N',
                    prof.cbo || prof.occupation || 'NÃO ESPECIFICADO'
                ]);

                autoTable(doc, {
                    startY: currentY + 22,
                    head: [['Profissional', 'CNS', 'CPF', 'CBO/Cargo']],
                    body: rows,
                    theme: 'grid',
                    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
                    styles: { fontSize: 8 },
                    alternateRowStyles: { fillColor: [254, 242, 242] },
                    margin: { left: 14, right: 14 }
                });
            }
        }

        if (isFirstPage) {
            doc.setFontSize(12);
            doc.text("Nenhum profissional zerado encontrado no filtro.", 14, 20);
        }

        window.open(doc.output('bloburl'), '_blank');
    },

    generateBatchActionSusProductionPdf: async (batchData: { records: any[], options: ActionSusReportOptions }[]) => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
        let isOverallFirstPage = true;

        for (let batchIndex = 0; batchIndex < batchData.length; batchIndex++) {
            const item = batchData[batchIndex];
            const records = item.records.filter(r => r.status !== 'canceled');
            const options = item.options;

            if (records.length === 0 || !options.professionals || options.professionals.length === 0) continue;

            const primaryProf = options.professionals[0];

            if (!isOverallFirstPage) {
                doc.addPage();
            }
            isOverallFirstPage = false;

            const drawSusHeader = (doc: jsPDF) => {
                const pageWidth = doc.internal.pageSize.width;

                if (options.logoBase64) {
                    try { doc.addImage(options.logoBase64, 'PNG', 10, 10, 40, 15, undefined, 'FAST'); } catch (e) { }
                }

                if (SUS_LOGO_BASE64) {
                    try {
                        doc.addImage(SUS_LOGO_BASE64, 'PNG', pageWidth - 44, 8, 34, 24, undefined, 'FAST');
                    } catch (e) { }
                } else {
                    doc.setFontSize(20);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(0, 51, 153);
                    doc.text("SUS", pageWidth - 25, 20, { align: 'center' });
                }

                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text("BOLETIM DIÁRIO DE PRODUÇÃO AMBULATORIAL - BDPA", pageWidth / 2, 20, { align: 'center' });
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`AÇÃO: ${(options.actionName || '').toUpperCase()}`, pageWidth / 2, 26, { align: 'center' });

                let currentY = 35;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');

                doc.setFont('helvetica', 'bold');
                doc.text(`MUNICÍPIO:`, 14, currentY);
                doc.text(`UNIDADE DE SAÚDE:`, 14, currentY + 5);
                doc.text(`PROFISSIONAL:`, 14, currentY + 10);

                doc.setFont('helvetica', 'normal');
                doc.text((options.municipalityName || '').toUpperCase(), 65, currentY);
                doc.text((options.entityName || '').toUpperCase(), 65, currentY + 5);

                const maxNameWidth = pageWidth - 65 - 85;
                let nameText = (primaryProf.name || '').toUpperCase();
                if (doc.getTextWidth(nameText) > maxNameWidth) {
                    nameText = doc.splitTextToSize(nameText, maxNameWidth)[0] + '...';
                }
                doc.text(nameText, 65, currentY + 10);

                const rightColLabelX = pageWidth - 80;
                const rightColValueX = pageWidth - 65;

                doc.setFont('helvetica', 'bold');
                doc.text(`CBO:`, rightColLabelX, currentY + 10);

                doc.setFont('helvetica', 'normal');
                const cboLines = doc.splitTextToSize(`${primaryProf.cbo || primaryProf.role || ''}`, 60);
                doc.text(cboLines, rightColValueX, currentY + 10);

                currentY += 16 + (Math.max(0, cboLines.length - 1) * 4);
                // Period hidden to prevent overlap with DATA DA PRODUÇÃO
                // doc.setFillColor(245, 245, 245);
                // doc.rect(14, currentY - 5, pageWidth - 28, 7, 'F');
                // doc.setFont('helvetica', 'bold');
                // doc.text(`PERÍODO: ${options.competence}`, pageWidth / 2, currentY, { align: 'center' });
            };

            const sortedRecords = [...records].sort((a, b) => {
                const dateA = a.attendanceDate || a.actionDate || a.createdAt || '';
                const dateB = b.attendanceDate || b.actionDate || b.createdAt || '';
                const getTime = (d: any) => d?.seconds ? d.seconds : (new Date(d).getTime() || 0);
                return getTime(dateA) - getTime(dateB);
            });

            const dateGroups = new Map<string, any[]>();
            sortedRecords.forEach(r => {
                let rDate = r.attendanceDate
                    ? r.attendanceDate
                    : r.actionDate
                        ? r.actionDate
                        : (r.createdAt?.seconds
                            ? new Date(r.createdAt.seconds * 1000).toISOString().split('T')[0]
                            : 'Data Não Informada');
                if (!dateGroups.has(rDate)) dateGroups.set(rDate, []);
                dateGroups.get(rDate)!.push(r);
            });

            let currentTableY = 60;
            const drawnPages = new Set<string>();
            const prefixKey = `Batch-${batchIndex}`;

            Array.from(dateGroups.keys()).forEach((dateKey, index) => {
                const groupRecords = dateGroups.get(dateKey)!;

                groupRecords.sort((a, b) => {
                    const nameA = (a.patient?.name || 'NÃO IDENTIFICADO').toUpperCase();
                    const nameB = (b.patient?.name || 'NÃO IDENTIFICADO').toUpperCase();
                    return nameA.localeCompare(nameB);
                });

                let dailyTotal = 0;
                const formattedDate = dateKey.includes('-') ? dateKey.split('-').reverse().join('/') : dateKey;
                const tableBody: any[] = [];

                groupRecords.forEach(r => {
                    const proceduresArray = Array.isArray(r.procedures) && r.procedures.length > 0 ? r.procedures : [r];
                    proceduresArray.forEach((proc: any) => {
                        const resolved = resolveSigtapCode(proc);
                        const code = proc.code || (resolved ? resolved.code : (proc.procedureCode || '-'));
                        const name = proc.name || (resolved ? resolved.name : '-');

                        tableBody.push([
                            getFormattedCpfOrCns(r),
                            (r.patient?.name || 'NÃO IDENTIFICADO').toUpperCase(),
                            code,
                            (name || '-').toUpperCase(),
                            '1'
                        ]);
                        dailyTotal += 1;
                    });
                });

                tableBody.push([
                    {
                        content: `TOTAL = ${dailyTotal}`,
                        colSpan: 5,
                        styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] }
                    }
                ]);

                if (currentTableY > doc.internal.pageSize.height - 65 && index > 0) {
                     doc.addPage();
                     currentTableY = 60;
                } else if (index > 0) {
                     currentTableY += 4;
                }

                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(`DATA DA PRODUÇÃO: ${formattedDate}`, doc.internal.pageSize.width / 2, currentTableY, { align: 'center' });

                autoTable(doc, {
                    startY: currentTableY + 4,
                    head: [['CNS/CPF', 'Paciente', 'Código', 'Descrição do Procedimento', 'Qtd']],
                    body: tableBody,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold', lineWidth: 0.1, lineColor: 200 },
                    columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 80 }, 2: { cellWidth: 25 }, 3: { cellWidth: 'auto' }, 4: { cellWidth: 15, halign: 'center' } },
                    alternateRowStyles: { fillColor: [255, 255, 255] },
                    margin: { top: 60, bottom: 40, left: 14, right: 14 },
                    didDrawPage: (data) => {
                        const pageSize = doc.internal.pageSize;
                        const pageHeight = pageSize.height;
                        const pageWidth = pageSize.width;
                        const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
                        const pageId = `${prefixKey}-${pageNum}`;

                        if (!drawnPages.has(pageId)) {
                             drawnPages.add(pageId);
                             drawSusHeader(doc);

                             const signatureY = pageHeight - 22;
                             if (primaryProf.signatureBase64 && primaryProf.signatureBase64.length > 100) {
                                  try {
                                       const imgWidth = 40;
                                       const imgHeight = 15;
                                       doc.addImage(primaryProf.signatureBase64, 'PNG', (pageWidth / 2) - (imgWidth / 2), signatureY - 14, imgWidth, imgHeight);
                                  } catch (e) { }
                             }

                             doc.setFontSize(8);
                             doc.setFont('helvetica', 'normal');
                             doc.setTextColor(0, 0, 0);
                             doc.text(primaryProf.name.toUpperCase(), pageWidth / 2, signatureY + 3, { align: 'center' });
                             doc.setFontSize(7);
                             doc.text(`${primaryProf.role || primaryProf.cbo}`, pageWidth / 2, signatureY + 6.5, { align: 'center' });

                             doc.setFontSize(6);
                             doc.setTextColor(100);

                             let footerLine1 = `${options.entityName || 'ENTIDADE NÃO IDENTIFICADA'}`;
                             if (options.entityCnpj) footerLine1 += ` - CNPJ: ${options.entityCnpj}`;

                             let footerLine2 = `Gerado via ProBPA - Página Batch ${pageNum}`;
                             if (options.entityAddress) footerLine2 = `${options.entityAddress} - ${options.entityCity || ''} | ${footerLine2}`;

                             doc.text(footerLine1, pageWidth / 2, pageHeight - 12, { align: 'center' });
                             doc.text(footerLine2, pageWidth / 2, pageHeight - 8, { align: 'center' });
                        }

                        if (data.pageNumber > 1) {
                             doc.setFontSize(11);
                             doc.setFont('helvetica', 'bold');
                             doc.setTextColor(0, 0, 0);
                             doc.text(`DATA DA PRODUÇÃO: ${formattedDate}`, pageWidth / 2, 56, { align: 'center' });
                        }
                    }
                });

                currentTableY = (doc as any).lastAutoTable.finalY + 4;
            });
        }

        window.open(doc.output('bloburl'), '_blank');
    }
};

