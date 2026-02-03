namespace java br.gov.saude.esus.transport
namespace js ledi

// ============================================================================
// COMMONS - DATA & HORA
// ============================================================================

// Tipicamente usamos i64 para Epoch Time em millis

// ============================================================================
// HEADER DE TRANSPORTE
// ============================================================================

struct LotacaoHeaderThrift {
  1: required string profissionalCNS;
  2: required string cboCodigo_2002;
  3: required string cnes;
  4: required string codigoIbgeMunicipio; // Changed order/requirement to match observed usage
  5: optional string ine;
  6: optional i64 dataAtendimento;
}

struct UnicaLotacaoHeaderThrift {
  1: required string profissionalCNS;
  2: required string cboCodigo_2002;
  3: required string cnes;
  4: required string codigoIbgeMunicipio;
  5: optional string ine;
  6: optional i64 dataAtendimento;
}

struct VariasLotacoesHeaderThrift {
  1: required LotacaoHeaderThrift lotacaoFormPrincipal;
}

// ============================================================================
// CAMADA DE TRANSPORTE (ENVELOPE)
// ============================================================================

struct LediOriginadoraThrift {
    1: required string contraChave;
    2: required string cpfCnpj;
}

struct LediRemetenteThrift {
    1: required string contraChave;
    2: required string cnpj;
}

struct VersaoThrift {
    1: required i32 major;
    2: required i32 minor;
    3: required i32 revision;
}

struct DadoTransporteThrift {
    1: required string uuidDadoSerializado;
    2: required i64 tipoDadoSerializado;
    3: required string cnesDadoSerializado;
    4: required string codIbge;
    5: optional string ineDadoSerializado;
    6: optional i64 numLote;
    7: required binary dadoSerializado;
    8: required LediRemetenteThrift remetente;
    9: required LediOriginadoraThrift originadora;
    10: optional VersaoThrift versao;
}

// ============================================================================
// FICHA DE CADASTRO INDIVIDUAL
// ============================================================================

struct CondicoesDeSaudeThrift {
    1: optional string descricaoCausaInternacaoEm12Meses;
    2: optional string descricaoOutraCondicao1;
    3: optional string descricaoOutraCondicao2;
    4: optional string descricaoOutraCondicao3;
    5: optional string descricaoPlantasMedicinaisUsadas;
    6: optional string doencaCardiaca;
    7: optional string doencaRespiratoria;
    8: optional string doencaRins;
    9: optional string maternidadeDeReferencia;
    10: optional i64 situacaoPeso;
    11: optional bool statusEhDependenteAlcool;
    12: optional bool statusEhDependenteOutrasDrogas;
    13: optional bool statusEhFumante;
    14: optional bool statusEhGestante;
    15: optional bool statusEstaAcamado;
    16: optional bool statusEstaDomiciliado;
    17: optional bool statusTemDiabetes;
    18: optional bool statusTemDoencaRespiratoria;
    19: optional bool statusTemHanseniase;
    20: optional bool statusTemHipertensaoArterial;
    21: optional bool statusTemTeveCancer;
    22: optional bool statusTemTeveDoencasRins;
    23: optional bool statusTemTuberculose;
    24: optional bool statusTeveAvcDerrame;
    25: optional bool statusTeveDoencaCardiaca;
    26: optional bool statusTeveInfarto;
    27: optional bool statusTeveInternadoem12Meses;
    28: optional bool statusUsaOutrasPraticasIntegrativasOuComplementares;
    29: optional bool statusUsaPlantasMedicinais;
    30: optional bool statusDiagnosticoMental;
}

struct EmSituacaoDeRuaThrift {
    1: optional string grauParentescoFamiliarFrequentado;
    2: optional string higienePessoalSituacaoRua;
    3: optional bool statusTemAcessoHigienePessoalSituacaoRua;
    4: optional string origemAlimentoSituacaoRua;
    5: optional string outraInstituicaoQueAcompanha;
    6: optional i64 quantidadeAlimentacoesAoDiaSituacaoRua;
    7: optional bool statusAcompanhadoPorOutraInstituicao;
    8: optional bool statusPossuiReferenciaFamiliar;
    9: optional bool statusRecebeBeneficio;
    10: optional bool statusSituacaoRua;
    11: optional bool statusVisitaFamiliarFrequentemente;
    12: optional i64 tempoSituacaoRua;
}

struct IdentificacaoUsuarioCidadaoThrift {
    1: optional string nomeSocial;
    2: optional string codigoIbgeMunicipioNascimento;
    3: optional i64 dataNascimentoCidadao;
    4: optional bool desconheceNomeMae;
    5: optional string emailCidadao;
    6: optional i64 nacionalidadeCidadao;
    7: required string nomeCidadao;
    8: optional string nomeMaeCidadao;
    9: optional string cnsCidadao;
    10: optional string cnsResponsavelFamiliar;
    11: optional string telefoneCelular;
    12: optional string numeroNisPisPasep;
    13: optional i64 paisNascimento;
    14: optional i64 racaCorCidadao;
    15: optional i64 sexoCidadao;
    16: optional bool statusEhResponsavel;
    17: optional i64 etnia;
    18: optional string nomePaiCidadao;
    19: optional bool desconheceNomePai;
    20: optional i64 dtNaturalizacao;
    21: optional string portariaNaturalizacao;
    22: optional i64 dtEntradaBrasil;
    23: optional string microarea;
    24: optional bool stForaArea;
    25: optional string cpfCidadao;
    26: optional string cpfResponsavelFamiliar;
}

struct InformacoesSocioDemograficasThrift {
    1: optional list<i32> deficienciasCidadao;
    2: optional i64 grauInstrucaoCidadao;
    3: optional string ocupacaoCodigoCbo2002;
    4: optional list<string> orientacaoSexualCidadao;
    6: optional i64 relacaoParentescoCidadao;
    7: optional i64 situacaoMercadoTrabalhoCidadao;
    8: optional bool statusDesejaInformarOrientacaoSexual;
    9: optional bool statusFrequentaBenzedeira;
    10: optional bool statusFrequentaEscola;
    11: optional bool statusMembroPovoComunidadeTradicional;
    12: optional bool statusParticipaGrupoComunitario;
    13: optional bool statusPossuiPlanoSaudePrivado;
    14: optional bool statusTemAlgumaDeficiencia;
    15: optional list<string> identidadeGeneroCidadao;
    16: optional bool statusDesejaInformarIdentidadeGenero;
    17: optional i64 responsavelPorCrianca;
    18: optional i64 coPovoComunidadeTradicional;
}

struct SaidaCidadaoCadastroThrift {
    1: optional i64 motivoSaidaCidadao;
    2: optional i64 dataObito;
    3: optional string numeroDO;
}

struct CadastroIndividualThrift {
    1: optional CondicoesDeSaudeThrift condicoesDeSaude;
    2: optional EmSituacaoDeRuaThrift emSituacaoDeRua;
    3: optional bool fichaAtualizada;
    4: optional IdentificacaoUsuarioCidadaoThrift identificacaoUsuarioCidadao;
    5: optional InformacoesSocioDemograficasThrift informacoesSocioDemograficas;
    6: optional bool statusTermoRecusaCadastroIndividualAtencaoBasica;
    7: optional i32 tpCdsOrigem;
    8: required string uuid;
    9: optional string uuidFichaOriginadora;
    10: optional SaidaCidadaoCadastroThrift saidaCidadaoCadastro;
    11: optional VariasLotacoesHeaderThrift headerTransport;
}

// ============================================================================
// FICHA DE CADASTRO DOMICILIAR
// ============================================================================

struct EnderecoLocalPermanenciaThrift {
    1: optional string bairro;
    2: optional string cep;
    3: optional string codigoIbgeMunicipio;
    4: optional string complemento;
    5: optional string nomeLogradouro;
    6: optional string numero;
    7: optional string numeroDneUf;
    8: optional string telefoneContato;
    9: optional string telefoneResidencia;
    10: optional string tipoLogradouroNumeroDne;
    11: optional bool stSemNumero;
    12: optional string pontoReferencia;
    13: optional string microArea;
    14: optional bool stForaArea;
}

struct CondicaoMoradiaThrift {
    1: optional i64 abastecimentoAgua;
    2: optional i64 areaProducaoRural; 
    3: optional i64 destinoLixo;
    4: optional i64 formaEscoamentoBanheiro;
    5: optional i64 localizacao;
    6: optional i64 materialPredominanteParedesExtDomicilio;
    7: optional i32 nuComodos;
    8: optional i32 nuMoradores;
    9: optional i64 situacaoMoradiaPosseTerra;
    10: optional bool stDisponibilidadeEnergiaEletrica;
    11: optional i64 tipoAcessoDomicilio;
    12: optional i64 tipoDomicilio;
    13: optional i64 aguaConsumoDomicilio;
    14: optional i64 tipoOrigemEnergiaEletrica; 
}

struct FamiliaRowThrift {
    1: optional i64 dataNascimentoResponsavel;
    2: optional string numeroCnsResponsavel;
    3: optional i32 numeroMembrosFamilia;
    4: optional string numeroProntuario;
    5: optional i64 rendaFamiliar;
    6: optional i64 resideDesde; 
    7: optional bool stMudanca;
    8: optional string cpfResponsavel;
}

struct AnimalNoDomicilioThrift {
    1: optional i64 animal;
    2: optional i32 quantidade;
}

struct InstituicaoPermanenciaThrift {
    1: optional string nomeInstituicaoPermanencia;
    2: optional bool stOutrosProfissionaisVinculados;
    3: optional string nomeResponsavelTecnico;
    4: optional string cnsResponsavelTecnico;
    5: optional string cargoInstituicao;
    6: optional string telefoneResponsavelTecnico;
}

struct CadastroDomiciliarThrift {
    1: optional list<AnimalNoDomicilioThrift> animaisNoDomicilio;
    2: optional CondicaoMoradiaThrift condicaoMoradia;
    3: optional EnderecoLocalPermanenciaThrift enderecoLocalPermanencia;
    4: optional list<FamiliaRowThrift> familias;
    5: optional bool fichaAtualizada;
    6: optional i32 quantosAnimaisNoDomicilio;
    7: optional bool stAnimaisNoDomicilio;
    8: optional bool statusTermoRecusa;
    9: optional i32 tpCdsOrigem;
    10: required string uuid;
    11: optional string uuidFichaOriginadora;
    12: optional i64 tipoDeImovel;
    13: optional InstituicaoPermanenciaThrift instituicaoPermanencia;
    14: optional VariasLotacoesHeaderThrift headerTransport;
    15: optional double latitude;
    16: optional double longitude;
    17: optional i64 tipoEndereco;
}

// ============================================================================
// FICHA DE ATENDIMENTO INDIVIDUAL
// ============================================================================

struct MedicoesThrift {
    1: optional double circunferenciaAbdominal;
    2: optional double perimetroPanturrilha;
    3: optional i32 pressaoArterialSistolica;
    4: optional i32 pressaoArterialDiastolica;
    5: optional i32 frequenciaRespiratoria;
    6: optional i32 frequenciaCardiaca;
    7: optional double temperatura;
    8: optional i32 saturacaoO2;
    9: optional i32 glicemiaCapilar;
    10: optional i64 tipoGlicemiaCapilar;
    11: optional double peso;
    12: optional double altura;
    13: optional double perimetroCefalico;
}

struct ProblemaCondicaoThrift {
    1: optional string uuidProblema;
    4: optional string ciap;
    5: optional string cid10;
    6: optional string situacao; 
    9: optional bool isAvaliado;
}

struct ExameThrift {
    1: optional string codigoExame;
    2: optional list<string> solicitadoAvaliado;
}

struct FichaAtendimentoIndividualChildThrift {
    1: optional string numeroProntuario;
    2: optional string cnsCidadao;
    3: optional i64 dataNascimento;
    4: optional i64 localDeAtendimento;
    5: optional i64 sexo;
    6: optional i64 turno;
    7: optional i64 tipoAtendimento;
    8: optional MedicoesThrift medicoes;
    9: optional i64 aleitamentoMaterno;
    10: optional i64 dumDaGestante;
    11: optional i32 idadeGestacional;
    12: optional i64 atencaoDomiciliarModalidade;
    13: optional list<ExameThrift> exame;
    14: optional bool vacinaEmDia;
    15: optional bool ficouEmObservacao;
    16: optional list<i32> nasfs;
    17: optional list<i32> condutas;
    18: optional bool stGravidezPlanejada;
    19: optional i32 nuGestasPrevias;
    20: optional i32 nuPartos;
    21: optional i64 racionalidadeSaude;
    22: optional i64 dataHoraInicialAtendimento;
    23: optional i64 dataHoraFinalAtendimento;
    24: optional string cpfCidadao;
    28: optional list<ProblemaCondicaoThrift> problemasCondicoes;
}

struct FichaAtendimentoIndividualMasterThrift {
    1: required VariasLotacoesHeaderThrift headerTransport;
    2: optional list<FichaAtendimentoIndividualChildThrift> atendimentosIndividuais;
    3: optional string uuidFicha;
    4: optional i32 tpCdsOrigem;
}

// ============================================================================
// FICHA DE PROCEDIMENTOS
// ============================================================================

struct ProcedimentoThrift {
    1: optional string coMsProcedimento; 
    2: optional i32 quantidade;
}

struct FichaProcedimentoChildThrift {
    1: optional string numProntuario;
    2: optional string cnsCidadao;
    3: optional string cpfCidadao;
    4: optional i64 dtNascimento;
    5: optional i64 sexo;
    6: optional i64 localAtendimento;
    7: optional i64 turno;
    8: optional bool statusEscutaInicialOrientacao;
    9: optional list<string> procedimentos; 
    10: optional i64 dataHoraInicialAtendimento;
    11: optional i64 dataHoraFinalAtendimento;
    12: optional MedicoesThrift medicoes; 
}

struct FichaProcedimentoMasterThrift {
    1: required string uuidFicha;
    2: optional i32 tpCdsOrigem;
    3: required VariasLotacoesHeaderThrift headerTransport;
    4: optional list<FichaProcedimentoChildThrift> atendProcedimentos; 
    
    5: optional i32 numTotalAfericaoPa;
    6: optional i32 numTotalGlicemiaCapilar;
    7: optional i32 numTotalAfericaoTemperatura;
    8: optional i32 numTotalMedicaoAltura;
    9: optional i32 numTotalCurativoSimples;
    10: optional i32 numTotalMedicaoPeso;
    11: optional i32 numTotalColetaMaterialParaExameLaboratorial;
}

// ============================================================================
// FICHA DE VACINAÇÃO
// ============================================================================

struct VacinaRowThrift {
    1: optional i64 imunobiologico;
    2: optional i64 estrategiaVacinacao;
    3: optional i64 dose;
    4: optional string lote;
    5: optional string fabricante;
    6: optional i64 grupoAtendimento;
    7: optional bool stRegistroAnterior;
    8: optional i64 dataRegistroAnterior;
    9: optional bool stAplicadoExterior;
    10: optional string especialidadeProfissionalPrescritor; // CBO (7.2.2)
    11: optional string motivoIndicacao; // CID10 (7.2.2)
    12: optional i64 viaAdministracao; // 7.3.0
    13: optional i64 localAplicacao; // 7.3.0
}

struct FichaVacinacaoChildThrift {
    1: optional i64 turno;
    2: optional string numProntuario;
    3: optional string cnsCidadao;
    4: optional i64 dtNascimento;
    5: optional i64 sexo;
    6: optional i64 localAtendimento;
    7: optional bool viajante;
    8: optional bool comunicanteHanseniase;
    9: optional list<VacinaRowThrift> vacinas;
    10: optional i64 dataHoraInicialAtendimento;
    11: optional i64 dataHoraFinalAtendimento;
    12: optional string cpfCidadao;
    13: optional i64 condicaoMaternal;
}

struct FichaVacinacaoMasterThrift {
    1: required string uuidFicha;
    2: optional i32 tpCdsOrigem;
    3: required VariasLotacoesHeaderThrift headerTransport;
    4: optional list<FichaVacinacaoChildThrift> vacinacoes;
}

// ============================================================================
// FICHA DE VISITA DOMICILIAR
// ============================================================================

struct FichaVisitaDomiciliarChildThrift {
    1: optional i64 turno;
    2: optional string numProntuario;
    3: optional string cnsCidadao;
    4: optional i64 dtNascimento;
    5: optional i64 sexo;
    6: optional bool statusVisitaCompartilhadaOutroProfissional;
    7: optional list<i32> motivosVisita;
    8: optional i64 desfecho;
    9: optional string microarea;
    10: optional bool stForaArea;
    11: optional i64 tipoDeImovel;
    12: optional double pesoAcompanhamentoNutricional;
    13: optional double alturaAcompanhamentoNutricional;
    14: optional string cpfCidadao;
    15: optional i32 pressaoSistolica;
    16: optional i32 pressaoDiastolica;
    17: optional double temperatura;
    18: optional i32 glicemia;
    19: optional i64 tipoGlicemia;
    20: optional double latitude;
    21: optional double longitude;
    22: optional string uuidOrigemCadastroDomiciliar;
}

struct FichaVisitaDomiciliarMasterThrift {
    1: required string uuidFicha;
    2: optional i32 tpCdsOrigem;
    3: required VariasLotacoesHeaderThrift headerTransport;
    4: optional list<FichaVisitaDomiciliarChildThrift> visitasDomiciliares;
}

// ============================================================================
// FICHA DE ATENDIMENTO ODONTOLÓGICO
// ============================================================================

struct ProcedimentoQuantidadeThrift {
    1: optional string coMsProcedimento;
    2: optional i32 quantidade;
}

struct FichaAtendimentoOdontologicoChildThrift {
    1: optional i64 turno;
    2: optional string numProntuario;
    3: optional string cnsCidadao;
    4: optional i64 dtNascimento;
    5: optional i64 sexo;
    6: optional i64 localAtendimento;
    7: optional bool gestante;
    8: optional bool necessidadesEspeciais;
    9: optional i64 tipoAtendimento;
    10: optional list<i32> tiposConsultaOdonto;
    11: optional list<ProcedimentoQuantidadeThrift> procedimentosRealizados;
    12: optional list<i32> vigilanciaSaudeBucal;
    13: optional i64 dataHoraInicialAtendimento;
    14: optional i64 dataHoraFinalAtendimento;
    15: optional string cpfCidadao;
}

struct FichaAtendimentoOdontologicoMasterThrift {
    1: required string uuidFicha;
    2: optional i32 tpCdsOrigem;
    3: required VariasLotacoesHeaderThrift headerTransport;
    4: optional list<FichaAtendimentoOdontologicoChildThrift> atendimentosOdontologicos;
}

// ============================================================================
// FICHA DE ATIVIDADE COLETIVA
// ============================================================================

struct ProfissionalColetivaThrift {
    1: required string cnsProfissional;
    2: required string cboCodigo_2002;
}

struct ParticipanteRowThrift {
    1: optional string cnsParticipante;
    2: optional i64 dataNascimento;
    3: optional i64 sexo;
    4: optional bool avaliacaoAlterada;
    5: optional double peso;
    6: optional double altura;
    7: optional bool cessouHabitoFumar;
    8: optional bool abandonouGrupo;
}

struct FichaAtividadeColetivaMasterThrift {
    1: required string uuidFicha;
    2: optional string outraLocalidade;
    3: optional i64 inep;
    4: optional i32 numParticipantes;
    5: optional i32 numAvaliacoesAlteradas;
    6: optional list<ProfissionalColetivaThrift> profissionais;
    7: optional i64 atividadeTipo;
    8: optional list<i32> temasParaReuniao;
    9: optional list<i32> publicoAlvo;
    10: optional list<i32> praticasEmSaude;
    11: optional list<i32> temasParaSaude;
    12: optional list<ParticipanteRowThrift> participantes;
    13: optional i32 tpCdsOrigem;
    14: required string cnesLocalAtividade; // Might be needed if local != 1/2/3
    15: optional string procedimento; // For single procedure collective acts
    16: optional i64 turno;
    17: required VariasLotacoesHeaderThrift headerTransport;
    18: optional i64 pseEducacao;
    19: optional i64 pseSaude;
}
