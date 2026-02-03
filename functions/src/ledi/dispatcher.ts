import {
    serializeFichaAtendimentoIndividual,
    serializeFichaProcedimentos,
    serializeFichaAtendimentoOdontologico,
    serializeFichaVisitaDomiciliar,
    serializeFichaVacinacao,
    serializeFichaAtividadeColetiva,
    serializeFichaAtendimentoDomiciliar
} from "./thriftSerializer";
import {
    LediOriginadora,
    LediRemetente,
    LediFichaIndividualMaster,
    LediFichaProcedimentosMaster,
    LediFichaOdontologicaMaster,
    LediFichaVisitaDomiciliarMaster,
    LediFichaVacinacaoMaster,
    LediFichaAtividadeColetivaMaster,
    LediFichaAtendimentoDomiciliarMaster
} from "./types";
import {
    LediOriginadoraThrift,
    LediRemetenteThrift
} from "./thrift-gen/ledi";
import { v4 as uuidv4 } from 'uuid';

export const processLediRecord = async (
    data: any,
    originadora: LediOriginadora,
    remetente: LediRemetente,
    municipalityId: string,
    cnesUnidade: string
): Promise<{ content: Buffer, uuid: string, type: string }> => {

    // Helper to Convert Types for Thrift Serializer
    const originadoraThrift = new LediOriginadoraThrift({
        contraChave: originadora.contraChave,
        cpfCnpj: originadora.cpfCnpj
    });
    const remetenteThrift = new LediRemetenteThrift({
        contraChave: remetente.contraChave,
        cnpj: remetente.cnpj
    });

    const uuidFicha = uuidv4();
    const cbo = data.cbo || data.professional?.cbo || "";
    // Note: data.shift is 'M'/'T'/'N', we map to 1/2/3
    const shiftMap: Record<string, number> = { 'M': 1, 'T': 2, 'N': 3 };
    const turno = shiftMap[data.shift || 'M'] || 1;
    const attendanceDateEpoch = new Date(data.attendanceDate).getTime();
    const localDeAtendimento = 1; // 1-UBS (Default)

    // Helper: Map Sexo
    const sexo =
        data.patientSex === 'M' ? 0 :
            data.patientSex === 'F' ? 1 :
                9; // Ignorado/Não informado

    // --- DECISION LOGIC ---

    // 0. EXPLICIT ROUTING (Priority)
    // If frontend sends 'originFicha', we use it to determine the exact serializer.
    if (data.originFicha) {
        switch (data.originFicha) {
            case 'ODONTO':
                return await dispatchOdonto(data, originadoraThrift, remetenteThrift, municipalityId, cnesUnidade, uuidFicha, attendanceDateEpoch, turno, localDeAtendimento, sexo, cbo);
            case 'DOMICILIAR':
                // Check if Medical/Nurse -> FAD (CDS 08) vs ACS -> Visita (CDS 07)
                const isMedNurse = cbo.startsWith('225') || cbo.startsWith('2235');
                if (isMedNurse) {
                    return await dispatchAtendimentoDomiciliar(data, originadoraThrift, remetenteThrift, municipalityId, cnesUnidade, uuidFicha, attendanceDateEpoch, turno, localDeAtendimento, sexo, cbo);
                }
                return await dispatchDomiciliar(data, originadoraThrift, remetenteThrift, municipalityId, cnesUnidade, uuidFicha, attendanceDateEpoch, turno, localDeAtendimento, sexo, cbo);
            case 'VACINACAO':
                return await dispatchVacinacao(data, originadoraThrift, remetenteThrift, municipalityId, cnesUnidade, uuidFicha, attendanceDateEpoch, turno, localDeAtendimento, sexo, cbo);
            case 'COLETIVA':
                return await dispatchColetiva(data, originadoraThrift, remetenteThrift, municipalityId, cnesUnidade, uuidFicha, attendanceDateEpoch, turno, localDeAtendimento, sexo, cbo);
            case 'INDIVIDUAL':
                return await dispatchIndividual(data, originadoraThrift, remetenteThrift, municipalityId, cnesUnidade, uuidFicha, attendanceDateEpoch, turno, localDeAtendimento, sexo, cbo);
            case 'PROCEDIMENTOS':
                return await dispatchProcedimentos(data, originadoraThrift, remetenteThrift, municipalityId, cnesUnidade, uuidFicha, attendanceDateEpoch, turno, localDeAtendimento, sexo, cbo);
            // Fallthrough if unknown type
        }
    }

    // --- LEGACY / FALLBACK LOGIC ---

    // 1. ODONTOLOGIA (CBO 2232*)
    if (cbo.startsWith("2232")) {
        return await dispatchOdonto(data, originadoraThrift, remetenteThrift, municipalityId, cnesUnidade, uuidFicha, attendanceDateEpoch, turno, localDeAtendimento, sexo, cbo);
    }

    // 2. VISITA DOMICILIAR (CDS 07 - Exclusive for ACS/ACE)
    // CRITICAL: Doctors (225*) and Nurses (2235*) must NOT generate this sheet.
    // They perform Home Visits via Individual Attendance (CDS 03) with Location=04.
    const isMedicalOrNurse = cbo.startsWith("225") || cbo.startsWith("2235");
    const isHomeVisitProcedure = (data.localAtendimento === 4) || data.procedureName?.toLowerCase().includes("domiciliar");

    if (isHomeVisitProcedure && !isMedicalOrNurse) {
        return await dispatchDomiciliar(data, originadoraThrift, remetenteThrift, municipalityId, cnesUnidade, uuidFicha, attendanceDateEpoch, turno, localDeAtendimento, sexo, cbo);
    }

    // 3. ATIVIDADE COLETIVA
    const isCollective = data.isCollectiveActivity || data.activityType;
    if (isCollective) {
        return await dispatchColetiva(data, originadoraThrift, remetenteThrift, municipalityId, cnesUnidade, uuidFicha, attendanceDateEpoch, turno, localDeAtendimento, sexo, cbo);
    }

    // 4. VACINAÇÃO
    // Logic: If vaccinationData exists implies it's a vaccine record
    if (data.vaccinationData && data.vaccinationData.imunobiologico) {
        return await dispatchVacinacao(data, originadoraThrift, remetenteThrift, municipalityId, cnesUnidade, uuidFicha, attendanceDateEpoch, turno, localDeAtendimento, sexo, cbo);
    }

    // 5. ATENDIMENTO INDIVIDUAL vs PROCEDIMENTOS (Default Logic)
    const isMedical = cbo.startsWith("225");
    const isNurse = cbo.startsWith("2235");

    if (isMedical || isNurse) {
        // -> Ficha de Atendimento Individual
        return await dispatchIndividual(data, originadoraThrift, remetenteThrift, municipalityId, cnesUnidade, uuidFicha, attendanceDateEpoch, turno, localDeAtendimento, sexo, cbo);
    } else {
        // -> Ficha de Procedimentos (Técnicos, Auxiliares, Vacinação via User Rule)
        return await dispatchProcedimentos(data, originadoraThrift, remetenteThrift, municipalityId, cnesUnidade, uuidFicha, attendanceDateEpoch, turno, localDeAtendimento, sexo, cbo);
    }
};

// --- HELPER DISPATCH FUNCTIONS ---

async function dispatchOdonto(data: any, originadora: LediOriginadoraThrift, remetente: LediRemetenteThrift, municipalityId: string, cnesUnidade: string, uuidFicha: string, date: number, turno: number, local: number, sexo: number, cbo: string) {
    const master: LediFichaOdontologicaMaster = {
        uuidFicha: uuidFicha,
        tpCdsOrigem: 3,
        headerTransport: {
            lotacaoFormPrincipal: {
                profissionalCNS: data.professional?.cns || data.professionalId,
                cboCodigo_2002: cbo,
                cnes: cnesUnidade,
                codigoIbgeMunicipio: municipalityId,
                dataAtendimento: date
            }
        },
        atendimentosOdontologicos: [{
            dtNascimento: new Date(data.patientDob).getTime(),
            cnsCidadao: data.patientCns, // Odonto strictly needs CNS
            sexo: sexo,
            localAtendimento: local,
            turno: turno,
            tipoAtendimento: data.consultationType ? parseInt(data.consultationType) : 1, // Dynamic Type
            vigilanciaSaudeBucal: data.oralHealthVigilance?.map((v: string) => parseInt(v)),
            gestante: data.isPregnant || false,
            pacienteComNecessidadesEspeciais: false,
            dataHoraInicialAtendimento: date,
            dataHoraFinalAtendimento: date + (20 * 60000),
            procedimentosRealizados: [
                {
                    proc: data.procedureCode,
                    quantidade: Math.max(1, data.quantity || 1)
                }
            ],
            // Map Odonto Conduct (frontend 'odontoConduct') to Thrift 'tiposEncamOdonto'
            tiposEncamOdonto: data.odontoConduct?.map((v: string) => parseInt(v)),

            // Pass through new Complex Fields (v7.3.3)
            medicamentos: data.medicamentos,
            encaminhamentos: data.encaminhamentos,
            resultadosExames: data.resultadosExames,
            medicoes: {
                pressaoArterialSistolica: data.pressaoArterialSistolica,
                pressaoArterialDiastolica: data.pressaoArterialDiastolica,
                frequenciaCardiaca: data.frequenciaCardiaca,
                frequenciaRespiratoria: data.frequenciaRespiratoria,
                temperatura: data.temperatura,
                saturacaoO2: data.saturacaoO2,
                glicemiaCapilar: data.glicemiaCapilar,
                tipoGlicemiaCapilar: data.tipoGlicemiaCapilar,
                peso: data.peso,
                altura: data.altura,
                perimetroCefalico: data.perimetroCefalico,
                perimetroPanturrilha: data.perimetroPanturrilha,
                circunferenciaAbdominal: data.circunferenciaAbdominal
            },
            problemasCondicoes: data.soaps?.evaluation?.problemConditions, // Reuse FAI logic if present
            ivcf: data.ivcf,
            solicitacoesOci: data.solicitacoesOci
        }]
    };
    return {
        content: await serializeFichaAtendimentoOdontologico(master, originadora, remetente, municipalityId, cnesUnidade),
        uuid: uuidFicha,
        type: "FICHA_ATENDIMENTO_ODONTOLOGICO"
    };
}

async function dispatchDomiciliar(data: any, originadora: LediOriginadoraThrift, remetente: LediRemetenteThrift, municipalityId: string, cnesUnidade: string, uuidFicha: string, date: number, turno: number, local: number, sexo: number, cbo: string) {
    const master: LediFichaVisitaDomiciliarMaster = {
        uuidFicha: uuidFicha,
        tpCdsOrigem: 3,
        headerTransport: {
            lotacaoFormPrincipal: {
                profissionalCNS: data.professional?.cns || data.professionalId,
                cboCodigo_2002: cbo,
                cnes: cnesUnidade,
                codigoIbgeMunicipio: municipalityId,
                dataAtendimento: date
            }
        },
        visitasDomiciliares: [{
            turno: turno,
            cnsCidadao: data.patientCns,
            dtNascimento: new Date(data.patientDob).getTime(),
            sexo: sexo,
            statusVisitaCompartilhadaOutroProfissional: false,
            desfecho: 1, // Realizada
            stForaArea: false,
            tipoDeImovel: 1, // Casa
            motivosVisita: [32], // Outros (Safe default)
            pesoAcompanhamentoNutricional: data.weight ? parseFloat(data.weight) : undefined,
            alturaAcompanhamentoNutricional: data.height ? parseFloat(data.height) : undefined
        }]
    };
    return {
        content: await serializeFichaVisitaDomiciliar(master, originadora, remetente, municipalityId, cnesUnidade),
        uuid: uuidFicha,
        type: "FICHA_VISITA_DOMICILIAR"
    };
}

async function dispatchColetiva(data: any, originadora: LediOriginadoraThrift, remetente: LediRemetenteThrift, municipalityId: string, cnesUnidade: string, uuidFicha: string, date: number, turno: number, local: number, sexo: number, cbo: string) {
    const master: LediFichaAtividadeColetivaMaster = {
        uuidFicha: uuidFicha,
        tpCdsOrigem: 3,
        headerTransport: {
            profissionalCNS: data.professional?.cns || data.professionalId,
            cboCodigo_2002: cbo,
            cnes: cnesUnidade,
            codigoIbgeMunicipio: municipalityId,
            dataAtendimento: date,
            ine: data.ine || undefined
        },
        numParticipantes: data.participantsCount ? parseInt(data.participantsCount) : 1,
        atividadeTipo: data.activityType ? parseInt(data.activityType) : 1, // Default to Educacao Saude (01)?
        publicoAlvo: data.targetAudience?.map((t: string) => parseInt(t)) || [],
        temasParaReuniao: data.meetingThemes?.map((t: string) => parseInt(t)),
        temasParaSaude: data.healthThemes?.map((t: string) => parseInt(t)),
        praticasEmSaude: data.healthPractices?.map((t: string) => parseInt(t)),
        participantes: data.participants?.map((p: any) => ({
            cnsParticipante: p.cns,
            dataNascimento: new Date(p.dob).getTime(),
            sexo: p.sex === 'M' ? 0 : 1,
            avaliaçãoAlterada: p.hasAlteredEval || false,
            cessouHabitoFumar: p.quitSmoking || false,
            abandonouGrupo: p.abandonedGroup || false,
            peso: p.weight ? parseFloat(p.weight) : undefined,
            altura: p.height ? parseFloat(p.height) : undefined
        })),
        profissionais: data.otherProfessionals?.map((op: any) => ({
            cnsProfissional: op.cns,
            cboProfissional: op.cbo
        }))
    };

    return {
        content: await serializeFichaAtividadeColetiva(master, originadora, remetente, municipalityId, cnesUnidade),
        uuid: uuidFicha,
        type: "FICHA_ATIVIDADE_COLETIVA"
    };
}

async function dispatchVacinacao(data: any, originadora: LediOriginadoraThrift, remetente: LediRemetenteThrift, municipalityId: string, cnesUnidade: string, uuidFicha: string, date: number, turno: number, local: number, sexo: number, cbo: string) {
    const master: LediFichaVacinacaoMaster = {
        uuidFicha: uuidFicha,
        tpCdsOrigem: 3,
        headerTransport: {
            lotacaoFormPrincipal: {
                profissionalCNS: data.professional?.cns || data.professionalId,
                cboCodigo_2002: cbo,
                cnes: cnesUnidade,
                codigoIbgeMunicipio: municipalityId,
                dataAtendimento: date
            }
        },
        vacinacoes: [{
            turno: turno,
            dtNascimento: new Date(data.patientDob).getTime(),
            cnsCidadao: data.patientCns,
            sexo: sexo,
            localAtendimento: local,
            viajante: false,
            dataHoraInicialAtendimento: date,
            dataHoraFinalAtendimento: date + (10 * 60000),
            vacinas: [
                {
                    imunobiologico: parseInt(data.vaccinationData.imunobiologico),
                    estrategiaVacinacao: parseInt(data.vaccinationData.estrategia || '1'),
                    dose: parseInt(data.vaccinationData.dose || '1'),
                    lote: data.vaccinationData.lote || '00000',
                    fabricante: data.vaccinationData.fabricante || 'UNKNOWN',
                    viaAdministracao: data.vaccinationData.viaAdministracao ? parseInt(data.vaccinationData.viaAdministracao) : undefined,
                    localAplicacao: data.vaccinationData.localAplicacao ? parseInt(data.vaccinationData.localAplicacao) : undefined
                }
            ]
        }]
    };
    return {
        content: await serializeFichaVacinacao(master, originadora, remetente, municipalityId, cnesUnidade),
        uuid: uuidFicha,
        type: "FICHA_VACINACAO"
    };
}

async function dispatchIndividual(data: any, originadora: LediOriginadoraThrift, remetente: LediRemetenteThrift, municipalityId: string, cnesUnidade: string, uuidFicha: string, date: number, turno: number, local: number, sexo: number, cbo: string) {
    const cids: string[] = Array.isArray(data.cidCodes) ? data.cidCodes : [];
    const master: LediFichaIndividualMaster = {
        uuidFicha: uuidFicha,
        tpCdsOrigem: 3,
        headerTransport: {
            lotacaoFormPrincipal: {
                profissionalCNS: data.professional?.cns || data.professionalId,
                cboCodigo_2002: cbo,
                cnes: cnesUnidade,
                codigoIbgeMunicipio: municipalityId,
                dataAtendimento: date
            }
        },
        atendimentosIndividuais: [{
            numeroProntuario: data.patientId,
            cnsCidadao: data.patientCns,
            dataNascimento: new Date(data.patientDob).getTime(),
            localDeAtendimento: local,
            sexo: sexo,
            turno: turno,
            tipoAtendimento: parseInt(data.attendanceType || '01'),
            vacinaEmDia: data.vacinaEmDia || false,
            ficouEmObservacao: data.ficouEmObservacao || false,
            // Prenatal
            stGravidezPlanejada: data.stGravidezPlanejada || false,
            nuGestasPrevias: data.nuGestasPrevias ? parseInt(data.nuGestasPrevias) : 0,
            nuPartos: data.nuPartos ? parseInt(data.nuPartos) : 0,

            // SOAP: Problemas/Condições
            // SOAP: Problemas/Condições
            problemasCondicoes: (() => {
                const soaps = data.soaps?.evaluation?.problemConditions;
                if (soaps && soaps.length > 0) {
                    return soaps.map((p: any) => ({
                        cid10: p.type === 'CID10' ? p.code : undefined,
                        ciap: p.type === 'CIAP2' ? p.code : undefined,
                        situacao: p.situacao,
                        isAvaliado: p.isAvaliado,
                        uuidProblema: p.uuidProblema,
                        uuidEvolucaoProblema: uuidv4(), // Always generate new Evolution ID for this atomic event
                        coSequencialEvolucao: p.coSequencialEvolucao || 1,
                        dataInicioProblema: p.dataInicioProblema ? new Date(p.dataInicioProblema).getTime() : undefined,
                        dataFimProblema: p.dataFimProblema ? new Date(p.dataFimProblema).getTime() : undefined
                    }));
                }
                // Fallback to legacy CIDs
                if (cids && cids.length > 0) {
                    return cids.map((cid: string) => ({ cid10: cid }));
                }
                return undefined;
            })(),
            // SOAP: Conduta
            condutas: data.soaps?.plan?.conduct?.map((c: string) => parseInt(c)),

            // Child Interventions
            aleitamentoMaterno: data.breastfeedingType ? parseInt(data.breastfeedingType) : undefined,

            dataHoraInicialAtendimento: date,
            dataHoraFinalAtendimento: date + (15 * 60000),
            pesoAcompanhamentoNutricional: data.weight ? parseFloat(data.weight) : undefined,
            alturaAcompanhamentoNutricional: data.height ? parseFloat(data.height) : undefined,

            // Prenatal Injection (Legacy/Redundant but kept for safety if fields overlap)
            ...(data.isPregnant ? {
                dumDaGestante: data.dumDaGestante ? new Date(data.dumDaGestante).getTime() : undefined,
                idadeGestacional: data.idadeGestacional ? parseInt(data.idadeGestacional) : undefined,
            } : {}),

            // Phase 2.5: Clinical Extensions
            // 1. Medicamentos
            medicamentos: data.medicamentos?.map((m: any) => ({
                codigoCatmat: m.codigoCatmat,
                viaAdministracao: m.viaAdministracao ? parseInt(m.viaAdministracao) : undefined, // Check if serializer uses Int64 wrapper
                dose: m.dose,
                doseUnica: m.doseUnica,
                usoContinuo: m.usoContinuo,
                doseFrequenciaTipo: m.doseFrequenciaTipo ? parseInt(m.doseFrequenciaTipo) : undefined,
                doseFrequencia: m.doseFrequencia,
                dtInicioTratamento: m.dtInicioTratamento ? new Date(m.dtInicioTratamento).getTime() : undefined,
                duracaoTratamento: m.duracaoTratamento, // Serializer expects string? Checked serializer: takes it as arg.
                quantidadeReceitada: m.quantidadeReceitada ? parseInt(m.quantidadeReceitada) : undefined
            })),

            // 2. Encaminhamentos
            encaminhamentos: data.encaminhamentos?.map((e: any) => ({
                especialidade: e.especialidade ? parseInt(e.especialidade) : undefined,
                hipoteseDiagnosticoCID10: e.hipoteseDiagnosticoCID10,
                hipoteseDiagnosticoCIAP2: e.hipoteseDiagnosticoCIAP2,
                classificacaoRisco: e.classificacaoRisco ? parseInt(e.classificacaoRisco) : undefined
            })),

            // 3. Resultados Exames
            resultadosExames: data.resultadosExames?.map((r: any) => ({
                exame: r.exame,
                dataSolicitacao: r.dataSolicitacao ? new Date(r.dataSolicitacao).getTime() : undefined,
                dataRealizacao: r.dataRealizacao ? new Date(r.dataRealizacao).getTime() : undefined,
                dataResultado: r.dataResultado ? new Date(r.dataResultado).getTime() : undefined,
                resultado: r.resultado?.map((res: any) => ({
                    tipoResultado: res.tipoResultado ? parseInt(res.tipoResultado) : undefined,
                    valorResultado: res.valorResultado
                }))
            })),

            // 4. IVCF
            ivcf: data.ivcf ? {
                resultado: data.ivcf.resultado, // Already number in Interface
                dataResultado: data.ivcf.dataResultado ? new Date(data.ivcf.dataResultado).getTime() : date, // Mandatory Field - Fallback to Attendance Date
                hasSgIdade: data.ivcf.hasSgIdade,
                hasSgPercepcaoSaude: data.ivcf.hasSgPercepcaoSaude,
                hasSgAvdInstrumental: data.ivcf.hasSgAvdInstrumental,
                hasSgAvdBasica: data.ivcf.hasSgAvdBasica,
                hasSgCognicao: data.ivcf.hasSgCognicao,
                hasSgHumor: data.ivcf.hasSgHumor,
                hasSgAlcancePreensaoPinca: data.ivcf.hasSgAlcancePreensaoPinca,
                hasSgCapAerobicaMuscular: data.ivcf.hasSgCapAerobicaMuscular,
                hasSgMarcha: data.ivcf.hasSgMarcha,
                hasSgContinencia: data.ivcf.hasSgContinencia,
                hasSgVisao: data.ivcf.hasSgVisao,
                hasSgAudicao: data.ivcf.hasSgAudicao,
                hasSgComorbidade: data.ivcf.hasSgComorbidade
            } : undefined,

            // 5. OCI
            solicitacoesOci: data.solicitacoesOci?.map((s: any) => ({
                codigoSigtap: s.codigoSigtap
            })),

            // 6. Exames Solicitados (From SOAP Plan)
            exames: data.soaps?.plan?.exames?.map((ex: any) => ({
                codigoExame: ex.codigoExame,
                solicitadoAvaliado: ex.solicitadoAvaliado
            }))
        }]
    };

    return {
        content: await serializeFichaAtendimentoIndividual(master, originadora, remetente, municipalityId, cnesUnidade),
        uuid: uuidFicha,
        type: "FICHA_ATENDIMENTO_INDIVIDUAL"
    };
}

async function dispatchProcedimentos(data: any, originadora: LediOriginadoraThrift, remetente: LediRemetenteThrift, municipalityId: string, cnesUnidade: string, uuidFicha: string, date: number, turno: number, local: number, sexo: number, cbo: string) {
    const master: LediFichaProcedimentosMaster = {
        uuidFicha: uuidFicha,
        tpCdsOrigem: 3,
        headerTransport: {
            lotacaoFormPrincipal: {
                profissionalCNS: data.professional?.cns || data.professionalId,
                cboCodigo_2002: cbo,
                cnes: cnesUnidade,
                codigoIbgeMunicipio: municipalityId,
                dataAtendimento: date
            }
        },
        atendimentosIndividuais: [{
            cnsCidadao: data.patientCns,
            dtNascimento: new Date(data.patientDob).getTime(),
            sexo: sexo,
            localAtendimento: local,
            turno: turno,
            statusEscutaInicialOrientacao: false,
            procedimentos: [{
                procedimento: data.procedureCode,
                quantidade: Math.max(1, data.quantity || 1)
            }],
            dataHoraInicialAtendimento: date,
            dataHoraFinalAtendimento: date + (10 * 60000)
        }]
    };

    return {
        content: await serializeFichaProcedimentos(master, originadora, remetente, municipalityId, cnesUnidade),
        uuid: uuidFicha,
        type: "FICHA_PROCEDIMENTOS"
    };
}

async function dispatchAtendimentoDomiciliar(data: any, originadora: LediOriginadoraThrift, remetente: LediRemetenteThrift, municipalityId: string, cnesUnidade: string, uuidFicha: string, date: number, turno: number, local: number, sexo: number, cbo: string) {
    const master: LediFichaAtendimentoDomiciliarMaster = {
        uuidFicha: uuidFicha,
        tpCdsOrigem: 3,
        headerTransport: {
            lotacaoFormPrincipal: {
                profissionalCNS: data.professional?.cns || data.professionalId,
                cboCodigo_2002: cbo,
                cnes: cnesUnidade,
                codigoIbgeMunicipio: municipalityId,
                dataAtendimento: date
            }
        },
        atendimentosDomiciliares: [{
            turno: turno,
            cnsCidadao: data.patientCns,
            cpfCidadao: data.patientCpf,
            dataNascimento: new Date(data.patientDob).getTime(),
            sexo: sexo,
            localDeAtendimento: 4, // 4-Domicilio
            atencaoDomiciliarModalidade: data.fadData?.atencaoDomiciliarModalidade || 1, // AD1 default
            tipoAtendimento: data.fadData?.tipoAtendimento || 7, // 7-Visita Domiciliar default
            condicoesAvaliadas: data.fadData?.condicoesAvaliadas || [],
            condutaDesfecho: data.fadData?.condutaDesfecho || 1, // 1-Permanencia default
            procedimentos: data.fadData?.procedimentos || [],
            problemasCondicoes: data.soaps?.evaluation?.problemConditions?.map((p: any) => ({
                cid10: p.type === 'CID10' ? p.code : undefined,
                ciap: p.type === 'CIAP2' ? p.code : undefined,
                situacao: p.situacao,
                isAvaliado: p.isAvaliado,
                uuidProblema: p.uuidProblema,
                uuidEvolucaoProblema: uuidv4(),
                coSequencialEvolucao: p.coSequencialEvolucao || 1,
                dataInicioProblema: p.dataInicioProblema ? new Date(p.dataInicioProblema).getTime() : undefined,
                dataFimProblema: p.dataFimProblema ? new Date(p.dataFimProblema).getTime() : undefined
            })) || []
        }]
    };

    return {
        content: await serializeFichaAtendimentoDomiciliar(master, originadora, remetente, municipalityId, cnesUnidade),
        uuid: uuidFicha,
        type: "FICHA_ATENDIMENTO_DOMICILIAR"
    };
}
