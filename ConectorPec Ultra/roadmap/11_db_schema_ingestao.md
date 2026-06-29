# Estrutura de Ingestão de Dados (Collections DB) - ConectorPec Ultra

Com a evolução da complexidade do **ConectorPec Ultra**, o envio de dados brutos soltos apenas "por ano" não é mais eficiente. O programa Previne Brasil e o modelo do ProBPA trabalham de forma **Quadrimestral** (Q1, Q2, Q3). Portanto, a estrutura do banco de dados (que irá recepcionar o POST da API) deve refletir essa segmentação temporal e lógica.

Abaixo está o design ajustado para as coleções NoSQL (Firestore) para recepcionar a ingestão do conector.

---

## 1. Coleção Raiz: `pec_script`

Esta será a coleção matriz. O identificador do documento (`_id`) de cada entidade será o **próprio nome do município** (ou um ID atrelado à nomenclatura já validada na base operante no Firestore).

```json
// Coleção: pec_script
{
  "_id": "nome_do_municipio", // Ex: "Aracaju" ou ID equivalente
  "data_ultima_sincronizacao": "2026-06-29T10:00:00Z"
}
```

---

## 2. Subcoleção de Competências: `competencias` (Ano e Quadrimestre)

Dentro do documento do município (em `pec_script`), criaremos subcoleções separadas pelo **Ano** e pelo **Quadrimestre**. Isso garante que os painéis (Dashboards) realizem leituras otimizadas e apenas do período que o gestor está avaliando.

**ID Padrão do Documento:** `YYYY_Q{1,2,3}` (ex: `2026_Q1`)

```json
{
  "_id": "2026_Q1",
  "ano": 2026,
  "quadrimestre": 1,
  "periodo_vigencia": {
    "inicio": "2026-01-01",
    "fim": "2026-04-30"
  },
  "kpis_financeiros": {
    "financeiro_atual": 150000.00,
    "perda_atual": 12000.00,
    "projecao_recuperacao": 35000.00
  }
}
```

---

## 3. Subcoleções de Estrutura Interna (Fichas e Módulos)

Dentro do quadrimestre (`2026_Q1`), o conector injetará a volumetria de dados segregada em módulos lógicos e por **tipos de fichas**, respeitando a origem dos dados mapeada no e-SUS PEC (Roadmap).

### 3.1. `cadastros`
Representa os cidadãos territoriais (Fichas de Cadastro Individual). Contém dados de identidade e condições crônicas mapeadas.

```json
// Exemplo em: pec_script/nome_municipio/competencias/2026_Q1/cadastros/
{
  "cns_cpf": "12345678901",
  "dados_pessoais": {
    "data_nascimento": "1980-05-15",
    "sexo": "F"
  },
  "condicoes_clinicas": {
    "hipertenso": true,
    "diabetico": false,
    "gestante": false
  },
  "vinculo": {
    "cnes": "1111111",
    "ine": "2561267370"
  }
}
```

### 3.2. Fichas de Produção e Atendimento
Ao invés de uma coleção genérica, organizaremos por **tipo de ficha**, seguindo a estrutura do Sisab/PEC:

#### `ficha_atendimento_individual`
Registros das atividades faturadas no período, focando em consultas e aferições vitais (pressão, glicemia, testes rápidos).
```json
// Exemplo em: pec_script/nome_municipio/competencias/2026_Q1/ficha_atendimento_individual/
{
  "cns_cpf_paciente": "12345678901",
  "data_atendimento": "2026-02-10",
  "profissional": { "cbo": "225142", "nome_cns": "Dr. João Silva" },
  "equipe": { "ine": "2561267370", "cnes": "1111111" },
  "conduta_consulta_agendada": true,
  "procedimentos_sigtap": ["ABPG010", "ABPG024"],
  "problemas_avaliados": ["W78", "W81"] // Códigos CIAP2 (Gestação, etc)
}
```

#### `ficha_atendimento_odonto`
Registros exclusivos da equipe de saúde bucal (eSB). Crucial para os indicadores B1-B6 e C5.
```json
// Exemplo em: pec_script/nome_municipio/competencias/2026_Q1/ficha_atendimento_odonto/
{
  "cns_cpf_paciente": "09876543210",
  "data_atendimento": "2026-03-05",
  "profissional": { "cbo": "223293", "nome_cns": "Dra. Maria Clara" },
  "equipe": { "ine": "1728791313", "cnes": "1111111" },
  "tipo_consulta_odonto": 1, // 1 = Primeira consulta programática; 3 = Tratamento Concluído
  "fornecimentos": ["ESCOVA", "CREME_DENTAL"]
}
```

#### `ficha_vacinacao`
Registros de imunobiológicos aplicados, essenciais para o C2 (Penta/Polio) e novos eixos de vacinas.
```json
// Exemplo em: pec_script/nome_municipio/competencias/2026_Q1/ficha_vacinacao/
{
  "cns_cpf_paciente": "11122233344",
  "data_aplicacao": "2026-01-20",
  "imunobiologico_codigo": "42", // Penta
  "dose_codigo": "3", // D3
  "estrategia_vacinacao": "Rotina"
}
```

#### `ficha_procedimentos`
Ficha dedicada apenas à coleta de procedimentos quando feita de forma avulsa à consulta (ex: Coleta de Citopatológico feita por enfermeiro apenas em sala de procedimentos).

### 3.3. `painel_indicadores` (Opcional - Pré-processado)
Os próprios scores do painel serão injetados pelo Conector Ultra já calculados, para aliviar a nuvem e garantir sync instantâneo.
```json
// Exemplo em: pec_script/nome_municipio/competencias/2026_Q1/painel_indicadores/
{
  "ine_equipe": "2561267370",
  "indicadores": {
    "c1_prenatal_6_consultas": { "numerador": 45, "denominador": 50, "percentual": 90.0, "pontuacao_atingida": "Bom" }
  }
}
```

---

## 4. Dinâmica de Extração (Agendamento / Sync)

1. **Agendamento Python:** O mesmo script Python via Tarefas do Windows gerenciará a frequência.
2. **Método UPSERT Firestore:** O Conector chamará o webhook da Gax Tecnologia injetando no path: `pec_script/{nome_municipio}/competencias/2026_Q1/...`. A API ou o próprio script utilizará lógica `set(merge=True)` para reescrever o quadrimestre inteiro durante um sync sem gerar dados duplicados.
