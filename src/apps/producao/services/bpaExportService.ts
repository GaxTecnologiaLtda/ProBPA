import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// --- 1. Utility Functions ---

const pad = (value: any, length: number, char: string = ' ', left: boolean = true): string => {
    const str = String(value || '').substring(0, length);
    return left ? str.padStart(length, char) : str.padEnd(length, char);
};

const sanitizeText = (text: string): string => {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-zA-Z0-9 ]/g, "")   // Remove special chars
        .toUpperCase();
};

const onlyNumbers = (text: string): string => {
    return String(text).replace(/\D/g, '');
};

const formatDateAAAAMM = (dateStr: string): string => {
    // Input: YYYY-MM or YYYYMM
    const cleaned = onlyNumbers(dateStr);
    return cleaned.substring(0, 6);
};

const formatDateAAAAMMDD = (dateStr: string): string => {
    if (!dateStr) return '00000000';
    // Input: YYYY-MM-DD
    return dateStr.replace(/-/g, '');
};

const downloadFile = (filename: string, content: Blob | string) => {
    const element = document.createElement('a');
    let fileUrl;

    if (content instanceof Blob) {
        fileUrl = URL.createObjectURL(content);
    } else {
        fileUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    }

    element.setAttribute('href', fileUrl);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};

// --- 2. Header Generation (CBC-HDR) ---

const buildHeader = (meta: any): string => {
    // 01 - Tipo de Registro (01 - Header)
    // 02 - Identificador (#BPA#)
    // 03 - Competência (AAAAMM)
    // 04 - Total de Linhas (000000) - Placeholder, will be calculated later if needed or passed
    // 05 - Total de Folhas (000001)
    // 06 - Controle (1111)
    // 07 - Órgão Responsável (Nome)
    // 08 - Sigla do Órgão
    // 09 - CNPJ do Órgão
    // 10 - Destino (SECRETARIA MUNICIPAL DE SAUDE)
    // 11 - Tipo Destino (M)
    // 12 - Versão (PROBPA001)
    // 13 - Fim (CRLF)

    let header = "01";
    header += "#BPA#";
    header += pad(meta.competenceAAAAMM, 6, '0');
    header += pad(meta.totalLines + 2, 6, '0'); // +2 for Header and Footer (if any, usually just header counts in some layouts, but let's stick to total lines in file)
    header += "000001"; // Total Folhas
    header += "1111";   // Controle
    header += pad(sanitizeText(meta.responsavel), 30, ' ', false);
    header += pad(sanitizeText(meta.sigla), 6, ' ', false);
    header += pad(onlyNumbers(meta.cnpj), 14, '0');
    header += pad("SECRETARIA MUNICIPAL DE SAUDE", 40, ' ', false);
    header += "M"; // Tipo Destino
    header += "PROBPA001"; // Versão
    header += "\r\n";

    return header;
};

// --- 3. BPA-I TXT Generator ---

const generateBpaITxt = (records: any[], meta: any): string => {
    let content = buildHeader(meta);

    records.forEach((record, index) => {
        let line = "03"; // Tipo 03 - Individualizado

        // CNES (7)
        line += pad(onlyNumbers(meta.unidade?.cnes), 7, '0');

        // Competência (6)
        line += pad(meta.competenceAAAAMM, 6, '0');

        // CNS Profissional (15) - Assuming professionalCns is available, else pad 0
        line += pad(onlyNumbers(record.professionalCns || ''), 15, '0');

        // CBO (6)
        line += pad(onlyNumbers(record.cbo), 6, '0');

        // Data Atendimento (8) AAAAMMDD
        line += formatDateAAAAMMDD(record.attendanceDate);

        // Folha (3)
        line += "001";

        // Sequência (2)
        line += pad((index + 1), 2, '0');

        // Procedimento (10)
        line += pad(onlyNumbers(record.procedureCode), 10, '0');

        // CNS Paciente (15)
        line += pad(onlyNumbers(record.patientCns), 15, '0');

        // Sexo (1)
        line += pad(record.patientSex, 1, 'M'); // Default M if missing

        // IBGE Município (6) - Mocking or getting from patient/unit
        line += pad("123456", 6, '0');

        // CID (4)
        const cid = record.cidCodes && record.cidCodes.length > 0 ? record.cidCodes[0] : "";
        line += pad(sanitizeText(cid), 4, ' ', false);

        // Idade (3)
        // Calculate age if not present
        let age = record.patientAge || record.age;
        if (age === undefined && record.patientDob) {
            const birthDate = new Date(record.patientDob);
            const attendDate = new Date(record.attendanceDate);
            age = attendDate.getFullYear() - birthDate.getFullYear();
        }
        line += pad(age || 0, 3, '0');

        // Quantidade (6)
        line += pad(record.quantity, 6, '0');

        // Caráter Atendimento (2)
        line += pad(onlyNumbers(record.attendanceCharacter || '01'), 2, '0');

        // Nº Autorização (13)
        line += pad("", 13, '0');

        // Origem (3) - BPA
        line += "BPA";

        // Nome Paciente (30)
        line += pad(sanitizeText(record.patientName), 30, ' ', false);

        // Data Nascimento (8)
        line += formatDateAAAAMMDD(record.patientDob);

        // Raça/Cor (2)
        line += pad(record.patientRace || '99', 2, '0');

        // Etnia (4)
        line += "0000";

        // Nacionalidade (3)
        line += "010"; // Brasil

        // Serviço/Classificação (3+3) - Mocked for now
        line += "000000";

        // Equipe (8)
        line += "00000000";

        // CNPJ (14)
        line += pad(onlyNumbers(meta.cnpj), 14, '0');

        // CEP (8)
        line += pad(onlyNumbers(record.patientZip), 8, '0');

        // Logradouro (3) - Tipo (RUA, AV)
        line += "000"; // Mock

        // Endereço (30)
        line += pad(sanitizeText(record.patientAddress), 30, ' ', false);

        // Complemento (10)
        line += pad("", 10, ' ', false);

        // Número (5)
        line += pad("00000", 5, '0');

        // Bairro (30)
        line += pad("", 30, ' ', false);

        // Telefone (11)
        line += pad("", 11, '0');

        // Email (40)
        line += pad("", 40, ' ', false);

        // INE (10)
        line += pad("", 10, '0');

        // CPF (11)
        line += pad(onlyNumbers(record.patientCpf), 11, '0');

        // Situação Rua (1)
        line += "N";

        line += "\r\n";
        content += line;
    });

    return content;
};

// --- 4. BPA-C TXT Generator ---

const generateBpaCTxt = (records: any[], meta: any): string => {
    let content = buildHeader(meta);

    records.forEach((record, index) => {
        let line = "02"; // Tipo 02 - Consolidado

        // CNES (7)
        line += pad(onlyNumbers(meta.unidade?.cnes), 7, '0');

        // Competência (6)
        line += pad(meta.competenceAAAAMM, 6, '0');

        // CBO (6)
        line += pad(onlyNumbers(record.cbo), 6, '0');

        // Folha (3)
        line += "001";

        // Sequência (2)
        line += pad((index + 1), 2, '0');

        // Procedimento (10)
        line += pad(onlyNumbers(record.procedureCode), 10, '0');

        // Idade (3)
        line += pad(record.patientAge || record.age, 3, '0');

        // Quantidade (6)
        line += pad(record.quantity, 6, '0');

        // Origem (3)
        line += "BPA";

        line += "\r\n";
        content += line;
    });

    return content;
};

// --- 5. PDF Generator ---

const generatePdf = (records: any[], meta: any, type: 'bpai' | 'bpac') => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(16);
    doc.text(type === 'bpac' ? "Relatório BPA-C (Consolidado)" : "Relatório BPA-I (Individualizado)", 14, 20);

    doc.setFontSize(10);
    doc.text(`Unidade: ${meta.unidade?.name || 'N/A'}`, 14, 30);
    doc.text(`Competência: ${meta.competenceAAAAMM}`, 14, 35);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 40);

    // Table
    let head = [];
    let body = [];

    if (type === 'bpac') {
        head = [['Seq', 'Procedimento', 'Nome', 'CBO', 'Idade', 'Qtd']];
        body = records.map((r, i) => [
            i + 1,
            r.procedureCode,
            r.procedureName,
            r.cbo,
            r.patientAge || r.age,
            r.quantity
        ]);
    } else {
        head = [['Data', 'CNS Paciente', 'Paciente', 'Procedimento', 'Qtd', 'CBO', 'Idade', 'Profissional']];
        body = records.map(r => [
            r.attendanceDate,
            r.patientCns,
            r.patientName,
            r.procedureCode,
            r.quantity,
            r.cbo,
            r.patientAge || r.age || '-', // Need to ensure age is calculated or available
            r.professionalName
        ]);
    }

    autoTable(doc, {
        startY: 50,
        head: head,
        body: body,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] } // Medical Green-ish
    });

    doc.save(`BPA_${type.toUpperCase()}_${meta.competenceAAAAMM}.pdf`);
};

// --- 6. XLSX Generator ---

const generateXlsx = (records: any[], meta: any, type: 'bpai' | 'bpac') => {
    let data = [];

    if (type === 'bpac') {
        data = records.map((r, i) => ({
            Seq: i + 1,
            Procedimento: r.procedureCode,
            NomeProcedimento: r.procedureName,
            CBO: r.cbo,
            Idade: r.patientAge || r.age,
            Quantidade: r.quantity
        }));
    } else {
        data = records.map(r => ({
            Data: r.attendanceDate,
            CNSPaciente: r.patientCns,
            Paciente: r.patientName,
            Procedimento: r.procedureCode,
            NomeProcedimento: r.procedureName,
            Quantidade: r.quantity,
            CBO: r.cbo,
            Idade: r.patientAge || r.age, // Ensure age is present
            Unidade: r.unitId,
            Profissional: r.professionalName,
            CID: r.cidCodes?.join(', '),
            Carater: r.attendanceCharacter
        }));
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatorio");
    XLSX.writeFile(wb, `BPA_${type.toUpperCase()}_${meta.competenceAAAAMM}.xlsx`);
};

// --- 7. CSV Generator ---

const generateCsv = (records: any[], meta: any, type: 'bpai' | 'bpac') => {
    let data = [];

    if (type === 'bpac') {
        data = records.map((r, i) => ({
            Seq: i + 1,
            Procedimento: r.procedureCode,
            NomeProcedimento: r.procedureName,
            CBO: r.cbo,
            Idade: r.patientAge || r.age,
            Quantidade: r.quantity
        }));
    } else {
        data = records.map(r => ({
            Data: r.attendanceDate,
            CNSPaciente: r.patientCns,
            Paciente: r.patientName,
            Procedimento: r.procedureCode,
            NomeProcedimento: r.procedureName,
            Quantidade: r.quantity,
            CBO: r.cbo,
            Idade: r.patientAge || r.age,
            Unidade: r.unitId,
            Profissional: r.professionalName,
            CID: r.cidCodes?.join(', '),
            Carater: r.attendanceCharacter
        }));
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
    downloadFile(`BPA_${type.toUpperCase()}_${meta.competenceAAAAMM}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
};

// --- 8. Main Export Function ---

export interface ExportOptions {
    type: 'bpai' | 'bpac';
    format: 'pdf' | 'xlsx' | 'txt' | 'csv'; // Added csv to type definition
    competence: string;
    user: any;
    unit: any;
    records: any[];
}

export const exportReport = async ({ type, format, competence, user, unit, records }: ExportOptions) => {
    const competenceAAAAMM = formatDateAAAAMM(competence);

    const meta = {
        competenceAAAAMM,
        totalLines: records.length,
        responsavel: user.entityName || 'ENTIDADE DESCONHECIDA',
        sigla: user.entitySigla || 'SMS',
        cnpj: user.entityCnpj || '00000000000000', // Should be in user context
        destino: "SECRETARIA MUNICIPAL DE SAUDE",
        destinoTipo: "M",
        unidade: unit,
    };

    switch (type) {
        case 'bpai':
            switch (format) {
                case 'txt':
                    const txtContent = generateBpaITxt(records, meta);
                    downloadFile(`BPAI_${competenceAAAAMM}.txt`, txtContent);
                    break;
                case 'pdf':
                    generatePdf(records, meta, 'bpai');
                    break;
                case 'xlsx':
                    generateXlsx(records, meta, 'bpai');
                    break;
                case 'csv': // Assuming CSV is handled like this or via XLSX lib
                    generateCsv(records, meta, 'bpai');
                    break;
            }
            break;
        case 'bpac':
            switch (format) {
                case 'txt':
                    const txtContentC = generateBpaCTxt(records, meta);
                    downloadFile(`BPAC_${competenceAAAAMM}.txt`, txtContentC);
                    break;
                case 'pdf':
                    generatePdf(records, meta, 'bpac');
                    break;
                case 'xlsx':
                    generateXlsx(records, meta, 'bpac');
                    break;
                case 'csv':
                    generateCsv(records, meta, 'bpac');
                    break;
            }
            break;
    }
};
