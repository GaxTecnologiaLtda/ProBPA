export const APP_VERSION = '3.2.4';

export const getVersionString = () => {
    return APP_VERSION;
};

export const LATEST_CHANGES = [
    {
        version: '3.2.4',
        date: '12/05/2026',
        title: 'Suporte a Múltiplos CBOs (Subsede)',
        changes: [
            'Seleção Dinâmica: Agora é possível selecionar o CBO específico do profissional no momento do lançamento da produção.',
            'Integridade de Registro: O CBO selecionado é gravado diretamente em cada atendimento, garantindo precisão nos relatórios por profissional.'
        ]
    },
    {
        version: '3.2.3',
        date: '11/05/2026',
        title: 'Ajuste Fino: Bloqueio Retroativo',
        changes: [
            'Bloqueio Individualizado: A trava de digitação retroativa agora respeita a configuração de cada município.',
            'Flexibilidade: Tolerância "0" agora libera a digitação retroativa ilimitada.'
        ]
    },
    {
        version: '3.2.2',
        date: '09/05/2026',
        title: 'Entidade em Cumprimento de Metas',
        changes: [
            'Cumprimento de Metas: Adicionada opção "Computar Entidade", garantindo que a produção retroativa e paralela de "Ações e Programas" de administração interna possa ser espelhada contra as metas estipuladas.'
        ]
    },
    {
        version: '3.2.1',
        date: '09/05/2026',
        title: 'Busca Rápida Inteligente de Procedimentos',
        changes: [
            'Otimização SIGTAP: A busca rápida na aba de "Ações e Programas" agora ignora acentuação, maiúsculas/minúsculas e permite buscas parciais de códigos, alinhando a experiência ao Painel de Produção.'
        ]
    },
    {
        version: '3.2.0',
        date: '09/05/2026',
        title: 'Tolerância Retroativa & Observabilidade',
        changes: [
            'Controle de Competência: Adicionado controle mestre por município para estipular janela de tolerância (em dias) para digitação retroativa de produção na virada do mês.',
            'Auditoria de Bloqueios: Logs do sistema agora registram e destacam visualmente (Alerta em Vermelho) tentativas bloqueadas de registro fora do prazo configurado.'
        ]
    },
    {
        version: '3.1.0',
        date: '04/05/2026',
        title: 'Integridade de Dados & Filtro de Unidades Registradas',
        changes: [
            'Blindagem de Relatórios: Implementada filtragem rigorosa em todas as APIs de produção para ignorar unidades não cadastradas na rede oficial (ex: produções residuais ou de testes).',
            'Consistência Dashboards: Gráficos de Metas Globais, Evolução Financeira e Comparativos agora refletem 100% a realidade do cadastro de unidades.',
            'Correção Visual: Removidas colunas "fantasma" no Comparativo de Unidades, unificando os totais matemáticos com a exibição em tela.',
            'Performance de Agregação: Otimizada a leitura de unidades e profissionais no backend para garantir rapidez nos cruzamentos de dados multi-município.'
        ]
    },
    {
        version: '3.0.2',
        date: '03/05/2026',
        title: 'Evolução Financeira & Otimização de Relatórios',
        changes: [
            'Novo Relatório Financeiro: Implantação do Relatório de Evolução Financeira com layout panorâmico espelhado no Cumprimento de Metas.',
            'Cálculo e Desempenho Server-Side: Processamento em nuvem para cruzamento do volume de procedimentos mensais com os valores unitários estipulados em metas.',
            'Filtros de Intervalo: Inserção de seletores dinâmicos "De/Até" para recortes precisos de meses dentro de uma mesma vigência.',
            'Exportação Aprimorada: Correção nos PDFs para abrirem em nova aba em vez de download direto, com formatação monetária (BRL) refinada.'
        ]
    },
    {
        version: '3.0.1',
        date: '29/04/2026',
        title: 'Recuperação de Documentos & Consistência de Relatórios',
        changes: [
            'Back-fill de Documentos: Implementada lógica de resgate de CNS/CPF para produções manuais a partir da base de pacientes.',
            'Inteligência de Busca: Novo sistema de busca por prefixo que ignora espaços extras e variações de caixa (Case-Insensitive).',
            'Consolidação de Dados: Merge automático de cadastros duplicados para garantir documentação completa nos relatórios PDF.',
            'Correção Multi-Tenant: Ajuste na resolução de caminhos Firestore para acesso via perfis de Subsede em entidades privadas.'
        ]
    },
    {
        version: '3.0.0',
        date: '12/04/2026',
        title: 'Release Consolidado',
        changes: [
            'Correção de bugs e estabilização de relatórios comparativos matemáticos.',
            'Otimização de recursos impedindo consultas e sobreposições fantasmas via Firestore.',
            'Ajuste e aprimoramento nas ferramentas de análise (UX de calendário personalizado e rolagem).'
        ]
    },
    {
        version: '2.3.5',
        date: '24/03/2026',
        title: 'Melhorias de Layout & Cadastro de Profissionais',
        changes: [
            'Inclusão de CBO: Adicionado o CBO de Biomédico (221205) para vínculo na Base de Profissionais e Corpo Clínico.',
            'Melhoria de UI: Layout do formulário "Cadastro de Profissional na Base" (Ações e Programas) foi refinado com novos espaçamentos para maior respiro e legibilidade.'
        ]
    },
    {
        version: '2.3.4',
        date: '18/03/2026',
        title: 'Melhorias UI - Registro de Ações (Painel Entidade)',
        changes: [
            'Nomenclatura Procedimental: Visualização combinada do código e Nome do SIGTAP anexado ao procedimento na lista de histórico das ações.',
            'Quick Edit Patient (Variante Ações): Sistema importado da raiz central; liberação da edição e correção dos dados cadastrais com retro-preenchimento no Master Data em 1-clique.'
        ]
    },
    {
        version: '2.3.3',
        date: '16/03/2026',
        title: 'Auditoria Inteligente, Ações e Produtividade (Painel Subsede)',
        changes: [
            'Boletins Inteligentes (Ações): O PDF de "Ações e Programas" agora implementa a rotação Cíclica de Fallback, capaz de resgatar digitalmente a foto da assinatura do profissional vinculada diretamente na Célula Especial (independente dele existir nas prefeituras atreladas ou da ação não ter lotação raiz definida).',
            'Select Buscável de Profissionais: Substituição do clássico filtro da tabela de Histórico por uma caixa suspensa dinâmica.',
            'Caneta de Edição ao Vivo: Edição "Inline" acoplada no nome do Paciente dentro da lista de produções.',
            'Atualização Retroativa O(N): A Caneta deflagra um Update Assíncrono no banco reescrevendo todas as produções anteriores do paciente.',
            'O(1) Smart Bulk Fetch de Documentos: Carga dinâmica preenchendo CPF/CNS faltantes nos históricos antigos em tempo real.',
            'Display Avançado SIGTAP: Substituída a exibição simplória de Procedimentos por um card denso na listagem.'
        ]
    },
    {
        version: '2.3.2',
        date: '15/03/2026',
        title: 'Produção da Entidade no Relatório e UI',
        changes: [
            'Entidade no Comparativo: Adicionada exibição da Entidade como uma "Unidade" autônoma no relatório numérico visando capturar a produção das "Ações e Programas" de administração interna. Inclusão condicional ("Exibir Entidade?").',
            'Nomeação Automática: Ajustada a lógica de busca e injeção para exibir o nome fantasia verídico da instituição tanto na tela quanto na exportação em PDF.'
        ]
    },
    {
        version: '2.3.1',
        date: '12/03/2026',
        title: 'Correção de Lotação em Relatórios de Produção',
        changes: [
            'Produção por Profissional: O relatório individualizado e os PDFs do Boletim BPA agora listam e geram documentos corretamente segregados por Lotação (Unidade) caso o profissional tenha registrado produção em múltiplos estabelecimentos na mesma competência.'
        ]
    },
    {
        version: '2.3.0',
        date: '12/03/2026',
        title: 'Visão Estratégica de Metas nos Dashboards',
        changes: [
            'Produção Pactuada vs Extra-teto: Agora os painéis "Visão Geral" e "Produção Global" separam detalhadamente o volume da sua produção que compõe as metas financeiras (Pactuada) e a parte da produção sem cobertura (Não Pactuada / Extra-teto).',
            'Gráfico Top Municípios: O ranking de volume de municípios ganhou o novo visual empilhado (Stacked Bar). Agora é possível ver em uma única barra a fatia exata de produção pactuada (colorida) e não pactuada (cinza) para cada cidade parceira.'
        ]
    },
    {
        version: '2.2.1',
        date: '09/03/2026',
        title: 'Melhorias de Exportação e UI',
        changes: [
            'PDFs Oficiais: O relatório de Cadastros Ativos agora conta com o logotipo da Entidade no cabeçalho e um rodapé centralizado com CNPJ, endereço e contato.',
            'Rede de Unidades: Cards de municípios foram ajustados para exibição colapsada por padrão para otimizar tempo de navegação e carregamento visual.'
        ]
    },
    {
        version: '2.2.0',
        date: '07/03/2026',
        title: 'Arquitetura Serverless & Otimizações de UI/UX',
        changes: [
            'Performance Extrema: Migramos o processamento pesado de relatórios de produção (Agrupado e Individualizado) para Cloud Functions no backend, acabando com travamentos no navegador.',
            'Segurança Multi-Tenant: Reforçado o isolamento de dados com leitura compulsória do Token Firebase; requisições não podem mais ser forjadas por payloads não-autorizados.',
            'Correção "Produção Zerada": Restauramos a ponte de IDs e a resiliência `try-catch` linha a linha nas APIs resolvendo o bug de relatórios que voltavam vazios da base na leitura do Subsede.',
            'Exportação UX Flattening: O tradicional painel de Produção por Profissional foi reprojetado. O "Boletim BPA" agora exibe ações de exportação em um único clique sem menus intermediários labirínticos.',
            'Filtro de Competências Inteligente: Consolidada a normalização de datas "MM-YYYY" vs "YYYY-MM" para extrações do conector, exibindo todos os registros atrelados à entidade corretamente no Dashboard.',
            'Sub-aba Procedimentos (CBO): Estreia da régua de metas versus executado na aba "Comparativo por Procedimento Geral" mapeando individualmente performance no SIGTAP.',
            'Responsividade Mobile-First: Todo o layout dos painéis Analíticos, Configurações de Filtros, Headers e Modais agora empilham impecavelmente em dispositivos móveis, sem quebras na tela.'
        ]
    },
    {
        version: '2.1.1',
        date: '02/03/2026',
        title: 'Novos Relatórios & Otimizações de Estabilidade',
        changes: [
            'Produção Agrupada: Lançamento do novo relatório "Produção por Profissional - Agrupado", gerando PDFs otimizados e curtos com totais semanais/diários ao invés de listagem linha a linha.',
            'Correção na Exclusão: Solucionado erro 500 (Batch Delete) ao excluir profissionais com unidades remanejadas ou inexistentes.',
            'Filtros de Data Nativos: O filtro de dias personalizado na aba de Produção agora respeita adequadamente a ISO e o fuso horário para a busca e geração do PDF.',
            'Interface Preparatória: Adicionados rótulos de "Em Breve" para relatórios analíticos em fase final de testes qualitativos (Metas, Cobertura, etc).'
        ]
    },
    {
        version: '2.1.0',
        date: '01/03/2026',
        title: 'Gestão Avançada de Ações e Programas',
        changes: [
            'Contadores Dinâmicos: Cards de Ações agora exibem em tempo real o total de Procedimentos e Pacientes únicos baseados na produção.',
            'Relatório Oficial: PDF do "Relatório de Atividade Coletiva (BDPA)" atualizado com formatação visual precisa, logotipos em alta resolução e o nome da sua Entidade de Saúde no cabeçalho.',
            'Acúmulo Inteligente: Registrar nova produção para o mesmo paciente no mesmo dia agora soma os novos procedimentos do invés de sobrescrever o registro original.',
            'Permissões Expandidas: Usuários com o perfil de Coordenação (SUBSEDE) agora possuem permissão para criar, editar e excluir Ações.'
        ]
    },
    {
        version: '2.0.0',
        date: '26/02/2026',
        title: 'Nova Geração: Relatórios, Backup e Subsede',
        changes: [
            'Novo relatório de unidades ativo.',
            'Backup de cadastros contra prevenção de perdas.',
            'Ativação do painel da subsede com permissões de coordenador local.',
            'Recursos de monitoramento de dados aprimorados.',
            'Refinamento da interface e usabilidade.'
        ]
    },
    {
        version: '1.7.8',
        date: '20/02/2026',
        title: 'Correção na Exclusão de Metas',
        changes: [
            'Metas Pactuadas: Corrigido erro de permissão que impedia a exclusão e edição em lote de metas.',
            'Segurança: A exclusão agora garante a correspondência estrita com a sua Entidade, eliminando os bloqueios de segurança do Firebase.'
        ]
    },
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
