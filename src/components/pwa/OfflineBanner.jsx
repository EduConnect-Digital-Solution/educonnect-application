/**
 * OfflineBanner
 *
 * Subtle but clear banner shown when the user goes offline.
 * Auto-hides when connection returns (with a brief "back online" confirmation).
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';
import { usePWAContext } from '../../contexts/PWAContext';

export function OfflineBanner() {
    const { isOnline } = usePWAContext();
    const [status, setStatus] = useState('idle'); // 'idle' | 'offline' | 'back-online'
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setStatus('offline');
            setDismissed(false);
            setVisible(true);
        } else if (status === 'offline') {
            // Was offline, now back online
            setStatus('back-online');
            setVisible(true);
            const t = setTimeout(() => {
                setVisible(false);
                setTimeout(() => setStatus('idle'), 300);
            }, 3000);
            return () => clearTimeout(t);
        }
    }, [isOnline]);

    if (status === 'idle' || dismissed) return null;

    const isOffline = status === 'offline';

    return (
        <div
            className={`
        fixed bottom-0 inset-x-0 z-100 md:bottom-4 md:left-4 md:right-auto md:inset-x-auto
        transition-all duration-400 ease-out
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
            role="status"
            aria-live="polite"
        >
            <div
                className={`
          flex items-center gap-3 px-4 py-3 shadow-xl
          md:rounded-xl md:max-w-sm
          ${isOffline
                    ? 'bg-gray-900 text-white'
                    : 'bg-emerald-600 text-white'
                }
        `}
            >
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOffline ? 'bg-white/10' : 'bg-white/20'}`}>
                    {isOffline ? <WifiOff size={16} /> : <Wifi size={16} />}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight">
                        {isOffline ? "You're offline" : "Back online!"}
                    </p>
                    <p className={`text-xs font-medium leading-tight mt-0.5 ${isOffline ? 'text-gray-400' : 'text-emerald-200'}`}>
                        {isOffline
                            ? 'Some features may be unavailable'
                            : 'Your connection has been restored'}
                    </p>
                </div>

                {/* Dismiss (offline only) */}
                {isOffline && (
                    <button
                        onClick={() => { setVisible(false); setTimeout(() => setDismissed(true), 300); }}
                        className="p-1 text-gray-400 hover:text-white transition-colors shrink-0"
                        aria-label="Dismiss offline notification"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}
