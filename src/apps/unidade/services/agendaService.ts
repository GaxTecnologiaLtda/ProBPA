import { addDays, format, startOfHour, setHours, setMinutes } from 'date-fns';

export type AppointmentStatus =
    | 'LIVRE'
    | 'AGENDADO'
    | 'PRESENTE'
    | 'EM_ATENDIMENTO'
    | 'REALIZADO'
    | 'FALTA'
    | 'CANCELADO'
    | 'NAO_AGUARDOU'
    | 'RESERVA'
    | 'BLOQUEADO'
    | 'AGENDA_FECHADA';

export interface Patient {
    id: string;
    name: string;
    cns: string;
    birthDate: string;
    phone?: string;
    email?: string;
}

export interface Appointment {
    id: string;
    time: string; // HH:mm
    status: AppointmentStatus;
    patient?: Patient;
    type?: 'CONSULTA' | 'RESERVA' | 'RETORNO' | 'VISITA_DOMICILIAR' | 'DEMANDA_ESPONTANEA';
    reserveSubtype?: 'ENTRE_PROFISSIONAIS' | 'REUNIAO' | 'CAPACITACAO' | 'ATIVIDADE_ADMINISTRATIVA';
    observation?: string;
    professionalId: string;
}

export interface DaySchedule {
    date: string; // YYYY-MM-DD
    slots: Appointment[];
}

export interface Professional {
    id: string;
    name: string;
    cbo: string;
}

// Mock Data Generators
const generateSlots = (date: string, professionalId: string): Appointment[] => {
    const slots: Appointment[] = [];
    const startHour = 8;
    const endHour = 17;

    for (let h = startHour; h < endHour; h++) {
        if (h === 12) continue; // Lunch break

        for (let m = 0; m < 60; m += 20) {
            const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            const rand = Math.random();
            let status: AppointmentStatus = 'LIVRE';
            let patient: Patient | undefined = undefined;
            let type: any = undefined;

            // Scenario Generation for Simulation
            if (professionalId === '1') { // Dr. Gabriel (Detailed Scenarios)
                if (h === 8 && m === 0) {
                    status = 'REALIZADO';
                    patient = { id: 'p1', name: 'João da Silva', cns: '700000000000001', birthDate: '10/05/1985' };
                    type = 'CONSULTA';
                } else if (h === 9 && m === 20) {
                    status = 'AGENDADO';
                    patient = { id: 'p2', name: 'Maria Oliveira', cns: '700000000000002', birthDate: '20/10/1990', phone: '(11) 99999-9999' };
                    type = 'RETORNO';
                } else if (h === 10 && m === 0) {
                    status = 'FALTA';
                    patient = { id: 'p3', name: 'Carlos Santos', cns: '700000000000003', birthDate: '15/01/1975' };
                    type = 'CONSULTA';
                } else if (h === 11) {
                    status = 'RESERVA'; // Meeting
                } else if (h === 14 && m === 40) {
                    status = 'CANCELADO';
                    patient = { id: 'p4', name: 'Ana Pereira', cns: '700000000000004', birthDate: '01/01/2000' };
                    type = 'CONSULTA';
                }
            }

            slots.push({
                id: `${date}-${time}-${professionalId}`,
                time,
                status,
                patient,
                type,
                professionalId,
                observation: status === 'RESERVA' ? 'Reunião de Equipe' : ''
            });
        }
    }
    return slots;
};

// Mock Service
export const agendaService = {
    getProfessionals: async (): Promise<Professional[]> => {
        return [
            { id: '1', name: 'Dr. Gabriel Silva', cbo: 'Médico da Estratégia de Saúde da Família' },
            { id: '2', name: 'Enf. Ana Costa', cbo: 'Enfermeira da Estratégia de Saúde da Família' },
            { id: '3', name: 'Dr. Carlos Souza', cbo: 'Cirurgião Dentista - Clínico Geral' }
        ];
    },

    getDaySchedule: async (date: Date, professionalId: string): Promise<DaySchedule> => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 600));
        const dateStr = format(date, 'yyyy-MM-dd');
        return {
            date: dateStr,
            slots: generateSlots(dateStr, professionalId)
        };
    },

    // Stub for searching patient appointments
    getPatientHistory: async (term: string) => {
        await new Promise(resolve => setTimeout(resolve, 800));
        return [
            { id: 'hist1', date: '2025-01-10', time: '09:00', professional: 'Dr. Gabriel Silva', status: 'REALIZADO', type: 'Consulta', professionalId: '1' },
            { id: 'hist2', date: '2024-12-15', time: '14:20', professional: 'Enf. Ana Costa', status: 'FALTA', type: 'Preventivo', professionalId: '2' },
            { id: 'hist3', date: '2026-02-20', time: '10:00', professional: 'Dr. Gabriel Silva', status: 'AGENDADO', type: 'Consulta', professionalId: '1' },
            { id: 'hist4', date: '2026-02-22', time: '08:40', professional: 'Dr. Carlos Souza', status: 'AGENDADO', type: 'Odontologia', professionalId: '3' },
        ];
    }
};
