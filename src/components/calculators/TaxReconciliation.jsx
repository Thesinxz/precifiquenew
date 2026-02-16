import { useState, useMemo } from 'react';
import {
    Calculator,
    ArrowRight,
    CheckCircle,
    XCircle,
    DollarSign,
    CreditCard,
    Landmark,
    AlertTriangle,
    RefreshCw
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { useToast } from '../ui/Toast';

export function TaxReconciliation({ settings }) {
    const { showToast } = useToast();
    const [amount, setAmount] = useState('');
    const [installments, setInstallments] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('credit'); // credit, debit, pix
    const [selectedGatewayId, setSelectedGatewayId] = useState(settings?.financial?.activeGatewayId);
    const [receivedAmount, setReceivedAmount] = useState('');

    const gateway = useMemo(() => {
        return settings?.financial?.gateways?.find(g => g.id === selectedGatewayId) || settings?.financial?.gateways?.[0];
    }, [selectedGatewayId, settings]);

    const calculation = useMemo(() => {
        const saleValue = parseFloat(amount) || 0;
        if (saleValue <= 0) return null;

        const rates = gateway?.rates || {};
        let rateApplied = 0;

        if (paymentMethod === 'pix') {
            rateApplied = parseFloat(rates.pix) || 0;
        } else if (paymentMethod === 'debit') {
            rateApplied = parseFloat(rates.debit) || 0;
        } else {
            // Credit
            if (installments === 1) {
                rateApplied = parseFloat(rates.credit1x) || 0;
            } else {
                // Interpolate or find exact rate
                const rate1x = parseFloat(rates.credit1x) || 0;
                const maxInst = rates.maxInstallments || 12;
                const rateMax = parseFloat(rates[`credit${maxInst}x`] || rates.credit12x) || 0;

                // If we have distinct rates, logic (basic linear interpolation fallback)
                // Try to find exact key first "creditNx"
                const exactKey = `credit${installments}x`;
                if (rates[exactKey] !== undefined && rates[exactKey] !== "") {
                    rateApplied = parseFloat(rates[exactKey]);
                } else {
                    // Interpolate
                    if (maxInst > 1) {
                        const step = (rateMax - rate1x) / (maxInst - 1);
                        rateApplied = rate1x + (step * (installments - 1));
                    } else {
                        rateApplied = rate1x;
                    }
                }
            }
        }

        const feeAmount = saleValue * (rateApplied / 100);
        const expectedNet = saleValue - feeAmount;

        return {
            rateApplied,
            feeAmount,
            expectedNet
        };
    }, [amount, installments, paymentMethod, gateway]);

    const diff = useMemo(() => {
        if (!calculation || !receivedAmount) return null;
        const realNet = parseFloat(receivedAmount) || 0;
        const difference = realNet - calculation.expectedNet;
        return {
            value: difference,
            isMatch: Math.abs(difference) < 0.05, // Tolerance of 5 cents
            percentage: (difference / calculation.expectedNet) * 100
        };
    }, [calculation, receivedAmount]);

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-violet-600 shadow-lg shadow-violet-100 rounded-2xl text-white">
                        <Landmark className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Conciliação de Taxas</h1>
                        <p className="text-slate-500 font-medium tracking-tight">Auditoria rápida de recebimentos vs taxas contratadas.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gateway Ativo:</span>
                    <select
                        value={selectedGatewayId}
                        onChange={(e) => setSelectedGatewayId(e.target.value)}
                        className="bg-slate-50 border-none py-2 px-4 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                        {settings?.financial?.gateways?.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Input Section */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-full">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-violet-500" />
                            Dados da Venda
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Valor Bruto da Venda</label>
                                <div className="relative group">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-violet-500 transition-colors" />
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0,00"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-lg font-bold text-slate-800 outline-none focus:border-violet-500 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Método de Pagamento</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setPaymentMethod('pix')}
                                        className={cn(
                                            "py-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all",
                                            paymentMethod === 'pix' ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100"
                                        )}
                                    >Pix</button>
                                    <button
                                        onClick={() => setPaymentMethod('debit')}
                                        className={cn(
                                            "py-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all",
                                            paymentMethod === 'debit' ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100"
                                        )}
                                    >Débito</button>
                                    <button
                                        onClick={() => setPaymentMethod('credit')}
                                        className={cn(
                                            "py-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all",
                                            paymentMethod === 'credit' ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100"
                                        )}
                                    >Crédito</button>
                                </div>
                            </div>

                            {paymentMethod === 'credit' && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Parcelamento</label>
                                    <select
                                        value={installments}
                                        onChange={e => setInstallments(parseInt(e.target.value))}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-4 text-sm font-bold text-slate-700 outline-none focus:border-violet-500"
                                    >
                                        <option value={1}>À Vista (1x)</option>
                                        {[...Array((gateway?.rates?.maxInstallments || 12) - 1)].map((_, i) => (
                                            <option key={i + 2} value={i + 2}>{i + 2}x Parcelado</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="pt-6 border-t border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Valor Líquido Recebido (Real)</label>
                                <div className="relative group">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        type="number"
                                        value={receivedAmount}
                                        onChange={e => setReceivedAmount(e.target.value)}
                                        placeholder="Quanto caiu na conta?"
                                        className="w-full bg-emerald-50/50 border-2 border-emerald-100 rounded-2xl py-4 pl-12 pr-4 text-lg font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Calculation Result Section */}
                <div className="lg:col-span-7 space-y-6">
                    {calculation ? (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            {/* Summary Card */}
                            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
                                    <div>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Valor Líquido Esperado</p>
                                        <p className="text-5xl font-black tracking-tighter">{formatCurrency(calculation.expectedNet)}</p>
                                        <div className="flex items-center gap-2 mt-4 text-sm font-medium text-slate-300 bg-white/10 px-3 py-1.5 rounded-lg w-fit">
                                            <span>Taxa Aplicada:</span>
                                            <span className="text-white font-bold">{calculation.rateApplied.toFixed(2)}%</span>
                                            <span className="text-white/50">|</span>
                                            <span>Desconto:</span>
                                            <span className="text-red-300 font-bold">-{formatCurrency(calculation.feeAmount)}</span>
                                        </div>
                                    </div>

                                    {/* Match Indicator */}
                                    {diff && (
                                        <div className={cn(
                                            "px-6 py-4 rounded-2xl flex items-center gap-3 border shadow-lg backdrop-blur-md",
                                            diff.isMatch
                                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                                                : "bg-red-500/20 border-red-500/50 text-red-300"
                                        )}>
                                            {diff.isMatch ? (
                                                <>
                                                    <CheckCircle className="w-8 h-8" />
                                                    <div>
                                                        <p className="font-black uppercase tracking-widest text-xs">Batendo!</p>
                                                        <p className="text-sm font-medium">Valores conferem.</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-8 h-8" />
                                                    <div>
                                                        <p className="font-black uppercase tracking-widest text-xs">Divergência</p>
                                                        <p className="text-sm font-medium">{formatCurrency(diff.value)} de diferença.</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Detailed Analysis if Diff */}
                            {diff && !diff.isMatch && (
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        Análise da Divergência
                                    </h3>
                                    <div className="space-y-4 text-sm text-slate-600">
                                        <p>
                                            Você recebeu <strong className="text-slate-900">{formatCurrency(receivedAmount)}</strong>, mas deveria ter recebido <strong className="text-slate-900">{formatCurrency(calculation.expectedNet)}</strong>.
                                        </p>
                                        <p>
                                            A diferença é de <strong className="text-red-500">{formatCurrency(Math.abs(diff.value))}</strong>.
                                        </p>

                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Possíveis Causas:</p>
                                            <ul className="list-disc pl-4 space-y-1">
                                                <li>A taxa cadastrada no sistema ({calculation.rateApplied}%) está desatualizada.</li>
                                                <li>O gateway cobrou uma taxa de antecipação não prevista.</li>
                                                <li>Houve cobrança de aluguel de máquina descontado nesta venda.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                <Calculator className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-400">Entre com os dados da venda ao lado</h3>
                            <p className="text-slate-400 text-sm mt-2 max-w-xs">Simule e confira se as taxas cobradas estão corretas.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
