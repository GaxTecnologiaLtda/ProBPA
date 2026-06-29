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

export const useDashboardSubsedeData = (selectedYear: string, selectedMonth: string, selectedDay: string) => {
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
            let year = selectedYear;
            let month: string | undefined = undefined;
            let day: string | undefined = undefined;

            if (selectedMonth !== 'all') {
                month = `${year}-${selectedMonth.padStart(2, '0')}`;
            }

            if (selectedDay !== 'all') {
                day = selectedDay.padStart(2, '0');
            }

            const cacheKey = `dashboardSubsedeStats_${claims.municipalityId}_${selectedYear}_${selectedMonth}_${selectedDay}`;
            const cachedData = localStorage.getItem(cacheKey);
            let data = null;

            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    const now = new Date().getTime();
                    // 24 hours in milliseconds
                    if (now - parsed.timestamp < 24 * 60 * 60 * 1000) {
                        data = parsed.data;
                    }
                } catch (e) {
                    console.warn('Failed to parse cached dashboard stats', e);
                }
            }

            if (!data) {
                const getStatsFn = httpsCallable(functions, 'getDashboardSubsedeStats');
                const response = await getStatsFn({ year, month, day, municipalityId: claims.municipalityId });
                data = response.data as any;
                
                // Save to cache
                localStorage.setItem(cacheKey, JSON.stringify({
                    timestamp: new Date().getTime(),
                    data
                }));
            }

            setStats(prevStats => ({
                ...prevStats,
                production: data.production || prevStats.production,
                professionals: data.professionals || prevStats.professionals,
                units: data.units || prevStats.units,
                goals: data.goals || prevStats.goals,
            }));
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
            // Bypass cache logic on manual sync by passing skipCache or just clearing it
            const cacheKey = `dashboardSubsedeStats_${claims.municipalityId}_${selectedYear}_${selectedMonth}_${selectedDay}`;
            localStorage.removeItem(cacheKey);

            // Se houvesse uma function triggerDashboardSubsedeRefresh, chamaria ela aqui. 
            // Como a atualização já roda getDashboardSubsedeStats, vamos apenas recarregar ignorando cache.
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
    }, [claims?.entityId, claims?.municipalityId, selectedYear, selectedMonth, selectedDay]);

    return { ...stats, loading, syncing, syncData };
};
