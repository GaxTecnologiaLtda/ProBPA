import { useState, useEffect } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { goalService, calculateGoalStatus } from '../../services/goalService';
import { fetchProfessionalsByEntity } from '../../services/professionalsService';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { statsCache } from '../../services/statsCache';
import { connectorService } from '../../services/connectorService';
import { useAuth } from '../../context/AuthContext';

export interface DashboardStats {
    production: {
        total: number;
        trend: number; // percentage
        trendUp: boolean;
        chartData: { month: string; procedures: number }[];
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
        topList: { name: string; value: number }[];
    };
    goals: {
        value: string; // percentage string "87%"
        trend: number;
        trendUp: boolean;
    };
    loading: boolean;
    rawRecords?: any[];
}

export const useDashboardData = () => {
    const { claims } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        production: { total: 0, trend: 0, trendUp: true, chartData: [], topProcedures: [] },
        professionals: { value: 0, trend: 0, trendUp: true },
        municipalities: { value: 0, trendUp: true, topList: [] },
        goals: { value: '0%', trend: 0, trendUp: true },
        loading: true,
        rawRecords: []
    });

    useEffect(() => {
        if (!claims?.entityId) return;

        const load = async () => {
            try {
                const currentYear = new Date().getFullYear().toString();

                // 1. Fetch Municipalities & Professionals First (Needed for Context)
                const [professionals, municipalities, goals] = await Promise.all([
                    fetchProfessionalsByEntity(claims.entityId),
                    fetchMunicipalitiesByEntity(claims.entityId),
                    goalService.getGoalsForEntityPrivate(claims)
                ]);

                // 2. Fetch Production (Robust Cache with Promise Deduplication)
                // First, determine Entity Type (Public/Private) reliably
                const entityDocRef = doc(db, 'entities', claims.entityId);
                const entityDocSnap = await getDoc(entityDocRef);
                let entityType = 'PUBLIC';
                if (entityDocSnap.exists()) {
                    const eData = entityDocSnap.data();
                    if (eData.type === 'Privada' || eData.type === 'PRIVATE') entityType = 'PRIVATE';
                }

                // We use goalService for manual data, and connectorService for connector data to ensure separation and accuracy
                const [goalServiceStats, connectorStats] = await Promise.all([
                    statsCache.getOrFetch(claims.entityId, currentYear, async () => {
                        return await goalService.getEntityProductionStats(
                            claims.entityId,
                            currentYear,
                            undefined,
                            municipalities, // Pass list for extraction querying (used for manual check context)
                            professionals   // Pass list for filtering extracted records
                        );
                    }),
                    connectorService.fetchAggregateConnectorData(
                        claims.entityId,
                        currentYear,
                        municipalities,
                        professionals,
                        entityType // Explicitly pass the resolved type
                    )
                ]);

                // Filter goalServiceStats to keep ONLY 'manual' (or non-connector) to avoid double counting
                // effectively treating goalService as the source for Manual data
                const manualStats = goalServiceStats.filter((r: any) => r.source !== 'connector');

                const productionStats = [...manualStats, ...connectorStats];

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

                // Aggregate Top Procedures
                const procAggregation: Record<string, number> = {};
                productionStats.forEach(p => {
                    const name = p.procedureName || `Código: ${p.procedureCode}`;
                    const qty = Number(p.quantity) || 0;
                    procAggregation[name] = (procAggregation[name] || 0) + qty;
                });

                const topProcedures = Object.entries(procAggregation)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10);

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
                        chartData,
                        topProcedures
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
                    loading: false,
                    rawRecords: productionStats // Expose raw for drill-down
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
