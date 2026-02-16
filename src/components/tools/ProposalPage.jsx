import { useState, useEffect } from 'react';
import { FileText, Trash2, User, ShoppingCart, Loader2, Search, Users, Share2, Check, DollarSign } from 'lucide-react';
import { ProposalService } from '../../services/proposalService';
import { ClientService } from '../../services/clientService';
import { SalesService } from '../../services/salesService';
import { useToast } from '../ui/Toast';
import { formatCurrency, cn } from '../../lib/utils';

export function ProposalPage({ user, userProfile, settings, items = [], onRemove, onClear }) {
    const { showToast } = useToast();
    const [clientName, setClientName] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [clients, setClients] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [lastProposalId, setLastProposalId] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('pix');
    const [installments, setInstallments] = useState(1);

    useEffect(() => {
        if (user) loadClients();
    }, [user]);

    // Close search dropdown on ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && clientSearch) {
                setClientSearch('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [clientSearch]);

    const loadClients = async () => {
        setIsLoadingClients(true);
        try {
            const data = await ClientService.getClients(user.uid);
            setClients(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingClients(false);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone?.includes(clientSearch)
    );

    const handleSelectClient = (client) => {
        setSelectedClientId(client.id);
        setClientName(client.name);
        setClientSearch('');
    };

    const totalPix = items.reduce((acc, i) => acc + (i.pixPrice || 0), 0);
    const totalInstallment = items.reduce((acc, i) => acc + (i.installmentPrice || i.pixPrice || 0), 0);

    const commRate = parseFloat(settings?.financial?.commissionRate) || 0;
    const totalCommission = (totalPix * commRate) / 100;
    const isOwner = userProfile?.role === 'owner' || userProfile?.role === 'admin';

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (items.length === 0) {
            showToast("O carrinho está vazio!", "error");
            return;
        }
        if (!clientName.trim()) {
            showToast("Informe o nome do cliente.", "error");
            return;
        }

        setIsGenerating(true);
        try {
            const selectedClient = clients.find(c => c.id === selectedClientId) || { name: clientName };

            const proposalData = {
                company: settings.company,
                client: selectedClient,
                items: items,
                paymentMethod,
                installments
            };

            await ProposalService.generatePDF(proposalData);

            // Save to DB for history
            if (user) {
                await ProposalService.saveProposal(user.uid, proposalData);
            }

            showToast("Orçamento gerado e salvo com sucesso!", "success");
        } catch (error) {
            console.error(error);
            showToast("Erro ao gerar PDF.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = async () => {
        if (items.length === 0) {
            showToast("O carrinho está vazio!", "error");
            return;
        }
        if (!clientName.trim()) {
            showToast("Informe o nome do cliente.", "error");
            return;
        }

        setIsSharing(true);
        try {
            const selectedClient = clients.find(c => c.id === selectedClientId) || { name: clientName };
            const proposalData = {
                company: settings.company,
                client: selectedClient,
                items: items,
                paymentMethod,
                installments
            };

            const id = await ProposalService.saveProposal(user.uid, proposalData);
            setLastProposalId(id);

            const shareUrl = `${window.location.origin}?p=${id}`;

            // --- Generate Premium Message ---
            let message = `🚀 *ORÇAMENTO ESPECIAL*\n👤 *Cliente:* ${selectedClient.name}\n\n👇 *Itens Selecionados:*\n`;

            items.forEach((item, idx) => {
                const specs = [item.capacity, item.color, item.condition].filter(Boolean).join(' • ');
                const pixVal = formatCurrency(item.pixPrice || 0);
                const instVal = formatCurrency((item.installmentPrice || item.pixPrice || 0) / 12);

                message += `\n${idx + 1}️⃣ *${item.name}*`;
                if (specs) message += `\n   📝 ${specs}`;
                message += `\n   💰 *${pixVal}* (Pix)`;
                message += `\n   💳 12x de ${instVal}`;
                message += `\n`;
            });

            // Totals
            const tPix = items.reduce((acc, i) => acc + (i.pixPrice || 0), 0);
            const tCard = items.reduce((acc, i) => acc + (i.installmentPrice || i.pixPrice || 0), 0);

            message += `\n💰 *TOTAL GERAL:*`;
            message += `\n✅ *${formatCurrency(tPix)}* (À vista/Obs)`;
            message += `\n💳 *12x de ${formatCurrency(tCard / 12)}* (Cartão)`;

            message += `\n\n🔗 *Link da Proposta:* ${shareUrl}`;
            message += `\n\n📍 *Loja Física / Entrega Rápida*`;

            await navigator.clipboard.writeText(message);

            showToast("Link e Mensagem copiados!", "success");
        } catch (error) {
            console.error(error);
            showToast("Erro ao criar link.", "error");
        } finally {
            setIsSharing(false);
        }
    };

    const handleFinalizeSale = async () => {
        if (items.length === 0) return showToast("Carrinho vazio!", "error");
        if (!clientName.trim()) return showToast("Informe o cliente.", "error");

        const finalTotal = (paymentMethod === 'card' || paymentMethod === 'credit' || paymentMethod === 'debit') ? totalInstallment : totalPix;

        if (!confirm(`Finalizar venda de ${formatCurrency(finalTotal)} (${paymentMethod === 'pix' ? 'Pix/Dinheiro' : 'Cartão'})? Isso irá baixar o estoque.`)) return;

        setIsFinalizing(true);
        try {
            const selectedClient = clients.find(c => c.id === selectedClientId) || { name: clientName, phone: clientSearch }; // Try to capture phone if typed manually

            const saleData = {
                client: selectedClient,
                items: items,
                total: finalTotal,
                paymentMethod: paymentMethod,
                installments: installments,
                type: 'sale',
                settings: settings
            };

            await SalesService.createSale(user.uid, userProfile?.organizationId || user.uid, saleData);

            showToast("Venda realizada! Estoque atualizado.", "success");
            onClear(); // Clear cart
        } catch (error) {
            console.error(error);
            showToast("Erro ao finalizar venda.", "error");
        } finally {
            setIsFinalizing(false);
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <ShoppingCart className="w-8 h-8 text-indigo-600" />
                        Montador de Orçamento
                    </h2>
                    <p className="text-slate-500 font-medium">Revisar itens e gerar proposta PDF profissional.</p>
                </div>
                {items.length > 0 && (
                    <button
                        onClick={onClear}
                        className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-widest bg-red-50 px-4 py-2 rounded-xl transition-colors"
                    >
                        Limpar Carrinho
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: List */}
                <div className="lg:col-span-2 space-y-4">
                    {items.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-200 dark:border-white/10">
                            <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-400">Seu carrinho está vazio</h3>
                            <p className="text-sm text-slate-400 mt-2">Faça cálculos e clique em <br />"Adicionar ao Orçamento".</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm dark:shadow-slate-900/50 border border-slate-100 flex items-start justify-between group hover:border-indigo-100 transition-all">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{item.name}</h4>
                                    <p className="text-sm text-slate-500 font-medium">{item.details}</p>
                                    <div className="mt-3 flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                                        <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Pix: {formatCurrency(item.pixPrice)}</span>
                                        <span>12x: {formatCurrency(item.installmentPrice)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemove(item.id)}
                                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                    title="Remover item"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Right Column: Actions */}
                <div className="space-y-6">
                    <form onSubmit={handleGenerate} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl dark:shadow-slate-900/50 border border-indigo-50 sticky top-8">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                            Dados do Cliente
                        </h3>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Buscar Cliente</label>
                                <div className="relative group">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={clientSearch}
                                        onChange={e => {
                                            setClientSearch(e.target.value);
                                            setClientName(e.target.value);
                                        }}
                                        placeholder="Nome ou telefone..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 focus:bg-white dark:bg-slate-900 transition-all"
                                    />

                                    {clientSearch && filteredClients.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl dark:shadow-slate-900/50 border border-slate-100 z-50 overflow-hidden max-h-48 overflow-y-auto">
                                            {filteredClients.map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => handleSelectClient(c)}
                                                    className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 text-left transition-colors border-b border-slate-50 last:border-none"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                        <Users className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{c.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">{c.phone}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedClientId && (
                                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 text-indigo-600 flex items-center justify-center shadow-sm dark:shadow-slate-900/50">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Selecionado</p>
                                            <p className="font-bold text-indigo-700 text-sm">{clientName}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedClientId('');
                                            setClientName('');
                                            setClientSearch('');
                                        }}
                                        className="text-indigo-400 hover:text-indigo-600 p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-100 pt-6 mb-8 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total à Vista (Pix)</span>
                                <span className="text-xl font-black text-emerald-600">{formatCurrency(totalPix)}</span>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Forma de Pagamento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('pix')}
                                        className={cn(
                                            "p-3 rounded-xl border text-xs font-bold transition-all",
                                            paymentMethod === 'pix' ? "bg-emerald-50 border-emerald-500 text-emerald-600" : "bg-white border-slate-100 text-slate-400 hover:border-indigo-200"
                                        )}
                                    >
                                        Pix / Dinheiro
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('credit')}
                                        className={cn(
                                            "p-3 rounded-xl border text-xs font-bold transition-all",
                                            paymentMethod === 'credit' ? "bg-indigo-50 border-indigo-500 text-indigo-600" : "bg-white border-slate-100 text-slate-400 hover:border-indigo-200"
                                        )}
                                    >
                                        Cartão de Crédito
                                    </button>
                                </div>

                                {paymentMethod === 'credit' && (
                                    <div className="space-y-1 animate-in slide-in-from-top-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parcelas</label>
                                        <select
                                            value={installments}
                                            onChange={(e) => setInstallments(Number(e.target.value))}
                                            className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500"
                                        >
                                            {[...Array(12)].map((_, i) => (
                                                <option key={i + 1} value={i + 1}>{i + 1}x</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {paymentMethod === 'credit' && (
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Cartão ({installments}x)</span>
                                    <span className="text-xl font-black text-indigo-600">{formatCurrency(totalInstallment)}</span>
                                </div>
                            )}

                            {isOwner && commRate > 0 && (
                                <div className="flex justify-between items-center bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Comissão Estimada</span>
                                        <span className="text-[9px] font-bold text-slate-400 italic">Base: {commRate}% sobre Pix</span>
                                    </div>
                                    <span className="text-sm font-black text-indigo-600">
                                        + {formatCurrency(totalCommission)}
                                    </span>
                                </div>
                            )}

                            <p className="text-[10px] text-center text-slate-300 font-medium">Confira os valores antes de finalizar.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                type="submit"
                                disabled={items.length === 0 || isGenerating}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg dark:shadow-slate-900/50 shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                Gerar PDF

                            </button>

                            <button
                                type="button"
                                onClick={handleFinalizeSale}
                                disabled={items.length === 0 || isFinalizing}
                                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg dark:shadow-slate-900/50 shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isFinalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                                Finalizar Venda
                            </button>

                            <button
                                type="button"
                                onClick={handleShare}
                                disabled={items.length === 0 || isSharing}
                                className={cn(
                                    "w-full py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border-2 md:col-span-2",
                                    lastProposalId ? "bg-emerald-50 border-emerald-500 text-emerald-600" : "bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                                )}
                            >
                                {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : (lastProposalId ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />)}
                                {lastProposalId ? 'Link Copiado!' : 'Criar Link Público'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
