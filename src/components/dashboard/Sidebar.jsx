import { useState, useMemo } from 'react';
import {
    Calculator,
    ScanLine,
    RefreshCw,
    LayoutGrid,
    Settings,
    Tags,
    Plane,
    Menu,
    X,
    User,
    FileText,
    ShoppingCart,
    Clock,
    Box,
    LayoutDashboard,
    Users,
    Eye,
    EyeOff,
    Search,
    ChevronLeft,
    ChevronRight,
    Instagram,
    Cloud,
    CloudOff,
    Database,
    Circle,
    Wallet,
    Landmark,
    Bot,
    MessageCircle,
    Zap,
    Smartphone,
    ShoppingBag,
    ScrollText,
    MessageSquare,
    ChevronDown,
    LogOut,
    Sun,
    Moon,
    Bell,
    Wrench,
    Activity
} from 'lucide-react';

import { Logo } from '../ui/Logo';
import { auth, db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { useToast } from '../ui/Toast';

const MENU_ITEMS = [
    {
        group: 'Operação Diária', items: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'requests', label: 'Solicitações (Equipe)', icon: MessageSquare, badge: 'requestsCount' },
            { id: 'quick_pos', label: 'PDV (Caixa)', icon: Zap },
            { id: 'tech_lab', label: 'Assistência Técnica (OS)', icon: Wrench },
            { id: 'stock', label: 'Estoque', icon: Box },
            { id: 'clients', label: 'Clientes / CRM', icon: Users },
            { id: 'smart', label: 'Cálculo Inteligente', icon: Calculator },
        ]
    },
    {
        group: 'Vendas & Comercial', items: [
            { id: 'smart_sale', label: 'Pedidos de Venda', icon: Smartphone },
            { id: 'automations', label: 'Automações (Zap)', icon: Zap },
            { id: 'orders', label: 'Pedidos Online', icon: ShoppingBag, badge: 'ordersCount' },
            { id: 'inbox', label: 'Mensagens / Chat', icon: MessageSquare },
            { id: 'proposal', label: 'Orçamentos (PDF)', icon: FileText, badge: 'proposalCount' },
            { id: 'marketing', label: 'Gerador Instagram', icon: Instagram },
            { id: 'price_list', label: 'Lista de Preços', icon: Tags },
        ]
    },
    {
        group: 'Financeiro', items: [
            { id: 'dre', label: 'DRE Gerencial', icon: FileText, role: ['owner', 'admin'] },
            { id: 'cash_flow', label: 'Fluxo de Caixa', icon: Landmark, role: ['owner', 'admin'] },
            { id: 'receivables', label: 'Contas a Receber', icon: Wallet, role: ['owner', 'admin'] },
            { id: 'payables', label: 'Contas a Pagar', icon: Wallet, role: ['owner', 'admin'] },
            { id: 'audit', label: 'Conciliação Taxas', icon: Landmark, role: ['owner', 'admin'] },
            { id: 'purchases', label: 'Importar Compras (XML)', icon: FileText, role: ['owner', 'admin'] },
        ]
    },
    {
        group: 'Relatórios & Ferramentas', items: [
            { id: 'reports', label: 'Relatórios de Venda', icon: ScrollText, role: ['owner', 'admin'] },
            { id: 'history', label: 'Histórico de Cálculos', icon: Clock },
            { id: 'mass', label: 'OCR / Massa', icon: ScanLine },
            { id: 'import', label: 'Importação', icon: Plane, role: ['owner', 'admin'] },
            { id: 'reverse', label: 'Calculadora Reversa', icon: RefreshCw },
        ]
    },
    {
        group: 'Sistema & Equipe', items: [
            { id: 'team', label: 'Equipe', icon: Users, role: ['owner', 'admin'] },
            { id: 'wiki', label: 'Wiki Interna', icon: ScrollText },
            { id: 'terms', label: 'Termos e Contratos', icon: ScrollText, role: ['owner', 'admin'] },
            { id: 'settings', label: 'Ajustes do Sistema', icon: Settings, role: ['owner', 'admin'] },
            { id: 'profile', label: 'Minha Conta', icon: User },
        ]
    }
];

import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationCenter } from './NotificationCenter';

export function Sidebar({ currentView, userProfile, isMobileOpen, setIsMobileOpen, proposalCount, ordersCount: propOrdersCount, isSalesMode, onToggleSalesMode, onLogout, settings, onOpenNotifications, menuItems = [], darkMode, onToggleDarkMode }) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { unreadCount, pendingOrdersCount } = useNotifications() || { unreadCount: 0, pendingOrdersCount: 0 };
    const ordersCount = pendingOrdersCount;

    const [expandedGroups, setExpandedGroups] = useState(() => {
        try {
            const saved = localStorage.getItem('erp_sidebar_expanded');
            return saved ? JSON.parse(saved) : ['Operação Diária', 'Vendas & Comercial'];
        } catch {
            return ['Operação Diária', 'Vendas & Comercial'];
        }
    });

    const toggleGroup = (group) => {
        setExpandedGroups(prev => {
            const next = prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group];
            try {
                localStorage.setItem('erp_sidebar_expanded', JSON.stringify(next));
            } catch (e) { }
            return next;
        });
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);

    const handleSendFeedback = async () => {
        if (!feedbackText.trim()) return;
        setIsSendingFeedback(true);
        try {
            // Save to internal_requests with type 'feedback' and anonymous flag
            await addDoc(collection(db, 'internal_requests'), {
                type: 'feedback',
                title: 'Feedback Anônimo',
                description: feedbackText,
                priority: 'normal',
                organizationId: userProfile?.organizationId || auth.currentUser?.uid,
                requesterId: 'anonymous',
                requesterName: 'Funcionário Anônimo',
                status: 'pending',
                createdAt: new Date()
            });
            showToast("Feedback enviado anonimamente!", "success");
            setFeedbackText('');
            setIsFeedbackOpen(false);
        } catch (e) {
            console.error(e);
            showToast("Erro ao enviar feedback.", "error");
        } finally {
            setIsSendingFeedback(false);
        }
    };

    const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const filteredMenu = useMemo(() => {
        const term = normalize(searchTerm);
        const userRole = userProfile?.role || 'owner';

        // Use passed menuItems or fallback
        const sourceItems = menuItems.length > 0 ? menuItems : MENU_ITEMS;

        const roleFiltered = sourceItems.map(group => ({
            ...group,
            items: group.items.filter(item => !item.role || item.role.includes(userRole))
        })).filter(group => group.items.length > 0);

        if (!term) return roleFiltered.map(g => ({
            ...g,
            items: g.items.map(i => ({
                ...i,
                badge: i.badge === 'proposalCount' ? proposalCount : (i.id === 'orders' ? ordersCount : i.badge === 'ordersCount' ? ordersCount : i.badge)
            }))
        }));

        return roleFiltered.map(group => {
            const searchFilteredItems = group.items.filter(item =>
                normalize(item.label).includes(term)
            ).map(i => ({
                ...i,
                badge: i.badge === 'proposalCount' ? proposalCount : (i.id === 'orders' ? ordersCount : i.badge === 'ordersCount' ? ordersCount : i.badge)
            }));

            return { ...group, items: searchFilteredItems };
        }).filter(group => group.items.length > 0);
    }, [searchTerm, proposalCount, ordersCount, userProfile, menuItems]);

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-md"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div className={cn(
                "fixed md:static inset-y-0 left-0 z-50 w-64 md:border-r flex flex-col transition-all duration-300 ease-in-out",
                "bg-white/80 border-slate-100 glass-card dark:bg-slate-950 dark:border-white/5 dark:shadow-none",
                isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                <div className="p-6 pb-4 flex flex-col gap-4">
                    <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 text-left group bg-slate-900 dark:bg-white/5 p-3 rounded-2xl shadow-lg border border-slate-800 dark:border-white/10 w-full hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        {(settings?.branding?.logoUrl || settings?.branding?.logo || settings?.company?.logoUrl || settings?.company?.logo) ? (
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 bg-white/5 border border-white/10 relative z-10">
                                <img src={settings?.branding?.logoUrl || settings?.branding?.logo || settings?.company?.logoUrl || settings?.company?.logo} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-white/10 relative z-10">
                                <Logo className="w-8 h-8 text-white" />
                            </div>
                        )}
                        <div className="flex flex-col min-w-0 justify-center relative z-10">
                            <h1 className="text-sm font-black text-white uppercase tracking-wider leading-tight break-words">
                                {(() => {
                                    const name = settings?.branding?.appName || settings?.company?.name || 'Phone Smart';
                                    const parts = name.split(' ');
                                    return (
                                        <>
                                            <span className="block text-base tracking-widest">{parts[0]}</span>
                                            {parts.length > 1 && <span className="text-slate-400 text-[10px] font-bold leading-tight block truncate text-ellipsis">{parts.slice(1).join(' ')}</span>}
                                        </>
                                    );
                                })()}
                            </h1>
                        </div>
                    </button>

                    {/* User Profile - Green Style */}
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold border border-emerald-500/20">
                            {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                {userProfile?.name?.split(' ')[0] || 'Usuário'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                                {userProfile?.role === 'owner' ? 'Administrador' : (userProfile?.role === 'admin' ? 'Gerente' : 'Membro')}
                            </span>
                        </div>
                    </div>

                </div>



                {/* Navigation */}
                <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto no-scrollbar">
                    {filteredMenu.map((group) => {
                        const isExpanded = expandedGroups.includes(group.group) || searchTerm.length > 0;

                        return (
                            <div key={group.group} className="space-y-1">
                                {/* Group Header */}
                                <button
                                    onClick={() => toggleGroup(group.group)}
                                    className="w-full px-4 flex items-center justify-between group/header hover:text-blue-600 transition-colors mb-2 mt-2"
                                >
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover/header:text-blue-500 transition-colors">
                                        {group.group}
                                    </h3>
                                    <div className="text-slate-400 group-hover/header:text-blue-500">
                                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    </div>
                                </button>

                                {/* Group Items (Collapsible) */}
                                {isExpanded && (
                                    <div className="animate-in slide-in-from-top-2 duration-200 overflow-hidden">
                                        {group.items.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    const routes = {
                                                        'dashboard': '/dashboard',
                                                        'smart': '/dashboard/smart',
                                                        'proposal': '/dashboard/proposals',
                                                        'quick_pos': '/dashboard/pos',
                                                        'smart_sale': '/dashboard/checkout',
                                                        'orders': '/dashboard/orders',
                                                        'inbox': '/dashboard/inbox',
                                                        'mass': '/dashboard/ocr',
                                                        'import': '/dashboard/import',
                                                        'marketing': '/dashboard/marketing',
                                                        'price_list': '/dashboard/price-list',
                                                        'audit': '/dashboard/audit',
                                                        'reverse': '/dashboard/reverse',
                                                        'stock': '/dashboard/stock',
                                                        'tech_lab': '/dashboard/lab',
                                                        'purchases': '/dashboard/purchases',
                                                        'clients': '/dashboard/clients',
                                                        'reports': '/dashboard/reports',
                                                        'dre': '/dashboard/dre',
                                                        'cash_flow': '/dashboard/cashflow',
                                                        'receivables': '/dashboard/receivables',
                                                        'payables': '/dashboard/payables',
                                                        'automations': '/dashboard/automations',
                                                        'team': '/dashboard/team',
                                                        'terms': '/dashboard/terms',
                                                        'history': '/dashboard/history',
                                                        'requests': '/dashboard/requests',
                                                        'settings': '/dashboard/settings',
                                                        'profile': '/dashboard/profile'
                                                    };
                                                    navigate(routes[item.id] || '/dashboard');
                                                    setIsMobileOpen(false);
                                                }}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 group",
                                                    currentView === item.id
                                                        ? "bg-blue-600 text-white translate-x-1 shadow-lg shadow-blue-100 dark:shadow-blue-900/20"
                                                        : "text-slate-600 hover:bg-blue-50/50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-blue-400"
                                                )}
                                            >
                                                <item.icon className={cn(
                                                    "w-4 h-4 transition-colors",
                                                    currentView === item.id ? "text-white" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                                                )} />
                                                {item.label}
                                                {item.badge > 0 && (
                                                    <span className={cn(
                                                        "text-[10px] font-black px-2 py-0.5 rounded-full ml-auto shadow-sm",
                                                        currentView === item.id ? "bg-white text-blue-600" : "bg-red-500 text-white"
                                                    )}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </nav>

                {/* Cloud Status */}


                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-50 space-y-2">
                    <button
                        onClick={onToggleDarkMode}
                        className={cn(
                            "w-full flex items-center justify-between p-3 rounded-2xl transition-all border-2",
                            darkMode
                                ? "bg-slate-800 border-indigo-500/20 text-indigo-400"
                                : "bg-slate-50 border-transparent text-slate-500"
                        )}
                    >
                        <div className="flex items-center gap-3 text-left">
                            <div className={cn(
                                "p-2 rounded-xl",
                                darkMode ? "bg-blue-500 text-white" : "bg-white text-amber-500 shadow-sm"
                            )}>
                                {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-0.5">Tema UI</p>
                                <p className="text-[9px] font-bold opacity-60 leading-none">{darkMode ? 'Modo Escuro' : 'Modo Claro'}</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={onToggleSalesMode}
                        className={cn(
                            "w-full flex items-center justify-between p-3 rounded-2xl transition-all border-2",
                            isSalesMode
                                ? "bg-emerald-50 border-emerald-500/20 text-emerald-700"
                                : "bg-slate-50 border-transparent text-slate-500"
                        )}
                    >
                        <div className="flex items-center gap-3 text-left">
                            <div className={cn(
                                "p-2 rounded-xl",
                                isSalesMode ? "bg-emerald-500 text-white" : "bg-white text-slate-400"
                            )}>
                                {isSalesMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-0.5">Modo Vendedor</p>
                                <p className="text-[9px] font-bold opacity-60 leading-none">{isSalesMode ? 'Privacidade ON' : 'Privacidade OFF'}</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => setIsFeedbackOpen(true)}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all group"
                    >
                        <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-indigo-100 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Feedback 360</span>
                    </button>

                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all group"
                    >
                        <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-rose-100 transition-colors">
                            <LogOut className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Sair do Sistema</span>
                    </button>
                    <p className="text-[9px] text-center text-slate-300 dark:text-slate-700 font-bold tracking-widest opacity-50 pt-2">v1.0.0 • Phone Smart</p>
                </div>
            </div>
            {/* Feedback Modal */}
            {isFeedbackOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-white/5 relative">
                        <button onClick={() => setIsFeedbackOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6">
                            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
                                <MessageCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">Feedback 360</h3>
                            <p className="text-sm text-slate-400 font-medium">Sua sugestão será enviada de forma <span className="text-emerald-500 font-bold">100% anônima</span> para a gerência.</p>
                        </div>

                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Como podemos melhorar nossa loja? Sinta-se livre para dar sugestões ou feedbacks..."
                            className="w-full h-40 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all resize-none"
                        />

                        <button
                            onClick={handleSendFeedback}
                            disabled={isSendingFeedback || !feedbackText.trim()}
                            className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                            {isSendingFeedback ? 'Enviando...' : 'Enviar Feedback Anônimo'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
