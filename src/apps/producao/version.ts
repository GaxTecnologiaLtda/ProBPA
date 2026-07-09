export const APP_VERSION = '2.4.1';

export const DEVELOPER_INFO = {
  name: "Gabriel Adelino",
  role: "Desenvolvedor Chefe",
  email: "administracao@gaxtecnologia.com.br",
  company: "Gax Solucoes Tecnológicas LTDA",
  cnpj: "62.054.372/0001-58",
  year: 2026
};

export const getVersionString = () => {
    return APP_VERSION;
};

export const LATEST_CHANGES = [
    {
        version: '2.4.1',
        date: '11/05/2026',
        title: 'Ajuste Fino: Bloqueio Retroativo',
        changes: [
            { scope: 'GLOBAL', text: 'Bloqueio Individualizado: A trava de digitação retroativa agora respeita a configuração de cada município.' },
            { scope: 'GLOBAL', text: 'Flexibilidade: Tolerância "0" agora libera a digitação retroativa ilimitada.' }
        ]
    },
    {
        version: '2.4.0',
        date: '09/05/2026',
        title: 'Tolerância Retroativa & Observabilidade',
        changes: [
            { scope: 'GLOBAL', text: 'Bloqueio Retroativo: Implementado bloqueio inteligente baseado em prazo de tolerância por município.' }
        ]
    },
    {
        version: '2.3.0',
        date: '28/04/2026',
        title: 'Otimização de Produção e Histórico',
        changes: [
            { scope: 'GLOBAL', text: 'Competência Inteligente: Atualização automática da competência com base na data do atendimento no formulário de registro.' },
            { scope: 'GLOBAL', text: 'Histórico e Dashboard: Filtro de registros cancelados na contagem global de produções.' },
            { scope: 'GLOBAL', text: 'Identificação de Unidade: Inclusão do nome do município no seletor de unidades para maior clareza.' },
            { scope: 'PEC', text: 'Estabilização: Correções internas no fluxo de salvamento e validação de documentos.' }
        ]
    },
    {
        version: '2.2.0',
        date: '15/04/2026',
        title: 'Melhorias de Performance',
        changes: [
            { scope: 'GLOBAL', text: 'Otimização no carregamento de grandes volumes de dados no histórico.' },
            { scope: 'GLOBAL', text: 'Nova interface de suporte direto com a GAX Tecnologia.' },
            { scope: 'GLOBAL', text: 'Melhorias no modo offline para garantir integridade dos dados.' }
        ]
    }
];
