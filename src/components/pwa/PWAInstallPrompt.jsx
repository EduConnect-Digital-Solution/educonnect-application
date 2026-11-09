/**
 * PWAInstallPrompt
 *
 * A small, non-blocking card offered after the user has been working in the app for a
 * while (see PWAContext). It never dims or covers the page, and "Not now" silences it
 * for a week.
 * - Android/Desktop Chrome: one-tap native install
 * - iOS: short manual instructions
 * - Other browsers: short hint to use the browser menu
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, MoreVertical } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { usePWAContext } from '../../contexts/PWAContext.jsx';

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

export function PWAInstallPrompt() {
    const { isAuthenticated } = useAuth();
    const { showInstallPrompt, handleInstall, handleDismiss, canInstall, isInstalled } = usePWAContext();

    if (!isAuthenticated || isInstalled) {
        return null;
    }

    return (
        <AnimatePresence>
            {showInstallPrompt && (
                <motion.aside
                    role="complementary"
                    aria-label="Install EduConnect"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                    className="fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:w-[22rem] bg-white border border-gray-200 rounded-2xl shadow-xl p-4"
                >
                    <button
                        type="button"
                        onClick={handleDismiss}
                        aria-label="Dismiss install prompt"
                        className="absolute top-2.5 right-2.5 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>

                    <h2 className="pr-7 text-[15px] font-bold text-gray-900 leading-tight">Install EduConnect</h2>
                    <p className="mt-1 text-[13px] text-gray-500 leading-snug">
                        Open it straight from your home screen, with faster loading and offline support.
                    </p>

                    {isIOS ? (
                        <p className="mt-3 text-xs text-gray-600 leading-relaxed">
                            Tap Share <Share className="w-3 h-3 inline mx-0.5" /> in your browser, then choose{' '}
                            <strong>Add to Home Screen</strong>.
                        </p>
                    ) : canInstall ? (
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleInstall}
                                className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-[#104889] hover:bg-[#0d3a70] text-white text-sm font-semibold"
                            >
                                <Download className="w-4 h-4" /> Install
                            </button>
                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="h-9 px-3 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                            >
                                Not now
                            </button>
                        </div>
                    ) : (
                        <p className="mt-3 text-xs text-gray-600 leading-relaxed">
                            Open your browser menu <MoreVertical className="w-3 h-3 inline mx-0.5" /> and choose{' '}
                            <strong>Install app</strong> or <strong>Add to Home Screen</strong>.
                        </p>
                    )}

                    {(isIOS || !canInstall) && (
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="mt-2 text-xs font-medium text-gray-400 hover:text-gray-700"
                        >
                            Not now
                        </button>
                    )}
                </motion.aside>
            )}
        </AnimatePresence>
    );
}
