# Etapa 6: Saúde Bucal (Odontologia - eSB)

A Odontologia no e-SUS PEC possui um módulo próprio para capturar os detalhes únicos do atendimento em saúde bucal. O mapeamento correto desta área é vital para dois grandes pilares do ProBPA:
1. **Componente 5 (C5):** Proporção de gestantes com atendimento odontológico realizado na Atenção Primária à Saúde.
2. **Novos Eixos (B1 a B6):** Indicadores focados em Tratamento Concluído, Primeira Consulta Programática, Cobertura em Crianças, etc.

## 1. O Atendimento Odontológico Faturado
No modelo de dimensionalidade do PEC, a odontologia ganha uma tabela fato exclusiva, paralela à `tb_fat_atendimento_individual`:

- **`tb_fat_atendimento_odonto`**: A espinha dorsal para qualquer auditoria odontológica.
  - Relaciona o cidadão (`co_fat_cidadao_pec`) ao profissional de saúde bucal (Dentista, TSB, ASB via `co_dim_cbo`).
  - Utilizada como fonte base para verificar se a Gestante teve pelo menos uma consulta com o CBO apropriado durante as semanas da gravidez (Regra do C5).

## 2. Tipificação da Consulta e Conduta (Novos Eixos B1 a B6)
Para os indicadores modernos de desempenho de saúde bucal, o simples fato de "ter a consulta" não basta. O tipo da consulta é o que define o denominador e o numerador:

- **`tb_dim_tipo_consulta_odonto`**: Dicionário que tipifica o atendimento.
  - ID 1: Primeira consulta odontológica programática (Abre um novo ciclo de tratamento e entra no denominador).
  - ID 3: Consulta de conclusão de tratamento (Fecha o ciclo de tratamento e entra no numerador dos indicadores B).
  - ID 2: Consulta de retorno.
  - ID 4: Consulta de manutenção.
  
Na fato odonto (`tb_fat_atendimento_odonto`), haverá uma chave `co_dim_tipo_consulta_odonto` que aponta para essa dimensão. A Query Ultra mapeará todas as "Primeiras consultas" num determinado quadrimestre e cruzará quantas destas se transformaram em "Consulta de conclusão" no mesmo quadrimestre ou subsequentes.

## 3. Procedimentos Odontológicos e Fornecimento
A Odontologia tem forte peso procedimental:
- **`tb_fat_proced_atend_odonto`** (ou consolidada na `tb_fat_proced_atend_proced`): Grava os procedimentos SIGTAP realizados dente-a-dente ou por sextante (ex: Aplicação tópica de flúor, Restauração, Exodontia).
- **`tb_tipo_fornec_odonto`**: Rastreia se houve fornecimento de itens como Escova, Creme dental ou Fio dental, dados exigidos em algumas apurações locais e federais.

---
**Status da Etapa:** Concluída. A estrutura para extração dos indicadores odontológicos de gestantes (C5) e eficiência do tratamento concluído está arquitetada.
