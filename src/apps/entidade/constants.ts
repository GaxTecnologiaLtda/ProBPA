import { Municipality, Unit, Professional, BPAFile, ProductionStats, Goal, EntityDocument, SupportTicket } from './types';

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

export const MOCK_MUNICIPALITIES: Municipality[] = [
  {
    id: 'm1',
    name: 'São Paulo do Sul',
    uf: 'SP',
    state: 'SP',
    codeIbge: '3550308',
    cnpj: '12.345.678/0001-90',
    mayorName: 'Ricardo Nunes Filho',
    secretaryName: 'Dr. Roberto Almeida',
    managerEntityType: 'Prefeitura',
    responsibleEntity: 'Prefeitura Municipal',
    email: 'saude@spsul.sp.gov.br',
    phone: '(11) 98765-4321',
    address: 'Av. Central, 123 - Centro',
    population: 45200,
    active: true,
    linkedEntityId: 'e1',
    linkedEntityName: 'Entidade Exemplo',
    status: 'Ativa' as any
  },
  {
    id: 'm2',
    name: 'Rio Verde do Norte',
    uf: 'GO',
    state: 'GO',
    codeIbge: '5218805',
    cnpj: '98.765.432/0001-10',
    mayorName: 'Ana Paula Vilela',
    secretaryName: 'Dra. Maria Fernanda',
    managerEntityType: 'OS',
    responsibleEntity: 'Instituto Saúde Vida',
    email: 'sms@rioverde.go.gov.br',
    phone: '(64) 3621-0000',
    address: 'Rua das Flores, 500 - Jd. Primavera',
    population: 23100,
    active: true,
    linkedEntityId: 'e1',
    linkedEntityName: 'Entidade Exemplo',
    status: 'Ativa' as any
  },
  {
    id: 'm3',
    name: 'Belo Campo',
    uf: 'MG',
    state: 'MG',
    codeIbge: '3106200',
    cnpj: '55.444.333/0001-22',
    mayorName: 'José da Silva',
    secretaryName: 'Sr. João Silva',
    managerEntityType: 'Prefeitura',
    responsibleEntity: 'Prefeitura Municipal',
    email: 'saude@belocampo.mg.gov.br',
    phone: '(31) 3000-1111',
    address: 'Praça da Matriz, s/n - Centro',
    population: 12450,
    active: false,
    linkedEntityId: 'e1',
    linkedEntityName: 'Entidade Exemplo',
    status: 'Inativa' as any
  },
];

export const MOCK_UNITS: Unit[] = [
  {
    id: 'u1',
    cnes: '1234567',
    name: 'UBS Central',
    municipalityId: 'm1',
    active: true,
    type: 'UBS',
    address: 'Rua Principal, 100',
    neighborhood: 'Centro',
    directorName: 'Enf. Carla',
    phone: '(11) 9999-8888',
    entityId: 'e1',
    entityName: 'Entidade Exemplo'
  },
  {
    id: 'u2',
    cnes: '7654321',
    name: 'Hospital Municipal',
    municipalityId: 'm1',
    active: true,
    type: 'Hospital',
    address: 'Av. da Saúde, 500',
    neighborhood: 'Jardim América',
    directorName: 'Dr. House',
    phone: '(11) 3333-4444',
    entityId: 'e1',
    entityName: 'Entidade Exemplo'
  },
  {
    id: 'u3',
    cnes: '1122334',
    name: 'PSF Vila Nova',
    municipalityId: 'm2',
    active: true,
    type: 'UBS',
    address: 'Rua B, 20',
    neighborhood: 'Vila Nova',
    directorName: 'Enf. Pedro',
    phone: '(64) 3333-2222',
    entityId: 'e1',
    entityName: 'Entidade Exemplo'
  },
  {
    id: 'u4',
    cnes: '4433221',
    name: 'UPA 24h',
    municipalityId: 'm2',
    active: false,
    type: 'UPA',
    address: 'Rodovia BR-060, km 2',
    neighborhood: 'Industrial',
    directorName: 'Dra. Ana',
    phone: '(64) 3333-5555',
    entityId: 'e1',
    entityName: 'Entidade Exemplo'
  },
  {
    id: 'u5',
    cnes: '9988776',
    name: 'Centro de Saúde',
    municipalityId: 'm3',
    active: true,
    type: 'Policlínica',
    address: 'Praça da Matriz, 5',
    neighborhood: 'Centro',
    directorName: 'Sr. João',
    phone: '(31) 3333-1111',
    entityId: 'e1',
    entityName: 'Entidade Exemplo'
  },
];

export const MOCK_PROFESSIONALS: Professional[] = [
  {
    id: 'p1',
    cns: '700001',
    name: 'Dr. Carlos Silva',
    occupation: 'Médico Clínico',
    municipalityId: 'm1',
    unitId: 'u1',
    active: true,
    email: 'carlos.silva@email.com',
    accessGranted: true,
    entityId: 'e1',
    entityName: 'Entidade Exemplo',
    cpf: '123.456.789-00',
    phone: '(11) 99999-9999',
    assignments: [
      { unitId: 'u1', unitName: 'UBS Central', municipalityId: 'm1', municipalityName: 'São Paulo do Sul', occupation: 'Médico Clínico', registerClass: 'CRM 123', active: true }
    ]
  },
  {
    id: 'p2',
    cns: '700002',
    name: 'Enf. Maria Souza',
    occupation: 'Enfermeira',
    municipalityId: 'm1',
    unitId: 'u1',
    active: true,
    email: 'maria.souza@email.com',
    accessGranted: false,
    entityId: 'e1',
    entityName: 'Entidade Exemplo',
    cpf: '234.567.890-11',
    phone: '(11) 98888-8888',
    assignments: [
      { unitId: 'u1', unitName: 'UBS Central', municipalityId: 'm1', municipalityName: 'São Paulo do Sul', occupation: 'Enfermeira', registerClass: 'COREN 456', active: true }
    ]
  },
  {
    id: 'p3',
    cns: '700003',
    name: 'Dr. João Santos',
    occupation: 'Pediatra',
    municipalityId: 'm2',
    unitId: 'u3',
    active: true,
    email: 'joao.santos@email.com',
    accessGranted: false,
    entityId: 'e1',
    entityName: 'Entidade Exemplo',
    cpf: '345.678.901-22',
    phone: '(64) 97777-7777',
    assignments: [
      { unitId: 'u3', unitName: 'PSF Vila Nova', municipalityId: 'm2', municipalityName: 'Rio Verde do Norte', occupation: 'Pediatra', registerClass: 'CRM 789', active: true }
    ]
  },
  {
    id: 'p4',
    cns: '700004',
    name: 'Tec. Ana Lima',
    occupation: 'Técnico de Enfermagem',
    municipalityId: 'm3',
    unitId: 'u5',
    active: true,
    email: 'ana.lima@email.com',
    accessGranted: true,
    entityId: 'e1',
    entityName: 'Entidade Exemplo',
    cpf: '456.789.012-33',
    phone: '(31) 96666-6666',
    assignments: [
      { unitId: 'u5', unitName: 'Centro de Saúde', municipalityId: 'm3', municipalityName: 'Belo Campo', occupation: 'Técnico de Enfermagem', registerClass: 'COREN 321', active: true }
    ]
  },
  {
    id: 'p5',
    cns: '700005',
    name: 'Dr. Pedro Álvares',
    occupation: 'Cirurgião',
    municipalityId: 'm1',
    unitId: 'u2',
    active: true,
    email: 'pedro.alvares@email.com',
    accessGranted: false,
    entityId: 'e1',
    entityName: 'Entidade Exemplo',
    cpf: '567.890.123-44',
    phone: '(11) 95555-5555',
    assignments: [
      { unitId: 'u2', unitName: 'Hospital Municipal', municipalityId: 'm1', municipalityName: 'São Paulo do Sul', occupation: 'Cirurgião', registerClass: 'CRM 654', active: true }
    ]
  },
];

export const MOCK_GOALS: Goal[] = [
  // --- Competência 07/2024 ---
  // UBS Central (u1)
  {
    id: 'g1',
    competence: '07/2024',
    competenceMonth: '2024-07',
    unitId: 'u1',
    unitName: 'UBS Central',
    municipalityId: 'm1',
    municipalityName: 'São Paulo do Sul',
    entityId: 'e1',
    entityName: 'Entidade Exemplo',
    entityType: 'private',
    professionalId: 'p1',
    professionalName: 'Dr. Carlos Silva',
    goalType: 'professional',
    description: 'Consultas Médicas Atenção Básica',
    procedureCode: '03.01.01.007-2',
    procedureName: 'Consulta Médica em Atenção Básica',
    procedureGroup: 'Atenção Básica',
    targetQuantity: 450,
    currentQuantity: 200,
    unitValue: 10.00,
    totalValue: 4500.00,
    shift: 'Manhã',
    daysOfWeek: ['seg', 'qua', 'sex'],
    status: 'on_track'
  },
  {
    id: 'g1b',
    competence: '07/2024',
    competenceMonth: '2024-07',
    unitId: 'u1',
    unitName: 'UBS Central',
    municipalityId: 'm1',
    municipalityName: 'São Paulo do Sul',
    entityId: 'e1',
    entityName: 'Entidade Exemplo',
    entityType: 'private',
    professionalId: 'p2',
    professionalName: 'Enf. Maria Souza',
    goalType: 'professional',
    description: 'Visitas Domiciliares',
    procedureCode: '03.01.01.013-7',
    procedureName: 'Visita Domiciliar por Profissional de Nível Superior',
    procedureGroup: 'Atenção Básica',
    targetQuantity: 60,
    currentQuantity: 55,
    unitValue: 0,
    totalValue: 0,
    shift: 'Tarde',
    daysOfWeek: ['ter', 'qui'],
    status: 'completed'
  },
  // Hospital Municipal (u2)
  {
    id: 'g4',
    competence: '07/2024',
    competenceMonth: '2024-07',
    unitId: 'u2',
    unitName: 'Hospital Municipal',
    municipalityId: 'm1',
    municipalityName: 'São Paulo do Sul',
    entityId: 'e1',
    entityName: 'Entidade Exemplo',
    entityType: 'private',
    professionalId: 'p5',
    professionalName: 'Dr. Pedro Álvares',
    goalType: 'professional',
    description: 'Pequenas Cirurgias Ambulatoriais',
    procedureCode: '04.01.01.005-8',
    procedureName: 'Exérese de Tumor de Pele',
    procedureGroup: 'Procedimentos Cirúrgicos',
    targetQuantity: 30,
    currentQuantity: 5,
    unitValue: 150.00,
    totalValue: 4500.00,
    shift: 'Manhã',
    daysOfWeek: ['sex'],
    status: 'risk'
  },
  {
    id: 'g5',
    competence: '07/2024',
    competenceMonth: '2024-07',
    unitId: 'u2',
    unitName: 'Hospital Municipal',
    municipalityId: 'm1',
    municipalityName: 'São Paulo do Sul',
    entityId: 'e1',
    entityName: 'Entidade Exemplo',
    entityType: 'private',
    professionalId: 'p5',
    professionalName: 'Dr. Pedro Álvares',
    goalType: 'professional',
    description: 'Consultas Pré-Operatórias',
    procedureCode: '03.01.01.007-2',
    procedureName: 'Consulta Médica em Atenção Especializada',
    procedureGroup: 'Atenção Especializada',
    targetQuantity: 100,
    currentQuantity: 80,
    unitValue: 10.00,
    totalValue: 1000.00,
    shift: 'Tarde',
    daysOfWeek: ['sex'],
    status: 'on_track'
  },

  // --- Competência 06/2024 ---
  // UBS Central (u1)
  {
    id: 'g2',
    competence: '06/2024',
    competenceMonth: '2024-06',
    unitId: 'u1',
    unitName: 'UBS Central',
    municipalityId: 'm1',
    municipalityName: 'São Paulo do Sul',
    entityId: 'e1',
    entityName: 'Entidade Exemplo',
    entityType: 'private',
    professionalId: 'p1',
    professionalName: 'Dr. Carlos Silva',
    goalType: 'professional',
    description: 'Consultas Médicas (Histórico)',
    procedureCode: '03.01.01.007-2',
    procedureName: 'Consulta Médica em Atenção Básica',
    procedureGroup: 'Atenção Básica',
    targetQuantity: 400,
    currentQuantity: 400,
    unitValue: 10.00,
    totalValue: 4000.00,
    shift: 'Manhã',
    daysOfWeek: ['seg', 'qua', 'sex'],
    status: 'completed'
  },
  // PSF Vila Nova (u3)
  {
    id: 'g3',
    competence: '06/2024',
    competenceMonth: '2024-06',
    unitId: 'u3',
    unitName: 'PSF Vila Nova',
    municipalityId: 'm2',
    municipalityName: 'Rio Verde do Norte',
    entityId: 'e1',
    entityName: 'Entidade Exemplo',
    entityType: 'private',
    professionalId: 'p3',
    professionalName: 'Dr. João Santos',
    goalType: 'professional',
    description: 'Puericultura',
    procedureCode: '03.01.01.004-8',
    procedureName: 'Consulta de Profissionais de Nível Superior na Atenção Especializada (Pediatria)',
    procedureGroup: 'Atenção Especializada',
    targetQuantity: 120,
    currentQuantity: 45,
    unitValue: 10.00,
    totalValue: 1200.00,
    shift: 'Integral',
    daysOfWeek: ['seg', 'ter', 'qua', 'qui', 'sex'],
    status: 'risk'
  }
];

export const MOCK_PRODUCTION_STATS: ProductionStats[] = [
  { month: 'Jan', consultations: 1200, procedures: 4500, audited: 4400, rejected: 100 },
  { month: 'Fev', consultations: 1350, procedures: 4800, audited: 4750, rejected: 50 },
  { month: 'Mar', consultations: 1100, procedures: 4200, audited: 4100, rejected: 100 },
  { month: 'Abr', consultations: 1600, procedures: 5200, audited: 5100, rejected: 100 },
  { month: 'Mai', consultations: 1800, procedures: 6000, audited: 5900, rejected: 100 },
  { month: 'Jun', consultations: 1750, procedures: 5800, audited: 5750, rejected: 50 },
];

export const MOCK_EXPORTS: BPAFile[] = [
  { id: 'bpa1', competence: '06/2024', type: 'BPA-C', municipalityName: 'São Paulo do Sul', lines: 1540, generatedAt: '2024-06-25', status: 'processed', hash: 'a1b2c3d4' },
  { id: 'bpa2', competence: '06/2024', type: 'BPA-I', municipalityName: 'São Paulo do Sul', lines: 320, generatedAt: '2024-06-25', status: 'processed', hash: 'x9y8z7w6' },
  { id: 'bpa3', competence: '05/2024', type: 'BPA-C', municipalityName: 'Rio Verde do Norte', lines: 1100, generatedAt: '2024-05-28', status: 'error' },
  { id: 'bpa4', competence: '07/2024', type: 'BPA-MAG', municipalityName: 'São Paulo do Sul', lines: 71900, generatedAt: '2024-07-30', status: 'processed', hash: 'mag_12345' },
  { id: 'bpa5', competence: '07/2024', type: 'BPA-MAG', municipalityName: 'Rio Verde do Norte', lines: 32500, generatedAt: '2024-07-30', status: 'processed', hash: 'mag_67890' },
];

export const MOCK_DOCUMENTS: EntityDocument[] = [
  { id: 'doc1', title: 'Contrato de Gestão 001/2023', type: 'Contrato', municipalityId: 'm1', uploadDate: '2023-01-15', validUntil: '2025-01-15', status: 'active', size: '2.5 MB' },
  { id: 'doc2', title: 'Termo Aditivo 01 - Reajuste', type: 'Termo Aditivo', municipalityId: 'm1', uploadDate: '2024-01-20', validUntil: '2025-01-15', status: 'active', size: '0.8 MB' },
  { id: 'doc3', title: 'Contrato Emergencial Rio Verde', type: 'Contrato', municipalityId: 'm2', uploadDate: '2023-06-01', validUntil: '2023-12-31', status: 'expired', size: '1.2 MB' },
  { id: 'doc4', title: 'Portaria de Nomeação da Diretoria', type: 'Portaria', uploadDate: '2024-02-10', status: 'active', size: '0.3 MB' },
];

export const MOCK_TICKETS: SupportTicket[] = [
  { id: 't1', protocol: '20240815001', type: 'Erro no Sistema', subject: 'Falha na exportação BPA-MAG', description: 'O arquivo não está gerando o hash corretamente.', status: 'in_progress', priority: 'high', createdAt: '2024-08-15T10:30:00', lastUpdate: '2024-08-15T14:00:00', hasAttachment: true },
  { id: 't2', protocol: '20240814055', type: 'Dúvida', subject: 'Como cadastrar nova unidade?', description: 'Não estou achando o botão de vincular.', status: 'resolved', priority: 'low', createdAt: '2024-08-14T09:00:00', lastUpdate: '2024-08-14T11:20:00', hasAttachment: false },
  { id: 't3', protocol: '20240810120', type: 'Solicitação de Acesso', subject: 'Liberar usuário João Silva', description: 'Novo coordenador de Rio Verde.', status: 'closed', priority: 'medium', createdAt: '2024-08-10T16:45:00', lastUpdate: '2024-08-11T09:00:00', hasAttachment: false },
];

export const CHART_COLORS_PUBLIC = {
  primary: '#3b82f6',
  secondary: '#60a5fa',
  tertiary: '#93c5fd',
};

export const CHART_COLORS_PRIVATE = {
  primary: '#10b981',
  secondary: '#34d399',
  tertiary: '#6ee7b7',
};

export const CBO_LIST = [
  {
    group: 'Médicos',
    options: [
      { value: '225125', label: '225125 – Médico Clínico' },
      { value: '225124', label: '225124 – Médico Pediatra' },
      { value: '225250', label: '225250 – Médico Ginecologista e Obstetra' },
      { value: '225142', label: '225142 – Médico da Estratégia de Saúde da Família' },
      { value: '225130', label: '225130 – Médico de Família e Comunidade' },
      { value: '225170', label: '225170 – Médico Generalista' },
      { value: '225120', label: '225120 – Médico Cardiologista' },
      { value: '225135', label: '225135 – Médico Dermatologista' },
      { value: '225133', label: '225133 – Médico Psiquiatra' },
      { value: '225270', label: '225270 – Médico Ortopedista e Traumatologista' },
      { value: '225265', label: '225265 – Médico Oftalmologista' },
      { value: '225275', label: '225275 – Médico Otorrinolaringologista' },
      { value: '225112', label: '225112 – Médico Neurologista' },
      { value: '225155', label: '225155 – Médico Endocrinologista e Metabologista' },
      { value: '225103', label: '225103 – Médico Infectologista' },
      { value: '225225', label: '225225 – Médico Cirurgião Geral' },
      { value: '225165', label: '225165 – Médico Gastroenterologista' },
      { value: '225127', label: '225127 – Médico Pneumologista' },
      { value: '225180', label: '225180 – Médico Geriatra' },
      { value: '225140', label: '225140 – Médico do Trabalho' },
      { value: '225136', label: '225136 – Médico Reumatologista' },
      { value: '225285', label: '225285 – Médico Urologista' },
      { value: '225151', label: '225151 – Médico Anestesiologista' },
      { value: '225320', label: '225320 – Médico em Radiologia e Diagnóstico por Imagem' },
      { value: '225109', label: '225109 – Médico Nefrologista' },
      { value: '225210', label: '225210 – Médico Cirurgião Cardiovascular' },
      { value: '225255', label: '225255 – Médico Mastologista' },
      { value: '225105', label: '225105 – Médico Acupunturista' },
      { value: '225110', label: '225110 – Médico Alergista e Imunologista' },
      { value: '225160', label: '225160 – Médico Fisiatra' },
      { value: '225185', label: '225185 – Médico Hematologista' },
      { value: '225195', label: '225195 – Médico Homeopata' },
      { value: '225154', label: '225154 – Médico Antroposófico' },
      { value: '225139', label: '225139 – Médico Sanitarista' },
      { value: '2231F9', label: '2231F9 – Médico Residente' }
    ]
  },
  {
    group: 'Enfermagem',
    options: [
      { value: '223505', label: '223505 – Enfermeiro' },
      { value: '223565', label: '223565 – Enfermeiro da Estratégia de Saúde da Família' },
      { value: '223545', label: '223545 – Enfermeiro Obstétrico' },
      { value: '223555', label: '223555 – Enfermeiro Puericultor e Pediátrico' },
      { value: '223550', label: '223550 – Enfermeiro Psiquiátrico' },
      { value: '223530', label: '223530 – Enfermeiro do Trabalho' },
      { value: '223560', label: '223560 – Enfermeiro Sanitarista' },
      { value: '223525', label: '223525 – Enfermeiro de Terapia Intensiva' },
      { value: '322205', label: '322205 – Técnico de Enfermagem' },
      { value: '322245', label: '322245 – Técnico de Enfermagem da ESF' },
      { value: '322230', label: '322230 – Auxiliar de Enfermagem' },
      { value: '322250', label: '322250 – Auxiliar de Enfermagem da ESF' }
    ]
  },
  {
    group: 'Odontologia',
    options: [
      { value: '223208', label: '223208 – Cirurgião Dentista - Clínico Geral' },
      { value: '223293', label: '223293 – Cirurgião-Dentista da ESF' },
      { value: '223204', label: '223204 – Cirurgião Dentista - Auditor' },
      { value: '223212', label: '223212 – Cirurgião Dentista - Endodontista' },
      { value: '223216', label: '223216 – Cirurgião Dentista - Epidemiologista' },
      { value: '223220', label: '223220 – Cirurgião Dentista - Estomatologista' },
      { value: '223224', label: '223224 – Cirurgião Dentista - Implantodontista' },
      { value: '223228', label: '223228 – Cirurgião Dentista - Odontogeriatra' },
      { value: '223232', label: '223232 – Cirurgião Dentista - Odontologista Legal' },
      { value: '223236', label: '223236 – Cirurgião Dentista - Odontopediatra' },
      { value: '223240', label: '223240 – Cirurgião Dentista - Ortopedista e Ortodontista' },
      { value: '223248', label: '223248 – Cirurgião Dentista - Periodontista' },
      { value: '223252', label: '223252 – Cirurgião Dentista - Protesiólogo Bucomaxilofacial' },
      { value: '223256', label: '223256 – Cirurgião Dentista - Protesista' },
      { value: '223260', label: '223260 – Cirurgião Dentista - Radiologista' },
      { value: '223264', label: '223264 – Cirurgião Dentista - Reabilitador Oral' },
      { value: '223268', label: '223268 – Cirurgião Dentista - Traumatologista Bucomaxilofacial' },
      { value: '223272', label: '223272 – Cirurgião Dentista de Saúde Coletiva' },
      { value: '223276', label: '223276 – Cirurgião Dentista - Odontologia do Trabalho' },
      { value: '223280', label: '223280 – Cirurgião Dentista - Dentística' },
      { value: '223284', label: '223284 – Cirurgião Dentista - Disfunção Temporomandibular' },
      { value: '223288', label: '223288 – Cirurgião Dentista - Pacientes com Necessidades Especiais' },
      { value: '322405', label: '322405 – Técnico em Saúde Bucal' },
      { value: '322425', label: '322425 – Técnico em Saúde Bucal da ESF' },
      { value: '322415', label: '322415 – Auxiliar em Saúde Bucal' },
      { value: '322430', label: '322430 – Auxiliar em Saúde Bucal da ESF' }
    ]
  },
  {
    group: 'Agentes e Vigilância',
    options: [
      { value: '515105', label: '515105 – Agente Comunitário de Saúde (ACS)' },
      { value: '515140', label: '515140 – Agente de Combate às Endemias (ACE)' },
      { value: '322255', label: '322255 – Técnico em Agente Comunitário de Saúde' },
      { value: '515120', label: '515120 – Visitador Sanitário' },
      { value: '515130', label: '515130 – Agente Indígena de Saneamento' },
      { value: '515125', label: '515125 – Agente Indígena de Saúde' },
      { value: '352210', label: '352210 – Agente de Saúde Pública' },
      { value: '515305', label: '515305 – Educador Social' },
      { value: '515310', label: '515310 – Agente de Ação Social' }
    ]
  },
  {
    group: 'Reabilitação e Terapia',
    options: [
      { value: '223605', label: '223605 – Fisioterapeuta Geral' },
      { value: '223650', label: '223650 – Fisioterapeuta Acupunturista' },
      { value: '223660', label: '223660 – Fisioterapeuta do Trabalho' },
      { value: '223630', label: '223630 – Fisioterapeuta Neurofuncional' },
      { value: '223635', label: '223635 – Fisioterapeuta Traumatoortopédica Funcional' },
      { value: '223655', label: '223655 – Fisioterapeuta Esportivo' },
      { value: '223810', label: '223810 – Fonoaudiólogo' },
      { value: '223905', label: '223905 – Terapeuta Ocupacional' },
      { value: '226305', label: '226305 – Musicoterapeuta' },
      { value: '226310', label: '226310 – Arteterapeuta' },
      { value: '226315', label: '226315 – Equoterapeuta' },
      { value: '226320', label: '226320 – Naturólogo' },
      { value: '226105', label: '226105 – Quiropraxista' },
      { value: '226110', label: '226110 – Osteopata' },
      { value: '322125', label: '322125 – Terapeuta Holístico' }
    ]
  },
  {
    group: 'Saúde Mental e Serviço Social',
    options: [
      { value: '251510', label: '251510 – Psicólogo Clínico' },
      { value: '251530', label: '251530 – Psicólogo Social' },
      { value: '251505', label: '251505 – Psicólogo Educacional' },
      { value: '251520', label: '251520 – Psicólogo Hospitalar' },
      { value: '251540', label: '251540 – Psicólogo do Trabalho' },
      { value: '251550', label: '251550 – Psicanalista' },
      { value: '251545', label: '251545 – Neuropsicólogo' },
      { value: '251605', label: '251605 – Assistente Social' },
      { value: '239425', label: '239425 – Psicopedagogo' },
      { value: '239415', label: '239415 – Pedagogo' }
    ]
  },
  {
    group: 'Farmácia, Laboratório e Nutrição',
    options: [
      { value: '223405', label: '223405 – Farmacêutico' },
      { value: '223410', label: '223410 – Farmacêutico Bioquímico' },
      { value: '223415', label: '223415 – Farmacêutico Analista Clínico' },
      { value: '223430', label: '223430 – Farmacêutico em Saúde Pública' },
      { value: '223445', label: '223445 – Farmacêutico Hospitalar e Clínico' },
      { value: '324205', label: '324205 – Técnico em Patologia Clínica' },
      { value: '223710', label: '223710 – Nutricionista' }
    ]
  },
  {
    group: 'Gestão e Administrativo',
    options: [
      { value: '131205', label: '131205 – Diretor de Serviços de Saúde' },
      { value: '131210', label: '131210 – Gerente de Serviços de Saúde' },
      { value: '131225', label: '131225 – Sanitarista (Gestão)' },
      { value: '142340', label: '142340 – Ouvidor' },
      { value: '411010', label: '411010 – Assistente Administrativo' },
      { value: '412110', label: '412110 – Digitador' },
      { value: '422105', label: '422105 – Recepcionista em Geral' },
      { value: '422110', label: '422110 – Recepcionista de Consultório Médico ou Dentário' }
    ]
  },
  {
    group: 'Outros Profissionais',
    options: [
      { value: '224140', label: '224140 – Profissional de Educação Física na Saúde' },
      { value: '234410', label: '234410 – Professor de Educação Física no Ensino Superior' },
      { value: '223305', label: '223305 – Médico Veterinário' },
      { value: '422205', label: '422205 – Telefonista' },
      { value: '422210', label: '422210 – Teleoperador' },
      { value: '422220', label: '422220 – Operador de Rádio Chamada' }
    ]
  }
];