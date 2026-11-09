import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, CheckCheck, ClipboardCheck, CheckCircle2,
    User, Moon, Sun, LogOut, Settings2, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../../../../contexts/AuthContext.jsx';
import { getTheme, toggleTheme } from '../../../../../utils/theme.js';
import useSetupProgress from '../../hooks/useSetupProgress.js';
import { ROUTES } from '../../navigation/navConfig.js';
import { Avatar } from '../../../../../components/patterns';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../../../../components/ui/alert-dialog';

/* ─── Shared popover behaviour ─ */
function usePopover() {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);
    return { open, setOpen, ref };
}

const Panel = ({ children, width = 'w-80' }) => (
    <div className={`absolute right-0 mt-2 ${width} bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150`}>
        {children}
    </div>
);

const PanelHeader = ({ title, sub, action }) => (
    <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100">
        <div>
            <p className="text-xs font-bold text-gray-900">{title}</p>
            {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {action}
    </div>
);

/* ─── Notification bell ──────── */
export function NotificationBell() {
    const { open, setOpen, ref } = usePopover();
    // Notification feed wiring lands with the platform notification engine;
    // until then the bell renders an honest all-caught-up state — never fake items.
    const notifications = [];
    const unread = notifications.filter(n => !n.read).length;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Notifications"
            >
                <Bell size={17} />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                        {unread}
                    </span>
                )}
            </button>

            {open && (
                <Panel>
                    <PanelHeader
                        title="Notifications"
                        sub="Alerts from across your school"
                        action={unread > 0 && (
                            <button className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                                <CheckCheck size={12} /> Mark all read
                            </button>
                        )}
                    />
                    {notifications.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                            <div className="mx-auto w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-3">
                                <CheckCheck size={18} className="text-green-500" />
                            </div>
                            <p className="text-sm font-semibold text-gray-700">You're all caught up</p>
                            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                                Attendance, payment, and results alerts will land here as those modules go live.
                            </p>
                        </div>
                    ) : (
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                            {/* notification rows render here once the feed is wired */}
                        </div>
                    )}
                </Panel>
            )}
        </div>
    );
}

/* ─── Approvals chip — navigates to the Approvals destination ──────────────── */
export function ApprovalsChip() {
    const navigate = useNavigate();
    // Approval queues (results sign-off, fee waivers, excuse notes) drive this
    // count as their workflows ship. Count is real — currently nothing routes here.
    const count = 0;

    return (
        <button
            onClick={() => navigate(ROUTES.approvals)}
            className={`hidden md:flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-semibold transition-colors ${
                count > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}
            title="Items awaiting your approval"
        >
            <ClipboardCheck size={13} className={count > 0 ? 'text-amber-500' : 'text-gray-400'} />
            Approvals
            {count > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {count}
                </span>
            )}
        </button>
    );
}

/* ─── Setup progress chip — links to the Setup Checklist page ──────────────────
 * Shows "Setup X%" while incomplete. After go-live it stays for a 7-day window
 * as a subtle "Setup ✓" link, then disappears. Existing fully-set-up schools
 * that never ran onboarding see nothing.
 */
export function SetupProgressChip() {
    const navigate = useNavigate();
    const { loading, percent, complete, withinGoLiveWindow } = useSetupProgress();

    if (loading) return null;

    if (complete) {
        if (!withinGoLiveWindow) return null;
        return (
            <button
                onClick={() => navigate(ROUTES.setup)}
                className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-full bg-green-50 border border-green-200 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
                title="Your school is set up — revisit the checklist"
            >
                <CheckCircle2 size={13} className="text-green-500" />
                Setup complete
            </button>
        );
    }

    return (
        <button
            onClick={() => navigate(ROUTES.setup)}
            className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
            title="Finish setting up your school"
        >
            <Sparkles size={13} className="text-blue-500" />
            Setup {percent}%
            <span className="w-14 h-1.5 rounded-full bg-blue-100 overflow-hidden">
                <span className="block h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
            </span>
        </button>
    );
}

/* ─── Profile menu ───────────── */
export function ProfileMenu() {
    const { open, setOpen, ref } = usePopover();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
    const [confirmLogout, setConfirmLogout] = useState(false);

    const name = user?.fullName || user?.name || 'Administrator';

    const handleTheme = () => {
        toggleTheme();
        setIsDark(getTheme() === 'dark');
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className="rounded-full hover:ring-4 hover:ring-blue-100 transition-all"
                title={name}
            >
                <Avatar name={name} src={user?.profileImage} size={32} />
            </button>

            {open && (
                <Panel width="w-64">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                        <Avatar name={name} src={user?.profileImage} size={40} />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
                            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <div className="py-1.5">
                        <button
                            onClick={() => { setOpen(false); navigate(ROUTES.adminProfile); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <User size={15} className="text-gray-400" /> My profile
                        </button>
                        <button
                            onClick={() => { setOpen(false); navigate(ROUTES.settings); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Settings2 size={15} className="text-gray-400" /> Preferences
                        </button>
                        <button
                            onClick={handleTheme}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            {isDark ? <Sun size={15} className="text-gray-400" /> : <Moon size={15} className="text-gray-400" />}
                            {isDark ? 'Light theme' : 'Dark theme'}
                        </button>
                    </div>
                    <div className="py-1.5 border-t border-gray-100">
                        <button
                            onClick={() => { setOpen(false); setConfirmLogout(true); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut size={15} /> Logout
                        </button>
                    </div>
                </Panel>
            )}

            <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm logout</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to log out of EduConnect?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600" onClick={() => logout()}>Logout</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
