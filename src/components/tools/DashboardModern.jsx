import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import {
    TrendingUp, Package, DollarSign, Users, Smartphone, Wrench,
    ShoppingBag, Store, MessageSquare, Clock, Search, Bell
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { startOfMonth, endOfMonth, subDays, format, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

import { GlassCard } from '../ui/GlassCard';
import { BentoGrid, BentoItem } from '../ui/BentoGrid';
import { DataStats } from '../ui/DataStats';
import { MetricCard, QuickAction } from './DashboardComponents';

const getFirestoreDate = (timestamp) => {
    if (!timestamp) return new Date();
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
};

export function DashboardModern({ user, userProfile }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        todayRevenue: 0,
        monthRevenue: 0,
        todayOrders: 0,
        monthOrders: 0,
        activeOS: 0,
        urgentOS: 0,
        lowStockItems: 0,
        newClients: 0,
        avgTicket: 0
    });
    const { onOpenNotifications, onOpenCommandPalette, notificationCount } = useOutletContext() || {};

    const [recentSales, setRecentSales] = useState([]);
    const [chartData, setChartData] = useState([]);

    const orgId = userProfile?.organizationId || user?.uid;

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date();
            const startToday = new Date(now.setHours(0, 0, 0, 0));
            const monthStart = startOfMonth(new Date());
            const monthEnd = endOfMonth(new Date());

            // Sales Data
            const salesSnap = await getDocs(
                query(
                    collection(db, 'sales'),
                    where('organizationId', '==', orgId),
                    orderBy('createdAt', 'desc'),
                    limit(100)
                )
            );

            const allSales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Calculate Metrics
            const todaySales = allSales.filter(s => {
                const saleDate = getFirestoreDate(s.createdAt);
                return saleDate >= startToday;
            });

            const monthSales = allSales.filter(s => {
                const saleDate = getFirestoreDate(s.createdAt);
                return isWithinInterval(saleDate, { start: monthStart, end: monthEnd });
            });

            const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
            const monthRevenue = monthSales.reduce((sum, s) => sum + (s.total || 0), 0);

            // Service Orders
            const osSnap = await getDocs(
                query(
                    collection(db, 'technical_lab'),
                    where('organizationId', '==', orgId),
                    where('status', 'in', ['triagem', 'manutencao', 'revisao'])
                )
            );

            // Calculate urgent OS (past forecast date)
            const urgentOS = osSnap.docs.filter(d => {
                const data = d.data();
                if (!data.endDate) return false;
                // Check if end date is today or past
                const end = getFirestoreDate(data.endDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return end <= today;
            }).length;

            // Clients
            const clientsSnap = await getDocs(
                query(
                    collection(db, 'clients'),
                    where('organizationId', '==', orgId),
                    orderBy('createdAt', 'desc'),
                    limit(30)
                )
            );

            const newClientsThisMonth = clientsSnap.docs.filter(d => {
                const clientDate = getFirestoreDate(d.data().createdAt);
                return isWithinInterval(clientDate, { start: monthStart, end: monthEnd });
            }).length;

            // Chart Data (Last 7 days)
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = subDays(new Date(), 6 - i);
                const dayStart = new Date(date.setHours(0, 0, 0, 0));
                const dayEnd = new Date(date.setHours(23, 59, 59, 999));

                const daySales = allSales.filter(s => {
                    const saleDate = getFirestoreDate(s.createdAt);
                    return saleDate >= dayStart && saleDate <= dayEnd;
                });

                const revenue = daySales.reduce((sum, s) => sum + (s.total || 0), 0);

                return {
                    date: format(dayStart, 'EEE', { locale: ptBR }),
                    revenue: revenue,
                    orders: daySales.length
                };
            });

            setMetrics({
                todayRevenue,
                monthRevenue,
                todayOrders: todaySales.length,
                monthOrders: monthSales.length,
                activeOS: osSnap.size,
                urgentOS,
                lowStockItems: 0, // TODO: Implement stock check
                newClients: newClientsThisMonth,
                avgTicket: monthSales.length > 0 ? monthRevenue / monthSales.length : 0
            });

            setRecentSales(allSales.slice(0, 5));
            setChartData(last7Days);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        if (!user) return;
        loadDashboardData();
    }, [user, userProfile, loadDashboardData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 transition-colors duration-500">
            {/* Header */}
            <div className="w-full mb-12">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            Dashboard
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Search Bar */}
                        <div
                            className="hidden md:flex items-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-2 w-64 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm dark:shadow-slate-900/50 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/50"
                            onClick={() => onOpenCommandPalette?.()}
                        >
                            <Search className="w-4 h-4 text-slate-400 mr-2" />
                            <span className="bg-transparent border-none outline-none text-sm w-full text-slate-400">
                                Buscar ferramentas...
                            </span>
                            <div className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 dark:bg-white dark:bg-slate-900/10 rounded text-[10px] font-bold text-slate-400">⌘K</div>
                        </div>

                        {/* Notification Bell */}
                        <button
                            onClick={() => onOpenNotifications?.()}
                            className="relative p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all shadow-sm dark:shadow-slate-900/50 group"
                        >
                            <Bell className="w-5 h-5" />
                            {notificationCount > 0 && (
                                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 group-hover:scale-110 transition-transform"></span>
                            )}
                        </button>

                        {/* OS Deadline Widget */}
                        <button
                            onClick={() => navigate('/dashboard/lab?filter=urgent')}
                            className="relative p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all shadow-sm dark:shadow-slate-900/50 group"
                            title="Prazos de OS"
                        >
                            <Clock className="w-5 h-5" />
                            {metrics.urgentOS > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm dark:shadow-slate-900/50 border-2 border-white dark:border-slate-900">
                                    {metrics.urgentOS}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full space-y-8">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 3xl:grid-cols-6 gap-6">
                    <MetricCard
                        icon={DollarSign}
                        label="Receita Hoje"
                        value={formatCurrency(metrics.todayRevenue)}
                        color="indigo"
                        onClick={() => navigate('/dashboard/reports')}
                    />
                    <MetricCard
                        icon={ShoppingBag}
                        label="Vendas Hoje"
                        value={metrics.todayOrders}
                        color="emerald"
                        onClick={() => navigate('/dashboard/reports')}
                    />
                    <MetricCard
                        icon={Wrench}
                        label="OS Ativas"
                        value={metrics.activeOS}
                        color="amber"
                        onClick={() => navigate('/dashboard/lab')}
                    />
                    <MetricCard
                        icon={Users}
                        label="Novos Clientes"
                        value={metrics.newClients}
                        color="blue"
                        onClick={() => navigate('/dashboard/clients')}
                    />
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-slate-900/50">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Ações Rápidas</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <QuickAction
                            icon={Wrench}
                            label="Nova OS"
                            color="amber"
                            onClick={() => navigate('/dashboard/lab')}
                        />
                        <QuickAction
                            icon={Smartphone}
                            label="Nova Venda"
                            color="emerald"
                            onClick={() => navigate('/dashboard/checkout')}
                        />
                        <QuickAction
                            icon={MessageSquare}
                            label="Solicitação"
                            color="indigo"
                            onClick={() => navigate('/dashboard/requests')}
                        />
                        <QuickAction
                            icon={Store}
                            label="Link Vitrine"
                            color="blue"
                            onClick={() => {
                                const sellerName = userProfile?.name || user?.displayName || user?.email?.split('@')[0];
                                const catalogUrl = `${window.location.origin}/public/catalog/${userProfile?.organizationId || user?.uid || 'default'}?s=${encodeURIComponent(sellerName)}`;
                                window.open(catalogUrl, '_blank');
                            }}
                        />
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 xl:grid-cols-2 3xl:grid-cols-3 gap-6">
                    {/* Revenue Chart */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-slate-900/50">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">Receita (7 dias)</h2>
                            <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-full">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                    {formatCurrency(metrics.monthRevenue)}
                                </span>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '8px 12px'
                                    }}
                                    formatter={(value) => [formatCurrency(value), 'Receita']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#4f46e5"
                                    strokeWidth={3}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Orders Chart */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-slate-900/50">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">Vendas (7 dias)</h2>
                            <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-full">
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    {metrics.monthOrders} vendas
                                </span>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '8px 12px'
                                    }}
                                    formatter={(value) => [value, 'Vendas']}
                                />
                                <Bar dataKey="orders" fill="#10b981" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Sales */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-slate-900/50">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Vendas Recentes</h2>
                    <div className="space-y-4">
                        {recentSales.length === 0 ? (
                            <p className="text-center text-slate-400 py-8">Nenhuma venda registrada</p>
                        ) : (
                            recentSales.map(sale => (
                                <div
                                    key={sale.id}
                                    className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 dark:hover:bg-white dark:bg-slate-900/5 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/dashboard/reports`)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                                            <ShoppingBag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                {sale.client?.name || 'Cliente Anônimo'}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {format(getFirestoreDate(sale.createdAt), "HH:mm")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-slate-900 dark:text-white">
                                            {formatCurrency(sale.total)}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {sale.items?.length || 0} {sale.items?.length === 1 ? 'item' : 'itens'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
