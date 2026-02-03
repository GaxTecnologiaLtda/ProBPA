import catmatData from './catmat_mapping.json';

// Basic list of common medications (CATMAT) for Primary Care
// This lists acts as a local fallback/starter. A full implementation would fetch from an API or a larger JSON file.

export interface CatmatItem {
    codigo: string;
    principioAtivo: string;
    concentracao: string;
    formaFarmaceutica: string;
    unidadeFornecimento: string;
}

// Convert JSON data to typed array
const CATMAT_FULL_LIST: CatmatItem[] = catmatData as CatmatItem[];

export const searchCatmat = async (query: string): Promise<CatmatItem[]> => {
    if (!query || query.length < 2) return [];

    const lowerQuery = query.trim().toLowerCase();

    // Simulate async search for UI responsiveness
    return new Promise((resolve) => {
        setTimeout(() => {
            // Limit results to 50 to avoid freezing the UI with large datasets
            const results = CATMAT_FULL_LIST.filter(item =>
                item.principioAtivo.toLowerCase().includes(lowerQuery) ||
                item.codigo.includes(lowerQuery) // removed checking for exact case on code as well
            ).slice(0, 50);

            resolve(results);
        }, 50);
    });
};
