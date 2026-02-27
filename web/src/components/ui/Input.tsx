import React, { InputHTMLAttributes } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ className, label, error, ...props }) => {
    return (
        <div className="w-full">
            {label && <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>}
            <input
                className={cn(
                    'w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white',
                    'focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary',
                    'placeholder-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all',
                    error && 'border-danger focus:ring-danger focus:border-danger',
                    className
                )}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </div>
    );
};
