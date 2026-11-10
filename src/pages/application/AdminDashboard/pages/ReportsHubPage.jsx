import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Printer, RefreshCw } from 'lucide-react';
import { default as Loader2 } from '@/components/brand/LoaderIcon.jsx';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import { EmptyState } from '../../../../components/patterns';
import { useAcademic } from '../../../../contexts/AcademicContext.jsx';
import { getBoardReport } from '../services/boardReportAPI.js';
import { ROUTES } from '../navigation/navConfig.js';

const SECTION_DEFS = [
    ['students', 'Students and admissions'],
    ['academics', 'Academic performance'],
    ['attendance', 'Attendance'],
    ['finance', 'Finance'],
    ['events', 'Events and calendar'],
    ['staff', 'Staff and parents'],
    ['communication', 'Communication'],
];
const SECTION_TITLE = Object.fromEntries(SECTION_DEFS);

const naira = (kobo) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format((kobo || 0) / 100);
const num = (n) => (n == null ? '—' : new Intl.NumberFormat().format(n));
const percent = (n) => (n == null ? '—' : `${n}%`);
const when = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const inputClass = 'px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300';

function Stat({ label, value, note }) {
    return (
        <div className="border border-gray-200 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{label}</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
            {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
        </div>
    );
}

// A labelled horizontal bar: value is 0 to 100
function Bar({ label, value, right }) {
    return (
        <div className="py-1">
            <div className="flex justify-between text-xs text-gray-600"><span>{label}</span><span className="font-semibold text-gray-800">{right}</span></div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden mt-1">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
            </div>
        </div>
    );
}

function Table({ head, rows }) {
    return (
        <table className="w-full text-sm mt-2">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">{head.map(h => <th key={h} className="py-1.5 pr-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-gray-50 last:border-0">{r.map((c, j) => <td key={j} className="py-1.5 pr-3 text-gray-700">{c}</td>)}</tr>)}</tbody>
        </table>
    );
}

function Section({ id, title, note, onNote, children }) {
    return (
        <section className="report-section mt-7">
            <h2 className="text-base font-bold text-gray-900 border-b-2 border-blue-900 pb-1 mb-3">{title}</h2>
            {children}
            <div className={`mt-3 ${note ? '' : 'print:hidden'}`}>
                <label htmlFor={`note-${id}`} className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide print:hidden">Notes for the board (optional)</label>
                <textarea id={`note-${id}`} rows={2} value={note} onChange={e => onNote(e.target.value)} placeholder="Add commentary for this section"
                    className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg print:hidden" />
                {note && <p className="hidden print:block text-sm text-gray-700 whitespace-pre-line"><strong>Note: </strong>{note}</p>}
            </div>
        </section>
    );
}

function Body({ id, data }) {
    if (id === 'students') {
        return (<>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Enrolled pupils" value={num(data.total)} />
                <Stat label="Admitted this period" value={num(data.newlyAdmitted)} />
                <Stat label="Applicants in progress" value={num((data.applicants.applied || 0) + (data.applicants.under_review || 0) + (data.applicants.offered || 0))} note={`${data.applicants.offered || 0} offered`} />
                <Stat label="Gender (F / M)" value={`${data.gender.female || 0} / ${data.gender.male || 0}`} />
            </div>
            <Table head={['Class', 'Pupils']} rows={data.byClass.map(c => [c.className, num(c.count)])} />
        </>);
    }
    if (id === 'academics') {
        if (!data.available) return <p className="text-sm text-gray-500">{data.reason}</p>;
        return (<>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="School average" value={percent(data.schoolAverage)} note="Across classes with complete results" />
                <Stat label="Classes with complete results" value={`${data.armsReady} of ${data.armsTotal}`} />
                <Stat label="Top performers listed" value={num(data.topPerformers.length)} />
            </div>
            <div className="mt-3">{data.arms.filter(a => a.ready).map(a => <Bar key={a.armId} label={`${a.className} ${a.armName}`} value={a.classAverage} right={percent(a.classAverage)} />)}</div>
            {data.topPerformers.length > 0 && <Table head={['Class', 'Top pupil', 'Average']} rows={data.topPerformers.map(t => [t.arm, t.name, percent(t.average)])} />}
            {data.armsReady < data.armsTotal && <p className="text-xs text-amber-700 mt-2">{data.armsTotal - data.armsReady} class(es) are still waiting on scores and are not included in the average.</p>}
        </>);
    }
    if (id === 'attendance') {
        return (<>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Attendance rate" value={percent(data.overallRate)} />
                <Stat label="Pupil-days present" value={num(data.totals.present + data.totals.late)} note={`${num(data.totals.late)} late`} />
                <Stat label="Absences" value={num(data.totals.absent)} note={`${num(data.totals.excused)} excused`} />
                <Stat label="Frequent absentees" value={num(data.frequentAbsentees)} note="3 or more absences" />
            </div>
            <div className="mt-3">{data.byClass.map(c => <Bar key={c.className} label={c.className} value={c.rate} right={percent(c.rate)} />)}</div>
        </>);
    }
    if (id === 'finance') {
        return (<>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Billed" value={naira(data.expected)} note={`${num(data.invoices)} invoices`} />
                <Stat label="Collected" value={naira(data.collected)} />
                <Stat label="Outstanding" value={naira(data.outstanding)} />
                <Stat label="Collection rate" value={percent(data.collectionRate)} />
            </div>
            <div className="mt-3">{data.byClass.map(c => <Bar key={c.className} label={c.className} value={c.rate} right={`${percent(c.rate)} of ${naira(c.expected)}`} />)}</div>
            {data.byMethod.length > 0 && <Table head={['Payment method', 'Payments', 'Received in period']} rows={data.byMethod.map(m => [m.method.replace('_', ' '), num(m.count), naira(m.amount)])} />}
        </>);
    }
    if (id === 'events') {
        return data.events.length === 0 ? <p className="text-sm text-gray-500">No events fall in this period.</p>
            : <Table head={['Event', 'Type', 'Date']} rows={data.events.map(e => [e.name, e.type, e.endDate ? `${when(e.date)} to ${when(e.endDate)}` : when(e.date)])} />;
    }
    if (id === 'staff') {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Teachers" value={num(data.teachers)} />
                <Stat label="Parents" value={num(data.parents)} />
                <Stat label="Administrators" value={num(data.admins)} />
                <Stat label="Pupils per teacher" value={data.studentTeacherRatio ?? '—'} />
            </div>
        );
    }
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Announcements sent" value={num(data.announcementsSent)} />
            <Stat label="Messages delivered or attempted" value={num(data.messages)} />
            <Stat label="Failed" value={num(data.failed)} />
            <Stat label="Delivery rate" value={percent(data.deliveryRate)} />
        </div>
    );
}

export default function ReportsHubPage() {
    const { terms, currentTerm } = useAcademic();
    const [mode, setMode]         = useState('term');
    const [termId, setTermId]     = useState('');
    const [from, setFrom]         = useState('');
    const [to, setTo]             = useState('');
    const [picked, setPicked]     = useState(SECTION_DEFS.map(([id]) => id));
    const [title, setTitle]       = useState('Board report');
    const [preparedBy, setPreparedBy] = useState('');
    const [notes, setNotes]       = useState({});
    const [report, setReport]     = useState(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState(null);

    const effectiveTermId = termId || currentTerm?.id || '';
    const ready = mode === 'term' ? Boolean(effectiveTermId) : Boolean(from && to);

    const load = useCallback(async () => {
        if (!ready || picked.length === 0) return;
        setLoading(true); setError(null);
        try {
            const res = await getBoardReport(mode === 'term' ? { termId: effectiveTermId, sections: picked } : { from, to, sections: picked });
            setReport(res.data);
        } catch (e) {
            setError(e?.message);
        } finally {
            setLoading(false);
        }
    }, [ready, mode, effectiveTermId, from, to, picked]);

    useEffect(() => { load(); }, [load]);

    // Notes are remembered per period in this browser, so a half-written report survives a refresh
    const noteKey = report ? `board-notes:${report.school.code}:${report.period.from}:${report.period.to}` : null;
    useEffect(() => {
        if (!noteKey) return;
        try { setNotes(JSON.parse(localStorage.getItem(noteKey)) || {}); } catch { setNotes({}); }
    }, [noteKey]);
    const setNote = (id, value) => setNotes(prev => {
        const next = { ...prev, [id]: value };
        try { if (noteKey) localStorage.setItem(noteKey, JSON.stringify(next)); } catch { /* storage unavailable */ }
        return next;
    });

    const togglePicked = (id) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : SECTION_DEFS.map(([k]) => k).filter(k => k === id || p.includes(k))));
    const shown = useMemo(() => SECTION_DEFS.filter(([id]) => picked.includes(id) && report?.[id]), [picked, report]);

    return (
        <AdminLayout>
            <div className="flex flex-col gap-5">
                <div className="print:hidden flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><BarChart3 size={20} className="text-green-600" /> Reports</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Build the board report: pick the period and sections, add your notes, then export it as a PDF.</p>
                        </div>
                        <div className="flex gap-2 self-start">
                            <button type="button" onClick={load} disabled={loading || !ready} className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </button>
                            <button type="button" onClick={() => window.print()} disabled={!report}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40">
                                <Printer size={15} /> Export PDF
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-4 grid gap-4 lg:grid-cols-2">
                        <div className="flex flex-col gap-3">
                            <div className="inline-flex bg-gray-100 rounded-xl p-1 self-start">
                                {[['term', 'By term'], ['range', 'Custom dates']].map(([v, l]) => (
                                    <button key={v} type="button" onClick={() => setMode(v)} className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${mode === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>{l}</button>
                                ))}
                            </div>
                            {mode === 'term' ? (
                                <div><label htmlFor="br-term" className="block text-xs font-medium text-gray-500 mb-1">Term</label>
                                    <select id="br-term" value={effectiveTermId} onChange={e => setTermId(e.target.value)} className={`${inputClass} w-full`}>
                                        {(terms ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select></div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label htmlFor="br-from" className="block text-xs font-medium text-gray-500 mb-1">From</label><input id="br-from" type="date" value={from} onChange={e => setFrom(e.target.value)} className={`${inputClass} w-full`} /></div>
                                    <div><label htmlFor="br-to" className="block text-xs font-medium text-gray-500 mb-1">To</label><input id="br-to" type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={`${inputClass} w-full`} /></div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div><label htmlFor="br-title" className="block text-xs font-medium text-gray-500 mb-1">Report title</label><input id="br-title" value={title} onChange={e => setTitle(e.target.value)} className={`${inputClass} w-full`} /></div>
                                <div><label htmlFor="br-by" className="block text-xs font-medium text-gray-500 mb-1">Prepared by</label><input id="br-by" value={preparedBy} onChange={e => setPreparedBy(e.target.value)} placeholder="Name and role" className={`${inputClass} w-full`} /></div>
                            </div>
                        </div>
                        <fieldset>
                            <legend className="text-xs font-medium text-gray-500 mb-1">Sections to include</legend>
                            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                {SECTION_DEFS.map(([id, label]) => (
                                    <label key={id} className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={picked.includes(id)} onChange={() => togglePicked(id)} /> {label}</label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">For per-class detail, see <Link to={ROUTES.financeReports} className="text-blue-700 font-semibold hover:underline">Finance reports</Link>.</p>
                        </fieldset>
                    </div>
                </div>

                {loading && !report && <div className="flex items-center justify-center py-16 print:hidden"><Loader2 size={24} className="animate-spin text-blue-500" /></div>}
                {error && <div className="bg-white border border-gray-200 rounded-2xl print:hidden"><EmptyState variant="error" description={error} onRetry={load} /></div>}
                {!error && !ready && <div className="bg-white border border-gray-200 rounded-2xl print:hidden"><EmptyState variant="first-use" title="Choose a period" description="Pick a term, or a start and end date, to build the report." /></div>}
                {!error && ready && picked.length === 0 && <div className="bg-white border border-gray-200 rounded-2xl print:hidden"><EmptyState variant="filtered" title="No sections selected" description="Tick at least one section to include." /></div>}

                {!error && report && (
                    <article id="board-report-print-zone" className={`bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 ${loading ? 'opacity-60' : ''}`}>
                        <header className="border-b-4 border-blue-900 pb-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{report.school.name}</p>
                            <h1 className="text-2xl font-bold text-gray-900 mt-1">{title || 'Board report'}</h1>
                            <p className="text-sm text-gray-600 mt-1">{report.period.label} · {report.period.from} to {report.period.to}</p>
                            <p className="text-xs text-gray-400 mt-1">Generated {when(report.generatedAt)}{preparedBy ? ` · Prepared by ${preparedBy}` : ''}</p>
                        </header>
                        {shown.map(([id]) => (
                            <Section key={id} id={id} title={SECTION_TITLE[id]} note={notes[id] || ''} onNote={(v) => setNote(id, v)}>
                                <Body id={id} data={report[id]} />
                            </Section>
                        ))}
                    </article>
                )}
            </div>
        </AdminLayout>
    );
}
