/**
 * PWAInstalledToast
 *
 * Brief celebration toast shown after the app is installed.
 * Auto-dismisses after 4 seconds.
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { usePWAContext } from '../../contexts/PWAContext';

export function PWAInstalledToast() {
    const { justInstalled } = usePWAContext();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (justInstalled) {
            requestAnimationFrame(() => setVisible(true));
            const t = setTimeout(() => setVisible(false), 4000);
            return () => clearTimeout(t);
        }
    }, [justInstalled]);

    if (!justInstalled) return null;

    return (
        <div
            className={`
        fixed bottom-6 right-4 md:right-6 z-200
        transition-all duration-500 ease-out
        ${visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
      `}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-3 px-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-2xl max-w-xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle size={18} className="text-emerald-600" />
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-900">App installed! 🎉</p>
                    <p className="text-xs text-gray-500 font-medium">EduConnect is now on your device</p>
                </div>
            </div>
        </div>
    );
}
