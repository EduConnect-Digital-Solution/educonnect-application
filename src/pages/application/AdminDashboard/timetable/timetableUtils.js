/**
 * Shared timetable helpers — used by the library list, the read-only view, and
 * the builder prefill so they all interpret a stored timetable identically.
 */

export const TIMETABLE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function addMinutesToTime(timeStr, minsToAdd) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(2000, 0, 1, h, m + minsToAdd);
    return d.toTimeString().slice(0, 5);
}

/**
 * Expand a stored timetable into the full ordered list of period rows the grid
 * needs: every period 1..N (not only the ones with lessons) plus breaks.
 *
 * Handles BOTH stored shapes:
 *   • Draft  → `periods` is already an expanded array [{ id, number, start, end, isBreak }]
 *   • Published → `periods` is a single config [{ schoolStart, totalPeriods, periodDuration, breaks }]
 *
 * For published timetables the expanded rows are reconstructed, reusing the
 * `periodId` each schedule references (so schedules still map to their cells)
 * and synthesising ids for fully-free periods.
 *
 * Returns: [{ id, number, label, start, end, isBreak }]
 */
export function expandPeriods(timetable) {
    const periods = timetable?.periods ?? [];
    const schedules = timetable?.schedules ?? [];
    const first = periods[0];

    // Draft shape — already expanded rows.
    if (first && first.totalPeriods == null && (first.start != null || first.isBreak != null)) {
        return periods.filter(p => p && p.id);
    }

    // Map periodNumber → the id/time a schedule already uses, so reconstructed
    // rows reuse the exact periodId the schedules reference.
    const byNumber = new Map();
    for (const s of schedules) {
        if (s.periodNumber != null && !byNumber.has(s.periodNumber)) {
            byNumber.set(s.periodNumber, { id: s.periodId, start: s.startTime, end: s.endTime });
        }
    }

    // Accept config from periods[0] (published shape) OR timetable.periodConfig (draft shape)
    const cfg = (first?.totalPeriods ? first : null) ?? timetable?.periodConfig ?? null;
    if (cfg && cfg.totalPeriods) {
        const rows = [];
        let cursor = cfg.schoolStart || '08:00';
        for (let i = 1; i <= cfg.totalPeriods; i++) {
            const fromSched = byNumber.get(i);
            const start = fromSched?.start ?? cursor;
            const end = fromSched?.end ?? addMinutesToTime(start, cfg.periodDuration || 40);
            rows.push({
                id: fromSched?.id ?? `p_recon_${i}`,
                number: i, label: `Period ${i}`, start, end, isBreak: false,
            });
            cursor = end;
            (cfg.breaks ?? [])
                .filter(b => b.breakAfter === i)
                .forEach((b, bi) => {
                    const bEnd = addMinutesToTime(cursor, b.breakDuration || 0);
                    rows.push({ id: `b_recon_${i}_${bi}`, number: i, label: b.label || 'Break', start: cursor, end: bEnd, isBreak: true });
                    cursor = bEnd;
                });
        }
        return rows;
    }

    // No config at all — derive purely from the schedules' own periods.
    return [...byNumber.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([num, v]) => ({ id: v.id, number: num, label: `Period ${num}`, start: v.start, end: v.end, isBreak: false }));
}

/** The period config metadata the builder's wizard expects, from any stored timetable. */
export function extractPeriodConfig(timetable) {
    if (timetable?.periodConfig) return timetable.periodConfig;
    const periods = timetable?.periods ?? [];
    const cfg = periods[0];
    if (cfg && cfg.totalPeriods) return cfg;

    // Drafts store the expanded rows. Reconstruct the configuration needed
    // for publishing after a reload, including empty periods and breaks.
    const lessons = periods.filter(p => p && !p.isBreak);
    const first = lessons[0];
    if (!first?.id || !first.start || !first.end) return null;
    const minutes = time => {
        const match = /^(\d{1,2}):(\d{2})$/.exec(time || '');
        return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
    };
    const duration = minutes(first.end) - minutes(first.start);
    if (!Number.isFinite(duration) || duration <= 0) return null;
    const breaks = periods.filter(p => p?.isBreak).map(p => ({
        breakAfter: p.number,
        breakDuration: minutes(p.end) - minutes(p.start),
        label: p.label || 'Break',
    }));
    if (breaks.some(b => !b.breakAfter || !Number.isFinite(b.breakDuration) || b.breakDuration <= 0)) return null;
    return {
        periodConfigId: `pc_${first.id}`,
        schoolStart: first.start,
        periodDuration: duration,
        totalPeriods: lessons.length,
        breaks,
    };
}

/** Build a `${day}__${periodId}` → entry[] lookup for grid rendering. */
export function buildScheduleMap(schedules = []) {
    const map = {};
    for (const s of schedules) {
        const key = `${s.dayOfWeek}__${s.periodId}`;
        (map[key] ||= []).push(s);
    }
    return map;
}

