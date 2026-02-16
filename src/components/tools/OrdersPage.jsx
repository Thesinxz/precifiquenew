import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../ui/Toast';
import {
    ShoppingBag, Search, Filter, Loader2, CheckCircle2,
    XCircle, Clock, Eye, Printer, ArrowRight,
    User, Phone, MapPin, CreditCard, Calendar,
    Trash2, AlertCircle, ShoppingCart, Smartphone, Package
} from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function OrdersPage({ user, userProfile, settings }) {
    const { showToast } = useToast();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, pending, approved, cancelled
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const orgId = userProfile?.organizationId || user?.uid;
        if (!orgId) return;

        setLoading(true);
        const q = query(
            collection(db, 'orders'),
            where('organizationId', '==', orgId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setOrders(ordersData);
            setLoading(false);
        }, (error) => {
            console.error("Order listener error:", error);
            setLoading(false);
            if (error.code === 'failed-precondition') {
                showToast("Erro de índice no Firebase. Algumas filtragens podem não funcionar.", "warning");
                // Simple fallback query
                const simpleQ = query(collection(db, 'orders'), where('organizationId', '==', orgId));
                onSnapshot(simpleQ, (snap) => {
                    setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                    setLoading(false);
                });
            }
        });

        return () => unsubscribe();
    }, [user, userProfile]);

    const handleUpdateStatus = async (orderId, newStatus) => {
        if (!confirm(`Deseja alterar o status do pedido para ${newStatus.toUpperCase()}?`)) return;

        setIsUpdating(true);
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
            });
            showToast(`Pedido ${newStatus} com sucesso!`, "success");
            if (selectedOrder?.id === orderId) {
                setSelectedOrder(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            console.error(error);
            showToast("Erro ao atualizar pedido.", "error");
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer?.phone?.includes(searchTerm) ||
            order.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'approved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'shipping': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'delivered': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                        <ShoppingBag className="w-8 h-8 text-blue-500" />
                        Pedidos Online
                    </h1>
                    <p className="text-slate-500 font-medium">Gerencie as solicitações feitas pelo seu catálogo.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar por cliente ou ID..."
                            className="pl-12 pr-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl w-full md:w-80 outline-none focus:border-blue-500 transition-all font-bold"
                        />
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 italic">Total Recebido</p>
                    <h3 className="text-2xl font-black">{orders.length}</h3>
                </div>
                <div className="p-6 bg-amber-500/10 rounded-[2rem] border border-amber-500/20 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-2 italic">Aguardando</p>
                    <h3 className="text-2xl font-black text-amber-600 dark:text-amber-500">
                        {orders.filter(o => o.status === 'pending').length}
                    </h3>
                </div>
                <div className="p-6 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-2 italic">Aprovados</p>
                    <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-500">
                        {orders.filter(o => o.status === 'approved').length}
                    </h3>
                </div>
                <div className="p-6 bg-blue-500/10 rounded-[2rem] border border-blue-500/20 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-2 italic">Faturamento</p>
                    <h3 className="text-2xl font-black text-blue-600 dark:text-blue-500">
                        {formatCurrency(orders.filter(o => o.status === 'approved').reduce((acc, o) => acc + (o.total || 0), 0))}
                    </h3>
                </div>
            </div>

            {/* Table/List View */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {['all', 'pending', 'approved', 'cancelled'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    filterStatus === status
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                        : "bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10"
                                )}
                            >
                                {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : status === 'approved' ? 'Aprovados' : 'Cancelados'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-white/5">
                                <th className="px-8 py-6">ID Pedido / Data</th>
                                <th className="px-8 py-6">Cliente</th>
                                <th className="px-8 py-6">Itens</th>
                                <th className="px-8 py-6">Total</th>
                                <th className="px-8 py-6">Pagamento</th>
                                <th className="px-8 py-6 text-center">Status</th>
                                <th className="px-8 py-6 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                                            <p className="font-black uppercase tracking-widest text-slate-500 text-[10px]">Carregando pedidos...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 opacity-40">
                                            <ShoppingBag className="w-16 h-16 text-slate-300" />
                                            <div>
                                                <p className="text-xl font-black text-slate-500 uppercase tracking-tighter">Nenhum pedido encontrado</p>
                                                <p className="text-sm font-medium text-slate-400">Tente buscar por outros termos ou mudar o filtro.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredOrders.map((order) => (
                                <tr key={order.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-sm uppercase tracking-tight text-blue-500">#{order.id.slice(-6)}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                {order.createdAt?.toDate ? format(order.createdAt.toDate(), "dd MMM 'às' HH:mm", { locale: ptBR }) : 'Recentemente'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center font-black text-slate-400 text-xs">
                                                {order.customer?.name?.charAt(0) || <User className="w-4 h-4" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-sm uppercase">{order.customer?.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{order.customer?.phone}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-1">
                                            <span className="font-black text-slate-700 dark:text-slate-300">{order.items?.length || 0}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase italic">itens</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 font-black text-slate-900 dark:text-white">
                                        {formatCurrency(order.total)}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            {order.paymentMethod === 'pix' ? (
                                                <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5">
                                                    <CreditCard className="w-3 h-3" /> PIX
                                                </div>
                                            ) : (
                                                <div className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5">
                                                    <CreditCard className="w-3 h-3" /> CARTÃO
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={cn(
                                            "inline-flex px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                            getStatusColor(order.status)
                                        )}>
                                            {order.status === 'pending' ? 'Pendente' : order.status === 'approved' ? 'Aprovado' : order.status === 'cancelled' ? 'Cancelado' : order.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                                            <Eye className="w-5 h-5 text-slate-500" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0A0A0A] rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md z-10">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter">Detalhes do Pedido</h2>
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                        getStatusColor(selectedOrder.status)
                                    )}>
                                        {selectedOrder.status}
                                    </span>
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">ID: {selectedOrder.id}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                                <XCircle className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Left Column: Customer & Items */}
                            <div className="md:col-span-2 space-y-8">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                                        <User className="w-4 h-4" /> Dados do Cliente
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl space-y-1">
                                            <p className="text-[9px] font-black uppercase text-slate-400">Nome</p>
                                            <p className="font-bold">{selectedOrder.customer?.name}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl space-y-1">
                                            <p className="text-[9px] font-black uppercase text-slate-400">WhatsApp</p>
                                            <p className="font-bold">{selectedOrder.customer?.phone}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl space-y-1">
                                            <p className="text-[9px] font-black uppercase text-slate-400">Email</p>
                                            <p className="font-bold">{selectedOrder.customer?.email || 'N/A'}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl space-y-1">
                                            <p className="text-[9px] font-black uppercase text-slate-400">CPF</p>
                                            <p className="font-bold">{selectedOrder.customer?.cpf || 'N/A'}</p>
                                        </div>
                                        {selectedOrder.customer?.address && (
                                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl space-y-1 md:col-span-2">
                                                <p className="text-[9px] font-black uppercase text-slate-400">Endereço de Entrega</p>
                                                <p className="font-bold flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-slate-400" />
                                                    {selectedOrder.customer.address}, {selectedOrder.customer.neighborhood} - {selectedOrder.customer.city}/{selectedOrder.customer.state} ({selectedOrder.customer.cep})
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                                        <Package className="w-4 h-4" /> Itens do Pedido
                                    </h3>
                                    <div className="space-y-3">
                                        {selectedOrder.items?.map((item, idx) => (
                                            <div key={idx} className="p-4 bg-slate-50 dark:bg-white/5 rounded-3xl flex items-center gap-4 border border-transparent hover:border-blue-500/20 transition-all">
                                                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center p-2 border border-slate-100 dark:border-white/5">
                                                    {item.variant?.image || item.image ? (
                                                        <img src={item.variant?.image || item.image} className="w-full h-full object-contain" alt={item.name} />
                                                    ) : (
                                                        <Smartphone className="w-8 h-8 text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-black text-sm uppercase tracking-tight">{item.name}</p>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase">
                                                        {item.variant?.storage || 'N/A'} • {item.variant?.color || 'N/A'}
                                                    </p>
                                                    {item.imei && <p className="text-[9px] font-mono text-slate-400 mt-1">IMEI: {item.imei}</p>}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-blue-500">{formatCurrency(item.price || item.unitPrice)}</p>
                                                    <p className="text-[10px] font-black text-slate-400">QTD: {item.quantity}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            {/* Right Column: Actions & Summary */}
                            <div className="space-y-8">
                                <section className="p-6 bg-slate-900 text-white rounded-[2.5rem] space-y-6 shadow-xl shadow-slate-900/20">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 italic">Resumo Financeiro</h3>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm font-bold text-slate-400 uppercase">
                                            <span>Subtotal</span>
                                            <span className="text-white">{formatCurrency(selectedOrder.subtotal || selectedOrder.total)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm font-bold text-slate-400 uppercase">
                                            <span>Juros Parcelas</span>
                                            <span className="text-white">{formatCurrency(selectedOrder.installmentInterest || 0)}</span>
                                        </div>
                                        <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Total Final</span>
                                            <span className="text-2xl font-black text-blue-500">{formatCurrency(selectedOrder.total)}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-slate-500">Forma de Pagamento</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-500">
                                                <CreditCard className="w-4 h-4" />
                                            </div>
                                            <p className="font-bold text-sm uppercase">
                                                {selectedOrder.paymentMethod === 'pix' ? 'PIX / Dinheiro' : `Cartão em ${selectedOrder.installments || 1}x`}
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 pl-4 mb-2 italic">Ações do Pedido</p>

                                    {selectedOrder.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => handleUpdateStatus(selectedOrder.id, 'approved')}
                                                disabled={isUpdating}
                                                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                                Aprovar Pedido
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                                                disabled={isUpdating}
                                                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                                                Cancelar Pedido
                                            </button>
                                        </>
                                    )}

                                    {selectedOrder.status === 'approved' && (
                                        <button
                                            onClick={() => window.open(`/dashboard/checkout?importOrder=${selectedOrder.id}`, '_self')}
                                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                                        >
                                            <ArrowRight className="w-5 h-5" />
                                            Processar Venda (PDV)
                                        </button>
                                    )}

                                    <button
                                        onClick={() => window.print()}
                                        className="w-full py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                                    >
                                        <Printer className="w-5 h-5" />
                                        Imprimir Recibo
                                    </button>
                                </section>
                            </div>
                        </div>

                        {/* Order Timeline Placeholder */}
                        <div className="p-8 border-t border-slate-100 dark:border-white/5">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 italic">Fluxo do Pedido</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="w-4 h-4 bg-emerald-500 rounded-full" />
                                    <div className="w-0.5 h-12 bg-slate-200 dark:bg-white/5" />
                                </div>
                                <div className="pb-12">
                                    <p className="text-xs font-black uppercase tracking-tighter">Pedido Criado via Catálogo</p>
                                    <p className="text-[10px] font-bold text-slate-400">
                                        {selectedOrder.createdAt?.toDate ? format(selectedOrder.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Recentemente'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center">
                                    <div className={cn("w-4 h-4 rounded-full", selectedOrder.status === 'pending' ? "bg-slate-200" : "bg-emerald-500")} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tighter">Status Atual: {selectedOrder.status}</p>
                                    <p className="text-[10px] font-bold text-slate-400">Aguardando processamento interno</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OrdersPage;
