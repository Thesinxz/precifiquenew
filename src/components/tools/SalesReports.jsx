import { useState, useEffect } from 'react';
import { SalesService } from '../../services/salesService';
import { SettingsService } from '../../services/settingsService';
import { useToast } from '../ui/Toast';
import {
    FileText,
    Search,
    Calendar,
    ChevronDown,
    ChevronUp,
    Printer,
    X,
    Filter,
    ArrowUpRight,
    ShoppingBag,
    RefreshCw,
    Building2
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SalesReports({ user, userProfile, settings }) {
    const { showToast } = useToast();
    const orgId = userProfile?.organizationId || user?.uid;

    const [sales, setSales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedSaleId, setExpandedSaleId] = useState(null);

    // Filters
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [searchTerm, setSearchTerm] = useState('');
    const [costCenterFilter, setCostCenterFilter] = useState('all');

    // Collapse details on ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && expandedSaleId) {
                setExpandedSaleId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [expandedSaleId]);

    useEffect(() => {
        if (orgId) loadSales();
    }, [orgId, startDate, endDate, costCenterFilter]);

    const loadSales = async () => {
        setIsLoading(true);
        try {
            // Convert string dates to Date objects for service
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            let data = await SalesService.getSales(orgId, start, end);
            if (costCenterFilter !== 'all') {
                data = data.filter(s => s.costCenterId === costCenterFilter);
            }
            setSales(data);
        } catch (error) {
            console.error(error);
            showToast("Erro ao carregar vendas.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrintReceipt = (sale) => {
        const printWindow = window.open('', '', 'width=300,height=600');
        if (!printWindow) return;

        const style = `
            <style>
                body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; }
                .text-center { text-align: center; }
                .bold { font-weight: bold; }
                .line { border-bottom: 1px dashed #000; margin: 5px 0; }
                .flex { display: flex; justify-content: space-between; }
                .mb-2 { margin-bottom: 5px; }
                @media print { .no-print { display: none; } }
            </style>
        `;

        const itemsHtml = sale.items.map(item => `
            <div class="flex">
                <span>${item.quantity}x ${item.name.substring(0, 15)}</span>
                <span>${(item.originalPrice * item.quantity).toFixed(2)}</span>
            </div>
        `).join('');

        const paymentsHtml = sale.payments ? sale.payments.map(p => `
            <div class="flex">
                <span>${formatPaymentMethod(p.method)}</span>
                <span>${p.amount.toFixed(2)}</span>
            </div>
        `).join('') : `
             <div class="flex">
                <span>${formatPaymentMethod(sale.paymentMethod)}</span>
                <span>${sale.total.toFixed(2)}</span>
            </div>
        `;

        printWindow.document.write(`
            <html>
                <head><title>Recibo</title>${style}</head>
                <body>
                    <div class="text-center bold mb-2">COMPROVANTE DE VENDA</div>
                    <div class="text-center">${format(sale.createdAt?.toDate() || new Date(), 'dd/MM/yyyy HH:mm')}</div>
                    <div class="line"></div>
                    ${itemsHtml}
                    <div class="line"></div>
                    <div class="flex bold">
                        <span>TOTAL</span>
                        <span>R$ ${sale.total.toFixed(2)}</span>
                    </div>
                    <div class="line"></div>
                    <div>Pagamento:</div>
                    ${paymentsHtml}
                    <div class="line"></div>
                    <div class="text-center">Obrigado pela preferência!</div>
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const formatPaymentMethod = (method) => {
        const map = {
            'credit': 'Crédito',
            'debit': 'Débito',
            'pix': 'Pix',
            'cash': 'Dinheiro',
            'split': 'Misto',
            'misto': 'Misto',
            'trade_in': 'Troca'
        };
        return map[method] || method;
    };

    const filteredSales = sales.filter(sale =>
        sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.sellerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.items?.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handlePrintWarranty = (sale) => {
        const printWindow = window.open('', '', 'width=800,height=900');
        if (!printWindow) return;

        const content = `
            <html>
                <head>
                    <title>Certificado de Garantia</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #333; }
                        h1 { text-align: center; color: #2563eb; }
                        .info { margin-bottom: 20px; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
                        .terms { font-size: 12px; color: #666; }
                        .signature { margin-top: 50px; border-top: 1px solid #000; width: 250px; text-align: center; }
                    </style>
                </head>
                <body>
                    <h1>CERTIFICADO DE GARANTIA</h1>
                    <div class="info">
                        <p><strong>Venda:</strong> #${sale.id.slice(-6).toUpperCase()}</p>
                        <p><strong>Cliente:</strong> ${sale.client?.name}</p>
                        <p><strong>CPF:</strong> ${sale.client?.cpf}</p>
                        <p><strong>Data da Compra:</strong> ${format(sale.createdAt?.toDate() || new Date(), 'dd/MM/yyyy')}</p>
                        <p><strong>Produto(s):</strong> ${sale.items.map(i => i.name).join(', ')}</p>
                    </div>
                    <div class="terms">
                        <h3>Termos de Garantia</h3>
                        <p>1. A garantia cobre apenas defeitos de fabricação pelo prazo de 90 dias conforme CDC.</p>
                        <p>2. A garantia não cobre danos por mau uso, quedas, contato com líquidos ou intervenções de terceiros.</p>
                        <p>3. É indispensável a apresentação desta via para qualquer solicitação.</p>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 100px;">
                        <div class="signature">Assinatura da Loja</div>
                        <div class="signature">Assinatura do Cliente</div>
                    </div>
                    <script>window.onload = () => { window.print(); }</script>
                </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
    };

    const [recalculatingId, setRecalculatingId] = useState(null);

    const handleRecalculate = async (sale) => {
        if (!confirm("Isso irá recalcular as taxas e lucros desta venda com base nas configurações ATUAIS da loja. Continuar?")) return;

        setRecalculatingId(sale.id); // Set local loading state
        try {
            // Fetch latest settings to ensure we have the gateway rates
            const settings = await SettingsService.loadSettings(orgId);

            // Attach settings to the sale object so updateSale can calculate fees
            const saleWithSettings = { ...sale, settings };

            await SalesService.updateSale(sale.id, orgId, saleWithSettings);
            showToast("Venda recalculada com sucesso!", "success");

            // Just reload to be safe, but we could also update locally if we returned the new values
            // To prevent collapse, we will reload but keep the expanded ID
            // Ideally we would fetch just this sale, but for now let's just reload the list
            // The issue user reported "window closes fast" is because isLoading(true) clears the list.

            // Let's optimize: fetch ONLY this sale and update the list
            // Or since we know updateSale updates the backend, we can just call loadSales() WITHOUT setting global isLoading(true) first.

            // Better strategy: Call loadSales() but don't set global isLoading to true. 
            // loadSales sets isLoading(true) by itself. We need to modify loadSales or duplicate logic.
            // Let's just update the local state manually with a "fake" reload for now or fetch fresh data for this single item.

            // Actually, the simplest fix for "window closes" is to NOT use the global isLoading for this action.
            // We will manually fetch the updated sale from DB or just trigger loadSales() WITHOUT the loading spinner if possible.
            // Since loadSales() sets isLoading(true), let's create a silent reload or just update using the result (but updateSale doesn't return data).

            // Strategy: 
            // 1. Run update.
            // 2. Fetch all sales again silently (duplicate loadSales logic without isLoading(true))
            // OR just accept that loadSales() is needed and try to maintain state.

            // The user complaint "closes very fast" is definitely the skeletons.
            // Let's implement a silent reload.

            const silentLoad = async () => {
                try {
                    let data = await SalesService.getSales(orgId, startDate ? new Date(startDate) : null, endDate ? new Date(endDate) : null);
                    if (costCenterFilter !== 'all') {
                        data = data.filter(s => s.costCenterId === costCenterFilter);
                    }
                    setSales(data);
                } catch (err) {
                    console.error(err);
                }
            };
            await silentLoad();

        } catch (error) {
            console.error(error);
            showToast("Erro ao recalcular venda.", "error");
        } finally {
            setRecalculatingId(null);
        }
    };

    return (
        <div className="w-full pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <FileText className="w-8 h-8 text-indigo-600" />
                        Relatório de Vendas
                    </h2>
                    <p className="text-slate-500 font-medium">Consulte e gerencie suas vendas realizadas.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Buscar</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="ID, Cliente, Produto..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">De</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Até</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                        />
                    </div>
                </div>

                {settings?.costCenters?.length > 0 && (
                    <div className="flex bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 mt-4 items-center gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                            <Building2 className="w-4 h-4" />
                            Filtrar por Unidade:
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setCostCenterFilter('all')}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                    costCenterFilter === 'all' ? "bg-indigo-600 text-white shadow-md" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                )}
                            >
                                Todos
                            </button>
                            {settings.costCenters.filter(cc => cc.active).map(cc => (
                                <button
                                    key={cc.id}
                                    onClick={() => setCostCenterFilter(cc.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                        costCenterFilter === cc.id ? "bg-indigo-600 text-white shadow-md" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                    )}
                                >
                                    {cc.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="grid gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-[2rem] animate-pulse" />)}
                </div>
            ) : filteredSales.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="font-bold text-slate-400">Nenhuma venda encontrada no período.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredSales.map(sale => (
                        <div key={sale.id} className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all hover:border-indigo-200 dark:hover:border-indigo-900">
                            {/* Summary Row */}
                            <div
                                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                        <ShoppingBag className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-slate-800 dark:text-white text-lg">
                                                {formatCurrency(sale.total)}
                                            </h3>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                                sale.paymentMethod === 'pix' ? "bg-emerald-100 text-emerald-600" :
                                                    sale.paymentMethod === 'credit' ? "bg-indigo-100 text-indigo-600" :
                                                        "bg-slate-100 text-slate-600"
                                            )}>
                                                {formatPaymentMethod(sale.paymentMethod)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                            <span>{sale.createdAt ? format(sale.createdAt.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt), "dd/MM/yyyy HH:mm") : 'Data N/A'}</span>
                                            <span>•</span>
                                            <span>{sale.client?.name || 'Cliente Geral'}</span>
                                            {sale.sellerName && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-indigo-500 font-black uppercase tracking-widest text-[9px]">Vendedor: {sale.sellerName}</span>
                                                </>
                                            )}
                                            {sale.costCenterName && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-blue-500 font-black uppercase tracking-widest text-[9px] flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {sale.costCenterName}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePrintReceipt(sale); }}
                                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        title="Reimprimir Recibo"
                                    >
                                        <Printer className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePrintWarranty(sale); }}
                                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        title="Gerar Termo de Garantia"
                                    >
                                        <FileText className="w-5 h-5" />
                                    </button>
                                    <div className={cn("transition-transform duration-300", expandedSaleId === sale.id ? "rotate-180" : "")}>
                                        <ChevronDown className="w-5 h-5 text-slate-300" />
                                    </div>
                                </div>
                            </div>

                            {/* Details (Expandable) */}
                            {expandedSaleId === sale.id && (
                                <div className="border-t border-slate-50 dark:border-slate-800 p-6 bg-slate-50/30 dark:bg-slate-800/10 animate-in slide-in-from-top-2 duration-200">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Itens da Venda</h4>
                                    <div className="space-y-3 mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        {sale.items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-50 dark:border-slate-700 last:border-0 pb-3 last:pb-0">
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-indigo-100 text-indigo-700 w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black">{item.quantity}x</span>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-white">
                                                            {item.name} {item.variant?.storage || item.storage ? `- ${item.variant?.storage || item.storage}` : ''}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mt-1">
                                                            {item.variant?.color || item.color || item.category || 'Venda Direta'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block font-black text-slate-800 dark:text-white text-base">{formatCurrency((item.price || item.unitPrice || 0) * (item.quantity || 1))}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold">Custo: {formatCurrency((item.cost || 0) * (item.quantity || 1))}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Financial Breakdown */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Custo Total</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-white">{formatCurrency(sale.totalCost || 0)}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Taxas/Juros</p>
                                            <p className="text-sm font-bold text-red-500">-{formatCurrency((sale.feeAmount || 0) + (sale.installmentInterest || 0))}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Venda Líquida</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-white">
                                                {formatCurrency(sale.netAmount || (sale.total - (sale.feeAmount || 0)))}
                                            </p>
                                        </div>
                                        <div className="bg-indigo-600 p-4 rounded-2xl text-white">
                                            <p className="text-[10px] font-black text-white/60 uppercase mb-1">Lucro Estimado</p>
                                            <p className="text-sm font-black">
                                                {formatCurrency(sale.profit || (
                                                    (sale.netAmount || (sale.total - (sale.feeAmount || 0))) -
                                                    (sale.totalCost || sale.items?.reduce((acc, i) => acc + (i.cost || 0) * (i.quantity || 1), 0) || 0)
                                                ))}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-100">
                                        <span>ID da Transação: {sale.id}</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRecalculate(sale); }}
                                                disabled={recalculatingId === sale.id}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border",
                                                    recalculatingId === sale.id
                                                        ? "bg-indigo-50 text-indigo-300 border-indigo-100 cursor-wait"
                                                        : "text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 border-transparent hover:border-indigo-100"
                                                )}
                                            >
                                                <RefreshCw className={cn("w-4 h-4", recalculatingId === sale.id ? "animate-spin" : "")} />
                                                {recalculatingId === sale.id ? "Recalculando..." : "Recalcular Taxas"}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm("ATENÇÃO: Isso irá estornar o estoque e excluir o registro da venda permanentemente. Continuar?")) {
                                                        setIsLoading(true);
                                                        SalesService.cancelSale(sale.id, orgId)
                                                            .then(() => {
                                                                setSales(prev => prev.filter(s => s.id !== sale.id));
                                                                showToast("Venda cancelada e estoque estornado.", "success");
                                                            })
                                                            .catch(() => showToast("Erro ao cancelar venda.", "error"))
                                                            .finally(() => setIsLoading(false));
                                                    }
                                                }}
                                                className="flex items-center gap-2 text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                                Cancelar Venda
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
