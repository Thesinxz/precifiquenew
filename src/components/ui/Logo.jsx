import { cn } from "../../lib/utils";

export function Logo({ className, iconOnly = false }) {
    return (
        <div className={cn("flex items-center gap-3 group cursor-default select-none", className)}>
            <div className="relative">
                {/* Modern Abstract Icon Container */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/10 overflow-hidden shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">

                    {/* Abstract Grid/Tech Background Pattern */}
                    <div className="absolute inset-0 opacity-20"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '6px 6px' }}
                    />

                    {/* Stylized 'PS' Monogram SVG */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-md">
                        <path d="M7 8C7 5.79086 8.79086 4 11 4H13C15.2091 4 17 5.79086 17 8V8C17 10.2091 15.2091 12 13 12H11C8.79086 12 7 13.7909 7 16V16C7 18.2091 8.79086 20 11 20H13C15.2091 20 17 18.2091 17 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                        <circle cx="17" cy="6" r="1.5" className="fill-blue-200 animate-pulse" />
                    </svg>
                </div>
            </div>
            {!iconOnly && (
                <div className="flex flex-col">
                    <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none tracking-tighter flex items-center gap-0.5">
                        Phone<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Smart</span>
                    </h1>
                    <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400 mt-0.5">Intelligence</span>
                </div>
            )}
        </div>
    );
}

export function FaviconLogo() {
    return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="10" fill="#2563EB" />
            <path d="M9 10.5C9 8.29086 10.7909 6.5 13 6.5H15.5C17.7091 6.5 19.5 8.29086 19.5 10.5V10.5C19.5 12.7091 17.7091 14.5 15.5 14.5H13C10.7909 14.5 9 16.2909 9 18.5V18.5C9 20.7091 10.7909 22.5 13 22.5H15.5C17.7091 22.5 19.5 20.7091 19.5 18.5" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
    );
}
