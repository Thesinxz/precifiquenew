import { useState, useEffect } from 'react';
import {
    DollarSign,
    Plus,
    Trash2,
    Calendar,
    Tag,
    ArrowDownCircle,
    ArrowUpCircle,
    TrendingDown,
    Loader2,
    Briefcase,
    Zap,
    Home,
    Wifi,
    Megaphone,
    History,
    Building2
} from 'lucide-react';
import { CashFlowService } from '../../services/cashFlowService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency, cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CashFlowPage({ userProfile, settings }) {
    const orgId = userProfile?.organizationId || userProfile?.uid;
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [filter, setFilter] = useState('all'); // all, income, expense
    const [totalReceivable, setTotalReceivable] = useState(0);
    const [totalPayable, setTotalPayable] = useState(0);
    const [costCenterFilter, setCostCenterFilter] = useState('all');

    const [newExpense, setNewExpense] = useState({
        description: '',
        amount: '',
        category: 'outros',
        type: 'expense',
        costCenterId: '',
        date: new Date().toISOString().split('T')[0]
    });

    const categories = [
        { id: 'aluguel', label: 'Aluguel', icon: Home, type: 'expense' },
        { id: 'energia', label: 'Energia', icon: Zap, type: 'expense' },
        { id: 'marketing', label: 'Marketing/Ads', icon: Megaphone, type: 'expense' },
        { id: 'salarios', label: 'Salários', icon: Briefcase, type: 'expense' },
        { id: 'vendas', label: 'Vendas de Produtos', icon: DollarSign, type: 'income' },
        { id: 'outros', label: 'Outros/Variados', icon: Tag, type: 'expense' }
    ];

    useEffect(() => {
        if (orgId) {
            fetchMovements();
        }
    }, [orgId]);

    const fetchMovements = async () => {
        setLoading(true);
        try {
            const data = await CashFlowService.getMovements(orgId);
            setMovements(data);

            // Fetch pending receivables
            try {
                const q = query(
                    collection(db, 'receivables'),
                    where('organizationId', '==', orgId),
                    where('status', '==', 'pending')
                );
                const snap = await getDocs(q);
                const total = snap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
                setTotalReceivable(total);
            } catch (err) {
                console.warn("Receivables skipped (permissions/index)", err);
                setTotalReceivable(0);
            }

            // Fetch pending payables
            try {
                const qP = query(
                    collection(db, 'payables'),
                    where('organizationId', '==', orgId),
                    where('status', '==', 'pending')
                );
                const snapP = await getDocs(qP);
                const totalP = snapP.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
                setTotalPayable(totalP);
            } catch (err) {
                console.warn("Payables skipped (permissions/index)", err);
                setTotalPayable(0);
            }
        } catch (error) {
            console.error("fetchMovements failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await CashFlowService.addMovement(orgId, {
                ...newExpense,
                amount: parseFloat(newExpense.amount),
                date: new Date(newExpense.date)
            });
            setNewExpense({ description: '', amount: '', category: 'outros', type: 'expense', date: new Date().toISOString().split('T')[0] });
            setIsAdding(false);
            fetchMovements();
        } catch (error) {
            alert("Erro ao adicionar lançamento");
        }
    };

    const handleDelete = async (id) => {
        if (confirm("Excluir este lançamento financeiro?")) {
            await CashFlowService.deleteExpense(id);
            fetchMovements();
        }
    };

    const incomeTotal = movements
        .filter(m => (costCenterFilter === 'all' || m.costCenterId === costCenterFilter))
        .filter(m => m.type === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const expenseTotal = movements
        .filter(m => (costCenterFilter === 'all' || m.costCenterId === costCenterFilter))
        .filter(m => m.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const balance = incomeTotal - expenseTotal;

    const filteredMovements = movements.filter(m => {
        const matchesType = filter === 'all' || m.type === filter;
        const matchesCC = costCenterFilter === 'all' || m.costCenterId === costCenterFilter;
        return matchesType && matchesCC;
    });

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;

    return (
        <div className="w-full pb-20 animate-in fade-in duration-500 p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm dark:shadow-slate-900/50 border border-slate-100">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg dark:shadow-slate-900/50 shadow-indigo-100">
                            <DollarSign className="w-8 h-8" />
                        </div>
                        Pantry Financeiro
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">Gestão inteligente de fluxo de caixa e caderneta.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-xl dark:shadow-slate-900/50 active:scale-95"
                >
                    {isAdding ? "Cancelar" : "Novo Lançamento Manual"}
                    {!isAdding && <Plus className="w-4 h-4" />}
                </button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 text-white">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-[2.5rem] shadow-xl dark:shadow-slate-900/50 shadow-emerald-100 flex flex-col justify-between h-40 relative overflow-hidden group">
                    <ArrowUpCircle className="absolute right-[-10px] top-[-10px] w-24 h-24 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 italic">Entradas</p>
                        <p className="text-3xl font-black tracking-tighter mt-1">{formatCurrency(incomeTotal)}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[8px] font-bold bg-white dark:bg-slate-900/20 w-fit px-2 py-1 rounded-full backdrop-blur-sm">
                        Sincronizado
                    </div>
                </div>

                <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-[2.5rem] shadow-xl dark:shadow-slate-900/50 shadow-rose-100 flex flex-col justify-between h-40 relative overflow-hidden group">
                    <ArrowDownCircle className="absolute right-[-10px] top-[-10px] w-24 h-24 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 italic">Saídas</p>
                        <p className="text-3xl font-black tracking-tighter mt-1">{formatCurrency(expenseTotal)}</p>
                    </div>
                    <p className="text-[8px] font-bold bg-white dark:bg-slate-900/20 w-fit px-2 py-1 rounded-full backdrop-blur-sm italic">Manual</p>
                </div>

                <div className={cn(
                    "p-6 rounded-[2.5rem] shadow-xl flex flex-col justify-between h-40 relative overflow-hidden group transition-all",
                    balance >= 0 ? "bg-slate-900 shadow-slate-200" : "bg-orange-600 shadow-orange-100"
                )}>
                    <TrendingDown className="absolute right-[-10px] top-[-10px] w-24 h-24 opacity-10 group-hover:rotate-12 transition-transform duration-700" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 italic">Saldo / Lucro</p>
                        <p className="text-3xl font-black tracking-tighter mt-1">{formatCurrency(balance)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 py-1 rounded-full">{balance >= 0 ? 'Positivo' : 'Negativo'}</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-[2.5rem] shadow-xl dark:shadow-slate-900/50 shadow-amber-100 flex flex-col justify-between h-40 relative overflow-hidden group">
                    <History className="absolute right-[-10px] top-[-10px] w-24 h-24 opacity-10 group-hover:rotate-12 transition-transform duration-700" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 italic">A Receber</p>
                        <p className="text-3xl font-black tracking-tighter mt-1">{formatCurrency(totalReceivable)}</p>
                    </div>
                    <p className="text-[8px] font-bold bg-white dark:bg-slate-900/20 w-fit px-2 py-1 rounded-full backdrop-blur-sm italic">Entradas Pendentes</p>
                </div>

                <div className="bg-gradient-to-br from-slate-600 to-slate-800 p-6 rounded-[2.5rem] shadow-xl dark:shadow-slate-900/50 shadow-slate-200 flex flex-col justify-between h-40 relative overflow-hidden group">
                    <Calendar className="absolute right-[-10px] top-[-10px] w-24 h-24 opacity-10 group-hover:rotate-12 transition-transform duration-700" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 italic">A Pagar</p>
                        <p className="text-3xl font-black tracking-tighter mt-1">{formatCurrency(totalPayable)}</p>
                    </div>
                    <p className="text-[8px] font-bold bg-white dark:bg-slate-900/20 w-fit px-2 py-1 rounded-full backdrop-blur-sm italic">Saídas Programadas</p>
                </div>
            </div>

            {isAdding && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border-2 border-indigo-100 shadow-xl dark:shadow-slate-900/50 mb-10 animate-in slide-in-from-top duration-300">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-6 italic">Novo Lançamento Manual</h3>
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                            <input
                                required
                                value={newExpense.description}
                                onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-xl px-4 py-4 font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all text-sm"
                                placeholder="Ex: Pagamento Fornecedor X"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                value={newExpense.amount}
                                onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-xl px-4 py-4 font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all text-sm"
                                placeholder="0,00"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                            <select
                                value={newExpense.category}
                                onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-xl px-4 py-4 font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all text-sm appearance-none"
                            >
                                {categories.filter(c => c.type === 'expense').map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                            <input
                                type="date"
                                value={newExpense.date}
                                onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-xl px-4 py-4 font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Centro de Custo</label>
                            <select
                                value={newExpense.costCenterId}
                                onChange={e => setNewExpense({ ...newExpense, costCenterId: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-xl px-4 py-4 font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all text-sm appearance-none"
                            >
                                <option value="">Nenhum</option>
                                {settings?.costCenters?.filter(cc => cc.active).map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg dark:shadow-slate-900/50 hover:shadow-indigo-200 active:scale-95 duration-200">
                                Salvar Lançamento
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button onClick={() => setFilter('all')} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", filter === 'all' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}>Todos</button>
                    <button onClick={() => setFilter('income')} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", filter === 'income' ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500")}>Entradas</button>
                    <button onClick={() => setFilter('expense')} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", filter === 'expense' ? "bg-rose-500 text-white shadow-sm" : "text-slate-500")}>Saídas</button>
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{filteredMovements.length} Movimentos encontrados</div>

                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <Building2 className="w-4 h-4 text-slate-400 ml-2" />
                    <select
                        value={costCenterFilter}
                        onChange={e => setCostCenterFilter(e.target.value)}
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none focus:ring-0 cursor-pointer"
                    >
                        <option value="all">Filtrar: Todos os Centros</option>
                        {settings?.costCenters?.map(cc => (
                            <option key={cc.id} value={cc.id}>{cc.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 shadow-2xl dark:shadow-slate-900/50 shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100">
                                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                                <th className="text-right py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                                <th className="py-5 px-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredMovements.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-20 text-center text-slate-400 font-medium">Nenhuma movimentação registrada.</td>
                                </tr>
                            ) : filteredMovements.map(item => {
                                const isIncome = item.type === 'income';
                                const CategoryIcon = categories.find(c => c.id === item.category)?.icon || (isIncome ? ArrowUpCircle : Tag);
                                return (
                                    <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950/80 transition-all duration-300">
                                        <td className="py-5 px-8 text-sm font-bold text-slate-400">
                                            {format(item.date, 'dd/MM/yy')}
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg", isIncome ? "bg-emerald-500 shadow-emerald-100" : "bg-rose-500 shadow-rose-100")}>
                                                    {isIncome ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">{item.description}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">{item.origin === 'sale' ? 'Venda Automática' : 'Lançamento Manual'}</p>
                                                        {item.costCenterId && (
                                                            <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 flex items-center gap-1">
                                                                <Building2 className="w-3 h-3" />
                                                                {settings?.costCenters?.find(cc => cc.id === item.costCenterId)?.name || 'N/A'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-2">
                                                <CategoryIcon className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{item.category}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8 text-right font-black text-slate-800 dark:text-slate-100">
                                            <span className={cn(isIncome ? "text-emerald-600" : "text-rose-600")}>
                                                {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
                                            </span>
                                        </td>
                                        <td className="py-5 px-8 text-right">
                                            {item.origin !== 'sale' && (
                                                <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
