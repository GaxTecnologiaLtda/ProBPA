export interface User {
  id: string;
  name: string;
  cns: string;
  role: string;
  avatar: string;
  email: string;
  entityId: string;
  entityName: string;
  entityType?: 'PUBLIC' | 'PRIVATE' | 'Privada' | 'Publica' | string; // Ensure we capture it
  professionalId?: string; // Firestore Document ID (from claims)
  units: Unit[];
  cbo?: string;
  registry?: string; // CRM, COREN, etc.
  phone?: string;
}

export interface Unit {
  id: string;
  cnes?: string;
  name: string;
  address?: string;
  municipalityId?: string;
  municipalityName?: string;
  occupation?: string;
  registerClass?: string; // CRM, COREN, etc.
  type?: string; // UBS, POLICLINICA, etc.
}

export interface Procedure {
  code: string;
  name: string;
  type: 'BPA-C' | 'BPA-I';
}

export interface ProductionRecord {
  id: string;
  date: string; // ISO string
  procedure: Procedure;
  quantity: number;
  unitId: string;
  patientCns?: string;
  patientCpf?: string;
  cidCodes?: string[];
  status: 'synced' | 'pending' | 'error' | 'canceled';
  observations?: string;
  firestorePath?: string; // For direct delete/update operations
}

export interface DashboardStats {
  today: number;
  month: number;
  goal: number;
  goalPercent: number;
}

export interface SupportTicket {
  id: string;
  date: string;
  category: string;
  subject: string;
  description: string;
  status: 'open' | 'answered' | 'closed';
  lastUpdate: string;
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
  unitValue: number;
  totalValue: number;

  // Criteria
  shift: 'Manhã' | 'Tarde' | 'Noite' | 'Integral';
  daysOfWeek: string[];
  observations?: string;

  // Status
  status: 'pending' | 'on_track' | 'risk' | 'completed';

  // Metadata
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;

  // UI Compatibility (optional, derived)
  competence?: string; // MM/YYYY
}