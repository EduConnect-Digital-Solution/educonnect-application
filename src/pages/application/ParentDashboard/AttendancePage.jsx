import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import ParentLayout from './components/layout/ParentLayout.jsx';
import { getParentDashboard } from '../../auth/authAPIs.js';
import { getChildDay } from './services/parentAttendanceAPI.js';
import { formatSchoolDate } from '../../../utils/schoolLocale.js';
import { SectionLoader } from '@/components/brand/BrandLoader.jsx';
import { EmptyState } from '../../../components/patterns';

const STATUS = {
    present:    { label: 'Present',    cls: 'bg-green-50 text-green-700 border-green-100' },
    absent:     { label: 'Absent',     cls: 'bg-red-50 text-red-700 border-red-100' },
    late:       { label: 'Late',       cls: 'bg-amber-50 text-amber-700 border-amber-100' },
    excused:    { label: 'Excused',    cls: 'bg-blue-50 text-blue-700 border-blue-100' },
    not_marked: { label: 'Not marked yet', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const shift = (iso, days) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

function ParentAttendanceContent() {
    const [children, setChildren] = useState(null);
    const [childId, setChildId] = useState('');
    const [date, setDate] = useState(todayIso());
    const [day, setDay] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        getParentDashboard()
            .then((res) => {
                if (!alive) return;
                const list = (res?.data?.children || []).map((c) => ({ id: c.id, name: c.fullName, cls: c.classDisplay }));
                setChildren(list);
                if (list[0]) setChildId(list[0].id);
            })
            .catch((e) => alive && setError(e?.message || 'Could not load your children.'));
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        if (!childId) return undefined;
        let alive = true;
        setLoading(true); setError('');
        getChildDay(childId, date)
            .then((d) => alive && setDay(d))
            .catch((e) => alive && setError(e.message))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [childId, date]);

    if (children === null && !error) return <SectionLoader label="Loading your children…" />;
    if (children && children.length === 0) return <EmptyState title="No children linked" description="Ask the school to link your child to your account." />;

    const s = day?.summary;
    return (
        <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
                <p className="text-sm text-gray-500 mt-1">Every period of the school day and whether your child was there. Periods show once the teacher has submitted the register.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {children && children.length > 1 && (
                    <select aria-label="Child" value={childId} onChange={(e) => setChildId(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white">
                        {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}
                <div className="inline-flex items-center gap-1">
                    <button aria-label="Previous day" onClick={() => setDate((d) => shift(d, -1))} className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"><ChevronLeft size={16} /></button>
                    <input type="date" aria-label="Date" value={date} max={todayIso()} onChange={(e) => e.target.value && setDate(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white" />
                    <button aria-label="Next day" disabled={date >= todayIso()} onClick={() => setDate((d) => shift(d, 1))} className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"><ChevronRight size={16} /></button>
                </div>
                {date !== todayIso() && <button onClick={() => setDate(todayIso())} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Today</button>}
            </div>

            {error ? <EmptyState variant="error" description={error} onRetry={() => setDate((d) => d)} />
                : loading || !day ? <SectionLoader label="Loading the day…" />
                : (
                    <>
                        <div className="flex items-center gap-2 text-sm text-gray-600"><CalendarDays size={15} /><b className="text-gray-900">{day.child.name}</b> · {day.dayName}, {formatSchoolDate(`${day.date}T12:00:00Z`)}</div>
                        {day.periods.length === 0 ? (
                            <EmptyState title="No lessons this day" description="There is no timetable for this day, or it is a weekend or holiday." />
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    {['present', 'late', 'absent', 'excused'].map((k) => s[k] > 0 && <span key={k} className={`px-2.5 py-1 rounded-lg border font-semibold ${STATUS[k].cls}`}>{s[k]} {STATUS[k].label.toLowerCase()}</span>)}
                                    {s.notMarked > 0 && <span className={`px-2.5 py-1 rounded-lg border font-semibold ${STATUS.not_marked.cls}`}>{s.notMarked} not marked yet</span>}
                                </div>
                                <ul className="flex flex-col gap-2">
                                    {day.periods.map((p, i) => {
                                        const st = STATUS[p.status] || STATUS.not_marked;
                                        return (
                                            <li key={i} className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3">
                                                <div className="w-14 shrink-0 text-center">
                                                    <p className="text-xs font-bold text-gray-400 uppercase">{p.periodNumber ? `P${p.periodNumber}` : '—'}</p>
                                                    <p className="text-[11px] text-gray-500 tabular-nums">{p.startTime || ''}</p>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{p.subjectName || 'Lesson'}</p>
                                                    <p className="text-xs text-gray-500 truncate">{[p.teacherName, p.startTime && p.endTime ? `${p.startTime} – ${p.endTime}` : null, p.room].filter(Boolean).join(' · ')}</p>
                                                    {p.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.note}</p>}
                                                </div>
                                                <span className={`shrink-0 px-2.5 py-1 rounded-lg border text-xs font-semibold ${st.cls}`}>{st.label}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}
                    </>
                )}
        </div>
    );
}

export default function ParentAttendancePage() {
    return (
        <ParentLayout>
            <ParentAttendanceContent />
        </ParentLayout>
    );
}
