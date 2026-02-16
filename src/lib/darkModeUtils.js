/**
 * Utility functions for consistent dark mode styling
 */

export const darkModeClasses = {
    // Card/Container backgrounds
    card: 'bg-white dark:bg-slate-900',
    cardAlt: 'bg-slate-50 dark:bg-slate-950',
    cardHover: 'bg-slate-100 dark:bg-slate-800',

    // Text colors
    textPrimary: 'text-slate-900 dark:text-white',
    textSecondary: 'text-slate-700 dark:text-slate-200',
    textTertiary: 'text-slate-600 dark:text-slate-300',
    textMuted: 'text-slate-500 dark:text-slate-400',

    // Borders
    border: 'border-slate-200 dark:border-white/10',
    borderStrong: 'border-slate-300 dark:border-white/20',

    // Inputs
    input: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400',
    inputFocus: 'focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500/20',

    // Buttons
    btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white',
    btnSecondary: 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200',
    btnGhost: 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200',

    // Shadows
    shadow: 'shadow-sm dark:shadow-slate-900/50',
    shadowMd: 'shadow-md dark:shadow-slate-900/50',
    shadowLg: 'shadow-lg dark:shadow-slate-900/50',

    // Hover states
    hoverBg: 'hover:bg-slate-50 dark:hover:bg-white/5',
    hoverBgStrong: 'hover:bg-slate-100 dark:hover:bg-white/10',

    // Dividers
    divider: 'border-slate-200 dark:border-white/10',

    // Modal/Overlay
    overlay: 'bg-slate-900/50 dark:bg-black/70',
    modal: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10',
};

/**
 * Combine dark mode classes with custom classes
 * Usage: dm('card', 'p-6 rounded-lg')
 */
export const dm = (...classNames) => {
    return classNames
        .map(className => {
            // If it's a key in darkModeClasses, expand it
            if (darkModeClasses[className]) {
                return darkModeClasses[className];
            }
            return className;
        })
        .filter(Boolean)
        .join(' ');
};

/**
 * Get dark mode class for a specific element type
 */
export const getDarkClass = (type) => darkModeClasses[type] || '';
