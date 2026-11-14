import React, { useCallback, useEffect, useState } from 'react';
import { Plus, FolderArchive, AlertCircle, Clock } from 'lucide-react';
import { default as Loader2 } from '@/components/brand/LoaderIcon.jsx';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import SettingsBreadcrumb from '../../components/ui/SettingsBreadcrumb.jsx';
import { Drawer, Field, inputClass, ConfirmDestructiveDialog, EmptyState, DetailSkeleton } from '../../../../../components/patterns';
import { notify } from '@/components/patterns/toastBus.js';
import { formatSchoolDate } from '../../../../../utils/schoolLocale.js';
import {
    listDocumentTypes, createDocumentType, updateDocumentType, deleteDocumentType,
    listStarters, addStarters, listRetentionReview, extendRetention, deleteDocument,
} from '../../services/documentsAPI.js';

const AUDIENCES = [['applicant', 'Applicants'], ['student', 'Students'], ['staff', 'Staff']];
const FILE_KINDS = [['application/pdf', 'PDF'], ['image/jpeg', 'JPEG'], ['image/png', 'PNG'], ['image/webp', 'WebP']];
const EMPTY = { name: '', description: '', appliesTo: ['applicant'], required: false, allowedMimeTypes: FILE_KINDS.map(([m]) => m), maxSizeMb: 5, keepForever: true, retentionMonths: 12, retentionFrom: 'upload', isActive: true };

const btnPrimary = 'flex-1 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center justify-center gap-2';
const btnGhost = 'flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50';

const FROM_LABEL = { upload: 'the upload', decision: 'the application is declined', departure: 'the student leaves' };
const retentionLabel = (m, from = 'upload') => {
    if (!m) return 'Kept until you delete it';
    const span = m % 12 === 0 ? `${m / 12} year${m === 12 ? '' : 's'}` : `${m} month${m === 1 ? '' : 's'}`;
    return `Reviewed ${span} after ${FROM_LABEL[from] || FROM_LABEL.upload}`;
};
// A clock that starts on a decision needs a type for applicants alone; one that starts on departure, students alone.
const basesFor = (appliesTo) => [
    ['upload', 'The file is uploaded'],
    ...(appliesTo.length === 1 && appliesTo[0] === 'applicant' ? [['decision', 'The application is declined']] : []),
    ...(appliesTo.length === 1 && appliesTo[0] === 'student' ? [['departure', 'The student leaves (is deactivated)']] : []),
];
const audienceLabel = (list) => AUDIENCES.filter(([k]) => list.includes(k)).map(([, l]) => l.toLowerCase()).join(', ');

function Check({ checked, onChange, children, disabled }) {
    return (
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="rounded border-gray-300" />
            {children}
        </label>
    );
}

function DocumentsContent() {
    const [types, setTypes] = useState(null);
    const [error, setError] = useState('');
    const [starters, setStarters] = useState(null);
    const [pickedStarters, setPickedStarters] = useState([]);
    const [review, setReview] = useState([]);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [toDelete, setToDelete] = useState(null);
    const [working, setWorking] = useState(null);

    const load = useCallback(async () => {
        try {
            const [t, r] = await Promise.all([listDocumentTypes(), listRetentionReview()]);
            setTypes(t); setReview(r); setError('');
        } catch (e) { setError(e.message); }
    }, []);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { listStarters().then(setStarters).catch(() => setStarters([])); }, []);

    const openNew = () => { setEditing(null); setForm(EMPTY); setFormError(''); setFormOpen(true); };
    const openEdit = (t) => {
        setEditing(t);
        setForm({
            name: t.name, description: t.description, appliesTo: t.appliesTo, required: t.required,
            allowedMimeTypes: t.allowedMimeTypes, maxSizeMb: t.maxSizeMb,
            keepForever: !t.retentionMonths, retentionMonths: t.retentionMonths || 12, retentionFrom: t.retentionFrom || 'upload', isActive: t.isActive,
        });
        setFormError(''); setFormOpen(true);
    };
    const toggleIn = (key, value) => setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));

    const save = async () => {
        if (!form.name.trim()) return setFormError('Give the document type a name.');
        if (form.appliesTo.length === 0) return setFormError('Choose who it applies to.');
        if (form.allowedMimeTypes.length === 0) return setFormError('Allow at least one file type.');
        const body = {
            name: form.name.trim(), description: form.description.trim(), appliesTo: form.appliesTo, required: form.required,
            allowedMimeTypes: form.allowedMimeTypes, maxSizeMb: Number(form.maxSizeMb),
            retentionMonths: form.keepForever ? null : Number(form.retentionMonths),
            // With files stored the starting point is locked: send it unchanged, so a clash with the audience reads clearly
            retentionFrom: editing?.documentCount ? editing.retentionFrom : (basesFor(form.appliesTo).some(([k]) => k === form.retentionFrom) ? form.retentionFrom : 'upload'),
            isActive: form.isActive,
        };
        setSaving(true); setFormError('');
        try {
            if (editing) await updateDocumentType(editing.id, body); else await createDocumentType(body);
            notify.success(editing ? 'Document type updated.' : 'Document type added.');
            setFormOpen(false);
            await load();
        } catch (e) { setFormError(e.message); } finally { setSaving(false); }
    };

    const toggleActive = async (t) => {
        setWorking(t.id);
        try { await updateDocumentType(t.id, { isActive: !t.isActive }); await load(); }
        catch (e) { notify.error(e.message); } finally { setWorking(null); }
    };

    const confirmDelete = async () => {
        await deleteDocumentType(toDelete.id);
        notify.success('Document type deleted.');
        setToDelete(null);
        await load();
    };

    const addPicked = async () => {
        setWorking('starters');
        try {
            const res = await addStarters(pickedStarters);
            notify.success(res.added ? `${res.added} document type${res.added === 1 ? '' : 's'} added. Review them and mark what is required.` : 'Those are already set up.');
            setPickedStarters([]);
            await load();
        } catch (e) { notify.error(e.message); } finally { setWorking(null); }
    };

    const removeFlagged = async (doc) => {
        setWorking(doc.id);
        try { await deleteDocument(doc.id); notify.success('File deleted.'); await load(); }
        catch (e) { notify.error(e.message); } finally { setWorking(null); }
    };

    const keep = async (doc, months) => {
        setWorking(doc.id);
        try { await extendRetention(doc.id, months); notify.success('Kept for longer.'); await load(); }
        catch (e) { notify.error(e.message); } finally { setWorking(null); }
    };

    if (!types && !error) return <DetailSkeleton />;
    if (error && !types) return <p className="text-sm text-red-600">{error}</p>;

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
                    <p className="text-sm text-gray-500 mt-1 max-w-xl">
                        Set up the documents your school keeps for applicants, students and staff. Mark what is required for admission, and how long each kind of file is kept before it is reviewed. Nothing is deleted automatically.
                    </p>
                </div>
                <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700"><Plus size={16} /> Add document type</button>
            </div>

            {review.length > 0 && (
                <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5" aria-label="Retention review">
                    <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2"><Clock size={16} /> {review.length} file{review.length === 1 ? ' is' : 's are'} past the retention period</h2>
                    <p className="text-xs text-amber-800 mt-1">Review each file: delete it, or keep it for longer. Nothing is removed for you.</p>
                    <ul className="mt-3 divide-y divide-amber-200">
                        {review.map((d) => (
                            <li key={d.id} className="py-2.5 flex items-center gap-3 flex-wrap">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{d.ownerName} · {d.typeName}</p>
                                    <p className="text-xs text-gray-600">{d.fileName} · was due {formatSchoolDate(d.retainUntil)} ({d.ownerType})</p>
                                </div>
                                <select aria-label={`Keep ${d.fileName} for`} disabled={working === d.id} defaultValue="" onChange={(e) => e.target.value && keep(d, Number(e.target.value))}
                                    className="text-xs font-semibold border border-amber-300 rounded-lg px-2 py-1.5 bg-white">
                                    <option value="">Keep for…</option>
                                    <option value="6">6 more months</option>
                                    <option value="12">1 more year</option>
                                    <option value="24">2 more years</option>
                                    <option value="60">5 more years</option>
                                </select>
                                <button onClick={() => removeFlagged(d)} disabled={working === d.id} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-red-700 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-50">Delete file</button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {types.length === 0 ? (
                <EmptyState icon={FolderArchive} title="No document types yet" description="Add your own, or start from the common ones below and change them to suit your school." />
            ) : (
                <ul className="flex flex-col gap-3">
                    {types.map((t) => (
                        <li key={t.id} className={`bg-white border border-gray-200 rounded-2xl p-5 ${t.isActive ? '' : 'opacity-60'}`}>
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900">
                                        {t.name}
                                        {t.required && <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-amber-700">Required</span>}
                                        {!t.isActive && <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">Switched off</span>}
                                    </p>
                                    {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                                    <p className="text-xs text-gray-500 mt-2">For {audienceLabel(t.appliesTo)} · {t.allowedMimeTypes.map((m) => FILE_KINDS.find(([k]) => k === m)?.[1] || m).join(', ')} · up to {t.maxSizeMb} MB · {retentionLabel(t.retentionMonths, t.retentionFrom)}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{t.documentCount} file{t.documentCount === 1 ? '' : 's'} stored</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => openEdit(t)} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200">Edit</button>
                                    <button onClick={() => toggleActive(t)} disabled={working === t.id} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50">{t.isActive ? 'Switch off' : 'Switch on'}</button>
                                    <button onClick={() => (t.documentCount ? notify.info('Files are stored under this type. Switch it off instead of deleting it.') : setToDelete(t))} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-gray-500 hover:text-red-600">Delete</button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {starters && starters.length > 0 && (
                <section className="bg-white border border-gray-200 rounded-2xl p-5">
                    <h2 className="text-sm font-bold text-gray-900">Start from common documents</h2>
                    <p className="text-xs text-gray-500 mt-1">Tick the ones you want. They are added as ordinary types that you can rename, change or delete, and none is marked required.</p>
                    <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2">
                        {starters.map((s) => (
                            <Check key={s.key} checked={pickedStarters.includes(s.key)} onChange={(on) => setPickedStarters((p) => (on ? [...p, s.key] : p.filter((k) => k !== s.key)))}>
                                <span><span className="font-medium">{s.name}</span><span className="text-xs text-gray-400"> · {audienceLabel(s.appliesTo)}</span></span>
                            </Check>
                        ))}
                    </div>
                    <button onClick={addPicked} disabled={pickedStarters.length === 0 || working === 'starters'} className="mt-4 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                        {working === 'starters' ? 'Adding…' : `Add ${pickedStarters.length || ''} selected`.replace('  ', ' ')}
                    </button>
                </section>
            )}

            <Drawer
                open={formOpen}
                onClose={() => !saving && setFormOpen(false)}
                title={editing ? 'Edit document type' : 'Add document type'}
                footer={
                    <>
                        <button onClick={() => setFormOpen(false)} disabled={saving} className={btnGhost}>Cancel</button>
                        <button onClick={save} disabled={saving} className={btnPrimary}>{saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Saving…' : 'Save'}</button>
                    </>
                }
            >
                {formError && <div role="alert" className="flex gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{formError}</div>}
                <Field label="Name" required htmlFor="dt-name">
                    <input id="dt-name" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass(false)} />
                </Field>
                <Field label="Description" htmlFor="dt-desc" hint="Shown to staff when they upload">
                    <input id="dt-desc" value={form.description} maxLength={300} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass(false)} />
                </Field>
                <Field label="Who it applies to" required>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {AUDIENCES.map(([k, l]) => <Check key={k} checked={form.appliesTo.includes(k)} onChange={() => toggleIn('appliesTo', k)}>{l}</Check>)}
                    </div>
                </Field>
                <Check checked={form.required} onChange={(v) => setForm({ ...form, required: v })}>
                    Required <span className="text-xs text-gray-400">(for applicants, this is an admission requirement)</span>
                </Check>
                <Field label="Accepted file types" required>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {FILE_KINDS.map(([k, l]) => <Check key={k} checked={form.allowedMimeTypes.includes(k)} onChange={() => toggleIn('allowedMimeTypes', k)}>{l}</Check>)}
                    </div>
                </Field>
                <Field label="Largest file (MB)" htmlFor="dt-size" hint="Up to 10">
                    <input id="dt-size" type="number" min={1} max={10} value={form.maxSizeMb} onChange={(e) => setForm({ ...form, maxSizeMb: e.target.value })} className={inputClass(false)} />
                </Field>
                <Field label="Retention" hint="After this, the file is flagged for you to review. It is never deleted for you. Choosing applicants alone or students alone unlocks counting from the decision or the departure. Changing the months applies to files that have no review date yet. Files that already have one keep it. Once files are stored the starting point is fixed, so add a new type for a new rule.">
                    <div className="flex flex-col gap-2">
                        <Check checked={form.keepForever} onChange={(v) => setForm({ ...form, keepForever: v })}>Keep until I delete it</Check>
                        {!form.keepForever && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                Review after
                                <input aria-label="Months" type="number" min={1} max={1200} value={form.retentionMonths} onChange={(e) => setForm({ ...form, retentionMonths: e.target.value })} className={`${inputClass(false)} w-24`} />
                                months after
                                <select aria-label="Retention starts" disabled={Boolean(editing?.documentCount)} title={editing?.documentCount ? 'Files are stored under this type, so the starting point cannot change' : undefined} value={basesFor(form.appliesTo).some(([k]) => k === form.retentionFrom) ? form.retentionFrom : 'upload'}
                                    onChange={(e) => setForm({ ...form, retentionFrom: e.target.value })} className={`${inputClass(false)} w-auto`}>
                                    {basesFor(form.appliesTo).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </Field>
                {editing && <Check checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })}>Switched on</Check>}
            </Drawer>

            <ConfirmDestructiveDialog
                open={!!toDelete}
                onClose={() => setToDelete(null)}
                verb="Delete"
                noun="document type"
                recordName={toDelete?.name || ''}
                requireReason={false}
                consequence="The type is removed. It has no files stored."
                onConfirm={confirmDelete}
            />
        </div>
    );
}

export default function DocumentsSettingsPage() {
    return (
        <AdminLayout>
            <SettingsBreadcrumb section="Documents" />
            <DocumentsContent />
        </AdminLayout>
    );
}
