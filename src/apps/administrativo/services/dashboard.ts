import { collection, getCountFromServer, query, where, getDocs, orderBy, limit, collectionGroup, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { EntityType } from '../types';

export interface DashboardStats {
    publicEntities: number;
    privateEntities: number;
    municipalities: number;
    users: number;
}

export interface RecentActivity {
    id: string;
    entityName: string;
    action: string;
    date: string;
    status: 'Concluído' | 'Processando' | 'Alerta';
    variant: 'success' | 'info' | 'warning';
}

export interface FinancialStats {
    totalAnnualContracts: number;
    totalReceived: number;
    totalPending: number;
    totalOverdue: number;
}

export interface RevenueChartData {
    name: string; // Month/Year
    expected: number;
    received: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
    try {
        // Public Entities Count
        const publicEntitiesQuery = query(collection(db, 'entities'), where('type', '==', EntityType.PUBLIC));
        const publicEntitiesSnapshot = await getCountFromServer(publicEntitiesQuery);

        // Private Entities Count
        const privateEntitiesQuery = query(collection(db, 'entities'), where('type', '==', EntityType.PRIVATE));
        const privateEntitiesSnapshot = await getCountFromServer(privateEntitiesQuery);

        // Municipalities Count
        const municipalitiesSnapshot = await getCountFromServer(collection(db, 'municipalities'));

        // Users Count (Admin + Entity Users)
        // Note: This might need adjustment based on where users are stored. 
        // Assuming 'users' collection for now or aggregating from auth (not possible directly from client SDK efficiently without a counter).
        // For now, let's query a 'users' collection.
        const usersSnapshot = await getCountFromServer(collection(db, 'users'));

        return {
            publicEntities: publicEntitiesSnapshot.data().count,
            privateEntities: privateEntitiesSnapshot.data().count,
            municipalities: municipalitiesSnapshot.data().count,
            users: usersSnapshot.data().count
        };
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return {
            publicEntities: 0,
            privateEntities: 0,
            municipalities: 0,
            users: 0
        };
    }
};

export const getRecentActivity = async (): Promise<RecentActivity[]> => {
    // In a real app, this would query a 'system_logs' or 'activities' collection
    // For now, we will return the mock data but structured as a service call
    // to allow easy replacement later.

    // Example real query (commented out until collection exists):
    /*
    const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(5));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        entityName: doc.data().entityName || 'Unknown',
        action: doc.data().event,
        date: new Date(doc.data().timestamp).toLocaleDateString(),
        status: 'Concluído', // Map from log level or status
        variant: 'success'
    }));
    */

    return [
        {
            id: '1',
            entityName: 'Pref. Mun. de Salvador',
            action: 'Novo município adicionado',
            date: 'Hoje, 10:30',
            status: 'Concluído',
            variant: 'success'
        },
        {
            id: '2',
            entityName: 'Instituto Saúde Total',
            action: 'Renovação de licença',
            date: 'Ontem, 16:15',
            status: 'Processando',
            variant: 'info'
        },
        {
            id: '3',
            entityName: 'Fundação Viver Bem',
            action: 'Alerta de uso (90%)',
            date: '12 Mai, 09:00',
            status: 'Alerta',
            variant: 'warning'
        }
    ];
};

export const getFinancialOverview = async (): Promise<FinancialStats> => {
    try {
        // 1. Fetch Active Licenses IDs & Annual Value
        const licensesQuery = query(collection(db, 'licenses'), where('status', '==', 'Ativa'));
        const licensesSnap = await getDocs(licensesQuery);

        let totalAnnualContracts = 0;
        const activeLicenseIds = new Set<string>();

        licensesSnap.forEach(doc => {
            totalAnnualContracts += (doc.data().annualValue || 0);
            activeLicenseIds.add(doc.id);
        });

        // 2. Installments Aggregation (Received vs Pending)
        const installmentsQuery = query(collectionGroup(db, 'installments'));
        const installmentsSnap = await getDocs(installmentsQuery);

        let totalReceived = 0;
        let totalPending = 0;
        let totalOverdue = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        installmentsSnap.forEach(doc => {
            // Check if installment belongs to an ACTIVE license
            // doc.ref.parent is 'installments', doc.ref.parent.parent is the license DocRef
            const licenseId = doc.ref.parent.parent?.id;

            if (licenseId && activeLicenseIds.has(licenseId)) {
                const data = doc.data();
                const amount = Number(data.amount) || 0;
                const dueDateStr = data.dueDate; // YYYY-MM-DD

                if (data.paid) {
                    totalReceived += amount;
                } else {
                    totalPending += amount;

                    // Check overdue
                    if (dueDateStr) {
                        const [y, m, d] = dueDateStr.split('-').map(Number);
                        const due = new Date(y, m - 1, d);
                        if (due < today) {
                            totalOverdue += amount;
                        }
                    }
                }
            }
        });

        return {
            totalAnnualContracts,
            totalReceived,
            totalPending,
            totalOverdue
        };

    } catch (error) {
        console.error("Error fetching financial stats:", error);
        return { totalAnnualContracts: 0, totalReceived: 0, totalPending: 0, totalOverdue: 0 };
    }
};

export const getRevenueData = async (): Promise<RevenueChartData[]> => {
    try {
        // Fetch Active Licenses First
        const licensesQuery = query(collection(db, 'licenses'), where('status', '==', 'Ativa'));
        const licensesSnap = await getDocs(licensesQuery);
        const activeLicenseIds = new Set<string>(licensesSnap.docs.map(d => d.id));

        // Fetch Installments
        const installmentsQuery = query(collectionGroup(db, 'installments'));
        const snaps = await getDocs(installmentsQuery);

        // Group by Month
        const monthlyData: Record<string, { expected: number, received: number }> = {};
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        // Initialize
        months.forEach(m => monthlyData[m] = { expected: 0, received: 0 });

        snaps.forEach(doc => {
            const licenseId = doc.ref.parent.parent?.id;

            if (licenseId && activeLicenseIds.has(licenseId)) {
                const data = doc.data();
                const amount = Number(data.amount) || 0;
                const curYear = new Date().getFullYear();

                if (data.dueDate) {
                    const [y, m, d] = data.dueDate.split('-').map(Number);
                    if (y === curYear) {
                        const monthName = months[m - 1];
                        if (monthlyData[monthName]) {
                            monthlyData[monthName].expected += amount;
                            if (data.paid) {
                                monthlyData[monthName].received += amount;
                            }
                        }
                    }
                }
            }
        });

        return months.map(m => ({
            name: m,
            expected: monthlyData[m].expected,
            received: monthlyData[m].received
        }));

    } catch (error) {
        console.error("Error fetching revenue data:", error);
        return [];
    }
};

export const getTopEntitiesByMunicipalities = async (): Promise<{ name: string, value: number }[]> => {
    try {
        const q = query(collection(db, 'municipalities'));
        const snap = await getDocs(q);

        const counts: Record<string, number> = {};
        snap.forEach(doc => {
            const entName = doc.data().linkedEntityName || 'Sem Vínculo';
            counts[entName] = (counts[entName] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5
    } catch (error) {
        console.error("Error fetching top entities:", error);
        return [];
    }
};
