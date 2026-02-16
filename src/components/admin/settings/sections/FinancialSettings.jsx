import { useState } from 'react';
import { Plus, Trash2, Edit3, CheckCircle2 } from 'lucide-react';
import { InputGroup } from './_Shared';
import { cn } from '../../../../lib/utils';

export function FinancialSettings({ data, onChange }) {
    // data: { gateways: [], notaFiscalRate }
    const [activeGatewayId, setActiveGatewayId] = useState(data?.gateways?.[0]?.id || null);
    const [editingGatewayId, setEditingGatewayId] = useState(null);

    const activeGateway = data?.gateways?.find(g => g.id === activeGatewayId) || data?.gateways?.[0];

    const handleUpdate = (field, value) => {
        onChange({ ...data, [field]: value });
    };

    const handleGatewayUpdate = (id, field, value) => {
        const updatedGateways = data.gateways.map(g => {
            if (g.id === id) {
                if (field === 'rates') return { ...g, rates: { ...g.rates, ...value } };
                return { ...g, [field]: value };
            }
            return g;
        });
        handleUpdate('gateways', updatedGateways);
    };

    const addGateway = () => {
        const newId = `gw_${Date.now()}`;
        const newGW = {
            id: newId,
            name: 'Novo Gateway',
            rates: {
                pix: 0,
                debit: 1.99,
                credit1x: 3.99,
                credit12x: 12.99,
                maxInstallments: 12
            }
        };
        handleUpdate('gateways', [...(data.gateways || []), newGW]);
        setActiveGatewayId(newId);
        setEditingGatewayId(newId); // Auto open Edit name
    };

    const removeGateway = (id) => {
        if (data.gateways.length <= 1) return alert("Você precisa de pelo menos 1 gateway.");
        const filtered = data.gateways.filter(g => g.id !== id);
        handleUpdate('gateways', filtered);
        if (activeGatewayId === id) setActiveGatewayId(filtered[0].id);
    };

    return (
        <div className="space-y-8">

            {/* Top Bar: Gateways List */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Gateways & Taxas</h3>
                    <button
                        onClick={addGateway}
                        className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Gateway
                    </button>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2">
                    {data?.gateways?.map(gw => (
                        <div
                            key={gw.id}
                            onClick={() => setActiveGatewayId(gw.id)}
                            className={cn(
                                "min-w-[160px] p-4 rounded-xl border-2 cursor-pointer transition-all relative group",
                                activeGatewayId === gw.id ? "border-indigo-600 bg-indigo-50" : "border-slate-100 bg-white hover:border-slate-300"
                            )}
                        >
                            <div className="text-xs font-medium text-slate-400 mb-1">Gateway</div>
                            {editingGatewayId === gw.id ? (
                                <input
                                    autoFocus
                                    value={gw.name}
                                    onChange={e => handleGatewayUpdate(gw.id, 'name', e.target.value)}
                                    onBlur={() => setEditingGatewayId(null)}
                                    className="w-full bg-transparent font-bold text-slate-800 border-b border-indigo-300 outline-none"
                                />
                            ) : (
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-800 truncate">{gw.name}</span>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingGatewayId(gw.id); }} className="opacity-0 group-hover:opacity-100 text-indigo-500">
                                        <Edit3 className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                            {activeGatewayId === gw.id && <div className="absolute top-2 right-2 text-indigo-600"><CheckCircle2 className="w-4 h-4" /></div>}
                        </div>
                    ))}
                </div>
            </div>

            {activeGateway && (
                <div className="animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                        <h4 className="font-bold text-slate-600">Taxas para <span className="text-indigo-600">{activeGateway.name}</span></h4>
                        <button onClick={() => removeGateway(activeGateway.id)} className="text-red-400 hover:text-red-600 text-xs font-bold flex items-center gap-1">
                            <Trash2 className="w-3 h-3" />
                            Excluir Gateway
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <InputGroup
                                label="PIX (À Vista)"
                                value={activeGateway.rates.pix}
                                onChange={v => handleGatewayUpdate(activeGateway.id, 'rates', { pix: v })}
                                suffix="%"
                                compactLabel
                            />
                            <InputGroup
                                label="Débito"
                                value={activeGateway.rates.debit}
                                onChange={v => handleGatewayUpdate(activeGateway.id, 'rates', { debit: v })}
                                suffix="%"
                                compactLabel
                            />
                            <InputGroup
                                label="Crédito (1x)"
                                value={activeGateway.rates.credit1x}
                                onChange={v => handleGatewayUpdate(activeGateway.id, 'rates', { credit1x: v })}
                                suffix="%"
                                compactLabel
                            />
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-500">Max. Parcelas</label>
                                <select
                                    value={activeGateway.rates.maxInstallments || 12}
                                    onChange={e => handleGatewayUpdate(activeGateway.id, 'rates', { maxInstallments: e.target.value })}
                                    className="w-full rounded-xl border-slate-200 bg-slate-50 p-3 text-sm font-medium focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {[12, 18, 21, 24].map(n => <option key={n} value={n}>{n}x</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Parcelado (Crédito)</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {Array.from({ length: activeGateway.rates.maxInstallments || 12 }).map((_, i) => {
                                    const install = i + 1;
                                    if (install === 1) return null;
                                    const key = `credit${install}x`;
                                    return (
                                        <div key={install} className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-slate-400 text-center">{install}x</label>
                                            <input
                                                type="number"
                                                value={activeGateway.rates[key] || ''}
                                                onChange={e => handleGatewayUpdate(activeGateway.id, 'rates', { [key]: e.target.value })}
                                                className="w-full text-center rounded-lg border-slate-200 p-2 text-xs font-medium focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="%"
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Settings */}
            <div className="border-t border-slate-100 pt-8 mt-8 space-y-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Nota Fiscal & Câmbio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputGroup
                            label="Custo Médio de Nota Fiscal (%)"
                            value={data?.notaFiscalRate || 0}
                            onChange={v => handleUpdate('notaFiscalRate', v)}
                            suffix="%"
                            placeholder="Ex: 6.0"
                        />
                        <InputGroup
                            label="Cotação do Dólar (USDT/Cash)"
                            value={data?.dollarRate || 0}
                            onChange={v => handleUpdate('dollarRate', v)}
                            suffix="BRL"
                            placeholder="Ex: 5.40"
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Valores globais usados para cálculos de impostos e conversão de custos de importação.</p>
                </div>

                <div className="pt-4 border-t border-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Comissões de Vendedores</h3>
                    <InputGroup
                        label="Comissão Padrão por Venda (%)"
                        value={data?.commissionRate || 0}
                        onChange={v => handleUpdate('commissionRate', v)}
                        suffix="%"
                        placeholder="Ex: 2.0"
                    />
                    <p className="text-xs text-slate-400 mt-2">Valor base para cálculo de comissão de vendedores sobre o preço de venda líquido.</p>
                </div>
            </div>

        </div>
    );
}
