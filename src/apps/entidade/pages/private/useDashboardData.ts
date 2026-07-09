import { useState, useEffect } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db, functions } from '../../firebase'; // Added functions
import { httpsCallable } from 'firebase/functions'; // Added httpsCallable
import { goalService, calculateGoalStatus } from '../../services/goalService';
import { fetchProfessionalsByEntity } from '../../services/professionalsService';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { statsCache } from '../../services/statsCache';
import { connectorService } from '../../services/connectorService';
import { useAuth } from '../../context/AuthContext';

export interface DashboardStats {
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
    municipalities: {
        value: number;
        trendUp: boolean;
        topList: { name: string; value: number; nonPactuated?: number }[];
    };
    goals: {
        value: string; // percentage string "87%"
        trend: number;
        trendUp: boolean;
    };
    loading: boolean;
    syncing: boolean;
    syncData: () => Promise<void>;
    rawRecords?: any[];
}

export const useDashboardData = (selectedYear: string, selectedMonth: string, selectedDay: string, selectedMunicipality: string) => {
    const { claims } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        production: { total: 0, totalNonPactuated: 0, trend: 0, trendUp: true, chartData: [], topProcedures: [] },
        professionals: { value: 0, trend: 0, trendUp: true },
        municipalities: { value: 0, trendUp: true, topList: [] },
        goals: { value: '0%', trend: 0, trendUp: true },
        loading: true,
        rawRecords: []
    });

    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const load = async () => {
        if (!claims?.entityId) return;
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

            const cacheKey = `dashboardStats_${claims.entityId}_${selectedYear}_${selectedMonth}_${selectedDay}_${selectedMunicipality}`;
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
                const getStatsFn = httpsCallable(functions, 'getDashboardStats');
                const payload: any = { year, month, day };
                if (selectedMunicipality && selectedMunicipality !== 'all') {
                    payload.municipalityId = selectedMunicipality;
                }
                const response = await getStatsFn(payload);
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
                municipalities: data.municipalities || prevStats.municipalities,
                goals: data.goals || prevStats.goals,
            }));
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const syncData = async () => {
        if (!claims?.entityId) return;
        setSyncing(true);
        try {
            // Bypass cache logic on manual sync by passing skipCache or just clearing it
            const cacheKey = `dashboardStats_${claims.entityId}_${selectedYear}_${selectedMonth}_${selectedDay}_${selectedMunicipality}`;
            localStorage.removeItem(cacheKey);

            // triggerDashboardRefresh is used for legacy or specific cases, we can run it, then reload without cache
            const triggerRefreshFn = httpsCallable(functions, 'triggerDashboardRefresh');
            // Global refresh, year decoupled from backend
            await triggerRefreshFn({});
            // After successful sync, reload the dashboard stats
            await load();
        } catch (error) {
            console.error('Manual sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear, selectedMonth, selectedDay, selectedMunicipality, claims?.entityId]);

    return { ...stats, loading, syncing, syncData };
};
