# Changelog

## [1.7.2] - 2026-02-06
### Otimizações em Ações e Programas
- **Produção e Cadastro:**
    - **Identificação Flexível:** Adicionado campo CPF ao formulário de registro de produção. O sistema agora aceita tanto CNS quanto CPF (pelo menos um é obrigatório).
    - **Simplificação:** O campo "Gênero" foi removido do formulário de produção para agilizar o preenchimento.
    - **Histórico Detalhado:** A lista de últimos registros agora exibe dados completos do paciente (Nome, CNS, CPF e Data de Nascimento).
- **Interface e Usabilidade:**
    - **Modo Escuro:** Refinamento de cores e bordas no modal de produção para garantir legibilidade perfeita em temas escuros.

## [1.7.1] - 2026-02-05
### Novo Módulo: Ações e Programas
- **Implantação (Nova Aba):**
    - **Gestão de Campanhas:** Lançamento oficial do módulo para cadastro de Ações e Programas (Atividades Coletivas).
    - **Dual Write Logic:** Implementada sincronização bidirecional onde ações criadas pela Entidade são espelhadas automaticamente no banco de dados do Município correspondente.
    - **Registro de Produção:** Funcionalidade integrada para registrar procedimentos realizados dentro de cada ação.
- **Melhorias de Interface (UI Premium):** 
    - **Cards Interativos:** Reformulação visual dos cards de ações com efeitos de hover, sombras e contadores de equipe/produção.
    - **Modo Escuro:** Revisão completa de contraste, garantindo legibilidade em textos e modais (especialmente busca SIGTAP).
- **Correções:**
    - **Seletores:** Resolvido problema de carregamento nos campos de "Município" e "Profissionais".
    - **Permissões de Escrita:** Ajuste nas regras de segurança para permitir a replicação de dados nos municípios.

## [1.7.0] - 2026-02-04
### Oficialização do Conector ProBPA e Performance
- **Dashboard Conector:** 
    - Oficialização da aba "Conector" e ativação completa dos fluxos de importação automatizada.
    - **Performance Extrema:** Implementada paginação recursiva e cache em memória (local) para carregamento instantâneo de dados, eliminando o tempo de espera na navegação entre competências.
    - **Correção de Discrepâncias:** Nova lógica de "Smart Matching" (reconciliação inteligente) que garante a contagem correta da produção mesmo quado o profissional possui divergências cadastrais (ex: CNS informado com CPF).
    - **Estabilidade:** Eliminação definitiva de erros de requisição ("400 Bad Request") em visualizações com grande volume de dados.
- **Segurança de Dados:**
    - **Validação de CNS:** Implementada trava de segurança nos formulários de cadastro (Público e Administrativo) exigindo estritamente 15 dígitos numéricos, prevenindo erros de digitação e inconsistências futuras.

## [1.6.3] - 2026-02-04
### Correção na Busca SIGTAP e Estabilidade
- **Busca SIGTAP:** 
    - Corrigido bug crítico onde a busca rápida na tabela unificada retornava "Nenhum resultado".
    - Implementada nova lógica de "Deep Search" que localiza procedimentos em todas as coleções do banco de dados, independente da estrutura de importação.
- **Estabilidade:** Resolvido erro que travava a aplicação ao tentar visualizar os detalhes (botão "i") de um procedimento.
- **Cadastro Profissional:**
    - CNS: Implementada validação obrigatória de 15 dígitos numéricos.
    - Alerta: Adicionado aviso visual sobre a obrigatoriedade do vínculo CNES.

## [1.6.2] - 2026-01-30
### Melhorias na Importação e Cadastro
- **Importação de Profissionais:** 
    - Adicionado suporte à normalização de cargos (ex: "Psicóloga" -> "Psicólogo Clínico").
    - Implementada função de exclusão de registros na pré-visualização da importação.
    - Melhoria na interface de seleção de cargos durante a importação.
- **Cadastro Manual:** Correções de fluxo e filtros.

## [1.6.1] - 2026-01-30
### Correção de Cadastro Manual
- **Filtro de Município:** Adicionado seletor de município no formulário manual de "Novo Profissional".
- **Correção de Lotação:** O campo de Unidade agora é filtrado pelo município selecionado, prevenindo a exibição de todas as unidades da entidade de uma vez.

## [1.6.0] - 2026-01-23
### Auditoria e Gestão de Lotação
- **Logs de Uso Completo:** Implementado sistema de logs que rastreia Login, Logout e ações de CRUD (Criação, Edição, Exclusão) em Profissionais, Unidades, Municípios e Metas.
- **Auditoria de Exclusão:** O sistema agora registra o nome do item excluído no log, facilitando a identificação em caso de auditoria.
- **Edição de Vínculos (Lotação):** Permitida a edição dos vínculos de unidade/município de um profissional existente diretamente na interface de edição.
- **Interface de Logs:** Nova página dedicada (/logs) com filtros por Tipo de Ação, Município e Busca Textual.

## [1.5.2] - 2026-01-23
### Melhorias de Usabilidade e Dashboard (Release Consolidado)
- **Correção de Métricas:** Resolvido bug que apresentava valores zerados nos cards de Produção Consolidada.
- **Top Municípios:** Implementado gráfico de ranking por volume de produção, com agregação dinâmica.
- **Ajuda Interativa:** Adicionados Tooltips ("i") nos cards do dashboard explicando o significado de cada métrica.
- **Cadastro Flexível:** Campo CNS tornou-se opcional para cadastro manual; Busca de CBO com autocomplete implementada.
- **Interface:** Prioridade para exibição de CPF na listagem de profissionais.
- **Gestão de Acesso:** Exibição imediata da senha gerada na concessão de acesso.

## [1.5.0] - 2026-01-23
### Importação Inteligente de Profissionais
- **Importação em Lote:** Novo assistente para carga de dados de profissionais suportando arquivos XLSX, JSON e leitura de texto de PDF/DOCX.
- **Normalização de CBOs:** Algoritmo robusto que identifica Ocupações (CBO) independente de gênero ou preposições (corrige variações como "Técnica em Enfermagem" para o padrão "Técnico de Enfermagem").
- **Associação Inteligente de Unidades:** Sistema de "Fuzzy Matching" que utiliza CNES e similaridade de texto para vincular automaticamente o profissional à unidade correta, com opção de correção manual.
- **Upsert Seguro:** Lógica que atualiza profissionais existentes (sincronizando vínculos e ocupações) ou cria novos registros se não existirem.

## [1.4.3] - 2026-01-19
### Melhorias de Acesso
- **Login:** Adicionada opção de visualizar senha ("olhinho") para facilitar o acesso.
- **Segurança:** Melhorias na recuperação de credenciais.

## [1.4.2] - 2026-01-19
### Melhorias de Usabilidade e Cadastros
- **Novos Tipos de Unidade:** Adicionada a opção "Centro" para unidades de saúde que não se enquadram nas categorias tradicionais.
- **Notificações de Versão:** Adicionado indicador visual (dot) no menu lateral para informar proativamente sobre novas atualizações do sistema.
- **Correções de Bugs:** Ajuste na exibição de dados no dashboard e correções menores de layout.

## [1.4.1] - 2026-01-11
### Correção na Contabilização de Metas
- **Suporte a Metas Plurianuais:** Corrigido problema onde metas com vigência entre anos (ex: 2025-2026) ignoravam a produção do novo ano devido à validação estrita do ano de competência. Agora o sistema respeita o intervalo de início e fim da meta.
- **Identificação Hierárquica SIGTAP:** Implementada lógica robusta para identificar procedimentos que pertencem a Grupos, Subgrupos ou Formas de Organização, utilizando os códigos específicos armazenados no registro, ao invés de apenas prefixo.
- **Normalização de IDs:** Melhorada a extração de IDs (Município, Unidade, Profissional) diretamente da estrutura de pastas (storage path) caso não estejam explícitos no documento, garantindo compatibilidade com uploads rápidos.

## [1.4.0] - 2026-01-03
### Gestão de Acessos e Perfil SUBSEDE
- **Novo Perfil de Acesso:** Implementado suporte completo para o perfil "Coordenador Local (SUBSEDE)", com acesso restrito à visualização de dados do próprio município.
- **Gestão de Usuários:** Atualizado formulário de convite para permitir a criação de usuários com perfil SUBSEDE.
- **Segurança:** Implementadas regras de segurança (Firestore Rules & Cloud Functions) para garantir isolamento de dados por município.
- **Correções:** Resolvidos problemas de permissão de leitura em Metas, Unidades e Profissionais para perfis restritos.

## [1.3.2] - 2026-01-03
- Suporte a Metas Plurianuais:
  - Adicionado recurso visual de identificação de metas plurianuais no relatório de exportação.
  
## [1.3.1] - 2026-01-03
- Suporte a Metas Plurianuais:
  - Implementada lógica inteligente que detecta metas com vigência superior a um ano (Ex: 2025-2026).
  - O sistema agora busca automaticamente o histórico de produção desde o início da meta, garantindo que o progresso acumulado seja exibido corretamente mesmo após a virada de ano.
  - Adicionado indicador visual "Plurianual" nos cards de meta.

## [1.3.0] - 2026-01-03
### Melhorias de Backend & Integridade
- **Tabelas de Apoio:** Sincronização da lista de CBOs permitidos com a Tabela Unificada (e-SUS APS v7.3.3).
- **Integridade de Dados:** Melhorias no backend de transmissão para garantir estabilidade no envio de fichas.


## [1.3.0] - 2025-12-16
- Correção Crítica de Carregamento de Metas:
  - Corrigido bug onde o progresso das metas aparecia zerado devido à virada de ano.
  - O sistema agora carrega corretamente a produção baseada no ano selecionado no filtro (Ex: 2025), em vez de forçar sempre o ano atual.
