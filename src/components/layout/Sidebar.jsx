import React from 'react';
import { Home, Box, Settings, Users, CreditCard, LogOut, ShoppingCart, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx'; // Make sure clsx is imported

const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: ShoppingCart, label: 'Venda Smart', path: '/smartsale' },
    { icon: Box, label: 'Estoque', path: '/stock' },
    { icon: Users, label: 'Clientes', path: '/clients' }, // Assuming route exists or will exist
    { icon: BarChart3, label: 'Relatórios', path: '/reports' },
    { icon: Settings, label: 'Configurações', path: '/fiscal-settings' },
];

export function Sidebar() {
    const location = useLocation();

    return (
        <aside className="fixed left-4 top-4 bottom-4 w-20 xl:w-64 glass-panel rounded-3xl flex flex-col justify-between p-4 z-40 transition-all duration-300">
            {/* Logo Area */}
            <div className="flex items-center justify-center xl:justify-start xl:px-4 py-4 mb-6">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-neon">
                    <span className="text-white font-black text-xl">P</span>
                </div>
                <span className="hidden xl:block ml-3 font-bold text-slate-800 dark:text-white text-lg tracking-tight">
                    Precifique
                </span>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 space-y-2 flex flex-col items-center xl:items-stretch">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                'group flex items-center p-3 rounded-2xl transition-all duration-300 relative',
                                isActive
                                    ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 w-1 h-8 bg-indigo-600 rounded-r-full hidden xl:block" />
                            )}
                            <item.icon className={clsx("w-6 h-6", isActive && "drop-shadow-md")} />
                            <span className="hidden xl:block ml-3 font-medium">{item.label}</span>

                            {/* Tooltip for mobile/collapsed */}
                            <div className="xl:hidden absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                {item.label}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* User / Logout */}
            <div className="mt-auto pt-6 border-t border-slate-200 dark:border-zinc-800 flex flex-col items-center xl:items-stretch">
                <button className="flex items-center p-3 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all group">
                    <LogOut className="w-6 h-6" />
                    <span className="hidden xl:block ml-3 font-medium">Sair</span>
                </button>
            </div>
        </aside>
    );
}
