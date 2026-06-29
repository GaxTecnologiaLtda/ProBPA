# Roteiro de Estudo e Mapeamento do DUMP (PostgreSQL e-SUS)

Com base nas diretrizes clínicas de auditoria (Dataset 3-D) e nas regras de financiamento (Datasets 1 e 2), a extração dos dados do PEC e-SUS requer o mapeamento de tabelas transacionais (o que acontece na UBS em tempo real) e tabelas de faturamento/consolidação (o que vai para o Sisab).

Para garantir que **nenhum dado fique de fora** e que a versão ULTRA do conector cruze as informações perfeitamente, dividiremos a exploração profunda do DUMP XML em **7 Etapas Lógicas**.

---

## 🛠️ Etapa 1: O Núcleo do Indivíduo (Identidade e Vínculo)
**Objetivo:** Dominar como o e-SUS identifica unicamente um cidadão (Prontuário, CPF, CNS) e como ele vincula esse cidadão à equipe responsável.
*   **Tabelas Alvo (XMLs para Análise):**
    *   `tb_cidadao` e `tb_fat_cidadao_pec`: Chaves primárias, idade (nascimento) e gênero (necessário para filtros C2, C6, C7).
    *   `tb_cds_cad_individual`: Dados de territorialização.
    *   `tb_prontuario` / `tb_equipe`: Relacionamento entre o indivíduo e a eSF/eAP que o acompanha (fundamental para o motor CVAT).

## - [x] **Etapa 2: Acessos e Atendimentos (Componente 1)**
  - Tabela Central: `tb_fat_atendimento_individual` (e possivelmente `tb_fat_fichas` para visitas e outros atendimentos)
  - Descoberta: Investigar a correlação das colunas `st_conduta_consulta_agendada` e `co_dim_tipo_atendimento` para classificar Consultas Programadas vs. Demanda Espontânea, mapeando os Profissionais (CBO) que realizaram o atendimento.

## - [x] **Etapa 3: Rastreio de Condições e Antecedentes Clínicos**
**Objetivo:** Localizar exatamente quem são os Hipertensos, Diabéticos e as Gestantes ativas (Criar os denominadores C3, C4 e C5).
*   **Tabelas Alvo (XMLs para Análise):**
    *   `tb_problema` e `tb_fat_atd_ind_problemas`: Onde são gravados os CIAP-2 e CID-10 durante a consulta.
    *   `tb_antecedente`: Doenças pré-existentes marcadas no prontuário.
*   **Foco Principal:** Relacionar o `co_unico_problema` com o `co_prontuario` validando se a condição (ex: T89 ou E10) está ativa no período da competência.

## - [x] **Etapa 4: Aferições Clínicas, Antropometria e Procedimentos**
**Objetivo:** Mapear o cumprimento das boas práticas (peso, altura, pressão arterial, exames solicitados e rastreio de câncer).
*   **Tabelas Alvo (XMLs para Análise):**
    *   `tb_medicao`: Registros brutos de Pressão Arterial (Sistólica/Diastólica), Peso e Altura (fundamental para a regra de registro simultâneo de C2, C3, C4, C5 e C6).
    *   `tb_fat_proced_atend_proced` (cruzado com `tb_dim_procedimento`): Busca pelos códigos SIGTAP de coleta de Citopatológico (C7-A), Mamografia (C7-D), Pé diabético, HbA1c.

## - [x] **Etapa 5: O Módulo de Imunização (MIV)**
**Objetivo:** Auditoria de vacinas aplicadas (Infantis, HPV e Influenza).
*   **Tabelas Alvo (XMLs para Análise):**
    *   `tb_imunobiologico` e `tb_dose_imunobiologico`: Dicionários.
    *   `tb_vacinacao` / tabelas de dose: Para encontrar a 3ª dose da Pólio/Penta antes de 1 ano de idade (C2).  `tb_imunobiologico`: Códigos específicos (ex: código 67 ou 93 para HPV, 33/77 para Influenza).

## - [x] **Etapa 6: Saúde Bucal (Odontologia - B1 a B6)**
**Objetivo:** Rastrear a produção exclusiva da eSB.
*   **Tabelas Alvo (XMLs para Análise):**
    *   `tb_atend` filtrado por CBOs da Odontologia.
    *   Procedimentos SIGTAP específicos: Exodontia, ART, Primeira Consulta Odontológica Programada.

## - [x] **Etapa 7: Estrutura Profissional e Cadastral (eMulti, CNES, INE)**
**Objetivo:** Agrupar todos os KPIs pelas Unidades (CNES), Equipes (INE) e Profissionais (CBO) para segmentação financeira.
*   **Tabelas Alvo (XMLs para Análise):**
    *   `tb_dim_cbo`, `tb_dim_equipe`, `tb_dim_unidade_saude`.
    *   `tb_cidadao` e chaves dimensionais da fato.

---

### Próximo Passo Prático
Vou iniciar agora a execução da **Etapa 1**, dissecando a arquitetura relacional entre `tb_cidadao`, `tb_prontuario` e `tb_fat_cidadao_pec`, usando as chaves `co_seq...` e `uuid` que vi previamente nos XMLs do DUMP.
