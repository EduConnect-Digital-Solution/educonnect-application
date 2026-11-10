import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Loader2, AlertCircle } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import {
    pushToast, Field, Drawer, ConfirmDestructiveDialog, EmptyState, StatusChip, inputClass, useFieldErrors,
} from '../../../../../components/patterns';
import {
    listAnnouncements, createAnnouncement, updateAnnouncement, sendAnnouncement, deleteAnnouncement, getAudienceSize,
} from '../../services/announcementsAPI.js';
import { getSchoolClasses } from '../../services/classAPIs.js';
import { ROUTES } from '../../navigation/navConfig.js';

const AUDIENCES = [
    ['everyone', 'Everyone', 'All parents and teachers'],
    ['parents', 'Parents', 'All parents and guardians'],
    ['teachers', 'Teachers', 'All teachers'],
    ['classes', 'Specific classes', 'Parents of pupils in the classes you pick, and the teachers of those classes'],
];
const AUDIENCE_LABEL = Object.fromEntries(AUDIENCES.map(([v, l]) => [v, l]));
const STATUS = { draft: ['Draft', 'gray'], sending: ['Sending', 'amber'], sent: ['Sent', 'green'] };
const EMPTY = { title: '', body: '', audience: 'everyone', classIds: [], channels: ['email', 'in_app'] };

const validators = {
    title: (v) => (!v?.trim() ? 'Give the announcement a title' : v.length > 150 ? 'Keep the title under 150 characters' : null),
    body: (v) => (!v?.trim() ? 'Write the message' : v.length > 5000 ? 'The message is too long (5000 characters at most)' : null),
    classIds: (v, all) => (all.audience === 'classes' && (!v || v.length === 0) ? 'Pick at least one class' : null),
    channels: (v) => (!v || v.length === 0 ? 'Choose at least one way to deliver it' : null),
};

const btnPrimary = 'flex-1 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center justify-center gap-2';
const btnGhost = 'flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50';
// A send that has been 'sending' this long was interrupted and can be resumed (matches the server)
const STALE_SENDING_MS = 15 * 60 * 1000;
const rowBtn = 'px-2.5 py-1.5 text-xs font-semibold rounded-lg';

const serverMessage = (e) => {
    const details = Array.isArray(e?.errors) ? e.errors.map(x => x.message || x.msg).filter(Boolean) : [];
    return details.length ? [...new Set(details)].join(' · ') : e?.message;
};
const when = (value) => (value ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export default function AnnouncementsPage() {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
    const [classes, setClasses] = useState([]);

    const [formOpen, setFormOpen]   = useState(false);
    const [editing, setEditing]     = useState(null);
    const [form, setForm]           = useState(EMPTY);
    const [saving, setSaving]       = useState(false);
    const [formError, setFormError] = useState(null);
    const v = useFieldErrors(validators);

    const [sendFor, setSendFor]     = useState(null);
    const [audience, setAudience]   = useState(null); // { total, withEmail } | 'loading' | { error }
    const [sending, setSending]     = useState(false);
    const [sendError, setSendError] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const load = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        setError(null);
        try {
            const res = await listAnnouncements();
            setData(res.data.announcements);
        } catch (e) {
            setError(e?.message || 'Could not load announcements.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        getSchoolClasses().then(res => setClasses(res.data?.classes ?? [])).catch(() => setClasses([]));
    }, []);

    // While something is sending, poll until it finishes
    const anySending = (data || []).some(a => a.status === 'sending');
    useEffect(() => {
        if (!anySending) return undefined;
        const t = setInterval(() => load(true), 4000);
        return () => clearInterval(t);
    }, [anySending, load]);

    // How many people this reaches: shown while composing and before sending
    const countFor = useCallback((aud, classIds) => {
        if (aud === 'classes' && classIds.length === 0) { setAudience(null); return; }
        setAudience('loading');
        getAudienceSize(aud, classIds)
            .then(res => setAudience(res.data))
            .catch(e => setAudience({ error: serverMessage(e) }));
    }, []);

    useEffect(() => {
        if (!formOpen) return;
        const t = setTimeout(() => countFor(form.audience, form.classIds), 250);
        return () => clearTimeout(t);
    }, [formOpen, form.audience, form.classIds, countFor]);

    useEffect(() => {
        if (sendFor) countFor(sendFor.audience, sendFor.classIds);
    }, [sendFor, countFor]);

    const openCreate = () => { setEditing(null); setForm(EMPTY); v.clearErrors(); setFormError(null); setFormOpen(true); };
    const openEdit = (a) => {
        setEditing(a);
        setForm({ title: a.title, body: a.body, audience: a.audience, classIds: a.classIds || [], channels: a.channels || [] });
        v.clearErrors(); setFormError(null); setFormOpen(true);
    };
    const closeForm = () => { if (!saving) setFormOpen(false); };
    const setField = (name, value) => {
        const next = { ...form, [name]: value };
        setForm(next);
        if (v.errors[name]) v.validateField(name, value, next);
        if (name === 'audience' && v.errors.classIds) v.validateField('classIds', next.classIds, next);
    };
    const toggle = (name, value) => {
        const list = form[name].includes(value) ? form[name].filter(x => x !== value) : [...form[name], value];
        setField(name, list);
    };

    const handleSave = async () => {
        if (!v.validateAll(form)) return;
        setSaving(true); setFormError(null);
        const payload = { ...form, classIds: form.audience === 'classes' ? form.classIds : [] };
        try {
            if (editing) await updateAnnouncement(editing.id, payload);
            else await createAnnouncement(payload);
            pushToast({ message: editing ? 'Draft updated.' : 'Draft saved. Send it when you are ready.', type: 'success' });
            setFormOpen(false);
            load(true);
        } catch (e) {
            setFormError(serverMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const confirmSend = async () => {
        setSending(true); setSendError(null);
        try {
            const res = await sendAnnouncement(sendFor.id);
            pushToast({ message: `Sending "${sendFor.title}" to ${res.data.recipients} ${res.data.recipients === 1 ? 'person' : 'people'}.`, type: 'success' });
            setSendFor(null);
            load(true);
        } catch (e) {
            setSendError(serverMessage(e));
        } finally {
            setSending(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await deleteAnnouncement(deleteTarget.id);
            pushToast({ message: `"${deleteTarget.title}" was deleted.`, type: 'success' });
            load(true);
        } catch (e) {
            throw new Error(serverMessage(e) || 'Could not delete the announcement.');
        }
    };

    const banner = (title, text) => text && (
        <div role="alert" className="flex gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div><p className="font-semibold">{title}</p><p className="mt-0.5">{text}</p></div>
        </div>
    );

    const reach = (a) => {
        if (a === 'loading') return <span className="text-gray-400">Counting…</span>;
        if (!a) return null;
        if (a.error) return <span className="text-red-600">{a.error}</span>;
        return (
            <span>
                Reaches <strong>{a.total}</strong> {a.total === 1 ? 'person' : 'people'}
                {a.total !== a.withEmail && <> ({a.withEmail} with an email address)</>}
            </span>
        );
    };

    const audienceLabel = (a) => (a.audience === 'classes'
        ? `Classes: ${(a.classIds || []).map(id => classes.find(c => c.id === id)?.name).filter(Boolean).join(', ') || '—'}`
        : AUDIENCE_LABEL[a.audience]);

    const noRecipients = audience && audience !== 'loading' && !audience.error && audience.total === 0;

    return (
        <AdminLayout>
            <div className="flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Megaphone size={20} className="text-orange-500" /> Announcements
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Write once, choose who it is for, and the school's message goes out by email and on the parent dashboard.
                        </p>
                    </div>
                    <button type="button" onClick={openCreate}
                        className="self-start px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
                        New announcement
                    </button>
                </div>

                {loading && !data && <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-500" /></div>}
                {error && <div className="bg-white border border-gray-200 rounded-2xl"><EmptyState variant="error" description={error} onRetry={load} /></div>}

                {!error && data && data.length === 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl">
                        <EmptyState variant="first-use" title="No announcements yet"
                            description="Share news, reminders and notices with parents and teachers."
                            action={{ label: 'New announcement', onClick: openCreate }} />
                    </div>
                )}

                {!error && data && data.length > 0 && (
                    <div className="flex flex-col gap-3">
                        {data.map(a => {
                            const [label, tone] = STATUS[a.status] || [a.status, 'gray'];
                            return (
                                <article key={a.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-2">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h2 className="font-semibold text-gray-900">{a.title}</h2>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {audienceLabel(a)} · {(a.channels || []).map(c => (c === 'in_app' ? 'Dashboard' : 'Email')).join(' + ')}
                                                {a.status === 'sent' && <> · Sent {when(a.sentAt)} to {a.recipientCount}</>}
                                            </p>
                                        </div>
                                        <StatusChip tone={tone}>{label}</StatusChip>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-line">{a.body}</p>
                                    <div className="flex flex-wrap gap-1.5 justify-end">
                                        {a.status === 'draft' && (
                                            <>
                                                <button onClick={() => { setSendError(null); setSendFor(a); }} className={`${rowBtn} text-white bg-blue-600 hover:bg-blue-700`}>Send…</button>
                                                <button onClick={() => openEdit(a)} className={`${rowBtn} text-gray-600 bg-gray-100 hover:bg-gray-200`}>Edit</button>
                                            </>
                                        )}
                                        {a.status === 'sent' && (
                                            <Link to={ROUTES.deliveryLogs} className={`${rowBtn} text-blue-700 bg-blue-50 hover:bg-blue-100`}>View delivery</Link>
                                        )}
                                        {a.status === 'sending' && Date.now() - new Date(a.updatedAt).getTime() > STALE_SENDING_MS && (
                                            <button onClick={() => { setSendError(null); setSendFor(a); }} className={`${rowBtn} text-amber-700 bg-amber-50 hover:bg-amber-100`}>Resume sending</button>
                                        )}
                                        {a.status === 'draft' && (
                                            <button onClick={() => setDeleteTarget(a)} className={`${rowBtn} text-gray-500 hover:text-red-600`}>Delete</button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            <Drawer
                open={formOpen}
                onClose={closeForm}
                title={editing ? 'Edit draft' : 'New announcement'}
                subtitle="Saved as a draft first. Nothing is sent until you choose Send."
                footer={(
                    <>
                        <button onClick={closeForm} disabled={saving} className={btnGhost}>Cancel</button>
                        <button onClick={handleSave} disabled={saving} className={btnPrimary}>
                            {saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Saving…' : 'Save draft'}
                        </button>
                    </>
                )}
            >
                {banner('This announcement could not be saved', formError)}
                <Field label="Title" required htmlFor="an-title" error={v.errors.title}>
                    <input id="an-title" value={form.title} onChange={e => setField('title', e.target.value)}
                        onBlur={() => v.validateField('title', form.title, form)} className={inputClass(!!v.errors.title)} />
                </Field>
                <Field label="Message" required htmlFor="an-body" error={v.errors.body}>
                    <textarea id="an-body" rows={6} value={form.body} onChange={e => setField('body', e.target.value)}
                        onBlur={() => v.validateField('body', form.body, form)} className={inputClass(!!v.errors.body)} />
                </Field>
                <fieldset className="flex flex-col gap-2">
                    <legend className="text-[13px] font-semibold text-gray-700 mb-1">Who is it for? <span className="text-red-400">*</span></legend>
                    {AUDIENCES.map(([value, label, hint]) => (
                        <label key={value} className={`flex gap-3 p-3 rounded-lg border cursor-pointer ${form.audience === value ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200'}`}>
                            <input type="radio" name="audience" checked={form.audience === value} onChange={() => setField('audience', value)} className="mt-1" />
                            <span><span className="block text-sm font-semibold text-gray-900">{label}</span><span className="block text-xs text-gray-500">{hint}</span></span>
                        </label>
                    ))}
                </fieldset>
                {form.audience === 'classes' && (
                    <Field label="Classes" required error={v.errors.classIds}>
                        <div className="flex flex-wrap gap-2">
                            {classes.map(c => (
                                <label key={c.id} className={`px-3 py-1.5 text-sm rounded-lg border cursor-pointer ${form.classIds.includes(c.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}>
                                    <input type="checkbox" className="sr-only" checked={form.classIds.includes(c.id)} onChange={() => toggle('classIds', c.id)} />
                                    {c.name}
                                </label>
                            ))}
                            {classes.length === 0 && <p className="text-sm text-gray-500">No classes yet. Create them in Classes &amp; Arms.</p>}
                        </div>
                    </Field>
                )}
                <p className="text-xs text-gray-600" aria-live="polite">{reach(audience)}</p>
                <Field label="Deliver by" required error={v.errors.channels}>
                    <div className="flex flex-col gap-2">
                        {[['email', 'Email', 'Sent to each person\'s email address'], ['in_app', 'Parent dashboard', 'Shown in the notices on the parent dashboard']].map(([value, label, hint]) => (
                            <label key={value} className="flex gap-3 items-start text-sm">
                                <input type="checkbox" checked={form.channels.includes(value)} onChange={() => toggle('channels', value)} className="mt-1" />
                                <span><span className="font-semibold text-gray-900">{label}</span> <span className="text-gray-500">· {hint}</span></span>
                            </label>
                        ))}
                    </div>
                </Field>
                <p className="text-[12px] text-gray-400"><span className="text-red-400">*</span> Required</p>
            </Drawer>

            <Drawer
                open={!!sendFor}
                onClose={() => !sending && setSendFor(null)}
                title={sendFor?.status === 'sending' ? 'Resume sending?' : 'Send this announcement?'}
                subtitle={sendFor?.title}
                footer={(
                    <>
                        <button onClick={() => setSendFor(null)} disabled={sending} className={btnGhost}>Not yet</button>
                        <button onClick={confirmSend} disabled={sending || audience === 'loading' || !audience || !!audience?.error || noRecipients} className={btnPrimary}>
                            {sending && <Loader2 size={14} className="animate-spin" />}{sending ? 'Sending…' : sendFor?.status === 'sending' ? 'Resume' : 'Send now'}
                        </button>
                    </>
                )}
            >
                {banner('Could not send the announcement', sendError)}
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700 flex flex-col gap-1">
                    <p><strong>Audience:</strong> {sendFor ? audienceLabel(sendFor) : ''}</p>
                    <p><strong>Delivery:</strong> {(sendFor?.channels || []).map(c => (c === 'in_app' ? 'Parent dashboard' : 'Email')).join(' + ')}</p>
                    <p>{reach(audience)}</p>
                    {noRecipients && <p className="text-amber-700">Nobody is in this audience yet, so there is nothing to send.</p>}
                </div>
                <p className="text-xs text-gray-500">
                    {sendFor?.status === 'sending'
                        ? 'This send was interrupted. Resuming only emails the people who have not received it yet.'
                        : 'Once sent, an announcement cannot be recalled. You can follow each email in Delivery Logs.'}
                </p>
            </Drawer>

            <ConfirmDestructiveDialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                verb="Delete"
                noun="announcement"
                recordName={deleteTarget?.title || ''}
                requireReason={false}
                consequence="The draft is removed. Sent announcements are kept as a record and cannot be deleted."
                onConfirm={confirmDelete}
            />
        </AdminLayout>
    );
}
