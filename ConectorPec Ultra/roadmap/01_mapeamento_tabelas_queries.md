# Roadmap ProBPA - Conector ULTRA

Este documento é o mapa mestre das tabelas e visões que precisamos construir ou consultar no banco de dados do e-SUS PEC (PostgreSQL) para atender com precisão às métricas da Portaria GM/MS nº 3.493/2024 e Notas Técnicas de 2025.

---

## 1. COMPONENTE I: Fixo e Implantação e Módulo C (Suspensões)
**Objetivo:** Garantir que a equipe está homologada, cadastrada no SCNES e com composição mínima válida, sem ausências que gerem suspensão de repasses.
*   **Query Principal Necessária:** `Q_LOTACOES_CBO` (Profissionais ativos por equipe e carga horária)
*   **Tabelas Mapeadas Preliminarmente:**
    *   `tb_cnes` e `tb_unidade_saude` (Estabelecimentos)
    *   `tb_equipe` (Equipes ativas e INEs)
    *   `tb_prof` e `tb_cbo` (Profissionais, CPF, CNS e suas ocupações)
    *   `tb_lotacao` (Ligação entre Profissional, CBO, Equipe, Unidade e Carga Horária)
    *   *Nota:* Precisamos cruzar esses dados para validar a regra de ausência de categorias por 2 ou 3 competências consecutivas.

---

## 2. COMPONENTE II: Vínculo e Acompanhamento Territorial (CVAT)
**Objetivo:** Capturar cadastros individuais válidos, avaliar o preenchimento de cadastro domiciliar e monitorar contatos assistenciais dentro das réguas de tempo (24 e 12 meses).

### Dimensão 1: Cadastro (MICI e MICDT)
*   **Query Principal Necessária:** `Q_CADASTROS_ATIVOS` (Última atualização de cada cidadão)
*   **Tabelas Mapeadas Preliminarmente:**
    *   `tb_cidadao` / `tb_fat_cidadao_pec` (Base de cidadãos únicos do município)
    *   `tb_cds_cad_individual` (Fichas de cadastro individual)
    *   `tb_cds_cad_domiciliar` / `tb_cds_domicilio` (Fichas de cadastro do domicílio)
    *   Tabelas de marcadores sociais (Bolsa Família, BPC) para os multiplicadores.
    *   *Filtros obrigatórios:* Excluir óbitos e "Mudança de Território". Identificar datas da última atualização (< 24 meses).

### Dimensão 2: Acompanhamento e Vulnerabilidade
*   **Query Principal Necessária:** `Q_ACOMPANHAMENTO_12M` (Contatos assistenciais no último ano)
*   **Tabelas Mapeadas Preliminarmente:**
    *   Fatos de Produção (`tb_fat_atendimento_individual`, `tb_fat_atendimento_odonto`, `tb_fat_atividade_coletiva`, `tb_fat_atendimento_domiciliar`, `tb_fat_proced_atend_proced`).
    *   `tb_dim_tempo` (Para filtrar os 12 meses corridos).
    *   *Lógica:* Basta ter > 1 contato de qualquer tipo nos últimos 12 meses. Cruzar com idade e marcadores sociais para aplicar pesos (1.0, 1.2, 1.3 ou 2.5).

---

## 3. COMPONENTE III: Qualidade - Estratégia Saúde da Família (eSF/eAP)
**Objetivo:** Avaliar os indicadores de processo e resultado (C1 a C7).

### Indicadores Baseados em Produção Pura (C1)
*   **Query:** `Q_ACESSO_APS`
*   **Tabelas:** `tb_fat_atendimento_individual`, filtrando tipos de demanda (agendada vs. espontânea) cruzando com CBO de Médicos e Enfermeiros.

### Indicadores Baseados em Ciclos de Vida (C2 e C6)
*   **C2 (Infantil < 2 anos) e C6 (Idoso > 60 anos)**
*   **Queries:** `Q_ACOMP_INFANTIL` e `Q_ACOMP_IDOSO`
*   **Tabelas Mapeadas Preliminarmente:**
    *   Denominador: `tb_cidadao` cruzado com faixa etária.
    *   Consultas e Visitas: `tb_fat_atendimento_individual`, `tb_fat_atendimento_domiciliar` (CBOs específicos).
    *   Antropometria: `tb_medicao` (cruzar data de Peso e Altura no mesmo dia).
    *   Vacinação: `tb_fat_vacinacao` e dimensões de vacinas (Penta, VIP, SCR, VPC10 para C2; Influenza para C6).

### Indicadores Baseados em Condições Crônicas e Especiais (C4, C5 e C7-C)
*   **C4 (Diabetes), C5 (Hipertensão), C7-C (Saúde Sexual/Reprodutiva)**
*   **Query Principal:** `Q_CONDICOES_ATIVAS` (A base mais crítica do Conector)
*   **Tabelas Mapeadas Preliminarmente:**
    *   Lista de Problemas Ativos: `tb_problema` e `tb_fat_atd_ind_problemas`.
    *   Diagnósticos: `tb_ciap`, `tb_cid10`.
    *   Procedimentos: `tb_fat_proced_atend_proced` (HbA1c, Exame do Pé).
    *   Aferição Clínica: `tb_medicao` (Pressão Arterial).
    *   Consultas e Visitas: Fatos de atendimento.

### Acompanhamento de Gestantes e Puérperas (C3)
*   **C3 (Cuidado na Gestação e Puerpério)**
*   **Query Principal:** `Q_ACOMP_GESTANTE_PUERPERA`
*   **Tabelas Mapeadas Preliminarmente:**
    *   Diagnóstico e DUM (Data da Última Menstruação): `tb_problema` / `tb_fat_atd_ind_problemas` (filtrando CIAPs W78, W79, W84 e CIDs pertinentes).
    *   Consultas de Pré-natal: `tb_fat_atendimento_individual` (para captar a Data da 1ª Consulta e validar a captação precoce até 12 semanas).
    *   Exames (Sífilis, HIV, Hepatites B/C): `tb_exame_detalhe` ou `tb_fat_proced_atend_proced` (testes rápidos no 1º e 3º trimestres).
    *   Odontologia na Gestação: `tb_fat_atendimento_odonto`.
    *   Puerpério: Atendimentos e Visitas Domiciliares até o 42º dia após o parto.

### Indicadores Baseados em Rastreio e Prevenção (C7-A, C7-B, C7-D)
*   **C7 (Câncer de Colo, Mamografia e Vacina HPV)**
*   **Queries:** `Q_RASTREIO_CANCER` e `Q_VACINACAO_HPV`
*   **Tabelas Mapeadas Preliminarmente:**
    *   Rastreio Colo de Útero (C7-A): `tb_fat_proced_atend_proced` (Filtro SIGTAP de Coleta Citopatológico). Faixa 25-64 anos, nos últimos 36 meses.
    *   Mamografia (C7-D): `tb_fat_proced_atend_proced` (Filtro SIGTAP Mamografia). Faixa 50-69 anos, nos últimos 24 meses.
    *   Vacinação HPV (C7-B): `tb_fat_vacinacao_vacina` e cruzamento com `tb_dim_imunobiologico` (Filtro de códigos HPV 67 ou 93). Faixa 09-14 anos.

---

## 4. COMPONENTE III: Qualidade - Saúde Bucal (eSB)
**Objetivo:** Avaliar os indicadores odontológicos (B1 a B6).
*   **Query Principal:** `Q_ODONTO_QUALIDADE`
*   **Tabelas Mapeadas Preliminarmente:**
    *   `tb_fat_atendimento_odonto`: Essencial para B1 (Primeira Consulta, avaliando o campo 'tipo_consulta') e B2 (Tratamento Concluído, avaliando o campo 'conduta').
    *   `tb_fat_atend_odonto_proced`: Base para B3 (Exodontias), B5 (Preventivos) e B6 (TRA/ART), filtrando SIGTAPs executados por Dentistas/TSB.
    *   `tb_fat_atividade_coletiva` + `tb_fat_atvdd_coletiva_part`: Base para B4 (Escovação Supervisionada de crianças de 6 a 12 anos).

---

## 5. COMPONENTE III: Qualidade - Multiprofissional (eMulti)
**Objetivo:** Avaliar volume de atendimentos e interdisciplinaridade (M1 e M2).
*   **Query Principal:** `Q_EMULTI_COMPARTILHADA`
*   **Tabelas Mapeadas Preliminarmente:**
    *   Atendimentos Individuais e Odontológicos: `tb_atend` e `tb_atend_prof` (Lendo as tabelas operacionais em vez de apenas fatos, para capturar *múltiplos profissionais com CNS diferentes associados ao mesmo ID de atendimento na mesma data*).
    *   Atividades Coletivas: Mesma lógica de cruzamento de profissionais e CNS na mesma atividade.
    *   Dimensão de CBOs: Filtrando rigidamente a lista de CBOs elegíveis para eMulti.

---

## Próximo Passo do Estudo
O próximo passo será analisar as tabelas estruturais abrindo os arquivos XML correspondentes, com foco especial em como ler o cadastro mais atualizado (MICI e MICDT) e como extrair os Problemas/Condições ativas do cidadão.
