import { cn } from '../../../../lib/utils';

export function InputGroup({ label, value, onChange, placeholder, prefix, suffix, type = "text", compactLabel }) {
    return (
        <div className="space-y-1.5 w-full">
            {!compactLabel && <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{label}</label>}
            {compactLabel && <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>}
            <div className="relative">
                {prefix && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 text-sm font-bold">{prefix}</span>
                    </div>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={cn(
                        "block w-full rounded-xl border-slate-200 bg-slate-50 p-3 text-slate-800 font-medium shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:bg-white transition-all sm:text-sm",
                        prefix ? "pl-10" : "pl-3",
                        suffix ? "pr-10" : "pr-3"
                    )}
                    placeholder={placeholder}
                />
                {suffix && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 text-sm font-bold">{suffix}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
