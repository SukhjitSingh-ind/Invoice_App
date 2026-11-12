import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const idCounterRef = useRef(0);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((message, type = 'success', duration = 3000) => {
        idCounterRef.current += 1;
        const id = `${Date.now()}-${idCounterRef.current}`;

        setToasts((prev) => [...prev, { id, message, type }]);

        if (duration) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div
                className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none"
                role="status"
                aria-live="polite"
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto min-w-[320px] max-w-md bg-white rounded-xl shadow-2xl 
                            border-l-4 p-4 flex items-start gap-3 transform transition-all animate-fade-in-up
                            ${toast.type === 'success' ? 'border-green-500' : ''}
                            ${toast.type === 'error' ? 'border-red-500' : ''}
                            ${toast.type === 'warning' ? 'border-orange-500' : ''}
                            ${toast.type === 'info' ? 'border-blue-500' : ''}
                        `}
                    >
                        {toast.type === 'success' && <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />}
                        {toast.type === 'error' && <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />}
                        {toast.type === 'warning' && <AlertTriangle className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />}
                        {toast.type === 'info' && <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />}

                        <div className="flex-1">
                            <h4 className={`font-bold text-sm mb-0.5 ${
                                toast.type === 'success' ? 'text-green-800' :
                                toast.type === 'error' ? 'text-red-800' :
                                toast.type === 'warning' ? 'text-orange-800' : 'text-slate-800'
                            }`}>
                                {toast.type === 'success' ? 'Success' :
                                 toast.type === 'error' ? 'Error' :
                                 toast.type === 'warning' ? 'Warning' : 'Info'}
                            </h4>
                            <p className="text-slate-600 text-sm font-medium">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="Close notification"
                        >
                            <X size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// Hook kept in the same module for ergonomic developer experience
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
