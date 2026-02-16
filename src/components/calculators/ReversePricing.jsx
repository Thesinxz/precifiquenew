import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Percent, ArrowRight, Calculator, CreditCard, Wallet } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';

export function ReversePricing({ settings }) {
    const [targetNet, setTargetNet] = useState('');
    const [selectedGatewayId, setSelectedGatewayId] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('credit12x');

    const gateways = settings?.financial?.gateways || [];

    // Initial State Setup
    useEffect(() => {
        if (settings?.financial?.activeGatewayId) {
            setSelectedGatewayId(settings.financial.activeGatewayId);
        } else if (gateways.length > 0) {
            setSelectedGatewayId(gateways[0].id);
        }
    }, [settings]);

    const activeGateway = useMemo(() =>
        gateways.find(g => g.id === selectedGatewayId) || gateways[0],
        [selectedGatewayId, gateways]);

    const [machineRate, setMachineRate] = useState(0);
    const [reverseCharge, setReverseCharge] = useState(0);

    // Update rate based on selection
    useEffect(() => {
        if (activeGateway?.rates) {
            setMachineRate(activeGateway.rates[selectedMethod] || 0);
        }
    }, [activeGateway, selectedMethod]);

    useEffect(() => {
        const receive = parseFloat(targetNet) || 0;
        const rate = parseFloat(machineRate) || 0;

        const divisor = 1 - (rate / 100);
        if (divisor > 0 && receive > 0) {
            setReverseCharge(receive / divisor);
        } else {
            setReverseCharge(0);
        }
    }, [targetNet, machineRate]);

    const paymentOptions = [
        { id: 'pix', label: 'Pix' },
        { id: 'debit', label: 'Débito' },
        { id: 'credit1x', label: 'Crédito 1x' },
        ...Array.from({ length: (activeGateway?.rates?.maxInstallments || 12) - 1 }, (_, i) => ({
            id: `credit${i + 2}x`,
            label: `Crédito ${i + 2}x`
        }))
    ];

    return (
        <div className="max-w-4xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="border-slate-100 shadow-2xl overflow-hidden rounded-[2.5rem] bg-white">
                <div className="bg-slate-900 text-white p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <Calculator className="w-32 h-32 transform rotate-12" />
                    </div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-900/50">
                            <Calculator className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black tracking-tight text-white mb-2">Calculadora Reversa</h3>
                            <p className="text-slate-400 font-medium text-base">
                                Calcule o preço de cobrança para garantir seu recebimento líquido.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            {/* Gateway Selector */}
                            <div className="space-y-3">
                                <label className="text-slate-400 uppercase tracking-widest text-[10px] font-black ml-1">Maquininha / Gateway</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {gateways.map(g => (
                                        <button
                                            key={g.id}
                                            onClick={() => setSelectedGatewayId(g.id)}
                                            className={cn(
                                                "px-4 py-3 rounded-xl border-2 text-left transition-all flex items-center justify-between group",
                                                selectedGatewayId === g.id
                                                    ? "border-indigo-600 bg-indigo-50"
                                                    : "border-slate-100 hover:border-indigo-200 bg-slate-50/50"
                                            )}
                                        >
                                            <span className={cn("font-bold text-sm", selectedGatewayId === g.id ? "text-indigo-900" : "text-slate-600")}>
                                                {g.name}
                                            </span>
                                            {selectedGatewayId === g.id && <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Method Selector */}
                            <div className="space-y-3">
                                <label className="text-slate-400 uppercase tracking-widest text-[10px] font-black ml-1">Forma de Recebimento</label>
                                <select
                                    value={selectedMethod}
                                    onChange={(e) => setSelectedMethod(e.target.value)}
                                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                                >
                                    {paymentOptions.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-indigo-600 uppercase tracking-widest text-[10px] font-black ml-1">Líquido Desejado</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <DollarSign className="h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                                    </div>
                                    <input
                                        type="number"
                                        value={targetNet}
                                        onChange={(e) => setTargetNet(e.target.value)}
                                        className="w-full pl-12 h-16 text-2xl font-black text-slate-800 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all shadow-sm outline-none"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-rose-500 uppercase tracking-widest text-[10px] font-black ml-1 opacity-50">Taxa Aplicada Automaticamente</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Percent className="h-5 w-5 text-rose-400 group-focus-within:text-rose-600 transition-colors" />
                                    </div>
                                    <input
                                        type="number"
                                        readOnly
                                        value={machineRate}
                                        className="w-full pl-12 h-16 text-2xl font-black text-slate-400 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="bg-slate-900 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-2xl">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

                                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.3em] mb-4 relative z-10">Valor Sugerido para Cobrança</p>
                                <div className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-6 drop-shadow-md relative z-10">
                                    {formatCurrency(reverseCharge)}
                                </div>

                                <div className="bg-white/10 backdrop-blur-md rounded-2xl py-4 px-8 border border-white/10 w-full relative z-10">
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-slate-400 font-bold">Você recebe:</span>
                                        <span className="text-emerald-400 font-black">{formatCurrency(parseFloat(targetNet) || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-bold">Taxas ({machineRate}%):</span>
                                        <span className="text-rose-400 font-black">-{formatCurrency(reverseCharge - (parseFloat(targetNet) || 0))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-2xl text-xs font-bold border border-blue-100">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <ArrowRight className="w-4 h-4" />
                            </div>
                            <p>
                                O cálculo considera que a taxa será descontada do valor TOTAL cobrado.
                                <br /><span className="font-normal opacity-80">Fórmula: Receber / (1 - Taxa)</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
