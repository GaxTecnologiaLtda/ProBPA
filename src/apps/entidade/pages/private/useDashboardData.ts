import { useState, useEffect } from 'react';
import { goalService, calculateGoalStatus } from '../../services/goalService';
import { fetchProfessionalsByEntity } from '../../services/professionalsService';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { useAuth } from '../../context/AuthContext';

export interface DashboardStats {
    production: {
        total: number;
        trend: number; // percentage
        trendUp: boolean;
        chartData: { month: string; procedures: number }[];
    };
    professionals: {
        value: number;
        trend: number;
        trendUp: boolean;
    };
    municipalities: {
        value: number;
        trendUp: boolean;
        topList: { name: string; value: number }[];
    };
    goals: {
        value: string; // percentage string "87%"
        trend: number;
        trendUp: boolean;
    };
    loading: boolean;
}

export const useDashboardData = () => {
    const { claims } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        production: { total: 0, trend: 0, trendUp: true, chartData: [] },
        professionals: { value: 0, trend: 0, trendUp: true },
        municipalities: { value: 0, trendUp: true, topList: [] },
        goals: { value: '0%', trend: 0, trendUp: true },
        loading: true
    });

    useEffect(() => {
        if (!claims?.entityId) return;

        const load = async () => {
            try {
                const currentYear = new Date().getFullYear().toString();
                // 1. Fetch Data in Parallel
                const [
                    productionStats,
                    professionals,
                    municipalities,
                    goals
                ] = await Promise.all([
                    goalService.getEntityProductionStats(claims.entityId, currentYear),
                    fetchProfessionalsByEntity(claims.entityId),
                    fetchMunicipalitiesByEntity(claims.entityId),
                    goalService.getGoalsForEntityPrivate(claims)
                ]);

                // 2. Process Production (Raw Records -> Aggregated Stats)
                const aggregatedByMonth: Record<string, number> = {};
                let totalQuantity = 0;

                productionStats.forEach(record => {
                    const month = record.competenceMonth; // YYYY-MM
                    const qty = Number(record.quantity) || 1;

                    if (month) {
                        aggregatedByMonth[month] = (aggregatedByMonth[month] || 0) + qty;
                    }
                    totalQuantity += qty;
                });

                // Convert to Chart Data (sorted by month)
                // We should ensure all months of the year are present? Or just data points.
                // For a nice chart, let's sort keys.
                const sortedMonths = Object.keys(aggregatedByMonth).sort();
                const chartData = sortedMonths.map(m => ({
                    month: m, // YYYY-MM or formatted
                    procedures: aggregatedByMonth[m]
                }));

                const totalProductionYear = totalQuantity;

                // 3. Process Professionals
                const totalProfs = professionals.length;

                // 4. Process Municipalities
                const totalMun = municipalities.length;

                // Aggregate production by Municipality
                const productionByMun: Record<string, number> = {};
                productionStats.forEach(p => {
                    // Try to find municipality ID
                    const munId = p.municipalityId;
                    if (munId) {
                        const qty = Number(p.quantity) || 1;
                        productionByMun[munId] = (productionByMun[munId] || 0) + qty;
                    }
                });

                // Convert to Top List with Names
                const topList = Object.entries(productionByMun)
                    .map(([id, value]) => {
                        const munParam = municipalities.find(m => m.id === id);
                        return {
                            name: munParam?.name || 'Desconhecido',
                            value
                        };
                    })
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5); // Top 5
                // 5. Process Goals
                // Calculate average completion %
                const globalTarget = goals.reduce((acc, g) => acc + (g.annualTargetQuantity || (g.targetQuantity * 12)), 0);
                const globalAchievementPercent = globalTarget > 0 ? (totalProductionYear / globalTarget) * 100 : 0;

                // Mock trend logic
                const trendProd = 12; // Placeholder

                setStats({
                    production: {
                        total: totalProductionYear,
                        trend: trendProd,
                        trendUp: true,
                        chartData
                    },
                    professionals: {
                        value: totalProfs,
                        trend: 5,
                        trendUp: true
                    },
                    municipalities: {
                        value: totalMun,
                        trendUp: true,
                        topList: topList
                    },
                    goals: {
                        value: `${Math.min(Math.round(globalAchievementPercent), 100)}%`,
                        trend: 2,
                        trendUp: true
                    },
                    loading: false
                });

            } catch (error) {
                console.error("Dashboard Load Error", error);
                setStats(s => ({ ...s, loading: false }));
            }
        };

        load();

    }, [claims?.entityId]);

    return stats;
};
