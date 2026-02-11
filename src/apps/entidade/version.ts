export const APP_VERSION = '1.7.7';

export const getVersionString = () => {
    return APP_VERSION;
};

export const LATEST_CHANGES = [
    {
        version: '1.7.7',
        date: '10/02/2026',
        title: 'Filtros Avançados & UI Dark Mode',
        changes: [
            'Filtros Avançados: Novo painel expansível permitindo filtrar profissionais por Período, Unidade e Cargo/CBO.',
            'Refinamento de Busca: A busca por Nome/CPF agora pode ser combinada com os filtros de data e unidade.',
            'Correções Visuais: Ajuste de legibilidade nos campos de entrada para o Modo Escuro (Dark Mode).',
            'Lógica Temporal: O filtro de data agora respeita o fuso horário local, eliminando discrepâncias.'
        ]
    },
    {
        version: '1.7.6',
        date: '09/02/2026',
        title: 'Sistema de Notificações e Refinamentos',
        changes: [
            'Novo Sistema de Notificações (Sino no topo).',
            'Cadastro de Profissionais agora usa lista fechada de CBOs.',
            'Campos de contato (Email/Whatsapp) obrigatórios.',
            'Nova imagem de exemplo para assinatura.'
        ]
    },
    {
        version: '1.7.5',
        date: '08/02/2026',
        title: 'Assinaturas e Refinamentos de Relatório',
        changes: [
            'Assinatura Digital: Novo recurso para ajuste e visualização e download da assinatura do profissional.',
            'Produção Global: Otimização significativa no carregamento da aba de produção unificada.',
            'Relatórios Precisos: Refinamento nos filtros de extração para eliminar duplicatas e normalizar códigos de vacinas (padrão SIGTAP).'
        ]
    },
    {
        version: '1.7.4',
        date: '07/02/2026',
        title: 'Otimização de Performance e UX',
        changes: [
            'Performance: Implementado cache em memória (RAM) para dados de produção, tornando a navegação entre abas instantânea.',
            'Experiência do Usuário: Novo indicador visual de carregamento ("Blur + Mensagem") eliminando telas brancas e flashes durante a sincronização.',
            'Feedback Visual: Mensagens de carregamento refinadas para melhor alinhar expectativas em grandes volumes de dados.'
        ]
    },
    {
        version: '1.7.3',
        date: '07/02/2026',
        title: 'Correção de Exibição no Painel',
        changes: [
            'Dashboard: Agora o painel principal exibe automaticamente a produção importada via Conector assim que o profissional é vinculado à entidade.',
            'Correção de Totais: Os gráficos de evolução e cards de produção consolidada agora somam corretamente os dados digitados manualmente e os importados.',
            'Sincronização: Ajuste para garantir que dados antigos apareçam assim que o médico for cadastrado, sem necessidade de reimportar.',
            'Municípios: O card de cada cidade agora exibe a "Produção Realizada" real, somando dados manuais e do conector.'
        ]
    },
    {
        version: '1.7.2',
        date: '06/02/2026',
        title: 'Otimizações em Ações e Programas',
        changes: [
            'Cadastro de Produção: Adicionado campo CPF e lógica condicional (exige CNS ou CPF).',
            'Interface: Remoção do campo Gênero e expansão dos dados do paciente na lista de histórico (Nome, CNS, CPF, Nasc).',
            'Refinamentos: Ajustes finos de layout e correção de contraste para o Modo Escuro no modal de produção.'
        ]
    },
    {
        version: '1.7.1',
        date: '05/02/2026',
        title: 'Novo Módulo: Ações e Programas',
        changes: [
            'Implantação: Lançamento da nova aba "Ações e Programas" para gestão oficial de campanhas e atividades coletivas.',
            'Sincronização (Dual Write): Ações criadas na entidade são automaticamente replicadas no painel do município vinculado.',
            'Interface Premium: Cards com visual modernizado, contadores de produção e suporte completo a modo escuro.',
            'Correções: Ajustes de permissões de escrita e correção nos seletores de cadastro (Município/Profissional).'
        ]
    },
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
