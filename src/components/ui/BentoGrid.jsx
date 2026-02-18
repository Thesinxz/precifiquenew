import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function BentoGrid({ children, className, cols = 3 }) {
    return (
        <div
            className={twMerge(
                clsx(
                    'grid gap-4 md:gap-6',
                    cols === 1 && 'grid-cols-1',
                    cols === 2 && 'grid-cols-1 md:grid-cols-2',
                    cols === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
                    cols === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
                    className
                )
            )}
        >
            {children}
        </div>
    );
}

export function BentoItem({ children, className, span = 1 }) {
    return (
        <div
            className={twMerge(
                clsx(
                    span === 1 && 'col-span-1',
                    span === 2 && 'col-span-1 md:col-span-2',
                    span === 3 && 'col-span-1 md:col-span-3',
                    className
                )
            )}
        >
            {children}
        </div>
    );
}
