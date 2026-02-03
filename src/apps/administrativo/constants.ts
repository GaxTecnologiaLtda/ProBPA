import { Entity, EntityType, LicenseStatus, Municipality, License, AdminUser, UserRole, PaymentStatus, SupportTicket, TicketStatus, TicketPriority, TicketSource, SiaSusHistory, SiaSusStats, LogEntry, LogLevel, LogSource } from './types';
import { Building2, LayoutDashboard, Users, Map, FileBadge, BarChart3, Settings, Headphones, Database, ScrollText, Activity } from 'lucide-react';

export const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Entidades Públicas', path: '/public-entities', icon: Building2 },
  { name: 'Entidades Privadas', path: '/private-entities', icon: Building2 },
  { name: 'Municípios', path: '/municipalities', icon: Map },
  { name: 'Licenças', path: '/licenses', icon: FileBadge },
  { name: 'Usuários Admin', path: '/admin-users', icon: Users },
  { name: 'Chamados de Suporte', path: '/support-tickets', icon: Headphones },
  { name: 'Relatórios', path: '/reports', icon: BarChart3 },
  { name: 'SIGTAP – Tabelas Oficiais', path: '/sigtap', icon: Database },
  { name: 'Logs de Sistema', path: '/system-logs', icon: ScrollText },
  { name: 'Lotes LEDI Enviados', path: '/lotes-ledi', icon: Activity },
  { name: 'Configurações', path: '/settings', icon: Settings },
];

export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
];

export const MOCK_ENTITIES: Entity[] = [
  { id: '1', name: 'Pref. Mun. de Salvador', cnpj: '12.345.678/0001-90', type: EntityType.PUBLIC, location: 'Salvador - BA', status: LicenseStatus.ACTIVE, createdAt: '2023-01-15', healthUnits: 45, responsible: 'João Silva', email: 'contato@salvador.ba.gov.br' },
  { id: '2', name: 'Consórcio Intermunicipal Vale', cnpj: '98.765.432/0001-10', type: EntityType.PUBLIC, location: 'Juazeiro - BA', status: LicenseStatus.ACTIVE, createdAt: '2023-03-20', healthUnits: 12, responsible: 'Maria Souza', email: 'adm@cisvale.org' },
  { id: '3', name: 'Instituto Saúde Total', cnpj: '45.678.901/0001-23', type: EntityType.PRIVATE, location: 'São Paulo - SP', status: LicenseStatus.ACTIVE, createdAt: '2023-06-10', privateType: 'OS', municipalityCount: 3, responsible: 'Dr. Roberto', email: 'roberto@saudetotal.org' },
  { id: '4', name: 'Fundação Viver Bem', cnpj: '11.222.333/0001-44', type: EntityType.PRIVATE, location: 'Recife - PE', status: LicenseStatus.SUSPENDED, createdAt: '2022-11-05', privateType: 'Fundação', municipalityCount: 1, responsible: 'Ana Clara', email: 'contato@viverbem.org' },
];

export const MOCK_MUNICIPALITIES: Municipality[] = [
  { id: '101', name: 'Salvador', state: 'BA', uf: 'BA', codeIbge: '2927408', population: 2886698, linkedEntityId: '1', linkedEntityName: 'Pref. Mun. de Salvador', usersCount: 120, status: LicenseStatus.ACTIVE, active: true, mayorName: 'Bruno Reis', secretaryName: 'Ana Paula', email: 'saude@salvador.ba.gov.br', phone: '(71) 3202-1000', address: 'Rua da Grécia, 3', managerEntityType: 'Prefeitura', responsibleEntity: 'Pref. Mun. de Salvador', cnpj: '12.345.678/0001-90' },
  { id: '102', name: 'Camaçari', state: 'BA', uf: 'BA', codeIbge: '2905701', population: 304302, linkedEntityId: '1', linkedEntityName: 'Pref. Mun. de Salvador', usersCount: 45, status: LicenseStatus.ACTIVE, active: true, mayorName: 'Elinaldo Araújo', secretaryName: 'Luiz Duplat', email: 'saude@camacari.ba.gov.br', phone: '(71) 3621-6600', address: 'Av. do Contorno, s/n', managerEntityType: 'Prefeitura', responsibleEntity: 'Pref. Mun. de Salvador', cnpj: '12.345.678/0001-90' },
  { id: '103', name: 'Petrolina', state: 'PE', uf: 'PE', codeIbge: '2611101', population: 354317, linkedEntityId: '3', linkedEntityName: 'Instituto Saúde Total', usersCount: 30, status: LicenseStatus.ACTIVE, active: true, mayorName: 'Simão Durando', secretaryName: 'Magnilde Albuquerque', email: 'saude@petrolina.pe.gov.br', phone: '(87) 3862-9100', address: 'Av. Fernando Góes, 537', managerEntityType: 'Prefeitura', responsibleEntity: 'Instituto Saúde Total', cnpj: '45.678.901/0001-23' },
  { id: '104', name: 'Olinda', state: 'PE', uf: 'PE', codeIbge: '2609600', population: 393115, linkedEntityId: '4', linkedEntityName: 'Fundação Viver Bem', usersCount: 15, status: LicenseStatus.SUSPENDED, active: false, mayorName: 'Professor Lupércio', secretaryName: 'Ana Cláudia Callou', email: 'saude@olinda.pe.gov.br', phone: '(81) 3429-0000', address: 'Rua do Sol, 311', managerEntityType: 'Prefeitura', responsibleEntity: 'Fundação Viver Bem', cnpj: '11.222.333/0001-44' },
];

export const MOCK_LICENSES: License[] = [
  {
    id: 'L001',
    entityId: '1',
    entityName: 'Pref. Mun. de Salvador',
    entityType: EntityType.PUBLIC,
    totalMunicipalities: 5,
    status: LicenseStatus.ACTIVE,
    startDate: '2024-01-01',
    endDate: '2025-01-01',
    monthlyValue: 5000,
    annualValue: 60000,
    valuePerMunicipality: 1000,
    generatedAt: '2024-01-01',
    installments: []
  },
  {
    id: 'L002',
    entityId: '3',
    entityName: 'Instituto Saúde Total',
    entityType: EntityType.PRIVATE,
    totalMunicipalities: 10,
    status: LicenseStatus.ACTIVE,
    startDate: '2023-06-01',
    endDate: '2024-06-01',
    monthlyValue: 2500,
    annualValue: 30000,
    valuePerMunicipality: 250,
    generatedAt: '2023-06-01',
    installments: [
      { id: 'i1', number: 1, dueDate: '2023-06-01', amount: 2500, paid: true, paidAt: '2023-06-02', receiptUrl: 'receipt.pdf' },
      { id: 'i2', number: 2, dueDate: '2023-07-01', amount: 2500, paid: false },
    ]
  },
  {
    id: 'L003',
    entityId: '4',
    entityName: 'Fundação Viver Bem',
    entityType: EntityType.PRIVATE,
    totalMunicipalities: 2,
    status: LicenseStatus.EXPIRED,
    startDate: '2022-01-01',
    endDate: '2023-01-01',
    monthlyValue: 1000,
    annualValue: 12000,
    valuePerMunicipality: 500,
    generatedAt: '2022-01-01',
    installments: []
  },
];

export const MOCK_USERS: AdminUser[] = [
  { id: 'U1', name: 'Carlos Admin', email: 'carlos@gax.com', role: UserRole.SUPER_ADMIN, active: true, lastLogin: '2024-05-20 10:30' },
  { id: 'U2', name: 'Fernanda Suporte', email: 'fernanda@gax.com', role: UserRole.SUPPORT, active: true, lastLogin: '2024-05-19 14:15' },
  { id: 'U3', name: 'Marcos Auditor', email: 'marcos@gax.com', role: UserRole.AUDITOR, active: false, lastLogin: '2024-04-10 09:00' },
];

export const MOCK_TICKETS: SupportTicket[] = [
  {
    id: 'TCK-9021',
    title: 'Erro ao sincronizar dados do município',
    description: 'Ao tentar importar a planilha de produção, o sistema retorna erro 500. O arquivo tem 2mb.',
    source: TicketSource.PRODUCTION,
    entityName: 'Pref. Mun. de Salvador',
    priority: TicketPriority.HIGH,
    status: TicketStatus.OPEN,
    createdAt: '2024-05-20T14:30:00Z',
    requesterName: 'Ana Paula (Coord. Atenção Básica)',
    logs: [
      { id: 'L1', message: 'Chamado aberto via Painel de Produção.', createdAt: '2024-05-20T14:30:00Z', type: 'system', author: 'Sistema' }
    ]
  },
  {
    id: 'TCK-8840',
    title: 'Dúvida sobre renovação de licença',
    description: 'Gostaria de saber se a renovação automática mantém o valor antigo.',
    source: TicketSource.MANAGEMENT,
    entityName: 'Instituto Saúde Total',
    priority: TicketPriority.LOW,
    status: TicketStatus.IN_PROGRESS,
    createdAt: '2024-05-19T09:15:00Z',
    requesterName: 'Dr. Roberto',
    logs: [
      { id: 'L2', message: 'Chamado aberto via Painel de Gestão.', createdAt: '2024-05-19T09:15:00Z', type: 'system', author: 'Sistema' },
      { id: 'L3', message: 'Iniciei a análise do contrato vigente.', createdAt: '2024-05-19T10:00:00Z', type: 'note', author: 'Fernanda Suporte' }
    ]
  },
  {
    id: 'TCK-7500',
    title: 'Usuário não consegue resetar senha',
    description: 'O email de recuperação não chega.',
    source: TicketSource.PRODUCTION,
    entityName: 'Consórcio Vale',
    priority: TicketPriority.MEDIUM,
    status: TicketStatus.RESOLVED,
    createdAt: '2024-05-10T11:00:00Z',
    resolvedAt: '2024-05-10T15:45:00Z',
    requesterName: 'Maria Souza',
    logs: [
      { id: 'L4', message: 'Chamado aberto.', createdAt: '2024-05-10T11:00:00Z', type: 'system', author: 'Sistema' },
      { id: 'L5', message: 'Email estava na caixa de spam. Orientado a verificar.', createdAt: '2024-05-10T15:45:00Z', type: 'resolution', author: 'Carlos Admin' }
    ]
  }
];

export const MOCK_SIA_STATS: SiaSusStats = {
  competence: '05/2024',
  totalProcedures: 4852,
  totalCbos: 2540,
  totalCids: 14120,
  lastUpdate: '2024-05-15 08:30',
};

export const MOCK_SIA_HISTORY: SiaSusHistory[] = [
  { id: 'IMP-001', competence: '05/2024', importedBy: 'Carlos Admin', importedAt: '2024-05-15 08:30', sourceUrl: 'ftp.datasus.gov.br/sia/siasus.zip', status: 'success', filesCount: 12 },
  { id: 'IMP-002', competence: '04/2024', importedBy: 'Sistema (Auto)', importedAt: '2024-04-12 03:00', sourceUrl: 'ftp.datasus.gov.br/sia/siasus.zip', status: 'success', filesCount: 12 },
  { id: 'IMP-003', competence: '03/2024', importedBy: 'Sistema (Auto)', importedAt: '2024-03-10 03:00', sourceUrl: 'ftp.datasus.gov.br/sia/siasus.zip', status: 'failed', filesCount: 0 },
];

export const MOCK_SYSTEM_LOGS: LogEntry[] = [
  {
    id: 'LOG-1203',
    timestamp: '2024-05-20T14:32:01Z',
    level: LogLevel.ERROR,
    source: LogSource.PRODUCTION_PANEL,
    event: 'Falha na importação de BPA',
    user: 'ana.paula@salvador.ba.gov.br',
    ip: '192.168.0.12',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    details: { error_code: 500, file_size: '2.4MB', message: 'Unexpected EOF in DBF file' }
  },
  {
    id: 'LOG-1202',
    timestamp: '2024-05-20T14:30:00Z',
    level: LogLevel.INFO,
    source: LogSource.PRODUCTION_PANEL,
    event: 'Usuário realizou login',
    user: 'ana.paula@salvador.ba.gov.br',
    ip: '192.168.0.12',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  {
    id: 'LOG-1201',
    timestamp: '2024-05-20T11:15:00Z',
    level: LogLevel.WARNING,
    source: LogSource.ENTITY_PANEL,
    event: 'Tentativa de acesso não autorizado',
    user: 'unknown',
    ip: '45.22.19.112',
    userAgent: 'Python-requests/2.26.0',
    details: 'Multiple failed login attempts detected'
  },
  {
    id: 'LOG-1200',
    timestamp: '2024-05-20T10:05:00Z',
    level: LogLevel.INFO,
    source: LogSource.ADMIN_PANEL,
    event: 'Nova licença gerada',
    user: 'carlos@gax.com',
    ip: '10.0.0.55',
    details: { license_id: 'L005', entity: 'Pref. Mun. de Salvador', value: 5000 }
  },
  {
    id: 'LOG-1199',
    timestamp: '2024-05-19T09:00:00Z',
    level: LogLevel.CRITICAL,
    source: LogSource.ADMIN_PANEL,
    event: 'Serviço de Background Job Parado',
    user: 'SYSTEM',
    ip: 'localhost',
    details: 'Scheduler service crashed. Restarted automatically.'
  }
];