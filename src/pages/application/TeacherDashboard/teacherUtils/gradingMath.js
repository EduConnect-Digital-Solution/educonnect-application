/**
 * Pure grading helpers shared by the teacher grading screens.
 *
 * An assessment is marked out of `maxObtainableScore` but only counts
 * `contributionPoints` toward its policy component, so a raw score is never
 * added to a total directly: it is weighted first.
 */

/** Round to 2 decimal places without binary float drift (0.1 + 0.2 → 0.3). */
export function roundPoints(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Sum a list of numbers, rounded to 2 decimal places. */
export function sumPoints(values) {
    return roundPoints((values || []).reduce((acc, v) => acc + (Number(v) || 0), 0));
}

/**
 * Points a raw score earns toward its component:
 * (score ÷ maxScore) × contributionPoints. Null when it cannot be worked out.
 */
export function calcContribution(rawScore, maxScore, contributionPoints) {
    if (rawScore === '' || rawScore == null) return null;
    const s = Number(rawScore);
    const m = Number(maxScore);
    const c = Number(contributionPoints);
    if (!Number.isFinite(s) || !Number.isFinite(m) || !Number.isFinite(c)) return null;
    if (m <= 0 || c <= 0 || s < 0) return null;
    return roundPoints((s / m) * c);
}

/** Weighted points of one student's score inside an assessment entry. */
export function entryContribution(entry, score) {
    if (!entry || !score || score.scoreObtained == null) return null;
    const direct = calcContribution(score.scoreObtained, entry.maxObtainableScore, entry.contributionPoints);
    if (direct !== null) return direct;
    // Fall back to the server's own figure when the entry lacks what is needed to compute it
    const served = Number(score.calculatedContribution);
    return Number.isFinite(served) ? roundPoints(served) : null;
}

const normaliseName = (name) => String(name ?? '').trim().toLowerCase();

/** How many students on the roster share each (normalised) full name. */
export function countRosterNames(students) {
    const counts = new Map();
    (students || []).forEach((s) => {
        const key = normaliseName(s.fullName);
        if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
}

/**
 * The score row belonging to a student. Matches on studentId; a name is only
 * trusted for legacy rows without an id, and only when that name is unique on
 * the roster, so namesakes can never receive each other's scores.
 */
export function findStudentScore(entry, student, nameCounts) {
    const scores = entry?.scores || [];
    const byId = scores.find((s) => s.studentId != null && s.studentId === student.id);
    if (byId) return byId;
    const key = normaliseName(student.fullName);
    if (!key || (nameCounts?.get(key) || 0) !== 1) return undefined;
    return scores.find((s) => s.studentId == null && normaliseName(s.studentName) === key);
}

/**
 * Per-student weighted totals for a roster.
 * Returns [{ ...student, scores: { [componentId]: points, exam: points }, total, mostRecentAssessment }].
 */
export function buildStudentTotals(students, entries, policy) {
    const nameCounts = countRosterNames(students);
    return (students || []).map((student) => {
        const raw = {};
        (policy?.caComponents || []).forEach((ca) => { raw[ca.id] = 0; });
        raw.exam = 0;
        let mostRecent = null;

        (entries || []).forEach((entry) => {
            const score = findStudentScore(entry, student, nameCounts);
            const points = entryContribution(entry, score);
            if (points === null) return;

            const bucket = entry.componentType === 'exam' ? 'exam' : entry.policyComponentId;
            if (bucket != null) raw[bucket] = (raw[bucket] || 0) + points;

            if (!mostRecent || new Date(entry.createdAt) > new Date(mostRecent.date)) {
                mostRecent = {
                    title: entry.title,
                    score: score.scoreObtained,
                    maxScore: entry.maxObtainableScore,
                    date: entry.createdAt,
                };
            }
        });

        const scores = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, roundPoints(v)]));
        return {
            ...student,
            scores,
            mostRecentAssessment: mostRecent,
            total: sumPoints(Object.values(raw)),
        };
    });
}
