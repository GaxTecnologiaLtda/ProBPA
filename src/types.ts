export enum EntityType {
    PUBLIC = "Pública",
    PRIVATE = "Privada"
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
}

export type MunicipalityInput = Omit<Municipality, 'id' | 'usersCount'>;
