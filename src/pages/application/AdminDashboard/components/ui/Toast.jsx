import {useEffect} from "react";
import {AlertCircle, X, CheckCircle, Info} from 'lucide-react';

export const Toast = ({ message, type = 'error', onClose, duration = 5000 }) => {
    // Auto-close after duration
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const styles = {
        error: {
            bg: 'bg-red-50',
            border: 'border-red-100',
            text: 'text-red-800',
            icon: <AlertCircle className="text-red-500" size={20} />,
        },
        success: {
            bg: 'bg-green-50',
            border: 'border-green-100',
            text: 'text-green-800',
            icon: <CheckCircle className="text-green-500" size={20} />,
        },
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            text: 'text-blue-800',
            icon: <Info className="text-blue-500" size={20} />,
        }
    };

    const currentStyle = styles[type] || styles.error;

    return (
        <div className={`fixed top-6 right-6 z-100 flex items-center gap-3 px-4 py-3 rounded-2xl border-2   ${currentStyle.bg} ${currentStyle.border} animate-in slide-in-from-right-10 fade-in duration-300 min-w-[300px]`}>
            <div className="shrink-0">
                {currentStyle.icon}
            </div>

            <div className="flex-1">
                <p className={`text-sm font-bold ${currentStyle.text}`}>
                    {type === 'error' ? 'Error' : 'Notification'}
                </p>
                <p className={`text-xs font-medium opacity-80 ${currentStyle.text}`}>
                    {message}
                </p>
            </div>

            <button
                onClick={onClose}
                className={`p-1 rounded-lg hover:bg-black/5 transition-colors ${currentStyle.text}`}
            >
                <X size={16} />
            </button>
        </div>
    );
};
