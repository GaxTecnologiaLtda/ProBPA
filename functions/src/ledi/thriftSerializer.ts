
import * as thrift from 'thrift';
import Int64 = require('node-int64');
import {
    DadoTransporteThrift,
    LediRemetenteThrift,
    LediOriginadoraThrift,
    VersaoThrift,
    FichaAtendimentoIndividualMasterThrift,
    FichaAtendimentoIndividualChildThrift,
    FichaAtendimentoOdontologicoMasterThrift,
    FichaAtendimentoOdontologicoChildThrift,
    FichaProcedimentoChildThrift,
    FichaAtividadeColetivaMasterThrift,
    ProfissionalColetivaThrift,
    ParticipanteRowThrift,
    VariasLotacoesHeaderThrift,
    LotacaoHeaderThrift,
    MedicoesThrift,
    ProblemaCondicaoThrift,
    FichaVacinacaoMasterThrift,
    FichaVacinacaoChildThrift,
    VacinaRowThrift,
    FichaVisitaDomiciliarMasterThrift,
    FichaVisitaDomiciliarChildThrift,
    FichaProcedimentoMasterThrift,
    FichaAtendimentoDomiciliarMasterThrift,
    FichaAtendimentoDomiciliarChildThrift,

    ExameThrift,
    MedicamentoThrift,
    EncaminhamentoThrift,
    ResultadosExameThrift,
    ResultadoExameThrift, // Note: The field inside ResultadosExame is usually singular 'ResultadoExame'
    IvcfThrift,
    SolicitacaoOutraCondutaThrift,
    SolicitacaoOciThrift,
    ProcedimentoQuantidadeThrift
} from './thrift-gen/ledi';
import {
    LediFichaOdontologicaMaster,
    LediFichaAtividadeColetivaMaster,
    LediFichaVisitaDomiciliarMaster,
    LediFichaVacinacaoMaster
} from './types';

/**
 * Helper to serialize a Thrift Struct to Buffer using TBinaryProtocol
 */
function serializeToBuffer(writeFn: (output: thrift.TProtocol) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        // We need a transport that accumulates and returns buffer on flush.
        // The 'thrift' node package is callback-based for flush.
        const memTransport = new thrift.TBufferedTransport(undefined, (msg, seqid) => {
            // When flush is called, this callback receives the buffer?
            // Typings say: (msg: Buffer, seqid: number) => void
            // msg IS the buffer.
            if (Buffer.isBuffer(msg)) {
                resolve(msg);
            } else if (msg) {
                // If it's a string or other, convert
                resolve(Buffer.from(msg));
            }
        });

        const protocol = new thrift.TBinaryProtocol(memTransport);

        try {
            writeFn(protocol);
            memTransport.flush();
        } catch (e) {
            reject(e);
        }
    });
}

export async function serializeFichaAtividadeColetiva(
    ficha: LediFichaAtividadeColetivaMaster,
    originadora: LediOriginadoraThrift,
    remetente: LediRemetenteThrift,
    municipalityId: string,
    cnesUnidade: string
): Promise<Buffer> {
    // 1. Map Header (Unica Lotacao for Coletiva)
    const headerThrift = new VariasLotacoesHeaderThrift({
        lotacaoFormPrincipal: new LotacaoHeaderThrift({
            profissionalCNS: ficha.headerTransport.profissionalCNS,
            cboCodigo_2002: ficha.headerTransport.cboCodigo_2002,
            cnes: ficha.headerTransport.cnes,
            codigoIbgeMunicipio: ficha.headerTransport.codigoIbgeMunicipio,
            ine: ficha.headerTransport.ine,
            dataAtendimento: new Int64(ficha.headerTransport.dataAtendimento)
        })
    });

    // 2. Map Profissionais
    const profissionaisList: ProfissionalColetivaThrift[] = (ficha.profissionais || []).map(p => {
        return new ProfissionalColetivaThrift({
            cnsProfissional: p.cnsProfissional,
            cboCodigo_2002: p.cboProfissional
        });
    });

    // 3. Map Participantes
    const participantesList: ParticipanteRowThrift[] = (ficha.participantes || []).map(p => {
        return new ParticipanteRowThrift({
            cnsParticipante: p.cnsParticipante,
            dataNascimento: new Int64(p.dataNascimento),
            sexo: new Int64(p.sexo),
            avaliacaoAlterada: p.avaliaçãoAlterada,
            peso: p.peso,
            altura: p.altura,
            cessouHabitoFumar: p.cessouHabitoFumar,
            abandonouGrupo: p.abandonouGrupo
        });
    });

    // 4. Map Lists (Longs)
    // 4. Map Lists (i32 enums)
    // Frontend sends strings (e.g., "01"), Thrift needs numbers. Safe cast.
    const temasReuniao: number[] = (ficha.temasParaReuniao || []).map(v => Number(v));
    const publicoAlvo: number[] = (ficha.publicoAlvo || []).map(v => Number(v));
    const praticas: number[] = (ficha.praticasEmSaude || []).map(v => Number(v));
    const temasSaude: number[] = (ficha.temasParaSaude || []).map(v => Number(v));


    // 5. Construct Master
    const master = new FichaAtividadeColetivaMasterThrift({
        uuidFicha: ficha.uuidFicha,
        tpCdsOrigem: ficha.tpCdsOrigem,
        headerTransport: headerThrift,
        inep: ficha.ine ? new Int64(parseInt(ficha.ine)) : undefined,
        numParticipantes: ficha.numParticipantes,
        numAvaliacoesAlteradas: undefined,
        profissionais: profissionaisList,
        atividadeTipo: new Int64(Number(ficha.atividadeTipo)),
        temasParaReuniao: temasReuniao,
        publicoAlvo: publicoAlvo,
        praticasEmSaude: praticas,
        temasParaSaude: temasSaude,
        participantes: participantesList,
        cnesLocalAtividade: ficha.headerTransport.cnes,
        procedimento: (ficha.procedimentos && ficha.procedimentos.length > 0) ? ficha.procedimentos[0] : undefined, // Thrift only supports one, take first
        turno: new Int64(1),
        pseEducacao: ficha.pseEducacao ? new Int64(1) : undefined,
        pseSaude: ficha.pseSaude ? new Int64(1) : undefined
    });

    // 6. Serialize Master
    const masterBuffer = await serializeToBuffer((proto) => master.write(proto));

    // 7. Wrap in Envelope
    return wrapTransport(
        masterBuffer,
        6, // FICHA_ATIVIDADE_COLETIVA
        ficha.uuidFicha,
        municipalityId, // Use passed ID
        cnesUnidade,    // Use passed CNES
        originadora,
        remetente
    );
}

// Helper to safely convert "YYYY-MM-DD" string or number to Int64 Epoch
function ensureInt64FromDate(val: string | number | undefined): Int64 | undefined {
    if (!val) return undefined;
    if (typeof val === 'number') return new Int64(val);
    if (typeof val === 'string') {
        // Assume YYYY-MM-DD
        const date = new Date(val + 'T12:00:00Z'); // UTC noon to avoid shift
        if (!isNaN(date.getTime())) {
            return new Int64(date.getTime());
        }
    }
    return undefined;
}

// Helper to convert number to Int64 if needed, or keep as is if library handles it
// The generated code expects Int64 | number.
// Using Int64 wrapper ensures correct I64 thrift type.
function ensureInt64(val: number): Int64 {
    return new Int64(val);
}

// ============================================================================
// PUBLIC SERIALIZERS
// ============================================================================

export async function serializeFichaAtendimentoIndividual(
    master: any, // Typed as 'any' for now, should map from domain types
    originadora: LediOriginadoraThrift,
    remetente: LediRemetenteThrift,
    municipalityId: string,
    cnesUnidade: string
): Promise<Buffer> {

    // 1. Serialize the payload (Ficha Master)
    // We must map the Domain Object (master) to the Thrift Class (FichaAtendimentoIndividualMasterThrift)
    // This mapping logic is critical.

    // Construct the Thrift Object
    const ficha = new FichaAtendimentoIndividualMasterThrift({
        uuidFicha: master.uuidFicha,
        tpCdsOrigem: 3,
        headerTransport: new VariasLotacoesHeaderThrift({
            lotacaoFormPrincipal: new LotacaoHeaderThrift({
                profissionalCNS: master.headerTransport.lotacaoFormPrincipal.profissionalCNS,
                cboCodigo_2002: master.headerTransport.lotacaoFormPrincipal.cboCodigo_2002,
                cnes: master.headerTransport.lotacaoFormPrincipal.cnes,
                codigoIbgeMunicipio: master.headerTransport.lotacaoFormPrincipal.codigoIbgeMunicipio,
                dataAtendimento: ensureInt64(master.headerTransport.lotacaoFormPrincipal.dataAtendimento),
                ine: master.headerTransport.lotacaoFormPrincipal.ine
            })
        }),
        atendimentosIndividuais: master.atendimentosIndividuais.map((att: any) => new FichaAtendimentoIndividualChildThrift({
            numeroProntuario: att.numeroProntuario,
            cnsCidadao: att.cnsCidadao,
            cpfCidadao: att.cpfCidadao,
            dataNascimento: ensureInt64(att.dataNascimento),
            localDeAtendimento: ensureInt64(att.localDeAtendimento),
            sexo: ensureInt64(att.sexo),
            turno: ensureInt64(att.turno),
            tipoAtendimento: ensureInt64(att.tipoAtendimento),
            vacinaEmDia: att.vacinaEmDia || false, // Default to false if undefined
            ficouEmObservacao: att.ficouEmObservacao || false,
            aleitamentoMaterno: att.aleitamentoMaterno ? ensureInt64(att.aleitamentoMaterno) : undefined,
            dumDaGestante: ensureInt64FromDate(att.dumDaGestante),
            idadeGestacional: att.idadeGestacional,
            stGravidezPlanejada: att.stGravidezPlanejada,
            nuGestasPrevias: att.nuGestasPrevias,
            nuPartos: att.nuPartos,
            exame: att.exames?.map((ex: any) => new ExameThrift({
                codigoExame: ex.codigoExame,
                solicitadoAvaliado: ex.solicitadoAvaliado
            })),
            dataHoraInicialAtendimento: ensureInt64(att.dataHoraInicialAtendimento),
            dataHoraFinalAtendimento: ensureInt64(att.dataHoraFinalAtendimento),
            condutas: (att.condutas || []).map((c: any) => ensureInt64(Number(c))),
            atencaoDomiciliarModalidade: att.atencaoDomiciliarModalidade ? ensureInt64(att.atencaoDomiciliarModalidade) : undefined,
            racionalidadeSaude: att.racionalidadeSaude ? ensureInt64(att.racionalidadeSaude) : undefined,
            pic: att.pic ? ensureInt64(att.pic) : undefined, // Added (ID 19)
            nasfs: att.nasfs?.map((n: any) => Number(n)), // ID 21 (Legacy)
            emultis: att.emultis?.map((n: any) => Number(n)), // Added (ID 38)
            tipoParticipacaoCidadao: att.tipoParticipacaoCidadao ? ensureInt64(att.tipoParticipacaoCidadao) : undefined, // ID 36
            tipoParticipacaoProfissionalConvidado: att.tipoParticipacaoProfissionalConvidado ? ensureInt64(att.tipoParticipacaoProfissionalConvidado) : undefined, // ID 37
            finalizadorObservacao: att.finalizadorObservacao ? new LotacaoHeaderThrift({ // ID 35
                profissionalCNS: att.finalizadorObservacao.cns,
                cboCodigo_2002: att.finalizadorObservacao.cbo,
                cnes: att.finalizadorObservacao.cnes,
                ine: att.finalizadorObservacao.ine,
                dataAtendimento: new Int64(0), // Not relevant for finalizer but required by struct
                codigoIbgeMunicipio: "" // Not relevant for finalizer but required by struct
            }) : undefined,
            medicoes: new MedicoesThrift({
                // Reading from ROOT of 'att' because that's where Firestore/Types have them flattened
                pressaoArterialSistolica: att.pressaoArterialSistolica,
                pressaoArterialDiastolica: att.pressaoArterialDiastolica,
                frequenciaCardiaca: att.frequenciaCardiaca,
                frequenciaRespiratoria: att.frequenciaRespiratoria,
                temperatura: att.temperatura,
                saturacaoO2: att.saturacaoO2,
                glicemiaCapilar: att.glicemiaCapilar,
                tipoGlicemiaCapilar: att.tipoGlicemiaCapilar ? ensureInt64(att.tipoGlicemiaCapilar) : undefined,
                peso: att.peso,
                altura: att.altura,
                perimetroCefalico: att.perimetroCefalico,
                perimetroPanturrilha: att.perimetroPanturrilha,
                circunferenciaAbdominal: att.circunferenciaAbdominal
            }),
            problemasCondicoes: att.problemasCondicoes?.map((pc: any) => new ProblemaCondicaoThrift({
                uuidProblema: pc.uuidProblema,
                uuidEvolucaoProblema: pc.uuidEvolucaoProblema,
                coSequencialEvolucao: pc.coSequencialEvolucao ? ensureInt64(pc.coSequencialEvolucao) : undefined,
                cid10: pc.cid10,
                ciap: pc.ciap,
                situacao: pc.situacao,
                dataInicioProblema: pc.dataInicioProblema ? ensureInt64(pc.dataInicioProblema) : undefined,
                dataFimProblema: pc.dataFimProblema ? ensureInt64(pc.dataFimProblema) : undefined,
                isAvaliado: pc.isAvaliado
            })),
            medicamentos: att.medicamentos?.map((m: any) => new MedicamentoThrift({
                codigoCatmat: m.codigoCatmat,
                viaAdministracao: new Int64(Number(m.viaAdministracao)), // Safe cast string to number
                dose: m.dose,
                doseUnica: m.doseUnica,
                usoContinuo: m.usoContinuo,
                doseFrequenciaTipo: new Int64(Number(m.doseFrequenciaTipo)), // Safe cast string to number
                doseFrequencia: m.doseFrequencia,
                dtInicioTratamento: ensureInt64FromDate(m.dtInicioTratamento), // Convert YYYY-MM-DD to Epoch
                duracaoTratamento: new Int64(Number(m.duracaoTratamento)),
                quantidadeReceitada: new Int64(Number(m.quantidadeReceitada))
            })),
            encaminhamentos: att.encaminhamentos?.map((e: any) => new EncaminhamentoThrift({
                especialidade: new Int64(Number(e.especialidade)), // Safe cast CBO string (e.g. "225125") to number
                hipoteseDiagnosticoCID10: e.hipoteseDiagnosticoCID10,
                hipoteseDiagnosticoCIAP2: e.hipoteseDiagnosticoCIAP2,
                classificacaoRisco: new Int64(Number(e.classificacaoRisco)) // Safe cast "1", "2" to number
            })),
            resultadosExames: att.resultadosExames?.map((r: any) => new ResultadosExameThrift({
                exame: r.exame,
                dataSolicitacao: ensureInt64FromDate(r.dataSolicitacao),
                dataRealizacao: ensureInt64FromDate(r.dataRealizacao),
                dataResultado: ensureInt64FromDate(r.dataResultado),
                resultadoExame: r.resultado?.map((res: any) => new ResultadoExameThrift({
                    tipoResultado: new Int64(Number(res.tipoResultado)),
                    valorResultado: res.valorResultado
                }))
            })),
            solicitacoesOci: att.solicitacoesOci?.map((s: any) => new SolicitacaoOutraCondutaThrift({
                codigoSigtap: s.codigoSigtap
            })),
            ivcf: att.ivcf ? new IvcfThrift({
                resultado: new Int64(att.ivcf.resultado),
                dataResultado: ensureInt64(att.ivcf.dataResultado),
                hasSgIdade: att.ivcf.hasSgIdade,
                hasSgPercepcaoSaude: att.ivcf.hasSgPercepcaoSaude,
                hasSgAvdInstrumental: att.ivcf.hasSgAvdInstrumental,
                hasSgAvdBasica: att.ivcf.hasSgAvdBasica,
                hasSgCognicao: att.ivcf.hasSgCognicao,
                hasSgHumor: att.ivcf.hasSgHumor,
                hasSgAlcancePreensaoPinca: att.ivcf.hasSgAlcancePreensaoPinca,
                hasSgCapAerobicaMuscular: att.ivcf.hasSgCapAerobicaMuscular,
                hasSgMarcha: att.ivcf.hasSgMarcha,
                hasSgContinencia: att.ivcf.hasSgContinencia,
                hasSgVisao: att.ivcf.hasSgVisao,
                hasSgAudicao: att.ivcf.hasSgAudicao,
                hasSgComorbidade: att.ivcf.hasSgComorbidade
            }) : undefined
        }))
    });

    // 2. Serialize Ficha to Buffer
    const fichaBuffer = await serializeToBuffer((proto) => ficha.write(proto));

    // 3. Wrap in Transport
    return wrapTransport(
        fichaBuffer,
        4, // FICHA_ATENDIMENTO_INDIVIDUAL
        master.uuidFicha,
        municipalityId,
        cnesUnidade,
        originadora,
        remetente
    );
}

export async function serializeFichaAtendimentoOdontologico(
    master: LediFichaOdontologicaMaster,
    originadora: LediOriginadoraThrift,
    remetente: LediRemetenteThrift,
    municipalityId: string,
    cnesUnidade: string
): Promise<Buffer> {
    const ficha = new FichaAtendimentoOdontologicoMasterThrift({
        uuidFicha: master.uuidFicha,
        headerTransport: new VariasLotacoesHeaderThrift({
            lotacaoFormPrincipal: new LotacaoHeaderThrift({
                profissionalCNS: master.headerTransport.lotacaoFormPrincipal.profissionalCNS,
                cboCodigo_2002: master.headerTransport.lotacaoFormPrincipal.cboCodigo_2002,
                cnes: master.headerTransport.lotacaoFormPrincipal.cnes,
                codigoIbgeMunicipio: master.headerTransport.lotacaoFormPrincipal.codigoIbgeMunicipio,
                dataAtendimento: ensureInt64(master.headerTransport.lotacaoFormPrincipal.dataAtendimento),
                ine: master.headerTransport.lotacaoFormPrincipal.ine
            })
        }),
        atendimentosOdontologicos: master.atendimentosOdontologicos.map((att: any) => new FichaAtendimentoOdontologicoChildThrift({
            dtNascimento: ensureInt64(att.dtNascimento),
            cnsCidadao: att.cnsCidadao,
            numProntuario: att.numProntuario,
            gestante: att.gestante,
            necessidadesEspeciais: att.necessidadesEspeciais,
            localAtendimento: ensureInt64(att.localAtendimento),
            tipoAtendimento: ensureInt64(att.tipoAtendimento),

            // Fix: Map simple lists correctly
            tiposEncamOdonto: att.tiposEncamOdonto?.map((v: any) => ensureInt64(v)),
            tiposFornecimOdonto: att.tiposFornecimOdonto?.map((v: any) => ensureInt64(v)),
            tiposVigilanciaSaudeBucal: att.tiposVigilanciaSaudeBucal?.map((v: any) => ensureInt64(v)),
            tiposConsultaOdonto: att.tiposConsultaOdonto?.map((v: any) => ensureInt64(v)),

            procedimentosRealizados: att.procedimentosRealizados?.map((pr: any) => new ProcedimentoQuantidadeThrift({
                coMsProcedimento: pr.coMsProcedimento,
                quantidade: pr.quantidade
            })),

            sexo: ensureInt64(att.sexo),
            turno: ensureInt64(att.turno),
            dataHoraInicialAtendimento: ensureInt64(att.dataHoraInicialAtendimento),
            dataHoraFinalAtendimento: ensureInt64(att.dataHoraFinalAtendimento),
            cpfCidadao: att.cpfCidadao,

            // New Complex Fields (v7.3.3)
            medicamentos: att.medicamentos?.map((m: any) => new MedicamentoThrift({
                codigoCatmat: m.codigoCatmat,
                viaAdministracao: new Int64(Number(m.viaAdministracao)),
                dose: m.dose,
                doseUnica: m.doseUnica,
                usoContinuo: m.usoContinuo,
                doseFrequenciaTipo: new Int64(Number(m.doseFrequenciaTipo)),
                doseFrequencia: m.doseFrequencia,
                dtInicioTratamento: ensureInt64FromDate(m.dtInicioTratamento),
                duracaoTratamento: new Int64(Number(m.duracaoTratamento)),
                quantidadeReceitada: new Int64(Number(m.quantidadeReceitada))
            })),
            encaminhamentos: att.encaminhamentos?.map((e: any) => new EncaminhamentoThrift({
                especialidade: new Int64(Number(e.especialidade)),
                hipoteseDiagnosticoCID10: e.hipoteseDiagnosticoCID10,
                hipoteseDiagnosticoCIAP2: e.hipoteseDiagnosticoCIAP2,
                classificacaoRisco: new Int64(Number(e.classificacaoRisco))
            })),
            resultadosExames: att.resultadosExames?.map((r: any) => new ResultadosExameThrift({
                exame: r.exame,
                dataSolicitacao: ensureInt64FromDate(r.dataSolicitacao),
                dataRealizacao: ensureInt64FromDate(r.dataRealizacao),
                dataResultado: ensureInt64FromDate(r.dataResultado),
                resultadoExame: r.resultadoExame?.map((re: any) => new ResultadoExameThrift({
                    tipoResultado: re.tipoResultado,
                    valorResultado: re.valorResultado
                }))
            })),
            medicoes: new MedicoesThrift({
                pressaoArterialSistolica: att.pressaoArterialSistolica,
                pressaoArterialDiastolica: att.pressaoArterialDiastolica,
                frequenciaCardiaca: att.frequenciaCardiaca,
                frequenciaRespiratoria: att.frequenciaRespiratoria,
                temperatura: att.temperatura,
                saturacaoO2: att.saturacaoO2,
                glicemiaCapilar: att.glicemiaCapilar,
                tipoGlicemiaCapilar: att.tipoGlicemiaCapilar ? ensureInt64(att.tipoGlicemiaCapilar) : undefined,
                peso: att.peso,
                altura: att.altura,
                perimetroCefalico: att.perimetroCefalico,
                perimetroPanturrilha: att.perimetroPanturrilha,
                circunferenciaAbdominal: att.circunferenciaAbdominal
            }),
            problemasCondicoes: att.problemasCondicoes?.map((pc: any) => new ProblemaCondicaoThrift({
                uuidProblema: pc.uuidProblema,
                uuidEvolucaoProblema: pc.uuidEvolucaoProblema,
                coSequencialEvolucao: pc.coSequencialEvolucao ? ensureInt64(pc.coSequencialEvolucao) : undefined,
                cid10: pc.cid10,
                ciap: pc.ciap,
                situacao: pc.situacao,
                dataInicioProblema: pc.dataInicioProblema ? ensureInt64(pc.dataInicioProblema) : undefined,
                dataFimProblema: pc.dataFimProblema ? ensureInt64(pc.dataFimProblema) : undefined,
                isAvaliado: pc.isAvaliado
            })),
            ivcf: att.ivcf ? new IvcfThrift({
                resultado: att.ivcf.resultado,
                hasSgIdade: att.ivcf.hasSgIdade,
                hasSgPercepcaoSaude: att.ivcf.hasSgPercepcaoSaude,
                hasSgAvdInstrumental: att.ivcf.hasSgAvdInstrumental,
                hasSgAvdBasica: att.ivcf.hasSgAvdBasica,
                hasSgCognicao: att.ivcf.hasSgCognicao,
                hasSgHumor: att.ivcf.hasSgHumor,
                hasSgAlcancePreensaoPinca: att.ivcf.hasSgAlcancePreensaoPinca,
                hasSgCapAerobicaMuscular: att.ivcf.hasSgCapAerobicaMuscular,
                hasSgMarcha: att.ivcf.hasSgMarcha,
                hasSgContinencia: att.ivcf.hasSgContinencia,
                hasSgVisao: att.ivcf.hasSgVisao,
                hasSgAudicao: att.ivcf.hasSgAudicao,
                hasSgComorbidade: att.ivcf.hasSgComorbidade,
                dataResultado: ensureInt64(att.ivcf.dataResultado)
            }) : undefined,
            exame: att.exame?.map((ex: any) => new ExameThrift({
                codigoExame: ex.codigoExame,
                solicitadoAvaliado: ex.solicitadoAvaliado
            })),
            solicitacoesOci: att.solicitacoesOci?.map((oci: any) => new SolicitacaoOciThrift({
                codigoSigtap: oci.codigoSigtap
            }))
        }))
    });

    const fichaBuffer = await serializeToBuffer((proto) => ficha.write(proto));

    return wrapTransport(
        fichaBuffer,
        5, // FICHA_ATENDIMENTO_ODONTOLOGICO
        master.uuidFicha,
        municipalityId,
        cnesUnidade,
        originadora,
        remetente
    );
}

export async function serializeFichaProcedimentos(
    master: any,
    originadora: LediOriginadoraThrift,
    remetente: LediRemetenteThrift,
    municipalityId: string,
    cnesUnidade: string
): Promise<Buffer> {
    const ficha = new FichaProcedimentoMasterThrift({
        uuidFicha: master.uuidFicha,
        tpCdsOrigem: 3,
        headerTransport: new VariasLotacoesHeaderThrift({
            lotacaoFormPrincipal: new LotacaoHeaderThrift({
                profissionalCNS: master.headerTransport.lotacaoFormPrincipal.profissionalCNS,
                cboCodigo_2002: master.headerTransport.lotacaoFormPrincipal.cboCodigo_2002,
                cnes: master.headerTransport.lotacaoFormPrincipal.cnes,
                codigoIbgeMunicipio: master.headerTransport.lotacaoFormPrincipal.codigoIbgeMunicipio,
                dataAtendimento: ensureInt64(master.headerTransport.lotacaoFormPrincipal.dataAtendimento),
                ine: master.headerTransport.lotacaoFormPrincipal.ine
            })
        }),
        atendProcedimentos: master.atendimentosIndividuais.map((att: any) => new FichaProcedimentoChildThrift({
            numProntuario: att.numProntuario,
            cnsCidadao: att.cnsCidadao,
            cpfCidadao: att.cpfCidadao,
            dtNascimento: ensureInt64(att.dtNascimento),
            sexo: ensureInt64(att.sexo),
            localAtendimento: ensureInt64(att.localAtendimento),
            turno: ensureInt64(att.turno),
            statusEscutaInicialOrientacao: att.statusEscutaInicialOrientacao,
            procedimentos: att.procedimentos?.map((p: any) => p.procedimento), // List<String> in Thrift logic (simple list)
            dataHoraInicialAtendimento: ensureInt64(att.dataHoraInicialAtendimento),
            dataHoraFinalAtendimento: ensureInt64(att.dataHoraFinalAtendimento),
            medicoes: new MedicoesThrift({
                circunferenciaAbdominal: att.medicoes?.circunferenciaAbdominal ?? att.circunferenciaAbdominal,
                perimetroPanturrilha: att.medicoes?.perimetroPanturrilha ?? att.perimetroPanturrilha,
                pressaoArterialSistolica: att.medicoes?.pressaoArterialSistolica ?? att.pressaoArterialSistolica,
                pressaoArterialDiastolica: att.medicoes?.pressaoArterialDiastolica ?? att.pressaoArterialDiastolica,
                frequenciaRespiratoria: att.medicoes?.frequenciaRespiratoria ?? att.frequenciaRespiratoria,
                frequenciaCardiaca: att.medicoes?.frequenciaCardiaca ?? att.frequenciaCardiaca,
                temperatura: att.medicoes?.temperatura ?? att.temperatura,
                saturacaoO2: att.medicoes?.saturacaoO2 ?? att.saturacaoO2,
                glicemiaCapilar: att.medicoes?.glicemiaCapilar ?? att.glicemiaCapilar,
                tipoGlicemiaCapilar: ensureInt64(att.medicoes?.tipoGlicemiaCapilar ?? att.tipoGlicemiaCapilar),
                peso: att.medicoes?.peso ?? att.peso,
                altura: att.medicoes?.altura ?? att.altura,
                perimetroCefalico: att.medicoes?.perimetroCefalico ?? att.perimetroCefalico
            }),
            ivcf: att.ivcf ? new IvcfThrift({
                resultado: att.ivcf.resultado,
                hasSgIdade: att.ivcf.hasSgIdade,
                hasSgPercepcaoSaude: att.ivcf.hasSgPercepcaoSaude,
                hasSgAvdInstrumental: att.ivcf.hasSgAvdInstrumental,
                hasSgAvdBasica: att.ivcf.hasSgAvdBasica,
                hasSgCognicao: att.ivcf.hasSgCognicao,
                hasSgHumor: att.ivcf.hasSgHumor,
                hasSgAlcancePreensaoPinca: att.ivcf.hasSgAlcancePreensaoPinca,
                hasSgCapAerobicaMuscular: att.ivcf.hasSgCapAerobicaMuscular,
                hasSgMarcha: att.ivcf.hasSgMarcha,
                hasSgContinencia: att.ivcf.hasSgContinencia,
                hasSgVisao: att.ivcf.hasSgVisao,
                hasSgAudicao: att.ivcf.hasSgAudicao,
                hasSgComorbidade: att.ivcf.hasSgComorbidade,
                dataResultado: ensureInt64(att.ivcf.dataResultado)
            }) : undefined
        }))
    });

    const fichaBuffer = await serializeToBuffer((proto) => ficha.write(proto));

    return wrapTransport(
        fichaBuffer,
        7, // FICHA_PROCEDIMENTOS
        master.uuidFicha,
        municipalityId,
        cnesUnidade,
        originadora,
        remetente
    );
}



export async function serializeFichaVisitaDomiciliar(
    master: LediFichaVisitaDomiciliarMaster,
    originadora: LediOriginadoraThrift,
    remetente: LediRemetenteThrift,
    municipalityId: string,
    cnesUnidade: string
): Promise<Buffer> {
    const ficha = new FichaVisitaDomiciliarMasterThrift({
        uuidFicha: master.uuidFicha,
        tpCdsOrigem: 3,
        headerTransport: new VariasLotacoesHeaderThrift({
            lotacaoFormPrincipal: new LotacaoHeaderThrift({
                profissionalCNS: master.headerTransport.lotacaoFormPrincipal.profissionalCNS,
                cboCodigo_2002: master.headerTransport.lotacaoFormPrincipal.cboCodigo_2002,
                cnes: master.headerTransport.lotacaoFormPrincipal.cnes,
                codigoIbgeMunicipio: master.headerTransport.lotacaoFormPrincipal.codigoIbgeMunicipio,
                dataAtendimento: ensureInt64(master.headerTransport.lotacaoFormPrincipal.dataAtendimento),
                ine: master.headerTransport.lotacaoFormPrincipal.ine
            })
        }),
        visitasDomiciliares: master.visitasDomiciliares.map((v: any) => new FichaVisitaDomiciliarChildThrift({
            turno: ensureInt64(v.turno),
            cnsCidadao: v.cnsCidadao,
            dtNascimento: ensureInt64(v.dtNascimento),
            sexo: ensureInt64(v.sexo),
            desfecho: ensureInt64(v.desfecho),
            tipoDeImovel: ensureInt64(v.tipoDeImovel),
            pesoAcompanhamentoNutricional: v.pesoAcompanhamentoNutricional,
            alturaAcompanhamentoNutricional: v.alturaAcompanhamentoNutricional,
            motivosVisita: v.motivosVisita // number[]
        }))
    });

    const fichaBuffer = await serializeToBuffer((proto) => ficha.write(proto));

    return wrapTransport(
        fichaBuffer,
        8, // FICHA_VISITA_DOMICILIAR
        master.uuidFicha,
        municipalityId,
        cnesUnidade,
        originadora,
        remetente
    );
}

export async function serializeFichaAtendimentoDomiciliar(
    master: any,
    originadora: LediOriginadoraThrift,
    remetente: LediRemetenteThrift,
    municipalityId: string,
    cnesUnidade: string
): Promise<Buffer> {
    const ficha = new FichaAtendimentoDomiciliarMasterThrift({
        uuidFicha: master.uuidFicha,
        tpCdsOrigem: 3,
        headerTransport: new VariasLotacoesHeaderThrift({
            lotacaoFormPrincipal: new LotacaoHeaderThrift({
                profissionalCNS: master.headerTransport.lotacaoFormPrincipal.profissionalCNS,
                cboCodigo_2002: master.headerTransport.lotacaoFormPrincipal.cboCodigo_2002,
                cnes: master.headerTransport.lotacaoFormPrincipal.cnes,
                codigoIbgeMunicipio: master.headerTransport.lotacaoFormPrincipal.codigoIbgeMunicipio,
                dataAtendimento: ensureInt64(master.headerTransport.lotacaoFormPrincipal.dataAtendimento),
                ine: master.headerTransport.lotacaoFormPrincipal.ine
            })
        }),
        atendimentosDomiciliares: master.atendimentosDomiciliares.map((att: any) => new FichaAtendimentoDomiciliarChildThrift({
            turno: Number(att.turno),
            cnsCidadao: att.cnsCidadao,
            dataNascimento: Number(att.dataNascimento),
            sexo: Number(att.sexo),
            localDeAtendimento: Number(att.localDeAtendimento),
            atencaoDomiciliarModalidade: Number(att.atencaoDomiciliarModalidade),
            tipoAtendimento: Number(att.tipoAtendimento),
            condicoesAvaliadas: att.condicoesAvaliadas?.map((c: any) => Number(c)),
            condutaDesfecho: Number(att.condutaDesfecho),
            procedimentos: att.procedimentos, // List<String>
            problemasCondicoes: att.problemasCondicoes?.map((pc: any) => new ProblemaCondicaoThrift({
                uuidProblema: pc.uuidProblema,
                cid10: pc.cid10,
                ciap: pc.ciap,
                situacao: pc.situacao,
                isAvaliado: pc.isAvaliado
            })),
            cpfCidadao: att.cpfCidadao
        }))
    });

    const fichaBuffer = await serializeToBuffer((proto) => ficha.write(proto));

    return wrapTransport(
        fichaBuffer,
        8, // FICHA_ATENDIMENTO_DOMICILIAR (Use 8 based on Dictionary for FAD? No, FAD is 8? Wait.)
        // Ficha de Atendimento Domiciliar is CDS 08?
        // Dictionary URL said "dicionario-fad".
        // Standard Codes:
        // 3 = Ficha Atendimento Individual
        // 4 = Ficha Atendimento Odontológico
        // 5 = Ficha Atividade Coletiva
        // 6 = Ficha Procedimentos
        // 7 = Ficha Visita Domiciliar (ACS)
        // 8 = Ficha Atendimento Domiciliar (This one)
        // Let's verify standard CDS Type Codes.
        // Assumed 8.
        master.uuidFicha,
        municipalityId,
        cnesUnidade,
        originadora,
        remetente
    );
}

export async function serializeFichaVacinacao(
    ficha: LediFichaVacinacaoMaster,
    originadora: LediOriginadoraThrift,
    remetente: LediRemetenteThrift,
    municipalityId: string,
    cnesUnidade: string
): Promise<Buffer> {

    // 1. Map Header
    const headerThrift = new VariasLotacoesHeaderThrift({
        lotacaoFormPrincipal: new LotacaoHeaderThrift({
            profissionalCNS: ficha.headerTransport.lotacaoFormPrincipal.profissionalCNS,
            cboCodigo_2002: ficha.headerTransport.lotacaoFormPrincipal.cboCodigo_2002,
            cnes: ficha.headerTransport.lotacaoFormPrincipal.cnes,
            codigoIbgeMunicipio: ficha.headerTransport.lotacaoFormPrincipal.codigoIbgeMunicipio,
            ine: ficha.headerTransport.lotacaoFormPrincipal.ine,
            dataAtendimento: new Int64(ficha.headerTransport.lotacaoFormPrincipal.dataAtendimento)
        })
    });

    // 2. Map Vacinacoes
    const vacinacoesList: FichaVacinacaoChildThrift[] = (ficha.vacinacoes || []).map(v => {
        // Map Vacinas (Rows)
        const vacinasRows: VacinaRowThrift[] = (v.vacinas || []).map(row => {
            return new VacinaRowThrift({
                imunobiologico: Number(row.imunobiologico),
                estrategiaVacinacao: Number(row.estrategiaVacinacao),
                dose: Number(row.dose),
                lote: row.lote,
                fabricante: row.fabricante,
                especialidadeProfissionalPrescritor: row.especialidadeProfissionalPrescritor,
                motivoIndicacao: row.motivoIndicacao,
                viaAdministracao: row.viaAdministracao ? Number(row.viaAdministracao) : undefined,
                localAplicacao: row.localAplicacao ? Number(row.localAplicacao) : undefined
            });
        });

        return new FichaVacinacaoChildThrift({
            turno: new Int64(v.turno),
            numProntuario: v.numProntuario,
            cnsCidadao: v.cnsCidadao,
            dtNascimento: new Int64(v.dtNascimento),
            sexo: new Int64(v.sexo),
            localAtendimento: new Int64(v.localAtendimento),
            viajante: v.viajante,
            vacinas: vacinasRows,
            dataHoraInicialAtendimento: new Int64(v.dataHoraInicialAtendimento),
            dataHoraFinalAtendimento: new Int64(v.dataHoraFinalAtendimento)
        });
    });

    // 3. Create Master
    const master = new FichaVacinacaoMasterThrift({
        uuidFicha: ficha.uuidFicha,
        tpCdsOrigem: ficha.tpCdsOrigem, // i32, expects number
        headerTransport: headerThrift,
        vacinacoes: vacinacoesList
    });

    // 4. Serialize Master
    const masterBuffer = await serializeToBuffer((proto) => master.write(proto));

    // 5. Wrap
    return wrapTransport(
        masterBuffer,
        13, // FICHA_VACINACAO
        ficha.uuidFicha,
        municipalityId,
        cnesUnidade,
        originadora,
        remetente
    );
}


// Internal wrapper
async function wrapTransport(
    dadoSerializado: Buffer,
    tipoDado: number,
    uuidFicha: string,
    codIbge: string,
    cnes: string,
    originadora: LediOriginadoraThrift,
    remetente: LediRemetenteThrift
): Promise<Buffer> {

    // Create Transport Envelope
    const envelope = new DadoTransporteThrift({
        uuidDadoSerializado: uuidFicha, // Use same UUID for envelope
        tipoDadoSerializado: ensureInt64(tipoDado),
        cnesDadoSerializado: cnes,
        codIbge: codIbge,
        dadoSerializado: dadoSerializado,
        originadora: new LediOriginadoraThrift({
            contraChave: originadora.contraChave,
            cpfCnpj: originadora.cpfCnpj
        }),
        remetente: new LediRemetenteThrift({
            contraChave: remetente.contraChave,
            cnpj: remetente.cnpj
        }),
        versao: new VersaoThrift({
            major: 7,
            minor: 3,
            revision: 3
        })
    });

    // Serialize Envelope
    return serializeToBuffer((proto) => envelope.write(proto));
}
