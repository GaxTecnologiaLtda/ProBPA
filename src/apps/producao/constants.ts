import { Procedure, Unit, User, ProductionRecord, SupportTicket } from './types';

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Dr. Ricardo Silva',
  cns: '700000000000001',
  role: 'Médico Clínico',
  email: 'ricardo.silva@sus.gov.br',
  avatar: 'https://picsum.photos/200',
  entityId: 'ent-1',
  entityName: 'Secretaria Municipal de Saúde',
  cbo: '225125', // Médico Clínico (Access to Vaccination allowed)
  units: [
    { id: 'un1', cnes: '1234567', name: 'UBS Santa Cecília', address: 'Rua das Flores, 123' },
    { id: 'un2', cnes: '7654321', name: 'Hospital Geral Central', address: 'Av. Brasil, 500' },
  ]
};

export const MOCK_PROCEDURES: Procedure[] = [
  { code: '0301010072', name: 'CONSULTA MÉDICA EM ATENÇÃO PRIMÁRIA', type: 'BPA-C' },
  { code: '0301010048', name: 'CONSULTA DE PROFISSIONAIS DE NIVEL SUPERIOR', type: 'BPA-C' },
  { code: '0301060061', name: 'ATENDIMENTO DE URGÊNCIA C/ OBSERVAÇÃO ATÉ 24H', type: 'BPA-I' },
  { code: '0201010540', name: 'BIOPSIA DE PELE E PARTES MOLES', type: 'BPA-I' },
  { code: '0401010023', name: 'CURATIVO GRAU I', type: 'BPA-C' },
  { code: '0401010015', name: 'CURATIVO GRAU II', type: 'BPA-C' },
  { code: '0301010110', name: 'VISITA DOMICILIAR PÓS-PARTO', type: 'BPA-C' },
];

export const MOCK_HISTORY: ProductionRecord[] = Array.from({ length: 15 }).map((_, i) => ({
  id: `rec-${i}`,
  date: new Date(Date.now() - i * 86400000).toISOString(),
  procedure: MOCK_PROCEDURES[i % MOCK_PROCEDURES.length],
  quantity: Math.floor(Math.random() * 3) + 1,
  unitId: i % 3 === 0 ? 'un2' : 'un1',
  status: i === 0 ? 'pending' : 'synced',
  patientCns: i % 2 === 0 ? '704000000000000' : undefined
}));

export const CHART_DATA = [
  { name: 'Seg', uv: 12 },
  { name: 'Ter', uv: 19 },
  { name: 'Qua', uv: 15 },
  { name: 'Qui', uv: 22 },
  { name: 'Sex', uv: 28 },
  { name: 'Sáb', uv: 10 },
  { name: 'Dom', uv: 5 },
];

// --- BPA-I Specific Constants ---

export const LISTA_SEXO = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' }
];

export const LISTA_RACA_COR = [
  { value: '01', label: 'Branca' },
  { value: '02', label: 'Preta' },
  { value: '03', label: 'Parda' },
  { value: '04', label: 'Amarela' },
  { value: '05', label: 'Indígena' },
  { value: '99', label: 'Sem Informação' }
];

export const LISTA_NACIONALIDADE = [
  { value: '010', label: 'Brasileira' },
  { value: '000', label: 'Estrangeira' }
];

export const LISTA_CARATER_ATENDIMENTO = [
  { value: '01-AGENDADA', label: 'Eletivo / Agendado' },
  { value: '01-DIA', label: 'Atendimento no Dia (Demanda Espontânea)' },
  { value: '01-ESCUTA', label: 'Escuta Inicial / Orientação' },
  { value: '02', label: 'Urgência' }
];

// --- MOCK BPA-C Consolidated Data ---
export const MOCK_BPA_C_CONSOLIDATED = [
  { seq: '01', code: '0301010072', name: 'CONSULTA MÉDICA ATENÇÃO PRIMÁRIA', cbo: '225125', age: '18', qty: 15 },
  { seq: '02', code: '0301010072', name: 'CONSULTA MÉDICA ATENÇÃO PRIMÁRIA', cbo: '225125', age: '45', qty: 8 },
  { seq: '03', code: '0301010072', name: 'CONSULTA MÉDICA ATENÇÃO PRIMÁRIA', cbo: '225125', age: '60', qty: 12 },
  { seq: '04', code: '0401010023', name: 'CURATIVO GRAU I', cbo: '223505', age: '25', qty: 5 },
  { seq: '05', code: '0401010023', name: 'CURATIVO GRAU I', cbo: '223505', age: '32', qty: 3 },
  { seq: '06', code: '0301010110', name: 'VISITA DOMICILIAR PÓS-PARTO', cbo: '225125', age: '22', qty: 2 },
  { seq: '07', code: '0301010110', name: 'VISITA DOMICILIAR PÓS-PARTO', cbo: '225125', age: '28', qty: 4 },
  { seq: '08', code: '0301060061', name: 'ATENDIMENTO URGÊNCIA', cbo: '225125', age: '40', qty: 1 },
];

// --- Support Data ---

export const SUPPORT_CATEGORIES = [
  { value: 'bug', label: 'Erro no Sistema' },
  { value: 'doubt_fill', label: 'Dúvida de Preenchimento (BPA)' },
  { value: 'access', label: 'Problema de Acesso/Login' },
  { value: 'suggestion', label: 'Sugestão de Melhoria' },
  { value: 'other', label: 'Outro Assunto' }
];

export const MOCK_TICKETS: SupportTicket[] = [
  {
    id: '#2024-1029',
    date: '2024-05-10T14:30:00Z',
    category: 'Erro no Sistema',
    subject: 'Não consigo visualizar meus relatórios de Abril',
    description: 'Ao clicar na aba relatórios e selecionar Abril, a tela fica branca.',
    status: 'open',
    lastUpdate: '2024-05-10T14:30:00Z'
  },
  {
    id: '#2024-0988',
    date: '2024-04-28T09:15:00Z',
    category: 'Dúvida de Preenchimento (BPA)',
    subject: 'Qual CBO utilizar para vacinação?',
    description: 'Estou em dúvida se utilizo o CBO de técnico ou enfermeiro.',
    status: 'answered',
    lastUpdate: '2024-04-29T10:00:00Z'
  },
  {
    id: '#2024-0850',
    date: '2024-03-15T11:20:00Z',
    category: 'Sugestão de Melhoria',
    subject: 'Adicionar modo escuro automático',
    description: 'Seria legal se o sistema detectasse o tema do sistema operacional.',
    status: 'closed',
    lastUpdate: '2024-03-20T16:45:00Z'
  }
];

// --- CDS 02 CONSTANTS ---

export const LISTA_ESCOLARIDADE = [
  { value: '01', label: 'Creche' },
  { value: '02', label: 'Pré-escola' },
  { value: '11', label: 'Alfabetização' },
  { value: '03', label: 'Ensino Fundamental Incompleto' },
  { value: '04', label: 'Ensino Fundamental Completo' },
  { value: '05', label: 'Ensino Médio Incompleto' },
  { value: '06', label: 'Ensino Médio Completo' },
  { value: '07', label: 'Superior Incompleto' },
  { value: '08', label: 'Superior Completo' },
  { value: '09', label: 'Especialização/Residência' },
  { value: '10', label: 'Mestrado/Doutorado' },
  { value: '15', label: 'Não frequentou escola' },
];

export const LISTA_ORIENTACAO_SEXUAL = [
  { value: '148', label: 'Heterossexual' },
  { value: '149', label: 'Lésbica' },
  { value: '150', label: 'Gay' },
  { value: '151', label: 'Bissexual' },
  { value: '152', label: 'Outro' },
];

export const LISTA_IDENTIDADE_GENERO = [
  { value: '153', label: 'Homem Cisgênero' },
  { value: '154', label: 'Mulher Cisgênero' },
  { value: '155', label: 'Homem Transgênero' },
  { value: '156', label: 'Mulher Transgênero' },
  { value: '157', label: 'Travesti' },
  { value: '158', label: 'Outro' },
];

export const LISTA_SITUACAO_MERCADO = [
  { value: '66', label: 'Empregado com carteira assinada' },
  { value: '67', label: 'Empregado sem carteira assinada' },
  { value: '68', label: 'Autônomo com previdência social' },
  { value: '69', label: 'Autônomo sem previdência social' },
  { value: '70', label: 'Aposentado/Pensionista' },
  { value: '71', label: 'Desempregado' },
  { value: '72', label: 'Não trabalha' },
  { value: '73', label: 'Servidor público/Militar' },
  { value: '74', label: 'Empregador' },
  { value: '75', label: 'Outra' }
];

export const MOCK_GOALS = [
  {
    id: 'g1',
    competence: '2024-05',
    unitId: 'un1',
    procedureCode: '0301010072',
    procedureName: 'CONSULTA MÉDICA EM ATENÇÃO PRIMÁRIA',
    targetQuantity: 100,
    currentQuantity: 85,
    unitValue: 10.00
  },
  {
    id: 'g2',
    competence: '2024-05',
    unitId: 'un1',
    procedureCode: '0301010048',
    procedureName: 'CONSULTA DE PROFISSIONAIS DE NIVEL SUPERIOR',
    targetQuantity: 50,
    currentQuantity: 12,
    unitValue: 6.50
  },
  {
    id: 'g3',
    competence: '2024-05',
    unitId: 'un2',
    procedureCode: '0301060061',
    procedureName: 'ATENDIMENTO DE URGÊNCIA C/ OBSERVAÇÃO ATÉ 24H',
    targetQuantity: 200,
    currentQuantity: 195,
    unitValue: 12.50
  },
  {
    id: 'g4',
    competence: '2024-04',
    unitId: 'un1',
    procedureCode: '0301010072',
    procedureName: 'CONSULTA MÉDICA EM ATENÇÃO PRIMÁRIA',
    targetQuantity: 100,
    currentQuantity: 98,
    unitValue: 10.00
  }
];

export const LISTA_CONDICOES_SAUDE = [
  { key: 'statusEhGestante', label: 'Está Gestante?' },
  { key: 'statusEhFumante', label: 'Fumante' },
  { key: 'statusEhDependenteAlcool', label: 'Uso de Álcool' },
  { key: 'statusEhDependenteOutrasDrogas', label: 'Uso de Outras Drogas' },
  { key: 'statusTemHipertensaoArterial', label: 'Hipertensão Arterial' },
  { key: 'statusTemDiabetes', label: 'Diabetes' },
  { key: 'statusTeveAvcDerrame', label: 'Teve AVC / Derrame' },
  { key: 'statusTeveInfarto', label: 'Teve Infarto' },
  { key: 'statusTemDoencaCardiaca', label: 'Doença Cardíaca' },
  { key: 'statusTemDoencaRespiratoria', label: 'Doença Respiratória (Asma/DPOC)' },
  { key: 'statusTemDoencaRins', label: 'Doença Renal' },
  { key: 'statusTemHanseniase', label: 'Tem Hanseníase' },
  { key: 'statusTemTuberculose', label: 'Tem Tuberculose' },
  { key: 'statusTemTeveCancer', label: 'Tem/Teve Câncer' },
  { key: 'statusTeveInternadoem12Meses', label: 'Internado nos últimos 12 meses?' },
  { key: 'statusDiagnosticoMental', label: 'Diagnóstico de Problema Mental?' },
  { key: 'statusEstaAcamado', label: 'Está Acamado?' },
  { key: 'statusEstaDomiciliado', label: 'Está Domiciliado?' },
  { key: 'statusUsaPlantasMedicinais', label: 'Usa Plantas Medicinais?' },
  { key: 'statusUsaOutrasPraticasIntegrativasOuComplementares', label: 'Usa PICS?' }
];

// --- CDS 10 VACCINATION CONSTANTS ---

export const LISTA_ESTRATEGIA_VACINACAO = [
  { value: '1', label: 'Rotina' },
  { value: '2', label: 'Campanha' },
  { value: '3', label: 'Bloqueio' },
  { value: '4', label: 'Soroterapia' },
  { value: '5', label: 'Pandemia' },
  { value: '6', label: 'Pós-Exposição' }
];

export const LISTA_DOSE_VACINACAO = [
  { value: '3X', label: 'Dose Única' },
  { value: '1', label: '1ª Dose' },
  { value: '2', label: '2ª Dose' },
  { value: '3', label: '3ª Dose' },
  { value: '4', label: '4ª Dose' },
  { value: '5', label: '5ª Dose' },
  { value: 'R1', label: 'Reforço' },
  { value: 'R2', label: '2º Reforço' },
  { value: 'D1', label: 'Dose Inicial' },
  { value: 'DA', label: 'Dose Anual' }
];

export const LISTA_IMUNOBIOLOGICOS = [
  { value: '2', label: 'BCG - Bacilo Calmette-Guérin' },
  { value: '17', label: 'Hepatite B' },
  { value: '22', label: 'Penta (DTP/Hib/Hep B)' },
  { value: '10', label: 'VIP (Poliomielite Inativada)' },
  { value: '40', label: 'VOP (Poliomielite Oral)' },
  { value: '25', label: 'Rotavírus Humano' },
  { value: '28', label: 'Pneumocócica 10 Valente' },
  { value: '29', label: 'Meningocócica C' },
  { value: '21', label: 'DTP (Tríplice Bacteriana)' },
  { value: '43', label: 'Hepatite A' },
  { value: '27', label: 'Tríplice Viral (Sarampo, Caxumba, Rubéola)' },
  { value: '35', label: 'Tetra Viral (Sarampo, Caxumba, Rubéola, Varicela)' },
  { value: '12', label: 'Varicela' },
  { value: '14', label: 'HPV Quadrivalente' },
  { value: '13', label: 'Febre Amarela' },
  { value: '33', label: 'Influenza (Gripe - Campanha)' },
  { value: '30', label: 'Influenza (Trivalente)' },
  { value: '55', label: 'COVID-19 (Pfizer Adulto)' },
  { value: '56', label: 'COVID-19 (Pfizer Pediátrica)' },
  { value: '57', label: 'COVID-19 (CoronaVac)' },
  { value: '58', label: 'COVID-19 (AstraZeneca)' },
  { value: '59', label: 'COVID-19 (Janssen)' },
  { value: '99', label: 'Outros Imunobiológicos' }
];

export const LISTA_VIA_ADMINISTRACAO = [
  { value: '1', label: 'Oral' },
  { value: '2', label: 'Intramuscular' },
  { value: '3', label: 'Subcutânea' },
  { value: '4', label: 'Intradérmica' },
  { value: '5', label: 'Intravenosa' },
  { value: '6', label: 'Inalatória' },
  { value: '7', label: 'Nasal' }
];

export const LISTA_LOCAL_APLICACAO = [
  { value: '1', label: 'Deltóide (Braço Direito)' },
  { value: '2', label: 'Deltóide (Braço Esquerdo)' },
  { value: '3', label: 'Vasto Lateral (Coxa Direita)' },
  { value: '4', label: 'Vasto Lateral (Coxa Esquerda)' },
  { value: '5', label: 'Glúteo (Direito)' },
  { value: '6', label: 'Glúteo (Esquerdo)' },
  { value: '7', label: 'Boca' }
];