import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpenText, FileText, Download, Search } from 'lucide-react';
import { default as Loader2 } from '@/components/brand/LoaderIcon.jsx';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { Drawer, EmptyState, inputClass, pushToast } from '../../../../../components/patterns';
import { formatSchoolDate } from '../../../../../utils/schoolLocale.js';
import openSignedLink from '../../../../../utils/openSignedLink.js';
import { listLessonPlans, getLessonPlan, getAdminFileLink, getLessonPlanFilters } from '../../services/lessonPlansAdminAPI.js';

const kb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default function LessonPlansPage() {
    const [plans, setPlans] = useState(null);
    const [truncated, setTruncated] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState({ classId: '', subjectId: '', teacherId: '', q: '' });
    const [menus, setMenus] = useState({ classes: [], subjects: [], teachers: [] });   // everything that has a plan, from the server
    const [open, setOpen] = useState(null);       // the plan being read
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [busyFile, setBusyFile] = useState(null);
    const readSeq = useRef(0);   // bumped on every open and close, so a late answer for an earlier click is ignored
    const loadSeq = useRef(0);

    // Filters are applied by the server, so a long list is never silently cut off
    const load = useCallback(async () => {
        const seq = ++loadSeq.current;
        try {
            const active = Object.fromEntries(Object.entries(filter).filter(([, v]) => String(v).trim()));
            const res = await listLessonPlans(active);
            if (seq !== loadSeq.current) return;
            setPlans(res.plans); setTruncated(Boolean(res.truncated)); setError('');
        } catch (e) { if (seq === loadSeq.current) setError(e.message); }
    }, [filter]);
    useEffect(() => { getLessonPlanFilters().then(setMenus).catch(() => {}); }, []);
    useEffect(() => {
        const wait = setTimeout(load, filter.q ? 300 : 0); // typing in the search box waits a moment
        return () => clearTimeout(wait);
    }, [load, filter.q]);

    const filtering = Object.values(filter).some((v) => String(v).trim());
    const visible = plans || [];

    const read = async (summary) => {
        const seq = ++readSeq.current;
        setOpen({ ...summary, files: [], objectives: '', content: '' });
        setLoadingPlan(true);
        try {
            const full = await getLessonPlan(summary.id);
            if (seq === readSeq.current) setOpen(full);
        } catch (e) {
            if (seq === readSeq.current) { pushToast({ message: e.message, type: 'error' }); setOpen(null); }
        } finally { if (seq === readSeq.current) setLoadingPlan(false); }
    };
    const closeRead = () => { readSeq.current += 1; setOpen(null); setLoadingPlan(false); };

    const openFile = async (f) => {
        setBusyFile(f.id);
        try { openSignedLink((await getAdminFileLink(open.id, f.id)).url); }
        catch (e) { pushToast({ message: e.message, type: 'error' }); }
        finally { setBusyFile(null); }
    };

    return (
        <AdminLayout>
            <div className="flex flex-col gap-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Lesson plans</h1>
                    <p className="text-sm text-gray-500 mt-1 max-w-2xl">Every lesson plan your teachers have written, for review. This page is read-only. Opening an attached file is recorded in the Audit Log.</p>
                </div>

                {(plans || filtering) && (
                    <div className="flex gap-3 flex-wrap items-center">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input aria-label="Search plans" placeholder="Search by title" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} className={`${inputClass(false)} pl-8 w-64`} />
                        </div>
                        <select aria-label="Filter by class" value={filter.classId} onChange={(e) => setFilter({ ...filter, classId: e.target.value })} className={`${inputClass(false)} w-auto`}>
                            <option value="">All classes</option>
                            {menus.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select aria-label="Filter by subject" value={filter.subjectId} onChange={(e) => setFilter({ ...filter, subjectId: e.target.value })} className={`${inputClass(false)} w-auto`}>
                            <option value="">All subjects</option>
                            {menus.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select aria-label="Filter by teacher" value={filter.teacherId} onChange={(e) => setFilter({ ...filter, teacherId: e.target.value })} className={`${inputClass(false)} w-auto`}>
                            <option value="">All teachers</option>
                            {menus.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                )}

                {error && <div className="bg-white border border-gray-200 rounded-2xl"><EmptyState variant="error" description={error} onRetry={load} /></div>}
                {!error && !plans && <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</p>}
                {!error && plans && plans.length === 0 && !filtering && (
                    <div className="bg-white border border-gray-200 rounded-2xl">
                        <EmptyState icon={BookOpenText} title="No lesson plans yet" description="Teachers write their plans under Lesson Plans in their own dashboard. They will appear here." />
                    </div>
                )}
                {!error && plans && plans.length === 0 && filtering && <p className="text-sm text-gray-500">No plans match those filters.</p>}
                {!error && truncated && (
                    <p role="status" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">Showing the 200 most recently updated plans. Use the search or the filters to find older ones.</p>
                )}

                {visible.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                                    <th className="px-4 py-3">Title</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Subject</th>
                                    <th className="px-4 py-3">Teacher</th><th className="px-4 py-3">Week</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Files</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((p) => (
                                    <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => read(p)}>
                                        <td className="px-4 py-3 font-semibold text-gray-900">
                                            <button className="text-left hover:text-blue-700" onClick={(e) => { e.stopPropagation(); read(p); }}>{p.title}</button>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{p.className}{p.armName ? ` ${p.armName}` : ''}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.subjectName}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.teacherName}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.weekNumber ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-500">{formatSchoolDate(p.updatedAt)}</td>
                                        <td className="px-4 py-3 text-gray-500">{p.fileCount || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Drawer
                open={!!open}
                onClose={closeRead}
                title={open?.title || 'Lesson plan'}
                subtitle={open ? `${open.subjectName} · ${open.className}${open.armName ? ` ${open.armName}` : ''} · ${open.teacherName}` : ''}
                footer={<button onClick={closeRead} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Close</button>}
            >
                {loadingPlan && <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</p>}
                {open && !loadingPlan && (
                    <>
                        <p className="text-xs text-gray-500">
                            {open.termName ? `${open.termName} · ` : ''}{open.weekNumber ? `Week ${open.weekNumber} · ` : ''}Updated {formatSchoolDate(open.updatedAt)}
                        </p>
                        {open.objectives && <section><h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Objectives</h3><p className="text-sm text-gray-800 whitespace-pre-wrap">{open.objectives}</p></section>}
                        <section><h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Lesson notes</h3>
                            {open.content ? <p className="text-sm text-gray-800 whitespace-pre-wrap">{open.content}</p> : <p className="text-sm text-gray-400">No notes written.</p>}
                        </section>
                        <section className="flex flex-col gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Files</h3>
                            {open.files.length === 0 && <p className="text-sm text-gray-400">No files attached.</p>}
                            {open.files.map((f) => (
                                <div key={f.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                    <FileText size={15} className="text-gray-400 shrink-0" />
                                    <div className="min-w-0 flex-1"><p className="text-[13px] font-medium text-gray-800 truncate">{f.fileName}</p><p className="text-[11px] text-gray-500">{kb(f.sizeBytes)}</p></div>
                                    <button onClick={() => openFile(f)} disabled={busyFile === f.id} aria-label={`Download ${f.fileName}`} className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                                        {busyFile === f.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                                    </button>
                                </div>
                            ))}
                        </section>
                    </>
                )}
            </Drawer>
        </AdminLayout>
    );
}
