

export enum EntityType {
  PUBLIC = 'Pública',
  PRIVATE = 'Privada'
}

export enum LicenseStatus {
  ACTIVE = 'Ativa',
  SUSPENDED = 'Suspensa',
  EXPIRED = 'Expirada',
  INACTIVE = 'Inativa'
}

export enum PaymentStatus {
  PENDING = 'Pendente',
  PAID = 'Pago',
  OVERDUE = 'Vencido'
}

export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  SUPPORT = 'Suporte',
  AUDITOR = 'Auditor'
}

// --- SUPPORT TICKET TYPES ---
export enum TicketStatus {
  OPEN = 'Aberto',
  IN_PROGRESS = 'Em Andamento',
  RESOLVED = 'Concluído'
}

export enum TicketPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

export enum TicketSource {
  MANAGEMENT = 'Painel de Gestão',
  PRODUCTION = 'Painel de Produção'
}

export interface TicketLog {
  id: string;
  message: string;
  createdAt: string;
  type: 'system' | 'note' | 'resolution';
  author: string;
}

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  source: TicketSource;
  entityName: string; // Who opened it
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  resolvedAt?: string;
  requesterName: string;
  logs: TicketLog[];
}

export interface Installment {
  id: string;
  number: number;
  dueDate: string;
  amount: number; // Changed from value to amount to match user request
  paid: boolean;
  paidAt?: string;
  receiptUrl?: string;
  municipalityId?: string; // Linked to a specific municipality (optional)
  municipalityName?: string; // Denormalized name for display
}

export interface Entity {
  id: string;
  name: string;
  cnpj: string;
  type: EntityType;
  location: string; // "City - State"
  status: LicenseStatus;
  createdAt: string;
  // Specific fields
  healthUnits?: number;
  privateType?: 'ONG' | 'Fundação' | 'OS' | 'Instituto' | 'OSC' | 'Empresa';
  municipalityCount?: number;
  responsible?: string;
  email?: string;
  phone?: string;
}

export interface Municipality {
  id: string;
  name: string;
  state: string; // Used in Admin
  uf: string;    // Used in Entity (keep synced with state)
  codeIbge: string;
  population: number;

  // Linkage
  linkedEntityId: string;
  linkedEntityName: string;

  // Contact & Management
  mayorName: string;
  secretaryName: string;
  email: string;
  phone: string;
  address: string;

  // Contractual
  managerEntityType: 'Prefeitura' | 'Consórcio' | 'Fundação' | 'OS';
  responsibleEntity: string;
  cnpj: string;

  // Status
  status: LicenseStatus;
  active: boolean; // Derived/Synced with status

  // Stats (Optional/Computed)
  usersCount?: number;

  // LEDI Configuration (Optional - Admin Panel)
  lediConfig?: {
    apiKey?: string; // Secure API Key
    pecUrl?: string; // Legacy/Optional
    pecUser?: string; // Legacy/Optional
    pecPassword?: string;
    contraChave?: string;
    cnpjRemetente?: string;
    schedule?: string;
    adminPassword?: string; // Password to lock connector settings
    integrationStatus: 'NOT_CONFIGURED' | 'ACTIVE' | 'ERROR' | 'DISABLED';
  };

  // Interface Configuration
  interfaceType?: 'PEC' | 'SIMPLIFIED'; // PEC = Full LEDI/e-SUS, SIMPLIFIED = Basic Production Only
}

export type MunicipalityInput = Omit<Municipality, 'id' | 'usersCount'>;

export interface License {
  id: string;
  entityId: string; // Added
  entityName: string;
  entityType: EntityType;
  startDate: string;
  endDate: string;
  monthlyValue: number; // Renamed from valuePerMunicipality/totalMonthlyValue logic
  annualValue: number; // Added
  valuePerMunicipality: number; // Added for dynamic calculation
  totalMunicipalities: number; // Added
  status: LicenseStatus;
  generatedAt: string; // Added
  lastModified?: string; // Added
  installments?: Installment[];
  history?: LicenseEvent[]; // Added
  // Deprecated/Renamed mappings for compatibility if needed, but better to stick to new schema
  limitMunicipalities?: number; // kept for UI compatibility if needed, or map to totalMunicipalities
  limitUsers?: number;
}

export interface LicenseEvent {
  date: string;
  description: string;
  type: 'ADD_MUNICIPALITY' | 'REMOVE_MUNICIPALITY' | 'STATUS_CHANGE' | 'OTHER';
  details?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLogin: string;
}



// ============================================================================
// SIGTAP DOMAIN MODEL (HIERARCHICAL)
// ============================================================================

export interface SigtapBaseEntity {
  code: string;
  name: string;
}

export interface SigtapRegistro extends SigtapBaseEntity {
  type: 'BPA' | 'APAC' | 'AIH' | 'OUTRO';
}

export interface SigtapCid extends SigtapBaseEntity {
  principal: 'S' | 'N'; // Often in relationship
}

export interface SigtapCbo extends SigtapBaseEntity {
  desc: string; // tb_ocupacao columns if needed
}

export interface SigtapRenases extends SigtapBaseEntity { }
export interface SigtapTuss extends SigtapBaseEntity { }

// Detailed Relationships
export interface SigtapCompatibility {
  code: string; // e.g. Another Procedure Code
  name: string;
  type: 'POSITIVA' | 'NEGATIVA' | 'REDE';
  details?: string;
}

export interface SigtapConditionalRule {
  id: string; // from rl_procedimento_regra_cond
  type: 'COMPATIBILIDADE' | 'CID' | 'CBO' | 'HABILITACAO' | 'IDADE' | 'SEXO';
  description: string; // derived from tb_regra_condicionada
  details: string; // raw values
}

export interface SigtapProcedureDetail {
  code: string;
  name: string;
  competencia: string;
  grupoCode: string;
  subgroupCode: string;
  formaCode: string;

  // Attributes from tb_procedimento
  sex: string; // TP_SEXO
  complexity: string; // TP_COMPLEXIDADE
  ageMin: number; // VL_IDADE_MINIMA (months)
  ageMax: number; // VL_IDADE_MAXIMA (months)
  points: number; // QT_PONTOS
  daysStay: number; // QT_DIAS_PERMANENCIA

  // Relationships
  registros: SigtapRegistro[];
  cids: SigtapCid[]; // Now details: principal/secondary
  modalidades: SigtapBaseEntity[];
  servicos: SigtapBaseEntity[];
  ocupacoes: SigtapCbo[];
  habilitacoes: SigtapBaseEntity[];
  leitos: SigtapBaseEntity[];
  origens: SigtapBaseEntity[];

  // Advanced
  incrementos: any[];
  compatibilidades: SigtapCompatibility[];
  renases: SigtapRenases[];
  tuss: SigtapTuss[];

  // Rules
  regrasCondicionadas: SigtapConditionalRule[];

  // Textual
  descricao: string;
  detalhes: any[];
}

export interface SigtapForma extends SigtapBaseEntity {
  procedimentos: SigtapProcedureDetail[];
}

export interface SigtapSubGroup extends SigtapBaseEntity {
  formas: SigtapForma[];
}

export interface SigtapGroup extends SigtapBaseEntity {
  subgrupos: SigtapSubGroup[];
}

export interface SigtapDomainTree {
  competence: string;
  grupos: SigtapGroup[];

  // Global Lookups (Optimization for some UI uses)
  lookup: {
    cids: SigtapCid[];
    servicos: SigtapBaseEntity[];
    modalidades: SigtapBaseEntity[];
    registros: SigtapRegistro[];
    cbos: SigtapCbo[];
    habilitacoes: SigtapBaseEntity[];
  };

  stats: {
    totalProcedures: number;
    totalGroups: number;
    totalSubgroups: number;
    totalForms: number;
  };
}

// ============================================================================
// PARSER UTILS
// ============================================================================

export interface SigtapField {
  name: string;
  len: number;
  start: number;
  end: number;
  type: 'C' | 'N';
}

export interface ParsedTable {
  tableName: string;
  rows: any[];
}

export interface SigtapImportOps {
  currentFile: string;
  progress: number; // 0-100
  status: string;
  logs: string[];
}

// Legacy / Shared Types
export interface SiaSusStats {
  competence: string;
  totalProcedures: number;
  totalCbos: number;
  totalCids: number;
  lastUpdate: string;
}

export interface SiaSusHistory {
  id: string;
  competence: string;
  importedBy: string;
  importedAt: string;
  sourceUrl: string;
  status: 'success' | 'failed' | 'processing' | 'warning';
  filesCount: number;
  importedFiles?: string[];
  bpaProcedureCount?: number;
}

// ============================================================================
// LOGGING TYPES
// ============================================================================

export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum LogSource {
  ADMIN_PANEL = 'Admin Panel',
  ENTITY_PANEL = 'Entity Panel',
  PRODUCTION_PANEL = 'Production Panel'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  event: string;
  user: string;
  ip: string;
  userAgent?: string;
  details?: any;
}