# Etapa 3: Rastreio de Condições e Antecedentes Clínicos

Esta etapa tem como objetivo mapear a lógica para encontrar os denominadores dos indicadores focados em condições crônicas e específicas, ou seja, descobrir exatamente quem são os cidadãos Hipertensos (C3), Diabéticos (C4) e Gestantes ativas (C5) na base do e-SUS PEC.

## 1. O Rastreio Através da Lista de Problemas/Condições (Longitudinal)
O prontuário eletrônico possui uma "Lista de Problemas e Condições" que acompanha o cidadão ao longo do tempo. Quando um diagnóstico é estabelecido, ele entra nesta lista.

### Tabelas Principais:
- **`tb_problema`**: Armazena a condição propriamente dita.
  - `co_prontuario`: Ligação com o cidadão.
  - `co_ciap` / `co_cid10`: Códigos da condição clínica (vinculam às tabelas base `tb_ciap` e `tb_cid10`).
  - `co_unico_problema` e `nu_uuid_problema`: Identificadores únicos do problema.

- **`tb_problema_evolucao`**: Acompanha o status desse problema no decorrer do tempo.
  - `co_unico_problema`: Chave que conecta à `tb_problema`.
  - `co_situacao_problema`: Define o status. Valores mapeados via `tb_situacao_problema` / `tb_dim_situacao_problema`:
    - **0**: Ativo (O cidadão possui a condição atualmente)
    - **1**: Latente
    - **2**: Resolvido
  - `dt_inicio_problema` e `dt_fim_problema`: Importantes para saber se no quadrimestre avaliado a condição já estava ativa.

#### Lógica Aplicada:
Para ser considerado Hipertenso ou Diabético (denominador de C3 e C4), procuramos cidadãos (`co_prontuario`) que tenham um registro na `tb_problema` com CIAP-2 (ex: K86, K87 para HAS; T89, T90 para DM) ou CID-10 correspondente, cuja evolução mais recente na `tb_problema_evolucao` tenha `co_situacao_problema = 0` (Ativo).

---

## 2. O Rastreio Através dos Atendimentos Individuais (Transacional)
Além da lista de problemas longitudinal, as condições avaliadas em cada consulta também servem como rastreio.

### Tabelas Principais:
- **`tb_fat_atd_ind_problemas`**: Registra as condições avaliadas em cada consulta individual (`co_fat_atd_ind`).
  - `co_dim_ciap` e `co_dim_cid`: Chaves dimensionais do problema avaliado.
  - `st_avaliado`: Confirmação de que a condição foi avaliada naquele momento.
  - Esta tabela consolida as marcações da folha de rosto do atendimento (onde o médico insere os CIDs/CIAPs de diagnóstico).

- **`tb_fat_atendimento_individual`**: Na própria tabela fato, existem as strings de filtro:
  - `ds_filtro_ciaps` (ex: `|ABP005|`, `|W71|`)
  - `ds_filtro_cids` (ex: `|I10|`, `|O24|`)
  Isso permite uma consulta mais rápida sem precisar fazer JOIN explícito na `tb_fat_atd_ind_problemas` para lógicas mais simples.

---

## 3. Gestantes (Componente 5) e Antecedentes Obstétricos
Gestantes requerem uma atenção dupla: rastreio clínico de gravidez e os antecedentes para saber desfechos (aborto, parto).

### Tabelas Principais:
- **`tb_antecedente`**: Guarda o histórico clínico fixo e obstétrico.
  - Relacionado pelo `co_prontuario`.
  - `ds_gestacao`, `dt_ultimo_parto`, `co_desfecho_ultima_gestacao`.
- **`tb_antecedente_tipo_item`**: Mostra os tipos de itens monitorados, como:
  - ID 13: Gestações (NGE)
  - ID 15: Desfecho da última gestação
  - ID 27 e 28: Idade Gestacional (Semanas e Dias).

#### Lógica para Gestantes:
Para definir o denominador de gestantes ativas ou com parto recente no quadrimestre, cruzamos a `tb_problema` (condição de gravidez ativa, CIAPs de W71 a W93, ABP001, etc) e a Data da Última Menstruação (DUM), frequentemente salva nas tabelas de pré-natal (próximas etapas) ou calculada a partir dos atendimentos (`co_dim_tempo_dum` na `tb_fat_atendimento_individual`).

---
**Status da Etapa:** Concluída. As regras para identificar crônicos e gestantes estão desenhadas a partir das tabelas `tb_problema`, `tb_problema_evolucao` e da tabela fato de atendimentos/problemas.
