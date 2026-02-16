import { useState, useEffect } from 'react';
import { SalesService } from '../../services/salesService';
import { useToast } from '../ui/Toast';
import { MessageCircle, Check, Calendar, Loader2, ShieldCheck, Heart, Sparkles, Send, Zap, Settings } from 'lucide-react';
import { formatDate, formatCurrency, cn } from '../../lib/utils';
import { WhatsappService } from '../../services/whatsappService';
import { WhatsAppTemplatesManager } from './WhatsAppTemplatesManager';

export function AutomationsPage({ user, userProfile }) {
    const { showToast } = useToast();
    const [sales, setSales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [automationTab, setAutomationTab] = useState('post-sale'); // post-sale, warranty
    const [daysAgo, setDaysAgo] = useState(3);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);
    const orgId = userProfile?.organizationId || user?.uid;

    useEffect(() => {
        if (orgId) loadPending();
    }, [orgId, daysAgo, automationTab]);

    const loadPending = async () => {
        setIsLoading(true);
        try {
            const data = await SalesService.getPendingAutomations(orgId, daysAgo, automationTab);
            setSales(data);
        } catch (error) {
            console.error(error);
            showToast("Erro ao carregar automações.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const generateMessage = (sale) => {
        const firstName = sale.client?.name?.split(' ')[0] || 'Cliente';
        const productDetails = sale.items?.map(i => `*${i.name}* ${i.imei ? `(IMEI: ${i.imei})` : ''}`).join(', ') || 'seu pedido';
        const total = formatCurrency(sale.total || 0);
        const method = sale.paymentMethod === 'pix' ? 'PIX' : `Cartão (${sale.installments || 1}x)`;

        if (automationTab === 'post-sale') {
            return `Olá *${firstName}*! Tudo bem? 👋\n\nVi aqui que faz *${daysAgo} dias* que você adquiriu o ${productDetails} aqui na *${userProfile?.company || 'loja'}*.\n\n*Detalhes da Compra:*\n💰 Valor: ${total}\n💳 Forma: ${method}\n📅 Data: ${new Date(sale.createdAt?.toDate ? sale.createdAt.toDate() : sale.createdAt).toLocaleDateString()}\n\nPassando só para confirmar se está tudo certo com seu novo aparelho e se precisa de algum acessório ou suporte? 🚀\n\nQualquer coisa, estamos à disposição!`;
        } else {
            return `Oi *${firstName}*! Esperamos que esteja tudo bem. ✨\n\nSua garantia do ${productDetails} está completando quase 1 ano conosco. \n\n*Resumo da Venda:*\n💰 Total: ${total}\n📅 Data: ${new Date(sale.createdAt?.toDate ? sale.createdAt.toDate() : sale.createdAt).toLocaleDateString()}\n\nAproveite para vir nos visitar! Fazemos uma revisão preventiva gratuita e, caso queira, avaliamos seu aparelho com bônus na troca por um novo modelo. 🔄`;
        }
    };

    const handleSend = async (sale, auto = false) => {
        if (!sale.client?.phone) {
            if (!auto) showToast("Cliente sem telefone.", "error");
            return false;
        }

        const phone = sale.client.phone.replace(/\D/g, '');
        const message = generateMessage(sale);

        const result = await WhatsappService.sendMessage(orgId, phone, message);

        if (auto) {
            if (result.success && result.method === 'api') {
                setTimeout(() => nextInQueue(), Math.random() * 2000 + 1000);
            } else if (result.link) {
                window.open(result.link, '_blank');
            }
        } else {
            if (result.link) window.open(result.link, '_blank');
            await SalesService.markAsContacted(sale.id, automationTab);
            setSales(prev => prev.filter(s => s.id !== sale.id));
            showToast("Mensagem enviada e registrado!", "success");
        }
        return true;
    };

    const startQueue = () => {
        if (sales.length === 0) return;
        setIsProcessingQueue(true);
        handleSend(sales[0], true); // Send first immediately
    };

    const nextInQueue = async () => {
        // Mark current as done
        const current = sales[0];
        if (current) {
            await SalesService.markAsContacted(current.id, automationTab);
            const remaining = sales.slice(1);
            setSales(remaining);

            if (remaining.length > 0) {
                // Send next
                handleSend(remaining[0], true);
            } else {
                setIsProcessingQueue(false);
                showToast("Fila finalizada! 🚀", "success");
            }
        }
    };

    const stopQueue = () => {
        setIsProcessingQueue(false);
    };

    return (
        <div className="w-full pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Zap className="w-8 h-8 text-amber-500 fill-amber-500" />
                        Piloto Automático
                    </h2>
                    <p className="text-slate-500 font-medium">Fidelize clientes automaticamente com mensagens inteligentes.</p>
                </div>
                {sales.length > 0 && (
                    <button
                        onClick={startQueue}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-300 dark:shadow-none flex items-center gap-3 active:scale-95 transition-all"
                    >
                        <Zap className="w-5 h-5 fill-white" />
                        Processar Fila ({sales.length})
                    </button>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm inline-flex">
                    <button
                        onClick={() => setAutomationTab('post-sale')}
                        className={cn("px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2", automationTab === 'post-sale' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200")}
                    >
                        <MessageCircle className="w-4 h-4" /> Pós-Venda
                    </button>
                    <button
                        onClick={() => setAutomationTab('warranty')}
                        className={cn("px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2", automationTab === 'warranty' ? "bg-amber-500 text-white shadow-lg shadow-amber-200 dark:shadow-none" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200")}
                    >
                        <ShieldCheck className="w-4 h-4" /> Garantia
                    </button>
                    <button
                        onClick={() => setAutomationTab('templates')}
                        className={cn("px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2", automationTab === 'templates' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200")}
                    >
                        <Settings className="w-4 h-4" /> Templates OS
                    </button>
                </div>

                {automationTab === 'post-sale' && (
                    <div className="bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl inline-flex self-start">
                        {[0, 3, 7, 30].map(d => (
                            <button
                                key={d}
                                onClick={() => setDaysAgo(d)}
                                className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", daysAgo === d ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-400 hover:text-slate-600")}
                            >
                                {d === 0 ? 'Hoje' : `${d} Dias`}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {automationTab === 'templates' ? (
                <WhatsAppTemplatesManager user={user} userProfile={userProfile} />
            ) : isLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
            ) : sales.length === 0 ? (
                <div className="bg-white dark:bg-[#101010] rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Tudo em dia!</h3>
                    <p className="text-slate-400 font-medium">Você já contactou todos os clientes desta lista. Bom trabalho! 🚀</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6">
                    {sales.map(sale => (
                        <div key={sale.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group duration-300">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-bold text-slate-500 dark:text-slate-300">
                                        {sale.client?.name?.[0] || 'C'}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 dark:text-white text-lg line-clamp-1">{sale.client?.name?.split(' ')[0]}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{sale.client?.phone}</p>
                                    </div>
                                </div>
                                <div className={cn("w-2 h-2 rounded-full", automationTab === 'warranty' ? "bg-amber-500" : "bg-indigo-500")} />
                            </div>

                            <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-3xl mb-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-black/5 dark:to-white/5 rounded-bl-[2rem]" />
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Produto Comprado</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-2">{sale.items?.[0]?.name}</p>
                                {sale.items?.length > 1 && <p className="text-xs text-slate-400 mt-1">+ {sale.items.length - 1} outros itens</p>}
                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
                                    <p className="text-[10px] text-slate-400 font-bold">{new Date(sale.createdAt?.toDate ? sale.createdAt.toDate() : sale.createdAt).toLocaleDateString()}</p>
                                    <p className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(sale.total)}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleSend(sale)}
                                className={cn("w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 group-hover:scale-[1.02]",
                                    automationTab === 'warranty'
                                        ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200/50 dark:shadow-none"
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200/50 dark:shadow-none"
                                )}
                            >
                                <Send className="w-4 h-4 text-white/90" />
                                {automationTab === 'warranty' ? 'Lembrar Garantia' : 'Enviar Feedback'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {isProcessingQueue && sales.length > 0 && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] max-w-md w-full text-center border border-slate-200 dark:border-slate-800 shadow-2xl">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Modo Turbo Ativo ⚡</h3>
                        <p className="text-slate-500 mb-6">Enviando mensagens em sequência...</p>

                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl mb-8">
                            <p className="text-xs uppercase font-bold text-slate-400 mb-1">Cliente Atual</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{sales[0]?.client?.name}</p>
                            <p className="text-sm text-slate-500">{sales[0]?.items?.[0]?.name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => stopQueue()} className="py-4 rounded-xl font-bold bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/20 transition-all">Parar</button>
                            <button onClick={() => nextInQueue()} className="py-4 rounded-xl font-black bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all">Confirmar & Próximo</button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-6">* A janela do WhatsApp abrirá automaticamente.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
