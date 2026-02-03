import cboData from './cbo_mapping.json';

export interface CboItem {
    codigo: string;
    ocupacao: string;
}

const CBO_LIST = cboData as CboItem[];

export const searchCbo = async (term: string): Promise<CboItem[]> => {
    if (!term) return [];

    await new Promise(resolve => setTimeout(resolve, 30)); // Mock async

    const lower = term.toLowerCase();

    // Filter by code (starts with) or description (includes)
    return CBO_LIST.filter(i =>
        i.codigo.startsWith(lower) ||
        i.ocupacao.toLowerCase().includes(lower)
    ).slice(0, 50);
};

export const getCboLabel = (code: string): string => {
    const found = CBO_LIST.find(i => i.codigo === code);
    return found ? `${found.codigo} - ${found.ocupacao}` : code;
};
