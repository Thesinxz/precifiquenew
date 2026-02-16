import React from 'react';
import { Package, DollarSign, TrendingUp, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';

const StatCard = ({ icon: Icon, label, value, sub, color, trend, trendUp, onClick }) => (
    <div
        onClick={onClick}
        className={cn(
            "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2rem] transition-all duration-300 group",
            onClick && "cursor-pointer hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5"
        )}
    >
        <div className="flex justify-between items-start mb-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-6", color)}>
                <Icon className="w-6 h-6" />
            </div>
            {trend && (
                <div className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    trendUp ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                )}>
                    <ArrowUpRight className={cn("w-3 h-3", !trendUp && "rotate-90")} /> {trend}
                </div>
            )}
        </div>
        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{value}</h3>
            {sub && <span className="text-slate-400 text-[10px] font-bold uppercase">{sub}</span>}
        </div>
    </div>
);

export function StockStats({ items, stats, onFilterLowStock, filterActive }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard
                icon={Package}
                label="Total em Estoque"
                value={stats.totalItems}
                sub={`${stats.uniqueModels} modelos`}
                color="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                trend="+12%"
                trendUp={true}
            />
            <StatCard
                icon={DollarSign}
                label="Custo em Estoque"
                value={formatCurrency(stats.totalCost)}
                sub="Capital Imobilizado"
                color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
                icon={TrendingUp}
                label="Expectativa de Venda"
                value={formatCurrency(stats.totalRevenue)}
                sub={`Margem: ${stats.avgMargin.toFixed(1)}%`}
                color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            />
            <StatCard
                icon={AlertTriangle}
                label="Reposição"
                value={stats.lowStockCount}
                sub="Abaixo do Mínimo"
                color={cn(
                    stats.lowStockCount > 0
                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-400"
                )}
                onClick={onFilterLowStock}
                trend={filterActive ? "Ativo" : null}
                trendUp={false}
            />
        </div>
    );
}
