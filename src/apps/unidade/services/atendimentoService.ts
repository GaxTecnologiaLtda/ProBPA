export interface AttendanceItem {
    id: string;
    arrivalTime: string;
    patientName: string;
    patientCns: string;
    professionalName?: string; // or Team
    reason: string;
    status: 'AGUARDANDO' | 'EM_ATENDIMENTO' | 'TRIAGEM' | 'FINALIZADO';
    riskLevel?: 'NAO_URGENTE' | 'POUCO_URGENTE' | 'URGENTE' | 'EMERGENCIA'; // Manchester-ish
}

const MOCK_QUEUE: AttendanceItem[] = [
    {
        id: '1',
        arrivalTime: '08:15',
        patientName: 'João Santos',
        patientCns: '700123456789012',
        professionalName: 'Dr. Gabriel Silva',
        reason: 'Consulta Agendada',
        status: 'AGUARDANDO',
        riskLevel: 'NAO_URGENTE'
    },
    {
        id: '2',
        arrivalTime: '08:30',
        patientName: 'Maria da Silva',
        patientCns: '700987654321098',
        professionalName: 'Enf. Ana Costa',
        reason: 'Febre Alta',
        status: 'TRIAGEM',
        riskLevel: 'URGENTE'
    },
    {
        id: '3',
        arrivalTime: '09:00',
        patientName: 'Pedro Oliveira',
        patientCns: '700555555555555',
        professionalName: 'Dr. Carlos Souza',
        reason: 'Dor de Dente',
        status: 'EM_ATENDIMENTO',
        riskLevel: 'POUCO_URGENTE'
    }
];

export const atendimentoService = {
    getQueue: async (): Promise<AttendanceItem[]> => {
        return new Promise(resolve => setTimeout(() => resolve(MOCK_QUEUE), 600));
    },

    addToQueue: async (item: Omit<AttendanceItem, 'id' | 'status'>) => {
        console.log("Added to queue:", item);
    },

    updateStatus: async (id: string, status: AttendanceItem['status']) => {
        console.log(`Updated ${id} to ${status}`);
    }
};
