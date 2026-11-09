import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    Search, CornerDownLeft, GraduationCap, Users, BookOpen, Layers,
    ReceiptText, Compass, Settings, Clock, Loader2, UserCircle2,
} from 'lucide-react';
import { PAGE_INDEX, ROUTES } from '../../navigation/navConfig.js';
import { getAllStudents, getAllParents, getDashboardUsers } from '../../../../auth/authAPIs.js';
import { getSchoolClasses } from '../../services/classAPIs.js';
import { getSchoolSubjects } from '../../services/subjectAPIs.js';
import { getInvoices } from '../../services/feeAPIs.js';

const RECENTS_KEY = 'educonnect-cmdk-recents';
const MAX_RECENTS = 8;
const GROUP_LIMIT = 5;

const GROUP_ORDER = ['Recent', 'Navigation', 'Settings', 'Students', 'Guardians', 'Staff', 'Classes', 'Subjects', 'Invoices'];

const GROUP_ICONS = {
    Recent:     Clock,
    Navigation: Compass,
    Settings:   Settings,
    Students:   GraduationCap,
    Guardians:  Users,
    Staff:      UserCircle2,
    Classes:    Layers,
    Subjects:   BookOpen,
    Invoices:   ReceiptText,
};

function loadRecents() {
    try { return JSON.parse(localStorage.getItem(RECENTS_KEY)) ?? []; } catch { return []; }
}
function pushRecent(item) {
    const recents = loadRecents().filter(r => r.route !== item.route || r.label !== item.label);
    recents.unshift({ label: item.label, sub: item.sub, route: item.route, group: item.group });
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
}

/** Module-level cache so the directory loads once per session, not per palette-open. */
let directoryCache = null;
let directoryPromise = null;

async function loadDirectory() {
    if (directoryCache) return directoryCache;
    if (directoryPromise) return directoryPromise;

    directoryPromise = (async () => {
        const [studentsRes, parentsRes, staffRes, classesRes, subjectsRes, invoicesRes] =
            await Promise.allSettled([
                getAllStudents(),
                getAllParents(),
                getDashboardUsers('teacher'),
                getSchoolClasses(),
                getSchoolSubjects(),
                getInvoices(),
            ]);

        const val = (r) => (r.status === 'fulfilled' ? r.value : null);
        const entries = [];

        const students = val(studentsRes)?.data?.students ?? [];
        students.forEach(s => entries.push({
            group: 'Students',
            label: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.fullName || s.name || 'Student',
            sub: s.email || null,
            route: ROUTES.students,
            keywords: s.email || '',
        }));

        const parents = val(parentsRes)?.data?.parents ?? val(parentsRes)?.data?.users ?? [];
        parents.forEach(p => entries.push({
            group: 'Guardians',
            label: [p.firstName, p.lastName].filter(Boolean).join(' ') || p.fullName || p.name || p.email || 'Guardian',
            sub: p.email || null,
            route: ROUTES.guardians,
            keywords: p.email || '',
        }));

        const staff = val(staffRes)?.data?.users ?? [];
        staff.forEach(t => entries.push({
            group: 'Staff',
            label: [t.firstName, t.lastName].filter(Boolean).join(' ') || t.fullName || t.name || t.email || 'Staff',
            sub: t.email || null,
            route: ROUTES.staff,
            keywords: t.email || '',
        }));

        const classes = val(classesRes)?.data?.classes ?? [];
        classes.forEach(c => entries.push({
            group: 'Classes',
            label: c.name,
            sub: c.description || null,
            route: ROUTES.classes,
            keywords: '',
        }));

        const subjects = val(subjectsRes)?.data?.subjects ?? [];
        subjects.forEach(s => entries.push({
            group: 'Subjects',
            label: s.name,
            sub: s.code || null,
            route: ROUTES.subjects,
            keywords: s.code || '',
        }));

        const invoices = val(invoicesRes)?.data?.invoices ?? [];
        invoices.forEach(inv => entries.push({
            group: 'Invoices',
            label: inv.invoiceNumber || inv.reference || `Invoice`,
            sub: inv.studentName || inv.className || null,
            route: ROUTES.invoices,
            keywords: `${inv.studentName ?? ''} ${inv.className ?? ''}`,
        }));

        directoryCache = entries;
        directoryPromise = null;
        return entries;
    })();

    return directoryPromise;
}

const STATIC_INDEX = PAGE_INDEX.map(p => ({
    group: p.group,
    label: p.label,
    sub: null,
    route: p.route,
    keywords: p.keywords,
}));

export default function CommandPalette({ open, onClose }) {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [directory, setDirectory] = useState(directoryCache);
    const [dirLoading, setDirLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Load the dynamic directory the first time the palette opens
    useEffect(() => {
        if (!open || directory) return;
        let alive = true;
        setDirLoading(true);
        loadDirectory()
            .then(entries => { if (alive) setDirectory(entries); })
            .catch(() => {})
            .finally(() => { if (alive) setDirLoading(false); });
        return () => { alive = false; };
    }, [open, directory]);

    // Reset + focus on open
    useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [open]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();

        if (!q) {
            const recents = loadRecents();
            const base = recents.length
                ? [{ group: 'Recent', items: recents }]
                : [];
            return [
                ...base,
                { group: 'Navigation', items: STATIC_INDEX.filter(e => e.group === 'Navigation').slice(0, 7) },
                { group: 'Settings',   items: STATIC_INDEX.filter(e => e.group === 'Settings').slice(0, 3) },
            ];
        }

        const all = [...STATIC_INDEX, ...(directory ?? [])];
        const matches = all.filter(e =>
            e.label.toLowerCase().includes(q) ||
            (e.keywords && e.keywords.toLowerCase().includes(q)) ||
            (e.sub && e.sub.toLowerCase().includes(q))
        );

        const grouped = [];
        for (const groupName of GROUP_ORDER) {
            const items = matches.filter(m => m.group === groupName).slice(0, GROUP_LIMIT);
            if (items.length) grouped.push({ group: groupName, items });
        }
        return grouped;
    }, [query, directory]);

    const flat = useMemo(() => results.flatMap(g => g.items), [results]);

    useEffect(() => { setActiveIndex(0); }, [query]);

    const select = useCallback((item) => {
        if (!item) return;
        pushRecent(item);
        onClose();
        navigate(item.route);
    }, [navigate, onClose]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, flat.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            select(flat[activeIndex]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    // Keep the active row visible
    useEffect(() => {
        const el = listRef.current?.querySelector('[data-active="true"]');
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    if (!open) return null;

    let runningIndex = -1;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-[2px]" onClick={onClose} />

            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Input row */}
                <div className="flex items-center gap-3 px-4 border-b border-gray-100">
                    <Search className="w-4.5 h-4.5 text-gray-400 shrink-0" size={18} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search students, guardians, staff, invoices, pages…"
                        className="flex-1 py-4 text-[15px] text-gray-900 placeholder-gray-400 bg-transparent outline-none"
                    />
                    {dirLoading && <Loader2 size={15} className="text-gray-300 animate-spin shrink-0" />}
                    <kbd className="hidden sm:block text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">ESC</kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
                    {flat.length === 0 && (
                        <div className="px-4 py-10 text-center">
                            <p className="text-sm font-medium text-gray-500">No results for “{query}”</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {dirLoading ? 'Still indexing your school directory…' : 'Try a student, guardian, staff name, invoice, or page.'}
                            </p>
                        </div>
                    )}

                    {results.map(group => {
                        const GroupIcon = GROUP_ICONS[group.group] ?? Compass;
                        return (
                            <div key={group.group} className="mb-1">
                                <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    {group.group}
                                </p>
                                {group.items.map(item => {
                                    runningIndex += 1;
                                    const idx = runningIndex;
                                    const active = idx === activeIndex;
                                    return (
                                        <button
                                            key={`${group.group}-${item.label}-${idx}`}
                                            data-active={active}
                                            onClick={() => select(item)}
                                            onMouseMove={() => setActiveIndex(idx)}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                                active ? 'bg-blue-50' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className={`p-1.5 rounded-lg shrink-0 ${active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <GroupIcon size={14} />
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className={`block text-sm truncate ${active ? 'text-blue-900 font-semibold' : 'text-gray-800 font-medium'}`}>
                                                    {item.label}
                                                </span>
                                                {item.sub && (
                                                    <span className="block text-xs text-gray-400 truncate">{item.sub}</span>
                                                )}
                                            </span>
                                            {active && <CornerDownLeft size={14} className="text-blue-400 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Footer hints */}
                <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                        <kbd className="text-[10px] bg-white border border-gray-200 rounded px-1 py-px">↑↓</kbd> navigate
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                        <kbd className="text-[10px] bg-white border border-gray-200 rounded px-1 py-px">↵</kbd> open
                    </span>
                    <span className="ml-auto text-[11px] text-gray-300 font-medium">EduConnect</span>
                </div>
            </div>
        </div>,
        document.body
    );
}
