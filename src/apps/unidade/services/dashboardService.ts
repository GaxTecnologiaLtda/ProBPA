export interface DashboardStats {
    appointmentsToday: {
        total: number;
        attended: number;
        missed: number;
        scheduled: number;
    };
    queueStatus: {
        waiting: number;
        inProgress: number;
        doctorsActive: number;
    };
    alerts: {
        id: string;
        type: 'info' | 'warning' | 'critical';
        message: string;
        timestamp: string;
    }[];
}

export const dashboardService = {
    getStats: async (): Promise<DashboardStats> => {
        return new Promise(resolve => setTimeout(() => resolve({
            appointmentsToday: {
                total: 45,
                attended: 12,
                missed: 2,
                scheduled: 31
            },
            queueStatus: {
                waiting: 8,
                inProgress: 4,
                doctorsActive: 3
            },
            alerts: [
                { id: '1', type: 'warning', message: 'Dra. Ana Costa (Enfermeira) não iniciou atendimentos.', timestamp: '10 min atrás' },
                { id: '2', type: 'info', message: 'Reunião de equipe hoje às 16h.', timestamp: '1 hora atrás' }
            ]
        }), 800));
    }
};
