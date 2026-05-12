import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 5000); // Auto dismiss after 5s
    }, [removeToast]);

    const success = (msg: string) => showToast(msg, 'success');
    const error = (msg: string) => showToast(msg, 'error');
    const info = (msg: string) => showToast(msg, 'info');
    const warning = (msg: string) => showToast(msg, 'warning');

    return (
        <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-4 max-w-sm w-full pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto
                            flex items-start gap-3 p-4
                            border-3 border-neo-black shadow-neo
                            transition-all animate-in slide-in-from-right-full
                            ${toast.type === 'success' ? 'bg-neo-green text-neo-black' : ''}
                            ${toast.type === 'error' ? 'bg-neo-pink text-neo-black' : ''}
                            ${toast.type === 'warning' ? 'bg-neo-yellow text-neo-black' : ''}
                            ${toast.type === 'info' ? 'bg-neo-white text-neo-black' : ''}
                        `}
                    >
                        <div className="mt-1 shrink-0">
                            {toast.type === 'success' && <CheckCircle className="w-6 h-6" />}
                            {toast.type === 'error' && <X className="w-6 h-6" />}
                            {toast.type === 'warning' && <AlertTriangle className="w-6 h-6" />}
                            {toast.type === 'info' && <Info className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 pt-1">
                            <p className="font-bold text-sm uppercase leading-tight">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="shrink-0 hover:bg-black/10 p-1 rounded-sm transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
