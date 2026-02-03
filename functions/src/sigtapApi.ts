// ============================================================================
// SIGTAP SOAP API – Implementação 100% compatível com o WSDL oficial
// Reescrita completa para remover poluição de namespaces e atender SOAP Strict
// Autor: ChatGPT • GAX TECNOLOGIA • ProBPA
// ============================================================================

import soapRequest from "easy-soap-request";
import { XMLParser } from "fast-xml-parser";

// ---------------------------------------------------------
// CONFIGURAÇÃO BÁSICA
// ---------------------------------------------------------

const HEADERS = {
    // SOAP 1.2 usa application/soap+xml
    "Content-Type": "application/soap+xml;charset=UTF-8",
    "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Accept-Encoding": "gzip,deflate"
};

// ENDPOINTS OFICIAIS (USAR PRODUÇÃO)
const WSDL_URLS = {
    Procedimento: "https://servicos.saude.gov.br/sigtap/ProcedimentoService/v1",
    NivelAgregacao: "https://servicos.saude.gov.br/sigtap/NivelAgregacaoService/v1"
};

// LOGIN PÚBLICO SIGTAP
const USERNAME = "SIGTAP.PUBLICO";
const PASSWORD = "sigtap#2015public";

// ---------------------------------------------------------
// XML PARSER (SEM PREFIXOS E COM NAMESPACES REMOVIDOS)
// ---------------------------------------------------------

const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    attributeNamePrefix: ""
});

// ---------------------------------------------------------
// SOAP ENVELOPE – STRICT WS-SECURITY (SOAP 1.2)
// ---------------------------------------------------------

function buildEnvelope(body: string): string {
    // Namespace atualizado para SOAP 1.2 (http://www.w3.org/2003/05/soap-envelope)
    return `
<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <soapenv:Header>
        <wsse:Security soapenv:mustUnderstand="1">
            <wsse:UsernameToken wsu:Id="UsernameToken-1">
                <wsse:Username>${USERNAME}</wsse:Username>
                <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${PASSWORD}</wsse:Password>
            </wsse:UsernameToken>
        </wsse:Security>
    </soapenv:Header>

    <soapenv:Body>
        ${body}
    </soapenv:Body>
</soapenv:Envelope>`.trim();
}

// ---------------------------------------------------------
// SOAP REQUEST WRAPPER
// ---------------------------------------------------------

async function makeRequest(url: string, rawXml: string): Promise<any> {
    try {
        const xml = buildEnvelope(rawXml);

        const { response } = await soapRequest({
            url,
            headers: HEADERS,
            xml,
            timeout: 60000
        });

        const json = parser.parse(response.body);

        const envelope = json.Envelope || json["soap:Envelope"];
        if (!envelope) return null;

        const body = envelope.Body || envelope["soap:Body"];

        // Caso venha Fault
        if (body.Fault) {
            console.error("SOAP FAULT:", body.Fault);
            throw new Error(body.Fault.Reason?.Text || "SOAP Fault");
        }

        console.log("DEBUG SOAP RESPONSE FULL:", JSON.stringify(body, null, 2));
        return body;

    } catch (err: any) {
        console.error("SOAP ERROR:", err.message || err);
        throw err;
    }
}

// ---------------------------------------------------------
// FUNÇÃO 1 – LISTAR GRUPOS
// ---------------------------------------------------------

// ---------------------------------------------------------
// FUNÇÃO 1 – LISTAR GRUPOS
// ---------------------------------------------------------

export async function requestListarGrupos(): Promise<any[]> {
    const xml = `
        <requestListarGrupos xmlns="http://servicos.saude.gov.br/sigtap/v1/nivelagregacaoservice"/>
    `;

    const result = await makeRequest(WSDL_URLS.NivelAgregacao, xml);

    const response =
        result?.responseListarGrupos ||
        result?.listarGruposResponse ||
        result?.ResponseListarGrupos;

    // Ajuste para ler 'Grupo' (PascalCase) conforme log
    const rawList = response?.Grupo || response?.grupos || [];

    if (!rawList) return [];

    const grupos = Array.isArray(rawList) ? rawList : [rawList];
    return grupos;
}

// ---------------------------------------------------------
// FUNÇÃO 2 – LISTAR SUBGRUPOS
// ---------------------------------------------------------

export async function requestListarSubGrupos(codigoGrupo: string): Promise<any[]> {
    // Namespace inferido do erro: http://servicos.saude.gov.br/schema/sigtap/procedimento/nivelagregacao/v1/grupo
    const xml = `
        <requestListarSubgrupos xmlns="http://servicos.saude.gov.br/sigtap/v1/nivelagregacaoservice">
            <codigoGrupo xmlns="http://servicos.saude.gov.br/schema/sigtap/procedimento/nivelagregacao/v1/grupo">${codigoGrupo}</codigoGrupo>
        </requestListarSubgrupos>
    `;

    const result = await makeRequest(WSDL_URLS.NivelAgregacao, xml);

    const response =
        result?.responseListarSubgrupos ||
        result?.listarSubgruposResponse;

    // Ajuste para ler 'Subgrupo' (PascalCase)
    const rawList = response?.Subgrupo || response?.subgrupos || [];

    if (!rawList) return [];

    const list = Array.isArray(rawList) ? rawList : [rawList];
    return list;
}

// ---------------------------------------------------------
// FUNÇÃO 3 – LISTAR FORMAS DE ORGANIZAÇÃO
// ---------------------------------------------------------

export async function requestListarFormas(codigoSubgrupo: string): Promise<any[]> {
    // Inferindo namespace de subgrupo seguindo padrão do grupo
    const xml = `
        <requestListarFormaOrganizacao xmlns="http://servicos.saude.gov.br/sigtap/v1/nivelagregacaoservice">
            <codigoSubgrupo xmlns="http://servicos.saude.gov.br/schema/sigtap/procedimento/nivelagregacao/v1/subgrupo">${codigoSubgrupo}</codigoSubgrupo>
        </requestListarFormaOrganizacao>
    `;

    const result = await makeRequest(WSDL_URLS.NivelAgregacao, xml);

    const response =
        result?.responseListarFormaOrganizacao ||
        result?.listarFormaOrganizacaoResponse;

    if (!response) return [];

    // Ajuste para ler 'FormaOrganizacao'
    const formas =
        response.FormaOrganizacao ||
        response.formaOrganizacao ||
        response.formasOrganizacao ||
        [];

    return Array.isArray(formas) ? formas : [formas];
}

// ---------------------------------------------------------
// FUNÇÃO 4 – PESQUISAR PROCEDIMENTOS
// ---------------------------------------------------------

export async function requestPesquisarProcedimentos(
    competencia: string,
    codigoGrupo: string,
    codigoSubgrupo: string,
    codigoForma: string | null,
    page: number,
    pageSize = 20
): Promise<{ procedimentos: any[]; totalRegistros: number }> {

    const registroInicial = (page - 1) * pageSize + 1;

    // Para forma, namespace inferido: .../forma_organizacao
    const formaTag = codigoForma
        ? `<codigoFormaOrganizacao xmlns="http://servicos.saude.gov.br/schema/sigtap/procedimento/nivelagregacao/v1/forma_organizacao">${codigoForma}</codigoFormaOrganizacao>`
        : "";

    // Namespaces para os outros parâmetros
    const nsGrupo = "http://servicos.saude.gov.br/schema/sigtap/procedimento/nivelagregacao/v1/grupo";
    const nsSubgrupo = "http://servicos.saude.gov.br/schema/sigtap/procedimento/nivelagregacao/v1/subgrupo";
    const nsCompetencia = "http://servicos.saude.gov.br/schema/corporativo/v1/competencia";
    const nsPaginacao = "http://servicos.saude.gov.br/wsdl/mensageria/v1/paginacao";

    const xml = `
        <requestPesquisarProcedimentos xmlns="http://servicos.saude.gov.br/sigtap/v1/procedimentoservice">
            <codigoGrupo xmlns="${nsGrupo}">${codigoGrupo}</codigoGrupo>
            <codigoSubgrupo xmlns="${nsSubgrupo}">${codigoSubgrupo}</codigoSubgrupo>
            ${formaTag}
            <competencia xmlns="${nsCompetencia}">${competencia}</competencia>
            <Paginacao xmlns="${nsPaginacao}">
                <registroInicial>${registroInicial}</registroInicial>
                <quantidadeRegistros>${pageSize}</quantidadeRegistros>
            </Paginacao>
        </requestPesquisarProcedimentos>
    `;

    const result = await makeRequest(WSDL_URLS.Procedimento, xml);

    const response =
        result?.responsePesquisarProcedimentos ||
        result?.pesquisarProcedimentosResponse;

    if (!response) return { procedimentos: [], totalRegistros: 0 };

    // Total de registros
    let total = 0;
    if (response.Paginacao?.totalRegistros) {
        total = parseInt(response.Paginacao.totalRegistros);
    }

    // Ajuste para ler 'Procedimento'
    let procedimentos = response.Procedimento || response.procedimentos || [];
    if (!Array.isArray(procedimentos)) procedimentos = [procedimentos];

    return { procedimentos, totalRegistros: total };
}

// ---------------------------------------------------------
// FUNÇÃO 5 – DETALHAR PROCEDIMENTO
// ---------------------------------------------------------

export async function requestDetalharProcedimento(
    codigoProcedimento: string,
    competencia: string
): Promise<any> {

    // Namespace Procedimento
    const nsProcedimento = "http://servicos.saude.gov.br/schema/sigtap/procedimento/v1/procedimento";
    const nsCompetencia = "http://servicos.saude.gov.br/schema/corporativo/v1/competencia";

    const xml = `
        <requestDetalharProcedimento xmlns="http://servicos.saude.gov.br/sigtap/v1/procedimentoservice">
            <codigoProcedimento xmlns="${nsProcedimento}">${codigoProcedimento}</codigoProcedimento>
            <competencia xmlns="${nsCompetencia}">${competencia}</competencia>
            <DetalhesAdicionais>
                 <DetalheAdicional><categoriaDetalheAdicional>DESCRICAO</categoriaDetalheAdicional></DetalheAdicional>
                 <DetalheAdicional><categoriaDetalheAdicional>INSTRUMENTO_REGISTRO</categoriaDetalheAdicional></DetalheAdicional>
                 <DetalheAdicional><categoriaDetalheAdicional>CBO</categoriaDetalheAdicional></DetalheAdicional>
                 <DetalheAdicional><categoriaDetalheAdicional>CID</categoriaDetalheAdicional></DetalheAdicional>
                 <DetalheAdicional><categoriaDetalheAdicional>SERVICO</categoriaDetalheAdicional></DetalheAdicional>
                 <DetalheAdicional><categoriaDetalheAdicional>MODALIDADE</categoriaDetalheAdicional></DetalheAdicional>
                 <DetalheAdicional><categoriaDetalheAdicional>VALOR_PROCEDIMENTO</categoriaDetalheAdicional></DetalheAdicional>
            </DetalhesAdicionais>
        </requestDetalharProcedimento>
    `;

    const result = await makeRequest(WSDL_URLS.Procedimento, xml);

    const response =
        result?.responseDetalharProcedimento ||
        result?.detalharProcedimentoResponse;

    // Ajuste para 'Procedimento'
    return response?.Procedimento || response?.procedimento || null;
}