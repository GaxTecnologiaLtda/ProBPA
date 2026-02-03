import { loadBpaIRecords } from './bpaConsolidationService';

export const loadBpaIForCompetence = async (competenceMonth: string, user: any) => {
    try {
        const records = await loadBpaIRecords(competenceMonth, user);
        return records;
    } catch (error) {
        console.error("Error loading BPA-I records for competence:", error);
        throw error;
    }
};

export const prepareBpaIExportData = (records: any[]) => {
    // Helper to calculate age if missing (fallback)
    const getAge = (dob: string, date: string) => {
        if (!dob || !date) return '-';
        const birthDate = new Date(dob);
        const attendDate = new Date(date);
        let age = attendDate.getFullYear() - birthDate.getFullYear();
        const m = attendDate.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && attendDate.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return records.map(record => ({
        DataAtendimento: record.attendanceDate,
        CNS: record.patientCns,
        Paciente: record.patientName,
        Procedimento: record.procedureCode,
        Quantidade: record.quantity,
        CBO: record.cbo,
        Unidade: record.unitId, // Or resolve name if available in context
        Profissional: record.professionalName,
        CID: record.cidCodes?.join(', '),
        Carater: record.attendanceCharacter,
        Idade: record.patientAge || getAge(record.patientDob, record.attendanceDate) // Use stored age or calc
    }));
};
