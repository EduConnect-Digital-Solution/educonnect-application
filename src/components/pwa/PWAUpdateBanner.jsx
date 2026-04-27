/**
 * PWAUpdateBanner
 *
 * Shown when a new service worker version is detected.
 * Non-intrusive top banner with "Refresh to update" action.
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { usePWAContext } from '../../contexts/PWAContext';

export function PWAUpdateBanner() {
    const { updateAvailable, applyUpdate } = usePWAContext();
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (updateAvailable && !dismissed) {
            const t = setTimeout(() => setVisible(true), 500);
            return () => clearTimeout(t);
        }
    }, [updateAvailable, dismissed]);

    const handleDismiss = () => {
        setVisible(false);
        setTimeout(() => setDismissed(true), 300);
    };

    if (!updateAvailable || dismissed) return null;

    return (
        <div
            className={`
        fixed top-0 inset-x-0 z-150
        transition-transform duration-500 ease-out
        ${visible ? 'translate-y-0' : '-translate-y-full'}
      `}
            role="alert"
            aria-live="polite"
        >
            <div className="bg-[#104889] text-white shadow-lg shadow-blue-900/30">
                <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            <Sparkles size={14} className="text-[#FEC11B]" />
                        </div>
                        <p className="text-sm font-semibold truncate">
                            <span className="font-bold">New version available</span>
                            <span className="hidden sm:inline text-blue-200 font-normal"> — Refresh to get the latest improvements</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={applyUpdate}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-[#104889] font-bold text-xs rounded-lg hover:bg-blue-50 active:scale-95 transition-all"
                        >
                            <RefreshCw size={12} />
                            Refresh
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Dismiss update notification"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
