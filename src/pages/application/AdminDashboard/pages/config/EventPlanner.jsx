import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Trash2, ChevronLeft, ChevronRight, Bell, Calendar as CalendarIcon,
    Users, X, Check, Edit2, Info, Plus, Search, MapPin
} from 'lucide-react';
import {
    getAcademicProfile, createEvent, updateEvent, deleteEvent,
    getEventNotificationsConfig, getEvents
} from '../../timetable/timetableAPIs';

// ── Time-grid constants ────────
const HOUR_H = 64; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function fmtHour(h) {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
}

function isSameDay(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function getWeekDays(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
        const dd = new Date(d);
        dd.setDate(d.getDate() + i);
        return dd;
    });
}

function buildMonthDays(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
}

// ── Component ──────────────────
export default function EventPlanner() {
    // Events are page-level data — owned here, fetched directly from the API.
    const [events, setEvents] = useState([]);

    // ── Helpers ──
    const isoToLocalDateTime = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const localDateTimeToIso = (local) => {
        if (!local) return '';
        const d = new Date(local);
        return Number.isNaN(d.getTime()) ? '' : d.toISOString();
    };

    // ── State ──
    const [activeProfile, setActiveProfile] = useState({ currentYear: null, currentTerm: null, isLoading: true });

    // Panel
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [panelMode, setPanelMode] = useState('create');
    const [editingEventId, setEditingEventId] = useState(null);
    const [selectedDateMsg, setSelectedDateMsg] = useState(null);

    // Event form
    const [eventForm, setEventForm] = useState({
        name: '',
        type: 'event',
        time: '',
        notificationsEnabled: false,
        notificationTargets: { roles: [], everyone: false, userIds: [] },
        notificationSchedule: { type: 'immediate', sendAt: '', reminderEnabled: false }
    });

    // ── Calendar state (split: main view vs mini cal) ──
    const [mainDate, setMainDate] = useState(new Date());         // anchor for main view
    const [miniCalMonth, setMiniCalMonth] = useState(() => {      // mini cal browsing month (independent)
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [selectedDate, setSelectedDate] = useState(new Date()); // highlighted date
    const [viewMode, setViewMode] = useState('month');            // 'month' | 'week' | 'day'
    const [animKey, setAnimKey] = useState(0);
    const [animDir, setAnimDir] = useState(null);                 // 'left' | 'right' | null

    const timeGridRef = useRef(null);
    const animTimerRef = useRef(null);

    // ── Computed ──
    const now = new Date();
    const weekDays = getWeekDays(mainDate);
    const mainMonthDays = buildMonthDays(mainDate.getFullYear(), mainDate.getMonth());
    const miniDays = buildMonthDays(miniCalMonth.getFullYear(), miniCalMonth.getMonth());

    // ── Scroll to current time ──
    useEffect(() => {
        if ((viewMode === 'week' || viewMode === 'day') && timeGridRef.current) {
            const scrollTop = now.getHours() * HOUR_H - 120;
            timeGridRef.current.scrollTop = Math.max(0, scrollTop);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode]);

    // ── Data fetch ──
    useEffect(() => {
        fetchProfile();
        fetchAllEvents();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await getAcademicProfile();
            if (res.success && res.data?.school) {
                setActiveProfile({
                    currentYear: res.data.currentAcademicYear || null,
                    currentTerm: res.data.currentTerm || null,
                    isLoading: false
                });
            }
        } catch (e) {
            console.error('Failed to fetch academic profile', e);
            setActiveProfile(prev => ({ ...prev, isLoading: false }));
        }
    };

    const fetchAllEvents = async () => {
        try {
            const res = await getEvents();
            if (res?.success) setEvents(res.data?.events ?? []);
        } catch (e) {
            console.error('[EventPlanner] fetchAllEvents failed:', e);
        }
    };

    // ── Navigation helpers ──
    const triggerAnim = useCallback((dir) => {
        clearTimeout(animTimerRef.current);
        setAnimDir(dir);
        setAnimKey(k => k + 1);
        animTimerRef.current = setTimeout(() => setAnimDir(null), 260);
    }, []);

    // Main calendar — also syncs mini cal month
    const mainNav = useCallback((delta) => {
        setMainDate(prev => {
            let next;
            if (viewMode === 'month') {
                next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
            } else if (viewMode === 'week') {
                next = new Date(prev);
                next.setDate(prev.getDate() + delta * 7);
            } else {
                next = new Date(prev);
                next.setDate(prev.getDate() + delta);
            }
            setMiniCalMonth(new Date(next.getFullYear(), next.getMonth(), 1));
            return next;
        });
        triggerAnim(delta > 0 ? 'left' : 'right');
    }, [viewMode, triggerAnim]);

    const goToToday = () => {
        const today = new Date();
        const dir = today > mainDate ? 'left' : 'right';
        triggerAnim(dir);
        setMainDate(today);
        setSelectedDate(today);
        setMiniCalMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    };

    // Mini cal arrows — ONLY change mini cal, never main view
    const miniPrev = () => setMiniCalMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const miniNext = () => setMiniCalMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    // Mini cal date click — navigate main calendar to that date
    const handleMiniDateClick = (dateObj) => {
        const monthChanging =
            dateObj.getMonth() !== mainDate.getMonth() ||
            dateObj.getFullYear() !== mainDate.getFullYear();

        const dir = +dateObj > +mainDate ? 'left' : 'right';
        setSelectedDate(dateObj);
        setMainDate(dateObj);
        setMiniCalMonth(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
        if (monthChanging) triggerAnim(dir);
    };

    // ── Event CRUD ──
    const openCreatePanel = (dateObj) => {
        setSelectedDateMsg(dateObj.toISOString().split('T')[0]);
        setPanelMode('create');
        setEditingEventId(null);
        setEventForm({
            name: '',
            type: 'event',
            time: '',
            notificationsEnabled: false,
            notificationTargets: { roles: [], everyone: false, userIds: [] },
            notificationSchedule: { type: 'immediate', sendAt: '', reminderEnabled: false }
        });
        setIsPanelOpen(true);
    };

    const fetchEventDataForPanel = async (eventObj, mode) => {
        setSelectedDateMsg(eventObj.date.split('T')[0]);
        setPanelMode(mode);
        setEditingEventId(eventObj.id);

        let notifState = {
            notificationsEnabled: false,
            notificationTargets: { roles: [], everyone: false, userIds: [] },
            notificationSchedule: { type: 'immediate', sendAt: '', reminderEnabled: false }
        };

        if (eventObj.notificationConfigId) {
            const res = await getEventNotificationsConfig(eventObj.id);
            if (res.success && res.data) {
                const schedule = res.data.schedule || {};
                notifState = {
                    notificationsEnabled: true,
                    notificationTargets: {
                        roles: res.data.targets?.roles || [],
                        everyone: res.data.targets?.everyone || false,
                        userIds: res.data.targets?.userIds || []
                    },
                    notificationSchedule: {
                        type: schedule.type || 'immediate',
                        sendAt: schedule.sendAt || '',
                        reminderEnabled: schedule.reminderEnabled || false
                    }
                };
            }
        }
        let eventTime = '';
        if (eventObj.date) {
            const d = new Date(eventObj.date);
            if (!Number.isNaN(d.getTime())) {
                eventTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            }
        }
        setEventForm({ name: eventObj.name, type: eventObj.type || 'event', time: eventTime, ...notifState });
        setIsPanelOpen(true);
    };

    const handleEditEvent = (ev, e) => {
        e.stopPropagation();
        if (new Date(ev.date) < new Date(new Date().toISOString().split('T')[0])) return;
        fetchEventDataForPanel(ev, 'edit');
    };

    const handleViewEvent = (ev) => fetchEventDataForPanel(ev, 'view');

    const handleSaveEvent = async () => {
        if (eventForm.notificationsEnabled) {
            const hasTargets =
                eventForm.notificationTargets.everyone ||
                eventForm.notificationTargets.roles.length > 0 ||
                eventForm.notificationTargets.userIds.length > 0;
            if (!hasTargets) return alert('Please select at least one target audience.');
        }

        let scheduleForPayload = { ...eventForm.notificationSchedule };
        if (eventForm.notificationsEnabled && eventForm.notificationSchedule.type === 'immediate') {
            scheduleForPayload.sendAt = new Date().toISOString();
        } else if (eventForm.notificationsEnabled && eventForm.notificationSchedule.type === 'scheduled' && eventForm.notificationSchedule.sendAt) {
            const s = eventForm.notificationSchedule.sendAt;
            const isIso = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s);
            scheduleForPayload.sendAt = isIso ? s : localDateTimeToIso(s);
        }

        const dateStr = selectedDateMsg.split('T')[0];
        const timeStr = eventForm.time || '00:00';
        const finalIsoDate = new Date(`${dateStr}T${timeStr}:00`).toISOString();

        const payload = {
            termId: activeProfile.currentTerm?.id,
            name: eventForm.name,
            type: eventForm.type,
            date: finalIsoDate,
            notifications: {
                enabled: eventForm.notificationsEnabled,
                targets: eventForm.notificationTargets,
                channels: ['in_app'],
                schedule: scheduleForPayload
            }
        };

        if (panelMode === 'edit') {
            const res = await updateEvent(editingEventId, payload);
            if (res.success) { setIsPanelOpen(false); fetchAllEvents(); }
        } else {
            const res = await createEvent(payload);
            if (res.success) { setIsPanelOpen(false); fetchAllEvents(); }
        }
    };

    const toggleEveryone = () => setEventForm(prev => ({
        ...prev,
        notificationTargets: { ...prev.notificationTargets, everyone: !prev.notificationTargets.everyone, roles: [], userIds: [] }
    }));

    const toggleRole = (role) => setEventForm(prev => {
        const roles = prev.notificationTargets.roles.includes(role)
            ? prev.notificationTargets.roles.filter(r => r !== role)
            : [...prev.notificationTargets.roles, role];
        return { ...prev, notificationTargets: { ...prev.notificationTargets, roles, everyone: false } };
    });

    const handleDeleteEvent = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Delete this event?')) return;
        const res = await deleteEvent(id);
        if (res.success) { setEvents(prev => prev.filter(ev => ev.id !== id)); fetchAllEvents(); }
    };

    const getEventsForDate = (dateObj) => {
        if (!dateObj) return [];
        const dStr = dateObj.toISOString().split('T')[0];
        return events.filter(h => h.date.split('T')[0] === dStr);
    };

    // ── Loading ──
    if (activeProfile.isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] w-full">
                <div className="relative w-10 h-10">
                    <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
                    <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
                </div>
                <p className="mt-4 text-gray-500">Loading Planner Data...</p>
            </div>
        );
    }

    const upcomingEvents = events
        .filter(ev => new Date(ev.date) >= new Date(new Date().toISOString().split('T')[0]))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);

    // ── Header title ──
    const getHeaderTitle = () => {
        if (viewMode === 'month') return mainDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (viewMode === 'day') return mainDate.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const first = weekDays[0];
        const last = weekDays[6];
        if (first.getMonth() === last.getMonth())
            return `${first.toLocaleString('default', { month: 'long' })} ${first.getFullYear()}`;
        return `${first.toLocaleString('default', { month: 'short' })} – ${last.toLocaleString('default', { month: 'short', year: 'numeric' })}`;
    };

    // ── Time-grid renderer (shared by week + day views) ──
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const renderTimeGrid = (days) => (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Sticky day-column headers */}
            <div className="flex shrink-0 border-b border-gray-200 bg-white z-20">
                {/* Gutter above time labels */}
                <div className="w-16 shrink-0 border-r border-gray-100" />
                {days.map((d, i) => {
                    const isToday = isSameDay(d, now);
                    const isSel = isSameDay(d, selectedDate);
                    return (
                        <div
                            key={i}
                            className={`flex-1 flex flex-col items-center py-2 border-l border-gray-100 cursor-pointer select-none
                                ${days.length > 1 ? 'hover:bg-gray-50' : ''}`}
                            onClick={() => {
                                setSelectedDate(d);
                                setMainDate(d);
                                if (days.length > 1) setViewMode('day');
                            }}
                        >
                            <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">
                                {d.toLocaleString('default', { weekday: 'short' })}
                            </span>
                            <span className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold mt-0.5 transition-colors
                                ${isToday ? 'bg-blue-600 text-white' : isSel ? 'bg-blue-100 text-blue-700' : 'text-gray-800'}`}>
                                {d.getDate()}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Scrollable time area */}
            <div className="flex flex-1 overflow-auto" ref={timeGridRef}>
                {/* Hour label column */}
                <div className="w-16 shrink-0 relative border-r border-gray-100">
                    {HOURS.map(h => (
                        <div key={h} style={{ height: HOUR_H }} className="relative">
                            {h > 0 && (
                                <span className="absolute -top-2.5 right-3 text-[10px] text-gray-400 select-none whitespace-nowrap">
                                    {fmtHour(h)}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Day columns */}
                <div className="flex flex-1 relative">
                    {days.map((d, di) => {
                        const isToday = isSameDay(d, now);
                        const dayEvts = getEventsForDate(d);

                        return (
                            <div
                                key={di}
                                className={`flex-1 relative border-l border-gray-100 ${isToday ? 'bg-blue-50/20' : ''}`}
                                onClick={() => openCreatePanel(d)}
                            >
                                {/* Hour grid lines */}
                                {HOURS.map(h => (
                                    <div
                                        key={h}
                                        style={{ height: HOUR_H }}
                                        className={`border-b ${h === 0 ? 'border-transparent' : 'border-gray-100'} hover:bg-blue-50/30 transition-colors`}
                                    />
                                ))}

                                {/* Current time indicator */}
                                {isToday && (
                                    <div
                                        className="absolute left-0 right-0 pointer-events-none z-10"
                                        style={{ top: (nowMinutes / 60) * HOUR_H }}
                                    >
                                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500" />
                                        <div className="h-px bg-red-500 w-full" />
                                    </div>
                                )}

                                {/* Events */}
                                {dayEvts.map(ev => {
                                    const evDate = new Date(ev.date);
                                    const startMin = evDate.getHours() * 60 + evDate.getMinutes();
                                    const top = (startMin / 60) * HOUR_H;
                                    const height = HOUR_H * 0.9;

                                    let bg = 'bg-blue-500 hover:bg-blue-600';
                                    if (ev.type === 'holiday') bg = 'bg-emerald-500 hover:bg-emerald-600';
                                    if (ev.type === 'exam') bg = 'bg-red-500 hover:bg-red-600';

                                    const isPast = evDate < new Date(new Date().toISOString().split('T')[0]);

                                    return (
                                        <div
                                            key={ev.id}
                                            className={`absolute left-1 right-1 ${bg} text-white text-xs rounded-md px-2 py-1 cursor-pointer overflow-hidden z-10 transition shadow-sm ${isPast ? 'opacity-60' : ''}`}
                                            style={{ top, height }}
                                            onClick={(e) => { e.stopPropagation(); handleViewEvent(ev); }}
                                        >
                                            <div className="font-semibold truncate leading-tight">{ev.name}</div>
                                            <div className="text-[10px] opacity-80 mt-0.5">
                                                {evDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const animClass = animDir === 'left' ? 'cal-slide-left' : animDir === 'right' ? 'cal-slide-right' : '';

    // ── Render ──
    return (
        <div className="flex h-full bg-gray-50 border w-full overflow-hidden relative">

            {/* ── Main calendar area ── */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">

                {/* Header */}
                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-200 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={goToToday}
                            className="px-4 py-1.5 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                        >
                            Today
                        </button>
                        <div className="flex items-center">
                            <button onClick={() => mainNav(-1)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={() => mainNav(1)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <h1 className="text-xl font-semibold text-gray-800">{getHeaderTitle()}</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                            <Search size={18} />
                        </button>
                        <div className="flex border border-gray-300 rounded-lg overflow-hidden text-sm">
                            {['month', 'week', 'day'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setViewMode(m)}
                                    className={`px-4 py-1.5 font-medium capitalize transition-colors
                                        ${viewMode === m ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {m.charAt(0).toUpperCase() + m.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Calendar body — keyed to trigger CSS animation */}
                <div key={animKey} className={`flex-1 flex flex-col min-h-0 overflow-hidden ${animClass}`}>

                    {/* ── Month view ── */}
                    {viewMode === 'month' && (
                        <div className="flex-1 flex flex-col min-h-0 overflow-auto p-4">
                            <div className="bg-white rounded-xl border border-gray-200 flex flex-col flex-1 overflow-hidden shadow-sm">
                                {/* Weekday headers */}
                                <div className="grid grid-cols-7 border-b border-gray-200 shrink-0 bg-gray-50">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                        <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{d}</div>
                                    ))}
                                </div>
                                {/* Day cells */}
                                <div className="grid grid-cols-7 flex-1 min-h-[500px]">
                                    {mainMonthDays.map((dateObj, idx) => {
                                        if (!dateObj) return <div key={idx} className="border-r border-b border-gray-100 bg-gray-50/30" />;
                                        const isToday = isSameDay(dateObj, now);
                                        const isSel = isSameDay(dateObj, selectedDate);
                                        const events = getEventsForDate(dateObj);
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => { setSelectedDate(dateObj); openCreatePanel(dateObj); }}
                                                className={`border-r border-b border-gray-100 p-2 hover:bg-blue-50/30 cursor-pointer transition-colors flex flex-col group min-h-[100px]
                                                    ${isToday ? 'bg-blue-50/20' : ''}`}
                                            >
                                                <span className={`text-sm font-semibold mb-1.5 w-7 h-7 flex items-center justify-center rounded-full transition-colors
                                                    ${isToday ? 'bg-blue-600 text-white' : isSel ? 'bg-blue-100 text-blue-700' : 'text-gray-500 group-hover:text-gray-900'}`}>
                                                    {dateObj.getDate()}
                                                </span>
                                                <div className="space-y-1 overflow-y-auto max-h-[90px] scrollbar-hide pr-0.5">
                                                    {events.map(ev => {
                                                        let colors = 'bg-blue-50 text-blue-700 border-blue-200';
                                                        let iconColor = 'text-blue-400 hover:text-blue-700';
                                                        if (ev.type === 'holiday') { colors = 'bg-emerald-50 text-emerald-700 border-emerald-200'; iconColor = 'text-emerald-400 hover:text-emerald-700'; }
                                                        if (ev.type === 'exam') { colors = 'bg-red-50 text-red-700 border-red-200'; iconColor = 'text-red-400 hover:text-red-700'; }
                                                        const isPast = new Date(ev.date) < new Date(new Date().toISOString().split('T')[0]);
                                                        return (
                                                            <div key={ev.id} className={`text-xs px-1.5 py-0.5 rounded border flex items-center justify-between font-medium ${colors} ${isPast ? 'opacity-60' : ''}`}>
                                                                <span className="truncate cursor-pointer flex-1 mr-1" onClick={e => { e.stopPropagation(); handleViewEvent(ev); }}>
                                                                    {new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {ev.name}
                                                                </span>
                                                                <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {!isPast && <button onClick={e => handleEditEvent(ev, e)} className={`p-0.5 rounded ${iconColor}`}><Edit2 size={11} /></button>}
                                                                    <button onClick={e => handleDeleteEvent(ev.id, e)} className={`p-0.5 rounded ${iconColor}`}><Trash2 size={11} /></button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {viewMode === 'week' && renderTimeGrid(weekDays)}
                    {viewMode === 'day'  && renderTimeGrid([mainDate])}
                </div>
            </div>

            {/* ── Right sidebar ────── */}
            <div className={`transition-all duration-300 w-[288px] shrink-0 ${isPanelOpen ? 'mr-[400px]' : ''} border-l border-gray-200 bg-white p-5 flex flex-col gap-5 overflow-y-auto z-10`}>

                {/* Brand + Create button */}
                <div>
                    <div className="flex items-center gap-3 mb-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Event Planner</h2>
                            <p className="text-[11px] text-gray-500">Host and invite others</p>
                        </div>
                    </div>
                    <button
                        onClick={() => openCreatePanel(selectedDate)}
                        className="w-full bg-[#0B62A4] hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
                    >
                        <Plus size={16} /> Create Event
                    </button>
                </div>

                {/* ── Mini Calendar ── */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 text-xs">
                            {miniCalMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h3>
                        {/* These arrows ONLY navigate the mini calendar, never the main view */}
                        <div className="flex gap-0.5">
                            <button
                                onClick={miniPrev}
                                className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors"
                                title="Previous month (mini calendar only)"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                onClick={miniNext}
                                className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors"
                                title="Next month (mini calendar only)"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Day-of-week labels */}
                    <div className="grid grid-cols-7 mb-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={i} className="text-center text-[9px] font-semibold text-gray-400 py-0.5">{d}</div>
                        ))}
                    </div>

                    {/* Date cells */}
                    <div className="grid grid-cols-7">
                        {miniDays.map((dateObj, idx) => {
                            if (!dateObj) return <div key={`e-${idx}`} className="h-7" />;
                            const isToday   = isSameDay(dateObj, now);
                            const isSel     = isSameDay(dateObj, selectedDate);
                            const inMainMth = dateObj.getMonth() === mainDate.getMonth() && dateObj.getFullYear() === mainDate.getFullYear();
                            const hasEvts   = getEventsForDate(dateObj).length > 0;

                            return (
                                <div key={idx} className="flex justify-center relative py-0.5">
                                    <button
                                        onClick={() => handleMiniDateClick(dateObj)}
                                        className={`w-7 h-7 flex items-center justify-center rounded-full text-[11px] transition-colors
                                            ${isToday
                                                ? 'bg-blue-600 text-white font-bold'
                                                : isSel
                                                    ? 'bg-blue-100 text-blue-700 font-semibold'
                                                    : inMainMth
                                                        ? 'text-gray-700 hover:bg-gray-200'
                                                        : 'text-gray-400 hover:bg-gray-100'
                                            }`}
                                    >
                                        {dateObj.getDate()}
                                    </button>
                                    {hasEvts && !isToday && (
                                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Categories */}
                <div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-xs uppercase tracking-wider text-gray-500">Categories</h3>
                    <ul className="space-y-1.5">
                        <li className="flex items-center gap-2 text-sm text-gray-600"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> Event</li>
                        <li className="flex items-center gap-2 text-sm text-gray-600"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Holiday</li>
                        <li className="flex items-center gap-2 text-sm text-gray-600"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> Exam</li>
                    </ul>
                </div>

                {/* Upcoming Events */}
                <div className="flex-1 min-h-0 flex flex-col">
                    <h3 className="font-semibold text-gray-900 text-sm">Upcoming Events</h3>
                    <p className="text-[11px] text-gray-400 mb-3">Don't miss scheduled events</p>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-hide">
                        {upcomingEvents.map(ev => {
                            let dot = 'bg-blue-500';
                            let timeColor = 'text-blue-600';
                            if (ev.type === 'holiday') { dot = 'bg-emerald-500'; timeColor = 'text-emerald-600'; }
                            if (ev.type === 'exam')    { dot = 'bg-red-500';     timeColor = 'text-red-600'; }
                            const evDate = new Date(ev.date);
                            return (
                                <div
                                    key={ev.id}
                                    className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex gap-3 hover:border-gray-300 cursor-pointer transition-colors"
                                    onClick={() => handleViewEvent(ev)}
                                >
                                    <div className={`w-1 rounded-full shrink-0 ${dot}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className={`text-[11px] font-semibold ${timeColor}`}>
                                                {evDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="text-[10px] text-gray-500">{evDate.toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                        <h4 className="text-sm font-semibold text-gray-900 truncate">{ev.name}</h4>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                                            <MapPin size={11} className="text-gray-400 shrink-0" />
                                            <span className="truncate">School Campus</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {upcomingEvents.length === 0 && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                                <p className="text-sm text-gray-500">No upcoming events.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Slide-in event panel  */}
            <div className={`fixed top-0 right-0 h-full w-[400px] bg-white border-l border-gray-200 shadow-xl transition-transform duration-300 z-50 ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {isPanelOpen && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {panelMode === 'create' ? 'Add Event' : panelMode === 'edit' ? 'Edit Event' : 'Event Details'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 font-medium">
                                    {selectedDateMsg && new Date(selectedDateMsg + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            <button onClick={() => setIsPanelOpen(false)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                            <section className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Event Title</label>
                                    <input
                                        disabled={panelMode === 'view'}
                                        type="text"
                                        value={eventForm.name}
                                        onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                                        placeholder="e.g. Midterm Break"
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors disabled:opacity-70 disabled:bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Event Category</label>
                                    <select
                                        disabled={panelMode === 'view'}
                                        value={eventForm.type}
                                        onChange={e => setEventForm({ ...eventForm, type: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors disabled:opacity-70 disabled:bg-gray-50"
                                    >
                                        <option value="holiday">Holiday / School Break</option>
                                        <option value="exam">Examination Period</option>
                                        <option value="event">Special School Event</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Event Time</label>
                                    <input
                                        disabled={panelMode === 'view'}
                                        type="time"
                                        value={eventForm.time}
                                        onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors disabled:opacity-70 disabled:bg-gray-50"
                                    />
                                </div>
                            </section>

                            <hr className="border-gray-200" />

                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-900">Dashboard Notification</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">Alert users via their portal</p>
                                        </div>
                                    </div>
                                    <button
                                        disabled={panelMode === 'view'}
                                        onClick={() => setEventForm(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${eventForm.notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'} disabled:opacity-50`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow ${eventForm.notificationsEnabled ? 'left-5' : 'left-1'}`} />
                                    </button>
                                </div>

                                {eventForm.notificationsEnabled && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-600 block">Select Target Audience</label>
                                            <button
                                                disabled={panelMode === 'view'}
                                                onClick={toggleEveryone}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${eventForm.notificationTargets.everyone ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                            >
                                                <div className="flex items-center gap-2">

                                                    <span className={`text-sm font-medium ${eventForm.notificationTargets.everyone ? 'text-blue-700' : 'text-gray-700'}`}>System-wide (Everyone)</span>
                                                </div>
                                                {eventForm.notificationTargets.everyone && <Check size={16} className="text-blue-600" />}
                                            </button>
                                            {!eventForm.notificationTargets.everyone && (
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    {['Parents', 'Teachers', 'Admins'].map(role => {
                                                        const v = role.toLowerCase();
                                                        const active = eventForm.notificationTargets.roles.includes(v);
                                                        return (
                                                            <button
                                                                key={role}
                                                                disabled={panelMode === 'view'}
                                                                onClick={() => toggleRole(v)}
                                                                className={`flex items-center justify-center p-2 rounded-lg border text-sm font-medium transition-colors ${active ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600'}`}
                                                            >
                                                                {role}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mt-2">
                                                {/*<Info size={13} className="text-amber-600 shrink-0 mt-0.5" />*/}
                                                <p className="text-xs text-amber-800 leading-relaxed">
                                                    Notifications will be delivered directly to users' dashboard feeds.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold text-gray-600 block">Delivery Schedule</label>
                                            <div className="flex gap-2">
                                                {['immediate', 'scheduled'].map(t => (
                                                    <button
                                                        key={t}
                                                        disabled={panelMode === 'view'}
                                                        onClick={() => setEventForm(prev => ({ ...prev, notificationSchedule: { ...prev.notificationSchedule, type: t } }))}
                                                        className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${eventForm.notificationSchedule.type === t ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                            {eventForm.notificationSchedule.type === 'scheduled' && (
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-gray-500">Select Date & Time</label>
                                                    <input
                                                        disabled={panelMode === 'view'}
                                                        type="datetime-local"
                                                        value={isoToLocalDateTime(eventForm.notificationSchedule.sendAt)}
                                                        onChange={e => setEventForm(prev => ({ ...prev, notificationSchedule: { ...prev.notificationSchedule, sendAt: localDateTimeToIso(e.target.value) } }))}
                                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
                            {panelMode === 'view' ? (
                                <button onClick={() => setIsPanelOpen(false)} className="w-full py-2 bg-gray-900 text-white font-semibold rounded-lg hover:bg-black transition-colors">Close Panel</button>
                            ) : (
                                <>
                                    <button onClick={() => setIsPanelOpen(false)} className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                                    <button onClick={handleSaveEvent} className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                                        {panelMode === 'create' ? 'Create Event' : 'Save Changes'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
