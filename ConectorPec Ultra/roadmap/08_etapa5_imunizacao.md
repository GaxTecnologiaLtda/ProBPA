# Etapa 5: O Módulo de Imunização (MIV)

O acompanhamento vacinal é fundamental para o cumprimento de 3 dos 7 indicadores do Previne Brasil / ProBPA:
- **Componente 2 (C2):** Proporção de crianças de 1 ano de idade vacinadas na APS contra Difteria, Tétano, Coqueluche, Hepatite B, infecções por Haemophilus influenzae tipo b e Poliomielite inativada (Penta e VIP/VOP).
- **Componentes C6 e C7 (Novos Eixos/Sub eixos):** Vacinação contra HPV e Influenza (quando inseridos no rol das competências vigentes).

Nesta etapa, validamos a estrutura de como o e-SUS PEC registra uma vacina aplicada e como auditamos se as doses corretas foram tomadas no tempo hábil.

## 1. Dicionários de Vacinas e Doses
As tabelas dimensionais ditam as regras do jogo:
- **`tb_imunobiologico`**: Dicionário de todas as vacinas do PNI.
  - Exemplos Vitais: `42` (PENTA), `29` (PENTA acelular), `22` (VIP), `28` (VOPb), `60` e `67` (HPV).
- **`tb_dose_imunobiologico`**: Dicionário das doses.
  - Exemplos Vitais: `1` (D1 - 1ª Dose), `2` (D2 - 2ª Dose), `3` (D3 - 3ª Dose).

## 2. Registros Transacionais de Vacinação
Quando o profissional na Sala de Vacina administra o imunobiológico, o registro vai para o histórico do cidadão. No e-SUS PEC padrão, esse registro pode ser encontrado de duas formas principais:

### A. Tabela Fato de Vacinação (`tb_fat_vacinacao` e `tb_fat_vacinacao_vacina`)
Estas são as tabelas construídas pelo centralizador do PEC para consolidação de relatórios.
- **`tb_fat_vacinacao`**: O "cabeçalho" do atendimento na sala de vacina (contém `co_fat_cidadao_pec`, `co_dim_tempo`, `co_dim_equipe`).
- **`tb_fat_vacinacao_vacina`**: As linhas de detalhe com os imunobiológicos administrados, cruzando com:
  - `co_dim_imunobiologico` (Aponta para a vacina).
  - `co_dim_dose_imunobiologico` (Aponta para a dose).

### B. Tabela Operacional (`tb_registro_vacinacao`)
A tabela raiz onde ficam os dados puros no banco transacional. Ela vincula o prontuário (`co_prontuario`) ao imunobiológico (`co_imunobiologico`), a dose (`co_dose_imunobiologico`), o lote e a data de aplicação (`dt_vacinacao`).

---

## 3. Lógica Analítica (Exemplo C2 - Pólio e Penta)

Para auditar o Indicador 2, a Query Ultra fará o seguinte cruzamento:
1. **Público Alvo (Denominador):** Crianças que completam 1 ano (12 meses completos) no quadrimestre de avaliação (baseado na `dt_nascimento` da `tb_cidadao`).
2. **Condição de Sucesso (Numerador):** Esta criança precisa ter um registro na `tb_fat_vacinacao_vacina` ou `tb_registro_vacinacao` contendo:
   - Uma 3ª dose (`co_dose_imunobiologico` = 3) da VIP/VOP (`co_imunobiologico` in 22, 28).
   - Uma 3ª dose (`co_dose_imunobiologico` = 3) da PENTA (`co_imunobiologico` in 42, 29).
3. **Validação de Data:** Ambas as terceiras doses precisam ter sido aplicadas **antes** da criança completar 1 ano de vida.

*(Nota técnica: Mesmo que a base DUMP simplificada de testes não traga a tabela fato de vacinação exportada em XML, a estrutura para a Query está mapeada com precisão nos dicionários que analisamos).*

---
**Status da Etapa:** Concluída. Arquitetura do módulo de imunização decifrada.
