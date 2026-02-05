export const APP_VERSION = '1.7.0';

export const getVersionString = () => {
    return APP_VERSION;
};

export const LATEST_CHANGES = [
    {
        version: '1.7.0',
        date: '04/02/2026',
        title: 'Conector ProBPA & Performance',
        changes: [
            'Conector Oficial: Lançamento da central de importação e dashboard com performance extrema (carregamento instantâneo via cache).',
            'Correção Inteligente: O sistema agora corrige automaticamente discrepâncias de produção causadas por erros no cadastro do CNS.',
            'Segurança: Travas de validação rigorosas para garantir que novos cadastros respeitem o padrão CNS (15 dígitos).'
        ]
    },
    {
        version: '1.6.3',
        date: '04/02/2026',
        title: 'Correção na Busca SIGTAP e Estabilidade',
        changes: [
            'Busca SIGTAP: Corrigido problema onde a busca rápida não retornava resultados; implementado mecanismo de busca profundo.',
            'Estabilidade: Corrigido travamento ao abrir detalhes do procedimento (botão "i").',
            'Cadastro Profissional: Validação estrita de 15 dígitos para o CNS e alerta visual sobre vínculo CNES.'
        ]
    },
    {
        version: '1.6.2',
        date: '30/01/2026',
        title: 'Melhorias Importação & Cadastro',
        changes: [
            'Importação: Botão de exclusão de registros na pré-visualização.',
            'Importação: Normalização automática de cargos (Gênero/Sinônimos).',
            'Correções: Ajustes de filtros e exclusão no cadastro manual.'
        ]
    },
    {
        version: '1.6.1',
        date: '30/01/2026',
        title: 'Correção no Cadastro Manual',
        changes: [
            'Cadastro de Profissionais: Adicionado filtro de Município na seleção de vínculo (lotação).',
            'Correção de Bug: A lista de unidades agora exibe apenas as unidades pertencentes ao município selecionado, evitando listagem global incorreta.'
        ]
    },
    {
        version: '1.6.0',
        date: '23/01/2026',
        title: 'Auditoria e Gestão de Lotação',
        changes: [
            'Logs de Uso: Novo painel de auditoria registrando todas as ações (Login, Criação, Edição, Exclusão) com detalhes e filtros.',
            'Edição de Lotação: Agora é possível editar vínculos de profissionais, movendo-os entre unidades sem recriar cadastro.',
            'Identificação Humanizada: Logs de exclusão agora informam o nome do item removido (ex: "Excluiu a unidade Matriz") em vez de apenas o ID.'
        ]
    },
    {
        version: '1.5.2',
        date: '23/01/2026',
        title: 'Melhorias de Usabilidade e Dashboard (Release Consolidado)',
        changes: [
            'Produção Consolidada: Corrigido problema de visualização zerada nos cards de produção.',
            'Gráficos Inteligentes: Ativado gráfico de "Top Municípios" com agregação dinâmica.',
            'Tooltips Explicativos: Adicionados ícones de informação ("i") nos cards do dashboard para auxiliar na interpretação das métricas.',
            'Refinamentos de Cadastro: CNS opcional no formulário manual e nova busca inteligente de CBO.',
            'Interface: Cards de profissionais atualizados priorizando o CPF.',
            'Segurança: Senhas aleatórias exibidas no primeiro acesso.'
        ]
    },
    {
        version: '1.5.0',
        date: '23/01/2026',
        title: 'Importação Inteligente de Profissionais',
        changes: [
            'Importação em Lote: Nova ferramenta para importar profissionais via Excel, JSON e PDF.',
            'CBOs Inteligentes: Reconhecimento automático de cargos ignorando gênero e preposições (ex: "Técnica em..." -> "Técnico de...").',
            'Fuzzy Match de Unidades: O sistema agora encontra a unidade correta mesmo se o nome estiver digitado ligeiramente diferente no arquivo.'
        ]
    },
    {
        version: '1.4.3',
        date: '19/01/2026',
        title: 'Melhorias de Acesso',
        changes: [
            'Login: Adicionada opção de visualizar senha ("olhinho") para facilitar o acesso.',
            'Segurança: Melhorias na recuperação de credenciais.'
        ]
    },
    {
        version: '1.4.2',
        date: '19/01/2026',
        title: 'Melhorias de Usabilidade e Cadastros',
        changes: [
            'Tipos de Unidade: Adicionada opção "Centro" genérico ao cadastro de unidades.',
            'Notificações de Versão: Novo indicador visual (bolinha vermelha) para alertar sobre atualizações recentes no sistema.',
            'Correções Diversas: Ajustes finos no layout e feedback visual.'
        ]
    },
    {
        version: '1.4.1',
        date: '11/01/2026',
        title: 'Correção na Contabilização de Metas',
        changes: [
            'Suporte a Metas Plurianuais: Corrigida contabilização para metas com vigência entre anos (ex: 2025-2026).',
            'Identificação SIGTAP: Melhorada lógica de hierarquia para Grupos e Subgrupos.',
            'Normalização de IDs: Extração inteligente de IDs do município/unidade para uploads rápidos.'
        ]
    }
];
