import { useState, useEffect } from 'react';
import { SalesService } from '../../services/salesService';
import { CashFlowService } from '../../services/cashFlowService';
import { SettingsService } from '../../services/settingsService';
import { useToast } from '../ui/Toast';
import {
    PieChart,
    Calendar,
    ArrowDownCircle,
    ArrowUpCircle,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Activity,
    Target,
    Printer,
    Download,
    Building2
} from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function DREPage({ user, userProfile }) {
    const { showToast } = useToast();
    const orgId = userProfile?.organizationId || user?.uid;
    const [isLoading, setIsLoading] = useState(true);

    // Date Filters
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [costCenterFilter, setCostCenterFilter] = useState('all');

    // Data State
    const [dreData, setDreData] = useState({
        grossRevenue: 0,
        taxes: 0,
        netRevenue: 0,
        cmv: 0, // Cost of Goods Sold
        grossProfit: 0,
        expenses: 0,
        netProfit: 0,
        expenseBreakdown: []
    });

    const [settings, setSettings] = useState(null);

    useEffect(() => {
        if (orgId) {
            loadReport();
        }
    }, [orgId, startDate, endDate, costCenterFilter]);

    const loadReport = async () => {
        setIsLoading(true);
        try {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            // 1. Fetch Sales (Revenue & CMV)
            let sales = await SalesService.getSales(orgId, start, end);
            if (costCenterFilter !== 'all') {
                sales = sales.filter(s => s.costCenterId === costCenterFilter);
            }

            // 2. Fetch Expenses (Operating Expenses)
            const allMovements = await CashFlowService.getMovements(orgId);
            const expenses = allMovements.filter(m =>
                m.type === 'expense' &&
                m.origin !== 'sale' &&
                (costCenterFilter === 'all' || m.costCenterId === costCenterFilter) &&
                isWithinInterval(m.createAt?.toDate ? m.createdAt.toDate() : new Date(m.date), { start, end })
            );

            // 3. Fetch Settings (Tax Rate)
            const appSettings = await SettingsService.loadSettings(orgId);
            setSettings(appSettings);
            const taxRate = parseFloat(appSettings?.financial?.defaultTaxRate || 0) / 100;

            // Calculations
            const grossRevenue = sales.reduce((acc, s) => acc + (s.total || 0), 0);

            // CMV (Cost of Merchandise Sold)
            const cmv = sales.reduce((acc, s) => {
                // Sum cost of all items in the sale
                const saleCost = s.items?.reduce((iAcc, item) => {
                    const cost = parseFloat(item.cost || item.unitCost || 0);
                    const qty = parseFloat(item.quantity || 1);
                    return iAcc + (cost * qty);
                }, 0) || 0;
                return acc + (s.totalCost || saleCost);
            }, 0);

            // Taxes (Simple calculation based on revenue)
            // Real world uses detailed tax per product, but DRE Gerencial usually estimates via Simples/Presumed
            const taxes = grossRevenue * taxRate;

            const netRevenue = grossRevenue - taxes;
            const grossProfit = netRevenue - cmv;

            const totalOperatingExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
            const netProfit = grossProfit - totalOperatingExpenses;

            // Expense Breakdown
            const breakdownMap = {};
            expenses.forEach(e => {
                const cat = e.category || 'Outros';
                breakdownMap[cat] = (breakdownMap[cat] || 0) + e.amount;
            });
            const expenseBreakdown = Object.entries(breakdownMap)
                .map(([category, amount]) => ({ category, amount }))
                .sort((a, b) => b.amount - a.amount);

            setDreData({
                grossRevenue,
                taxes,
                netRevenue,
                cmv,
                grossProfit,
                expenses: totalOperatingExpenses,
                netProfit,
                expenseBreakdown,
                profitMargin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0
            });

        } catch (error) {
            console.error("Error loading DRE:", error);
            showToast("Erro ao gerar relatório DRE.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="w-full pb-20 animate-in fade-in duration-500 p-8 print:p-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 print:hidden">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg dark:shadow-slate-900/50 shadow-indigo-200">
                        <Activity className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">DRE Gerencial</h1>
                        <p className="text-slate-500 font-medium">Demonstrativo de Resultados do Exercício.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handlePrint} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors">
                        <Printer className="w-5 h-5" />
                    </button>
                    <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-white/10 flex gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 p-2 outline-none"
                        />
                        <span className="self-center text-slate-300">|</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 p-2 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Cost Center Filter Bar */}
            <div className="flex bg-white dark:bg-slate-900/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 mb-6 items-center gap-4 print:hidden">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <Building2 className="w-4 h-4" />
                    Filtrar por Unidade:
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setCostCenterFilter('all')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                            costCenterFilter === 'all' ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-500 border border-slate-200"
                        )}
                    >
                        Todos os Centros
                    </button>
                    {settings?.costCenters?.map(cc => (
                        <button
                            key={cc.id}
                            onClick={() => setCostCenterFilter(cc.id)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                costCenterFilter === cc.id ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-500 border border-slate-200"
                            )}
                        >
                            {cc.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block text-center mb-8 border-b border-slate-200 dark:border-white/10 pb-4">
                <h1 className="text-2xl font-bold">DRE Gerencial</h1>
                <p className="text-sm">Período: {format(new Date(startDate), 'dd/MM/yyyy')} a {format(new Date(endDate), 'dd/MM/yyyy')}</p>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Main DRE Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm dark:shadow-slate-900/50 border border-slate-100 overflow-hidden print:border-none print:shadow-none">

                        {/* 1. Revenue */}
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center group hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg">+</div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Receita Bruta</h3>
                                    <p className="text-xs text-slate-400 font-medium">Total de vendas realizadas</p>
                                </div>
                            </div>
                            <p className="text-2xl font-black text-emerald-600">{formatCurrency(dreData.grossRevenue)}</p>
                        </div>

                        {/* 2. Taxes */}
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors pl-12 bg-slate-50 dark:bg-slate-950/30">
                            <div className="flex items-center gap-4">
                                <span className="text-red-400 font-bold text-sm">(-)</span>
                                <div>
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200">Impostos / Deduções</h3>
                                    <p className="text-xs text-slate-400 font-medium">Aliquota Estimada: {settings?.financial?.defaultTaxRate || 0}%</p>
                                </div>
                            </div>
                            <p className="text-lg font-bold text-red-400">({formatCurrency(dreData.taxes)})</p>
                        </div>

                        {/* = Net Revenue */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 flex justify-between items-center px-6 border-b border-slate-100">
                            <h3 className="font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest text-xs">(=) Receita Líquida</h3>
                            <p className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(dreData.netRevenue)}</p>
                        </div>

                        {/* 3. CMV */}
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center group hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 transition-colors pl-12">
                            <div className="flex items-center gap-4">
                                <span className="text-amber-500 font-bold text-sm">(-)</span>
                                <div>
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200">CMV (Custo Mercadoria)</h3>
                                    <p className="text-xs text-slate-400 font-medium">Custo de aquisição dos produtos vendidos</p>
                                </div>
                            </div>
                            <p className="text-lg font-bold text-amber-500">({formatCurrency(dreData.cmv)})</p>
                        </div>

                        {/* = Gross Profit */}
                        <div className="p-4 bg-indigo-50/30 flex justify-between items-center px-6 border-b border-slate-100">
                            <h3 className="font-black text-indigo-900 uppercase tracking-widest text-xs">(=) Lucro Bruto</h3>
                            <p className="font-bold text-indigo-900">{formatCurrency(dreData.grossProfit)}</p>
                        </div>

                        {/* 4. Operating Expenses */}
                        <div className="p-6 border-b border-slate-50 group hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 transition-colors pl-12">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-rose-500 font-bold text-sm">(-)</span>
                                    <div>
                                        <h3 className="font-bold text-slate-700 dark:text-slate-200">Despesas Operacionais</h3>
                                        <p className="text-xs text-slate-400 font-medium">Custos fixos e variáveis (Aluguel, Luz, Pessoal)</p>
                                    </div>
                                </div>
                                <p className="text-lg font-bold text-rose-500">({formatCurrency(dreData.expenses)})</p>
                            </div>

                            {/* Breakdown */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-8">
                                {dreData.expenseBreakdown.map((item, idx) => (
                                    <div key={idx} className="flex justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 text-xs">
                                        <span className="font-medium text-slate-500 capitalize">{item.category}</span>
                                        <span className="font-bold text-rose-400">-{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* = NET PROFIT */}
                        <div className={cn(
                            "p-8 flex justify-between items-center",
                            dreData.netProfit >= 0 ? "bg-slate-900 text-white" : "bg-red-600 text-white"
                        )}>
                            <div>
                                <h3 className="font-black uppercase tracking-widest text-sm mb-1">(=) Resultado Líquido (Lucro/Prejuízo)</h3>
                                {dreData.netProfit >= 0 ? (
                                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border border-emerald-500/50">
                                        Lucrativo
                                    </span>
                                ) : (
                                    <span className="bg-white dark:bg-slate-900/20 text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
                                        Prejuízo
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-black tracking-tighter">{formatCurrency(dreData.netProfit)}</p>
                                <p className="text-sm font-medium opacity-70">Margem Líquida: {dreData.profitMargin.toFixed(1)}%</p>
                            </div>
                        </div>

                    </div>

                    {/* Financial Goals (Metas) */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm dark:shadow-slate-900/50 border border-slate-100 print:hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <Target className="w-6 h-6 text-indigo-600" />
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Metas Financeiras</h3>
                        </div>

                        {/* Simple Net Profit Goal Visualization */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Meta de Lucro (Ex: R$ 50.000)</span>
                                <span className="text-xs font-bold text-indigo-600">{((dreData.netProfit / 50000) * 100).toFixed(0)}% Atingido</span>
                            </div>
                            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 transition-all duration-1000 ease-out rounded-full"
                                    style={{ width: `${Math.min(((dreData.netProfit / 50000) * 100), 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
