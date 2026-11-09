/**
 * onboardingAPIs — the data layer for the School Onboarding & Setup Journey.
 *
 * Design rules:
 *   • Step completion is INFERRED from real platform data — never a manual checkbox.
 *   • All steps connect to real backend endpoints; the checklist reflects live state.
 *
 * Everything here is a plain async function or a tiny sync helper.
 */

import { getAllStudents } from '../../../auth/authAPIs.js';
import { getDashboardUsers } from './adminService.js';
import { getSchoolClasses } from './classAPIs.js';
import { getSchoolSubjects } from './subjectAPIs.js';
import { getFeeStructures } from './feeAPIs.js';
import { getAcademicYears, getTerms, getAllPublishedTimetables } from '../timetable/timetableAPIs.js';
import { listGradingScales } from './gradingAPIs.js';
import { ROUTES } from '../navigation/navConfig.js';

const LOGO_KEY       = 'educonnect-school-logo'; // data URL
const GOLIVE_KEY     = 'educonnect-go-live';      // { liveAt: ISO }

function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

/* ─── School logo (MOCK: localStorage; awaiting backend upload endpoint) ─────── */
export function getSchoolLogo() {
    return localStorage.getItem(LOGO_KEY) || null;
}
export function saveSchoolLogo(dataUrl) {
    if (dataUrl) localStorage.setItem(LOGO_KEY, dataUrl);
    else localStorage.removeItem(LOGO_KEY);
    window.dispatchEvent(new Event('school-brand-changed'));
    return { success: true, mock: true };
}


/* ─── Go-live status (MOCK: localStorage) ─ */
export function getGoLive() {
    return readJSON(GOLIVE_KEY, null); // { liveAt }
}
export function markGoLive() {
    const payload = { liveAt: new Date().toISOString() };
    writeJSON(GOLIVE_KEY, payload);
    return payload;
}
/** True while the checklist should remain reachable after go-live (7-day window). */
export function isWithinGoLiveWindow() {
    const gl = getGoLive();
    if (!gl?.liveAt) return false;
    const days = (Date.now() - new Date(gl.liveAt).getTime()) / 86_400_000;
    return days <= 7;
}


/* ─── Step catalogue ────────────
 * estMin       — shown to the user
 * unlocks      — the "what this enables" line
 * route        — Start/Resume deep-links here (existing builder/page)
 * dependsOn    — step id that must be done first (drives the Locked state)
 */
export const ONBOARDING_STEPS = [
    { id: 'academic-calendar', title: 'Academic Calendar', estMin: 3, route: ROUTES.settingsAcademic,
      description: 'Set your academic year and its terms — the calendar every module runs on.',
      unlocks: 'Terms & sessions', dependsOn: null },
    { id: 'school-structure', title: 'School Structure', estMin: 5, route: ROUTES.classes,
      description: 'Create your classes and arms so students and timetables have a home.',
      unlocks: 'Students & timetables', dependsOn: 'academic-calendar' },
    { id: 'subjects', title: 'Subjects', estMin: 4, route: ROUTES.subjects,
      description: 'Build your subject catalogue and assign subjects to arms.',
      unlocks: 'Grading & timetables', dependsOn: 'school-structure' },
    { id: 'staff', title: 'Staff', estMin: 3, route: ROUTES.staff,
      description: 'Add teachers and other staff so they can be assigned classes and subjects.',
      unlocks: 'Class & subject assignments', dependsOn: null },
    { id: 'students', title: 'Students & Guardians', estMin: 6, route: ROUTES.students,
      description: 'Add students and link their guardians — one by one or by import.',
      unlocks: 'Attendance & fees', dependsOn: 'school-structure' },
    { id: 'timetable', title: 'Periods & Timetable', estMin: 8, route: ROUTES.timetables,
      description: 'Define periods and publish a timetable for each class.',
      unlocks: 'Attendance registers', dependsOn: 'subjects' },
    { id: 'grading', title: 'Grading Scheme', estMin: 5, route: ROUTES.grading,
      description: 'Define how scores become grades (CA/exam weights, grade bands).',
      unlocks: 'Report cards', dependsOn: 'subjects' },
    { id: 'fees', title: 'Fees', estMin: 5, route: ROUTES.feeStructures,
      description: 'Create fee structures per class so invoices can be generated.',
      unlocks: 'Invoicing', dependsOn: 'school-structure' },
];

/* ─── The single source of truth for onboarding state ─────────────────────────── */
export async function getOnboardingState() {

    // Fetch all real signals in parallel; tolerate individual failures.
    const [yearsRes, classesRes, subjectsRes, staffRes, studentsRes, feesRes, timetablesRes, gradingRes] = await Promise.allSettled([
        getAcademicYears(),
        getSchoolClasses(),
        getSchoolSubjects(),
        getDashboardUsers('teacher', ''),
        getAllStudents(),
        getFeeStructures(),
        getAllPublishedTimetables(),   // all published timetables, any term/class/arm
        listGradingScales(),
    ]);
    const val = (r) => (r.status === 'fulfilled' ? r.value : null);

    const years = val(yearsRes)?.data?.years ?? val(yearsRes)?.data?.academicYears ?? [];
    // Calendar counts as done only once the chosen year actually has terms.
    let hasTerms = false;
    if (years.length) {
        const activeYear = years.find(y => y.isActive) ?? years[0];
        try {
            const termsRes = await getTerms(activeYear.id);
            hasTerms = (termsRes?.data?.terms ?? []).length > 0;
        } catch { hasTerms = false; }
    }

    const realDone = {
        'academic-calendar': years.length > 0 && hasTerms,
        'school-structure':  (val(classesRes)?.data?.classes ?? []).length > 0,
        'subjects':          (val(subjectsRes)?.data?.subjects ?? []).length > 0,
        'staff':             (val(staffRes)?.data?.users ?? []).length > 0,
        'students':          (val(studentsRes)?.data?.students ?? []).length > 0,
        'fees':              (val(feesRes)?.data?.feeStructures ?? val(feesRes)?.data?.structures ?? []).length > 0,
        // getAllPublishedTimetables resolves to the array directly
        'timetable':         (val(timetablesRes) ?? []).length > 0,
        'grading':           (val(gradingRes) ?? []).length > 0 || (val(gradingRes)?.data ?? []).length > 0,
    };

    // Resolve done + locked for every step.
    const doneById = {};
    const steps = ONBOARDING_STEPS.map(step => {
        const done = !!realDone[step.id];
        doneById[step.id] = done;
        return { ...step, done };
    }).map(step => ({
        ...step,
        locked: step.dependsOn ? !doneById[step.dependsOn] : false,
        dependsOnTitle: step.dependsOn ? ONBOARDING_STEPS.find(s => s.id === step.dependsOn)?.title : null,
    }));

    const doneCount = steps.filter(s => s.done).length;
    const percent = Math.round((doneCount / steps.length) * 100);
    const complete = doneCount === steps.length;

    return {
        steps,
        doneCount,
        total: steps.length,
        percent,
        complete,
        goLive: getGoLive(),
        logoUrl: getSchoolLogo(),
    };
}

/* ─── Sample / demo school (MOCK — for "Preview Filled School") ────────────────
 * Every consumer must render this behind a visible "DEMO DATA" marker.
 */
export function getSampleSchoolData() {
    return {
        mock: true,
        students: [
            { id: 'demo-1', name: 'Ada Okafor',     class: 'JSS 1', arm: 'A', gender: 'Female', guardian: 'Mrs Okafor' },
            { id: 'demo-2', name: 'Tunde Bello',     class: 'JSS 1', arm: 'A', gender: 'Male',   guardian: 'Mr Bello' },
            { id: 'demo-3', name: 'Chiamaka Eze',    class: 'JSS 2', arm: 'B', gender: 'Female', guardian: 'Mrs Eze' },
            { id: 'demo-4', name: 'Ibrahim Musa',    class: 'SSS 1', arm: 'Science', gender: 'Male', guardian: 'Alhaji Musa' },
            { id: 'demo-5', name: 'Grace Adeyemi',   class: 'SSS 2', arm: 'Arts', gender: 'Female', guardian: 'Pastor Adeyemi' },
        ],
        fees: [
            { id: 'demo-f1', student: 'Ada Okafor',   structure: 'JSS 1 — Term 1', amount: 150000, paid: 150000, status: 'paid' },
            { id: 'demo-f2', student: 'Tunde Bello',  structure: 'JSS 1 — Term 1', amount: 150000, paid: 75000,  status: 'partial' },
            { id: 'demo-f3', student: 'Chiamaka Eze', structure: 'JSS 2 — Term 1', amount: 165000, paid: 0,      status: 'overdue' },
            { id: 'demo-f4', student: 'Ibrahim Musa', structure: 'SSS 1 — Term 1', amount: 210000, paid: 210000, status: 'paid' },
        ],
        attendance: [
            { id: 'demo-a1', class: 'JSS 1 A', date: 'Today', present: 28, absent: 2, late: 1, rate: 90 },
            { id: 'demo-a2', class: 'JSS 2 B', date: 'Today', present: 24, absent: 1, late: 0, rate: 96 },
            { id: 'demo-a3', class: 'SSS 1 Science', date: 'Today', present: 30, absent: 0, late: 2, rate: 100 },
        ],
        reports: [
            { id: 'demo-r1', title: 'JSS 1 A — Term 1 Report Cards', status: 'published', students: 30 },
            { id: 'demo-r2', title: 'JSS 2 B — Term 1 Report Cards', status: 'pending', students: 25 },
            { id: 'demo-r3', title: 'SSS 1 Science — Term 1 Report Cards', status: 'draft', students: 32 },
        ],
    };
}
