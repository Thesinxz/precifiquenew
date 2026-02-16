import React from 'react';
import {
    Edit2, Trash2, Tag, Share2, Smartphone, Battery,
    ChevronRight, MoreVertical, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';

export function ProductList({ items, onEdit, onDelete, onShare, onPrintLabel, isSalesMode, userRole }) {
    const isAdmin = userRole === 'owner' || userRole === 'admin';

    return (
        <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto / SKU</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Especificações</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Saúde Bat.</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estoque</th>
                        {isAdmin && <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Custo / Venda</th>}
                        {!isAdmin && <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Venda</th>}
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                    {items.map((item) => (
                        <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt="" className="w-full h-full object-contain rounded-xl" />
                                        ) : (
                                            <Smartphone className="w-6 h-6" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-800 dark:text-white tracking-tight">{item.name}</p>
                                        <p className="text-[10px] font-mono text-slate-400 uppercase">{item.imei || item.barcode || 'S/N ---'}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="p-6 text-xs">
                                <div className="flex flex-col gap-1">
                                    <div className="flex gap-2">
                                        <span className="font-bold text-slate-600 dark:text-slate-300">{item.storage || 'N/A'}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-slate-500 italic lowercase">{item.color || 'padrão'}</span>
                                    </div>
                                    <span className={cn(
                                        "w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
                                        item.condition === 'lacrado' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                            item.condition === 'vitrine' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                "bg-amber-50 text-amber-600 border-amber-100"
                                    )}>
                                        {item.condition}
                                    </span>
                                </div>
                            </td>
                            <td className="p-6 text-center">
                                {item.batteryHealth ? (
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={cn(
                                            "font-black text-xs",
                                            parseInt(item.batteryHealth) > 85 ? "text-emerald-500" : "text-amber-500"
                                        )}>
                                            {item.batteryHealth}%
                                        </span>
                                        <div className="w-12 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full", parseInt(item.batteryHealth) > 85 ? "bg-emerald-500" : "bg-amber-500")}
                                                style={{ width: `${item.batteryHealth}%` }}
                                            />
                                        </div>
                                    </div>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="p-6 text-center">
                                <div className="inline-flex flex-col items-center">
                                    <span className={cn(
                                        "font-black text-sm",
                                        item.quantity <= (item.minQuantity || 5) ? "text-red-500" : "text-slate-700 dark:text-slate-200"
                                    )}>
                                        {item.quantity}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">un</span>
                                </div>
                            </td>
                            <td className="p-6 text-right">
                                {isAdmin && (
                                    <div className="flex flex-col">
                                        <span className="text-slate-400 text-[10px] font-medium line-through">{formatCurrency(item.cost)}</span>
                                        <span className="font-black text-slate-900 dark:text-white text-sm">{formatCurrency(item.price)}</span>
                                    </div>
                                )}
                                {!isAdmin && (
                                    <span className="font-black text-slate-900 dark:text-white text-sm">{formatCurrency(item.price)}</span>
                                )}
                            </td>
                            <td className="p-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => onShare(item)}
                                        className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600"
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onEdit(item)}
                                        className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(item)}
                                        className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
