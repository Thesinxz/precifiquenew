import { createContext, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        if (type !== 'loading') {
            setTimeout(() => setToast(null), 3000);
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, toast, setToast }}>
            {children}
            <ToastContainer toast={toast} onClose={() => setToast(null)} />
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

export function ToastContainer({ toast, onClose }) {
    if (!toast) return null;

    return (
        <div className="fixed top-4 right-4 z-[10000] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={cn(
                "flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border",
                toast.type === 'success' ? "bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400" :
                    toast.type === 'error' ? "bg-white dark:bg-slate-900 border-red-100 dark:border-red-900/50 text-red-800 dark:text-red-400" : "bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-400"
            )}>
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                {toast.type === 'loading' && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}

                <span className="font-bold text-sm">{toast.message}</span>

                {/* Progress bar simulation */}
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-current opacity-10 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-current animate-[shrink_3s_linear_forwards]" />
                </div>
            </div>
        </div>
    );
}
