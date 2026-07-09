# Changelog

## [3.2.4] - 12/05/2026
### Suporte a Múltiplos CBOs (Painel Subsede)
- **Seleção Dinâmica**: Agora é possível selecionar o CBO específico do profissional no momento do lançamento da produção, caso ele possua múltiplos vínculos ou especialidades na mesma unidade.
- **Integridade de Dados**: O CBO selecionado é gravado diretamente no registro de produção, garantindo que relatórios profissionais e faturamento reflitam a especialidade correta utilizada no atendimento.

## [3.2.3] - 11/05/2026
### Ajuste Fino: Bloqueio Retroativo por Município
- **Bloqueio Individualizado**: A trava de digitação retroativa agora respeita rigorosamente a configuração de cada município, evitando bloqueios globais indevidos.
- **Flexibilidade**: Definir a tolerância como "0" agora libera completamente a digitação retroativa (acesso ilimitado).
- **Interface**: Alerta de bloqueio atualizado para informar a data limite configurada.

## [3.2.2] - 09/05/2026
### Entidade em Cumprimento de Metas
- **Cumprimento de Metas**: Adicionada opção "Computar Entidade", garantindo que a produção retroativa e paralela de "Ações e Programas" de administração interna possa ser espelhada contra as metas estipuladas.

## [3.2.1] - 09/05/2026
### Busca Rápida Inteligente de Procedimentos
- **Otimização SIGTAP**: A busca rápida na aba de "Ações e Programas" agora ignora acentuação, maiúsculas/minúsculas e permite buscas parciais de códigos, alinhando a experiência ao Painel de Produção.
## [3.2.0] - 09/05/2026
### Tolerância Retroativa & Observabilidade
- **Controle de Competência**: Adicionado controle mestre por município para estipular janela de tolerância (em dias) para digitação retroativa de produção na virada do mês.
- **Auditoria de Bloqueios**: Logs do sistema agora registram e destacam visualmente (Alerta em Vermelho) tentativas bloqueadas de registro fora do prazo configurado.

## [3.1.0] - 04/05/2026
### Integridade de Dados & Filtro de Unidades Registradas
- **Blindagem de Relatórios**: Implementada filtragem rigorosa em todas as APIs de produção para ignorar unidades não cadastradas na rede oficial (ex: produções residuais ou de testes).
- **Consistência Dashboards**: Gráficos de Metas Globais, Evolução Financeira e Comparativos agora refletem 100% a realidade do cadastro de unidades.
- **Correção Visual**: Removidas colunas "fantasma" no Comparativo de Unidades, unificando os totais matemáticos com a exibição em tela.
- **Performance de Agregação**: Otimizada a leitura de unidades e profissionais no backend para garantir rapidez nos cruzamentos de dados multi-município.


## [3.0.2] - 03/05/2026
### Evolução Financeira & Otimização de Relatórios
- **Novo Relatório Financeiro**: Implantação do Relatório de Evolução Financeira com layout panorâmico espelhado no Cumprimento de Metas.
- **Cálculo e Desempenho Server-Side**: Processamento em nuvem para cruzamento do volume de procedimentos mensais com os valores unitários estipulados em metas.
- **Filtros de Intervalo**: Inserção de seletores dinâmicos "De/Até" para recortes precisos de meses dentro de uma mesma vigência.
- **Exportação Aprimorada**: PDFs abrem em nova aba ao invés de forçar download, incorporando formatação monetária nativa (BRL).

## [3.0.1] - 29/04/2026
### Recuperação de Documentos & Consistência de Relatórios
- **Back-fill de Documentos**: Implementada lógica de resgate de CNS/CPF para produções manuais a partir da base de pacientes do município, resolvendo o problema de "Documento Ausente" em registros manuais.
- **Inteligência de Busca (Range Query)**: Otimizada a localização de pacientes utilizando busca por prefixo, o que ignora espaços extras no final dos nomes e variações de caixa (MAIÚSCULAS/minúsculas).
- **Consolidação de Duplicados (Merge)**: Sistema de unificação de dados que combina CNS e CPF de múltiplos registros de um mesmo paciente para garantir documentação completa nos relatórios PDF e Excel.
- **Correção de Path Multi-Tenant**: Ajuste na resolução de caminhos Firestore para garantir que usuários de perfis restritos (Subsede) acessem corretamente as subcoleções de pacientes em entidades privadas.
- **Hotfix Sincronização**: Substituição da consulta global (`collectionGroup`) no 'Quick Edit Patient' por apontamento direto O(1), contornando bloqueios de permissão e atrasos de índices.

## [3.0.0] - 12/04/2026
### Release Consolidado
- Correção de bugs.
- Otimização de recursos.
- Ajuste e aprimoramento nas ferramentas de análise.

## [2.3.5] - 24/03/2026
### Melhorias de Layout & Cadastro de Profissionais
- **Inclusão de CBO**: Adicionado o CBO de Biomédico (`221205`) à lista para vínculo na Base de Profissionais e Corpo Clínico.
- **Melhoria de UI**: O Layout do formulário "Cadastro de Profissional na Base", na aba de Ações e Programas, foi modernizado. Expandimos os espaçamentos internos (padding), os `gaps` entre colunas nativas e inserimos dividers para otimizar a ergonomia e legibilidade da tela.

## [2.3.4] - 18/03/2026
### Melhorias UI - Registro de Ações (Painel Entidade)
- **Nomenclatura Procedimental**: Visualização combinada do código e Nome do SIGTAP anexado ao procedimento na lista de histórico das ações, facilitando a identificação imediata do que foi produzido sem necessitar memorizar códigos.
- **Quick Edit Patient (Variante Ações)**: Sistema importado da raiz central; liberação da edição e correção dos dados cadastrais com retro-preenchimento no Master Data em 1-clique diretamente pelo histórico de produções de Ações e Programas.

## [2.3.3] - 16/03/2026
### Auditoria Inteligente, Ações e Produtividade (Painel Subsede)
- **Boletins Inteligentes (Ações)**: O PDF do "BDPA de Ações e Programas" agora implementa uma rotação Cíclica de Fallback, capaz de resgatar digitalmente a foto da assinatura do profissional vinculada diretamente na coleção `professionalsActions` (independente dele existir nas prefeituras atreladas ou de a Ação não ter lotação raiz definida no custom location mode).
- **Select Buscável de Profissionais**: Substituição do clássico filtro da tabela de Histórico por uma caixa suspensa dinâmica (Autocomplete) combinada, permitindo que as Subsedes digitem instantaneamente partes do Nome ou o CNS para localizar rapidamente o Lançamento de um prestador.
- **Caneta de Edição ao Vivo (Quick Edit Patient)**: Injeção de uma opção de edição "Inline" perfeitamente acoplada no nome e visualização cadastral do Paciente dentro da lista de produções geradas. Permite a reparação de falhas da recepção (ex: Sexo / CPF ausente) em 2 cliques.
- **Força Legal e Atualização Retroativa O(N)**: A Caneta ganhou poderes administrativos totais limitados por Entidade/Subsede: Ao ser salvo, não apenas reescreve a ficha real do Paciente no Master Data, mas deflagra o Update Assíncrono (`writeBatch`) no banco cruzando e reescrevendo (para os novos preenchimentos de nome e CPF/CNS) *todas as produções anteriores daquele usuário*, equalizando todo e qualquer extrato anterior emitido e reparando lacunas da base em definitivo.
- **O(1) Smart Bulk Fetch de Documentos (Anti-Defasagem Visual)**: Se uma produção foi tirada há meses sob uma foto (snapshot) faltosa que não tinha nem CNS nem CPF, ao invés da tabela rotular passivamente como "Sem Documento", ela injeta na carga (*on\_load*) um script O(1) invisível e de alta performance. O hook junta todos os IDs defasados, vai numa viagem única ao Firebase puxando os registros reais (Master), e preenche dinamicamente na grade o selo Laranja (CPF) ou Cinza (CNS) dos pacientes. As strings longas também receberam travas (flex-shrink-0) para jamais quebrarem a interface nos crachás e bolinhas na coluna Mídia.
- **Display Avançado SIGTAP**: Substituída a exibição simplória de Procedimentos no lançamento de BPA/CDS por um card denso (`Rich Sigtap`) na listagem flutuante mostrando simultaneamente o Código cinza e Nome da ação, empoderando o faturista.

## [2.3.2] - 15/03/2026
### Produção da Entidade no Relatório e UI
- **Entidade no Comparativo**: Adicionada exibição da Entidade como uma "Unidade" autônoma no relatório numérico (Comparativo de Unidades e Exportações) visando capturar subtotalizações geradas pelas "Ações e Programas" de administração interna. Inclusão baseada em controle "Exibir Entidade?".
- **Nomeação Automática**: Ajustada a lógica de busca/fallback para exibir o nome fantasia verídico da instituição (em vez do estático "Entidade Responsável") tanto na tela quanto na exportação em PDF.

## [2.3.1] - 12/03/2026
### Correção de Lotação em Relatórios de Produção
- **Produção por Profissional**: O relatório individualizado e os PDFs do Boletim BPA agora listam e geram documentos corretamente segregados por Lotação (Unidade) caso o profissional tenha registrado produção em múltiplos estabelecimentos na mesma competência.

## [2.3.0] - 12/03/2026
### Visão Estratégica de Metas nos Dashboards
- **Produção Pactuada vs Extra-teto**: Agora os painéis "Visão Geral" e "Produção Global" separam detalhadamente o volume da sua produção que compõe as metas financeiras (Pactuada) e a parte da produção sem cobertura (Não Pactuada / Extra-teto).
- **Gráfico Top Municípios**: O ranking de volume de municípios ganhou o novo visual empilhado (Stacked Bar). Agora é possível ver em uma única barra a fatia exata de produção pactuada (colorida) e não pactuada (cinza) para cada cidade parceira.

## [2.2.1] - 09/03/2026
### Melhorias de Exportação e UI
- **PDFs Oficiais**: O relatório de Cadastros Ativos (Profissionais) agora conta com o logotipo da Entidade no cabeçalho e um rodapé centralizado com dados de contato e endereço.
- **Rede de Unidades**: Cards de municípios ajustados para exibição colapsada por padrão para melhorar o tempo de navegação e carregamento visual em entidades de grande porte.

## [2.2.0] - 07/03/2026
### Arquitetura Serverless & Otimizações de UI/UX
- **Performance Extrema**: Migramos o processamento pesado de relatórios de produção (Agrupado e Individualizado) para Cloud Functions no backend, acabando com travamentos no navegador.
- **Segurança Multi-Tenant**: Reforçado o isolamento de dados com leitura compulsória do Token Firebase; requisições não podem mais ser forjadas por payloads não-autorizados.
- **Correção "Produção Zerada"**: Restauramos a ponte de IDs e a resiliência `try-catch` linha a linha nas APIs resolvendo o bug de relatórios que voltavam vazios da base na leitura do Subsede.
- **Exportação UX Flattening**: O tradicional painel de Produção por Profissional foi reprojetado. O "Boletim BPA" agora exibe ações de exportação em um único clique sem menus intermediários labirínticos.
- **Filtro de Competências Inteligente**: Consolidada a normalização de datas "MM-YYYY" vs "YYYY-MM" para extrações do conector, exibindo todos os registros atrelados à entidade corretamente no Dashboard.
- **Sub-aba Procedimentos (CBO)**: Estreia da régua de metas versus executado na aba "Comparativo por Procedimento Geral" mapeando individualmente performance no SIGTAP.
- **Responsividade Mobile-First**: Todo o layout dos painéis Analíticos, Configurações de Filtros, Headers e Modais agora empilham impecavelmente em dispositivos móveis, sem quebras na tela.

## [2.1.1] - 02/03/2026
### Novos Relatórios & Otimizações de Estabilidade
- **Produção Agrupada**: Lançamento do novo relatório "Produção por Profissional - Agrupado", gerando PDFs otimizados e curtos com totais semanais/diários ao invés de listagem linha a linha.
- **Correção na Exclusão**: Solucionado erro 500 (Batch Delete) ao excluir profissionais com unidades remanejadas ou inexistentes.
- **Filtros de Data Nativos**: O filtro de dias personalizado na aba de Produção agora respeita adequadamente a ISO e o fuso horário para a busca e geração do PDF.
- **Interface Preparatória**: Adicionados rótulos de "Em Breve" para relatórios analíticos em fase final de testes qualitativos (Metas, Cobertura, etc).

## [2.1.0] - 01/03/2026
### Gestão Avançada de Ações e Programas
- **Contadores Dinâmicos**: Cards de Ações agora exibem em tempo real o total de Procedimentos e Pacientes únicos baseados na produção atualizada.
- **Relatório Oficial**: O PDF do "Relatório de Atividade Coletiva (BDPA)" recebeu melhorias visuais com logotipo otimizado e a correta identificação da Entidade de Saúde no cabeçalho.
- **Acúmulo Inteligente**: Registrar novos procedimentos para um paciente que já possui atendimento no mesmo dia e na mesma ação agora soma os os novos registros aos antigos, prevenindo exclusão acidental.
- **Permissões Expandidas**: O perfil de Coordenação (SUBSEDE) agora tem acesso completo para gerenciar (Criar, Editar, Excluir) Ações e Programas.

## [2.0.0] - 26/02/2026
### Nova Geração do Painel
- **Relatórios**: Novo relatório de unidades ativo.
- **Segurança**: Sistema de backup de cadastros originais para prevenção de perdas de dados.
- **Subsede**: Ativação completa do painel da subsede para Coordenadores Locais.
- **Monitoramento**: Novos recursos de monitoramento e análise avançada de dados.
- **Interface**: Aprimoramento contínuo da interface, velocidade e novos recursos visuais.

## [1.7.8] - 20/02/2026
### Corrigido
- **Metas Pactuadas**: Resolvido erro de permissão (`permission-denied`) ao tentar excluir uma meta individual ou durante a edição em lote.
- **Segurança (Firestore)**: Refinada a consulta de segurança na deleção de metas. Agora a busca exige correspondência estrita com a ID da Entidade, satisfazendo as regras de segurança sem bloquear o usuário.

## [1.7.7] - 10/02/2026
### Adicionado
- **Filtros Avançados**: Novo painel na listagem de profissionais permitindo filtrar por intervalo de datas, unidade específica e cargo (CBO).
- **Refinamento de Busca**: Capacidade de combinar busca textual (Nome/CPF) com filtros estruturados.

### Corrigido
- **Dark Mode**: Corrigida a cor do texto nos inputs de filtro que ficavam ilegíveis no modo escuro.
- **Filtro de Data**: Ajustada a lógica de comparação de datas para utilizar o horário local (YYYY-MM-DD), resolvendo problemas de fuso horário.
- **Exportação Precisa**: A exportação individual de profissional agora respeita rigorosamente o intervalo de datas aplicado.

### Melhorado
- **Modal de Produção**:
    - **Filtro Explícito**: Adicionado botão "Aplicar" para o filtro de datas, evitando recarregamentos desnecessários durante a digitação.
    - **Listagem Inteligente**: Ao aplicar um filtro de data, a lista exibe apenas profissionais com produção no período, facilitando a visualização.

### v1.7.6 (09/02/2026)
- **Novidade**: Sistema de Notificações em tempo real para gestores.
- **Melhoria**: Cadastro de Profissionais agora usa lista fechada de CBOs.
- **Melhoria**: Campos de Email e Whatsapp obrigatórios para garantir contato.
- **Visual**: Atualização da imagem de exemplo para assinatura.

### v1.7.5 (08/02/2026)
### Assinaturas e Refinamentos de Relatório
- **Assinatura Digital:**
    - **Ajuste e Download:** Implementada funcionalidade para visualizar e baixar a assinatura digitalizada dos profissionais diretamente no painel.
- **Produção Global:**
    - **Otimização:** Melhoria de performance no carregamento da aba de produção unificada.
- **Relatórios Confiáveis:**
    - **Filtro de Duplicatas:** Refinamento na lógica de extração para identificar e eliminar registros duplicados (ex: CONSULTA/ATENDIMENTO INDIVIDUAL).
    - **Normalização de Vacinas:** Padronização rigorosa dos nomes de vacinas seguindo a descrição oficial SIGTAP (ex: "ADMINISTRAÇÃO DE MEDICAMENTOS POR VIA ORAL").

## [1.7.4] - 2026-02-07
### Otimização de Performance e UX
- **Performance:**
    - **Cache em Memória (RAM):** Implementada camada de cache local que elimina a necessidade de releitura do disco (localStorage) e parse de JSON a cada troca de aba. A navegação entre Dashboard e Municípios agora é **instantânea**.
- **Experiência do Usuário (UX):**
    - **Loading Polido:** Substituído o spinner bloqueante por um overlay com efeito de blur e mensagem informativa ("Consolidando e agregando dados...").
    - **Feedback:** O sistema agora informa claramente que está processando dados em segundo plano, sem travar a interface visual.

## [1.7.3] - 2026-02-07
### Correção de Exibição no Painel
- **Dashboard Unificado:**
    - **Visualização Completa:** Corrigido comportamento onde a produção vinda do Conector (arquivos antigos) não somava aos totais do painel principal.
    - **Sincronização Retroativa:** Ao cadastrar um novo profissional, o sistema agora "encontra" automaticamente toda a produção dele que já havia sido importada pelo Conector, atualizando os gráficos instantaneamente.
    - **Filtro Inteligente:** O painel garante que apenas a produção dos profissionais efetivamente vinculados à sua entidade seja contabilizada, mesmo que o arquivo importado contenha dados de terceiros.
- **Gestão de Municípios:**
    - **Contadores Reais:** O card de cada município na listagem agora exibe a "Produção Realizada" consolidada (Manual + Conector), permitindo monitorar o desempenho individual de cada cidade parceira.

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
