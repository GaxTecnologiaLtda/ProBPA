
// ============================================================================
// ESTRUTURAS DE TRANSPORTE (WRAPPER)
// ============================================================================

export interface LediOriginadora {
    contraChave: string;
    cpfCnpj: string;
}

export interface LediRemetente {
    contraChave: string;
    cnpj: string;
}

/**
 * Representa o "DadoTransporte" (Root do XML de Envio)
 * dadotransporte.xsd
 */
export interface LediTransporte {
    uuidDadoSerializado: string; // UUID v4 do envelope
    tipoDadoSerializado: number; // Código do tipo de ficha (ex: 2 = Cadastro Individual)
    codIbge: string;             // Do município
    cnesDadoSerializado: string; // CNES da unidade
    ineDadoSerializado?: string; // INE da equipe (opcional)
    originadora: LediOriginadora;
    remetente: LediRemetente;
    ns: {
        'xmlns:ns4': string;
        'xmlns:ns3': string;
        'xmlns:ns2': string;
    };
    dado: string; // O XML da ficha em si (escapado ou CDATA, mas geralmente é o payload interno)
}

// ============================================================================
// HEADER DE LOTAÇÃO (Contexto Assistencial)
// ============================================================================

export interface LediLotacaoHeader {
    profissionalCNS: string;
    cboCodigo_2002: string;
    cnes: string;
    ine?: string;
    dataAtendimento: number; // Epoch time
    codigoIbgeMunicipio: string;
}

// Para fichas Master com múltiplos atendimentos (VariasLotacoes)
export interface LediVariasLotacoesHeader {
    lotacaoFormPrincipal: LediLotacaoHeader;
}

// Para fichas com única lotação (ex: Atividade Coletiva)
export interface LediUnicaLotacaoHeader {
    profissionalCNS: string;
    cboCodigo_2002: string;
    cnes: string;
    ine?: string;
    dataAtendimento: number;
    codigoIbgeMunicipio: string;
}

// ============================================================================
// 1. FICHA ATENDIMENTO INDIVIDUAL
// ============================================================================

export interface LediFichaIndividualChild {
    numeroProntuario?: string;
    cnsCidadao?: string; // Obrigatório se não tiver CPF? (Regra XSD: minOccurs=0, mas precisa de um)
    cpfCidadao?: string;
    dataNascimento: number; // Epoch
    localDeAtendimento: number;
    sexo: number; // 0=M, 1=F
    turno: number; // 1=Manhã, 2=Tarde, 3=Noite
    tipoAtendimento: number;
    pesoAcompanhamentoNutricional?: number;
    alturaAcompanhamentoNutricional?: number;
    // FAI Specific measurements (often same as above, but explicitly named for serializer mapping)
    peso?: number;
    altura?: number;
    perimetroCefalico?: number;
    perimetroPanturrilha?: number;
    circunferenciaAbdominal?: number;
    pressaoArterialSistolica?: number;
    pressaoArterialDiastolica?: number;
    frequenciaRespiratoria?: number;
    frequenciaCardiaca?: number;
    temperatura?: number;
    saturacaoO2?: number;
    glicemiaCapilar?: number;
    tipoGlicemiaCapilar?: number;
    aleitamentoMaterno?: number;
    dumDaGestante?: number; // Epoch
    idadeGestacional?: number;
    atencaoDomiciliarModalidade?: number;
    problemasCondicoes?: {
        uuidProblema?: string;
        uuidEvolucaoProblema?: string;
        coSequencialEvolucao?: number;
        ciap?: string;
        cid10?: string;
        situacao?: string;
        isAvaliado?: boolean;
        dataInicioProblema?: number;
        dataFimProblema?: number;
    }[];
    exames?: {
        codigoExame: string;
        solicitadoAvaliado: string[];
    }[];
    vacinaEmDia: boolean;
    ficouEmObservacao: boolean;
    nasfs?: any[]; // Núcleo de Apoio (se houver)
    condutas?: number[]; // Lista de códigos de conduta
    stGravidezPlanejada?: boolean;
    nuGestasPrevias?: number;
    nuPartos?: number;
    racionalidadeSaude?: number;
    dataHoraInicialAtendimento: number; // Epoch
    dataHoraFinalAtendimento: number;   // Epoch
    cpfResponsavel?: string;

    // Phase 2.5: Medical/Nursing Extensions
    medicamentos?: {
        codigoCatmat: string;
        viaAdministracao: number; // Enum
        dose: string;
        doseUnica: boolean;
        usoContinuo: boolean;
        doseFrequenciaTipo: number; // Enum
        doseFrequencia: string;
        dtInicioTratamento: number; // Epoch
        duracaoTratamento: number;
        quantidadeReceitada: number;
    }[];
    encaminhamentos?: {
        especialidade: number; // CBO or Specialty Code (Thrift expects I64 for specialization code?) Dicionario says "especialidade"
        hipoteseDiagnosticoCID10?: string;
        hipoteseDiagnosticoCIAP2?: string;
        classificacaoRisco: number; // Enum
    }[];
    resultadosExames?: {
        exame: string; // Code
        dataSolicitacao?: number;
        dataRealizacao?: number;
        dataResultado?: number;
        // Result Value is complex in Thrift (List<ResultadosExame>)
        resultado?: {
            tipoResultado: number; // Enum
            valorResultado: string;
        }[];
    }[];
    ivcf?: {
        resultado: number;
        dataResultado: number;
        // Flags
        hasSgIdade?: boolean;
        hasSgPercepcaoSaude?: boolean;
        hasSgAvdInstrumental?: boolean;
        hasSgAvdBasica?: boolean;
        hasSgCognicao?: boolean;
        hasSgHumor?: boolean;
        hasSgAlcancePreensaoPinca?: boolean;
        hasSgCapAerobicaMuscular?: boolean;
        hasSgMarcha?: boolean;
        hasSgContinencia?: boolean;
        hasSgVisao?: boolean;
        hasSgAudicao?: boolean;
        hasSgComorbidade?: boolean;
    };
    solicitacoesOci?: {
        codigoSigtap: string;
        // Others?
    }[];
}

export interface LediFichaIndividualMaster {
    headerTransport: LediVariasLotacoesHeader;
    atendimentosIndividuais: LediFichaIndividualChild[];
    tpCdsOrigem: number; // Sempre 3
    uuidFicha: string;
}

// ============================================================================
// 2. FICHA PROCEDIMENTOS
// ============================================================================

export interface LediProcedimentoChild {
    numProntuario?: string;
    cnsCidadao?: string;
    cpfCidadao?: string;
    dtNascimento?: number;
    sexo?: number;
    localAtendimento: number;
    turno: number;
    statusEscutaInicialOrientacao: boolean;
    procedimentos: {
        procedimento: string; // Código SIGTAP
        quantidade: number;
    }[];
    dataHoraInicialAtendimento: number;
    dataHoraFinalAtendimento: number;
    pesoAcompanhamentoNutricional?: number;
    alturaAcompanhamentoNutricional?: number;
}

export interface LediFichaProcedimentosMaster {
    headerTransport: LediVariasLotacoesHeader;
    atendimentosIndividuais: LediProcedimentoChild[]; // Nome no XML é esse mesmo? AtendimentosIndividuais ou Procedimentos? (Validar XSD)
    // No XSD de procedimentos, a lista se chama 'atendimentosIndividuais' também ou 'fichasProcedimento'?
    // Correção: fichaprocedimentomaster.xsd -> 'atendimentosIndividuais' (namespace ns4)
    tpCdsOrigem: number;
    uuidFicha: string;

    // Totais do Master (Agrupados)
    numTotalAfericaoPa?: number;
    numTotalGlicemiaCapilar?: number;
    numTotalAfericaoTemperatura?: number;
    numTotalMedicaoAltura?: number;
    numTotalMedicaoPeso?: number;
    numTotalObesidade?: number;
    numTotalPreObesidade?: number;
    numTotalSobrepeso?: number;
    numTotalEutrofia?: number;
    numTotalBaixoPeso?: number;
    numTotalDeficitAltura?: number;
    numTotalColetaMaterialParaExameLaboratorial?: number;
    numTotalCurativoSimples?: number;
    numTotalVacinacao?: number;
    numTotalReceitaMedica?: number;
    numTotalAtestadoMedico?: number;
    numTotalAdministracaoMedicamento?: number;
}

// ============================================================================
// 3. FICHA ATENDIMENTO ODONTOLÓGICO
// ============================================================================

export interface LediFichaOdontologicaChild {
    dtNascimento: number;
    cnsCidadao?: string;
    numProntuario?: string;
    gestante: boolean;
    sexo: number;
    localAtendimento: number;
    turno: number;
    tipoAtendimento: number;
    pacienteComNecessidadesEspeciais: boolean;
    dataHoraInicialAtendimento: number;
    dataHoraFinalAtendimento: number;
    procedimentosRealizados?: {
        proc: string; // Codigo SIGTAP
        quantidade: number;
    }[];
    tiposConsultaOdonto?: number[]; // Enums
    vigilanciaSaudeBucal?: number[]; // Enums
    tiposEncamOdonto?: number[];
    tiposFornecimOdonto?: number[];
    medicamentos?: any[];
    encaminhamentos?: any[];
    resultadosExames?: any[];
    medicoes?: any; // Object or flat
    problemasCondicoes?: any[];
    ivcf?: any;
    exame?: any[];
    solicitacoesOci?: any[];
}

export interface LediFichaOdontologicaMaster {
    headerTransport: LediVariasLotacoesHeader;
    atendimentosOdontologicos: LediFichaOdontologicaChild[];
    tpCdsOrigem: number;
    uuidFicha: string;
}

// ============================================================================
// 4. FICHA ATIVIDADE COLETIVA
// ============================================================================

export interface LediParticipanteColetiva {
    cnsParticipante?: string;
    dataNascimento: number;
    sexo: number;
    avaliaçãoAlterada?: boolean;
    peso?: number;
    altura?: number;
    cessouHabitoFumar?: boolean;
    abandonouGrupo?: boolean;
}

export interface LediFichaAtividadeColetivaMaster {
    headerTransport: LediUnicaLotacaoHeader; // Coletiva usually has one header for the whole activity
    ine?: string;
    numParticipantes: number;
    atividadeTipo: number; // 01-Reunião, 02-Grupo, 03-Atividade Educação...
    publicoAlvo: number[]; // Lista de códigos
    pseEducacao?: boolean;
    pseSaude?: boolean;
    temasParaReuniao?: number[];
    temasParaSaude?: number[];
    praticasEmSaude?: number[];
    procedimentos?: string[]; // Added to match frontend data, although Thrift only supports one.
    participantes?: LediParticipanteColetiva[];

    // Profissionais que realizaram a atividade (Além do responsável do header)
    profissionais?: {
        cnsProfissional: string;
        cboProfissional: string;
    }[];

    tpCdsOrigem: number;
    uuidFicha: string;
}

// ============================================================================
// 5. FICHA VISITA DOMICILIAR (TERRITORIAL)
// ============================================================================

export interface LediVisitaDomiciliarChild {
    turno: number;
    numProntuario?: string;
    cnsCidadao?: string;
    dtNascimento: number;
    sexo: number;
    statusVisitaCompartilhadaOutroProfissional: boolean;
    desfecho: number; // 01-Realizada, 02-Recusada, 03-Ausente
    microarea?: string;
    stForaArea: boolean;
    tipoDeImovel: number;
    pesoAcompanhamentoNutricional?: number;
    alturaAcompanhamentoNutricional?: number;
    motivosVisita?: number[];
}

export interface LediFichaVisitaDomiciliarMaster {
    headerTransport: LediVariasLotacoesHeader; // Visit is per professional list usually
    visitasDomiciliares: LediVisitaDomiciliarChild[];
    tpCdsOrigem: number;
    uuidFicha: string;
}

// ============================================================================
// 6. FICHA CONSUMO ALIMENTAR
// ============================================================================

export interface LediPerguntaCriancaMenorSeisMeses {
    pergunta: number; // Enum
    respostaUnicaEscolha: number; // Enum
}

export interface LediPerguntaCriancaSeisVinteTresMeses {
    pergunta: number;
    respostaUnicaEscolha: number;
}

export interface LediPerguntaMaisDoisAnos {
    pergunta: number;
    respostaUnicaEscolha: number;
}

export interface LediConsumoAlimentarChild {
    identificacaoUsuario: {
        cnsCidadao?: string;
        cpfCidadao?: string; // XSD permite cpf? Validar. Geralmente CNS é forte aqui.
        dataNascimento: number;
        sexo: number;
        localAtendimento: number;
    };
    dataAtendimento: number;
    perguntasQuestionarioCriancasMenoresSeisMeses?: LediPerguntaCriancaMenorSeisMeses[];
    perguntasQuestionarioCriancasDeSeisVinteTresMeses?: LediPerguntaCriancaSeisVinteTresMeses[];
    perguntasQuestionarioCriancasComMaisDoisAnos?: LediPerguntaMaisDoisAnos[];
}

export interface LediFichaConsumoAlimentarMaster {
    headerTransport: LediUnicaLotacaoHeader;
    marcadoresConsumoAlimentar: LediConsumoAlimentarChild[];
    tpCdsOrigem: number;
    uuidFicha: string;
}

// ============================================================================
// 7. FICHA VACINAÇÃO
// ============================================================================

export interface LediVacinaRow {
    imunobiologico: number; // Código
    estrategiaVacinacao: number; // 1-Rotina, 2-Campanha...
    dose: number; // 1-D1 ... 9-Unica
    lote: string;
    fabricante: string; // CNPJ ou Nome
    especialidadeProfissionalPrescritor?: string;
    motivoIndicacao?: string;
    viaAdministracao?: number;
    localAplicacao?: number;
}

export interface LediFichaVacinacaoChild {
    turno: number;
    numProntuario?: string;
    cnsCidadao?: string;
    dtNascimento: number;
    sexo: number;
    localAtendimento: number;
    viajante: boolean;
    vacinas: LediVacinaRow[];
    dataHoraInicialAtendimento: number;
    dataHoraFinalAtendimento: number;
    observacao?: string;
}

export interface LediFichaVacinacaoMaster {
    headerTransport: LediVariasLotacoesHeader;
    vacinacoes: LediFichaVacinacaoChild[];
    tpCdsOrigem: number;
    uuidFicha: string;
}

// ============================================================================
// 8. FICHA ATENDIMENTO DOMICILIAR (CDS 08)
// ============================================================================

export interface LediFichaAtendimentoDomiciliarChild {
    turno: number;
    cnsCidadao?: string;
    cpfCidadao?: string;
    dataNascimento: number;
    sexo: number;
    localDeAtendimento: number;
    atencaoDomiciliarModalidade: number;
    tipoAtendimento: number;
    condicoesAvaliadas?: number[];
    condutaDesfecho: number;
    procedimentos?: string[]; // List<String>
    problemasCondicoes?: {
        uuidProblema?: string;
        ciap?: string;
        cid10?: string;
        situacao?: string;
        isAvaliado?: boolean;
    }[];
}

export interface LediFichaAtendimentoDomiciliarMaster {
    headerTransport: LediVariasLotacoesHeader;
    atendimentosDomiciliares: LediFichaAtendimentoDomiciliarChild[];
    tpCdsOrigem: number;
    uuidFicha: string;
}

// ============================================================================
// CONFIGURAÇÃO E DTOs INTERNOS
// ============================================================================

export interface LediConfig {
    pecUrl: string;
    pecUser: string;
    pecPassword?: string;
    contraChave?: string;
    cnpjRemetente?: string;
    integrationStatus: 'ACTIVE' | 'NOT_CONFIGURED' | 'ERROR';
}

// Union Type para qualquer ficha master suportada
export type LediFichaMaster =
    | LediFichaIndividualMaster
    | LediFichaProcedimentosMaster
    | LediFichaOdontologicaMaster
    | LediFichaAtividadeColetivaMaster
    | LediFichaVisitaDomiciliarMaster
    | LediFichaConsumoAlimentarMaster
    | LediFichaVacinacaoMaster
    | LediFichaAtendimentoDomiciliarMaster;

// Enum para mapear Tipos de Dado Serializado (Códigos oficiais)
export enum TipoDadoSerializado {
    FICHA_ATENDIMENTO_INDIVIDUAL = 4,
    FICHA_ATENDIMENTO_ODONTOLOGICO = 5,
    FICHA_ATIVIDADE_COLETIVA = 6,
    FICHA_PROCEDIMENTOS = 7,
    FICHA_VISITA_DOMICILIAR = 8,
    MARCADORES_CONSUMO_ALIMENTAR = 10,
    FICHA_ATENDIMENTO_DOMICILIAR = 11,
    FICHA_AVALIACAO_ELEGIBILIDADE = 12,
    FICHA_VACINACAO = 13,
}

export interface PecLoginResponse {
    jsessionid: string;
}

export interface PecSendResponse {
    success: boolean;
    statusCode: number;
    message?: string;
    data?: any;
}
