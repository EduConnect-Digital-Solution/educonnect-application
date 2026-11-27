import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Users, TrendingUp, AlertTriangle, BookOpen, ExternalLink, Calendar, CheckCircle2, Trophy, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { default as Loader2 } from '@/components/brand/LoaderIcon.jsx';
import TeacherLayout from "./components/layout/TeacherLayout.jsx";
import { getStudentsByClassandSubject } from "../../auth/authAPIs.js";
import { getEffectivePolicy } from './services/scoreEntryAPIs.js';
import { listAssessmentEntries } from './services/assessmentEntryAPIs.js';
import { useAcademic } from '../../../contexts/AcademicContext.jsx';
import { buildStudentTotals, findTopStudents, rankStudents } from './teacherUtils/gradingMath.js';

function StatCard({ title, value, icon: Icon, className = '' }) {
    return (
        <div className={`bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-start gap-4 ${className}`}>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Icon size={20} strokeWidth={2.5} />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
        </div>
    );
}

/** Clickable table heading with the same sort affordance as WorkbenchTable. */
function SortableTh({ label, sortKey, sort, onSort, className = '' }) {
    const active = sort.key === sortKey;
    const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown;
    return (
        <th
            className={className}
            aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    active ? 'text-gray-700' : 'text-gray-500 hover:text-gray-700'
                }`}
                title={`Sort by ${label}`}
            >
                {label}
                <Icon size={12} className={active ? 'opacity-90' : 'opacity-40'} />
            </button>
        </th>
    );
}

/** Value used when a teacher table heading is clicked. */
function sortValue(student, key) {
    if (key === 'position') return Number(student.position) || 0;
    if (key === 'name') return student.fullName || '';
    if (key === 'recent') return student.mostRecentAssessment?.date || '';
    if (key === 'total') return Number(student.total) || 0;
    if (key === 'grade') return student.displayGrade || '';
    if (key === 'exam') return Number(student.scores?.exam) || 0;
    if (key.startsWith('ca:')) return Number(student.scores?.[key.slice(3)]) || 0;
    return 0;
}

export default function ClassStudents() {
    const { class: studentClass, subject } = useParams();
    const { currentTerm } = useAcademic();
    
    const [students, setStudents] = useState([]);
    const [policy, setPolicy] = useState(null);
    const [, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const termId = currentTerm?.id || '';
    const requestRef = useRef(0);

    const fetchData = useCallback(async () => {
        const request = ++requestRef.current;
        setLoading(true);
        setError(null);
        try {
            const [stuRes, polRes, entRes] = await Promise.all([
                getStudentsByClassandSubject(studentClass, subject),
                getEffectivePolicy(studentClass, subject).catch(() => ({ data: { policy: null } })),
                listAssessmentEntries(studentClass, subject, termId).catch(() => ({ data: { entries: [] } }))
            ]);

            const rawStudents = stuRes.data?.students || [];
            const rawStats = stuRes.data?.statistics;
            const activePolicy = polRes.data?.policy;
            const assessmentEntries = entRes.data?.entries || [];

            // Each raw score is weighted to the points it earns toward its component before it is added up
            const pivotedStudents = buildStudentTotals(rawStudents, assessmentEntries, activePolicy).map(student => ({
                ...student,
                // The API returns the grade as an object ({ letterGrade, percentage, ... }); show its label
                displayGrade: student.grade?.letterGrade || 'Pending'
            }));

            // A newer load (different class, subject or term) has started: drop this one
            if (requestRef.current !== request) return;
            setStudents(pivotedStudents);
            setPolicy(activePolicy);
            setStats(rawStats);
        } catch (err) {
            if (requestRef.current !== request) return;
            console.error('Failed to fetch class data:', err);
            setError(err?.message || 'Failed to load student data. Please try again.');
        } finally {
            if (requestRef.current === request) setLoading(false);
        }
    }, [studentClass, subject, termId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Rank the roster by current total, then mark the leading student(s) the
    // same way the admin broadsheet does.
    const rankedStudents = useMemo(() => rankStudents(students), [students]);
    const leaders = useMemo(() => findTopStudents(rankedStudents), [rankedStudents]);
    const leadingIds = useMemo(() => new Set(leaders.map((s) => s.id)), [leaders]);
    const topStudent = leaders[0];

    // Column sorting. Rank is the default; clicking a heading toggles direction.
    const [sort, setSort] = useState({ key: 'position', dir: 'asc' });
    const toggleSort = useCallback((key) => {
        setSort((current) => current.key === key
            ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
            : { key, dir: 'asc' });
    }, []);
    const sortedStudents = useMemo(() => {
        const rows = [...rankedStudents];
        rows.sort((a, b) => {
            const av = sortValue(a, sort.key);
            const bv = sortValue(b, sort.key);
            const comparison = typeof av === 'number' && typeof bv === 'number'
                ? av - bv
                : String(av).localeCompare(String(bv), undefined, { numeric: true });
            return sort.dir === 'asc' ? comparison : -comparison;
        });
        return rows;
    }, [rankedStudents, sort]);

    return (
        <TeacherLayout>
            <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link to="/dashboard/teacher" className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors flex items-center">
                                <ChevronLeft size={16} className="mr-0.5" />
                                Dashboard
                            </Link>
                            <span className="text-gray-300">/</span>
                            <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                {studentClass}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">{subject}</h1>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                           Student Progress & Grading Overview
                        </p>
                    </div>

                    <Link
                        to={`/dashboard/teacher/score-entry?className=${encodeURIComponent(studentClass)}&subjectName=${encodeURIComponent(subject)}`}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Enter Scores <ExternalLink size={16} />
                    </Link>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Loader2 size={32} className="animate-spin mb-3 text-blue-600" />
                        <p className="text-sm font-medium">Loading class data...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                        <AlertTriangle size={32} className="text-red-500 mb-3" />
                        <p className="text-sm font-semibold text-red-800">{error}</p>
                        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors">
                            Try Again
                        </button>
                    </div>
                ) : (
                    <>
                        {/*/!* KPI Cards *!/*/}
                        {/*<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">*/}
                        {/*    <StatCard title="Total Students" value={stats?.totalStudents || students.length} icon={Users} />*/}
                        {/*    <StatCard title="Graded Students" value={stats?.gradedStudents || 0} icon={CheckCircle2} />*/}
                        {/*    <StatCard title="Ungraded Students" value={stats?.ungradedStudents || 0} icon={AlertTriangle} />*/}
                        {/*    <StatCard title="Grading Progress" value={`${stats?.gradingProgress || 0}%`} icon={TrendingUp} />*/}
                        {/*</div>*/}

                        {/* Table */}
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <Calendar size={16} className="text-gray-400" />
                                        Academic Details of Students
                                    </h3>
                                    {topStudent && (
                                        <span
                                            className="inline-flex items-center gap-1.5 text-[11px] bg-amber-50/70 border border-amber-200 text-amber-700 rounded-full px-2.5 py-1 font-semibold dark:bg-amber-400/10 dark:border-amber-400/30"
                                            title={leaders.map((s) => s.fullName).join(', ')}
                                        >
                                            <Trophy size={12} />
                                            1st: {topStudent.fullName}{leaders.length > 1 ? ` +${leaders.length - 1}` : ''}
                                        </span>
                                    )}
                                </div>
                                {policy && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Active Policy:</span>
                                        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
                                            {policy.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-200">
                                            <SortableTh label="Position" sortKey="position" sort={sort} onSort={toggleSort} className="px-4 py-3 text-center" />
                                            <SortableTh label="Student Details" sortKey="name" sort={sort} onSort={toggleSort} className="px-5 py-3 text-left" />
                                            <SortableTh label="Most Recent Assessment" sortKey="recent" sort={sort} onSort={toggleSort} className="px-5 py-3 text-left" />
                                            {policy?.caComponents?.map(ca => (
                                                <SortableTh
                                                    key={ca.id}
                                                    label={`${ca.name} (${ca.maxScore})`}
                                                    sortKey={`ca:${ca.id}`}
                                                    sort={sort}
                                                    onSort={toggleSort}
                                                    className="px-5 py-3 text-center"
                                                />
                                            ))}
                                            <SortableTh label={`Exam (${policy?.examMax ?? 60})`} sortKey="exam" sort={sort} onSort={toggleSort} className="px-5 py-3 text-center" />
                                            <SortableTh label="Current Total" sortKey="total" sort={sort} onSort={toggleSort} className="px-5 py-3 text-center bg-blue-50/50" />
                                            <SortableTh label="Grade Name" sortKey="grade" sort={sort} onSort={toggleSort} className="px-5 py-3 text-center" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sortedStudents.map((student, idx) => {
                                            const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30';
                                            const mra = student.mostRecentAssessment;
                                            const isPending = student.displayGrade === 'Pending';
                                            const isLeading = leadingIds.has(student.id);
                                            
                                            return (
                                                <tr
                                                    key={student.id}
                                                    className={`transition-colors ${isLeading ? 'bg-amber-50/40 hover:bg-amber-50/60 dark:bg-amber-400/10 dark:hover:bg-amber-400/15' : `${rowBg} hover:bg-gray-50`}`}
                                                >
                                                    <td className="px-4 py-3 text-center">
                                                        <span
                                                            className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 font-mono text-xs font-bold ${
                                                                student.hasScore && student.position <= 3 ? 'text-amber-600' : 'text-gray-400'
                                                            }`}
                                                            title="Class position"
                                                        >
                                                            {student.hasScore ? student.position : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-gray-900">{student.fullName}</p>
                                                            {isLeading && (
                                                                <span
                                                                    className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide dark:bg-amber-400/15 dark:border-amber-400/30"
                                                                    title="Leading student"
                                                                >
                                                                    <Trophy size={10} /> 1st
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{student.admissionNo || student.id.split('-')[0]}</p>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        {mra ? (
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-800">{mra.title}</p>
                                                                <p className="text-[10px] text-gray-500 mt-0.5">{mra.score} / {mra.maxScore}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">No assessments yet</span>
                                                        )}
                                                    </td>
                                                    {policy?.caComponents?.map(ca => (
                                                        <td key={ca.id} className="px-5 py-3 text-center font-mono text-xs text-gray-600">
                                                            {student.scores[ca.id] > 0 ? student.scores[ca.id] : '—'}
                                                        </td>
                                                    ))}
                                                    <td className="px-5 py-3 text-center font-mono text-xs text-gray-600">
                                                        {student.scores.exam > 0 ? student.scores.exam : '—'}
                                                    </td>
                                                    <td className="px-5 py-3 text-center font-mono text-sm font-bold text-blue-700 bg-blue-50/30">
                                                        {student.total > 0 ? student.total : '0'}
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold ${
                                                            isPending ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                                        }`}>
                                                            {isPending && <AlertTriangle size={10} className="mr-1" />}
                                                            {student.displayGrade}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {sortedStudents.length === 0 && (
                                            <tr>
                                                <td colSpan={100} className="p-8 text-center text-sm text-gray-500 italic">
                                                    No students enrolled in this subject.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </TeacherLayout>
    );
}