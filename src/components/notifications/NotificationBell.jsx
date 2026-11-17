import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { default as Loader2 } from '@/components/brand/LoaderIcon.jsx';
import { formatSchoolDateTime } from '../../utils/schoolLocale.js';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from './notificationsAPI.js';

const REFRESH_MS = 2 * 60 * 1000;

/** The signed-in person's notifications (admin, teacher or parent), in a bell with a dropdown. */
export default function NotificationBell() {
    const navigate = useNavigate();
    const ref = useRef(null);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listNotifications({ limit: 10 });
            setItems(data.notifications);
            setUnread(data.unreadCount);
            setError(null);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load once, then now and then while the tab is in view
    useEffect(() => {
        load();
        const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, REFRESH_MS);
        return () => clearInterval(timer);
    }, [load]);

    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const toggle = () => {
        setOpen((o) => !o);
        if (!open) load();
    };

    const openItem = async (item) => {
        if (!item.isRead) {
            setItems((list) => list.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
            setUnread((n) => Math.max(n - 1, 0));
            markNotificationRead(item.id).catch(() => load());
        }
        if (item.link) {
            setOpen(false);
            navigate(item.link);
        }
    };

    const markAll = async () => {
        const before = { items, unread };
        setItems((list) => list.map((n) => ({ ...n, isRead: true })));
        setUnread(0);
        try {
            await markAllNotificationsRead();
        } catch (e) {
            setItems(before.items);
            setUnread(before.unread);
            setError(e.message);
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={toggle}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                aria-expanded={open}
                className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
                <Bell size={17} />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                    <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100">
                        <div>
                            <p className="text-xs font-bold text-gray-900">Notifications</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{unread > 0 ? `${unread} unread` : 'All read'}</p>
                        </div>
                        {unread > 0 && (
                            <button type="button" onClick={markAll} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                                <CheckCheck size={12} /> Mark all read
                            </button>
                        )}
                    </div>

                    {error && (
                        <p role="alert" className="px-4 py-3 text-[12px] text-red-600 border-b border-gray-100">
                            {error}{' '}
                            <button type="button" onClick={load} className="font-semibold underline">Try again</button>
                        </p>
                    )}

                    {loading && items.length === 0 ? (
                        <p role="status" className="flex items-center justify-center gap-2 px-4 py-8 text-[12px] text-gray-400">
                            <Loader2 size={13} className="animate-spin" /> Loading…
                        </p>
                    ) : items.length === 0 && !error ? (
                        <div className="px-4 py-10 text-center">
                            <div className="mx-auto w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-3">
                                <CheckCheck size={18} className="text-green-500" />
                            </div>
                            <p className="text-sm font-semibold text-gray-700">You're all caught up</p>
                        </div>
                    ) : (
                        <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                            {items.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => openItem(item)}
                                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${item.isRead ? '' : 'bg-blue-50/40'}`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {!item.isRead && <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />}
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-semibold text-gray-800">{item.title}</p>
                                                {item.body && <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-3 whitespace-pre-line">{item.body}</p>}
                                                <p className="text-[10px] text-gray-400 mt-1">{formatSchoolDateTime(item.createdAt)}</p>
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
