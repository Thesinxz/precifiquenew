import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { Bell, X, Trash2, CheckCheck, Package, Users, AlertTriangle, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

export function NotificationCenter({ isOpen, onClose, darkMode }) {
    const navigate = useNavigate();
    const { notifications, unreadCount, markAllAsRead, markAsRead, deleteNotification, clearNotifications, testNotification } = useNotifications();
    const [selectedNotification, setSelectedNotification] = React.useState(null);

    if (!isOpen) return null;

    const handleNotificationClick = (n) => {
        markAsRead(n.id);
        setSelectedNotification(n);
    };

    const handleNavigation = () => {
        if (selectedNotification?.targetView) {
            const routes = {
                'dashboard': '/dashboard',
                'stock': '/dashboard/stock',
                'smart': '/dashboard/smart',
                'proposal': '/dashboard/proposals',
                'quick_pos': '/dashboard/pos',
                'smart_sale': '/dashboard/checkout',
                'orders': '/dashboard/orders',
                'inbox': '/dashboard/inbox',
                'mass': '/dashboard/ocr',
                'import': '/dashboard/import',
                'marketing': '/dashboard/marketing',
                'audit': '/dashboard/audit',
                'reverse': '/dashboard/reverse',
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
            navigate(routes[selectedNotification.targetView] || '/dashboard');
            onClose();
        }
    };

    return (
        <div className={cn("fixed inset-0 z-[1000] md:left-64 flex justify-end p-4 pointer-events-none", darkMode && "dark")}>
            <div className="absolute inset-0 bg-slate-950/60 pointer-events-auto backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className={cn(
                "w-full max-w-sm h-fit max-h-[calc(100vh-2rem)] rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-right duration-300 relative",
                darkMode ? "bg-[#0B1120] border-white/10" : "bg-white border-slate-100"
            )}>
                {selectedNotification ? (
                    // DETAIL VIEW
                    <div className="flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
                        {/* Detail Header */}
                        <div className={cn("p-6 border-b flex items-center gap-4", darkMode ? "bg-[#0B1120] border-white/5" : "bg-white border-slate-50")}>
                            <button
                                onClick={() => setSelectedNotification(null)}
                                className={cn("p-2 rounded-xl transition-colors", darkMode ? "hover:bg-white/5 text-slate-400" : "hover:bg-slate-50 text-slate-400")}
                            >
                                <Users className="w-5 h-5 rotate-180 hidden" /> {/* Dummy for spacing matches if needed, using Chevron instead */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m15 18-6-6 6-6" /></svg>
                            </button>
                            <h3 className={cn("text-lg font-black", darkMode ? "text-white" : "text-slate-800")}>Detalhes</h3>
                        </div>

                        {/* Detail Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-sm mx-auto",
                                selectedNotification.title.toLowerCase().includes('pedido') ? "bg-emerald-100 text-emerald-600" :
                                    selectedNotification.title.toLowerCase().includes('estoque') ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"
                            )}>
                                {selectedNotification.title.toLowerCase().includes('pedido') ? <Package className="w-8 h-8" /> :
                                    selectedNotification.title.toLowerCase().includes('estoque') ? <AlertTriangle className="w-8 h-8" /> : <Users className="w-8 h-8" />}
                            </div>

                            <div className="space-y-6 text-center">
                                <div>
                                    <h2 className={cn("text-xl font-black mb-2 leading-tight", darkMode ? "text-white" : "text-slate-800")}>
                                        {selectedNotification.title}
                                    </h2>
                                    <p className={cn("text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2", darkMode ? "text-slate-500" : "text-slate-400")}>
                                        <Calendar className="w-3 h-3" />
                                        {new Date(selectedNotification.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </p>
                                </div>

                                <div className={cn("p-6 rounded-3xl text-left shadow-sm border",
                                    darkMode ? "bg-white/5 border-white/5 text-slate-300" : "bg-slate-50 border-slate-100 text-slate-600"
                                )}>
                                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                                        {selectedNotification.body}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Detail Actions */}
                        <div className={cn("p-6 border-t space-y-3", darkMode ? "bg-slate-800/20 border-white/5" : "bg-slate-50 border-slate-50")}>
                            {selectedNotification.targetView && (
                                <button
                                    onClick={handleNavigation}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    Ver no Sistema <Users className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    deleteNotification(selectedNotification.id);
                                    setSelectedNotification(null);
                                }}
                                className="w-full py-4 bg-transparent border-2 border-slate-200 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                Excluir Notificação <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    // LIST VIEW
                    <>
                        {/* Header */}
                        <div className={cn("p-6 border-b flex items-center justify-between", darkMode ? "bg-[#0B1120] border-white/5" : "bg-white border-slate-50")}>
                            <div>
                                <h3 className={cn("text-lg font-black flex items-center gap-2", darkMode ? "text-white" : "text-slate-800")}>
                                    <Bell className="w-5 h-5 text-indigo-500" />
                                    Notificações
                                    {unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center animate-pulse">
                                            {unreadCount}
                                        </span>
                                    )}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Centro de Alertas</p>
                            </div>
                            <button onClick={onClose} className={cn("p-2 rounded-xl transition-colors", darkMode ? "hover:bg-white/5 text-slate-400" : "hover:bg-slate-50 text-slate-400")}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className={cn("px-4 py-2 border-b flex gap-2 justify-between items-center", darkMode ? "bg-slate-800/50 border-white/5" : "bg-slate-50 border-slate-50")}>
                            <button
                                onClick={(e) => { e.stopPropagation(); testNotification(); }}
                                className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 uppercase p-2 flex items-center gap-1.5"
                            >
                                <Bell className="w-3 h-3" /> Testar Alertas
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                                    className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase p-2 flex items-center gap-1.5"
                                >
                                    <CheckCheck className="w-3 h-3" /> Lidas
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); clearNotifications(); }}
                                    className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase p-2 flex items-center gap-1.5 transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" /> Limpar
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                                    <Bell className="w-16 h-16 text-slate-300 mb-4" />
                                    <p className="font-black uppercase tracking-[0.2em] text-xs">Sem notificações</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all active:scale-95 cursor-pointer group/card",
                                            n.read
                                                ? (darkMode ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100")
                                                : (darkMode ? "bg-indigo-500/10 border-indigo-500/30 shadow-lg" : "bg-indigo-50/50 border-indigo-100 shadow-sm shadow-indigo-50")
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                                n.title.toLowerCase().includes('pedido') ? "bg-emerald-100 text-emerald-600" :
                                                    n.title.toLowerCase().includes('estoque') ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"
                                            )}>
                                                {n.title.toLowerCase().includes('pedido') ? <Package className="w-5 h-5" /> :
                                                    n.title.toLowerCase().includes('estoque') ? <AlertTriangle className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className={cn(
                                                        "text-sm font-black line-clamp-1 group-hover/card:text-indigo-500 transition-colors uppercase tracking-tight",
                                                        n.read ? "text-slate-500" : (darkMode ? "text-white" : "text-slate-800")
                                                    )}>{n.title}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("text-[9px] font-bold uppercase flex items-center gap-1 whitespace-nowrap", n.read ? "text-slate-500/50" : "text-slate-400")}>
                                                            <Calendar className="w-2.5 h-2.5" />
                                                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteNotification(n.id);
                                                            }}
                                                            className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover/card:opacity-100"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className={cn(
                                                    "text-xs font-medium leading-relaxed line-clamp-2",
                                                    n.read ? "text-slate-500/60" : (darkMode ? "text-slate-300" : "text-slate-600")
                                                )}>{n.body}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className={cn("p-6 text-center mt-auto", darkMode ? "bg-slate-800/50" : "bg-slate-50")}>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">VeloCell Intelligence &copy; 2026</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
