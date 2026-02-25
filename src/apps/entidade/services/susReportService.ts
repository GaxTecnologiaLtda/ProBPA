import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { municipalityReportService, resolveSigtapCode } from './municipalityReportService';

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
                        doc.addImage(SUS_LOGO_BASE64, 'PNG', pageWidth - 25, 10, 15, 15, undefined, 'FAST');
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
                    const resolved = resolveSigtapCode(r);
                    const code = resolved ? resolved.code : (r.procedureCode || (r.procedure && r.procedure.code) || 'S/C');
                    const name = resolved ? resolved.name : (r.procedureName || (r.procedure && r.procedure.name) || 'PROCEDIMENTO SEM NOME');

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
                try { doc.addImage(SUS_LOGO_BASE64, 'PNG', pageWidth - 25, 10, 15, 15, undefined, 'FAST'); } catch (e) { }
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
            doc.text(`PROFISSIONAIS:`, 14, currentY + 10);

            doc.setFont('helvetica', 'normal');
            doc.text((options.municipalityName || '').toUpperCase(), 65, currentY);
            doc.text((unitName).toUpperCase(), 65, currentY + 5);

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
            doc.text(`CBOs:`, rightColLabelX, currentY + 10);

            doc.setFont('helvetica', 'normal');
            let cboText = combinedCbos;
            if (doc.getTextWidth(cboText) > 50) {
                cboText = doc.splitTextToSize(cboText, 50)[0] + '...';
            }
            doc.text(cboText, rightColValueX, currentY + 10);

            currentY += 16;
            doc.setFillColor(245, 245, 245);
            doc.rect(14, currentY - 5, pageWidth - 28, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text(`PERÍODO: ${options.competence}`, pageWidth / 2, currentY, { align: 'center' });
        };

        // Sort logic for records
        const sortedRecords = [...records].sort((a, b) => {
            const dateA = a.attendanceDate || a.createdAt || ''; // usually stored as timestamp in Actions
            const dateB = b.attendanceDate || b.createdAt || '';
            const getTime = (d: any) => d?.seconds ? d.seconds : (new Date(d).getTime() || 0);
            return getTime(dateA) - getTime(dateB);
        });

        // Group by Date for Totals
        const dateGroups = new Map<string, any[]>();
        sortedRecords.forEach(r => {
            let rDate = r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toISOString().split('T')[0] : 'Data Não Informada';
            if (!dateGroups.has(rDate)) {
                dateGroups.set(rDate, []);
            }
            dateGroups.get(rDate)!.push(r);
        });

        const tableBody: any[] = [];
        let totalGeneral = 0;

        Array.from(dateGroups.keys()).sort().forEach(dateKey => {
            const groupRecords = dateGroups.get(dateKey)!;
            const dailyTotal = groupRecords.length; // Each registration is 1 quantity in Actions usually
            totalGeneral += dailyTotal;

            const formattedDate = dateKey.includes('-') ? dateKey.split('-').reverse().join('/') : dateKey;

            tableBody.push([
                {
                    content: `${formattedDate}`,
                    colSpan: 5,
                    styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] }
                }
            ]);

            groupRecords.forEach(r => {
                const resolved = resolveSigtapCode(r);
                const code = resolved ? resolved.code : (r.procedureCode || '-');
                const name = resolved ? resolved.name : '-';

                tableBody.push([
                    r.patient.cns || r.patient.cpf || '-',
                    (r.patient.name || 'NÃO IDENTIFICADO').toUpperCase(),
                    code,
                    (name || '-').toUpperCase(), // Use resolved name
                    '1'
                ]);
            });

            tableBody.push([
                {
                    content: `TOTAL = ${dailyTotal}`,
                    colSpan: 5,
                    styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] }
                }
            ]);
        });

        autoTable(doc, {
            startY: 60,
            head: [['CNS/CPF', 'Paciente', 'Código', 'Descrição do Procedimento', 'Qtd']],
            body: tableBody,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold', lineWidth: 0.1, lineColor: 200 },
            columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 80 }, 2: { cellWidth: 25 }, 3: { cellWidth: 'auto' }, 4: { cellWidth: 15, halign: 'center' } },
            alternateRowStyles: { fillColor: [255, 255, 255] },
            margin: { top: 60, bottom: 65, left: 14, right: 14 },
            didDrawPage: (data) => {
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height;
                const pageWidth = pageSize.width;

                drawSusHeader(doc);

                const signatureY = pageHeight - 35;
                const primaryProf = options.professionals[0];

                if (primaryProf?.signatureBase64 && primaryProf.signatureBase64.length > 100) {
                    try {
                        doc.addImage(primaryProf.signatureBase64, 'PNG', (pageWidth / 2) - 20, signatureY - 15, 40, 15);
                    } catch (e) { }
                }

                doc.setDrawColor(0);
                doc.setLineWidth(0.5);
                doc.line((pageWidth / 2) - 40, signatureY, (pageWidth / 2) + 40, signatureY);

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                const sigName = options.professionals.length > 1 ? `Resp: ${primaryProf.name} (+${options.professionals.length - 1} profs)` : primaryProf.name;
                doc.text(sigName.toUpperCase(), pageWidth / 2, signatureY + 4, { align: 'center' });
                doc.setFontSize(7);
                doc.text(`${primaryProf.role || primaryProf.cbo}`, pageWidth / 2, signatureY + 8, { align: 'center' });

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

        doc.save(`BDPA_Acao_${options.actionName.replace(/[^a-z0-9]/gi, '_')}_${options.competence.replace('/', '-')}.pdf`);
    }
};
