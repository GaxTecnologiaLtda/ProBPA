# Etapa 7: Estrutura Profissional e Cadastral (Dimensões Fato)

Para que o ProBPA consiga gerar painéis ricos, mostrando o desempenho *por posto de saúde*, *por equipe* e *por profissional*, precisamos cruzar as tabelas fato com as tabelas de dimensão estrutural. O e-SUS PEC utiliza um modelo Star Schema para isso.

## 1. As Dimensões de Faturamento (Chaves Estrangeiras)
Toda tabela fato principal (ex: `tb_fat_atendimento_individual`, `tb_fat_proced_atend_proced`, `tb_fat_vacinacao_vacina`) carrega um conjunto padrão de chaves dimensionais que respondem "Quem fez, Onde fez e O que é a pessoa que fez?".

As principais são:
- `co_dim_equipe`
- `co_dim_unidade_saude`
- `co_dim_profissional`
- `co_dim_cbo`

## 2. Dicionários de Estrutura (As Tabelas Dim)

### A. Equipe (INE)
- **`tb_dim_equipe`**: Fornece o Código INE (Identificador Nacional de Equipes).
  - Colunas: `co_seq_dim_equipe` (link com a Fato), `nu_ine`, `no_equipe` (Nome da Equipe).
  - *Dica Ultra:* Agrupar por `nu_ine` é a base para o pagamento do programa Previne Brasil e para o eixo financeiro.

### B. Unidade de Saúde (CNES)
- **`tb_dim_unidade_saude`**: Fornece o Cadastro Nacional de Estabelecimento de Saúde (CNES).
  - Colunas: `co_seq_dim_unidade_saude` (link com a Fato), `nu_cnes`, `no_unidade_saude` (Nome do Posto).

### C. Profissional (CNS / Nome)
- **`tb_dim_profissional`**: Identifica o profissional pessoa física.
  - Colunas: `co_seq_dim_profissional`, `nu_cns`, `no_profissional`.

### D. Ocupação (CBO)
- **`tb_dim_cbo`**: Classificação Brasileira de Ocupações.
  - Colunas: `co_seq_dim_cbo`, `nu_cbo` (Código CBO), `no_cbo` (ex: "MÉDICO DA ESTRATÉGIA DE SAÚDE DA FAMÍLIA").
  - *Dica Ultra:* Para os Indicadores 1, 2, 3, 4, 6 e 7, quase sempre os CBOs aceitos são os de Médico (ex: `225142`, `225124`, `225121`) ou Enfermeiro (`223565`). Na Odonto (C5 e Eixo B), filtramos pelos CBOs de Cirurgião-Dentista (`2232**`, `3224**`).

## 3. Cadastro do Cidadão
Para descobrir a idade do paciente (importante para todos os CIDs, especialmente vacinas que medem dias exatos e Cito que mede 25 a 64 anos), o e-SUS consolida o cadastro centralizado:
- **`tb_cidadao`** e **`tb_fat_cidadao_pec`**: Fornecem o CPF, CNS, Data de Nascimento (`dt_nascimento`) e Sexo (`co_dim_sexo`). Cruzamos essas chaves com os denominadores para ter a relação nominal de cada cidadão e saber se ele atinge a faixa etária do indicador no dia final do quadrimestre.

---
**Status da Etapa:** Concluída. Arquitetura organizacional e de cadastro totalmente desvendada, permitindo que as queries segmentem por gestor, unidade e equipe, gerando os KPIs financeiros!
