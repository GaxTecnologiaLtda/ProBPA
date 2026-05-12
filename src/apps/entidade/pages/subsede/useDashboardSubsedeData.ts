import { useState, useEffect } from 'react';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../../context/AuthContext';

export interface DashboardSubsedeStats {
    production: {
        total: number;
        totalNonPactuated?: number;
        trend: number; // percentage
        trendUp: boolean;
        chartData: { month: string; procedures: number; nonPactuated?: number }[];
        topProcedures: { name: string; value: number }[];
    };
    professionals: {
        value: number;
        trend: number;
        trendUp: boolean;
    };
    units: {
        value: number;
        trendUp: boolean;
    };
    goals: {
        value: string; // percentage string "87%"
        trend: number;
        trendUp: boolean;
    };
    loading: boolean;
    syncing: boolean;
    syncData: () => Promise<void>;
}

export const useDashboardSubsedeData = (competence: string = 'Global') => {
    const { claims } = useAuth();
    const [stats, setStats] = useState<DashboardSubsedeStats>({
        production: { total: 0, totalNonPactuated: 0, trend: 0, trendUp: true, chartData: [], topProcedures: [] },
        professionals: { value: 0, trend: 0, trendUp: true },
        units: { value: 0, trendUp: true },
        goals: { value: '0%', trend: 0, trendUp: true },
        loading: true,
        syncing: false,
        syncData: async () => { },
    });

    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const load = async () => {
        // Need municipalityId from claims to fetch subsede-specific stats
        if (!claims?.entityId || !claims?.municipalityId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const currentYear = new Date().getFullYear().toString();
            const getStatsFn = httpsCallable(functions, 'getDashboardSubsedeStats');
            const response = await getStatsFn({ year: currentYear, municipalityId: claims.municipalityId, competence });
            const data = response.data as any;

            setStats({
                ...stats,
                production: data.production || stats.production,
                professionals: data.professionals || stats.professionals,
                units: data.units || stats.units,
                goals: data.goals || stats.goals,
            });
        } catch (error) {
            console.error('Failed to load dashboard subsede stats:', error);
            // Provide fallback mock data so the panel doesn't crash if the function isn't ready
            setStats({
                ...stats,
                production: { total: 0, totalNonPactuated: 0, trend: 0, trendUp: true, chartData: [], topProcedures: [] },
                professionals: { value: 0, trend: 0, trendUp: true },
                units: { value: 0, trendUp: true },
            });
        } finally {
            setLoading(false);
        }
    };

    const syncData = async () => {
        if (!claims?.entityId || !claims?.municipalityId) return;
        setSyncing(true);
        try {
            const triggerRefreshFn = httpsCallable(functions, 'triggerDashboardSubsedeRefresh');
            await triggerRefreshFn({ year: new Date().getFullYear().toString(), municipalityId: claims.municipalityId });
            await load();
        } catch (error) {
            console.error('Failed to sync dashboard data:', error);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [claims?.entityId, claims?.municipalityId, competence]);

    return { ...stats, loading, syncing, syncData };
};
