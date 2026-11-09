import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, Loader2, CheckCircle2, AlertCircle, Clock,
    ChevronDown, ChevronsUpDown, LayoutList, BarChart3,
    FileText, Users, Eye, ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Drawer, EmptyState } from '../../../../../../components/patterns';
import { useAcademic } from '../../../../../../contexts/AcademicContext.jsx';
import {
    getSubmissionMatrix,
    getSubjectGradingActivity,
} from '../../../services/gradingAPIs.js';

// ─── Status model ──────────────────────────────────────────────────────────────
//
// The new grading system uses three statuses instead of the old five
// (draft / submitted / returned / approved / not_started).
//
// Legacy statuses from the live backend are normalised to these three.

function normaliseLegacyStatus(legacyStatus) {
    switch (legacyStatus) {
        case 'completed':
        case 'approved':                return 'completed';
        case 'in_progress':
        case 'submitted':
        case 'returned':
        case 'draft':                   return 'in_progress';
        case 'not_started': default:    return 'not_started';
    }
}

const STATUS_META = {
    not_started: {
        label:       'Not Started',
        description: 'No assessments have been recorded for this subject yet.',
        icon:        AlertCircle,
        dot:         'bg-gray-300',
        badge:       'bg-white border-gray-200 text-gray-500',
        cardBorder:  'border-gray-200 bg-white',
    },
    in_progress: {
        label:       'In Progress',
        description: 'The teacher is recording assessments throughout the term.',
        icon:        Clock,
        dot:         'bg-blue-500',
        badge:       'bg-blue-50 border-blue-200 text-blue-700',
        cardBorder:  'border-blue-200 bg-blue-50/20',
    },
    completed: {
        label:       'Completed',
        description: 'All assessment components have been fully graded.',
        icon:        CheckCircle2,
        dot:         'bg-green-500',
        badge:       'bg-green-50 border-green-200 text-green-700',
        cardBorder:  'border-green-200 bg-green-50/20',
    },
};

// ─── School-level progress bar ─────────────────────────────────────────────────

function ProgressBar({ summary }) {
    const { total = 0, approved = 0, submitted = 0, draft = 0, returned = 0 } = summary ?? {};

    // Map legacy counts to new buckets
    const completed   = approved;
    const in_progress = submitted + returned + draft;
    const not_started = Math.max(0, total - completed - in_progress);

    if (total === 0) return null;
    const pct = (n) => Math.round((n / total) * 100);

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">
                    School-wide grading progress — {completed} of {total} subjects fully graded
                </p>
                <span className="text-sm font-bold text-green-600">{pct(completed)}%</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 gap-px">
                {completed   > 0 && <div className="bg-green-500 transition-all" style={{ width: `${pct(completed)}%` }}   title={`${completed} completed`} />}
                {in_progress > 0 && <div className="bg-blue-400 transition-all"  style={{ width: `${pct(in_progress)}%` }} title={`${in_progress} in progress`} />}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                {[
                    { label: 'Completed',    count: completed,   color: 'bg-green-500' },
                    { label: 'In Progress',  count: in_progress, color: 'bg-blue-400' },
                    { label: 'Not Started',  count: not_started, color: 'bg-gray-100 border border-gray-200' },
                ].map(({ label, count, color }) => (
                    <span key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <span className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                        {label} <span className="font-bold text-gray-700">({count})</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

// ─── Component progress row ────────────────────────────────────────────────────

function ComponentProgressRow({ item }) {
    const pct      = item.maxScore > 0 ? Math.min(100, Math.round((item.usedPoints / item.maxScore) * 100)) : 0;
    const isDone   = item.usedPoints >= item.maxScore;

    return (
        <div className="flex items-center gap-3 py-1.5">
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-medium text-gray-700 truncate">{item.componentName}</p>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className={`text-[10px] font-bold font-mono ${isDone ? 'text-green-700' : 'text-gray-600'}`}>
                            {item.usedPoints}/{item.maxScore}
                        </span>
                        {isDone && <CheckCircle2 size={11} className="text-green-500 shrink-0" />}
                    </div>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${isDone ? 'bg-green-500' : 'bg-blue-400'}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
            <span className="text-[10px] text-gray-400 shrink-0 w-8 text-right">{item.entries}×</span>
        </div>
    );
}

// ─── Audit drawer ──────────────────────────────────────────────────────────────
// Replaces the old ModerationDrawer. Admin can view grading details but cannot
// approve or return sheets — that workflow has been removed.

function AuditDrawer({ cell, termId, onClose }) {
    const [activityData, setActivityData] = useState(null);
    const [loading,       setLoading]      = useState(false);
    const [error,         setError]        = useState(null);

    useEffect(() => {
        if (!cell) { setActivityData(null); return; }
        setLoading(true); setError(null); setActivityData(null);

        getSubjectGradingActivity(
            cell.className,
            cell.armName,
            cell.subjectName,
            termId ?? cell.termId ?? '',
        ).then(res => {
            setActivityData(res.data);
        }).catch(e => {
            setError(e?.message || 'Failed to load grading activity.');
        }).finally(() => setLoading(false));
    }, [cell]);

    if (!cell) return null;

    const rawStatus = cell.status;
    const status    = normaliseLegacyStatus(rawStatus);
    const meta      = STATUS_META[status];
    const Icon      = meta.icon;

    const fmtDate = (iso) => iso
        ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';

    return (
        <Drawer
            open={Boolean(cell)}
            onClose={onClose}
            title={cell.subjectName}
            subtitle={`${cell.className} · Arm ${cell.armName}`}
        >
            {/* Navigation Link */}
            <div className="flex justify-end mb-2">
                <Link
                    to={`/dashboard/admin/academics/grading/subject-view?classId=${encodeURIComponent(cell.className)}&className=${encodeURIComponent(cell.className)}&armId=${encodeURIComponent(cell.armId || cell.armName)}&armName=${encodeURIComponent(cell.armName)}&subjectId=${encodeURIComponent(cell.subjectId)}&subjectName=${encodeURIComponent(cell.subjectName)}&termId=${encodeURIComponent(termId)}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors w-fit"
                >
                    Go to page <ExternalLink size={14} />
                </Link>
            </div>

            {/* Status banner */}
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${meta.badge}`}>
                <Icon size={18} className="shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold">{meta.label}</p>
                    <p className="text-xs opacity-75 mt-0.5">{meta.description}</p>
                </div>
            </div>

            {/* Basic details */}
            <div className="space-y-2 text-sm">
                {[
                    { label: 'Teacher',      value: cell.teacherName ?? '—' },
                    { label: 'Last updated', value: cell.lastUpdated ? fmtDate(cell.lastUpdated) : '—' },
                ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-medium text-gray-800">{value}</span>
                    </div>
                ))}
            </div>

            {/* Loading activity */}
            {loading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-blue-500" />
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                    {error}
                </div>
            )}

            {/* Grading activity */}
            {!loading && activityData && (
                <>
                    {/* Component progress */}
                    {activityData.componentProgress?.length > 0 && (
                        <div className="space-y-1">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                                <BarChart3 size={11} /> Grading Progress
                            </h3>
                            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                                {activityData.componentProgress.map(item => (
                                    <ComponentProgressRow key={item.componentId} item={item} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Assessment entries list */}
                    {activityData.entries?.length > 0 ? (
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                                <FileText size={11} /> Recorded Assessments ({activityData.entries.length})
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {activityData.entries.map(entry => (
                                    <div key={entry.id} className="p-3 bg-white border border-gray-100 rounded-xl">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-800 truncate">{entry.title}</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">
                                                    {entry.assessmentType} · {entry.componentName}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-bold font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                                                +{entry.contributionPoints} pts
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Users size={10} /> {entry.studentsGraded} students
                                            </span>
                                            <span>{fmtDate(entry.updatedAt)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="py-6 text-center">
                            <FileText size={24} className="text-gray-200 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">No assessments recorded yet</p>
                        </div>
                    )}

                    {/* Audit note */}
                    <div className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500 flex items-start gap-2">
                        <Eye size={12} className="mt-0.5 shrink-0 text-slate-400" />
                        <span>
                            Grading is managed directly by the teacher. No actions are required.
                        </span>
                    </div>
                </>
            )}
        </Drawer>
    );
}

// ─── Subject badge ─────────────────────────────────────────────────────────────

function SubjectBadge({ subject, arm, onClick }) {
    const status = normaliseLegacyStatus(subject.status);
    const meta   = STATUS_META[status];
    return (
        <button
            type="button"
            onClick={() => onClick({ ...subject, armName: arm.armName, armId: arm.armId, className: arm.className })}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-colors hover:brightness-95 active:brightness-90 ${meta.badge}`}
        >
            <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold leading-tight truncate">{subject.subjectName}</p>
                <p className="text-[10px] opacity-70 leading-tight mt-0.5">{meta.label}</p>
            </div>
        </button>
    );
}

// ─── Arm card ─────────────────────────────────────────────────────────────────

function ArmCard({ arm, onBadgeClick }) {
    const total     = arm.subjects.length;
    const completed = arm.subjects.filter(s => normaliseLegacyStatus(s.status) === 'completed').length;
    const active    = arm.subjects.filter(s => normaliseLegacyStatus(s.status) === 'in_progress').length;
    const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
    const allDone   = completed === total && total > 0;

    return (
        <div className={`flex flex-col gap-3 p-4 rounded-2xl border transition-colors ${
            allDone   ? 'border-green-200 bg-green-50/20'
            : active > 0 ? 'border-blue-200 bg-blue-50/20'
            : 'border-gray-200 bg-white'
        }`}>
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-bold text-gray-900">{arm.armName}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{total} subject{total !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-gray-800">
                        {completed}<span className="font-normal text-gray-400">/{total}</span>
                    </p>
                    <p className="text-[10px] text-gray-400">completed</p>
                </div>
            </div>

            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${allDone ? 'bg-green-500' : 'bg-blue-400'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>

            {active > 0 && !allDone && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <Clock size={11} className="text-blue-600 shrink-0" />
                    <span className="text-[11px] font-semibold text-blue-700">
                        {active} subject{active !== 1 ? 's' : ''} being graded
                    </span>
                </div>
            )}
            {allDone && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 size={11} className="text-green-600 shrink-0" />
                    <span className="text-[11px] font-semibold text-green-700">All subjects fully graded</span>
                </div>
            )}

            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))' }}>
                {arm.subjects.map(subject => (
                    <SubjectBadge key={subject.subjectId} subject={subject} arm={arm} onClick={onBadgeClick} />
                ))}
            </div>
        </div>
    );
}

// ─── Class section (collapsible) ───────────────────────────────────────────────

function ClassSection({ className, arms, onBadgeClick, defaultOpen }) {
    const [open, setOpen] = useState(defaultOpen);

    const totalSubjects  = arms.reduce((s, a) => s + a.subjects.length, 0);
    const totalCompleted = arms.reduce((s, a) => s + a.subjects.filter(x => normaliseLegacyStatus(x.status) === 'completed').length, 0);
    const totalActive    = arms.reduce((s, a) => s + a.subjects.filter(x => normaliseLegacyStatus(x.status) === 'in_progress').length, 0);
    const pct            = totalSubjects > 0 ? Math.round((totalCompleted / totalSubjects) * 100) : 0;
    const allDone        = totalCompleted === totalSubjects && totalSubjects > 0;

    return (
        <div className={`rounded-2xl border overflow-hidden transition-colors ${allDone ? 'border-green-200' : 'border-gray-200'}`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
            >
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <span className={`shrink-0 inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${
                        allDone ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                        {className}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0">{arms.length} arm{arms.length !== 1 ? 's' : ''}</span>
                    <span className="text-gray-200 shrink-0">·</span>
                    <span className="text-xs font-semibold text-gray-700 shrink-0">
                        {totalCompleted}/{totalSubjects} completed
                    </span>
                    {totalActive > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md shrink-0">
                            <Clock size={9} /> {totalActive} active
                        </span>
                    )}
                    {allDone && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded-md shrink-0">
                            <CheckCircle2 size={9} /> Complete
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${allDone ? 'bg-green-500' : 'bg-blue-400'}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className="text-xs font-bold text-gray-400 w-8 text-right">{pct}%</span>
                    </div>
                    <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {open && (
                <div className="px-5 pb-5 bg-gray-50/60 border-t border-gray-100">
                    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 pt-4">
                        {arms.map(arm => (
                            <ArmCard key={arm.armId} arm={arm} onBadgeClick={onBadgeClick} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Grouped class list ────────────────────────────────────────────────────────

function CollapsibleClassList({ matrix, onCellClick, expandAll }) {
    const grouped = {};
    const order   = [];
    for (const row of matrix) {
        if (!grouped[row.className]) {
            grouped[row.className] = [];
            order.push(row.className);
        }
        grouped[row.className].push(row);
    }

    return (
        <div className="flex flex-col gap-3">
            {order.map(cls => {
                const arms      = grouped[cls];
                const hasActive = arms.some(a => a.subjects.some(s => normaliseLegacyStatus(s.status) === 'in_progress'));
                return (
                    <ClassSection
                        key={cls}
                        className={cls}
                        arms={arms}
                        onBadgeClick={onCellClick}
                        defaultOpen={expandAll || hasActive}
                    />
                );
            })}
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main tab
// ═════════════════════════════════════════════════════════════════════════════

export default function SubmissionMatrixTab() {
    const { currentTerm, loading: scopeLoading } = useAcademic();

    const [matrixData,   setMatrixData]   = useState(null);
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState(null);
    const [activeCell,   setActiveCell]   = useState(null);
    const [filterClass,  setFilterClass]  = useState('');
    const [expandAll,    setExpandAll]    = useState(false);

    const load = useCallback(async (termId) => {
        if (!termId) return;
        setLoading(true); setError(null);
        try {
            const res = await getSubmissionMatrix(termId);
            setMatrixData(res.data);
        } catch (e) {
            setError(e?.message || 'Failed to load grading matrix.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(currentTerm?.id); }, [currentTerm?.id, load]);
    useEffect(() => { setFilterClass(''); setExpandAll(false); }, [currentTerm?.id]);

    const isLoading = scopeLoading || loading;
    const { summary, matrix } = matrixData ?? {};
    const hasData   = (matrix?.length ?? 0) > 0;

    const classOptions = hasData
        ? [...new Set(matrix.map(r => r.className))].sort()
        : [];

    const filteredMatrix = hasData && filterClass
        ? matrix.filter(r => r.className === filterClass)
        : matrix;

    // Summary counts for attention strip — normalised
    const totalActive = hasData
        ? matrix.reduce((s, r) => s + r.subjects.filter(x => {
            const n = normaliseLegacyStatus(x.status);
            return n === 'in_progress';
          }).length, 0)
        : 0;

    const totalCompleted = hasData
        ? matrix.reduce((s, r) => s + r.subjects.filter(x => normaliseLegacyStatus(x.status) === 'completed').length, 0)
        : 0;

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-bold text-gray-900">Grading Activity</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Monitor teacher grading progress across all classes.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => load(currentTerm?.id)}
                        disabled={isLoading || !currentTerm?.id}
                        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* No term */}
            {!currentTerm?.id && !scopeLoading && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800 font-medium">
                    Select an academic term above to load grading activity.
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
            )}

            {/* Error */}
            {!isLoading && error && (
                <div className="bg-white border border-gray-200 rounded-2xl">
                    <EmptyState variant="error" description={error} onRetry={() => load(currentTerm?.id)} />
                </div>
            )}

            {/* Empty */}
            {!isLoading && !error && currentTerm?.id && !hasData && matrixData && (
                <>
                    {/*{summary && <ProgressBar summary={summary} />}*/}
                    <div className="bg-white border border-gray-200 rounded-2xl">
                        <EmptyState
                            variant="first-use"
                            title="No grading activity for this term yet"
                            description="Activity appears here once teachers begin recording assessments. Ensure classes, subjects, and assessment policies are configured."
                        />
                    </div>
                </>
            )}

            {/* Main content */}
            {!isLoading && !error && hasData && (
                <>
                    {/*<ProgressBar summary={summary} />*/}

                    {/*/!* Activity strip *!/*/}
                    {/*{(totalActive > 0 || totalCompleted > 0) && (*/}
                    {/*    <div className="flex flex-wrap gap-2.5">*/}
                    {/*        {totalActive > 0 && (*/}
                    {/*            <div className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-xl">*/}
                    {/*                <Clock size={14} className="text-blue-600 shrink-0" />*/}
                    {/*                <span className="text-xs font-semibold text-blue-800">*/}
                    {/*                    {totalActive} subject{totalActive !== 1 ? 's' : ''} actively being graded school-wide*/}
                    {/*                </span>*/}
                    {/*            </div>*/}
                    {/*        )}*/}
                    {/*        {totalCompleted > 0 && (*/}
                    {/*            <div className="flex items-center gap-2 px-3.5 py-2 bg-green-50 border border-green-200 rounded-xl">*/}
                    {/*                <CheckCircle2 size={14} className="text-green-600 shrink-0" />*/}
                    {/*                <span className="text-xs font-semibold text-green-800">*/}
                    {/*                    {totalCompleted} subject{totalCompleted !== 1 ? 's' : ''} fully graded*/}
                    {/*                </span>*/}
                    {/*            </div>*/}
                    {/*        )}*/}
                    {/*    </div>*/}
                    {/*)}*/}

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                Filter by Class
                            </label>
                            <select
                                value={filterClass}
                                onChange={e => { setFilterClass(e.target.value); setExpandAll(false); }}
                                className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                            >
                                <option value="">All classes ({classOptions.length})</option>
                                {classOptions.map(cls => (
                                    <option key={cls} value={cls}>{cls}</option>
                                ))}
                            </select>
                            {filterClass && (
                                <button type="button" onClick={() => setFilterClass('')}
                                    className="text-xs text-blue-600 hover:underline">
                                    Clear
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setExpandAll(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                        >
                            {expandAll
                                ? <><ChevronsUpDown size={13} /> Collapse All</>
                                : <><LayoutList size={13} /> Expand All</>
                            }
                        </button>
                    </div>

                    {filteredMatrix?.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-2xl">
                            <EmptyState
                                variant="empty"
                                title={`No arms found for ${filterClass}`}
                                description="Try a different class or clear the filter."
                            />
                        </div>
                    ) : (
                        <CollapsibleClassList
                            matrix={filteredMatrix}
                            onCellClick={setActiveCell}
                            expandAll={expandAll}
                        />
                    )}
                </>
            )}

            <AuditDrawer
                cell={activeCell}
                termId={currentTerm?.id}
                onClose={() => setActiveCell(null)}
            />
        </div>
    );
}
