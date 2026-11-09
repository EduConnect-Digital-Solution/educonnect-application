import React, { useState, useEffect, useCallback } from 'react';
import { Search, Menu } from 'lucide-react';
import CommandPalette from './CommandPalette.jsx';
import ScopePill, { ReadOnlyScopeBanner } from './ScopePill.jsx';
import { NotificationBell, ApprovalsChip, SetupProgressChip, ProfileMenu } from './TopbarMenus.jsx';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Topbar — the persistent global layer across all Admin pages:
 * search (⌘K), academic scope, setup progress, approvals, notifications, profile.
 */
export default function Topbar({ onOpenMobileNav }) {
    const [paletteOpen, setPaletteOpen] = useState(false);

    const openPalette = useCallback(() => setPaletteOpen(true), []);

    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen(o => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <>
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
                <div className="flex items-center gap-3 h-14 px-4 lg:px-6">
                    {/* Mobile nav trigger */}
                    <button
                        onClick={onOpenMobileNav}
                        className="lg:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <Menu size={18} />
                    </button>

                    {/* Global search trigger */}
                    <button
                        onClick={openPalette}
                        className="group flex items-center gap-2.5 h-9 flex-1 max-w-sm px-3 rounded-lg bg-gray-50 border border-gray-200 text-left hover:border-gray-300 hover:bg-gray-100/70 transition-colors"
                    >
                        <Search size={15} className="text-gray-400 shrink-0" />
                        <span className="flex-1 text-[13px] text-gray-400 font-medium truncate">
                            Search students, invoices, pages…
                        </span>
                        <kbd className="hidden md:flex items-center gap-0.5 text-[10px] font-semibold text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5 shrink-0">
                            {isMac ? '⌘' : 'Ctrl'} K
                        </kbd>
                    </button>

                    <div className="flex-1" />

                    {/* Right cluster */}
                    <div className="flex items-center gap-2">
                        <SetupProgressChip />
                        <ScopePill />
                        <ApprovalsChip />
                        <NotificationBell />
                        <div className="w-px h-6 bg-gray-200 mx-0.5 hidden sm:block" />
                        <ProfileMenu />
                    </div>
                </div>
            </header>

            <ReadOnlyScopeBanner />

            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </>
    );
}
