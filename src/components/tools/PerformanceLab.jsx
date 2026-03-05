import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import {
    Clock, Wrench, CheckCircle2, AlertCircle, TrendingUp,
    Users, Smartphone, Calendar, ChevronRight, Activity,
    Timer, BarChart3, PieChart as PieChartIcon, UserCheck
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import {
    format, subDays, startOfMonth, endOfMonth,
    differenceInHours, differenceInMinutes, isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, PieChart, Cell, Pie
} from 'recharts';

const getFirestoreDate = (timestamp) => {
    if (!timestamp) return new Date();
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
};

export function PerformanceLab({ userProfile, settings }) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        avgTatHours: 0,
        totalResolved: 0,
        totalActive: 0,
        returnRate: 0,
        topTechnicians: [],
        statusDistribution: [],
        dailyTrend: []
    });

    const orgId = userProfile?.organizationId;

    useEffect(() => {
        if (orgId) loadPerformanceData();
    }, [orgId]);

    const loadPerformanceData = async () => {
        setLoading(true);
        try {
            const osSnap = await getDocs(
                query(
                    collection(db, 'technical_lab'),
                    where('organizationId', '==', orgId),
                    orderBy('createdAt', 'desc')
                )
            );

            const allOS = osSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 1. Calculate TAT (Turn Around Time)
            const resolvedOS = allOS.filter(os =>
                ['pronto', 'concluido', 'entregue'].includes(os.status?.toLowerCase())
            );

            let totalMinutes = 0;
            let resolvedCount = 0;

            resolvedOS.forEach(os => {
                const start = getFirestoreDate(os.createdAt);

                // Find when it was marked as ready in history
                const readyEvent = os.history?.find(h =>
                    ['pronto', 'concluido'].includes(h.status?.toLowerCase())
                );

                if (readyEvent) {
                    const end = getFirestoreDate(readyEvent.date);
                    const diff = differenceInMinutes(end, start);
                    if (diff > 0) {
                        totalMinutes += diff;
                        resolvedCount++;
                    }
                }
            });

            const avgTatMinutes = resolvedCount > 0 ? totalMinutes / resolvedCount : 0;
            const avgTatHours = (avgTatMinutes / 60).toFixed(1);

            // 2. Status Distribution
            const statusCounts = allOS.reduce((acc, os) => {
                const s = os.status || 'triagem';
                acc[s] = (acc[s] || 0) + 1;
                return acc;
            }, {});

            const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
                name: name.toUpperCase(),
                value
            }));

            // 3. Top Technicians
            const techCounts = allOS.reduce((acc, os) => {
                const tech = os.technicianName || 'Não Atribuído';
                acc[tech] = (acc[tech] || 0) + 1;
                return acc;
            }, {});

            const topTechnicians = Object.entries(techCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            // 4. Daily Trend (Last 14 days)
            const last14Days = Array.from({ length: 14 }, (_, i) => {
                const date = subDays(new Date(), 13 - i);
                const dayStart = new Date(date.setHours(0, 0, 0, 0));
                const dayEnd = new Date(date.setHours(23, 59, 59, 999));

                const opened = allOS.filter(os => {
                    const d = getFirestoreDate(os.createdAt);
                    return d >= dayStart && d <= dayEnd;
                }).length;

                const closed = allOS.filter(os => {
                    const readyEvent = os.history?.find(h =>
                        ['pronto', 'concluido'].includes(h.status?.toLowerCase())
                    );
                    if (!readyEvent) return false;
                    const d = getFirestoreDate(readyEvent.date);
                    return d >= dayStart && d <= dayEnd;
                }).length;

                return {
                    date: format(dayStart, 'dd/MM'),
                    abertas: opened,
                    concluidas: closed
                };
            });

            setStats({
                avgTatHours,
                totalResolved: resolvedOS.length,
                totalActive: allOS.length - resolvedOS.length,
                returnRate: 2.4, // Mocked for now
                topTechnicians,
                statusDistribution,
                dailyTrend: last14Days
            });

        } catch (error) {
            console.error("Error loading performance stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-slate-400 font-medium text-sm">Analisando performance técnica...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Timer className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TAT Médio</p>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{stats.avgTatHours}h</h3>
                        </div>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium">Tempo médio de resolução (Triagem → Pronto)</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resoluções</p>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{stats.totalResolved}</h3>
                        </div>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium">Total de Ordens de Serviço concluídas</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Em Aberto</p>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{stats.totalActive}</h3>
                        </div>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium">OS aguardando ou em manutenção</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Taxa Retorno</p>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{stats.returnRate}%</h3>
                        </div>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium">Garantias acionadas vs total resolvido</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Trend */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Fluxo de Laboratório</h3>
                            <p className="text-xs text-slate-400">Entradas vs Saídas nos últimos 14 dias</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Abertas</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Concluídas</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.dailyTrend}>
                                <defs>
                                    <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b984" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b984" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f033" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="abertas"
                                    stroke="#4f46e5"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorOpen)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="concluidas"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorClosed)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Distribution (Pie) */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Distribuição OS</h3>
                    <p className="text-xs text-slate-400 mb-6">Status atual da carga de trabalho</p>

                    <div className="h-[200px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.statusDistribution}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-slate-800 dark:text-white">
                                {stats.totalActive + stats.totalResolved}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                        </div>
                    </div>

                    <div className="mt-6 space-y-2">
                        {stats.statusDistribution.map((s, idx) => (
                            <div key={s.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{s.name}</span>
                                </div>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Technicians Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Performance por Técnico</h3>
                    <p className="text-xs text-slate-400">Produtividade individual (Entradas atribuídas)</p>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {stats.topTechnicians.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">Nenhum técnico atribuído em OS recentes.</div>
                    ) : (
                        stats.topTechnicians.map((tech, idx) => (
                            <div key={tech.name} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                                        {tech.name[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-white">{tech.name}</p>
                                        <p className="text-xs text-slate-400">Técnico Nível {idx === 0 ? 'Sênior' : 'Pleno'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">OS Atribuídas</p>
                                        <p className="text-lg font-black text-slate-800 dark:text-white">{tech.count}</p>
                                    </div>
                                    <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500"
                                            style={{ width: `${(tech.count / stats.topTechnicians[0].count) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
