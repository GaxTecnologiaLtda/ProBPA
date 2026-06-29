# Etapa 4: Aferições Clínicas, Antropometria e Procedimentos

Esta etapa é focada em mapear onde ficam armazenados os dados clínicos quantitativos (Pressão Arterial, Peso, Altura) e os registros de procedimentos realizados (SIGTAP), essenciais para validar os Componentes 2 (Pré-Natal), 3 (Gestantes - Odonto), 4 (Cito/Mama), 6 (Hipertensão) e 7 (Diabetes).

## 1. Aferições Clínicas e Antropometria

O PEC e-SUS registra as aferições de duas formas complementares:

### A. Na Própria Tabela Fato de Atendimento (`tb_fat_atendimento_individual`)
Durante a finalização do atendimento, métricas consolidadas são gravadas diretamente na linha do atendimento:
- `nu_peso`: Peso aferido.
- `nu_altura`: Altura aferida.
- `nu_pressao_sistolica`: Valor da pressão arterial sistólica.
- `nu_pressao_diastolica`: Valor da pressão arterial diastólica.
- `nu_glicemia`: Nível de glicemia.
- `st_vacinacao_em_dia`: Flag indicando se a vacinação foi avaliada.

### B. Na Tabela Transacional Específica (`tb_medicao`)
Tabela que guarda um histórico mais granular de cada medição feita, com data e hora exatas (`dt_medicao`), conectada ao atendimento (`co_atend_prof`).
- `nu_medicao_peso`
- `nu_medicao_altura`
- `nu_medicao_pressao_arterial` (Muitas vezes formatada como string `120/80` dependendo da versão do PEC, ou consolidada para uso analítico na fato principal).

**Lógica de Auditoria (ex: Hipertensão - C3 e Diabetes - C4):**
Para pontuar o indicador, o paciente (denominador) deve ter uma consulta onde a pressão arterial (para HAS) ou a solicitação de Hemoglobina Glicada / Aferição de PA (para DM) tenha sido registrada simultaneamente. A checagem verifica se `nu_pressao_sistolica` e `nu_pressao_diastolica` não são nulos na consulta de acompanhamento.

---

## 2. Procedimentos e Exames (Tabelas de Faturamento SIGTAP)

Diversos indicadores baseiam-se na execução ou solicitação de procedimentos padronizados (código SIGTAP). Exemplos clássicos: Coleta de Citopatológico, Teste Rápido de Sífilis/HIV (Gestante), Avaliação de Pé Diabético, Tratamento Odontológico.

### Tabelas Principais:
- **`tb_fat_proced_atend_proced`**: A tabela fato que associa um atendimento a um procedimento realizado.
  - `co_fat_cidadao_pec`: O cidadão que recebeu o procedimento.
  - `co_dim_procedimento`: Chave estrangeira que aponta para o procedimento específico.
  - O CBO do profissional e a Equipe também são gravados aqui (`co_dim_cbo`, `co_dim_equipe`), fundamental para contabilizar a produção da equipe correta.

- **`tb_dim_procedimento`**: Tabela dimensional com a biblioteca de procedimentos.
  - `co_proced`: O código SIGTAP (ex: `0201020033` para Coleta de Material para Exame Citopatológico de Colo Uterino).
  - `ds_proced`: A descrição do procedimento.

### Aplicação nos Indicadores:
- **C7-A (Citopatológico):** Buscar na `tb_fat_proced_atend_proced` o `co_proced` (SIGTAP) correspondente à coleta, para mulheres na faixa etária correta.
- **Diabetes (C4):** Além das consultas, buscar SIGTAP para Avaliação do Pé Diabético ou Teste Rápido de HbA1c.
- **Pré-Natal (C2):** Buscar exames de Teste Rápido Sífilis/HIV vinculados ao atendimento da gestante.

---
**Status da Etapa:** Concluída. Mapeamos com precisão como o e-SUS amarra as medições clínicas ao cidadão e a execução de procedimentos tabelados ao histórico de produção da equipe.
