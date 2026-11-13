import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ClipboardCheck, RefreshCw } from 'lucide-react';
import { default as Loader2 } from '@/components/brand/LoaderIcon.jsx';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import { EmptyState } from '../../../../components/patterns';
import { getAttendanceOverview, reopenRegister } from '../services/attendanceOverviewAPI.js';
import { notify } from '@/components/patterns/toastBus.js';

import { schoolDateKey as today } from '../../../../utils/schoolLocale.js';
const inputClass = 'px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300';

const rateTone = (rate) => {
    if (rate == null) return 'text-gray-400';
    if (rate >= 90) return 'text-green-700';
    if (rate >= 75) return 'text-amber-700';
    return 'text-red-600';
};

function Tile({ label, value, tone = 'text-gray-900', note }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${tone}`}>{value}</p>
            {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
        </div>
    );
}

export default function AttendanceOpsPage() {
    const [date, setDate]       = useState(today());
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    // quiet = background refresh: no spinner, and a failed refresh keeps what is already on screen
    const requestRef = useRef(0);
    const load = useCallback(async (quiet = false) => {
        if (!date) return;
        // Only the latest request may update the screen, so a slow background refresh can't overwrite a newer date
        const id = ++requestRef.current;
        if (!quiet) { setLoading(true); setError(null); }
        try {
            const res = await getAttendanceOverview({ date });
            if (id === requestRef.current) setData(res.data);
        } catch (e) {
            if (!quiet && id === requestRef.current) setError(e?.message || 'Could not load attendance.');
        } finally {
            if (!quiet && id === requestRef.current) setLoading(false);
        }
    }, [date]);

    useEffect(() => { load(); }, [load]);

    // Teachers submit registers while this page is open: when viewing today, refresh when the tab regains focus and every minute
    useEffect(() => {
        if (date !== today()) return undefined;
        const refresh = () => { if (document.visibilityState === 'visible') load(true); };
        const timer = setInterval(refresh, 60_000);
        document.addEventListener('visibilitychange', refresh);
        window.addEventListener('focus', refresh);
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
    }, [date, load]);

    const day = data?.day;

    return (
        <AdminLayout>
            <div className="flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardCheck size={20} className="text-blue-600" /> Attendance
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            The school's picture for the day, built from the registers teachers have submitted.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                        <label htmlFor="att-date" className="sr-only">Date</label>
                        <input id="att-date" type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} className={inputClass} />
                        <button type="button" onClick={() => load()} disabled={loading}
                            className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </button>
                    </div>
                </div>

                {loading && <div className="flex items-center justify-center py-16"><Loader2 size={24} label="Loading attendance" className="animate-spin text-blue-500" /></div>}

                {!loading && error && (
                    <div className="bg-white border border-gray-200 rounded-2xl"><EmptyState variant="error" description={error} onRetry={() => load()} /></div>
                )}

                {!loading && !error && data && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Tile label="Attendance rate" value={day.rate != null ? `${day.rate}%` : '—'} tone={rateTone(day.rate)}
                                  note={day.total ? `${day.total} pupils marked` : 'No registers submitted'} />
                            <Tile label="Present" value={day.present} note={day.late ? `${day.late} of them late` : undefined} />
                            <Tile label="Absent" value={day.absent} tone={day.absent ? 'text-red-600' : 'text-gray-900'}
                                  note={day.excused ? `${day.excused} excused` : undefined} />
                            <Tile label="Registers" value={day.registersSubmitted}
                                  note={day.registersInDraft ? `${day.registersInDraft} still in draft` : 'submitted'} />
                        </div>

                        <section className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
                            <h2 className="px-4 pt-4 text-sm font-bold text-gray-900">By class</h2>
                            {data.classes.length === 0 ? (
                                <EmptyState variant="first-use" title="No registers submitted for this day"
                                    description="Classes appear here as teachers submit their registers." />
                            ) : (
                                <table className="w-full text-sm mt-2">
                                    <thead>
                                        <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                                            <th className="px-4 py-3 font-semibold">Class</th>
                                            <th className="px-4 py-3 font-semibold">Registers</th>
                                            <th className="px-4 py-3 font-semibold">Present</th>
                                            <th className="px-4 py-3 font-semibold">Late</th>
                                            <th className="px-4 py-3 font-semibold">Absent</th>
                                            <th className="px-4 py-3 font-semibold">Rate</th>
                                            <th className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.classes.map(c => (
                                            <tr key={`${c.classId}-${c.armId}`} className="border-b border-gray-50 last:border-0">
                                                <td className="px-4 py-3 font-semibold text-gray-900">{c.className}{c.armName ? ` ${c.armName}` : ''}</td>
                                                <td className="px-4 py-3 text-gray-700">{c.registers}</td>
                                                <td className="px-4 py-3 text-gray-700">{c.present}</td>
                                                <td className="px-4 py-3 text-gray-700">{c.late}</td>
                                                <td className="px-4 py-3 text-gray-700">{c.absent}</td>
                                                <td className={`px-4 py-3 font-semibold ${rateTone(c.rate)}`}>{c.rate != null ? `${c.rate}%` : '—'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                                                        title="Lets the teacher edit this register again"
                                                        onClick={async () => {
                                                            try {
                                                                await Promise.all((c.sessionIds || []).map(reopenRegister));
                                                                notify.success('Register reopened. The teacher can edit it again.');
                                                            } catch (e) { notify.error(e?.message || 'Could not reopen the register.'); }
                                                        }}
                                                    >Reopen</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </section>

                        <section className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
                            <div className="px-4 pt-4">
                                <h2 className="text-sm font-bold text-gray-900">Frequent absences</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Pupils absent {data.minAbsences}+ times between {data.range.from} and {data.range.to}.
                                </p>
                            </div>
                            {data.absentees.length === 0 ? (
                                <EmptyState variant="first-use" title="Nobody is over the threshold" description="Pupils with repeated absences will be listed here." />
                            ) : (
                                <table className="w-full text-sm mt-2">
                                    <thead>
                                        <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                                            <th className="px-4 py-3 font-semibold">Pupil</th>
                                            <th className="px-4 py-3 font-semibold">Admission no.</th>
                                            <th className="px-4 py-3 font-semibold">Class</th>
                                            <th className="px-4 py-3 font-semibold">Absences</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.absentees.map(a => (
                                            <tr key={a.studentId} className="border-b border-gray-50 last:border-0">
                                                <td className="px-4 py-3 font-semibold text-gray-900">{a.name}</td>
                                                <td className="px-4 py-3 text-gray-700">{a.admissionNo || '—'}</td>
                                                <td className="px-4 py-3 text-gray-700">{a.className || '—'}{a.armName ? ` ${a.armName}` : ''}</td>
                                                <td className="px-4 py-3 font-semibold text-red-600">{a.absences}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </section>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}

