import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserPlus, Search, AlertCircle } from 'lucide-react';
import { default as Loader2 } from '@/components/brand/LoaderIcon.jsx';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import {
    pushToast, Field, Drawer, ConfirmDestructiveDialog, EmptyState, StatusChip, inputClass, useFieldErrors,
} from '../../../../../components/patterns';
import {
    listApplicants, createApplicant, updateApplicant, setApplicantStatus, admitApplicant, deleteApplicant,
} from '../../services/admissionsAPI.js';
import { getSchoolClasses } from '../../services/classAPIs.js';
import { getClassArms } from '../../services/armAPIs.js';

const TABS = [
    ['', 'All'], ['applied', 'Applied'], ['under_review', 'Under review'],
    ['offered', 'Offered'], ['admitted', 'Admitted'], ['declined', 'Declined'],
];
const STATUS_LABEL = Object.fromEntries(TABS.filter(([v]) => v));
const EMPTY_FORM = {
    firstName: '', lastName: '', dateOfBirth: '', gender: '', applyingClassId: '',
    guardianName: '', guardianEmail: '', guardianPhone: '', previousSchool: '', notes: '',
};

const validators = {
    firstName: (v) => (!v?.trim() ? 'Enter the child\'s first name' : null),
    lastName: (v) => (!v?.trim() ? 'Enter the child\'s last name' : null),
    guardianName: (v) => (!v?.trim() ? 'Enter a parent or guardian name' : null),
    guardianEmail: (v) => (v && !/^\S+@\S+\.\S+$/.test(v) ? 'That email address doesn\'t look right' : null),
    dateOfBirth: (v) => (v && v > new Date().toISOString().slice(0, 10) ? 'Date of birth cannot be in the future' : null),
};

const btnPrimary = 'flex-1 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center justify-center gap-2';
const btnGhost = 'flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50';
const rowBtn = 'px-2.5 py-1.5 text-xs font-semibold rounded-lg';

// All validation details from a failed call, so nothing is hidden behind "Validation failed"
const serverMessage = (e) => {
    const details = Array.isArray(e?.errors) ? e.errors.map(x => x.message || x.msg).filter(Boolean) : [];
    return details.length ? [...new Set(details)].join(' · ') : e?.message;
};

const fullName = (a) => `${a.firstName} ${a.lastName}`;

export default function AdmissionsPage() {
    const [tab, setTab]         = useState('');
    const [search, setSearch]   = useState('');
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
    const [classes, setClasses] = useState([]);

    // Form drawer
    const [formOpen, setFormOpen]   = useState(false);
    const [editing, setEditing]     = useState(null);
    const [form, setForm]           = useState(EMPTY_FORM);
    const [saving, setSaving]       = useState(false);
    const [formError, setFormError] = useState(null);
    const v = useFieldErrors(validators);

    // Decision drawer (offer / decline), admit drawer, delete dialog
    const [decision, setDecision]   = useState(null); // { applicant, status }
    const [note, setNote]           = useState('');
    const [admitFor, setAdmitFor]   = useState(null);
    const [admitForm, setAdmitForm] = useState({ classId: '', armId: '', admissionNumber: '' });
    const [arms, setArms]           = useState([]);
    const [busy, setBusy]           = useState(false);
    const [drawerError, setDrawerError] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await listApplicants({ status: tab || undefined, search: search.trim() || undefined });
            setData(res.data);
        } catch (e) {
            setError(e?.message || 'Could not load applicants.');
        } finally {
            setLoading(false);
        }
    }, [tab, search]);

    useEffect(() => {
        const t = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    useEffect(() => {
        getSchoolClasses().then(res => setClasses(res.data?.classes ?? [])).catch(() => setClasses([]));
    }, []);

    useEffect(() => {
        setArms([]);
        if (!admitFor || !admitForm.classId) return;
        getClassArms(admitForm.classId).then(res => setArms(res.data?.arms ?? [])).catch(() => setArms([]));
    }, [admitFor, admitForm.classId]);

    const className = useMemo(() => Object.fromEntries(classes.map(c => [c.id, c.name])), [classes]);
    const counts = data?.counts ?? {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    // ── Add / edit ──
    const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); v.clearErrors(); setFormError(null); setFormOpen(true); };
    const openEdit = (a) => {
        setEditing(a);
        setForm({
            firstName: a.firstName, lastName: a.lastName, dateOfBirth: a.dateOfBirth ? a.dateOfBirth.slice(0, 10) : '',
            gender: a.gender || '', applyingClassId: a.applyingClassId || '', guardianName: a.guardianName,
            guardianEmail: a.guardianEmail || '', guardianPhone: a.guardianPhone || '',
            previousSchool: a.previousSchool || '', notes: a.notes || '',
        });
        v.clearErrors(); setFormError(null); setFormOpen(true);
    };
    const closeForm = () => { if (!saving) setFormOpen(false); };
    const setField = (name, value) => {
        const next = { ...form, [name]: value };
        setForm(next);
        if (v.errors[name]) v.validateField(name, value, next);
    };

    const handleSave = async () => {
        if (!v.validateAll(form)) return;
        setSaving(true); setFormError(null);
        try {
            if (editing) {
                await updateApplicant(editing.id, form);
                pushToast({ message: `${form.firstName} ${form.lastName}'s application was updated.`, type: 'success' });
            } else {
                await createApplicant(form);
                pushToast({ message: `${form.firstName} ${form.lastName} was added as an applicant.`, type: 'success' });
            }
            setFormOpen(false);
            load();
        } catch (e) {
            setFormError(serverMessage(e));
        } finally {
            setSaving(false);
        }
    };

    // ── Status changes ──
    const quickStatus = async (a, status, doneMessage) => {
        try {
            await setApplicantStatus(a.id, status);
            pushToast({ message: doneMessage, type: 'success' });
            load();
        } catch (e) {
            pushToast({ message: serverMessage(e) || 'Could not update the applicant.', type: 'error' });
        }
    };

    const openDecision = (applicant, status) => { setDecision({ applicant, status }); setNote(''); setDrawerError(null); };
    const confirmDecision = async () => {
        setBusy(true); setDrawerError(null);
        try {
            await setApplicantStatus(decision.applicant.id, decision.status, note.trim() || undefined);
            pushToast({
                message: decision.status === 'offered'
                    ? `An offer was recorded for ${fullName(decision.applicant)}.`
                    : `${fullName(decision.applicant)}'s application was declined.`,
                type: 'success',
            });
            setDecision(null);
            load();
        } catch (e) {
            setDrawerError(serverMessage(e));
        } finally {
            setBusy(false);
        }
    };

    // ── Admit ──
    const openAdmit = (a) => {
        setAdmitFor(a);
        setAdmitForm({ classId: a.applyingClassId || '', armId: '', admissionNumber: '' });
        setDrawerError(null);
    };
    const confirmAdmit = async () => {
        if (!admitForm.classId) { setDrawerError('Choose the class to admit this child into.'); return; }
        setBusy(true); setDrawerError(null);
        try {
            await admitApplicant(admitFor.id, {
                classId: admitForm.classId,
                armId: admitForm.armId || undefined,
                admissionNumber: admitForm.admissionNumber.trim() || undefined,
            });
            pushToast({ message: `${fullName(admitFor)} is now a student in ${className[admitForm.classId] || 'the class'}.`, type: 'success' });
            setAdmitFor(null);
            load();
        } catch (e) {
            setDrawerError(serverMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await deleteApplicant(deleteTarget.id);
            pushToast({ message: `${fullName(deleteTarget)}'s application was deleted.`, type: 'success' });
            load();
        } catch (e) {
            throw new Error(serverMessage(e) || 'Could not delete the application.');
        }
    };

    const applicants = data?.applicants ?? [];
    const filtered = Boolean(tab || search.trim());

    const actions = (a) => {
        const out = [];
        if (a.status === 'applied') out.push(<button key="r" onClick={() => quickStatus(a, 'under_review', `${fullName(a)} is now under review.`)} className={`${rowBtn} text-blue-700 bg-blue-50 hover:bg-blue-100`}>Start review</button>);
        if (a.status === 'applied' || a.status === 'under_review') out.push(<button key="o" onClick={() => openDecision(a, 'offered')} className={`${rowBtn} text-green-700 bg-green-50 hover:bg-green-100`}>Make offer</button>);
        if (a.status === 'offered') out.push(<button key="a" onClick={() => openAdmit(a)} className={`${rowBtn} text-white bg-blue-600 hover:bg-blue-700`}>Admit</button>);
        if (['applied', 'under_review', 'offered'].includes(a.status)) out.push(<button key="d" onClick={() => openDecision(a, 'declined')} className={`${rowBtn} text-red-700 bg-red-50 hover:bg-red-100`}>Decline</button>);
        if (a.status === 'declined') out.push(<button key="re" onClick={() => quickStatus(a, 'applied', `${fullName(a)}'s application was reopened.`)} className={`${rowBtn} text-blue-700 bg-blue-50 hover:bg-blue-100`}>Reopen</button>);
        if (a.status !== 'admitted') {
            out.push(<button key="e" onClick={() => openEdit(a)} className={`${rowBtn} text-gray-600 bg-gray-100 hover:bg-gray-200`}>Edit</button>);
            out.push(<button key="x" onClick={() => setDeleteTarget(a)} className={`${rowBtn} text-gray-500 hover:text-red-600`}>Delete</button>);
        }
        return out;
    };

    const serverBanner = (title, text) => text && (
        <div role="alert" className="flex gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div><p className="font-semibold">{title}</p><p className="mt-0.5">{text}</p></div>
        </div>
    );

    const footer = (onCancel, onConfirm, working, label) => (
        <>
            <button onClick={onCancel} disabled={working} className={btnGhost}>Cancel</button>
            <button onClick={onConfirm} disabled={working} className={btnPrimary}>
                {working && <Loader2 size={14} className="animate-spin" />}{working ? 'Saving…' : label}
            </button>
        </>
    );

    return (
        <AdminLayout>
            <div className="flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <UserPlus size={20} className="text-green-600" /> Admissions
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Track each applicant from first enquiry to a place in a class. Admitting creates the student record.
                        </p>
                    </div>
                    <button type="button" onClick={openCreate}
                        className="self-start px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
                        Add applicant
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {TABS.map(([value, label]) => {
                        const count = value ? counts[value] ?? 0 : total;
                        return (
                            <button key={value} type="button" onClick={() => setTab(value)}
                                className={`px-3 py-1.5 text-sm font-semibold rounded-lg border ${tab === value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                {label} <span className={tab === value ? 'text-blue-100' : 'text-gray-400'}>{count}</span>
                            </button>
                        );
                    })}
                    <div className="relative ml-auto w-full sm:w-64">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <label htmlFor="adm-search" className="sr-only">Search applicants</label>
                        <input id="adm-search" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by child or guardian" className={`${inputClass(false)} pl-9`} />
                    </div>
                </div>

                {loading && !data && <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-500" /></div>}

                {error && <div className="bg-white border border-gray-200 rounded-2xl"><EmptyState variant="error" description={error} onRetry={load} /></div>}

                {!error && data && applicants.length === 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl">
                        <EmptyState
                            variant={filtered ? 'filtered' : 'first-use'}
                            title={filtered ? 'No applicants match' : 'No applicants yet'}
                            description={filtered ? 'Try another status or search.' : 'Add the first applicant to start building your intake.'}
                            action={filtered ? undefined : { label: 'Add applicant', onClick: openCreate }}
                            onClearFilters={filtered ? () => { setTab(''); setSearch(''); } : undefined}
                        />
                    </div>
                )}

                {!error && applicants.length > 0 && (
                    <>
                    <ul className="md:hidden bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
                        {applicants.map(a => (
                            <li key={a.id} className="p-4">
                                <p className="font-semibold text-gray-900">{fullName(a)}</p>
                                {a.previousSchool && <p className="text-xs text-gray-500">From {a.previousSchool}</p>}
                                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                                    <div><dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Applying for</dt><dd className="text-gray-700">{a.applyingClass?.name || '—'}</dd></div>
                                    <div><dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</dt><dd><StatusChip status={a.status}>{STATUS_LABEL[a.status] || a.status}</StatusChip></dd></div>
                                    <div className="col-span-2 min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Guardian</dt>
                                        <dd className="text-gray-700 break-words">{a.guardianName}<span className="block text-xs text-gray-500">{[a.guardianPhone, a.guardianEmail].filter(Boolean).join(' · ')}</span></dd></div>
                                </dl>
                                {a.decisionNote && <p className="text-xs text-gray-500 mt-2">{a.decisionNote}</p>}
                                <div className="flex flex-wrap gap-1.5 mt-3">{actions(a)}</div>
                            </li>
                        ))}
                    </ul>
                    <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                                    <th className="px-4 py-3 font-semibold">Applicant</th>
                                    <th className="px-4 py-3 font-semibold">Applying for</th>
                                    <th className="px-4 py-3 font-semibold">Guardian</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {applicants.map(a => (
                                    <tr key={a.id} className="border-b border-gray-50 last:border-0 align-top">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-gray-900">{fullName(a)}</p>
                                            {a.previousSchool && <p className="text-xs text-gray-500">From {a.previousSchool}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{a.applyingClass?.name || '—'}</td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {a.guardianName}
                                            <span className="block text-xs text-gray-500">{[a.guardianPhone, a.guardianEmail].filter(Boolean).join(' · ')}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusChip status={a.status}>{STATUS_LABEL[a.status] || a.status}</StatusChip>
                                            {a.decisionNote && <span className="block text-xs text-gray-500 mt-1 max-w-[220px]">{a.decisionNote}</span>}
                                        </td>
                                        <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-1.5">{actions(a)}</div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}
            </div>

            {/* Add / edit applicant */}
            <Drawer
                open={formOpen}
                onClose={closeForm}
                title={editing ? 'Edit application' : 'Add applicant'}
                subtitle="Basic details are enough to start. You can add more later."
                footer={footer(closeForm, handleSave, saving, editing ? 'Save changes' : 'Add applicant')}
            >
                {serverBanner('This application could not be saved', formError)}
                <div className="grid grid-cols-2 gap-3">
                    <Field label="First name" required htmlFor="ap-first" error={v.errors.firstName}>
                        <input id="ap-first" value={form.firstName} onChange={e => setField('firstName', e.target.value)}
                            onBlur={() => v.validateField('firstName', form.firstName, form)} className={inputClass(!!v.errors.firstName)} />
                    </Field>
                    <Field label="Last name" required htmlFor="ap-last" error={v.errors.lastName}>
                        <input id="ap-last" value={form.lastName} onChange={e => setField('lastName', e.target.value)}
                            onBlur={() => v.validateField('lastName', form.lastName, form)} className={inputClass(!!v.errors.lastName)} />
                    </Field>
                    <Field label="Date of birth" htmlFor="ap-dob" error={v.errors.dateOfBirth}>
                        <input id="ap-dob" type="date" value={form.dateOfBirth} onChange={e => setField('dateOfBirth', e.target.value)}
                            onBlur={() => v.validateField('dateOfBirth', form.dateOfBirth, form)} className={inputClass(!!v.errors.dateOfBirth)} />
                    </Field>
                    <Field label="Gender" htmlFor="ap-gender">
                        <select id="ap-gender" value={form.gender} onChange={e => setField('gender', e.target.value)} className={inputClass(false)}>
                            <option value="">Not specified</option>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="other">Other</option>
                        </select>
                    </Field>
                </div>
                <Field label="Applying for" htmlFor="ap-class" hint="The class the family has asked for">
                    <select id="ap-class" value={form.applyingClassId} onChange={e => setField('applyingClassId', e.target.value)} className={inputClass(false)}>
                        <option value="">Not decided yet</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </Field>
                <Field label="Previous school" htmlFor="ap-prev">
                    <input id="ap-prev" value={form.previousSchool} onChange={e => setField('previousSchool', e.target.value)} className={inputClass(false)} />
                </Field>
                <Field label="Parent or guardian" required htmlFor="ap-guardian" error={v.errors.guardianName}>
                    <input id="ap-guardian" value={form.guardianName} onChange={e => setField('guardianName', e.target.value)}
                        onBlur={() => v.validateField('guardianName', form.guardianName, form)} className={inputClass(!!v.errors.guardianName)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Guardian email" htmlFor="ap-email" error={v.errors.guardianEmail}>
                        <input id="ap-email" type="email" value={form.guardianEmail} onChange={e => setField('guardianEmail', e.target.value)}
                            onBlur={() => v.validateField('guardianEmail', form.guardianEmail, form)} className={inputClass(!!v.errors.guardianEmail)} />
                    </Field>
                    <Field label="Guardian phone" htmlFor="ap-phone">
                        <input id="ap-phone" type="tel" value={form.guardianPhone} onChange={e => setField('guardianPhone', e.target.value)} className={inputClass(false)} />
                    </Field>
                </div>
                <Field label="Notes" htmlFor="ap-notes" hint="Only your staff see this">
                    <textarea id="ap-notes" rows={3} value={form.notes} onChange={e => setField('notes', e.target.value)} className={inputClass(false)} />
                </Field>
                <p className="text-[12px] text-gray-400"><span className="text-red-400">*</span> Required</p>
            </Drawer>

            {/* Offer / decline */}
            <Drawer
                open={!!decision}
                onClose={() => !busy && setDecision(null)}
                title={decision?.status === 'offered' ? 'Make an offer' : 'Decline application'}
                subtitle={decision ? fullName(decision.applicant) : ''}
                footer={footer(() => setDecision(null), confirmDecision, busy, decision?.status === 'offered' ? 'Record offer' : 'Decline')}
            >
                {serverBanner('Could not update the application', drawerError)}
                <Field label={decision?.status === 'offered' ? 'Note for the file (optional)' : 'Reason (optional)'} htmlFor="ap-note"
                    hint="Kept on the applicant's record. It is not sent to the family.">
                    <textarea id="ap-note" rows={4} value={note} onChange={e => setNote(e.target.value)} className={inputClass(false)} />
                </Field>
            </Drawer>

            {/* Admit */}
            <Drawer
                open={!!admitFor}
                onClose={() => !busy && setAdmitFor(null)}
                title="Admit as a student"
                subtitle={admitFor ? `${fullName(admitFor)} becomes a student in the class you choose.` : ''}
                footer={footer(() => setAdmitFor(null), confirmAdmit, busy, 'Admit student')}
            >
                {serverBanner('Could not admit this applicant', drawerError)}
                <Field label="Class" required htmlFor="ad-class">
                    <select id="ad-class" value={admitForm.classId} onChange={e => setAdmitForm({ ...admitForm, classId: e.target.value, armId: '' })} className={inputClass(false)}>
                        <option value="">Choose a class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </Field>
                <Field label="Arm" htmlFor="ad-arm" hint={admitForm.classId && arms.length === 0 ? 'This class has no arms' : undefined}>
                    <select id="ad-arm" value={admitForm.armId} disabled={!admitForm.classId || arms.length === 0}
                        onChange={e => setAdmitForm({ ...admitForm, armId: e.target.value })} className={inputClass(false)}>
                        <option value="">No arm yet</option>
                        {arms.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </Field>
                <Field label="Admission number" htmlFor="ad-no" hint="Leave blank to add it later">
                    <input id="ad-no" value={admitForm.admissionNumber} onChange={e => setAdmitForm({ ...admitForm, admissionNumber: e.target.value })} className={inputClass(false)} />
                </Field>
            </Drawer>

            <ConfirmDestructiveDialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                verb="Delete"
                noun="application"
                recordName={deleteTarget ? fullName(deleteTarget) : ''}
                requireReason={false}
                consequence="The application is removed for good. Admitted applicants cannot be deleted."
                onConfirm={confirmDelete}
            />
        </AdminLayout>
    );
}
