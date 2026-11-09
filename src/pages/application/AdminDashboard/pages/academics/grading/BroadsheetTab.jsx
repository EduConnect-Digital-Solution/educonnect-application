import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    RefreshCw, Loader2, Download, AlertTriangle, Table2, Trophy,
} from 'lucide-react';
import { StatusChip, EmptyState, pushToast } from '../../../../../../components/patterns';
import { useAcademic } from '../../../../../../contexts/AcademicContext.jsx';
import { getSchoolClasses } from '../../../services/classAPIs.js';
import { getClassArms } from '../../../services/armAPIs.js';
import { getBroadsheet } from '../../../services/gradingAPIs.js';

// ─── Grade colour helper ────────────────────────────────────────────────────────

function gradeTone(grade) {
    const g = (grade ?? '').charAt(0);
    if (g === 'A') return 'text-green-700';
    if (g === 'B') return 'text-green-600';
    if (g === 'C') return 'text-blue-600';
    if (g === 'D' || g === 'E') return 'text-amber-600';
    return 'text-red-600';
}

// ─── Excel export (dependency-free .xls via HTML table) ─────────────────────────

function exportBroadsheetToExcel({ armName, className, termName, subjects, students, detailed }) {
    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const subjHead = subjects.map(s =>
        detailed
            ? `<th>${esc(s.name)} CA</th><th>${esc(s.name)} Exam</th><th>${esc(s.name)} Total</th><th>${esc(s.name)} Grade</th>`
            : `<th>${esc(s.name)}</th>`
    ).join('');

    const rows = students.map(st => {
        const subjCells = subjects.map(s => {
            const c = st.scores[s.id];
            if (!c) return detailed ? '<td></td><td></td><td></td><td></td>' : '<td></td>';
            return detailed
                ? `<td>${c.ca}</td><td>${c.exam}</td><td>${c.total}</td><td>${esc(c.grade)}</td>`
                : `<td>${c.total}</td>`;
        }).join('');
        return `<tr><td>${st.position}</td><td>${esc(st.name)}</td><td>${esc(st.admissionNo)}</td>${subjCells}` +
            `<td>${st.totalScore}</td><td>${st.average}</td><td>${st.gradePointAverage}</td></tr>`;
    }).join('');

    const html =
        `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">` +
        `<head><meta charset="utf-8"></head><body>` +
        `<h3>${esc(className)} ${esc(armName)} — ${esc(termName)} Broadsheet</h3>` +
        `<table border="1"><thead><tr><th>Pos</th><th>Student</th><th>Adm. No</th>${subjHead}` +
        `<th>Total</th><th>Average</th><th>GPA</th></tr></thead><tbody>${rows}</tbody></table>` +
        `</body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `broadsheet_${(className + '_' + armName).replace(/\s+/g, '-')}_${(termName || 'term').replace(/\s+/g, '-')}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── Readiness banner (sheets not all approved) ──────────────────────────────────

function ReadinessBanner({ readiness }) {
    return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900">
                        Broadsheet locked — {readiness.approved} of {readiness.total} subject sheets approved
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                        Every score sheet for this arm must be approved in the Submission Matrix
                        before the broadsheet can be compiled. Still pending:
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {readiness.pending.map((p, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 text-[11px] bg-white border border-amber-200 rounded-full px-2 py-0.5">
                                <span className="font-semibold text-gray-700">{p.subjectName}</span>
                                <StatusChip status={p.status} size="xs" dot={false} />
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Broadsheet grid ─────────────────────────────────────────────────────────────

function BroadsheetGrid({ subjects, students, detailed }) {
    const subColSpan = detailed ? 4 : 1;
    const minWidth = 320 + subjects.length * (detailed ? 200 : 64) + 240;

    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="border-collapse text-sm" style={{ minWidth }}>
                    <thead>
                        {/* Subject group header (detailed mode merges 4 sub-cols) */}
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="sticky left-0 z-20 bg-gray-50 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-r border-gray-200" style={{ width: 44, minWidth: 44 }} rowSpan={2}>
                                Pos
                            </th>
                            <th className="sticky z-20 bg-gray-50 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-r border-gray-200" style={{ left: 44, width: 180, minWidth: 180 }} rowSpan={2}>
                                Student
                            </th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-r border-gray-200 whitespace-nowrap" style={{ width: 110, minWidth: 110 }} rowSpan={2}>
                                Adm. No
                            </th>
                            {subjects.map(s => (
                                <th key={s.id} colSpan={subColSpan} className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 border-l border-gray-200 whitespace-nowrap">
                                    {s.name}
                                </th>
                            ))}
                            <th colSpan={3} className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-blue-500 border-l border-gray-200 bg-blue-50/50">
                                Aggregate
                            </th>
                        </tr>
                        {/* Sub-column header */}
                        <tr className="bg-gray-50/70 border-b border-gray-200 text-[9px] font-bold uppercase tracking-wide text-gray-400">
                            {subjects.map(s => (
                                detailed ? (
                                    <React.Fragment key={s.id}>
                                        <th className="px-1.5 py-1.5 text-center border-l border-gray-200">CA</th>
                                        <th className="px-1.5 py-1.5 text-center">Exam</th>
                                        <th className="px-1.5 py-1.5 text-center">Tot</th>
                                        <th className="px-1.5 py-1.5 text-center">Gr</th>
                                    </React.Fragment>
                                ) : (
                                    <th key={s.id} className="px-1.5 py-1.5 text-center border-l border-gray-200">Total</th>
                                )
                            ))}
                            <th className="px-1.5 py-1.5 text-center border-l border-gray-200 bg-blue-50/50">Total</th>
                            <th className="px-1.5 py-1.5 text-center bg-blue-50/50">Avg</th>
                            <th className="px-1.5 py-1.5 text-center bg-blue-50/50">GPA</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((st, idx) => {
                            const even = idx % 2 === 1;
                            const rowBg = even ? 'bg-gray-50/40' : 'bg-white';
                            return (
                                <tr key={st.id} className={`border-b border-gray-100 ${rowBg}`}>
                                    <td className={`sticky left-0 z-10 px-3 py-2 border-r border-gray-200 ${rowBg}`} style={{ width: 44 }}>
                                        <span className={`font-mono font-bold text-xs ${st.position <= 3 ? 'text-amber-600' : 'text-gray-400'}`}>
                                            {st.position}
                                        </span>
                                    </td>
                                    <td className={`sticky z-10 px-3 py-2 border-r border-gray-200 ${rowBg}`} style={{ left: 44, width: 180 }}>
                                        <span className="text-sm font-medium text-gray-800 truncate block" style={{ maxWidth: 164 }}>{st.name}</span>
                                    </td>
                                    <td className="px-3 py-2 border-r border-gray-200 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                                        {st.admissionNo}
                                    </td>

                                    {subjects.map(s => {
                                        const c = st.scores[s.id];
                                        if (detailed) {
                                            return (
                                                <React.Fragment key={s.id}>
                                                    <td className="px-1.5 py-2 text-center font-mono text-xs text-gray-500 border-l border-gray-200">{c?.ca ?? '—'}</td>
                                                    <td className="px-1.5 py-2 text-center font-mono text-xs text-gray-500">{c?.exam ?? '—'}</td>
                                                    <td className="px-1.5 py-2 text-center font-mono text-xs font-bold text-gray-800">{c?.total ?? '—'}</td>
                                                    <td className={`px-1.5 py-2 text-center font-mono text-xs font-bold ${gradeTone(c?.grade)}`}>{c?.grade ?? '—'}</td>
                                                </React.Fragment>
                                            );
                                        }
                                        return (
                                            <td key={s.id} className="px-1.5 py-2 text-center font-mono text-xs border-l border-gray-200">
                                                <span className="font-bold text-gray-800">{c?.total ?? '—'}</span>
                                                {c && <span className={`block text-[9px] font-bold ${gradeTone(c.grade)}`}>{c.grade}</span>}
                                            </td>
                                        );
                                    })}

                                    <td className="px-1.5 py-2 text-center font-mono text-xs font-bold text-gray-900 border-l border-gray-200 bg-blue-50/30">{st.totalScore}</td>
                                    <td className="px-1.5 py-2 text-center font-mono text-xs text-gray-700 bg-blue-50/30">{st.average}</td>
                                    <td className="px-1.5 py-2 text-center font-mono text-xs font-bold text-blue-700 bg-blue-50/30">{st.gradePointAverage}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main tab
// ═════════════════════════════════════════════════════════════════════════════

export default function BroadsheetTab() {
    const { currentTerm, loading: scopeLoading } = useAcademic();

    const [classes, setClasses]     = useState([]);
    const [arms, setArms]           = useState([]);
    const [classId, setClassId]     = useState('');
    const [armId, setArmId]         = useState('');

    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingArms, setLoadingArms]       = useState(false);
    const [loading, setLoading]               = useState(false);
    const [error, setError]                   = useState(null);
    const [data, setData]                     = useState(null);
    const [detailed, setDetailed]             = useState(false);

    // Load classes once
    useEffect(() => {
        setLoadingClasses(true);
        getSchoolClasses()
            .then(res => setClasses(res.data?.classes ?? []))
            .catch(() => pushToast({ message: 'Failed to load classes.', type: 'error' }))
            .finally(() => setLoadingClasses(false));
    }, []);

    // Load arms when class changes
    useEffect(() => {
        setArmId(''); setArms([]); setData(null); setError(null);
        if (!classId) return;
        setLoadingArms(true);
        getClassArms(classId)
            .then(res => setArms(res.data?.arms ?? []))
            .catch(() => pushToast({ message: 'Failed to load arms.', type: 'error' }))
            .finally(() => setLoadingArms(false));
    }, [classId]);

    const load = useCallback(async () => {
        if (!armId || !currentTerm?.id) return;
        setLoading(true); setError(null);
        try {
            const res = await getBroadsheet(armId, currentTerm.id);
            const cls = classes.find(c => c.id === classId);
            const arm = arms.find(a => a.id === armId);
            setData({
                ...res.data,
                className: cls?.name ?? res.data.className,
                armName: arm?.name ?? res.data.armName,
                termName: currentTerm?.name ?? '',
            });
        } catch (e) {
            setError(e?.message || 'Failed to load broadsheet.');
        } finally {
            setLoading(false);
        }
    }, [armId, currentTerm?.id, currentTerm?.name, classId, classes, arms]);

    useEffect(() => { setData(null); }, [armId]);

    const ready = data?.readiness?.allApproved;
    const isLoading = scopeLoading || loading;

    const handleExport = () => {
        if (!data) return;
        exportBroadsheetToExcel({ ...data, detailed });
        pushToast({ message: 'Broadsheet exported to Excel.', type: 'success' });
    };

    const topStudent = useMemo(
        () => data?.students?.find(s => s.position === 1),
        [data],
    );

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-bold text-gray-900">Master Broadsheet</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Consolidated results for an arm — every subject, every student, ranked by total score.
                    </p>
                </div>
            </div>

            {/* Selectors */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[160px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5">Class</label>
                    <select
                        value={classId}
                        onChange={e => setClassId(e.target.value)}
                        disabled={loadingClasses}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white disabled:opacity-60"
                    >
                        <option value="">— select class —</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[160px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5">Arm</label>
                    <select
                        value={armId}
                        onChange={e => setArmId(e.target.value)}
                        disabled={!classId || loadingArms}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white disabled:opacity-60"
                    >
                        <option value="">{loadingArms ? 'Loading…' : '— select arm —'}</option>
                        {arms.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={load}
                    disabled={!armId || !currentTerm?.id || isLoading}
                    className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-2"
                >
                    {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Table2 size={15} />}
                    Compile
                </button>
            </div>

            {/* No term */}
            {!currentTerm?.id && !scopeLoading && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800 font-medium">
                    Select an academic term above to compile a broadsheet.
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
                    <EmptyState variant="error" description={error} onRetry={load} />
                </div>
            )}

            {/* Idle — nothing compiled yet */}
            {!isLoading && !error && !data && currentTerm?.id && (
                <div className="bg-white border border-gray-200 rounded-2xl">
                    <EmptyState
                        variant="first-use"
                        title="Compile a broadsheet"
                        description="Pick a class and arm above, then press Compile. The broadsheet appears once every score sheet for that arm has been approved."
                    />
                </div>
            )}

            {/* Not ready */}
            {!isLoading && !error && data && !ready && (
                <ReadinessBanner readiness={data.readiness} />
            )}

            {/* Ready — broadsheet */}
            {!isLoading && !error && data && ready && (
                <>
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div>
                                <p className="text-sm font-bold text-gray-900">
                                    {data.className} {data.armName}
                                    <span className="text-gray-400 font-normal"> · {data.termName}</span>
                                </p>
                                <p className="text-[11px] text-gray-400">
                                    {data.students.length} students · {data.subjects.length} subjects
                                </p>
                            </div>
                            {topStudent && (
                                <span className="inline-flex items-center gap-1.5 text-[11px] bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-2.5 py-1 font-semibold">
                                    <Trophy size={12} /> 1st: {topStudent.name}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={detailed}
                                    onChange={e => setDetailed(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
                                />
                                Show CA / Exam detail
                            </label>
                            <button
                                type="button"
                                onClick={load}
                                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={handleExport}
                                className="px-3 py-2 bg-white border border-gray-200 text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-1.5"
                            >
                                <Download size={14} /> Export to Excel
                            </button>
                        </div>
                    </div>

                    <BroadsheetGrid subjects={data.subjects} students={data.students} detailed={detailed} />

                    <p className="text-[11px] text-gray-400 text-center">
                        Positions are computed from total score across all subjects. Ties share a position.
                    </p>
                </>
            )}
        </div>
    );
}
