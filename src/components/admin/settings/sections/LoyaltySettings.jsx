import { Wallet, Info } from 'lucide-react';
import { cn } from '../../../../lib/utils';

export function LoyaltySettings({ data, onChange }) {
    // data structure: { enabled: boolean, cashbackPercent: number, expiryMonths: number, minRedemption: number }

    const settings = data || {
        enabled: false,
        cashbackPercent: 1.0,
        expiryMonths: 12,
        minRedemption: 10
    };

    const update = (key, value) => {
        onChange({ ...settings, [key]: value });
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Programa de Fidelidade (Cashback)</h3>
                <p className="text-sm text-slate-500 mb-6">Configure como seus clientes acumulam pontos nas compras.</p>
            </div>

            {/* Main Toggle */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-700">Ativar Cashback</h4>
                            <p className="text-xs text-slate-500">Seus clientes ganharão crédito em cada compra.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => update('enabled', !settings.enabled)}
                        className={cn(
                            "w-12 h-6 rounded-full relative transition-all duration-300",
                            settings.enabled ? "bg-indigo-600" : "bg-slate-300"
                        )}
                    >
                        <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                            settings.enabled ? "left-7" : "left-1"
                        )} />
                    </button>
                </div>
            </div>

            {/* Details */}
            {settings.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Porcentagem de Cashback (%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={settings.cashbackPercent}
                                onChange={e => update('cashbackPercent', parseFloat(e.target.value))}
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 pl-4 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-slate-700"
                                placeholder="1.0"
                            />
                            <span className="absolute right-4 top-3 text-slate-400 font-bold">%</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Ex: 1% de R$ 1.000,00 = R$ 10,00 de crédito.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Validade dos Créditos (Meses)</label>
                        <input
                            type="number"
                            value={settings.expiryMonths}
                            onChange={e => update('expiryMonths', parseInt(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-slate-700"
                            placeholder="12"
                        />
                        <p className="text-[10px] text-slate-400">Tempo até os pontos expirarem.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Resgate Mínimo (R$)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3 text-slate-400 font-bold">R$</span>
                            <input
                                type="number"
                                value={settings.minRedemption}
                                onChange={e => update('minRedemption', parseFloat(e.target.value))}
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 pl-9 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-slate-700"
                                placeholder="10.00"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400">Valor mínimo acumulado para permitir uso.</p>
                    </div>

                    <div className="md:col-span-2 bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-3 text-indigo-800 text-sm">
                        <Info className="w-5 h-5 shrink-0" />
                        <p>O sistema calculará automaticamente o cashback ao finalizar vendas na tela "Venda Smart". O saldo ficará vinculado ao cliente (CPF/Telefone).</p>
                    </div>
                </div>
            )}
        </div>
    );
}
