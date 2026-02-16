import {
    LayoutDashboard,
    Calculator,
    Box,
    Menu,
    X,
    FileText,
    Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useState } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';

export function MobileNav({ currentView, onToggleSidebar, onOpenNotifications }) {
    const navigate = useNavigate();
    const { unreadCount } = useNotifications();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
        { id: 'stock', label: 'Estoque', icon: Box },
        { id: 'smart', label: 'Calcular', icon: Calculator },
        { id: 'proposal', label: 'Orçamentos', icon: FileText },
    ];

    return (
        <>
            {/* Bottom Bar Fixed */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 glass-card border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50 safe-area-bottom pb-8 animate-in slide-in-from-bottom duration-500">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => {
                            const routes = {
                                'dashboard': '/dashboard',
                                'stock': '/dashboard/stock',
                                'smart': '/dashboard/smart',
                                'proposal': '/dashboard/proposals',
                            };
                            navigate(routes[item.id] || '/dashboard');
                        }}
                        className={cn(
                            "flex flex-col items-center gap-1.5 transition-all duration-300",
                            currentView === item.id
                                ? "text-blue-600 scale-110"
                                : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <div className={cn(
                            "p-1.5 rounded-xl transition-colors",
                            currentView === item.id ? "bg-blue-50" : "bg-transparent"
                        )}>
                            <item.icon className={cn("w-5 h-5", currentView === item.id && "fill-current opacity-20")} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
                    </button>
                ))}

                <button
                    onClick={onOpenNotifications}
                    className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-all relative"
                >
                    <div className="p-1.5 rounded-xl bg-slate-50">
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full border-2 border-white flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider">Alertas</span>
                </button>

                <button
                    onClick={onToggleSidebar}
                    className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-all"
                >
                    <div className="p-1.5 rounded-xl bg-slate-50">
                        <Menu className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider">Menu</span>
                </button>
            </div>

            {/* Floating Action Button (FAB) for 'More' if needed, 
                or just keep it simple as requested. 
                For now, the 4 items cover the basics. 
                Full menu access provided via Sidebar hamburger in TopBar usually, 
                but we can hide sidebar on mobile entirely if we want.
            */}
        </>
    );
}
