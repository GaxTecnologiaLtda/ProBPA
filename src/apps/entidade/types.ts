import React from 'react';

export type EntityType = 'public' | 'private';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'auditor';
  entityType: EntityType;
  entityName: string; // Nome da prefeitura ou da fundação
  avatarUrl?: string;
}

export enum LicenseStatus {
  ACTIVE = "Ativa",
  SUSPENDED = "Suspensa",
  EXPIRED = "Expirada",
  INACTIVE = "Inativa"
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
  unitsCount?: number;

  // Interface Configuration
  interfaceType?: 'PEC' | 'SIMPLIFIED';
  // Internal Context (Runtime only)
  _pathContext?: {
    entityType: string;
    entityId: string;
  };
}

export type MunicipalityInput = Omit<Municipality, 'id' | 'usersCount' | '_pathContext'>;

export interface Unit {
  id: string;

  // Vínculo com entidade responsável
  entityId: string;
  entityName: string;
  entityType?: 'public' | 'private';

  // Identificação e vínculo territorial
  cnes: string;
  name: string;
  municipalityId: string;

  active: boolean;

  // Campos adicionais para cadastro completo
  type: 'UBS' | 'Hospital' | 'UPA' | 'CEO' | 'CAPS' | 'Policlínica' | 'Outros';
  address?: string;
  neighborhood?: string;
  directorName?: string;
  phone?: string;
  email?: string;
  professionalsCount?: number;
}

export type UnitInput = Omit<Unit, 'id'>;

export interface ProfessionalAssignment {
  unitId: string;
  unitName: string;
  municipalityId: string;
  municipalityName: string;
  occupation: string;
  registerClass: string;
  cbo?: string;
  active: boolean;
}

export interface Professional {
  id: string;
  entityId: string;
  entityName: string;
  entityType?: 'public' | 'private';

  // Legacy/Primary fields (kept for backward compatibility or primary display)
  municipalityId?: string;
  municipalityName?: string;
  unitId?: string;
  unitName?: string;
  occupation?: string;
  cbo?: string;
  registerClass?: string;
  active?: boolean;

  // New structure
  assignments: ProfessionalAssignment[];

  name: string;
  cpf: string;
  cns: string;
  signatureUrl?: string; // URL da assinatura digitalizada
  signatureBase64?: string;

  email: string;
  phone: string;

  accessGranted: boolean;
  createdAt?: any; // Timestamp
  updatedAt?: any; // Timestamp
}

export interface Goal {
  id: string;

  // Entity Linkage
  entityId: string;
  entityName: string;
  entityType: 'public' | 'private';

  // Location Linkage
  municipalityId: string;
  municipalityName: string;
  unitId: string;
  unitName: string;

  // Professional Linkage
  professionalId: string; // 'team' for team goals or specific professional ID
  professionalName: string;

  // Time
  competenceMonth: string; // YYYY-MM

  // Details
  description: string;
  procedureCode: string;
  procedureName: string;
  procedureGroup: string;

  // Quantification
  targetQuantity: number;
  currentQuantity: number;
  annualTargetQuantity?: number; // Added for Annual Pactuation
  unitValue: number;
  totalValue: number;

  // Criteria
  goalType: 'municipal' | 'unit' | 'professional';
  sigtapTargetType?: 'Group' | 'SubGroup' | 'Form' | 'Procedure'; // Added for Macro/Micro goals
  sigtapSourceCompetence?: string; // Holds the SIGTAP table version used for this goal (YYYYMM or MM/YYYY)
  startMonth?: string; // Start validity (YYYY-MM)
  endMonth?: string; // End validity (YYYY-MM)
  chartData?: { month: string; value: number; label: string }[];
  shift: 'Manhã' | 'Tarde' | 'Noite' | 'Integral';
  daysOfWeek: string[];
  observations?: string;

  // Granular Progress (Added for dual tracking)
  currentQuantityUnit?: number;
  currentQuantityProfessional?: number;

  // Status
  status: 'pending' | 'on_track' | 'risk' | 'completed' | 'attention';

  // Metadata
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;

  // UI Compatibility (optional, derived)
  competence?: string; // MM/YYYY - kept for backward compatibility if needed, but should prefer competenceMonth
}

export interface ProductionStats {
  month: string;
  consultations: number;
  procedures: number;
  audited: number;
  rejected: number;
}

export interface BPAFile {
  id: string;
  competence: string; // MM/AAAA
  type: 'BPA-C' | 'BPA-I' | 'BPA-MAG';
  municipalityName: string;
  lines: number;
  generatedAt: string;
  status: 'processed' | 'pending' | 'error';
  hash?: string;
}

export interface EntityDocument {
  id: string;
  title: string;
  type: 'Contrato' | 'Termo Aditivo' | 'Portaria' | 'Relatório Técnico';
  municipalityId?: string; // Se for específico de um município
  uploadDate: string;
  validUntil?: string;
  status: 'active' | 'expired' | 'archived';
  size: string;
}

export interface SupportTicket {
  id: string;
  protocol: string;
  type: 'Erro no Sistema' | 'Dúvida' | 'Solicitação de Acesso' | 'Financeiro' | 'Sugestão';
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  lastUpdate: string;
  hasAttachment: boolean;
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number; // percentage
  icon: React.ReactNode;
  color?: string;
}