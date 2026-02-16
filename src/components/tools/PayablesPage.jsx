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
    ArrowDownCircle,
    User,
    Building2,
    Edit2,
    X,
    FileText
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useToast } from '../ui/Toast';
import { cn, formatCurrency } from '../../lib/utils';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CashFlowService } from '../../services/cashFlowService';

export function PayablesPage({ user, userProfile, settings }) {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [payables, setPayables] = useState([]);
    const [filter, setFilter] = useState('all'); // all, pending, paid, late
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingPayable, setEditingPayable] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [costCenterFilter, setCostCenterFilter] = useState('all');
    const orgId = userProfile?.organizationId || user?.uid;

    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    useEffect(() => {
        if (orgId) loadPayables();
    }, [orgId, costCenterFilter]);

    const loadPayables = async () => {
        try {
            const q = query(
                collection(db, 'payables'),
                where('organizationId', '==', orgId),
                orderBy('dueDate', 'asc')
            );

            const snapshot = await getDocs(q);
            let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (costCenterFilter !== 'all') {
                data = data.filter(p => p.costCenterId === costCenterFilter);
            }
            setPayables(data);
        } catch (error) {
            console.error("Error loading payables:", error);
            // Fallback for missing index
            if (error.code === 'failed-precondition') {
                const qSimple = query(
                    collection(db, 'payables'),
                    where('organizationId', '==', orgId)
                );
                const snap = await getDocs(qSimple);
                const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                d.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                setPayables(d);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (data) => {
        try {
            await addDoc(collection(db, 'payables'), {
                organizationId: orgId,
                supplierName: data.supplierName,
                description: data.description,
                amount: parseFloat(data.amount),
                dueDate: data.dueDate,
                status: 'pending',
                category: data.category || 'Outros',
                costCenterId: data.costCenterId || null,
                costCenterName: settings?.costCenters?.find(cc => cc.id === data.costCenterId)?.name || null,
                createdAt: serverTimestamp(),
                createdBy: user.uid
            });

            showToast("Conta a pagar registrada!", "success");
            reset();
            setIsAddModalOpen(false);
            loadPayables();
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar.", "error");
        }
    };

    const handleMarkAsPaid = async (payable) => {
        try {
            const ref = doc(db, 'payables', payable.id);
            await updateDoc(ref, { status: 'paid', paidAt: serverTimestamp() });

            // Automatically record in Financial Movements
            await CashFlowService.addMovement(orgId, {
                userId: user.uid,
                type: 'expense',
                amount: payable.amount,
                description: `Pagam. ${payable.supplierName} - ${payable.description}`,
                category: payable.category || 'Fornecedores',
                origin: 'payable',
                referenceId: payable.id,
                costCenterId: payable.costCenterId || null,
                date: new Date()
            });

            showToast("Conta marcada como paga e lançada no caixa!", "success");
            loadPayables();
        } catch (e) {
            console.error(e);
            showToast("Erro ao atualizar.", "error");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Tem certeza que deseja apagar este registro?")) return;
        try {
            await deleteDoc(doc(db, 'payables', id));
            setPayables(prev => prev.filter(r => r.id !== id));
            showToast("Registro removido.", "info");
        } catch (e) {
            showToast("Erro ao remover.", "error");
        }
    }

    const getStatusParams = (r) => {
        const today = new Date().toISOString().split('T')[0];
        if (r.status === 'paid') return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Pago", icon: CheckCircle2 };
        if (r.dueDate < today) return { color: "bg-rose-100 text-rose-700 border-rose-200", label: "Atrasado", icon: AlertCircle };
        return { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Pendente", icon: Clock };
    }

    const filteredList = payables.filter(r => {
        if (filter === 'all') return true;
        const today = new Date().toISOString().split('T')[0];
        if (filter === 'paid') return r.status === 'paid';
        if (filter === 'pending') return r.status === 'pending' && r.dueDate >= today;
        if (filter === 'late') return r.status === 'pending' && r.dueDate < today;
        return true;
    });

    const totalPayable = payables
        .filter(r => r.status === 'pending')
        .reduce((acc, r) => acc + r.amount, 0);

    const totalLate = payables
        .filter(r => r.status === 'pending' && r.dueDate < new Date().toISOString().split('T')[0])
        .reduce((acc, r) => acc + r.amount, 0);

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500 pb-20 p-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm dark:shadow-slate-900/50 border border-slate-100">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-rose-600 shadow-lg dark:shadow-slate-900/50 shadow-rose-100 rounded-2xl text-white">
                        <ArrowDownCircle className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Contas a Pagar</h1>
                        <p className="text-slate-500 font-medium tracking-tight">Controle de boletos, fornecedores e compromissos.</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg dark:shadow-slate-900/50 shadow-rose-200 transition-all flex items-center gap-2 active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Registrar Boleto/Conta
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 shadow-sm dark:shadow-slate-900/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Previsão de Saídas</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white">{formatCurrency(totalPayable)}</p>
                </div>
                <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 shadow-sm dark:shadow-slate-900/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">Atrasados (Multa Risco)</p>
                    <p className="text-4xl font-black text-rose-700">{formatCurrency(totalLate)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { id: 'all', label: 'Todos' },
                    { id: 'pending', label: 'Pendente' },
                    { id: 'late', label: 'Atrasados' },
                    { id: 'paid', label: 'Liquidados' }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                            filter === f.id
                                ? "bg-rose-600 text-white border-rose-600 shadow-md"
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
                            Todas
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
                        <h3 className="font-bold text-slate-400">Nenhum compromisso encontrado.</h3>
                        <p className="text-sm text-slate-400 mt-2">Você está em dia ou não cadastrou despesas futuras.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredList.map(r => {
                            const status = getStatusParams(r);
                            const StatusIcon = status.icon;
                            return (
                                <div key={r.id} className="p-6 hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-100">{r.supplierName}</h4>
                                                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded uppercase">{r.category}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium mb-1">{r.description || 'Compromisso financeiro'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 border",
                                                    status.color
                                                )}>
                                                    <StatusIcon className="w-3 h-3" /> {status.label}
                                                </span>
                                                {r.costCenterName && (
                                                    <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-indigo-100">
                                                        <Building2 className="w-3 h-3" />
                                                        {r.costCenterName}
                                                    </span>
                                                )}
                                                {r.status !== 'paid' && (
                                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        Vence: {new Date(r.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                                {r.paidAt && (
                                                    <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg">
                                                        Pago em: {r.paidAt.toDate ? r.paidAt.toDate().toLocaleDateString('pt-BR') : new Date(r.paidAt).toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                                        <div className="text-right">
                                            <p className="text-xl font-black text-rose-600">{formatCurrency(r.amount)}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {r.status !== 'paid' && (
                                                <>
                                                    <button
                                                        onClick={() => handleMarkAsPaid(r)}
                                                        className="p-2 hover:bg-emerald-50 text-slate-300 hover:text-emerald-500 rounded-xl transition-all"
                                                        title="Marcar como Pago"
                                                    >
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingPayable(r); setIsEditModalOpen(true); }}
                                                        className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 text-slate-300 hover:text-slate-600 dark:text-slate-300 rounded-xl transition-all"
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

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl dark:shadow-slate-900/50 w-full max-w-lg border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">Novo Compromisso</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-slate-600 dark:text-slate-300"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Fornecedor / Beneficiário</label>
                                <input
                                    {...register('supplierName', { required: true })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 focus:border-rose-500 outline-none"
                                    placeholder="Ex: Apple Wholesale ou Aluguel Sala"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Valor (R$)</label>
                                    <input
                                        type="number" step="0.01"
                                        {...register('amount', { required: true })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 focus:border-rose-500 outline-none"
                                        placeholder="0,00"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Vencimento</label>
                                    <input
                                        type="date"
                                        {...register('dueDate', { required: true })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 focus:border-rose-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Categoria</label>
                                <select
                                    {...register('category')}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 focus:border-rose-500 outline-none"
                                >
                                    <option value="Fornecedores">Fornecedores / Peças</option>
                                    <option value="Serviços">Assinaturas / Software</option>
                                    <option value="Infraestrutura">Aluguel / Condomínio</option>
                                    <option value="Utilidades">Energia / Internet</option>
                                    <option value="Impostos">Impostos / DAS</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Centro de Custo</label>
                                <select
                                    {...register('costCenterId')}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 focus:border-rose-500 outline-none"
                                >
                                    <option value="">Nenhum</option>
                                    {settings?.costCenters?.filter(cc => cc.active).map(cc => (
                                        <option key={cc.id} value={cc.id}>{cc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Descrição Adicional</label>
                                <input
                                    {...register('description')}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 focus:border-rose-500 outline-none"
                                    placeholder="Ex: Parcela 2/3 NF 123"
                                />
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-rose-600 text-white font-bold rounded-2xl uppercase tracking-widest text-xs hover:bg-rose-700 shadow-lg dark:shadow-slate-900/50 shadow-rose-200 active:scale-95 transition-all"
                                >
                                    Agendar Pagamento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
