import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, FileText, Upload, Download, Trash2, AlertCircle, BookOpenText } from 'lucide-react';
import { default as Loader2 } from '@/components/brand/LoaderIcon.jsx';
import TeacherLayout from './components/layout/TeacherLayout.jsx';
import { Drawer, Field, inputClass, ConfirmDestructiveDialog, EmptyState, pushToast } from '../../../components/patterns';
import { formatSchoolDate } from '../../../utils/schoolLocale.js';
import openSignedLink from '../../../utils/openSignedLink.js';
import {
    getLessonPlanOptions, listMyLessonPlans, getMyLessonPlan, createLessonPlan, updateLessonPlan, deleteLessonPlan,
    uploadLessonFile, getMyFileLink, deleteLessonFile,
} from './services/lessonPlansAPI.js';

const EMPTY = { classId: '', armId: '', subjectId: '', termId: '', weekNumber: '', title: '', objectives: '', content: '' };
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.docx,.pptx';
const MAX_FILES = 5;
const MAX_MB = 10;

const kb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const btnPrimary = 'flex-1 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center justify-center gap-2';
const btnGhost = 'flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50';

export default function LessonPlansPage() {
    const [options, setOptions] = useState(null);
    const [plans, setPlans] = useState(null);
    const [truncated, setTruncated] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState({ classId: '', subjectId: '' });

    const [open, setOpen] = useState(false);
    const [plan, setPlan] = useState(null);          // the saved plan being edited (null while writing a new one)
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [busyFile, setBusyFile] = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const fileInput = useRef(null);
    const activeId = useRef(null); // the plan the drawer is showing now. A late answer for any other plan is ignored.

    const loadSeq = useRef(0);
    const refreshSeq = useRef(0);
    const filtering = Boolean(filter.classId || filter.subjectId);

    // Class and subject filters are applied by the server, so a long list is never silently cut off
    const load = useCallback(async () => {
        const seq = ++loadSeq.current;
        try {
            const active = Object.fromEntries(Object.entries(filter).filter(([, v]) => v));
            const [opts, res] = await Promise.all([getLessonPlanOptions(), listMyLessonPlans(active)]);
            if (seq !== loadSeq.current) return;
            setOptions(opts); setPlans(res.plans); setTruncated(Boolean(res.truncated)); setError('');
        } catch (e) { if (seq === loadSeq.current) setError(e.message); }
    }, [filter]);
    useEffect(() => { load(); }, [load]);

    const visible = plans || [];
    // One file or save operation at a time: every file button, Save, Delete and Close wait for it to finish
    const working = saving || !!busyFile;

    const armsOfClass = useMemo(() => (options?.arms || []).filter((a) => a.classId === form.classId), [options, form.classId]);
    const currentTerm = options?.terms?.find((t) => t.isCurrent);

    const openNew = () => {
        activeId.current = null;
        setPlan(null); setFormError('');
        setForm({
            ...EMPTY,
            classId: filter.classId || (options?.classes?.length === 1 ? options.classes[0].id : ''),
            subjectId: filter.subjectId || (options?.subjects?.length === 1 ? options.subjects[0].id : ''),
            termId: currentTerm?.id || '',
        });
        setOpen(true);
    };

    const openPlan = async (summary) => {
        activeId.current = summary.id;
        setFormError(''); setOpen(true); setPlan(null);
        setForm({ ...EMPTY, title: summary.title });
        try {
            const full = await getMyLessonPlan(summary.id);
            if (activeId.current !== summary.id) return;
            setPlan(full);
            setForm({
                classId: full.classId, armId: full.armId || '', subjectId: full.subjectId, termId: full.termId || '',
                weekNumber: full.weekNumber ?? '', title: full.title, objectives: full.objectives, content: full.content,
            });
        } catch (e) { if (activeId.current === summary.id) setFormError(e.message); }
    };

    const body = () => ({
        title: form.title.trim(), objectives: form.objectives, content: form.content,
        classId: form.classId, armId: form.armId || null, subjectId: form.subjectId, termId: form.termId || null,
        weekNumber: form.weekNumber === '' ? null : Number(form.weekNumber),
    });

    const save = async () => {
        if (!form.title.trim()) return setFormError('Give the lesson plan a title.');
        if (!form.classId || !form.subjectId) return setFormError('Choose a class and a subject.');
        setSaving(true); setFormError('');
        try {
            if (plan) {
                setPlan(await updateLessonPlan(plan.id, body()));
                pushToast({ message: 'Lesson plan saved.', type: 'success' });
            } else {
                // Stay open after the first save so files can be attached to the new plan
                const created = await createLessonPlan(body());
                activeId.current = created.id;
                setPlan(created);
                pushToast({ message: 'Lesson plan saved. You can now attach files.', type: 'success' });
            }
            await load();
        } catch (e) { setFormError(e.message); } finally { setSaving(false); }
    };

    // Re-reads one plan. If the drawer has moved on to another plan meanwhile, the answer is dropped.
    const refreshPlan = async (id) => {
        const seq = ++refreshSeq.current;
        const full = await getMyLessonPlan(id);
        if (activeId.current === id && seq === refreshSeq.current) setPlan(full);
        await load();
    };

    const onPick = async (file) => {
        if (!file || !plan || working) return;
        if (file.size > MAX_MB * 1024 * 1024) { pushToast({ message: `That file is larger than ${MAX_MB} MB.`, type: 'error' }); return; }
        const id = plan.id;
        setBusyFile('upload');
        try { await uploadLessonFile(id, file); pushToast({ message: 'File attached.', type: 'success' }); await refreshPlan(id); }
        catch (e) { pushToast({ message: e.message, type: 'error' }); }
        finally { setBusyFile(null); if (fileInput.current) fileInput.current.value = ''; }
    };

    const openFile = async (f) => {
        if (working) return;
        setBusyFile(f.id);
        try { openSignedLink((await getMyFileLink(plan.id, f.id)).url); }
        catch (e) { pushToast({ message: e.message, type: 'error' }); }
        finally { setBusyFile(null); }
    };

    const removeFile = async (f) => {
        if (working) return;
        const id = plan.id;
        setBusyFile(f.id);
        try { await deleteLessonFile(id, f.id); pushToast({ message: 'File deleted.', type: 'success' }); await refreshPlan(id); }
        catch (e) { pushToast({ message: e.message, type: 'error' }); }
        finally { setBusyFile(null); }
    };

    const confirmDelete = async () => {
        const res = await deleteLessonPlan(toDelete.id);
        pushToast({
            message: res?.filesLeftInStorage ? 'Lesson plan deleted. Some of its files could not be removed from storage yet.' : 'Lesson plan deleted.',
            type: 'success',
        });
        setToDelete(null);
        if (plan && plan.id === toDelete.id) { activeId.current = null; setOpen(false); }
        await load();
    };

    const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

    return (
        <TeacherLayout>
            <div className="flex flex-col gap-5 max-w-4xl">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Lesson plans</h1>
                        <p className="text-sm text-gray-500 mt-1 max-w-xl">Write your plans and notes for each class and subject, and attach the files you use. Only you and your school administrators can see them.</p>
                    </div>
                    <button onClick={openNew} disabled={!options || options.classes.length === 0 || options.subjects.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                        <Plus size={16} /> New lesson plan
                    </button>
                </div>

                {options && (options.classes.length === 0 || options.subjects.length === 0) && (
                    <p role="status" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        You have not been assigned {options.classes.length === 0 ? 'a class' : 'a subject'} yet. Ask your school administrator to assign you, then you can write lesson plans.
                    </p>
                )}

                {options && (plans?.length > 0 || filtering) && (
                    <div className="flex gap-3 flex-wrap">
                        <select aria-label="Filter by class" value={filter.classId} onChange={(e) => setFilter({ ...filter, classId: e.target.value })} className={`${inputClass(false)} w-auto`}>
                            <option value="">All classes</option>
                            {options.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select aria-label="Filter by subject" value={filter.subjectId} onChange={(e) => setFilter({ ...filter, subjectId: e.target.value })} className={`${inputClass(false)} w-auto`}>
                            <option value="">All subjects</option>
                            {options.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                )}

                {error && <div className="bg-white border border-gray-200 rounded-2xl"><EmptyState variant="error" description={error} onRetry={load} /></div>}
                {!error && !plans && <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</p>}
                {!error && plans && plans.length === 0 && !filtering && (
                    <div className="bg-white border border-gray-200 rounded-2xl">
                        <EmptyState icon={BookOpenText} title="No lesson plans yet" description="Write your first plan for a class and subject. You can attach a PDF, Word or PowerPoint file, or images."
                            action={options && options.classes.length && options.subjects.length ? { label: 'New lesson plan', onClick: openNew } : undefined} />
                    </div>
                )}
                {!error && plans && plans.length === 0 && filtering && <p className="text-sm text-gray-500">No plans match that class and subject.</p>}
                {!error && truncated && (
                    <p role="status" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">Showing your 200 most recently updated plans. Use the class and subject filters to find older ones.</p>
                )}

                <ul className="grid gap-3 sm:grid-cols-2">
                    {visible.map((p) => (
                        <li key={p.id}>
                            <button onClick={() => openPlan(p)} className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-sm transition">
                                <p className="text-sm font-bold text-gray-900">{p.title}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {p.subjectName} · {p.className}{p.armName ? ` ${p.armName}` : ''}{p.weekNumber ? ` · Week ${p.weekNumber}` : ''}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-2">
                                    {p.termName ? `${p.termName} · ` : ''}Updated {formatSchoolDate(p.updatedAt)}{p.fileCount ? ` · ${p.fileCount} file${p.fileCount === 1 ? '' : 's'}` : ''}
                                </p>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            <Drawer
                open={open}
                onClose={() => { if (!working) setOpen(false); }}
                title={plan ? 'Lesson plan' : 'New lesson plan'}
                subtitle={plan ? `${plan.subjectName} · ${plan.className}` : ''}
                footer={
                    <>
                        {plan && <button onClick={() => setToDelete(plan)} disabled={working} className="px-3 py-2.5 rounded-lg text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Delete</button>}
                        <button onClick={() => setOpen(false)} disabled={working} className={btnGhost}>Close</button>
                        <button onClick={save} disabled={working} className={btnPrimary}>{saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Saving…' : 'Save'}</button>
                    </>
                }
            >
                {formError && <div role="alert" className="flex gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{formError}</div>}

                <Field label="Title" required htmlFor="lp-title"><input id="lp-title" maxLength={150} className={inputClass(false)} {...field('title')} /></Field>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Class" required htmlFor="lp-class">
                        <select id="lp-class" className={inputClass(false)} value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value, armId: '' })}>
                            <option value="">Choose</option>
                            {(options?.classes || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Subject" required htmlFor="lp-subject">
                        <select id="lp-subject" className={inputClass(false)} {...field('subjectId')}>
                            <option value="">Choose</option>
                            {(options?.subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Arm" htmlFor="lp-arm" hint={form.classId && armsOfClass.length === 0 ? 'This class has no arms' : 'Leave empty for every arm'}>
                        <select id="lp-arm" className={inputClass(false)} disabled={armsOfClass.length === 0} {...field('armId')}>
                            <option value="">All arms</option>
                            {armsOfClass.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Term" htmlFor="lp-term">
                        <select id="lp-term" className={inputClass(false)} {...field('termId')}>
                            <option value="">Not set</option>
                            {(options?.terms || []).map((t) => <option key={t.id} value={t.id}>{t.name}{t.isCurrent ? ' (current)' : ''}</option>)}
                        </select>
                    </Field>
                    <Field label="Week" htmlFor="lp-week"><input id="lp-week" type="number" min={1} max={60} className={inputClass(false)} {...field('weekNumber')} /></Field>
                </div>

                <Field label="Objectives" htmlFor="lp-obj" hint="What pupils should be able to do by the end">
                    <textarea id="lp-obj" rows={3} maxLength={2000} className={inputClass(false)} {...field('objectives')} />
                </Field>
                <Field label="Lesson notes" htmlFor="lp-content">
                    <textarea id="lp-content" rows={10} maxLength={20000} className={inputClass(false)} {...field('content')} />
                </Field>

                <section className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-gray-900">Files</h3>
                    {!plan && <p className="text-xs text-gray-500">Save the plan first, then attach files.</p>}
                    {plan && plan.files.length === 0 && <p className="text-xs text-gray-500">No files attached.</p>}
                    {plan && plan.files.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                            <FileText size={15} className="text-gray-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-gray-800 truncate">{f.fileName}</p>
                                <p className="text-[11px] text-gray-500">{kb(f.sizeBytes)}</p>
                            </div>
                            <button onClick={() => openFile(f)} disabled={working} aria-label={`Download ${f.fileName}`} className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                                {busyFile === f.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                            </button>
                            <button onClick={() => removeFile(f)} disabled={working} aria-label={`Delete ${f.fileName}`} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                        </div>
                    ))}
                    {plan && plan.files.length < MAX_FILES && (
                        <div>
                            <input ref={fileInput} id="lp-file" type="file" accept={ACCEPT} disabled={working} className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
                            <label htmlFor="lp-file" className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer ${working ? 'opacity-50 pointer-events-none' : ''}`}>
                                {busyFile === 'upload' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                {busyFile === 'upload' ? 'Uploading…' : 'Attach a file'}
                            </label>
                            <p className="text-[11px] text-gray-400 mt-1.5">PDF, JPEG, PNG, WebP, Word (.docx) or PowerPoint (.pptx) · up to {MAX_MB} MB · {MAX_FILES} files per plan</p>
                        </div>
                    )}
                </section>
            </Drawer>

            <ConfirmDestructiveDialog
                open={!!toDelete}
                onClose={() => setToDelete(null)}
                verb="Delete"
                noun="lesson plan"
                recordName={toDelete?.title || ''}
                requireReason={false}
                consequence="The plan and its attached files are removed for good."
                onConfirm={confirmDelete}
            />
        </TeacherLayout>
    );
}
