export interface Shift {
    id: string;
    dayOfWeek: number; // 0-6 (Sun-Sat)
    startTime: string;
    endTime: string;
    type: 'ATENDIMENTO' | 'VISITA_DOMICILIAR' | 'REUNIAO' | 'ATIVIDADE_COLETIVA';
}

export interface ProfessionalRoster {
    professionalId: string;
    professionalName: string;
    cbo: string;
    shifts: Shift[];
}

const MOCK_ROSTER: ProfessionalRoster[] = [
    {
        professionalId: '1',
        professionalName: 'Dr. Gabriel Silva',
        cbo: 'Médico',
        shifts: [
            { id: 's1', dayOfWeek: 1, startTime: '08:00', endTime: '12:00', type: 'ATENDIMENTO' },
            { id: 's2', dayOfWeek: 1, startTime: '13:00', endTime: '17:00', type: 'ATENDIMENTO' },
            { id: 's3', dayOfWeek: 3, startTime: '08:00', endTime: '12:00', type: 'VISITA_DOMICILIAR' },
        ]
    },
    {
        professionalId: '2',
        professionalName: 'Enf. Ana Costa',
        cbo: 'Enfermeira',
        shifts: [
            { id: 's4', dayOfWeek: 1, startTime: '07:00', endTime: '13:00', type: 'ATENDIMENTO' },
            { id: 's5', dayOfWeek: 2, startTime: '07:00', endTime: '13:00', type: 'ATENDIMENTO' },
            { id: 's6', dayOfWeek: 5, startTime: '14:00', endTime: '16:00', type: 'REUNIAO' },
        ]
    }
];

export const escalaService = {
    getRoster: async (): Promise<ProfessionalRoster[]> => {
        return new Promise(resolve => setTimeout(() => resolve(MOCK_ROSTER), 500));
    }
};
