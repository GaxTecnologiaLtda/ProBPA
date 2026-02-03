import { collection, getCountFromServer, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
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
