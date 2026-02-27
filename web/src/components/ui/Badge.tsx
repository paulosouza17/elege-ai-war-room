import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', children, ...props }) => {
    const variants = {
        default: 'bg-slate-700 text-white',
        success: 'bg-green-500/15 text-green-400 border border-green-500/20',
        warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
        danger: 'bg-red-500/15 text-red-400 border border-red-500/20 animate-pulse-slow',
        info: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
        outline: 'border border-slate-600 text-slate-400',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium uppercase tracking-wider',
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
};
