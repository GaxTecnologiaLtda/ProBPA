# Roadmap ProBPA - Mapeamento de KPIs Financeiros

Com base nas diretrizes extraídas dos DataSets (especialmente os Módulos A e B do DataSet 1), o modelo de financiamento do SUS prevê valores exatos e mecanismos de transição financeira. O desempenho nos indicadores (Regular, Suficiente, Bom, Ótimo) impacta diretamente o valor repassado.

Este documento estrutura como o ProBPA irá calcular e exibir os painéis financeiros para os gestores municipais, cruzando o desempenho clínico com os repasses federais.

---

## 1. Módulos de Cálculo Financeiro

Para exibir os KPIs ("Financeiro Atual", "Perda Atual" e "Projeção de Recuperação"), o motor financeiro do ProBPA precisará processar três cenários de faturamento:

### A) Cenário Histórico (Garantia de Não Redução)
*   **A Regra (Art. 12-T):** O município não pode receber menos do que a média mensal repassada nas 12 parcelas anteriores à Portaria 3.493/2024.
*   **Mecanismo:** Se a soma dos componentes I, II e III no novo modelo for menor que o Histórico, o MS paga a diferença acrescida de um bônus de 10% (Compensação Financeira).

### B) Cenário Atual de Repasse (A Realidade do Extrato Bancário)
*   **Fixo (Componente I):** Pago conforme o Estrato IED (ex: de R$ 12.000 a R$ 18.000 por eSF 40h).
*   **Vínculo e Qualidade (Transição de 20 meses):** A regra original dos 20 meses de implantação, que pagava a classificação **"BOM"** como "salvaguarda", encerrou-se em Janeiro de 2026.
    *   *Nota Importante sobre o Calendário:* O repasse do 1º quadrimestre de 2026 ainda será recebido com a classificação "Bom" pois ele é um reflexo financeiro do último quadrimestre avaliado em 2025 (que ainda estava protegido pelos 20 meses). Novas portarias estenderam a readequação até 2027 para certos tipos de equipes, e adicionaremos essas regras específicas no motor financeiro posteriormente.

### C) Cenário de Desempenho Real (A Realidade Clínica do ProBPA)
O que o município *de fato* receberia se a regra de transição acabasse hoje, baseado no escore real calculado pelo Conector ULTRA (Ótimo, Bom, Suficiente, Regular).

---

## 2. Estrutura dos KPIs para o Dashboard do ProBPA

Aqui estão os nomes e as fórmulas dos KPIs que iremos montar no painel do gestor.

### 💰 KPI 1: Repasse Federal Atual (O que cai na conta)
*   **Descrição:** Valor mensal que o município está recebendo atualmente.
*   **Fórmula:** `[Soma do Fixo (C1)] + [Vínculo e Qualidade garantidos pelo "Bom" (transição)] + [Parcela de Compensação (se houver)]`.

### 🚨 KPI 2: Risco Financeiro Oculto (A "Perda Invisível")
*   **Descrição:** Mostra ao gestor o quanto de dinheiro ele vai perder no momento em que a regra de transição de 20 meses acabar, caso o desempenho real das equipes esteja abaixo do "Bom".
*   **Fórmula:** `[Valor do Repasse Atual na classificação BOM] - [Valor Simulado com a classificação Real (ex: Regular/Suficiente)]`.
*   **Exemplo:** O MS paga "Bom" (R$ 10.000), mas a equipe só atingiu "Regular" (R$ 3.000). O Risco Financeiro Oculto da equipe é de R$ 7.000 mensais que irão sumir da conta quando a transição terminar.

### 📉 KPI 3: Perda por Suspensões (Módulo C)
*   **Descrição:** Dinheiro que não entrou no repasse devido a bloqueios e infrações.
*   **Fórmula:** Penalidades proporcionais (25%, 50%, 75%) ou totais (100%) aplicadas por ausência de profissionais, estouro de 60h semanais ou falta de envio de dados ao Sisab por 3 meses.

### 🚀 KPI 4: Potencial de Recuperação (Upside Financeiro)
*   **Descrição:** O máximo de dinheiro extra que o município poderia ganhar se as equipes saíssem do seu desempenho atual (ou da regra de transição "Bom") e atingissem a meta máxima (**ÓTIMO**) em todos os indicadores.
*   **Fórmula:** `[Valor Projetado com 100% de equipes no ÓTIMO] - [Valor Projetado com o desempenho Real atual]`.
*   **Ação:** Este é o número que o ProBPA usa para engajar o gestor: *"Você está deixando R$ X na mesa por não atingir as metas"*.

### 📊 KPI 5: Distribuição de Desempenho (Pizza/Rosca)
*   **Descrição:** Um sumário rápido de como as equipes estão perfomando no mundo real (excluindo a regra de transição).
*   **Categorias:**
    *   🔵 **Ótimo:** > 8,5 (Vínculo) ou > 7,5 (Qualidade)
    *   🟢 **Bom:** 7,0 a 8,5 (Vínculo) ou 5,0 a 7,5 (Qualidade)
    *   🟡 **Suficiente:** 5,0 a 6,9 (Vínculo) ou 2,6 a 4,9 (Qualidade)
    *   🔴 **Regular:** < 5,0 (Vínculo) ou < 2,6 (Qualidade)

---

## 3. Onde vamos plugar isso no Conector ULTRA?
Para preencher esses KPIs financeiros, nosso Conector ULTRA não enviará apenas a "soma de pontos" para a nuvem. Ele calculará as chaves de desempenho bruto por INE (Identificador Nacional de Equipe), e o painel do ProBPA pegará essas chaves e as multiplicará pelo valor em Reais (R$) estipulado nas portarias.
