import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker do PDF.js (CDN para evitar problemas de build com Vite/Webpack sem config)
// Nota: Em produção, o ideal é bundar o worker, mas CDN é mais seguro para "drop-in"
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractedContent {
    success: boolean;
    data?: any[]; // Array de objetos para Excel/JSON
    text?: string; // Texto corrido para DOCX/PDF
    metadata?: any;
    error?: string;
    type: 'structured' | 'text' | 'unknown';
}

export class UniversalExtractor {

    /**
     * Limpa texto (remove caracteres estranhos), similar ao script Python
     */
    private cleanText(text: string): string {
        return text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, '').trim();
    }

    /**
     * Processa arquivos Excel (.xlsx, .xls)
     */
    private async processExcel(file: File): Promise<ExtractedContent> {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); // defval "" para evitar undefined

                    resolve({
                        success: true,
                        data: jsonData,
                        type: 'structured',
                        metadata: { sheets: workbook.SheetNames }
                    });
                } catch (error) {
                    resolve({ success: false, error: `Falha ao ler Excel: ${error}`, type: 'unknown' });
                }
            };
            reader.onerror = (error) => resolve({ success: false, error: `Erro na leitura: ${error}`, type: 'unknown' });
            reader.readAsBinaryString(file);
        });
    }

    /**
     * Processa arquivos Word (.docx)
     * Extrai apenas texto bruto por enquanto. Tabelas complexas podem perder estrutura.
     */
    private async processDocx(file: File): Promise<ExtractedContent> {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    const result = await mammoth.extractRawText({ arrayBuffer });

                    resolve({
                        success: true,
                        text: this.cleanText(result.value),
                        type: 'text',
                        metadata: { messages: result.messages }
                    });
                } catch (error) {
                    resolve({ success: false, error: `Falha ao ler DOCX: ${error}`, type: 'unknown' });
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Processa arquivos PDF
     */
    private async processPdf(file: File): Promise<ExtractedContent> {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            const metadata = await pdf.getMetadata();

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += `[Pág ${i}] ${pageText}\n`;
            }

            return {
                success: true,
                text: this.cleanText(fullText),
                type: 'text',
                metadata: metadata
            };
        } catch (error) {
            return { success: false, error: `Falha ao ler PDF: ${error}`, type: 'unknown' };
        }
    }

    /**
     * Processa arquivos JSON
     */
    private async processJson(file: File): Promise<ExtractedContent> {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            return {
                success: true,
                data: Array.isArray(data) ? data : (data.conteudo_extraido?.dados || []), // Suporta formato direto ou do script Python
                type: 'structured'
            };
        } catch (error) {
            return { success: false, error: `JSON inválido: ${error}`, type: 'unknown' };
        }
    }

    /**
     * Método principal
     */
    public async extract(file: File): Promise<ExtractedContent> {
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'xlsx' || ext === 'xls') {
            return this.processExcel(file);
        } else if (ext === 'docx') {
            return this.processDocx(file);
        } else if (ext === 'pdf') {
            return this.processPdf(file);
        } else if (ext === 'json') {
            return this.processJson(file);
        } else {
            return { success: false, error: "Formato não suportado", type: 'unknown' };
        }
    }
}
