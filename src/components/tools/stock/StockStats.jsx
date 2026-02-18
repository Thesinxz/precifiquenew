import React from 'react';
import { Package, DollarSign, TrendingUp, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';
import { BentoGrid } from '../../ui/BentoGrid';
import { GlassCard } from '../../ui/GlassCard';

export function StockStats({ stats, onFilterLowStock, filterActive }) {
    return (
        <BentoGrid cols={4} className="mb-10">
            <GlassCard
                className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-500/20"
                hoverEffect={true}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Package className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                        <ArrowUpRight className="w-3 h-3" /> +12%
                    </div>
                </div>
                <div>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total em Estoque</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{stats.totalItems}</h3>
                        <span className="text-slate-400 text-[10px] font-bold uppercase">{stats.uniqueModels} modelos</span>
                    </div>
                </div>
            </GlassCard>

            <GlassCard
                className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-500/20"
                hoverEffect={true}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>
                <div>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Custo em Estoque</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{formatCurrency(stats.totalCost)}</h3>
                        <span className="text-slate-400 text-[10px] font-bold uppercase">Imobilizado</span>
                    </div>
                </div>
            </GlassCard>

            <GlassCard
                className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-500/20"
                hoverEffect={true}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>
                <div>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Expectativa de Venda</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{formatCurrency(stats.totalRevenue)}</h3>
                        <span className="text-slate-400 text-[10px] font-bold uppercase">Mg: {stats.avgMargin.toFixed(1)}%</span>
                    </div>
                </div>
            </GlassCard>

            <GlassCard
                onClick={onFilterLowStock}
                className={cn(
                    "cursor-pointer",
                    filterActive
                        ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-500/30 ring-2 ring-red-500/20"
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                )}
                hoverEffect={true}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                        stats.lowStockCount > 0 ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    {filterActive && (
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20">
                            Filtro Ativo
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Reposição Necessária</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className={cn("text-3xl font-black tracking-tighter", stats.lowStockCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-300")}>
                            {stats.lowStockCount}
                        </h3>
                        <span className="text-slate-400 text-[10px] font-bold uppercase">Itens</span>
                    </div>
                </div>
            </GlassCard>
        </BentoGrid>
    );
}
