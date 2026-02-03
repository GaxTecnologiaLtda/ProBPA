
import JSZip from 'jszip';
import {
    SigtapDomainTree, SigtapField, ParsedTable, SigtapGroup,
    SigtapSubGroup, SigtapForma, SigtapProcedureDetail, SigtapRegistro, SigtapCid, SigtapBaseEntity
} from '../types';

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

const ENCODING = 'iso-8859-1'; // SIGTAP standard

// File Mapping: FileName -> InternalKey
const MANIFEST = {
    // Base Tables
    'tb_grupo': 'groups',
    'tb_sub_grupo': 'subgroups',
    'tb_forma_organizacao': 'forms',
    'tb_procedimento': 'procedures',

    // Lookups
    'tb_registro': 'registries',
    'tb_cid': 'cids',
    'tb_servico': 'services',
    'tb_modalidade': 'modalities',
    'tb_ocupacao': 'occupations',
    'tb_habilitacao': 'habilitations',
    'tb_descricao': 'descriptions',
    'tb_regra_condicionada': 'rules',
    'tb_renases': 'renases',
    'tb_tuss': 'tuss',
    'tb_financiamento': 'financiamentos',
    'tb_rubrica': 'rubricas',
    'tb_tipo_leito': 'leitos',
    'tb_sia_sih': 'sia_sih', // Added

    // Relationships
    'rl_procedimento_registro': 'rel_proc_reg',
    'rl_procedimento_cid': 'rel_proc_cid',
    'rl_procedimento_servico': 'rel_proc_serv',
    'rl_procedimento_modalidade': 'rel_proc_mod',
    'rl_procedimento_ocupacao': 'rel_proc_cbo',
    'rl_procedimento_habilitacao': 'rel_proc_hab',
    'rl_procedimento_leito': 'rel_proc_leito',
    'rl_procedimento_origem': 'rel_proc_origem',
    'rl_procedimento_compativel': 'rel_proc_comp',
    'rl_excecao_compatibilidade': 'rel_proc_comp_ex', // Added
    'rl_procedimento_comp_rede': 'rel_proc_comp_rede', // Added
    'rl_procedimento_incremento': 'rel_proc_inc',
    'rl_procedimento_regra_cond': 'rel_proc_rule',
    'rl_procedimento_renases': 'rel_proc_renases',
    'rl_procedimento_tuss': 'rel_proc_tuss',
    'rl_procedimento_detalhe': 'rel_proc_detalhe',
    'rl_procedimento_sia_sih': 'rel_proc_sia_sih' // Added
};

// ============================================================================
// MAIN PARSER
// ============================================================================

export class SigtapParser {

    private zip: JSZip;
    private logCallback: (msg: string) => void;
    private parsedTables: Map<string, ParsedTable> = new Map();

    constructor(logCallback: (msg: string) => void) {
        this.zip = new JSZip();
        this.logCallback = logCallback;
    }

    async processZip(file: File): Promise<SigtapDomainTree> {
        this.log("Iniciando leitura do arquivo ZIP...");
        const content = await this.zip.loadAsync(file);

        // 1. Detect Competence
        let competence = this.detectCompetence(file.name);
        this.log(`Competência detectada: ${competence}`);

        // 2. Identify Files
        const layoutFiles = new Map<string, JSZip.JSZipObject>();
        const dataFiles = new Map<string, JSZip.JSZipObject>();

        this.zip.forEach((path, entry) => {
            if (entry.dir) return; // Ignore directory entries

            const fullPath = entry.name;
            // Get basename (handle both / and \ just in case)
            const baseName = fullPath.split(/[/\\]/).pop() || '';
            const lowerName = baseName.toLowerCase();
            const fileName = lowerName.replace('.txt', '').replace('_layout', '');

            if (lowerName.includes('_layout')) {
                layoutFiles.set(fileName, entry);
            } else if (lowerName.endsWith('.txt')) {
                dataFiles.set(fileName, entry);
            }
        });

        // 3. Parse Tables
        for (const [key, alias] of Object.entries(MANIFEST)) {
            const layoutEntry = layoutFiles.get(key);
            const dataEntry = dataFiles.get(key);

            if (layoutEntry && dataEntry) {
                this.log(`Processando tabela: ${key}...`);
                await this.parseTable(alias, layoutEntry, dataEntry);
            } else {
                // Some are optional, log warning
                if (!['tb_descricao', 'tb_ocupacao'].includes(key)) {
                    // console.warn(`Missing file or layout for ${key}`);
                }
            }
        }

        // 4. Build Tree
        this.log("Construindo árvore hierárquica SIGTAP...");
        const tree = this.buildTree(competence);

        this.log(`Processamento concluído! Total de Procedimentos: ${tree.stats.totalProcedures}`);
        return tree;
    }

    private log(msg: string) {
        this.logCallback(msg);
    }

    private detectCompetence(filename: string): string {
        const match = filename.match(/\d{6}/);
        if (match) return match[0];
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        return `${yyyy}${mm}`;
    }

    // ========================================================================
    // LOW LEVEL PARSING
    // ========================================================================

    private async parseTable(alias: string, layoutFile: JSZip.JSZipObject, dataFile: JSZip.JSZipObject) {
        const decoder = new TextDecoder(ENCODING);

        // 1. Parse Layout
        const layoutText = await layoutFile.async('text'); // Layout is usually UTF-8/ASCII
        const fields = this.parseLayoutDefinition(layoutText);

        // 2. Parse Data
        const dataBuffer = await dataFile.async('arraybuffer');
        const dataText = decoder.decode(dataBuffer);
        const rows = this.parseDataLines(dataText, fields);

        this.parsedTables.set(alias, { tableName: alias, rows });
    }

    private parseLayoutDefinition(content: string): SigtapField[] {
        const fields: SigtapField[] = [];
        const lines = content.split('\n');

        // Skip header usually line 1 
        // Format: Name,Len,Start,End or Coluna,Tamanho,Inicio,Fim

        lines.forEach(line => {
            if (!line.trim() || line.toLowerCase().startsWith('coluna') || line.toLowerCase().startsWith('nome')) return;

            // Try separating by comma or semi-colon
            const parts = line.split(/[;,]/);
            if (parts.length < 2) return;

            const name = parts[0].trim();
            const len = parseInt(parts[1].trim());
            const start = parseInt(parts[2].trim());
            // End might be implicit or explicit

            if (!isNaN(len) && !isNaN(start)) {
                fields.push({
                    name,
                    len,
                    start, // 1-based from file
                    end: start + len - 1, // inclusive end 1-based
                    type: 'C'
                });
            }
        });
        return fields;
    }

    private parseDataLines(content: string, fields: SigtapField[]): any[] {
        const rows: any[] = [];
        const lines = content.split('\n');

        for (const line of lines) {
            if (line.length < 2) continue; // Skip empty
            const row: any = {};

            for (const field of fields) {
                // Convert 1-based start to 0-based index
                // substring(start, end) -> start is inclusive, end is exclusive in JS
                const startIdx = field.start - 1;
                const endIdx = startIdx + field.len;

                // Safe slice
                const val = line.substring(startIdx, endIdx).trim();
                row[field.name] = val;
            }
            rows.push(row);
        }
        return rows;
    }

    // ========================================================================
    // TREE BUILDER
    // ========================================================================

    private buildTree(competence: string): SigtapDomainTree {
        const getRows = (alias: string) => this.parsedTables.get(alias)?.rows || [];

        // 1. Lookups
        const groupsRaw = getRows('groups');
        const subGroupsRaw = getRows('subgroups');
        const formsRaw = getRows('forms');
        const proceduresRaw = getRows('procedures');

        const registriesRaw = getRows('registries');
        const cidsRaw = getRows('cids');
        const servicesRaw = getRows('services');
        const modalitiesRaw = getRows('modalities');
        const occupationsRaw = getRows('occupations');
        const habilitationsRaw = getRows('habilitations');
        const rulesRaw = getRows('rules');
        const renasesRaw = getRows('renases');
        const tussRaw = getRows('tuss');
        const leitosRaw = getRows('leitos');

        this.log(`DEBUG: Rows parsed - Groups: ${groupsRaw.length}, Subgroups: ${subGroupsRaw.length}, Forms: ${formsRaw.length}, Procedures: ${proceduresRaw.length}`);

        // 2. Build Maps (Entity Hydration)
        const registryMap = new Map<string, SigtapRegistro>();
        registriesRaw.forEach(r => {
            let type: any = 'OUTRO';
            const n = r.NO_REGISTRO.toUpperCase();
            if (n.includes('BPA')) type = 'BPA';
            else if (n.includes('APAC')) type = 'APAC';
            else if (n.includes('AIH')) type = 'AIH';
            registryMap.set(r.CO_REGISTRO, { code: r.CO_REGISTRO, name: r.NO_REGISTRO, type });
        });

        const cidMap = new Map<string, SigtapCid>();
        cidsRaw.forEach(r => cidMap.set(r.CO_CID, { code: r.CO_CID, name: r.NO_CID, principal: 'N' }));

        const serviceMap = new Map<string, SigtapBaseEntity>();
        servicesRaw.forEach(r => serviceMap.set(r.CO_SERVICO, { code: r.CO_SERVICO, name: r.NO_SERVICO }));

        const modalityMap = new Map<string, SigtapBaseEntity>();
        modalitiesRaw.forEach(r => modalityMap.set(r.CO_MODALIDADE, { code: r.CO_MODALIDADE, name: r.NO_MODALIDADE }));

        const cboMap = new Map<string, { code: string, name: string }>(); // SigtapCbo
        occupationsRaw.forEach(r => cboMap.set(r.CO_OCUPACAO, { code: r.CO_OCUPACAO, name: r.NO_OCUPACAO }));

        const habMap = new Map<string, SigtapBaseEntity>();
        habilitationsRaw.forEach(r => habMap.set(r.CO_HABILITACAO, { code: r.CO_HABILITACAO, name: r.NO_HABILITACAO }));

        const ruleMap = new Map<string, { code: string, name: string, desc: string }>();
        rulesRaw.forEach(r => ruleMap.set(r.CO_REGRA_CONDICIONADA, {
            code: r.CO_REGRA_CONDICIONADA,
            name: r.NO_REGRA_CONDICIONADA,
            desc: r.DS_REGRA_CONDICIONADA
        }));

        const renasesMap = new Map<string, SigtapBaseEntity>();
        renasesRaw.forEach(r => renasesMap.set(r.CO_RENASES, { code: r.CO_RENASES, name: r.NO_RENASES }));

        const tussMap = new Map<string, SigtapBaseEntity>();
        tussRaw.forEach(r => tussMap.set(r.CO_TUSS, { code: r.CO_TUSS, name: r.NO_TUSS }));

        const leitoMap = new Map<string, SigtapBaseEntity>();
        leitosRaw.forEach(r => leitoMap.set(r.CO_TIPO_LEITO, { code: r.CO_TIPO_LEITO, name: r.NO_TIPO_LEITO }));

        // 3. Build Relationships (1:N)
        const mapRelations = (alias: string, keyField: string, valueField: string, extraFields: string[] = []) => {
            const map = new Map<string, any[]>();
            const rows = getRows(alias);
            rows.forEach(r => {
                const pk = r[keyField];
                if (!map.has(pk)) map.set(pk, []);
                const item: any = { value: r[valueField] };
                extraFields.forEach(f => item[f] = r[f]);
                map.get(pk)?.push(item);
            });
            return map;
        };

        const procToReg = mapRelations('rel_proc_reg', 'CO_PROCEDIMENTO', 'CO_REGISTRO');
        const procToCid = mapRelations('rel_proc_cid', 'CO_PROCEDIMENTO', 'CO_CID', ['TP_CID']); // Principal/Secundario
        const procToServ = mapRelations('rel_proc_serv', 'CO_PROCEDIMENTO', 'CO_SERVICO'); // Also needs Classificacao? For now just Service
        const procToMod = mapRelations('rel_proc_mod', 'CO_PROCEDIMENTO', 'CO_MODALIDADE');
        const procToCbo = mapRelations('rel_proc_cbo', 'CO_PROCEDIMENTO', 'CO_OCUPACAO');
        const procToHab = mapRelations('rel_proc_hab', 'CO_PROCEDIMENTO', 'CO_HABILITACAO');
        const procToRule = mapRelations('rel_proc_rule', 'CO_PROCEDIMENTO', 'CO_REGRA_CONDICIONADA');
        const procToComp = mapRelations('rel_proc_comp', 'CO_PROCEDIMENTO_PRINCIPAL', 'CO_PROCEDIMENTO_COMPATIVEL');
        const procToCompEx = mapRelations('rel_proc_comp_ex', 'CO_PROCEDIMENTO_PRINCIPAL', 'CO_PROCEDIMENTO_COMPATIVEL'); // Check keys in layout if needed
        const procToCompRede = mapRelations('rel_proc_comp_rede', 'CO_PROCEDIMENTO_PRINCIPAL', 'CO_PROCEDIMENTO_COMPATIVEL'); // Check keys

        const procToRenases = mapRelations('rel_proc_renases', 'CO_PROCEDIMENTO', 'CO_RENASES');
        const procToTuss = mapRelations('rel_proc_tuss', 'CO_PROCEDIMENTO', 'CO_TUSS');
        const procToLeito = mapRelations('rel_proc_leito', 'CO_PROCEDIMENTO', 'CO_TIPO_LEITO');

        // 4. Build Hierarchy
        const groupMap = new Map<string, SigtapGroup>();

        // Init Groups
        groupsRaw.forEach(g => {
            groupMap.set(g.CO_GRUPO, {
                code: g.CO_GRUPO,
                name: g.NO_GRUPO,
                subgrupos: []
            });
        });

        // Init Subgroups
        const subgroupMap = new Map<string, SigtapSubGroup>(); // Key: groupCode-subCode
        subGroupsRaw.forEach(s => {
            const group = groupMap.get(s.CO_GRUPO);
            if (group) {
                const sub: SigtapSubGroup = {
                    code: s.CO_SUB_GRUPO,
                    name: s.NO_SUB_GRUPO,
                    formas: []
                };
                group.subgrupos.push(sub);
                subgroupMap.set(`${s.CO_GRUPO}-${s.CO_SUB_GRUPO}`, sub);
            }
        });

        // Init Forms
        const formaMap = new Map<string, SigtapForma>(); // Key: group-sub-forma
        formsRaw.forEach(f => {
            const key = `${f.CO_GRUPO}-${f.CO_SUB_GRUPO}`;
            const sub = subgroupMap.get(key);
            if (sub) {
                const forma: SigtapForma = {
                    code: f.CO_FORMA_ORGANIZACAO,
                    name: f.NO_FORMA_ORGANIZACAO,
                    procedimentos: []
                };
                sub.formas.push(forma);
                formaMap.set(`${key}-${f.CO_FORMA_ORGANIZACAO}`, forma);
            }
        });

        // 5. Hydrate Procedures
        let totalProcedures = 0;
        let orphanProcedures = 0;

        proceduresRaw.forEach(p => {
            const code = p.CO_PROCEDIMENTO;
            const grp = code.substring(0, 2);
            const sub = code.substring(2, 4);
            const form = code.substring(4, 6);

            const formaKey = `${grp}-${sub}-${form}`;
            const parentForma = formaMap.get(formaKey);

            if (parentForma) {
                // Helpers
                const getMapped = (map: Map<string, any[]>, lookup: Map<string, any>, keyFn: (i: any) => string = i => i.value) =>
                    (map.get(code) || []).map(i => lookup.get(keyFn(i))).filter(Boolean);

                const getMappedWithDetails = (map: Map<string, any[]>, lookup: Map<string, any>) =>
                    (map.get(code) || []).map(i => {
                        const ent = lookup.get(i.value);
                        return ent ? { ...ent, ...i } : null; // Merge relationship details (like TP_CID)
                    }).filter(Boolean);

                // Hydrate
                const procedure: SigtapProcedureDetail = {
                    code,
                    name: p.NO_PROCEDIMENTO,
                    competencia: competence,
                    grupoCode: grp,
                    subgroupCode: sub,
                    formaCode: form,

                    // Attributes
                    sex: p.TP_SEXO,
                    complexity: p.TP_COMPLEXIDADE,
                    points: parseInt(p.QT_PONTOS || '0', 10),
                    ageMin: parseInt(p.VL_IDADE_MINIMA || '0', 10),
                    ageMax: parseInt(p.VL_IDADE_MAXIMA || '9999', 10),
                    daysStay: parseInt(p.QT_DIAS_PERMANENCIA || '0', 10),

                    // Relations
                    registros: getMapped(procToReg, registryMap),
                    cids: getMappedWithDetails(procToCid, cidMap).map((c: any) => ({
                        ...c,
                        principal: (c.TP_CID === 'P' ? 'S' : 'N') as any // Type assertion to fix literal
                    })),
                    servicos: getMapped(procToServ, serviceMap),
                    modalidades: getMapped(procToMod, modalityMap),
                    ocupacoes: getMapped(procToCbo, cboMap) as any,
                    habilitacoes: getMapped(procToHab, habMap),
                    leitos: getMapped(procToLeito, leitoMap),
                    origens: [],
                    incrementos: [],

                    renases: getMapped(procToRenases, renasesMap),
                    tuss: getMapped(procToTuss, tussMap),

                    compatibilidades: [
                        ...(procToComp.get(code) || []).map(i => ({
                            code: i.value,
                            name: 'Compatível',
                            type: 'POSITIVA' as any,
                            details: ''
                        })),
                        ...(procToCompEx.get(code) || []).map(i => ({
                            code: i.value,
                            name: 'Incompatível/Exceção',
                            type: 'NEGATIVA' as any,
                            details: ''
                        })),
                        ...(procToCompRede.get(code) || []).map(i => ({
                            code: i.value,
                            name: 'Rede',
                            type: 'REDE' as any,
                            details: ''
                        }))
                    ],

                    regrasCondicionadas: (procToRule.get(code) || []).map(i => {
                        const r = ruleMap.get(i.value);
                        return r ? {
                            id: r.code,
                            type: 'COMPATIBILIDADE' as any, // Cast to match union type
                            description: r.name,
                            details: r.desc
                        } : null;
                    }).filter(Boolean) as any,

                    descricao: '',
                    detalhes: []
                };

                parentForma.procedimentos.push(procedure);
                totalProcedures++;
            } else {
                orphanProcedures++;
            }
        });

        if (orphanProcedures > 0) {
            this.log(`WARNING: ${orphanProcedures} orphan procedures.`);
        }

        // 6. Final Object
        return {
            competence,
            grupos: Array.from(groupMap.values()),
            lookup: {
                cids: Array.from(cidMap.values()),
                servicos: Array.from(serviceMap.values()),
                modalidades: Array.from(modalityMap.values()),
                registros: Array.from(registryMap.values()),
                cbos: Array.from(cboMap.values()) as any,
                habilitacoes: Array.from(habMap.values())
            },
            stats: {
                totalProcedures,
                totalGroups: groupsRaw.length,
                totalSubgroups: subGroupsRaw.length,
                totalForms: formsRaw.length
            }
        };
    }
}

