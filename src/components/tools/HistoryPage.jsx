import { useState, useEffect, useMemo } from 'react';
import { HistoryService } from '../../services/historyService';
import { auth } from '../../lib/firebase';
import { useToast } from '../ui/Toast';
import { Clock, Search, Trash2, ArrowUpRight, Calendar, DollarSign, ShoppingCart, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

export function HistoryPage({ user, onAddToProposal, isSalesMode }) {
    const { showToast } = useToast();
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user) loadHistory();
    }, [user]);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            if (user) {
                const data = await HistoryService.getHistory(user.uid);
                setHistory(data);
            }
        } catch (error) {
            console.error(error);
            showToast("Erro ao carregar histórico.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Tem certeza que deseja apagar este registro?")) return;
        try {
            await HistoryService.deleteCalculation(id);
            setHistory(prev => prev.filter(i => i.id !== id));
            showToast("Registro apagado.", "success");
        } catch (error) {
            showToast("Erro ao apagar.", "error");
        }
    };

    const filteredHistory = history.filter(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.details?.toLowerCase().includes(searchTerm.toLowerCase())
    );



    const stats = useMemo(() => {
        if (!Array.isArray(history)) return { calcsToday: 0, totalValue: 0 };
        const today = new Date().toDateString();
        const calcsToday = history.filter(i => {
            if (!i.createdAt) return false;
            try {
                return new Date(i.createdAt).toDateString() === today;
            } catch (e) {
                return false;
            }
        }).length;
        const totalValue = history.reduce((acc, i) => acc + (parseFloat(i.pixPrice) || 0), 0);
        return { calcsToday, totalValue };
    }, [history]);

    return (
        <div className="w-full pb-20 animate-in fade-in duration-500">
            {/* Header & Mini Stats */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Clock className="w-8 h-8 text-indigo-600" />
                        Histórico de Cálculos
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">Sua inteligência de precificação organizada.</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-[1.5rem] shadow-sm dark:shadow-slate-900/50 border border-slate-100 flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hoje</span>
                        <span className="text-xl font-black text-indigo-600">{stats.calcsToday}</span>
                    </div>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar no histórico..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-900/50 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-100 focus:bg-slate-50 dark:bg-slate-950 transition-all w-full md:w-80"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-20">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                </div>
            ) : filteredHistory.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-400 tracking-tight">Sem registros</h3>
                    <p className="text-slate-400 mt-2 font-medium">Os produtos que você precifica <br /> aparecerão salvos aqui.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-8">
                    {filteredHistory.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-7 shadow-sm dark:shadow-slate-900/50 border border-slate-100 hover:border-indigo-100 hover:shadow-xl dark:shadow-slate-900/50 hover:shadow-indigo-500/5 transition-all flex flex-col group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                            <div className="relative z-10 flex-1">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-950 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(item.createdAt)}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <h3 className="font-black text-slate-800 dark:text-slate-100 text-xl mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{item.name}</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">{item.details}</p>

                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    <div className="bg-emerald-50/50 p-3 rounded-[1.5rem] border border-emerald-100/50">
                                        <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">À Vista</p>
                                        <p className="text-base font-black text-emerald-700">{formatCurrency(item.pixPrice)}</p>
                                    </div>
                                    <div className="bg-indigo-50/50 p-3 rounded-[1.5rem] border border-indigo-100/50">
                                        <p className="text-[9px] font-black text-indigo-600/60 uppercase tracking-widest mb-1">12x</p>
                                        <p className="text-base font-black text-indigo-700">{formatCurrency(item.installmentPrice)}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => onAddToProposal(item)}
                                className="relative z-10 w-full py-4 bg-slate-900 group-hover:bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg dark:shadow-slate-900/50 shadow-slate-200 group-hover:shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <ShoppingCart className="w-4 h-4" />
                                Adicionar ao Orçamento
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
