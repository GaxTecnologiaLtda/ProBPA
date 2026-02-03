import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ClipboardList, CalendarRange, TrendingUp, ChevronDown, Building2, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, Button } from '../components/ui/BaseComponents';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context';
import { getProfessionalHistory } from '../services/bpaService';
import { ProductionRecord } from '../types';

const GradientDefs = () => (
    <svg width="0" height="0">
        <defs>
            <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="green-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
            </linearGradient>
        </defs>
    </svg>
);

const StatCard: React.FC<{
    title: string;
    value: string | number;
    sub: React.ReactNode;
    icon: React.ElementType;
    gradientId: string;
    loading?: boolean;
}> = ({ title, value, sub, icon: Icon, gradientId, loading }) => (
    <Card className="p-5 relative overflow-hidden h-full border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
                <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                        <div className="absolute inset-0 blur-lg opacity-20 bg-current" style={{ color: gradientId === 'blue-gradient' ? '#3b82f6' : '#10b981' }}></div>
                        <Icon size={28} style={{ stroke: `url(#${gradientId})` }} className="drop-shadow-sm" />
                    </div>
                    <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-[10px]">{title}</span>
                </div>
                {loading ? (
                    <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded my-1" />
                ) : (
                    <div className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</div>
                )}
            </div>
            <div className="text-xs text-gray-500 mt-3 font-medium bg-gray-50 dark:bg-gray-800/50 w-fit px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700/50">
                {sub}
            </div>
        </div>
    </Card>
);

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, currentUnit, selectUnit } = useApp();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [historyData, setHistoryData] = useState<ProductionRecord[]>([]);

    useEffect(() => {
        if (!user?.id) return;

        let isMounted = true;

        async function loadData() {
            setLoading(true);
            try {
                // Use professionalId if available (for doctor/nurse users), otherwise user.id
                const data = await getProfessionalHistory(user?.professionalId || user?.id || '');
                if (isMounted) {
                    setHistoryData(data);
                }
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadData();

        return () => { isMounted = false; };
    }, [user]);

    // Calculate Stats
    const stats = useMemo(() => {
        const now = new Date();
        // Fix: Use Local Time for 'Today' calculation, not UTC (toISOString)
        // Brazil (UTC-3) late night becomes next day in UTC, causing 0 count.
        const toLocalISO = (date: Date) => {
            const offset = date.getTimezoneOffset();
            const local = new Date(date.getTime() - (offset * 60 * 1000));
            return local.toISOString().split('T')[0];
        };

        const todayStr = toLocalISO(now);

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toLocalISO(yesterday);

        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let todayCount = 0;
        let yesterdayCount = 0;
        let monthCount = 0;

        // Chart Data structure: 12 months
        const monthsData = Array(12).fill(0).map((_, i) => ({
            name: new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).replace(/^\w/, c => c.toUpperCase()), // Jan, Fev...
            total: 0,
            originalIndex: i
        }));

        historyData.forEach(record => {
            const rDate = new Date(record.date + 'T12:00:00'); // Fix TZ
            const rDateStr = record.date;

            // Daily Counts
            if (rDateStr === todayStr) todayCount++;
            if (rDateStr === yesterdayStr) yesterdayCount++;

            // Monthly Counts (Current Month)
            if (rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear) {
                monthCount++;
            }

            // Chart Compilation (Current Year only for simplicity, or all time?)
            // Assuming chart should show current year trends
            if (rDate.getFullYear() === currentYear) {
                monthsData[rDate.getMonth()].total += 1;
            }
        });

        // Calculate diff for Today vs Yesterday
        const diff = todayCount - yesterdayCount;
        const diffLabel = diff >= 0 ? `+${diff}` : `${diff}`;
        const DiffIcon = diff >= 0 ? ArrowUp : ArrowDown;
        const diffColor = diff >= 0 ? 'text-emerald-500' : 'text-rose-500';

        return {
            today: todayCount,
            month: monthCount,
            todayDiff: { val: diffLabel, icon: DiffIcon, color: diffColor },
            chartData: monthsData
        };
    }, [historyData]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <GradientDefs />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-500 dark:text-gray-400">
                            Bem-vindo de volta, {user?.name.split(' ')[0]}.
                        </p>

                        {/* Unit Switcher */}
                        {user && user.units.length > 1 && currentUnit && (
                            <div className="relative">
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                                >
                                    <Building2 size={14} />
                                    {currentUnit.name}
                                    <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isDropdownOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsDropdownOpen(false)}
                                        />
                                        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="text-xs font-semibold text-gray-400 px-2 py-1 mb-1 uppercase tracking-wider">Alternar Unidade</div>
                                            <div className="max-h-[300px] overflow-y-auto">
                                                {user.units.map(unit => (
                                                    <button
                                                        key={unit.id}
                                                        onClick={() => {
                                                            selectUnit(unit);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-colors ${currentUnit.id === unit.id ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                                    >
                                                        <div className={`w-2 h-2 shrink-0 rounded-full ${currentUnit.id === unit.id ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium truncate">{unit.name}</div>
                                                            <div className="text-xs text-gray-500 truncate">{unit.occupation}</div>
                                                            <div className="flex items-center gap-1">
                                                                {unit.municipalityName && <div className="text-[10px] text-gray-400 truncate">{unit.municipalityName}</div>}
                                                                {unit.type && <div className="text-[9px] px-1 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">{unit.type}</div>}
                                                            </div>
                                                        </div>
                                                        {currentUnit.id === unit.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Single Unit Display */}
                        {user && user.units.length === 1 && currentUnit && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium">
                                <Building2 size={14} />
                                {currentUnit.name}
                            </span>
                        )}
                    </div>
                </div>
                <Button onClick={() => navigate('/registrar')} size="lg" className="w-full sm:w-auto shadow-medical-500/30">
                    + Registrar Atendimento
                </Button>
            </div>

            {/* KEY METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <StatCard
                    title="Hoje"
                    value={stats.today}
                    loading={loading}
                    sub={
                        <span className="flex items-center gap-1">
                            <span className={`font-bold flex items-center ${stats.todayDiff.color}`}>
                                {stats.todayDiff.val} <stats.todayDiff.icon size={12} />
                            </span>
                            vs ontem
                        </span>
                    }
                    icon={ClipboardList}
                    gradientId="blue-gradient"
                />
                <StatCard
                    title="Mês Atual"
                    value={stats.month}
                    loading={loading}
                    sub="Total acumulado"
                    icon={CalendarRange}
                    gradientId="green-gradient"
                />
            </div>

            {/* CHART */}
            <div className="grid grid-cols-1 gap-6">
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Produção Mensal ({new Date().getFullYear()})</h3>
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                            <TrendingUp size={18} />
                        </div>
                    </div>

                    <div className="h-72 w-full">
                        {loading ? (
                            <div className="h-full w-full flex items-center justify-center">
                                <Loader2 className="animate-spin text-medical-500" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: '#f3f4f6', opacity: 0.4 }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Card>
            </div>
        </motion.div>
    );
};