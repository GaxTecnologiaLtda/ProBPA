/**
 * Sigtap Normalization Utility
 * 
 * Este utilitário traduz códigos internos e atalhos textuais utilizados pelo e-SUS PEC
 * para códigos formais de 10 dígitos do SIGTAP (Ministério da Saúde).
 * 
 * É utilizado primariamente na Cloud Function `aggregateConnectorProduction` antes de salvar os resumos diários.
 */

// MAPEAMENTO DIRETO (DE -> PARA)
// Para códigos numéricos internos do PEC que não batem com o SIGTAP.
export const SIGTAP_DICTIONARY: Record<string, { code: string, name: string }> = {
    'ABPG028': { code: '0301100209', name: 'ADMINISTRAÇÃO DE MEDICAMENTOS POR VIA INTRAMUSCULAR' },
    '028': { code: '0301100209', name: 'ADMINISTRAÇÃO DE MEDICAMENTOS POR VIA INTRAMUSCULAR' },
    'ABPG027': { code: '0301100217', name: 'ADMINISTRAÇÃO DE MEDICAMENTOS POR VIA ORAL' },
    '027': { code: '0301100217', name: 'ADMINISTRAÇÃO DE MEDICAMENTOS POR VIA ORAL' },
    'ABPG033': { code: '0301100039', name: 'AFERIÇÃO DE PRESSÃO ARTERIAL' },
    '033': { code: '0301100039', name: 'AFERIÇÃO DE PRESSÃO ARTERIAL' },
    'ABPG038': { code: '0101040075', name: 'MEDIÇÃO DE ALTURA' },
    '038': { code: '0101040075', name: 'MEDIÇÃO DE ALTURA' },
    'ABPG039': { code: '0101040083', name: 'MEDIÇÃO DE PESO' },
    '039': { code: '0101040083', name: 'MEDIÇÃO DE PESO' },
    'ABPO015': { code: '0101020104', name: 'ORIENTAÇÃO DE HIGIENE BUCAL' },
    '015': { code: '0101020104', name: 'ORIENTAÇÃO DE HIGIENE BUCAL' },
    'ABPO005': { code: '0101020074', name: 'APLICAÇÃO TÓPICA DE FLÚOR (INDIVIDUAL POR SESSÃO)' },
    '005': { code: '0101020074', name: 'APLICAÇÃO TÓPICA DE FLÚOR (INDIVIDUAL POR SESSÃO)' },
    'ABPO019': { code: '0307030059', name: 'RASPAGEM ALISAMENTO E POLIMENTO SUPRAGENGIVAIS (POR SEXTANTE)' },
    '019': { code: '0307030059', name: 'RASPAGEM ALISAMENTO E POLIMENTO SUPRAGENGIVAIS (POR SEXTANTE)' },
    'ABPO016': { code: '0307030040', name: 'PROFILAXIA / REMOÇÃO DA PLACA BACTERIANA' },
    '016': { code: '0307030040', name: 'PROFILAXIA / REMOÇÃO DA PLACA BACTERIANA' },
    'ODONTO': { code: '0301010048', name: 'CONSULTA DE PROFISSIONAIS DE NIVEL SUPERIOR NA ATENÇÃO ESPECIALIZADA (EXCETO MÉDICO)' },
};

export const normalizeCns = (cns: string | undefined | null) => {
    if (!cns) return '';
    return String(cns).replace(/\D/g, '');
};

export const normalizeVaccine = (name: string, type: string) => {
    const rawNameUpper = String(name || '').toUpperCase();
    const nameUpper = rawNameUpper.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents
    const isVaccine = type === 'VACCINATION' ||
        nameUpper.includes('VACINA') ||
        nameUpper.includes('IMUNIZA') ||
        nameUpper.includes('TRIPLICE') ||
        nameUpper.includes('BCG') ||
        nameUpper.includes('HEPATITE') ||
        nameUpper.includes('DIFTERIA') ||
        nameUpper.includes('TETANO') ||
        nameUpper.includes('ROTAVIRUS') ||
        nameUpper.includes('POLIOMIELITE') ||
        nameUpper.includes('MENINGO');

    if (isVaccine) {
        // 1. VIA ORAL (03.01.10.021-7)
        if (nameUpper.includes('ORAL') || nameUpper.includes('VOP') || nameUpper.includes('ROTAVIRUS') || nameUpper.includes('BOCA') || nameUpper.includes('GOTA') || nameUpper.includes('POLIOMIELITE')) {
            return { code: '0301100217', name: 'ADMINISTRAÇÃO DE MEDICAMENTOS POR VIA ORAL' };
        }

        // 2. VIA INTRADÉRMICA (03.01.10.023-3)
        if (nameUpper.includes('INTRADERMICA') || nameUpper.includes('INTRADÉRMICA') || nameUpper.includes('BCG') || nameUpper.includes('ID')) {
            return { code: '0301100233', name: 'ADMINISTRAÇÃO TÓPICA DE MEDICAMENTO(S)' }; // Sigtap closest generic
        }

        // 3. VIA SUBCUTÂNEA (03.01.10.022-5)
        if (nameUpper.includes('SUBCUTANEA') || nameUpper.includes('SUBCUTÂNEA') ||
            nameUpper.includes('TRIPLICE') || nameUpper.includes('SARAMPO') || nameUpper.includes('CAXUMBA') || nameUpper.includes('RUBEOLA') ||
            nameUpper.includes('FEBRE AMARELA') ||
            nameUpper.includes('VARICELA') || nameUpper.includes('CATAPORA') ||
            nameUpper.includes('TETRA VIRAL') || nameUpper.includes('SCR') ||
            nameUpper.includes('SC')) {
            return { code: '0301100225', name: 'ADMINISTRAÇÃO DE MEDICAMENTOS POR VIA SUBCUTÂNEA' };
        }

        // 4. VIA INTRAMUSCULAR (03.01.10.020-9) - Broadest Category
        if (nameUpper.includes('INTRAMUSCULAR') || nameUpper.includes('IM') ||
            nameUpper.includes('HEPATITE') ||
            nameUpper.includes('PENTA') || nameUpper.includes('DTP') || nameUpper.includes('HIB') ||
            nameUpper.includes('VIP') ||
            nameUpper.includes('PNEUMO') || nameUpper.includes('MENINGO') ||
            nameUpper.includes('INFLUENZA') || nameUpper.includes('GRIPE') ||
            nameUpper.includes('COVID') ||
            nameUpper.includes('DUPLA') || nameUpper.includes('DT') ||
            nameUpper.includes('TETANO') || nameUpper.includes('TÉTANO') ||
            nameUpper.includes('HPV')) {
            return { code: '0301100209', name: 'ADMINISTRAÇÃO DE MEDICAMENTOS POR VIA INTRAMUSCULAR' };
        }

        if (nameUpper.includes('ENDOVENOSA')) {
            return { code: '0301100195', name: 'ADMINISTRAÇÃO DE MEDICAMENTOS POR VIA ENDOVENOSA' };
        }

        // Default Fallback for ANY vaccine not matched above is usually IM in reports
        return { code: '0301100209', name: 'ADMINISTRAÇÃO DE MEDICAMENTOS POR VIA INTRAMUSCULAR' };
    }
    return null;
};

export const resolveSigtapCode = (rec: any): { code: string, name: string } => {
    const proc = rec.procedure || {};
    let rawCode = proc.code ? String(proc.code) : (rec.procedureCode ? String(rec.procedureCode) : (rec.code ? String(rec.code) : ''));
    let code = rawCode.replace(/\D/g, ''); // Extract only digits
    if (!code && rawCode) code = rawCode.toUpperCase(); // Fallback if it's strictly alphabetical like ODONTO

    let name = proc.name || rec.procedureName || rec.name || 'Procedimento Sem Nome';
    const type = proc.type || rec.type || '';
    const profCbo = rec.professional?.cbo || rec.cbo || '';

    // 1. SUBSTITUIÇÃO DIRETA PELO DICIONÁRIO E-SUS -> SIGTAP
    if (SIGTAP_DICTIONARY[code]) {
        return SIGTAP_DICTIONARY[code];
    }

    const isSmallCode = code.length <= 5;
    const nameUpper = name.toUpperCase();

    // 2. NORMALIZAÇÃO DE VACINAS COM CÓDIGOS PEQUENOS
    if (isSmallCode && (nameUpper.includes('VACINA') || nameUpper.includes('IMUNIZA'))) {
        const vacNorm = normalizeVaccine(name, type);
        if (vacNorm) return vacNorm;
    }

    const vaccineNormalization = normalizeVaccine(name, type);
    if (vaccineNormalization) return vaccineNormalization;

    // 3. NORMALIZAÇÃO DE ATENDIMENTOS/CONSULTAS
    const isConsultation =
        type === 'CONSULTATION' ||
        code === 'CONSULTA' ||
        type === 'ODONTOLOGY' ||
        type === 'ODONTO_PROCEDURE' ||
        nameUpper.includes('ATENDIMENTO ODONTOLOGICO') ||
        ['0301010072', '0301010048', '0301010021'].includes(code);

    if (isConsultation) {
        // Médicos
        if (profCbo.startsWith('225')) {
            return { code: '0301010064', name: 'CONSULTA MÉDICA EM ATENÇÃO PRIMÁRIA' };
        }

        // Outros Profissionais de Nível Superior (Odonto, Enfermeiros, etc)
        const blacklist = ['0301010072', '0301010048', '0301010021'];
        if (code.length === 10 && code.startsWith('0') && !blacklist.includes(code)) {
            return { code, name };
        }
        return { code: '0301010030', name: 'CONSULTA DE PROFISSIONAIS DE NÍVEL SUPERIOR NA ATENÇÃO PRIMÁRIA (EXCETO MÉDICO)' };
    }

    // 4. PRESERVA CÓDIGOS SIGTAP VÁLIDOS (10 DÍGITOS COMEÇANDO COM 0)
    if (code.length === 10 && code.startsWith('0')) return { code, name };

    // 5. CAI AQUI SE FUGIR DE TUDO E NÃO TIVER NO DICIONÁRIO
    return { code: code || 'S/N', name };
};
