import React from 'react';
import { Trash2, RotateCcw, Box, Smartphone, Hash, Calendar } from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TrashView({ items, onRestore, isLoading }) {
    if (isLoading) return null;

    if (items.length === 0) {
        return (
            <div className="py-32 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                    <Trash2 className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                </div>
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">A lixeira está vazia</h3>
                <p className="text-slate-400 font-medium mt-1">Nenhum item arquivado recentemente.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2.5rem] flex flex-col group transition-all"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 dark:text-white leading-tight">{item.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-100 dark:border-red-900/30">
                            Arquivado
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Arquivado em</p>
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                {item.deletedAt?.toDate ? format(item.deletedAt.toDate(), "dd/MM/yy HH:mm") : '---'}
                            </p>
                        </div>
                        <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Preço Original</p>
                            <p className="text-[11px] font-black text-slate-900 dark:text-white">{formatCurrency(item.price)}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => onRestore(item)}
                        className="mt-auto w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                        <RotateCcw className="w-4 h-4" /> Restaurar Item
                    </button>
                </div>
            ))}
        </div>
    );
}
