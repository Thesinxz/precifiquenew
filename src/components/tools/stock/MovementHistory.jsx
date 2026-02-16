import React from 'react';
import {
    ArrowUpRight, ArrowDownLeft, Clock, Package,
    Smartphone, Hash, User, Calendar
} from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MovementHistory({ movements, isLoading }) {
    if (isLoading) return null;

    if (movements.length === 0) {
        return (
            <div className="py-20 text-center opacity-50">
                <Clock className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="font-bold text-slate-400">Nenhum histórico registrado ainda.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo / Data</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Variação</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                        {movements.map((move, idx) => {
                            const isEntry = move.type === 'entry' || move.change > 0;
                            return (
                                <tr key={idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                isEntry ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "bg-red-50 dark:bg-red-900/20 text-red-600"
                                            )}>
                                                {isEntry ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-tight">
                                                    {isEntry ? 'Entrada' : 'Saída'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold">
                                                    {move.timestamp?.toDate ? format(move.timestamp.toDate(), "dd MMM, HH:mm", { locale: ptBR }) : '---'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm italic">{move.itemName}</span>
                                            <span className="text-[9px] font-mono text-slate-400 uppercase">Ref: {move.itemId?.slice(-6)}</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-lg text-[10px] font-black",
                                                isEntry ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                                            )}>
                                                {isEntry ? '+' : ''}{move.change}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">unidades</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <User className="w-3 h-3 text-slate-400" />
                                            </div>
                                            <span className="text-xs font-medium text-slate-500">{move.userName || 'Sistema'}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <span className="text-sm font-black text-slate-800 dark:text-white">{move.finalStock || '--'}</span>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Final</p>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
