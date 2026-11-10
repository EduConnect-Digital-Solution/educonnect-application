import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { getMyWeekSchedule } from './services/teacherTimetableAPI.js';
import { timeRange, classLabel, periodStatuses, todayName } from './teacherUtils/scheduleUtils.js';

/** Dashboard card: the teacher's periods for today, with the current and next one marked. Quietly hides if the timetable can't load. */
export default function TodaySchedule() {
    const [week, setWeek] = useState(undefined);

    useEffect(() => {
        let alive = true;
        getMyWeekSchedule().then(w => { if (alive) setWeek(w); }).catch(() => { if (alive) setWeek(null); });
        return () => { alive = false; };
    }, []);

    if (week === undefined) return <div className="h-24 rounded-2xl bg-white border border-gray-100 animate-pulse" aria-hidden="true" />;
    if (!week?.term) return null;

    const day = todayName();
    const periods = day ? (week.days[day] || []) : [];
    const statuses = periodStatuses(periods);

    return (
        <section className="bg-white border border-gray-200 rounded-2xl p-4" aria-label="Today's periods">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><CalendarDays size={16} className="text-blue-600" /> Today{day ? ` · ${day}` : ''}</h2>
                <Link to="/dashboard/teacher/timetable" className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-0.5">Full timetable <ChevronRight size={13} /></Link>
            </div>
            {periods.length === 0 ? (
                <p className="text-sm text-gray-500 mt-3">{day ? 'You have no periods today.' : 'No classes at the weekend.'}</p>
            ) : (
                <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {periods.map((p, i) => (
                        <li key={p.id || i} className={`shrink-0 w-44 rounded-xl border p-3 ${statuses[i] === 'now' ? 'border-green-300 bg-green-50/50' : statuses[i] === 'next' ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200'} ${statuses[i] === 'done' ? 'opacity-60' : ''}`}>
                            <p className="text-[11px] font-bold text-gray-400">{timeRange(p)}{statuses[i] === 'now' ? ' · NOW' : statuses[i] === 'next' ? ' · NEXT' : ''}</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">{p.subjectName}</p>
                            <p className="text-xs text-gray-500 truncate">{classLabel(p)}</p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
