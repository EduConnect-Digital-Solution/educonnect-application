/**
 * PWAInstallPrompt
 *
 * Shown post-login only. Custom install UI that matches EduConnect's design.
 * Uses PWAContext for state management and install logic.
 * - Desktop: elegant modal with feature highlights
 * - Mobile: bottom sheet style
 * - iOS: manual instructions fallback
 * - Android: native install
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {Download, X, Smartphone, Share, Zap, Wifi, Shield, MoreVertical} from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { usePWAContext } from '../../contexts/PWAContext.jsx';

// Detect OS - simple checks
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = /android/i.test(navigator.userAgent);

export function PWAInstallPrompt() {
    const { isAuthenticated } = useAuth();
    const { showInstallPrompt, handleInstall, handleDismiss, canInstall, isInstalled } = usePWAContext();

    if (!isAuthenticated || isInstalled) {
        return null;
    }

    const features = [
        { icon: Zap,    text: 'Instant load times', sub: 'No more waiting for pages' },
        { icon: Wifi,   text: 'Works offline',      sub: 'Access data even without internet' },
        { icon: Shield, text: 'Secure & private',   sub: 'Your data stays protected' },
    ];

    return (
        <AnimatePresence>
            {showInstallPrompt && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/10 backdrop-blur-xs z-50"
                        onClick={handleDismiss}
                    />

                    {/* Prompt Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`fixed inset-0 z-200 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300`}
                    >
                        <div className={`relative w-full max-w-md mx-4 mb-0 md:mb-4 bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ease-out`}>

                            {/* Close button */}
                            <button
                                onClick={handleDismiss}
                                className="absolute top-4 z-50 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer rounded-full transition-colors"
                                aria-label="Dismiss install prompt"
                            >
                                <X size={18} />
                            </button>

                            <div className="relative p-6 pb-5">
                                {/* Title */}
                                <div className=" pt-5 pb-4 flex items-center gap-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 leading-tight">Install EduConnect</h2>
                                        <p className="text-sm text-gray-500 font-medium">Fast access, anywhere</p>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-sm text-gray-600 font-medium mb-5 leading-relaxed">
                                    Add EduConnect to your home screen for instant access to your school dashboard,
                                    offline support, and a full-screen experience.
                                </p>

                                {/* Benefits */}
                                <div className="space-y-3 mb-6">
                                    <div className="space-y-3 mb-6">
                                        {features.map(({ icon: Icon, text, sub }) => (
                                            <div key={text} className="flex items-center gap-3.5 p-3 bg-blue-50  rounded-xl border border-blue-100/50">
                                                <div className="w-8 h-8 rounded-lg bg-[#104889]/10 flex items-center justify-center shrink-0">
                                                    <Icon size={15} className="text-[#104889]" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{text}</p>
                                                    <p className="text-xs text-gray-500">{sub}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* iOS Instructions */}
                                {isIOS ? (
                                    <div className="bg-[#104889]/10 rounded-xl p-4 mb-4">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <Share className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium mb-1">Install on iOS</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Tap the Share button <Share className="w-3 h-3 inline mx-0.5" /> in your browser, then select "Add to Home Screen"
                                                </p>
                                            </div>
                                        </div>


                                    </div>
                                ) : canInstall ? (
                                    /* Android/Desktop Install Button */
                                    <Button
                                        onClick={handleInstall}
                                        className="w-full rounded-xl cursor-pointer z-50 h-12 text-base font-medium shadow-lg shadow-primary/20 bg-primary/90 hover:bg-primary"
                                    >
                                        <Download className="w-5 h-5 mr-2" />
                                        Install App
                                    </Button>
                                ) : (
                                    /* Fallback for browsers that don't support programmatic install */
                                    <div className="bg-[#104889]/10 rounded-xl p-4 mb-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <MoreVertical className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium mb-1">Install App</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Open your browser menu (⋮) and select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Dismiss link */}
                                <button
                                    onClick={handleDismiss}
                                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors mt-4"
                                >
                                    Maybe later
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}