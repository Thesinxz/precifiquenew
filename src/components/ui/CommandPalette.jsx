import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calculator, ScanLine, Box, Users, Clock, FileText, Settings, LayoutDashboard, Command, Instagram } from 'lucide-react';
import { cn } from '../../lib/utils';

export function CommandPalette({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const commands = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Navegação' },
        { id: 'smart', label: 'Calculadora Inteligente', icon: Calculator, category: 'Navegação' },
        { id: 'mass', label: 'Precificação em Massa', icon: ScanLine, category: 'Navegação' },
        { id: 'stock', label: 'Ver Estoque', icon: Box, category: 'Gestão' },
        { id: 'clients', label: 'Clientes / CRM', icon: Users, category: 'Gestão' },
        { id: 'history', label: 'Histórico de Cálculos', icon: Clock, category: 'Histórico' },
        { id: 'proposal', label: 'Gerar Orçamento (PDF)', icon: FileText, category: 'Vendas' },
        { id: 'marketing', label: 'Gerador Instagram', icon: Instagram, category: 'Marketing' },
        { id: 'settings', label: 'Configurações de Taxas', icon: Settings, category: 'Sistema' },
    ];

    const filtered = useMemo(() => {
        if (!searchTerm) return commands;
        return commands.filter(c =>
            c.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    const handleNavigate = (id) => {
        const routes = {
            'dashboard': '/dashboard',
            'smart': '/dashboard/smart',
            'mass': '/dashboard/ocr',
            'stock': '/dashboard/stock',
            'clients': '/dashboard/clients',
            'history': '/dashboard/history',
            'proposal': '/dashboard/proposals',
            'marketing': '/dashboard/marketing',
            'settings': '/dashboard/settings'
        };
        navigate(routes[id] || '/dashboard');
        onClose();
    };

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchTerm]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => (i + 1) % filtered.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
            } else if (e.key === 'Enter') {
                if (filtered[selectedIndex]) {
                    handleNavigate(filtered[selectedIndex].id);
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filtered, selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-4 px-8 py-6 border-b border-slate-100 dark:border-slate-800">
                    <Search className="w-6 h-6 text-slate-400" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="O que você deseja fazer?"
                        className="flex-1 bg-transparent border-none outline-none text-xl font-bold text-slate-700 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <kbd>ESC</kbd>
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-4 no-scrollbar">
                    {filtered.length === 0 ? (
                        <div className="py-12 text-center">
                            <Command className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">Nenhum comando encontrado para "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filtered.map((cmd, idx) => (
                                <button
                                    key={cmd.id}
                                    onClick={() => handleNavigate(cmd.id)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-5 rounded-3xl transition-all group",
                                        idx === selectedIndex ? "bg-indigo-600 shadow-xl shadow-indigo-100 dark:shadow-none translate-x-2" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                                    )}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                                            idx === selectedIndex ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                        )}>
                                            <cmd.icon className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className={cn(
                                                "font-black text-base uppercase tracking-wider",
                                                idx === selectedIndex ? "text-white" : "text-slate-700 dark:text-slate-200"
                                            )}>{cmd.label}</p>
                                            <p className={cn(
                                                "text-xs font-bold",
                                                idx === selectedIndex ? "text-indigo-200" : "text-slate-400 dark:text-slate-500"
                                            )}>{cmd.category}</p>
                                        </div>
                                    </div>
                                    {idx === selectedIndex && (
                                        <div className="flex items-center gap-2 pr-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                            <span className="text-[10px] font-black text-white/60 uppercase tracking-tighter">Enter</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-bold shadow-sm dark:shadow-none dark:text-slate-300 flex items-center gap-1">↑↓</kbd>
                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Navegar</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-bold shadow-sm dark:shadow-none dark:text-slate-300 flex items-center gap-1">Enter</kbd>
                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Selecionar</span>
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Phone Smart Intelligence v1</p>
                </div>
            </div>
        </div>
    );
}
