import { useState } from 'react';
import { Plus, Trash2, LineChart, Wallet, Target } from 'lucide-react';
import { InputGroup } from './_Shared';

export function BusinessSettings({ data, onChange }) {
    // data: { fixedCosts: [], monthlyGoal: 0 }
    const fixedCosts = data?.fixedCosts || [];

    const handleUpdate = (field, value) => {
        onChange({ ...data, [field]: value });
    };

    const addCost = () => {
        handleUpdate('fixedCosts', [...fixedCosts, { id: Date.now(), name: 'Novo Gasto', value: 0 }]);
    };

    const removeCost = (id) => {
        handleUpdate('fixedCosts', fixedCosts.filter(c => c.id !== id));
    };

    const updateCost = (id, field, value) => {
        handleUpdate('fixedCosts', fixedCosts.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const totalFixedCosts = fixedCosts.reduce((acc, c) => acc + (parseFloat(c.value) || 0), 0);

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-indigo-600" />
                    Custos Fixos Mensais
                </h3>
                <p className="text-sm text-slate-500 mb-6">Cadastre aluguel, salários, energia e outros gastos para calcular o DRE real.</p>

                <div className="space-y-3">
                    {fixedCosts.map(cost => (
                        <div key={cost.id} className="flex gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                                <input
                                    value={cost.name}
                                    onChange={e => updateCost(cost.id, 'name', e.target.value)}
                                    className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="w-32">
                                <InputGroup
                                    label="Valor"
                                    value={cost.value}
                                    onChange={v => updateCost(cost.id, 'value', v)}
                                    prefix="R$"
                                    compactLabel
                                />
                            </div>
                            <button
                                onClick={() => removeCost(cost.id)}
                                className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors mb-0.5"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={addCost}
                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Adicionar Custo Fixo
                    </button>
                </div>

                <div className="mt-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                    <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Total Custos Fixos</span>
                    <span className="text-lg font-black text-indigo-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFixedCosts)}
                    </span>
                </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-600" />
                    Metas de Faturamento
                </h3>
                <p className="text-sm text-slate-500 mb-6">Defina seu objetivo mensal para acompanhar o progresso no dashboard.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup
                        label="Meta de Venda Mensal"
                        value={data?.monthlyGoal || 0}
                        onChange={v => handleUpdate('monthlyGoal', v)}
                        prefix="R$"
                        placeholder="Ex: 50.000"
                    />
                    <InputGroup
                        label="Comissão Padrão (%)"
                        value={data?.defaultCommission || 0}
                        onChange={v => handleUpdate('defaultCommission', v)}
                        prefix="%"
                        placeholder="Ex: 1.5"
                    />
                </div>

                <div className="mt-6 bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <LineChart className="w-3.5 h-3.5" />
                        Impacto no BI & Lucratividade
                    </p>
                    <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                        O sistema usará seus custos fixos e a comissão de {data?.defaultCommission || 0}% para calcular o seu <b>Lucro Líquido Real</b> no dashboard.
                        Isso ajuda a identificar se suas margens estão sendo suficientes para cobrir a operação.
                    </p>
                </div>
            </div>

            <div className="pt-8 border-t border-slate-100 italic text-slate-400 text-[10px] flex items-center gap-2">
                <LineChart className="w-4 h-4" />
                Estes dados são usados para as fórmulas de Business Intelligence no Dashboard.
            </div>
        </div>
    );
}
