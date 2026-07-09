# Auditoria de Registro Manual de Produção
**Data:** 2026-03-10
**Contexto:** App Produção (`src/apps/producao`)

## 1. Fluxo de Salvamento (`bpaService.ts`)
- A função principal responsável pelo salvamento de múltiplos procedimentos num mesmo atendimento é a `saveMultipleBpaRecords`.
- Ela executa um `batch.set()` duplo (Dual Write):
  1. Caminho Legado (Raiz): `bpa_records/BPA-I/competencias/{comp}/registros/{dayKey}/pacientes/{patientId}/procedures/{procId}`
  2. Caminho Novo (Scoped): `municipalities/{entityType}/{entityId}/{municipalityId}/bpai_records/{unitId}/professionals/{professionalId}/competencias/{comp}/dates/{dayKey}/pacientes/{patientId}/procedures/{procId}`
- **Observação Crítica:** O `entityType` ("PUBLIC" ou "PRIVATE") é deduzido a partir da `dataBase.entityType` ou checando assincronamente a coleção `entities`. Se falhar (timeout ou erro de permissão offline), ocorre um `fallback` para `"PUBLIC"`. Isso pode gerar dados órfãos se a entidade for privada e houver lentidão na web.

## 2. Salvar/Atualizar Paciente (`saveOrUpdatePatient`)
- A função intercepta o salvamento para checar duplicatas e armazenar o paciente num caminho também *Scoped* da Entidade/Município (`municipalities/{type}/{entityId}/{municipalityId}/patients`).
- Em caso de estar offline (pelo `safeGetDocs`), a checagem de exclusividade de CNS ou CPF falha passivamente (`empty: true`), o que resultará na **criação de um paciente duplicado localmente** toda vez que o formulário for salvo sem rede, visto que ele vai gerar um novo UUID de documento.

## 3. Componente de UI e Validações (`Register.tsx -> handleSubmit`)
- O formulário está segregando o payload entre **FAI** (Ficha Atendimento Individual - procedimentos que iniciam por `030101` etc) e **FP** (Ficha de Procedimentos - procedimentos "Realizados" como o `04...`).
- Esse *Split* de procedimentos causa dois envios de lote distintos (um `originFicha: 'INDIVIDUAL'` e outro `originFicha: 'PROCEDIMENTOS'`).
- **Possível Ponto Cego (Odonto/Domiciliar):** Fichas do tipo `ODONTO` inserem todos os procedimentos diretamente no lote **FAI** (linha 1215), ignorando o lote FP. Isso significa que extrações focadas apenas em "Ficha de Procedimentos" podem perder intervenções odontológicas que foram salvos com a "casca" FAI.
- **Validação de Paciente:** Requer CNS ou CPF quando configurado como `isLediTarget`. Quando `isLediTarget=false`, permite salvar o paciente apenas com NOME.
- **Validação de Formulários Específicos:** Ficha Individual exige que pelo menos uma 'Conduta/Desfecho' esteja selecionada, e Odonto exige 'Tipo de Consulta' e 'Vigilância em Saúde Bucal'.

## 4. Interface Simplificada (`RegisterSimplified.tsx`)
- Este componente é ativado quando o `municipalityInterfaceType === 'simplified'`.
- **Efeito Principal (Fichas):** Ele desliga completamente o roteamento de FAI (Ficha de Atendimento Individual - CDS 03). Todos os códigos SIGTAP registrados neste modo são enviados para a bateria de persistência como `FP` (Ficha de Procedimentos - CDS 06), utilizando a flag `originFicha: 'SIMPLIFIED'`. 
- **Bypass de Validações e-SUS/APS:** A interface simplificada burla explicitamente as validações rígidas do e-SUS (`if (isLediTarget && !isSimplifiedMode)`):
  - **Não exige** Modulo 11 válido para CNS.
  - **Não exige** Turno obrigatório para gerar o pacote FP.
  - **Não aplica** Regex restritivo nos nomes dos pacientes.
- Permanece consumindo as mesmas funções do `bpaService.ts` (`saveMultipleBpaRecords` e `saveOrUpdatePatient`), portanto,  herda vulnerabilidades como o risco de duplicação do paciente em modo offline (por gerar novos `UUIDs` ao falhar o cache no leitor de CNS/CPF).
