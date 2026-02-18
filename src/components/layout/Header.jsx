import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';

export function Header() {
    return (
        <header className="fixed top-4 left-28 xl:left-72 right-4 h-20 glass-panel rounded-3xl px-6 flex items-center justify-between z-30 transition-all duration-300">
            {/* Mobile Menu Trigger (Visible on small screens) */}
            <button className="md:hidden p-2 text-slate-500">
                <Menu className="w-6 h-6" />
            </button>

            {/* Search Bar */}
            <div className="hidden md:flex items-center flex-1 max-w-md bg-slate-100 dark:bg-zinc-800/50 rounded-2xl px-4 py-2.5 ml-4 xl:ml-0 border border-transparent focus-within:border-indigo-500 focus-within:bg-white transition-all">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Buscar produtos, clientes, vendas..."
                    className="bg-transparent border-none outline-none ml-3 w-full text-slate-700 dark:text-zinc-200 placeholder-slate-400 text-sm font-medium"
                />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                <button className="relative p-3 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors group">
                    <Bell className="w-6 h-6 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                    <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900" />
                </button>

                <div className="w-px h-8 bg-slate-200 dark:bg-zinc-700 mx-2" />

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">Loja Demo</p>
                        <p className="text-xs text-slate-500">Admin</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 border-2 border-white dark:border-zinc-800 shadow-md" />
                </div>
            </div>
        </header>
    );
}
