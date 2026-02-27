import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastContextType {
    toast: (type: ToastType, message: string, duration?: number) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

// Global imperative API — set by ToastProvider on mount
type ToastFn = (type: ToastType, message: string, duration?: number) => void;
let _globalToast: ToastFn = () => { };

export const showToast = {
    success: (msg: string) => _globalToast('success', msg),
    error: (msg: string) => _globalToast('error', msg),
    warning: (msg: string) => _globalToast('warning', msg),
    info: (msg: string) => _globalToast('info', msg),
};

const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    error: <XCircle className="w-4 h-4 text-red-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    info: <Info className="w-4 h-4 text-sky-400" />,
};

const styles: Record<ToastType, string> = {
    success: 'border-emerald-500/30 bg-emerald-950/80',
    error: 'border-red-500/30 bg-red-950/80',
    warning: 'border-amber-500/30 bg-amber-950/80',
    info: 'border-sky-500/30 bg-sky-950/80',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts(prev => [...prev, { id, type, message }]);
        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    // Register global imperative API
    useEffect(() => {
        _globalToast = addToast;
        return () => { _globalToast = () => { }; };
    }, [addToast]);

    const ctx: ToastContextType = {
        toast: addToast,
        success: (msg) => addToast('success', msg),
        error: (msg) => addToast('error', msg),
        warning: (msg) => addToast('warning', msg),
        info: (msg) => addToast('info', msg),
    };

    return (
        <ToastContext.Provider value={ctx}>
            {children}

            {/* Toast Container — Top Right */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg border backdrop-blur-md shadow-2xl text-sm text-white/90 animate-in slide-in-from-right-5 fade-in duration-300 max-w-sm ${styles[t.type]}`}
                    >
                        {icons[t.type]}
                        <span className="flex-1 text-xs font-medium">{t.message}</span>
                        <button
                            onClick={() => removeToast(t.id)}
                            className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
