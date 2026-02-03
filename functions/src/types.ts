
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



// --- SIA/SUS TYPES ---
export interface SiaSusStats {
    competence: string; // e.g., "05/2024"
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
    status: 'success' | 'failed' | 'processing';
    filesCount: number;
}

export interface SiaSusConfig {
    autoSchedule: boolean;
    scheduleDay: number; // e.g., 10
    retentionMonths: number;
    alertEnabled: boolean;
    alertEmail: string;
}

// --- SYSTEM LOGS TYPES ---
export enum LogLevel {
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    CRITICAL = 'CRITICAL'
}

export enum LogSource {
    ADMIN_PANEL = 'Painel Administrativo',
    ENTITY_PANEL = 'Painel da Entidade',
    PRODUCTION_PANEL = 'Painel de Produção'
}

export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    source: LogSource;
    event: string;
    user?: string; // If authenticated
    ip?: string;
    details?: any; // JSON object or string
    userAgent?: string;
}
export interface ProfessionalAssignment {
    unitId: string;
    unitName: string;
    municipalityId: string;
    municipalityName: string;
    occupation: string;
    registerClass: string;
    active: boolean;
}

export interface ProfessionalAccessData {
    professionalId: string;
    email: string;
    entityId: string;
    entityName: string;
    name: string;
    assignments: ProfessionalAssignment[];
    // Legacy fields optional
    municipalityId?: string;
    municipalityName?: string;
    unitId?: string;
    unitName?: string;
    resetPassword?: boolean;
}
