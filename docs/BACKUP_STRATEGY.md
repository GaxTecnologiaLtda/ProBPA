# Estratégia de Backup e Recuperação de Dados - ProBPA

## 1. Avaliação da Configuração Atual
A configuração ativa no console do Firebase (conforme validado em 04/02/2026) apresenta um nível **Excelente** de segurança, comparável a ambientes corporativos de alta criticidade.

### ✅ Recuperação Pontual (PITR - Point-in-Time Recovery)
*   **Status:** Ativo
*   **Janela:** 7 dias
*   **Benefício:** Atua como uma "Máquina do Tempo". Permite restaurar o banco de dados para o estado exato de qualquer segundo nos últimos 7 dias.
*   **Uso:** Ideal para reverter erros humanos, scripts maliciosos ou bugs que corromperam dados recentemente (ex: "Deletei sem querer a tabela de profissionais há 10 minutos").

### ✅ Backups Programados (Snapshot)
*   **Status:** Ativo
*   **Retenção:** 98 dias
*   **Benefício:** Atua como "Cofre de Segurança". Garante que temos cópias congeladas e imutáveis dos dados por mais de 3 meses.
*   **Uso:** Ideal para auditoria, conformidade legal ou catástrofes completas (perda da região do Google Data Center).

---

## 2. Como Tornar Mais Robusto (Nível NASA 🚀)

Embora a configuração atual seja suficiente para 99.9% dos casos, para atingir o nível máximo de robustez (redundância externa), sugerimos os seguintes passos adicionais:

### A. Teste de Restauração (Simulado de Incêndio)
De nada adianta ter backup se não sabemos restaurar.
*   **Recomendação:** Uma vez a cada 6 meses, crie um projeto "temporário" no Firebase e tente importar um dos backups programados nele para garantir que os arquivos estão integros.

### B. Exportação "Cold Storage" (JSON Local)
Para não depender 100% da nuvem do Google (caso perca acesso à conta ou haja um bloqueio financeiro), é recomendável ter uma cópia dos dados "em mãos" (no seu HD ou S3/Drive).

**Script de Exportação JSON (Sugestão):**
Podemos criar um script simples em Node.js que conecta no banco e salva todas as coleções em arquivos `.json`.
*   *Comando:* `npm run backup:local`
*   *Destino:* Pasta `/backups/2026-02-04_full_dump.json`

### C. Redundância Geográfica
Verifique se o bucket de armazenamento dos backups programados está em uma região diferente do banco de dados (ex: Banco em `southamerica-east1` (SP), Backup em `us-central1` (Iowa)). Isso protege contra desastres físicos na região de São Paulo.

---

## 3. Procedimento de Restauração (Disaster Recovery Plan)

### Caso 1: Erro Recente (últimos 7 dias)
1.  Acesse o Console Firebase > Firestore > Backups.
2.  Clique em "Recuperação Pontual".
3.  Escolha a data e hora exata (ex: "Hoje, 14:35:00").
4.  **Importante:** Restaure para um *novo* banco de dados ou projeto de staging primeiro para validar antes de substituir a produção.

### Caso 2: Perda Total ou Auditoria Antiga
1.  Acesse o Console Firebase > Firestore > Backups > Programados.
2.  Localize a data desejada (ex: backup de 45 dias atrás).
3.  Selecione "Restaurar".
4.  O Google Cloud importará os dados para o local designado.

---
**Status:** ✅ PROTEGIDO
**Engenheiro Responsável:** Agent (Antigravity)
