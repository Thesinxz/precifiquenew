import { useState, useEffect } from 'react';
import {
    Bot,
    Sparkles,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Lightbulb,
    ArrowRight,
    DollarSign
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { StockService } from '../../services/stockService';
import { HistoryService } from '../../services/historyService';
import { askBusinessAdvisor } from '../../services/aiService';
import { useToast } from '../ui/Toast';

export function BusinessAdvisor({ user, userProfile }) {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [advice, setAdvice] = useState(null);
    const [context, setContext] = useState(null);

    // Initial Load of Data
    useEffect(() => {
        loadData();
    }, [userProfile]);

    const loadData = async () => {
        if (!userProfile?.organizationId) return;
        setIsLoading(true);
        try {
            const orgId = userProfile.organizationId;
            const [stockItems, historyItems] = await Promise.all([
                StockService.getStock(orgId),
                HistoryService.getHistory(orgId, 20)
            ]);

            // Calculate Metrics for AI
            const totalStockValue = stockItems.reduce((acc, i) => acc + (i.cost * i.quantity), 0);

            // Stagnant: Items with qty > 0 that haven't been "calculated" recently matches name
            const recentNames = new Set(historyItems.map(h => h.name.toLowerCase()));
            const stagnant = stockItems
                .filter(i => i.quantity > 0 && !recentNames.has(i.name.toLowerCase()))
                .sort((a, b) => (b.cost * b.quantity) - (a.cost * a.quantity))
                .slice(0, 5)
                .map(i => `${i.name} (${i.quantity}un - ${formatCurrency(i.cost * i.quantity)})`)
                .join(", ");

            // Top Revenue Potential
            const top = stockItems
                .filter(i => i.quantity > 0)
                .sort((a, b) => (b.cost * b.quantity) - (a.cost * a.quantity))
                .slice(0, 3)
                .map(i => i.name)
                .join(", ");

            const potentialRevenue = stockItems.reduce((acc, i) => {
                // Est. 20% margin if simple
                return acc + (i.cost * i.quantity * 1.2);
            }, 0);

            const ctx = {
                totalStockValue: formatCurrency(totalStockValue),
                stagnantItems: stagnant || "Nenhum item estagnado grave.",
                topItems: top || "Estoque vazio.",
                potentialRevenue: formatCurrency(potentialRevenue)
            };

            setContext(ctx);

            // Auto-ask AI if no advice yet
            if (!advice) {
                handleAskAi(ctx);
            }

        } catch (error) {
            console.error(error);
            showToast("Erro ao carregar dados.", "error");
            setIsLoading(false);
        }
    };

    const handleAskAi = async (ctxData) => {
        setIsLoading(true);
        try {
            const result = await askBusinessAdvisor(ctxData);
            setAdvice(result);
        } catch (e) {
            console.error(e);
            showToast("Erro ao consultar a IA.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-200 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="p-6 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                        <Bot className="w-12 h-12 text-indigo-300" />
                    </div>
                    <div className="text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                            <h1 className="text-4xl font-black tracking-tighter">I.A. Business Advisor</h1>
                            <span className="bg-indigo-500/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-indigo-400/30">Beta</span>
                        </div>
                        <p className="text-indigo-200 text-lg font-medium max-w-lg leading-relaxed">
                            Seu consultor 24/7. Analiso seu estoque parado e prevejo oportunidades de lucro baseadas nos seus dados reais.
                        </p>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 animate-pulse">
                    <div className="relative">
                        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                        <Sparkles className="w-6 h-6 text-amber-400 absolute -top-1 -right-1 animate-bounce" />
                    </div>
                    <div>
                        <p className="text-slate-800 font-black text-lg">Gerando 10 Estratégias Avançadas...</p>
                        <p className="text-slate-400 font-medium text-sm">Aguarde enquanto a I.A. analisa seu giro de estoque e margens.</p>
                    </div>
                </div>
            )}

            {/* Advice Content */}
            {!isLoading && advice && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">

                    {/* Main Analysis Card */}
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl shadow-indigo-500/5 relative overflow-hidden">
                        <div className="absolute left-0 top-0 h-full w-2 bg-indigo-600"></div>
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Bot className="w-4 h-4" /> Diagnóstico de Especialista
                        </h3>
                        <p className="text-2xl font-black text-slate-800 leading-tight">
                            {advice.analysis}
                        </p>
                    </div>

                    {/* Action Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {advice.tips.map((tip, idx) => (
                            <div key={idx} className={cn(
                                "p-8 rounded-[2.5rem] border-2 flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-2xl",
                                tip.type === 'alert' ? "bg-red-50/50 border-red-100" :
                                    tip.type === 'growth' ? "bg-emerald-50/50 border-emerald-100" :
                                        "bg-indigo-50/50 border-indigo-100" // profit
                            )}>
                                <div>
                                    <div className="flex items-start justify-between mb-6">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                                            tip.type === 'alert' ? "bg-red-500" :
                                                tip.type === 'growth' ? "bg-emerald-500" :
                                                    "bg-indigo-500"
                                        )}>
                                            {tip.type === 'alert' && <AlertTriangle className="w-6 h-6" />}
                                            {tip.type === 'growth' && <TrendingUp className="w-6 h-6" />}
                                            {tip.type === 'profit' && <DollarSign className="w-6 h-6" />}
                                        </div>
                                        <span className="text-[10px] font-black p-2 bg-white rounded-lg text-slate-400 uppercase tracking-widest">Dica {idx + 1}</span>
                                    </div>
                                    <h4 className={cn(
                                        "font-black text-xl mb-3 leading-tight",
                                        tip.type === 'alert' ? "text-red-900" :
                                            tip.type === 'growth' ? "text-emerald-900" :
                                                "text-indigo-900"
                                    )}>
                                        {tip.title}
                                    </h4>
                                    <p className={cn(
                                        "text-sm font-medium leading-relaxed opacity-80",
                                        tip.type === 'alert' ? "text-red-800" :
                                            tip.type === 'growth' ? "text-emerald-800" :
                                                "text-indigo-800"
                                    )}>
                                        {tip.description}
                                    </p>
                                </div>
                                <div className="mt-8 pt-6 border-t border-black/5">
                                    <button className={cn(
                                        "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95",
                                        "bg-white shadow-sm border border-slate-100",
                                        tip.type === 'alert' ? "text-red-600 hover:bg-red-50" :
                                            tip.type === 'growth' ? "text-emerald-600 hover:bg-emerald-50" :
                                                "text-indigo-600 hover:bg-indigo-50"
                                    )}>
                                        Aplicar Estratégia <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
