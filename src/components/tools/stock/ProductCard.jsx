import React from 'react';
import { Smartphone, Share2, Edit2, TrendingUp, ArrowRight } from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';

export function ProductCard({ model, onOpen, onShare, onEdit, isSalesMode }) {
    const hasStock = model.totalQuantity > 0;

    return (
        <div
            onClick={() => onOpen(model.name)}
            className="group bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full"
        >
            {/* Image Header */}
            <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-800/50 relative overflow-hidden flex items-center justify-center p-8">
                {model.image ? (
                    <img
                        src={model.image}
                        alt={model.name}
                        className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200 dark:text-slate-700">
                        <Smartphone className="w-20 h-20" />
                    </div>
                )}

                {/* Badges Overlay */}
                <div className="absolute top-6 left-6 flex flex-col gap-2">
                    <span className="px-3 py-1 bg-white/90 dark:bg-black/40 backdrop-blur-md border border-slate-100 dark:border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm w-fit">
                        {model.category}
                    </span>
                    {model.variants?.some(v => v.hasNF) && (
                        <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 w-fit">
                            NF Disponível
                        </span>
                    )}
                </div>

                {/* Stock Status Badge */}
                <div className="absolute top-6 right-6">
                    <div className={cn(
                        "w-3 h-3 rounded-full shadow-lg",
                        hasStock ? "bg-emerald-500 shadow-emerald-500/20" : "bg-red-500 shadow-red-500/20"
                    )} />
                </div>
            </div>

            {/* Content Body */}
            <div className="p-8 flex flex-col flex-1">
                <div className="mb-4">
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                        {model.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {model.totalQuantity} {model.totalQuantity === 1 ? 'Unidade' : 'Unidades'} em estoque
                    </p>
                </div>

                {/* Specification Tags */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                    {[...model.storages].slice(0, 3).map(s => (
                        <span key={s} className="px-2 py-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {s}
                        </span>
                    ))}
                    {model.storages.size > 3 && <span className="text-[10px] font-bold text-slate-300">...</span>}
                </div>

                {/* Footer Actions */}
                <div className="mt-auto pt-6 border-t border-slate-50 dark:border-slate-800 flex items-end justify-between">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">A partir de</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">
                            {formatCurrency(model.minPrice)}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onShare(model); }}
                            className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20 group-hover:translate-x-1 transition-transform">
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
