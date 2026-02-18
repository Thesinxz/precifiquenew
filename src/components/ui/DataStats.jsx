import React from 'react';
import { GlassCard } from './GlassCard';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export function DataStats({ stats }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
                <GlassCard key={index} hoverEffect={true} className="flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${stat.colorClass || 'bg-indigo-50 text-indigo-600'}`}>
                            {stat.icon}
                        </div>
                        {stat.trend && (
                            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${stat.trend > 0 ? 'bg-green-50 text-green-600' :
                                    stat.trend < 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
                                }`}>
                                {stat.trend > 0 ? <ArrowUpRight className="w-3 h-3" /> :
                                    stat.trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                {Math.abs(stat.trend)}%
                            </div>
                        )}
                    </div>
                    <div>
                        <span className="text-slate-500 text-sm font-medium">{stat.label}</span>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                            {stat.value}
                        </h3>
                        {stat.trendLabel && (
                            <p className="text-xs text-slate-400 mt-2">{stat.trendLabel}</p>
                        )}
                    </div>
                </GlassCard>
            ))}
        </div>
    );
}
