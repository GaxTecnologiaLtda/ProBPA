# Etapa 1: O Núcleo do Indivíduo (Identidade e Vínculo)
**Status:** Mapeado 🟢

Esta etapa resolve o desafio principal do Cadastro e Vínculo (CVAT), que é o de rastrear unicamente um cidadão (paciente) e saber exatamente a qual equipe de saúde ele pertence, para podermos auditar seus indicadores.

No e-SUS PEC, os dados não vivem em uma única tabela. Eles estão divididos entre tabelas **Transacionais** (onde os dados brutos de formulários são gravados) e tabelas **Dimensionais/Fato** (onde o e-SUS processa as regras de negócio para enviar ao Sisab).

## 1. As Tabelas Centrais

### `tb_cidadao` (A Identidade Bruta)
Esta é a tabela raiz. Cada paciente criado no sistema ganha um registro aqui.
*   **Campos de Identificação:** `nu_cpf` (CPF), `nu_cns` (Cartão SUS), `no_cidadao` (Nome), `dt_nascimento` (Data de Nascimento), `no_sexo` (Gênero).
*   **Chave Primária Transacional:** `co_seq_cidadao`.
*   **Por que usaremos:** É a fonte primária e mais atualizada para calcular a Idade Exata do paciente (usada nos denominadores C2, C6, C7).

### `tb_fat_cidadao_pec` (O Vínculo Consolidado)
A "joia da coroa" para o motor CVAT. O e-SUS periodicamente analisa todos os atendimentos e cadastros domiciliares de um cidadão e define "de quem ele é". Isso é gravado aqui.
*   **Campos Chave:** `co_cidadao` (Chave Estrangeira que liga com a `tb_cidadao`).
*   **Campos de Vínculo (O coração do CVAT):** 
    *   `co_dim_equipe_vinc`: Aponta para a tabela dimensional da Equipe (INE).
    *   `co_dim_unidade_saude_vinc`: Aponta para a tabela dimensional da Unidade de Saúde (CNES).

### `tb_dim_equipe` (O Cadastro Nacional da Equipe)
Tabela dimensional que armazena as equipes cadastradas.
*   **Campos Chave:** `co_seq_dim_equipe` (Chave Primária), `nu_ine` (Identificador Nacional de Equipe).

---

## 2. A Engenharia da Query Principal (SQL)

Para o motor do ProBPA puxar todos os cidadãos vinculados a uma equipe (denominador base para todos os cálculos de meta), o Conector ULTRA rodará o seguinte relacionamento estrutural:

```sql
SELECT 
    c.co_seq_cidadao AS id_paciente,
    c.no_cidadao AS nome,
    c.nu_cpf AS cpf,
    c.dt_nascimento AS data_nascimento,
    c.no_sexo AS sexo,
    -- O Vínculo com a Equipe
    eq.nu_ine AS ine_vinculado
FROM public.tb_cidadao c
JOIN public.tb_fat_cidadao_pec fcp 
    ON c.co_seq_cidadao = fcp.co_cidadao
LEFT JOIN public.tb_dim_equipe eq 
    ON fcp.co_dim_equipe_vinc = eq.co_seq_dim_equipe
WHERE fcp.st_faleceu = 0 -- Exclui óbitos
  AND fcp.st_deletar IS NULL; -- Segurança de integridade
```

### Regra de Ouro Extraída:
Se `eq.nu_ine` retornar `NULL` ou vazio para um cidadão, significa que ele **não tem cadastro individual ativo** amarrado a uma microárea. Ele é um paciente "solto" no sistema (usou a UBS para uma urgência, mas não está sob os cuidados longitudinais de nenhuma ESF). Isso gera um alerta vermelho imediato no nosso painel de "Perda de Vínculo"!

---
*Mapeamento da Etapa 1 concluído com sucesso.*
