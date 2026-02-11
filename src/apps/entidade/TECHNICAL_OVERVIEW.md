# Visão Técnica - Painel da Entidade

Este documento detalha a arquitetura, estrutura de dados e componentes do painel `entidade` do ecossistema ProBPA.

## 1. Visão Geral
O painel da entidade (`/src/apps/entidade`) é responsável pela gestão administrativa de municípios, unidades de saúde, profissionais e metas de produção. Ele atende gestores estaduais, municipais e auditores, oferecendo visões consolidadas e ferramentas de monitoramento.

## 2. Arquitetura
- **Framework**: React com Vite.
- **Roteamento**: React Router (HashRouter).
- **Gerenciamento de Estado**: Context API (`AuthContext`) e Hooks locais.
- **Backend / BaaS**: Firebase (Authentication, Firestore, Functions, Storage).
- **Estilização**: Tailwind CSS.

### Roteamento
O sistema é dividido em duas áreas principais, protegidas por layouts distintos em `App.tsx`:
1.  **Rota Pública (`/publico`)**: Dashboards e visualizações acessíveis sem autenticação estrita (ou com autenticação leve/token compartilha).
2.  **Rota Privada (`/privado`)**: Área administrativa completa exigindo autenticação do usuário.
3.  **Portal de Cadastro**: Rota híbrida para auto-cadastro de profissionais (`/portal-cadastro/profissionais/:entityId/:municipalityId`).

## 3. Camada de Dados (Firestore)

A estrutura de dados utiliza uma abordagem híbrida com subcoleções e coleções raiz para otimizar leituras e escritas.

### C1. Municipalities (`municipalities`)
Armazena dados dos municípios vinculados à entidade.
- **Path**: `municipalities/{entityType}/{entityId}/{municipalityId}`
- **EntityType**: `PUBLIC` ou `PRIVATE`.
- **Campos Importantes**:
    - `linkedEntityId`: ID da entidade pai.
    - `status`: Status da licença (Ativa, Suspensa, etc).
    - `interfaceType`: Configuração da interface (`PEC` ou `SIMPLIFIED`).

### C2. Units (`units`)
Coleção raiz contendo todas as unidades de saúde.
- **Path**: `units/{unitId}`
- **Relacionamentos**: `entityId`, `municipalityId`.
- **Campos**: `cnes`, `name`, `type` (UBS, Hospital, etc).
- **Contadores**: Mantém `professionalsCount` atualizado via serviços.

### C3. Professionals (`professionals`)
Coleção raiz para dados dos profissionais.
- **Path**: `professionals/{professionalId}`
- **Estrutura**:
    - `assignments`: Array de vínculos (Unidade/Município/Ocupação).
    - `accessGranted`: Controle de acesso ao sistema.
- **Sincronização**: Os dados são replicados para subcoleções de municípios para otimizar leituras de contexto: `municipalities/.../{municipalityId}/professionals/{profId}`.

### C4. Goals (`goals`)
Gerenciamento de metas de produção. Utiliza *Collection Groups* para consultas globais.
- **Schema**:
    - **Legacy Path**: `goals/.../units/{unitId}/professionals/{profId}/goals`
    - **Nova Estrutura**: `municipalities/.../{municipalityId}/goals/{competence}/goals/{goalId}`
- **Hierarquia**:
    - `goalType`: 'municipal' | 'unit' | 'professional'.
    - `sigtapTargetType`: Define se é meta de Grupo, Subgrupo, Forma ou Procedimento específico.
- **Subcoleção `progress`**: Histórico de atualizações de progresso (`capturedAt`, `quantity`, `calculatedBy`).

### C5. Production (`procedures` & `extractions`)
O sistema de produção consome dados de duas fontes primárias, unificadas no `municipalityReportService`.

#### 1. Produção Manual (Digitada)
Inserida diretamente pelo ProBPA (versão Web ou Desktop antiga).
- **Armazenamento**: Subcoleções `procedures` profundamente aninhadas.
    - Path Canônico: `municipalities/{type}/{entityId}/{municipalityId}/bpai_records/{unitId}/professionals/{professionalId}/procedures/{docId}`
- **Consulta**: Utiliza `collectionGroup(db, 'procedures')` filtrado por `entityId` e período (`competenceMonth`).
- **Características**: Dados estruturados, já vinculados corretamente a IDs de profissionais e unidades do sistema.

#### 2. Produção Extraída (Conector)
Dados importados via ferramenta Desktop Connector (ler arquivos BPA/ESUS legados).
- **Armazenamento**: Subcoleção `extractions` no nível do município.
    - Path: `municipalities/{type}/{entityId}/{municipalityId}/extractions/{docId}`
- **Consulta**: Iterativa por município (devido à falta de índex global ou para isolamento). O serviço varre os municípios alvo e busca na subcoleção `extractions` por range de data.
- **Características**: Dados brutos ("Raw"). Podem conter profissionais não cadastrados ou códigos antigos.

## 4. Estrutura de Diretórios e Componentes

### `/components`
- `Layout.tsx`: Shell principal da aplicação. Gerencia navegação lateral e cabeçalho.
- `GoalHierarchyExplorer.tsx`: Árvore de visualização de metas.
- `SigtapSearchModal.tsx`: Modal complexo para consulta à API/base local do SIGTAP, com cache de detalhes (CIDs, Serviços).

### `/components/ui`
Biblioteca de componentes reutilizáveis:
- Atomic Design simples: `Button`, `Card`, `Input`, `Select`, `Modal`, `Badge`, `Table`.
- `StatCard`: Card de métricas com suporte a tendências e tooltips.

### `/services`
Camada de abstração do Firestore.
- **`goalService.ts`**: Lógica de negócio para metas. Consome `collectionGroup('procedures')` para calcular progresso, aplicando filtros hierárquicos (Grupo/Subgrupo).
- **`municipalityReportService.ts`**: **[CRÍTICO]** Motor de agregação de produção.
    - **Hybrid Fetch**: Busca em paralelo Manual + Extraída.
    - **Smart Matching**: Tenta vincular produção extraída (isolada) a profissionais do sistema via CNS, CPF ou Nome (Saneamento de dados em tempo real).
    - **Sigtap Resolution**: Normaliza códigos (ex: converte "Vacina Oral" para código SIGTAP `03.01.10.021-7`) para garantir consistência nos relatórios.
- **`professionalsService.ts`**: Gerencia CRUD de profissionais e a lógica de sincronização (dual-write) para manter consistência entre a coleção raiz e a visão hierárquica por município.

## 5. Fluxos Críticos

### Fluxo de Dados de Produção
1.  **Ingestão**:
    -   *Manual*: Gravação direta em `bpai_records/.../procedures`.
    -   *Conector*: Upload para `extractions`.
2.  **Consumo (`Production.tsx`)**:
    -   Chama `municipalityReportService.fetchMunicipalityProduction`.
    -   O serviço baixa ambas as fontes.
    -   Aplica `Smart Matching` para hidratar registros do Conector com IDs de profissionais reais.
    -   Aplica `Sigtap Resolution` para padronizar nomes e códigos.
3.  **Visualização**:
    -   Dados normalizados são agregados em memória para gerar gráficos (Top Procedimentos, Evolução Financeira).
    -   Relatórios PDF (Analítico/Sintético) são gerados no client-side usando `jspdf` com os dados já saneados.

### Consumo no Dashboard (Private)
Local: `useDashboardData.ts` & `goalService.getEntityProductionStats`
- **Fluxo Sequencial**:
    1. Busca lista de Municípios da Entidade.
    2. Chama `getEntityProductionStats` passando a lista.
    3. Serviço busca em paralelo:
        - `collectionGroup('procedures')` (Manual)
        - `collection('extractions')` para cada município (Conector)
    4. Unifica dados para exibir KPIs e Gráficos de Evolução.

### Cálculo de Progresso de Metas
Local: `goalService.ts` -> `calculateGoalProgress`
1.  Busca metas escopadas por permissão (Profissional, Município ou Entidade).
2.  Busca registros de produção correspondentes na competência.
3.  Realiza "match" hierárquico (se meta é de Grupo, soma todos os procedimentos do grupo).
4.  Atualiza documento da meta e adiciona entrada no histórico `progress`.

### Gestão de Vínculos (Assignments)
Local: `professionalsService.ts`
- Profissionais podem ter múltiplos vínculos.
- Ao criar/editar, o sistema atualiza contadores desnormalizados nas unidades (`unitsService` increment/decrement).
- Sincroniza dados para a árvore de municípios para permitir navegação rápida "Município -> Unidade -> Profissionais".

### Consulta SIGTAP
Local: `SigtapSearchModal.tsx` & `sigtapService.ts`
- Interface otimizada para busca rápida de procedimentos.
- Carrega detalhes sob demanda (CIDs, Serviços, Caráter de Atendimento) para não sobrecarregar a busca inicial.

### Gestão de Assinaturas Digitais
Local: `Production.tsx`
- **Armazenamento (Storage)**:
    - Path: `signatures/{entityId}/{professionalId}_{timestamp}`.
    - O sufixo `timestamp` é crucial para evitar cache agressivo de CDNs ao atualizar a imagem.
- **Persistência (Firestore)**:
    - O documento do profissional armazena `signatureUrl` (link público) e `signatureBase64` (string data URI).
    - O `signatureBase64` é utilizado prioritariamente na geração de PDFs (`jspdf`) para contornar problemas de CORS (Cross-Origin Resource Sharing) que bloqueiam imagens externas no canvas.
- **Fluxo de Interface**:
    - **Sem Assinatura**: Botão abre diretamente o seletor de arquivos.
    - **Com Assinatura**: Botão abre modal de pré-visualização com opções de "Baixar" e "Alterar".
