import React from 'react';
import {
    X, Smartphone, Battery, Tag, Calendar, Hash, ShieldCheck,
    Trash2, Edit2, Share2, ArrowRight, CheckCircle2, MoreVertical
} from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';

export function UnitDrawer({ open, onClose, model, onEditUnit, onDeleteUnit, onShareUnit }) {
    if (!open || !model) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer Content */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-950 shadow-2xl h-full overflow-hidden flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-100 dark:border-slate-800">

                {/* Header */}
                <div className="p-8 border-b border-slate-50 dark:border-slate-900 flex justify-between items-start">
                    <div className="flex gap-6">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-center p-3">
                            {model.image ? (
                                <img src={model.image} alt={model.name} className="w-full h-full object-contain" />
                            ) : (
                                <Smartphone className="w-8 h-8 text-slate-300" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                                    {model.category}
                                </span>
                                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                    {model.variants.length} Unidades
                                </span>
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{model.name}</h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* List of Units */}
                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unidades Disponíveis</h4>
                        <div className="flex gap-2">
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Saudável
                            </span>
                        </div>
                    </div>

                    {model.variants.map((unit) => (
                        <div
                            key={unit.id}
                            className="group bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 p-6 rounded-[2rem] transition-all duration-300"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 shadow-sm">
                                        {unit.storage}
                                    </span>
                                    <span className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 shadow-sm italic">
                                        {unit.color}
                                    </span>
                                    <span className={cn(
                                        "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                        unit.condition === 'lacrado' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                            unit.condition === 'vitrine' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                "bg-amber-50 text-amber-600 border-amber-100"
                                    )}>
                                        {unit.condition}
                                    </span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onEditUnit(unit)} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => onDeleteUnit(unit)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <Hash className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IMEI / Serial</p>
                                        <p className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{unit.imei || unit.barcode || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <Battery className={cn("w-4 h-4", parseInt(unit.batteryHealth) > 85 ? "text-emerald-500" : "text-amber-500")} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saúde Bateria</p>
                                        <p className="font-black text-xs text-slate-700 dark:text-slate-200">{unit.batteryHealth}%</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(unit.price)}</p>
                                    <span className="text-[9px] font-bold text-slate-400">À Vista</span>
                                </div>
                                <button
                                    onClick={() => onShareUnit(unit)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                                >
                                    <Share2 className="w-3.5 h-3.5" /> Compartilhar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50">
                    <button className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all active:scale-95">
                        Adicionar Nova Unidade
                    </button>
                </div>
            </div>
        </div>
    );
}
