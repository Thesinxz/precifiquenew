import React from 'react';
import {
    Edit2, Trash2, Tag, Share2, Smartphone, Printer
} from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';

export function ProductList({ items, onEdit, onDelete, onShare, onPrintLabel, isSalesMode, userRole }) {
    const isAdmin = userRole === 'owner' || userRole === 'admin';

    return (
        <div className="w-full overflow-hidden rounded-[2.5rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl shadow-indigo-500/5">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 dark:border-white/5">
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md z-10">Produto / SKU</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md z-10">Especificações</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md z-10">Saúde Bat.</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md z-10">Estoque</th>
                            {isAdmin && <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md z-10">Custo / Venda</th>}
                            {!isAdmin && <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md z-10">Venda</th>}
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md z-10">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 dark:divide-white/5">
                        {items.map((item) => (
                            <tr key={item.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all duration-300">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700 shrink-0 group-hover:scale-105 transition-transform">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt="" className="w-full h-full object-contain rounded-xl p-1" />
                                            ) : (
                                                <Smartphone className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-800 dark:text-white tracking-tight text-sm mb-1 group-hover:text-indigo-600 transition-colors">{item.name}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md w-fit">{item.imei || item.barcode || 'S/N ---'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 text-xs">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <span className="font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">{item.storage || 'N/A'}</span>
                                            <span className="font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 capitalize">{item.color || 'padrão'}</span>
                                        </div>
                                        <span className={cn(
                                            "w-fit px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
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
                                        <div className="flex flex-col items-center gap-1.5">
                                            <span className={cn(
                                                "font-black text-xs px-2 py-0.5 rounded-full border",
                                                parseInt(item.batteryHealth) > 85
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                    : "bg-amber-50 text-amber-600 border-amber-100"
                                            )}>
                                                {item.batteryHealth}%
                                            </span>
                                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-500", parseInt(item.batteryHealth) > 85 ? "bg-emerald-500" : "bg-amber-500")}
                                                    style={{ width: `${item.batteryHealth}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="p-6 text-center">
                                    <div className="inline-flex flex-col items-center">
                                        <span className={cn(
                                            "font-black text-sm px-3 py-1 rounded-xl border",
                                            item.quantity <= (item.minQuantity || 5)
                                                ? "bg-red-50 text-red-600 border-red-100 animate-pulse"
                                                : "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                                        )}>
                                            {item.quantity}
                                        </span>
                                        {item.quantity <= (item.minQuantity || 5) && (
                                            <span className="text-[8px] font-bold text-red-400 uppercase mt-1">Baixo</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-6 text-right">
                                    {isAdmin && (
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-slate-400 text-[10px] font-medium line-through decoration-red-300">{formatCurrency(item.cost)}</span>
                                            <span className="font-black text-slate-900 dark:text-white text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg">{formatCurrency(item.price)}</span>
                                        </div>
                                    )}
                                    {!isAdmin && (
                                        <span className="font-black text-slate-900 dark:text-white text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg">{formatCurrency(item.price)}</span>
                                    )}
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                        <button
                                            onClick={() => onShare(item)}
                                            className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"
                                            title="Compartilhar Link"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        {onPrintLabel && (
                                            <button
                                                onClick={() => onPrintLabel([item])}
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                                title="Imprimir Etiqueta"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onDelete(item)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                            title="Excluir"
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
            {items.length === 0 && (
                <div className="p-10 text-center text-slate-400 font-medium">
                    Nenhum item encontrado nesta visualização.
                </div>
            )}
        </div>
    );
}
