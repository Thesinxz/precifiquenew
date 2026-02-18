import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function GlassCard({
    children,
    className,
    hoverEffect = true,
    onClick,
    ...props
}) {
    return (
        <div
            onClick={onClick}
            className={twMerge(
                clsx(
                    'glass-panel rounded-3xl p-6 transition-all duration-300 relative overflow-hidden group',
                    hoverEffect && 'hover:scale-[1.02] hover:shadow-glass-sm cursor-default',
                    onClick && 'cursor-pointer active:scale-95',
                    className
                )
            )}
            {...props}
        >
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
