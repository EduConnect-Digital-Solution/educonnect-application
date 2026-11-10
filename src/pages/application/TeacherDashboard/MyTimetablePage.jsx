import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import { default as Loader2 } from '@/components/brand/LoaderIcon.jsx';
import TeacherLayout from './components/layout/TeacherLayout.jsx';
import { EmptyState } from '../../../components/patterns';
import { getMyWeekSchedule } from './services/teacherTimetableAPI.js';
import { WEEK_DAYS, timeRange, classLabel, periodStatuses, todayName } from './teacherUtils/scheduleUtils.js';

const STATUS_CHIP = {
    now: 'bg-green-100 text-green-700',
    next: 'bg-blue-100 text-blue-700',
};

function PeriodCard({ period, status }) {
    return (
        <li className={`rounded-xl border p-3 bg-white ${status === 'now' ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-200'} ${status === 'done' ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold tracking-wide text-gray-400">{timeRange(period)}</p>
                {STATUS_CHIP[status] && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_CHIP[status]}`}>{status === 'now' ? 'Now' : 'Next'}</span>
                )}
            </div>
            <p className="text-sm font-semibold text-gray-900 mt-1">{period.subjectName || 'Subject'}</p>
            <p className="text-xs text-gray-500">{classLabel(period)}</p>
            {period.room && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin size={11} /> {period.room}</p>}
        </li>
    );
}

export default function MyTimetablePage() {
    const [week, setWeek] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const today = todayName();
    const [selectedDay, setSelectedDay] = useState(today || WEEK_DAYS[0]);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try { setWeek(await getMyWeekSchedule()); }
        catch (e) { setError(e?.message); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    return (
        <TeacherLayout>
            <div className="p-2 flex flex-col gap-5">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><CalendarDays size={20} className="text-blue-600" /> My timetable</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {week?.term ? `${week.term.name} · ${week.totalPeriods} period${week.totalPeriods === 1 ? '' : 's'} a week` : 'The periods you teach each week.'}
                    </p>
                </div>

                {loading && <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-500" /></div>}
                {error && <div className="bg-white border border-gray-200 rounded-2xl"><EmptyState variant="error" description={error} onRetry={load} /></div>}
                {!loading && !error && !week?.term && (
                    <div className="bg-white border border-gray-200 rounded-2xl"><EmptyState variant="first-use" title="No active term" description="Your timetable appears here once the school has an active term." /></div>
                )}
                {!loading && !error && week?.term && week.totalPeriods === 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl"><EmptyState variant="first-use" title="No periods yet" description="You have no published periods this term. Ask your school admin to publish the timetable." /></div>
                )}

                {!loading && !error && week?.totalPeriods > 0 && (
                    <>
                        {/* Phones: pick a day. From md up all five days sit side by side. */}
                        <div className="md:hidden flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Day of the week">
                            {WEEK_DAYS.map(d => (
                                <button key={d} type="button" role="tab" aria-selected={selectedDay === d} onClick={() => setSelectedDay(d)}
                                    className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold border ${selectedDay === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                                    {d.slice(0, 3)}{d === today ? ' •' : ''}
                                </button>
                            ))}
                        </div>

                        <div className="grid md:grid-cols-5 gap-4">
                            {WEEK_DAYS.map(d => {
                                const periods = week.days[d] || [];
                                const statuses = d === today ? periodStatuses(periods) : periods.map(() => null);
                                return (
                                    <section key={d} className={`${selectedDay === d ? 'block' : 'hidden'} md:block`}>
                                        <h2 className={`hidden md:block text-xs font-bold uppercase tracking-wider mb-2 ${d === today ? 'text-blue-700' : 'text-gray-400'}`}>{d}{d === today ? ' (today)' : ''}</h2>
                                        {periods.length === 0
                                            ? <p className="text-sm text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl p-4 text-center">No periods</p>
                                            : <ul className="flex flex-col gap-2">{periods.map((p, i) => <PeriodCard key={p.id || `${d}-${i}`} period={p} status={statuses[i]} />)}</ul>}
                                    </section>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </TeacherLayout>
    );
}
