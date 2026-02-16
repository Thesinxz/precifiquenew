import { useState } from 'react';
import { Plus, Trash2, Building2, LayoutGrid } from 'lucide-react';
import { cn } from '../../../../lib/utils';

export function CostCenterSettings({ data = [], onChange }) {
    const [newItemName, setNewItemName] = useState('');

    const handleAdd = () => {
        if (!newItemName.trim()) return;
        const newId = `cc_${Date.now()}`;
        const newItem = {
            id: newId,
            name: newItemName.trim(),
            active: true
        };
        onChange([...data, newItem]);
        setNewItemName('');
    };

    const handleDelete = (id) => {
        onChange(data.filter(item => item.id !== id));
    };

    const toggleActive = (id) => {
        onChange(data.map(item => item.id === id ? { ...item, active: !item.active } : item));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-indigo-500" />
                        Centros de Custo
                    </h3>
                    <p className="text-sm text-slate-500">Defina setores ou departamentos para classificar suas finanças.</p>
                </div>
            </div>

            {/* Inclusão Rápida */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Novo Centro de Custo</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        placeholder="Ex: Matriz, Filial 01, Marketing, Administrativo"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-indigo-500 outline-none shadow-sm"
                        onKeyPress={e => e.key === 'Enter' && handleAdd()}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newItemName.trim()}
                        className="bg-indigo-600 text-white px-6 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
                    >
                        <Plus className="w-5 h-5" />
                        Adicionar
                    </button>
                </div>
            </div>

            {/* Lista de Centros */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.length === 0 ? (
                    <div className="col-span-1 md:col-span-2 p-12 text-center bg-white border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                        <p className="text-slate-400 font-medium">Você ainda não cadastrou nenhum centro de custo.</p>
                    </div>
                ) : (
                    data.map((cc) => (
                        <div key={cc.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between group hover:border-indigo-200 transition-all shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center font-black",
                                    cc.active ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-300"
                                )}>
                                    <LayoutGrid className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className={cn("font-bold text-slate-800", !cc.active && "opacity-50")}>{cc.name}</h4>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ativo para Lançamentos</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => toggleActive(cc.id)}
                                    className={cn(
                                        "p-2 rounded-xl transition-all",
                                        cc.active ? "text-emerald-500 hover:bg-emerald-50" : "text-amber-500 hover:bg-amber-50"
                                    )}
                                    title={cc.active ? "Desativar" : "Ativar"}
                                >
                                    <CheckCircle2 className={cn("w-5 h-5", !cc.active && "opacity-20")} />
                                </button>
                                <button
                                    onClick={() => handleDelete(cc.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Internal Icons for better visibility
function CheckCircle2({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" />
        </svg>
    )
}
