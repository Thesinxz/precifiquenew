import { useState, useEffect } from 'react';
import {
    Users,
    UserPlus,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Mail,
    Copy,
    Check,
    Trash2,
    Loader2,
    MoreVertical,
    Target,
    DollarSign,
    ShoppingBag,
    TrendingUp,
    Gift,
    Settings,
    Share2,
    Save
} from 'lucide-react';
import { UserService } from '../../services/userService';
import { SalesService } from '../../services/salesService';
import { useToast } from '../ui/Toast';
import { cn, formatCurrency } from '../../lib/utils';
import { startOfMonth, endOfMonth } from 'date-fns';

export function TeamPage({ userProfile }) {
    const [team, setTeam] = useState([]);
    const [sales, setSales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditingMember, setIsEditingMember] = useState(null);
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    // Edit Form State
    const [editForm, setEditForm] = useState({});

    // Close modals on ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (isInviteOpen) setIsInviteOpen(false);
                if (isEditingMember) setIsEditingMember(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isInviteOpen, isEditingMember]);

    const { showToast } = useToast();
    const orgId = userProfile?.organizationId || (userProfile?.role === 'owner' ? userProfile?.uid : null);

    useEffect(() => {
        if (orgId) {
            loadData();
        } else {
            setIsLoading(false);
        }
    }, [orgId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [teamData, salesData] = await Promise.all([
                UserService.getTeam(orgId),
                SalesService.getSales(orgId, startOfMonth(new Date()), endOfMonth(new Date()))
            ]);
            setTeam(teamData);
            setSales(salesData);
        } catch (error) {
            console.error(error);
            showToast("Erro ao carregar dados.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveMember = async () => {
        if (!isEditingMember) return;
        try {
            await UserService.updateUser(isEditingMember.id, editForm);
            showToast("Configurações salvas!", "success");
            setIsEditingMember(null);
            loadData();
        } catch (error) {
            showToast("Erro ao salvar.", "error");
        }
    };

    const getMemberStats = (memberId) => {
        const memberSales = sales.filter(s => (s.sellerId || s.userId) === memberId);
        const totalSold = memberSales.reduce((acc, s) => acc + (s.total || 0), 0);
        const totalItems = memberSales.reduce((acc, s) => acc + (s.items?.reduce((iAcc, item) => iAcc + (item.quantity || 1), 0) || 0), 0);

        return { totalSold, totalItems, count: memberSales.length, sales: memberSales };
    };

    const calculateCommission = (stats, settings) => {
        const type = settings?.commissionType || 'percent'; // 'percent' | 'fixed_per_item' | 'fixed_smartphone'
        const value = parseFloat(settings?.commissionValue) || 0;

        if (type === 'fixed_per_item') {
            return stats.totalItems * value;
        }

        if (type === 'fixed_smartphone') {
            let smartphoneCount = 0;
            const keywords = ['iphone', 'xiaomi', 'redmi', 'realme', 'tecno', 'samsung', 'motorola', 'infinix', 'poco', 'celular', 'smartphone', 'oppo', 'honor'];

            stats.sales?.forEach(sale => {
                sale.items?.forEach(item => {
                    const name = (item.name || '').toLowerCase();
                    const cat = (item.category || '').toLowerCase();
                    const isSmartphone = keywords.some(k => name.includes(k) || cat.includes(k));

                    if (isSmartphone) {
                        smartphoneCount += (item.quantity || 1);
                    }
                });
            });
            return smartphoneCount * value;
        }

        // Percent
        return stats.totalSold * (value / 100);
    };

    const handleShareWhatsapp = () => {
        const baseUrl = window.location.origin;
        const text = `Olá! Junte-se à nossa equipe no VeloCell ERP. \n\n1. Acesse: ${baseUrl}/signup \n2. Use o Código da Loja: *${orgId}*`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const copyCode = () => {
        navigator.clipboard.writeText(orgId);
        showToast("Código copiado!", "success");
    };

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-indigo-600" />
                        Equipe & Metas
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Gerencie vendedores, comissões e acompanhe o desempenho.</p>
                </div>

                <button
                    onClick={() => setIsInviteOpen(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg dark:shadow-slate-900/50 shadow-indigo-200 active:scale-95 flex items-center gap-2"
                >
                    <UserPlus className="w-5 h-5" /> Convidar Membro
                </button>
            </div>

            {/* Team Grid */}
            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6">
                    {team.map(m => ({ ...m, stats: getMemberStats(m.id) }))
                        .sort((a, b) => b.stats.totalSold - a.stats.totalSold)
                        .map((member, index) => {
                            const stats = member.stats;
                            const commission = calculateCommission(stats, member);

                            const medals = [
                                { icon: "🥇", color: "from-amber-400 to-yellow-600", label: "Top 1 Vendedor" },
                                { icon: "🥈", color: "from-slate-300 to-slate-500", label: "Top 2 Vendedor" },
                                { icon: "🥉", color: "from-orange-400 to-orange-700", label: "Top 3 Vendedor" }
                            ];
                            const ranking = index < 3 ? medals[index] : null;

                            // Default goals if not set
                            const moneyGoal = parseFloat(member.monthlyGoal) || 0;
                            const itemGoal = parseInt(member.itemGoal) || 0;

                            const moneyProgress = moneyGoal > 0 ? Math.min(100, (stats.totalSold / moneyGoal) * 100) : 0;
                            const itemProgress = itemGoal > 0 ? Math.min(100, (stats.totalItems / itemGoal) * 100) : 0;

                            return (
                                <div key={member.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm dark:shadow-slate-900/50 border border-slate-100 hover:border-indigo-100 transition-all group relative overflow-hidden">
                                    <div className="flex items-start justify-between mb-6 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg border-2 border-indigo-100">
                                                    {member.name?.charAt(0).toUpperCase()}
                                                </div>
                                                {ranking && (
                                                    <div className={cn(
                                                        "absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-sm shadow-lg border border-white/20",
                                                        ranking.color
                                                    )} title={ranking.label}>
                                                        {ranking.icon}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{member.name}</h3>
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg",
                                                    member.role === 'owner' ? "bg-purple-100 text-purple-600" :
                                                        member.role === 'admin' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                                                )}>
                                                    {member.role === 'owner' ? 'Proprietário' : member.role === 'admin' ? 'Gerente' : 'Vendedor'}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditForm({
                                                    monthlyGoal: member.monthlyGoal || '',
                                                    itemGoal: member.itemGoal || '',
                                                    commissionType: member.commissionType || 'percent',
                                                    commissionValue: member.commissionValue || '',
                                                    role: member.role || 'seller'
                                                });
                                                setIsEditingMember(member);
                                            }}
                                            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        >
                                            <Settings className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vendas (Mês)</p>
                                            <p className="text-lg font-black text-slate-800 dark:text-slate-100">{formatCurrency(stats.totalSold)}</p>
                                            {moneyGoal > 0 && (
                                                <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${moneyProgress}%` }} />
                                                </div>
                                            )}
                                            {moneyGoal > 0 && <p className="text-[10px] text-slate-400 font-medium mt-1 text-right">{moneyProgress.toFixed(0)}% da meta</p>}
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Itens</p>
                                            <p className="text-lg font-black text-slate-800 dark:text-slate-100">{stats.totalItems} un.</p>
                                            {itemGoal > 0 && (
                                                <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${itemProgress}%` }} />
                                                </div>
                                            )}
                                            {itemGoal > 0 && <p className="text-[10px] text-slate-400 font-medium mt-1 text-right">{itemProgress.toFixed(0)}% da meta</p>}
                                        </div>
                                    </div>

                                    {/* Commission Banner */}
                                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between relative z-10 group-hover:bg-emerald-50 transition-colors">
                                        <div>
                                            <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest flex items-center gap-1">
                                                <Gift className="w-3 h-3" /> Comissão Estimada
                                            </p>
                                            <p className="text-xl font-black text-emerald-600 mt-0.5">{formatCurrency(commission)}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold bg-white dark:bg-slate-900 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm dark:shadow-slate-900/50">
                                                {member.commissionType === 'fixed_per_item'
                                                    ? `${formatCurrency(member.commissionValue || 0)} / item`
                                                    : member.commissionType === 'fixed_smartphone'
                                                        ? `${formatCurrency(member.commissionValue || 0)} / cel`
                                                        : `${member.commissionValue || 0}%`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Background Decoration */}
                                    <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Invite Modal */}
            {isInviteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl dark:shadow-slate-900/50 animate-in zoom-in-95 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />

                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                                <UserPlus className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">Convidar Equipe</h3>
                            <p className="text-slate-500 font-medium mt-2">Compartilhe o código da sua organização.</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border-2 border-slate-100 border-dashed mb-6 text-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Código da Loja</p>
                            <p className="text-3xl font-mono font-black text-indigo-600 mb-4">{orgId}</p>
                            <button onClick={copyCode} className="text-xs font-bold text-indigo-500 hover:text-indigo-700 underline">
                                Clique para copiar
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setIsInviteOpen(false)} className="py-3 px-4 rounded-xl text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 transition-colors">
                                Fechar
                            </button>
                            <button
                                onClick={handleShareWhatsapp}
                                className="py-3 px-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-lg dark:shadow-slate-900/50 shadow-emerald-200 flex items-center justify-center gap-2"
                            >
                                <Share2 className="w-4 h-4" /> Enviar Zap
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {isEditingMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl dark:shadow-slate-900/50 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">Configurar Vendedor</h3>
                                <p className="text-slate-500 font-bold">{isEditingMember.name}</p>
                            </div>
                            <button
                                onClick={() => {
                                    if (window.confirm("Tem certeza? Essa ação vai excluir este vendedor da equipe.")) {
                                        UserService.deleteUser(isEditingMember.id)
                                            .then(() => {
                                                showToast("Membro removido!", "success");
                                                setIsEditingMember(null);
                                                loadData();
                                            })
                                            .catch(() => showToast("Erro ao excluir.", "error"));
                                    }
                                }}
                                className="p-2 bg-red-50 rounded-full hover:bg-red-100 transition-colors group"
                            >
                                <Trash2 className="w-5 h-5 text-red-400 group-hover:text-red-500" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Goals */}
                            <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-3xl border border-slate-100">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Metas Mensais
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Faturamento (R$)</label>
                                        <input
                                            type="number"
                                            value={editForm.monthlyGoal}
                                            onChange={e => setEditForm(prev => ({ ...prev, monthlyGoal: e.target.value }))}
                                            className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
                                            placeholder="Ex: 50000"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Unidades (Qtd)</label>
                                        <input
                                            type="number"
                                            value={editForm.itemGoal}
                                            onChange={e => setEditForm(prev => ({ ...prev, itemGoal: e.target.value }))}
                                            className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
                                            placeholder="Ex: 30"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Commission */}
                            <div className="bg-emerald-50/30 p-6 rounded-3xl border border-emerald-100">
                                <h4 className="text-xs font-black text-emerald-600/70 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> Regra de Comissão
                                </h4>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Tipo de Cálculo</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <button
                                                onClick={() => setEditForm(prev => ({ ...prev, commissionType: 'percent' }))}
                                                className={cn(
                                                    "p-2 rounded-xl text-[10px] font-bold border-2 transition-all",
                                                    editForm.commissionType === 'percent'
                                                        ? "bg-emerald-500 text-white border-emerald-500"
                                                        : "bg-white text-slate-500 border-slate-100 hover:border-emerald-200"
                                                )}
                                            >
                                                Porcentagem (%)
                                            </button>
                                            <button
                                                onClick={() => setEditForm(prev => ({ ...prev, commissionType: 'fixed_per_item' }))}
                                                className={cn(
                                                    "p-2 rounded-xl text-[10px] font-bold border-2 transition-all",
                                                    editForm.commissionType === 'fixed_per_item'
                                                        ? "bg-emerald-500 text-white border-emerald-500"
                                                        : "bg-white text-slate-500 border-slate-100 hover:border-emerald-200"
                                                )}
                                            >
                                                Fixo por Item (R$)
                                            </button>
                                            <button
                                                onClick={() => setEditForm(prev => ({ ...prev, commissionType: 'fixed_smartphone' }))}
                                                className={cn(
                                                    "p-2 rounded-xl text-[10px] font-bold border-2 transition-all",
                                                    editForm.commissionType === 'fixed_smartphone'
                                                        ? "bg-emerald-500 text-white border-emerald-500"
                                                        : "bg-white text-slate-500 border-slate-100 hover:border-emerald-200"
                                                )}
                                            >
                                                Fixo Celulares (R$)
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">
                                            {editForm.commissionType === 'percent' ? 'Valor da Porcentagem (%)' : 'Valor Fixo (R$)'}
                                        </label>
                                        <input
                                            type="number"
                                            value={editForm.commissionValue}
                                            onChange={e => setEditForm(prev => ({ ...prev, commissionValue: e.target.value }))}
                                            className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-lg font-black text-emerald-600 outline-none focus:border-emerald-500"
                                            placeholder={editForm.commissionType === 'percent' ? "Ex: 10" : "Ex: 50.00"}
                                        />
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                            {editForm.commissionType === 'percent'
                                                ? "A comissão será calculada sobre o valor TOTAL das vendas."
                                                : editForm.commissionType === 'fixed_smartphone'
                                                    ? "Valor fixo por CADA celular (iPhone, Xiaomi, Realme, etc). Outros itens = R$ 0."
                                                    : "Valor fixo para CADA item vendido, independente do tipo."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Role Management (Only for Owners) */}
                            {userProfile?.role === 'owner' && isEditingMember.id !== userProfile.uid && (
                                <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100">
                                    <h4 className="text-xs font-black text-purple-600/70 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Permissões de Acesso
                                    </h4>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Função no Sistema</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setEditForm(prev => ({ ...prev, role: 'seller' }))}
                                                className={cn(
                                                    "p-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1",
                                                    editForm.role === 'seller'
                                                        ? "bg-purple-600 text-white border-purple-600"
                                                        : "bg-white text-slate-500 border-slate-100 hover:border-purple-200"
                                                )}
                                            >
                                                <ShoppingBag className="w-4 h-4" />
                                                Vendedor
                                            </button>
                                            <button
                                                onClick={() => setEditForm(prev => ({ ...prev, role: 'admin' }))}
                                                className={cn(
                                                    "p-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1",
                                                    editForm.role === 'admin'
                                                        ? "bg-purple-600 text-white border-purple-600"
                                                        : "bg-white text-slate-500 border-slate-100 hover:border-purple-200"
                                                )}
                                            >
                                                <ShieldCheck className="w-4 h-4" />
                                                Gerente (Admin)
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                            {editForm.role === 'admin'
                                                ? "Gerentes têm acesso total às configurações, estoque e relatórios financeiros."
                                                : "Vendedores têm acesso apenas às ferramentas de venda e seus próprios relatórios."}
                                        </p>
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="mt-8 flex gap-4">
                            <button
                                onClick={() => setIsEditingMember(null)}
                                className="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveMember}
                                className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-xl dark:shadow-slate-900/50 shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" /> Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
