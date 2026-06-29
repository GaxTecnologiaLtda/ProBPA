# Etapa 2: Base de Atendimentos Individuais e Domiciliares

Esta etapa detalha como as consultas e visitas (atendimentos) são registrados no banco de dados e-SUS (PEC), com foco principal na correta classificação dos tipos de atendimento para cálculo do Indicador C1 (Acesso à Atenção Primária) e formação da base analítica para os demais indicadores.

## 1. Tabela Fato Principal: `tb_fat_atendimento_individual`
Esta é a principal tabela transacional para registrar o "evento" do atendimento de um cidadão com um profissional (médico, enfermeiro, cirurgião dentista, etc.).

### Colunas Cruciais
- `co_fat_cidadao_pec`: Chave estrangeira ligando ao núcleo do cidadão (`tb_fat_cidadao_pec`).
- `co_dim_cbo_1`: Chave estrangeira para a ocupação (CBO) do profissional responsável pelo atendimento (`tb_dim_cbo`).
- `co_dim_equipe_1`: Equipe (INE) pela qual o atendimento foi realizado. Essencial para contabilidade de produção da equipe.
- `dt_inicial_atendimento`: Data e hora em que o atendimento foi iniciado. Define a competência (quadrimestre) do registro.
- `co_dim_tipo_atendimento`: Chave estrangeira que classifica se foi consulta programada, demanda espontânea, etc (`tb_dim_tipo_atendimento`).
- `co_dim_local_atendimento`: Define onde o atendimento ocorreu (UBS, Domicílio, Escola, etc) (`tb_dim_local_atendimento`).
- `ds_filtro_cids` e `ds_filtro_ciaps`: Strings que contêm as condições (CIDs ou CIAPs) avaliadas no momento da consulta (ex: `|W03|`, `|I10|`, `|O24|`).

---

## 2. Tabelas de Dimensão e Classificação

### 2.1 CBOs Válidos (`tb_dim_cbo`)
Para as métricas de Desempenho (Componente 1, por exemplo), as notas técnicas frequentemente exigem que a consulta seja realizada por Médico ou Enfermeiro.
**Exemplos mapeados:**
- **Médico da ESF:** `225142`
- **Enfermeiro da ESF:** `223565`
- **Médico Generalista:** `225170`
- **Enfermeiro:** `223505`
*(O CBO do registro é validado contra as Portarias de Financiamento da APS).*

### 2.2 Tipos de Atendimento (`tb_dim_tipo_atendimento`)
Define o Numerador e Denominador do C1 (Acesso).
- **ID 2:** Consulta agendada programada / Cuidado continuado
- **ID 3:** Consulta agendada
- **ID 5:** Escuta inicial / Orientação
- **ID 6:** Consulta no dia
- **ID 7:** Atendimento de urgência

### 2.3 Locais de Atendimento (`tb_dim_local_atendimento`)
Identifica Visitas Domiciliares ou Atendimentos Remotos/Na Unidade.
- **ID 2:** UBS
- **ID 5:** Domicílio (Pode ser usado para pontuar Visita Domiciliar em cruzamento com certas fichas/condutas).

---

## 3. Aplicação nos Indicadores (Lógica Inicial)

### Indicador C1 (Acesso APS)
- **Numerador (Consultas Programadas):**
  Atendimentos Individuais (`tb_fat_atendimento_individual`) onde:
  1. `co_dim_tipo_atendimento` IN (2, 3)
  2. Profissional associado pertence às categorias médicas ou de enfermagem da ESF/EAP válidas (JOIN com `tb_dim_cbo`).
  3. Cidadão possui vínculo com a mesma equipe no quadrimestre.

- **Denominador (Todas as Consultas):**
  A mesma lógica, porém onde o `co_dim_tipo_atendimento` IN (2, 3, 5, 6, 7).

### Base para Componentes 2 e 3 (Condições de Saúde)
Os campos `ds_filtro_cids` e `ds_filtro_ciaps` em cada linha da `tb_fat_atendimento_individual` serão analisados pelas regex e lógicas descritas nos DataSets (ex: `W03`, `ABP001` para planejamento familiar, `W29` para pré-natal, `T89`/`T90` para Hipertensão/Diabetes). 

*Nota: Em alguns casos, a avaliação da condição será expandida para tabelas de evolução (`tb_fat_atd_ind_problemas`), que exploraremos em etapas seguintes.*

---
**Status da Etapa:** Concluída. A base de fatos do atendimento está delineada e conecta perfeitamente o cidadão, o profissional, o local, e a modalidade de acesso.
