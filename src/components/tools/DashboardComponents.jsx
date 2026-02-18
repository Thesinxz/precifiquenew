
/* eslint-disable no-unused-vars */
import { cn } from '../../lib/utils';
import React from 'react';

export const MetricCard = ({ icon: Icon, label, value, trend, color = 'indigo', onClick }) => (
    <div
        onClick={onClick}
        className={cn(
            "bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-white/5 transition-all cursor-pointer group",
            "hover:shadow-xl hover:scale-[1.02] hover:border-slate-200 dark:hover:border-white/10"
        )}
    >
        <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors",
            color === 'indigo' && "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:group-hover:bg-indigo-500/20",
            color === 'emerald' && "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:group-hover:bg-emerald-500/20",
            color === 'amber' && "bg-amber-50 text-amber-600 group-hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:group-hover:bg-amber-500/20",
            color === 'blue' && "bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:group-hover:bg-blue-500/20"
        )}>
            <Icon className="w-6 h-6" />
        </div>
        <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-[0.1em] mb-1">
            {label}
        </p>
        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {value}
        </h3>
        {trend && (
            <p className={cn(
                "text-xs font-bold mt-2 flex items-center gap-1",
                trend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs ontem
            </p>
        )}
    </div>
);

export const QuickAction = ({ icon: Icon, label, color, onClick }) => (
    <button
        onClick={onClick}
        className={cn(
            "flex flex-col items-center gap-3 p-6 rounded-3xl border-2 border-dashed transition-all group",
            "hover:border-solid hover:shadow-lg",
            color === 'indigo' && "border-indigo-200 dark:border-indigo-500/20 hover:border-indigo-600 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10",
            color === 'emerald' && "border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-600 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10",
            color === 'amber' && "border-amber-200 dark:border-amber-500/20 hover:border-amber-600 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10"
        )}
    >
        <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
            color === 'indigo' && "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-500/10 dark:text-indigo-400 dark:group-hover:bg-indigo-500 dark:group-hover:text-white",
            color === 'emerald' && "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400 dark:group-hover:bg-emerald-500 dark:group-hover:text-white",
            color === 'amber' && "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white dark:bg-amber-500/10 dark:text-amber-400 dark:group-hover:bg-amber-500 dark:group-hover:text-white"
        )}>
            <Icon className="w-7 h-7" />
        </div>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300 group-hover:text-slate-900 dark:text-white dark:group-hover:text-white whitespace-nowrap">
            {label}
        </span>
    </button>
);
