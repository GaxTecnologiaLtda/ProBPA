## FichaProcedimentoMaster

### \#1 uuidFicha

Código UUID para identificar a ficha na base de dados nacional.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| String | Sim | 36 | 44 |

**Regra:** É recomendado concatenar o CNES na frente do UUID, de modo que os 7 dígitos (CNES) \+ 1 de hífen somados aos 36 (32 caracteres \+ 4 hífen) do UUID são a limitação de 44 bytes do campo. Formato canônico.

**Referência:** Para ver a referência sobre o UUID, acesse [UUID Wikipedia](https://en.wikipedia.org/wiki/Universally_unique_identifier).

### \#2 tpCdsOrigem

Tipo de origem dos dados do registro.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Integer | Sim | 1 | 1 |

**Regra:** Utilizar valor 3 (sistemas terceiros).

### \#3 headerTransport

Profissional que realizou os procedimentos.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| UnicaLotacaoHeader | Sim | \- | \- |

**Regra:** Somente as CBOs apresentadas na [Tabela 6 \- CBOs que podem registrar ficha de procedimento](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/regras/cbo.html#ficha-de-procedimentos) podem ser adicionadas no campo CBO do profissional.

**Referência:** [UnicaLotacaoHeader](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/header-transport.html#unicalotacaoheader).

### \#4 atendProcedimentos

Registro dos procedimentos realizados.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| List\<FichaProcedimentoChild\> | Condicional | 0 | 99 |

**Referência:** [FichaProcedimentoChild](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#fichaprocedimentochild).

**Observação:** É requerido pelo menos um dentre os itens \#4 a \#11.

### \#5 numTotalAfericaoPa

Quantidade de aferições de pressão realizadas.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Condicional | 0 | 3 |

**Regras:**

* Não pode ser preenchido com o valor "0" (zero);  
* É requerido pelo menos um dentre os itens \#4 a \#11.

### \#6 numTotalGlicemiaCapilar

Quantidade de aferições de glicemia capilar.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Condicional | 0 | 3 |

**Regras:**

* Não pode ser preenchido com o valor "0" (zero);  
* É requerido pelo menos um dentre os itens \#4 a \#11.

### \#7 numTotalAfericaoTemperatura

Quantidade de aferições de temperatura realizadas.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Condicional | 0 | 3 |

**Regras:**

* Não pode ser preenchido com o valor "0" (zero);  
* É requerido pelo menos um dentre os itens \#4 a \#11.

### \#8 numTotalMedicaoAltura

Quantidade de aferições de altura.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Condicional | 0 | 3 |

**Regras:**

* Não pode ser preenchido com o valor "0" (zero);  
* É requerido pelo menos um dentre os itens \#4 a \#11.

### \#9 numTotalCurativoSimples

Quantidade de curativos simples realizados.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Condicional | 0 | 3 |

**Regras:**

* Não pode ser preenchido com o valor "0" (zero);  
* É requerido pelo menos um dentre os itens \#4 a \#11.

### \#10 numTotalMedicaoPeso

Quantidade de aferições de peso.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Condicional | 0 | 3 |

**Regras:**

* Não pode ser preenchido com o valor "0" (zero);  
* É requerido pelo menos um dentre os itens \#4 a \#11..

### \#11 numTotalColetaMaterialParaExameLaboratorial

Quantidade de coletas para exame laboratorial.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Condicional | 0 | 3 |

**Regras:**

* Não pode ser preenchido com o valor "0" (zero);  
* É requerido pelo menos um dentre os itens \#4 a \#11.

## FichaProcedimentoChild

### \#1 numProntuario

Número do prontuário do cidadão na UBS.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| String | Não | 0 | 30 |

### \#2 cnsCidadao

CNS do cidadão.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| String | Não | 15 | 15 |

**Regras**:

* Validado por algoritmo;  
* Não pode ser preenchido se o campo [cpfCidadao](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#3-cpfcidadao) for preenchido.

**Referência:** O algoritmo de validação está presente em [Validar CNS](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/regras/algoritmo_CNS.html).

### \#3 cpfCidadao

CPF do cidadão.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| String | Não | 11 | 11 |

**Regras:**

* Somente CPF válido será aceito;  
* Não pode ser preenchido se o campo [cnsCidadao](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#2-cnscidadao) for preenchido.

### \#4 dtNascimento

Data de nascimento do cidadão.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Sim | \- | \- |

**Regras:** Não pode ser posterior à [dataAtendimento](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/header-transport.html#5-dataatendimento) e anterior a 130 anos a partir da [dataAtendimento](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/header-transport.html#5-dataatendimento).

**Referência:** A data deve ser apresentada seguindo o padrão [Epoch](https://pt.wikipedia.org/wiki/Era_Unix), convertido em milissegundos . Para realizar a conversão, pode ser utilizado o conversor [Current millis](https://currentmillis.com/).

### \#5 sexo

Código do sexo do cidadão.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Sim | \- | \- |

**Referência:** [Sexo](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/referencias/dicionario.html#sexo).

### \#6 localAtendimento

Código do local onde o atendimento foi realizado.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Sim | \- | \- |

**Regra:** Apenas valores de 1 a 10.

**Referência:** [LocalDeAtendimento](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/referencias/dicionario.html#localdeatendimento).

### \#7 turno

Código do turno onde aconteceu o atendimento.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Sim | \- | \- |

**Referência:** [Turno](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/referencias/dicionario.html#turno).

### \#8 statusEscutaInicialOrientacao

Indica a realização da escuta inicial.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Não | \- | \- |

### \#9 procedimentos

Lista dos códigos dos procedimentos.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| List\<String\> | Condicional | 0 | 20 |

**Regras:**

* Não pode conter procedimentos repetidos;  
* Podem ser informados os procedimentos pertencentes aos grupos 01 \- Ações de promoção e prevenção em saúde, 02 \- Procedimentos com finalidade diagnóstica, 03 \- Procedimentos clínicos, 04 \- Procedimentos cirúrgicos ou ao subgrupo 04 \- Telessaúde, pertencente ao grupo 08 \- Ações complementares da atenção à saúde. Além disso, os presentes na tabela [Procedimentos da Ficha](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#procedimentos-da-ficha), neste caso, se não tiver uma referência no SIGTAP, deve ser informado o código **AB** do procedimento;  
* Não pode ser preenchido com o procedimento "03.01.04.007-9 \- Escuta inicial / orientação (acolhimento a demanda espontânea)". Esta informação deve ser registrada através do campo [statusEscutaInicialOrientacao](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#8-statusescutainicialorientacao);  
* Se o campo [statusEscutaInicialOrientacao](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#8-statusescutainicialorientacao) \= false, este campo é obrigatório.

**Referências:**

* Tabela do SIGTAP, competência 08/2025 disponível em: [Tabela Unificada SIGTAP](http://sigtap.datasus.gov.br/tabela-unificada/app/sec/procedimento/publicados/consultar);  
* [Procedimentos da Ficha](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#procedimentos-da-ficha).

**Observações:**

* Inserir o código do procedimento SIGTAP sem ponto ou hífen, ex: 0214010015;  
* Inserir o código do procedimento AB em caracteres maiúsculos, sem espaços, ex: ABEX022.

### \#10 dataHoraInicialAtendimento

Data e hora do início do atendimento.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Sim | \- | \- |

**Regras:**

* Não pode ser anterior à [dataAtendimento](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/header-transport.html#5-dataatendimento);  
* Não pode ser posterior à [dataHoraFinalAtendimento](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#11-datahorafinalatendimento) e à data atual.

**Referência:** Deve ser apresentada seguindo o padrão [Epoch](https://pt.wikipedia.org/wiki/Era_Unix), convertido em milissegundos. Para realizar a conversão, pode ser utilizado o conversor [Current millis](https://currentmillis.com/).

### \#11 dataHoraFinalAtendimento

Data e hora do fim do atendimento.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Sim | \- | \- |

**Regras:**

* Não pode ser anterior à [dataHoraInicialAtendimento](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#10-datahorainicialatendimento);  
* Não pode ser posterior à data atual.

**Referência:** Deve ser apresentada seguindo o padrão [Epoch](https://pt.wikipedia.org/wiki/Era_Unix), convertido em milissegundos. Para realizar a conversão, pode ser utilizado o conversor [Current millis](https://currentmillis.com/).

### \#12 medicoes

Lista de medições registradas no atendimento.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Medicoes | Não | 0 | 1 |

**Referência:** [medicoes](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#medicoes).

### \#13 ivcf

Registro de IVCF-20 (Índice de Vulnerabilidade Clínico-Funcional).

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Ivcf | Não | 0 | 1 |

**Regra:** Só pode ser preenchido se a idade do cidadão na data do atendimento for 60 anos ou mais.

**Referência:** [ivcf](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#ivcf).

## medicoes

### \#1 circunferenciaAbdominal

Circunferência abdominal do cidadão em centímetros.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Double | Não | 0 | 5 |

**Regras:**

* Apenas números e ponto (.);  
* Máximo de 1 casa decimal;  
* Valor mínimo 0.0 e máximo 99999\.

### \#2 perimetroPanturrilha

Perímetro da panturrilha do cidadão em centímetros.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Double | Não | 0 | 5 |

**Regras:**

* Apenas números e ponto (.);  
* Máximo de 1 casa decimal;  
* Valor mínimo 10.0 e máximo 99.0.

### \#3 pressaoArterialSistolica

Pressão arterial sistólica do cidadão em mmHg.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Integer | Não | 0 | 3 |

**Regras:**

* Caso este campo seja preenchido, torna-se obrigatório o preenchimento do campo [pressaoArterialDiastolica](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#4-pressaoarterialdiastolica).  
* Valor mínimo 0 e máximo 999;

### \#4 pressaoArterialDiastolica

Pressão arterial diastólica do cidadão em mmHg.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Integer | Não | 0 | 3 |

**Regras:**

* Caso este campo seja preenchido, torna-se obrigatório o preenchimento do campo [pressaoArterialSistolica](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#3-pressaoarterialsistolica).  
* Valor mínimo 0 e máximo 999;

### \#5 frequenciaRespiratoria

Frequência respiratória do cidadão em MPM.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Integer | Não | 0 | 3 |

**Regras:**

* Apenas números inteiros;  
* Valor mínimo 0 e máximo 200\.

### \#6 frequenciaCardiaca

Frequência cardíaca do cidadão em BPM.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Integer | Não | 0 | 3 |

**Regras:**

* Apenas números inteiros;  
* Valor mínimo 0 e máximo 999\.

### \#7 temperatura

Temperatura do cidadão em ºC.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Double | Não | 0 | 4 |

**Regras:**

* Apenas números e ponto (.);  
* Máximo de 1 casa decimal;  
* Valor mínimo 20.0 e máximo 45.0.

### \#8 saturacaoO2

Saturação de oxigênio do cidadão em percentual.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Integer | Não | 0 | 3 |

**Regras:**

* Apenas números inteiros;  
* Valor mínimo 0 e máximo 100\.

### \#9 glicemiaCapilar

Glicemia capilar do cidadão em mg/dL.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Integer | Não | 0 | 3 |

**Regras:**

* Apenas números inteiros;  
* Valor mínimo 0 e máximo 800;  
* Caso este campo seja preenchido, torna-se obrigatório o preenchimento do campo [tipoGlicemiaCapilar](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#10-tipoglicemiacapilar).

### \#10 tipoGlicemiaCapilar

Momento da coleta da glicemia capilar.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Não | \- | \- |

**Regras:**

* Apenas as opções 0, 1, 2 ou 3 são aceitas;  
* Caso este campo seja preenchido, torna-se obrigatório o preenchimento do campo [glicemiaCapilar](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/estrutura_arquivos/dicionario-fp.html#9-glicemiacapilar).

**Referência:** [TipoGlicemiaCapilar](https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/referencias/dicionario.html#tipoglicemiacapilar).

### \#11 peso

Peso do cidadão em quilogramas.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Double | Não | 0 | 7 |

**Regras:**

* Apenas números e ponto (.);  
* Máximo de 3 casas decimais;  
* Valor mínimo 0.5 e máximo 500\.

### \#12 altura

Altura do cidadão em centímetros.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Double | Não | 0 | 5 |

**Regras:**

* Apenas números e ponto (.);  
* Máximo de 1 casa decimal;  
* Valor mínimo 20 e máximo 250\.

### \#13 perimetroCefalico

Perímetro cefálico do cidadão em centímetros.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Double | Não | 0 | 5 |

**Regras:**

* Apenas números e ponto (.);  
* Máximo de 1 casa decimal;  
* Valor mínimo 10.0 e máximo 200.0.

## IVCF

### \#1 resultado

Resultado em pontos do registro.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Integer | Sim | 0 | 2 |

**Regra:** Valor mínimo 0 e máximo 40\.

### \#2 hasSgIdade

Indicador de alteração na dimensão "Idade".

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Sim | \- | \- |

### \#3 hasSgPercepcaoSaude

Indicador de alteração na dimensão "Percepção da saúde".

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Sim | \- | \- |

### \#4 hasSgAvdInstrumental

Indicador de alteração na dimensão "AVD Instrumental".

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Sim | \- | \- |

### \#5 hasSgAvdBasica

Indicador de alteração na dimensão "AVD Básica".

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Sim | \- | \- |

### \#6 hasSgCognicao

Indicador de alteração na dimensão "Cognição".

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Sim | \- | \- |

### \#7 hasSgHumor

Indicador de alteração na dimensão "Humor".

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Sim | \- | \- |

### \#8 hasSgAlcancePreensaoPinca

Indicador de alteração na dimensão "Alcance, preensão e pinça", do grupo "Mobilidade".

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Sim | \- | \- |

### \#9 hasSgCapAerobicaMuscular

Indicador de alteração na dimensão "Capacidade aeróbica e/ou muscular", do grupo "Mobilidade".

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Sim | \- | \- |

### \#10 hasSgMarcha

Indicador de alteração na dimensão "Marcha", do grupo "Mobilidade".

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Sim | \- | \- |

### \#11 hasSgContinencia

Indicador de alteração na dimensão "Continência esfincteriana", do grupo "Mobilidade".

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Sim | \- | \- |

### \#12 hasSgVisao

Indicador de alteração na dimensão "Visão", do grupo "Comunicação".

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Sim | \- | \- |

### \#13 hasSgAudicao

Indicador de alteração na dimensão "Audição", do grupo "Comunicação".

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Sim | \- | \- |

### \#14 hasSgComorbidade

Indicador de alteração na dimensão "Comorbidade múltipla".

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Boolean | Sim | \- | \- |

### \#15 dataResultado

Data do registro do IVCF-20.

| Tipo | Obrigatório | Mínimo | Máximo |
| :---- | :---- | :---- | :---- |
| Long | Sim | \- | \- |

**Regras:**

* Não pode ser posterior à data atual;  
* Não pode ser posterior à dataHoraFinalAtendimento.  
* A diferença entre a dataAtendimento e a dataNascimento deve ser maior ou igual a 60 anos.

**Referência:** A data deve ser apresentada seguindo o padrão [Epoch](https://pt.wikipedia.org/wiki/Era_Unix), convertido em milissegundos. Para realizar a conversão, pode ser utilizado o conversor [Current millis](https://currentmillis.com/).

