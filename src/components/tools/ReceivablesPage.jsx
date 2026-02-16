import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Clock,
    Trash2,
    MoreHorizontal,
    DollarSign,
    User,
    ArrowUpRight,
    Edit2,
    X,
    MessageCircle,
    Building2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useToast } from '../ui/Toast';
import { cn, formatCurrency } from '../../lib/utils';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CashFlowService } from '../../services/cashFlowService';

export function ReceivablesPage({ user, userProfile, settings }) {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [receivables, setReceivables] = useState([]);
    const [filter, setFilter] = useState('all'); // all, pending, paid, late
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingReceivable, setEditingReceivable] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [costCenterFilter, setCostCenterFilter] = useState('all');
    const orgId = userProfile?.organizationId || user?.uid;

    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    useEffect(() => {
        if (orgId) loadReceivables();
    }, [orgId, costCenterFilter]);

    // Close modal on ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isAddModalOpen) {
                setIsAddModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAddModalOpen]);

    const loadReceivables = async () => {
        try {
            const q = query(
                collection(db, 'receivables'),
                where('organizationId', '==', orgId),
                orderBy('dueDate', 'asc')
            );

            const snapshot = await getDocs(q);
            let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (costCenterFilter !== 'all') {
                data = data.filter(r => r.costCenterId === costCenterFilter);
            }
            setReceivables(data);
        } catch (error) {
            console.error("Error loading receivables:", error);
            // Fallback for missing index
            if (error.code === 'failed-precondition') {
                // Try simple query
                const qSimple = query(
                    collection(db, 'receivables'),
                    where('organizationId', '==', orgId)
                );
                const snap = await getDocs(qSimple);
                const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort client side
                d.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                setReceivables(d);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (data) => {
        try {
            await addDoc(collection(db, 'receivables'), {
                organizationId: orgId,
                customerName: data.customerName,
                description: data.description,
                amount: parseFloat(data.amount),
                dueDate: data.dueDate,
                status: 'pending',
                costCenterId: data.costCenterId || null,
                createdAt: serverTimestamp(),
                createdBy: user.uid
            });

            showToast("Conta a receber adicionada!", "success");
            reset();
            setIsAddModalOpen(false);
            loadReceivables();
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar.", "error");
        }
    };

    const handleMarkAsPaid = async (id) => {
        try {
            const ref = doc(db, 'receivables', id);
            const snap = await getDocs(query(collection(db, 'receivables'), where('__name__', '==', id)));
            const receivableData = snap.docs[0]?.data();

            await updateDoc(ref, { status: 'paid', paidAt: serverTimestamp() });

            // Record Income in Financial Movements
            if (receivableData) {
                await CashFlowService.addMovement(orgId, {
                    type: 'income',
                    amount: receivableData.amount,
                    description: `Recebim. Caderneta: ${receivableData.customerName}`,
                    category: 'Recebimento de Devedores',
                    origin: 'receivable',
                    costCenterId: receivableData.costCenterId || null,
                    referenceId: id,
                    date: new Date()
                });
            }

            showToast("Conta marcada como paga e registrada no sistema financeiro!", "success");
            setReceivables(prev => prev.map(r => r.id === id ? { ...r, status: 'paid' } : r));
        } catch (e) {
            console.error(e);
            showToast("Erro ao atualizar.", "error");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Tem certeza que deseja apagar este registro?")) return;
        try {
            await deleteDoc(doc(db, 'receivables', id));
            setReceivables(prev => prev.filter(r => r.id !== id));
            showToast("Registro removido.", "info");
        } catch (e) {
            showToast("Erro ao remover.", "error");
        }
    }

    const getStatusParams = (r) => {
        const today = new Date().toISOString().split('T')[0];

        if (r.status === 'paid') return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Pago", icon: CheckCircle2 };
        if (r.dueDate < today) return { color: "bg-red-100 text-red-700 border-red-200", label: "Atrasado", icon: AlertCircle };
        return { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Pendente", icon: Clock };
    }

    const filteredList = receivables.filter(r => {
        if (filter === 'all') return true;

        const today = new Date().toISOString().split('T')[0];
        if (filter === 'paid') return r.status === 'paid';
        if (filter === 'pending') return r.status === 'pending' && r.dueDate >= today;
        if (filter === 'late') return r.status === 'pending' && r.dueDate < today;
        return true;
    });

    const totalReceivable = receivables
        .filter(r => r.status === 'pending')
        .reduce((acc, r) => acc + r.amount, 0);

    const totalLate = receivables
        .filter(r => r.status === 'pending' && r.dueDate < new Date().toISOString().split('T')[0])
        .reduce((acc, r) => acc + r.amount, 0);

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm dark:shadow-slate-900/50 border border-slate-100">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 shadow-lg dark:shadow-slate-900/50 shadow-indigo-100 rounded-2xl text-white">
                        <DollarSign className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Caderneta Digital</h1>
                        <p className="text-slate-500 font-medium tracking-tight">Gestão de contas a receber e clientes inadimplentes.</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg dark:shadow-slate-900/50 shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Nova Cobrança
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 shadow-sm dark:shadow-slate-900/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total a Receber</p>
                    <p className="text-4xl font-black text-indigo-900">{formatCurrency(totalReceivable)}</p>
                </div>
                <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 shadow-sm dark:shadow-slate-900/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Em Atraso (Crítico)</p>
                    <p className="text-4xl font-black text-red-700">{formatCurrency(totalLate)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { id: 'all', label: 'Todos' },
                    { id: 'pending', label: 'A Vencer' },
                    { id: 'late', label: 'Atrasados' },
                    { id: 'paid', label: 'Pagos' }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                            filter === f.id
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {settings?.costCenters?.length > 0 && (
                <div className="flex bg-white dark:bg-slate-900/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <Building2 className="w-4 h-4" />
                        Unidade:
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setCostCenterFilter('all')}
                            className={cn(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                costCenterFilter === 'all' ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-500 border border-slate-200"
                            )}
                        >
                            Todas Unidades
                        </button>
                        {settings.costCenters.filter(cc => cc.active).map(cc => (
                            <button
                                key={cc.id}
                                onClick={() => setCostCenterFilter(cc.id)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                    costCenterFilter === cc.id ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-500 border border-slate-200"
                                )}
                            >
                                {cc.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* List */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 shadow-sm dark:shadow-slate-900/50 overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <MoreHorizontal className="w-8 h-8 text-slate-300 animate-pulse" />
                    </div>
                ) : filteredList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="font-bold text-slate-400">Nenhum registro encontrado.</h3>
                        <p className="text-sm text-slate-400 mt-2">Adicione uma nova cobrança para começar.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredList.map(r => {
                            const status = getStatusParams(r);
                            const StatusIcon = status.icon;
                            return (
                                <div key={r.id} className="p-6 hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100">{r.customerName}</h4>
                                            <p className="text-xs text-slate-500 font-medium mb-1">{r.description || 'Sem descrição'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 border",
                                                    status.color
                                                )}>
                                                    <StatusIcon className="w-3 h-3" /> {status.label}
                                                </span>
                                                {r.status !== 'paid' && (
                                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        Vence: {new Date(r.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                                {r.saleId && (
                                                    <span className={cn(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded-lg border",
                                                        r.originalMethod === 'credit' || r.originalMethod === 'card'
                                                            ? "text-rose-500 bg-rose-50 border-rose-100"
                                                            : "text-indigo-400 bg-indigo-50 border-indigo-100"
                                                    )}>
                                                        {r.originalMethod === 'credit' || r.originalMethod === 'card' ? 'Cartão de Crédito' : 'Fiado / Automático'}
                                                    </span>
                                                )}
                                                {r.costCenterName && (
                                                    <span className="text-[10px] text-blue-400 font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {r.costCenterName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                                        <div className="text-right">
                                            <p className="text-xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(r.amount)}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {r.status !== 'paid' && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const message = `Olá ${r.customerName}, tudo bem? Passando para lembrar da sua conta de ${formatCurrency(r.amount)} referente a ${r.description || 'nossa loja'} que vence em ${new Date(r.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}.`;
                                                            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                                                        }}
                                                        className="p-2 hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 rounded-xl transition-all"
                                                        title="Cobrar via WhatsApp"
                                                    >
                                                        <MessageCircle className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMarkAsPaid(r.id)}
                                                        className="p-2 hover:bg-indigo-50 text-slate-300 hover:text-indigo-600 rounded-xl transition-all"
                                                        title="Marcar como Pago"
                                                    >
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingReceivable(r); setIsEditModalOpen(true); }}
                                                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 text-slate-300 hover:text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDelete(r.id)}
                                                className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-all"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && editingReceivable && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl dark:shadow-slate-900/50 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Editar Cobrança</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 rounded-full transition-all"><X className="w-6 h-6 text-slate-400" /></button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            const updatedData = {
                                customerName: formData.get('customerName'),
                                amount: parseFloat(formData.get('amount')),
                                dueDate: formData.get('dueDate'),
                                description: formData.get('description'),
                                updatedAt: serverTimestamp()
                            };
                            updateDoc(doc(db, 'receivables', editingReceivable.id), updatedData).then(() => {
                                showToast("Registro atualizado!", "success");
                                setIsEditModalOpen(false);
                                loadReceivables();
                            });
                        }} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Cliente</label>
                                <input name="customerName" defaultValue={editingReceivable.customerName} required className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-4 font-bold text-slate-700 dark:text-slate-200 outline-none transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Valor</label>
                                    <input name="amount" type="number" step="0.01" defaultValue={editingReceivable.amount} required className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-4 font-bold text-slate-700 dark:text-slate-200 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Vencimento</label>
                                    <input name="dueDate" type="date" defaultValue={editingReceivable.dueDate} required className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-4 font-bold text-slate-700 dark:text-slate-200 outline-none transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Descrição</label>
                                <input name="description" defaultValue={editingReceivable.description} className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-4 font-bold text-slate-700 dark:text-slate-200 outline-none transition-all" />
                            </div>
                            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl dark:shadow-slate-900/50 shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Salvar Alterações</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl dark:shadow-slate-900/50 w-full max-w-lg border border-slate-100">
                        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-6">Nova Cobrança</h3>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Nome do Cliente</label>
                                <input
                                    {...register('customerName', { required: true })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none"
                                    placeholder="Ex: João da Silva"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Valor (R$)</label>
                                <input
                                    type="number" step="0.01"
                                    {...register('amount', { required: true })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none"
                                    placeholder="0,00"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Data de Vencimento</label>
                                <input
                                    type="date"
                                    {...register('dueDate', { required: true })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Descrição (Opcional)</label>
                                <input
                                    placeholder="Ex: Compra de um iPhone 11"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Unidade / Centro de Custo</label>
                                <select
                                    {...register('costCenterId')}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none"
                                >
                                    <option value="">Nenhum</option>
                                    {settings?.costCenters?.filter(cc => cc.active).map(cc => (
                                        <option key={cc.id} value={cc.id}>{cc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-lg dark:shadow-slate-900/50 shadow-indigo-200"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
