import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, X, Undo2, XCircle, AlertTriangle } from 'lucide-react';
import { TOAST_EVENT, pushToast } from './toastBus.js';

/**
 * ToastHost — renders the toast & undo stack. Mount once per layout shell.
 *
 * Toasts CONFIRM actions — they never carry critical errors (errors belong
 * inline on the page, next to what failed). Drive it via pushToast (toastBus.js).
 */
export default function ToastHost() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const onToast = (e) => {
            const toast = e.detail;
            setToasts(prev => [...prev.slice(-3), toast]); // max 4 on screen
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, toast.duration);
        };
        window.addEventListener(TOAST_EVENT, onToast);
        return () => window.removeEventListener(TOAST_EVENT, onToast);
    }, []);

    const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    const handleUndo = async (toast) => {
        dismiss(toast.id);
        try {
            await toast.undo?.();
            pushToast({ message: 'Action undone' });
        } catch {
            pushToast({ message: "Couldn't undo — please check the record" });
        }
    };

    if (!toasts.length) return null;

    return createPortal(
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[110] flex flex-col items-center gap-2 px-4 w-full max-w-md pointer-events-none">
            {toasts.map(toast => {
                let Icon = CheckCircle2;
                let iconColor = 'text-green-400';
                
                if (toast.type === 'error') {
                    Icon = XCircle;
                    iconColor = 'text-red-400';
                } else if (toast.type === 'warning') {
                    Icon = AlertTriangle;
                    iconColor = 'text-amber-400';
                } else if (toast.type === 'info') {
                    Icon = Info;
                    iconColor = 'text-blue-400';
                }

                return (
                    <div
                        key={toast.id}
                        className="pointer-events-auto flex items-center gap-3 w-full bg-gray-900 text-white rounded-xl shadow-xl pl-4 pr-2 py-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
                    >
                        <Icon size={16} className={`${iconColor} shrink-0`} />
                        <span className="flex-1 text-[13px] font-medium leading-snug">{toast.message}</span>
                        {toast.undo && (
                            <button
                                onClick={() => handleUndo(toast)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-bold text-blue-300 hover:bg-white/10 transition-colors shrink-0"
                            >
                                <Undo2 size={13} /> Undo
                            </button>
                        )}
                        <button
                            onClick={() => dismiss(toast.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors shrink-0"
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>,
        document.body
    );
}
