export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const toMinutes = (t) => {
    const m = typeof t === 'string' ? /^(\d{1,2}):(\d{2})/.exec(t) : null;
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export const timeRange = (p) => (p.startTime && p.endTime ? `${p.startTime} - ${p.endTime}` : p.periodNumber ? `Period ${p.periodNumber}` : '');

export const classLabel = (p) => [p.className, p.armName].filter(Boolean).join(' ') || 'Class';

/** 'now' while the period is running, 'next' for the first one still to come, 'done' once over, otherwise null. */
export function periodStatuses(periods, now = new Date()) {
    const minutes = now.getHours() * 60 + now.getMinutes();
    let nextFound = false;
    return periods.map(p => {
        const s = toMinutes(p.startTime), e = toMinutes(p.endTime);
        if (s === null || e === null) return null;
        if (minutes >= s && minutes < e) return 'now';
        if (minutes >= e) return 'done';
        if (!nextFound) { nextFound = true; return 'next'; }
        return null;
    });
}

/** Today's weekday name in the teacher's own time zone, or null on a weekend. */
export function todayName(now = new Date()) {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const n = names[now.getDay()];
    return WEEK_DAYS.includes(n) ? n : null;
}
