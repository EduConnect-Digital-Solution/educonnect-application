import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Pencil, Trash2, Printer, Loader2, BookOpen, User } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { EmptyState, StatusChip, ConfirmDestructiveDialog, pushToast } from '../../../../../components/patterns';
import {
    getAllPublishedTimetables, getTimetableDraft,
    deletePublishedTimetable, deleteTimetableDraft,
} from '../../timetable/timetableAPIs.js';
import { expandPeriods, buildScheduleMap, extractPeriodConfig, addMinutesToTime, TIMETABLE_DAYS } from '../../timetable/timetableUtils.js';
import { getSubjectColor } from '../../timetable/TimetableContext.jsx';
import { ROUTES } from '../../navigation/navConfig.js';

/**
 * TimetableViewPage — read-only full-week view of one timetable.
 * Renders EVERY period (not just assigned ones) with Free indicators, and
 * offers Export PDF / Edit (→ prefilled builder) / Delete.
 */
export default function TimetableViewPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const classId = params.get('classId');
    const termId = params.get('termId');
    const armId = params.get('armId') || null;
    const status = params.get('status') || 'published'; // 'published' | 'draft'
    const termName = params.get('termName') || '';

    const [timetable, setTimetable] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (status === 'draft') {
                const res = await getTimetableDraft(classId, termId, armId);
                setTimetable(res?.data?.draft ?? null);
            } else {
                const all = await getAllPublishedTimetables();
                setTimetable(all.find(t =>
                    t.classId === classId && t.termId === termId && (armId ? t.armId === armId : true)
                ) ?? null);
            }
        } catch (e) {
            setError(e?.message || 'Failed to load timetable.');
        } finally {
            setLoading(false);
        }
    }, [classId, termId, armId, status]);

    useEffect(() => { load(); }, [load]);

    const editHref = () => {
        const q = new URLSearchParams({ classId, termId, ...(armId ? { armId } : {}) });
        navigate(`${ROUTES.timetableBuilder}?${q.toString()}`);
    };

    const handleDelete = async () => {
        if (status === 'draft') await deleteTimetableDraft(classId, termId, armId);
        else await deletePublishedTimetable(timetable.id);
        pushToast({ message: 'Timetable deleted' });
        navigate(ROUTES.timetables);
    };

    const scheduleMap = buildScheduleMap(timetable?.schedules ?? []);
    const className = timetable?.schedules?.[0]?.className || 'Class';
    const armName = timetable?.schedules?.[0]?.armName || (armId ? 'Arm' : null);

    // Build the full period+break row list directly from the stored config so every
    // row (including free periods and breaks) is always shown — even when schedules
    // only cover a subset of periods.
    const periods = (() => {
        if (!timetable) return [];
        // expandPeriods already handles published (periods[0]) and draft (periodConfig)
        const rows = expandPeriods(timetable);
        // If expansion succeeded and produced all rows, use them.
        const cfg = extractPeriodConfig(timetable);
        if (!cfg?.totalPeriods || rows.filter(r => !r.isBreak).length >= cfg.totalPeriods) {
            return rows;
        }
        // Fallback: rebuild purely from the config, ignoring schedule-derived times.
        const rebuilt = [];
        let cursor = cfg.schoolStart || '08:00';
        for (let i = 1; i <= cfg.totalPeriods; i++) {
            const end = addMinutesToTime(cursor, cfg.periodDuration || 40);
            rebuilt.push({ id: `p_view_${i}`, number: i, label: `Period ${i}`, start: cursor, end, isBreak: false });
            cursor = end;
            (cfg.breaks ?? []).filter(b => b.breakAfter === i).forEach((b, bi) => {
                const bEnd = addMinutesToTime(cursor, b.breakDuration || 0);
                rebuilt.push({ id: `b_view_${i}_${bi}`, label: b.label || 'Break', start: cursor, end: bEnd, isBreak: true });
                cursor = bEnd;
            });
        }
        return rebuilt;
    })();

    return (
        <AdminLayout>
            <div id="timetable-print-zone" className="max-w-[1500px] mx-auto space-y-4">
                {/* Breadcrumb + header */}
                <nav className="flex items-center gap-1.5 px-1 text-[13px] print:hidden">
                    <button onClick={() => navigate(ROUTES.timetables)} className="font-semibold text-gray-500 hover:text-blue-700">Timetables</button>
                    <ChevronRight size={13} className="text-gray-300" />
                    <span className="font-semibold text-gray-900">{className}{armName ? ` · ${armName}` : ''}</span>
                </nav>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-wrap items-center gap-4 print:border-0">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold text-gray-900">{className}{armName ? ` — ${armName}` : ''}</h1>
                            <StatusChip status={status} />
                        </div>
                        <p className="text-[13px] text-gray-400 mt-0.5">
                            {termName || 'Term'}{timetable?.publishedAt ? ` · Published ${new Date(timetable.publishedAt).toLocaleDateString()}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 print:hidden">
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50">
                            <Printer size={14} /> Export PDF
                        </button>
                        <button onClick={editHref} className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 shadow-sm">
                            <Pencil size={14} /> Edit
                        </button>
                        <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 text-red-600 hover:bg-red-50">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                ) : error ? (
                    <div className="bg-white border border-gray-200 rounded-2xl"><EmptyState variant="error" description={error} onRetry={load} /></div>
                ) : !timetable ? (
                    <div className="bg-white border border-gray-200 rounded-2xl"><EmptyState variant="filtered" title="Timetable not found" description="This timetable may have been deleted." /></div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
                        {/* Header row */}
                        <div className="grid border-b border-gray-200 bg-gray-50 sticky top-0" style={{ gridTemplateColumns: '120px repeat(5, 1fr)' }}>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center">
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Time</span>
                            </div>
                            {TIMETABLE_DAYS.map(d => (
                                <div key={d} className="p-3 border-r border-gray-200 text-sm font-bold text-gray-700 text-center">{d}</div>
                            ))}
                        </div>

                        {/* Period rows */}
                        {periods.map(period => period.isBreak ? (
                            <div key={period.id} className="grid border-b border-gray-100 bg-gray-50/40 min-h-[44px]" style={{ gridTemplateColumns: '120px repeat(5, 1fr)' }}>
                                <div className="p-2 border-r border-gray-100 flex items-center justify-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">{period.label}</span>
                                </div>
                                <div className="col-span-5 flex items-center justify-center">
                                    <div className="w-full max-w-sm h-px bg-gray-200" />
                                </div>
                            </div>
                        ) : (
                            <div key={period.id} className="grid border-b border-gray-100 min-h-[70px]" style={{ gridTemplateColumns: '120px repeat(5, 1fr)' }}>
                                <div className="p-2 border-r border-gray-100 bg-gray-50/50 flex flex-col justify-center items-center shrink-0">
                                    <span className="text-xs font-bold text-gray-800">{period.label}</span>
                                    <span className="text-[10px] text-gray-500 font-medium mt-0.5 whitespace-nowrap">{period.start} - {period.end}</span>
                                </div>
                                {TIMETABLE_DAYS.map(day => {
                                    const entries = scheduleMap[`${day}__${period.id}`] ?? [];
                                    const entry = entries[0];
                                    if (!entry) {
                                        return (
                                            <div key={day} className="border-r border-gray-100 flex items-center justify-center p-1">
                                                <span className="text-[11px] font-medium text-gray-300">Free</span>
                                            </div>
                                        );
                                    }
                                    const c = getSubjectColor(entry.subjectId);
                                    return (
                                        <div key={day} className="border-r border-gray-100 p-1.5 flex items-center">
                                            <div className={`w-full rounded-lg px-2.5 py-1.5 border ${c.bg} ${c.border}`}>
                                                <p className={`text-[12px] font-bold leading-tight ${c.text} flex items-center gap-1`}><BookOpen size={11} /> {entry.subjectName}</p>
                                                {entry.teacherName && <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1 truncate"><User size={9} /> {entry.teacherName}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmDestructiveDialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                verb="Delete"
                noun="timetable"
                recordName={`${className}${armName ? ` ${armName}` : ''}`}
                consequence="This removes the timetable; attendance registers built from it will lose their source."
                onConfirm={handleDelete}
            />
        </AdminLayout>
    );
}
