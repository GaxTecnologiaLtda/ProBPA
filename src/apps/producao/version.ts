export const APP_VERSION = '1.10.0';

export const getVersionString = () => {
    return APP_VERSION;
};

export type ChangeScope = 'GLOBAL' | 'SIMPLIFIED' | 'PEC';

export interface ChangeItem {
    text: string;
    scope: ChangeScope;
}

export interface ReleaseParams {
    version: string;
    date: string;
    title: string;
    changes: ChangeItem[];
}

export const LATEST_CHANGES: ReleaseParams[] = [
    {
        version: '1.10.0',
        date: '26/01/2026',
        title: 'Central de Tutoriais e Onboarding',
        changes: [
            { text: 'Tutoriais: Nova aba com materiais educativos e guias do sistema.', scope: 'GLOBAL' },
            { text: 'Onboarding Simplificado: Tour interativo para profissionais com interface simplificada.', scope: 'SIMPLIFIED' },
            { text: 'Identificação de Perfil: Conteúdo adaptado automaticamente conforme o CBO do usuário.', scope: 'GLOBAL' },
            { text: 'Melhorias de UX: Ajustes de layout e responsividade no tour guiado.', scope: 'GLOBAL' }
        ]
    },
    {
        version: '1.9.0',
        date: '24/01/2026',
        title: 'Múltiplos Vínculos e Melhorias de UX',
        changes: [
            { text: 'Seletor de Unidades: Novo alternador de unidade no topo da tela de Registro para troca rápida.', scope: 'GLOBAL' },
            { text: 'Bloqueio de Seleção: Garante o carregamento da configuração correta (PEC/Simp) para profissionais com múltiplos vínculos.', scope: 'GLOBAL' },
            { text: 'Sincronização: A unidade ativa é sincronizada automaticamente entre Perfil e Registro.', scope: 'GLOBAL' },
            { text: 'Busca SIGTAP: Melhorias visuais na lista de seleção de procedimentos.', scope: 'GLOBAL' }
        ]
    },
    {
        version: '1.8.0',
        date: '21/01/2026',
        title: 'Gestão de Cidadãos e Melhorias Offline',
        changes: [
            { text: 'Lista de Cidadãos: Nova tela para visualizar, buscar e gerenciar pacientes cadastrados.', scope: 'GLOBAL' },
            { text: 'Edição de Cadastro: Agora é possível corrigir dados de pacientes já registrados.', scope: 'GLOBAL' },
            { text: 'Filtro por Unidade: Visualize rapidamente apenas os pacientes da sua unidade de saúde.', scope: 'GLOBAL' },
            { text: 'Cache Offline de Pacientes: Baixe a base completa para consultar e editar mesmo sem internet.', scope: 'GLOBAL' },
            { text: 'Busca Otimizada: Pesquisa instantânea por Nome, CPF ou CNS na base local.', scope: 'GLOBAL' }
        ]
    },
    {
        version: '1.7.0',
        date: '19/01/2026',
        title: 'Segurança, Modo Offline e Melhorias Gerais',
        changes: [
            // Segurança e Modo Offline
            { text: 'Segurança Reforçada: Implementado Autenticação de Dois Fatores (MFA/2FA) via SMS para maior proteção.', scope: 'GLOBAL' },
            { text: 'Recuperação de Acesso: Nova funcionalidade de redefinição de senha segura.', scope: 'GLOBAL' },
            { text: 'Modo Offline Avançado: Login offline inteligente e cache local. Continue trabalhando mesmo sem internet.', scope: 'GLOBAL' },
            { text: 'Persistência de Interface: Configurações de município (Simplificada/PEC) agora são mantidas mesmo offline.', scope: 'SIMPLIFIED' },

            // Suporte Técnico e Histórico Aprimorado
            { text: 'Histórico de Produção: Nova visualização detalhada, agrupada por dia e com modal de informações completas.', scope: 'GLOBAL' },
            { text: 'Suporte Técnico: Canal direto e integrado para abertura de chamados de suporte.', scope: 'GLOBAL' },
            { text: 'Login: Adicionada opção de visualizar senha para facilitar o acesso.', scope: 'GLOBAL' },

            // Melhorias de Interface e Navegação
            { text: 'Notificações de Versão: Novo indicador visual para alertar sobre novidades no sistema.', scope: 'GLOBAL' },
            { text: 'Menu Lateral: Acesso rápido ao histórico de atualizações diretamente pelo rodapé do menu.', scope: 'GLOBAL' },
            { text: 'Interface Simplificada: Ajustes na renderização do modo simplificado para municípios sem PEC.', scope: 'SIMPLIFIED' },
            { text: 'Correções Diversas: Otimizações de desempenho e ajustes de layout.', scope: 'GLOBAL' }
        ]
    },
    {
        version: '1.6.0',
        date: '03/01/2026',
        title: 'Validações & Regras LEDI',
        changes: [
            { text: 'Cadastro de Pacientes: Validação oficial de CNS com Algoritmo Módulo 11.', scope: 'GLOBAL' },
            { text: 'Validação de Nomes: Bloqueio de nomes incompletos ou com caracteres inválidos.', scope: 'GLOBAL' },
            { text: 'Vacinação: Lote, Dose e Fabricante obrigatórios para imunobiológicos.', scope: 'PEC' },
            { text: 'Conformidade: Ajustes para evitar rejeições no envio ao Ministério da Saúde.', scope: 'GLOBAL' }
        ]
    }
];

export const DEVELOPER_INFO = {
    name: "Gabriel Alves",
    role: "Full Stack Developer",
    email: "contato@gabrielalves.dev",
    website: "https://gabrielalves.dev",
    linkedin: "https://linkedin.com/in/gabrielalves1",
    github: "https://github.com/gabrielalves1",
    company: "GAX Tecnologia",
    cnpj: "62.054.372/0001-58",
    year: "2025"
};
