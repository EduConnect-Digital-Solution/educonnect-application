import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    PencilLine, Power, Trash2, ClipboardCheck, ClipboardList, Wallet,
    Users, UserPlus, Loader2, FilePlus2, RefreshCw,
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import {
    DetailPage, EmptyState, Timeline, Drawer, Field, inputClass,
    ConfirmDestructiveDialog, ImageUploadField, pushToast,
} from '../../../../../components/patterns';
import { getStudentInfoAdmin, updateStudent, deleteStudent, toggleStudentStatus } from '../../../../auth/authAPIs.js';
import { getSchoolClasses } from '../../services/classAPIs.js';
import { getClassArms } from '../../services/armAPIs.js';
import { useAuth } from '../../../../../contexts/AuthContext.jsx';
import { ROUTES } from '../../navigation/navConfig.js';

/**
 * StudentProfilePage — the student's single home in the platform.
 * Reference implementation of the DetailPage pattern: rows link here,
 * tabs light up as modules (attendance, results, fees) go live.
 */

function computeAge(dob) {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

const BioRow = ({ label, value }) => (
    <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-[13px] font-semibold text-gray-800 mt-0.5">{value || '—'}</p>
    </div>
);

export default function StudentProfilePage() {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [student, setStudent] = useState(null);
    const [classes, setClasses] = useState([]);
    const [arms, setArms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit drawer
    const [editOpen, setEditOpen] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState(null);

    // Destructive / status dialogs
    const [removeOpen, setRemoveOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // getStudentInfoAdmin → GET /api/students/:id, returns the student object directly.
            const [raw, classesRes] = await Promise.all([
                getStudentInfoAdmin(studentId),
                getSchoolClasses(),
            ]);
            const s = raw ?? {};
            const classList = classesRes?.data?.classes ?? [];
            setClasses(classList);

            const classId = s.classId ?? null;
            let armList = [];
            if (classId) {
                try {
                    const armsRes = await getClassArms(classId);
                    armList = armsRes?.data?.arms ?? [];
                } catch { /* arms are display sugar */ }
            }
            setArms(armList);

            setStudent({
                id: s.id ?? s._id ?? studentId,
                admissionNumber: s.studentId ?? null,     // school-facing student/admission number
                firstName: s.firstName ?? '',
                lastName: s.lastName ?? '',
                name: s.fullName || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || 'Student',
                email: s.email ?? '',
                phone: s.phone ?? '',
                address: s.address ?? '',
                gender: s.gender ?? '',
                dateOfBirth: s.dateOfBirth?.slice(0, 10) ?? '',
                rollNumber: s.rollNumber ?? null,
                grade: s.grade ?? null,
                profileImage: s.profileImage ?? null,
                classId,
                armId: s.armId ?? null,
                className: classList.find(c => c.id === classId)?.name ?? s.class ?? '—',
                armName: armList.find(a => a.id === s.armId)?.name ?? s.section ?? '—',
                isActive: s.isActive ?? true,
                parents: s.parents ?? [],
                teachers: s.teachers ?? [],
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
                schoolId: s.schoolId ?? user?.schoolId,
            });
        } catch (e) {
            setError(e?.message || 'Failed to load this student.');
        } finally {
            setLoading(false);
        }
    }, [studentId, user?.schoolId]);

    useEffect(() => { load(); }, [load]);

    /* ── Edit drawer handlers ─────── */
    const openEdit = () => {
        setForm({
            firstName: student.firstName,
            lastName: student.lastName,
            phone: student.phone,
            classId: student.classId ?? '',
            armId: student.armId ?? '',
            profileImage: student.profileImage ?? null,
        });
        setFormError(null);
        setEditOpen(true);
    };

    const onEditClassChange = async (classId) => {
        setForm(f => ({ ...f, classId, armId: '' }));
        if (classId) {
            try {
                const res = await getClassArms(classId);
                setArms(res?.data?.arms ?? []);
            } catch { setArms([]); }
        } else {
            setArms([]);
        }
    };

    const saveEdit = async () => {
        if (!form.firstName?.trim() || !form.lastName?.trim()) {
            setFormError('First and last name are required.');
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            await updateStudent(student.id, {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                classId: form.classId || null,
                armId: form.armId || null,
                phone: form.phone,
                profileImage: form.profileImage ?? null,
            });
            setEditOpen(false);
            pushToast({ message: 'Student updated' });
            load();
        } catch (e) {
            setFormError(e?.message || 'Failed to update student.');
        } finally {
            setSaving(false);
        }
    };

    /* ── Status + remove ─── */
    const handleStatusChange = async (reason) => {
        await toggleStudentStatus({
            studentId: student.id,
            action: student.isActive ? 'deactivate' : 'activate',
            reason,
        });
        pushToast({ message: `Student ${student.isActive ? 'deactivated' : 'activated'}` });
        load();
    };

    const handleRemove = async (reason) => {
        await deleteStudent({ studentId: student.id, reason, schoolId: student.schoolId });
        pushToast({ message: `${student.name} removed` });
        navigate(ROUTES.students);
    };

    /* ── Error state ─────── */
    if (!loading && error) {
        return (
            <AdminLayout>
                <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl mt-8">
                    <EmptyState variant="error" description={error} onRetry={load} />
                </div>
            </AdminLayout>
        );
    }

    const age = computeAge(student?.dateOfBirth);

    /* ── Timeline (honest: only what the record actually tells us) ─────── */
    const timelineItems = student ? [
        student.updatedAt && {
            title: 'Record updated',
            at: student.updatedAt,
            tone: 'blue',
            icon: RefreshCw,
        },
        student.createdAt && {
            title: 'Student record created',
            at: student.createdAt,
            tone: 'green',
            icon: FilePlus2,
        },
    ].filter(Boolean) : [];

    return (
        <AdminLayout>
            <DetailPage
                loading={loading}
                breadcrumb={[
                    { label: 'People', to: ROUTES.students },
                    { label: 'Students', to: ROUTES.students },
                    { label: student?.name ?? '…' },
                ]}
                avatar={{ name: student?.name, image: student?.profileImage }}
                title={student?.name}
                idLabel={student?.admissionNumber ? `Adm. ${student.admissionNumber}` : undefined}
                subtitle={student?.email || 'No email on record'}
                status={student?.isActive ? 'active' : 'inactive'}
                primaryActions={[
                    { id: 'edit', label: 'Edit', icon: PencilLine, onClick: openEdit, variant: 'outline' },
                ]}
                overflowActions={[
                    {
                        id: 'status',
                        label: student?.isActive ? 'Deactivate student' : 'Activate student',
                        icon: Power,
                        onClick: () => setStatusOpen(true),
                    },
                    {
                        id: 'remove',
                        label: 'Remove student',
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setRemoveOpen(true),
                    },
                ]}
                stats={[
                    { label: 'Class', value: student?.className ?? '—' },
                    { label: 'Arm', value: student?.armName ?? '—' },
                    { label: 'Guardians', value: student?.parents?.length ?? 0, tone: (student?.parents?.length ?? 0) === 0 ? 'amber' : undefined, hint: (student?.parents?.length ?? 0) === 0 ? 'None linked' : undefined },
                    { label: 'Age', value: age != null ? `${age} yrs` : '—' },
                    { label: 'Gender', value: student?.gender ? student.gender[0].toUpperCase() + student.gender.slice(1) : '—' },
                ]}
                tabs={[
                    {
                        id: 'overview',
                        label: 'Overview',
                        content: (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                <BioRow label="First name" value={student?.firstName} />
                                <BioRow label="Last name" value={student?.lastName} />
                                <BioRow label="Admission no." value={student?.admissionNumber} />
                                <BioRow label="Roll number" value={student?.rollNumber} />
                                <BioRow label="Email" value={student?.email} />
                                <BioRow label="Phone" value={student?.phone} />
                                <BioRow label="Date of birth" value={student?.dateOfBirth} />
                                <BioRow label="Gender" value={student?.gender} />
                                <BioRow label="Grade" value={student?.grade} />
                                <BioRow label="Address" value={student?.address} />
                                <BioRow label="Class" value={`${student?.className ?? '—'}${student?.armName && student.armName !== '—' ? ` · ${student.armName}` : ''}`} />
                                <BioRow label="School ID" value={student?.schoolId} />
                            </div>
                        ),
                    },
                    {
                        id: 'guardians',
                        label: 'Guardians',
                        badge: student?.parents?.length || undefined,
                        content: (student?.parents?.length ?? 0) > 0 ? (
                            <div className="space-y-2.5">
                                {student.parents.map((p, i) => (
                                    <div key={p.id ?? p.email ?? i} className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50/50">
                                        <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
                                            {(p.name ?? p.fullName ?? p.email ?? '?')[0].toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-gray-800 truncate">{p.name ?? p.fullName ?? 'Guardian'}</p>
                                            <p className="text-[12px] text-gray-400 truncate">
                                                {p.email || 'No email'}{p.phone ? ` · ${p.phone}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                variant="first-use"
                                icon={UserPlus}
                                compact
                                title="No guardians linked"
                                description="Link a parent or guardian so this student's family can receive invoices, alerts, and results."
                                action={{ label: 'Go to Guardians', to: ROUTES.guardians }}
                            />
                        ),
                    },
                    {
                        id: 'teachers',
                        label: 'Teachers',
                        badge: student?.teachers?.length || undefined,
                        content: (student?.teachers?.length ?? 0) > 0 ? (
                            <div className="space-y-2.5">
                                {student.teachers.map((t, i) => (
                                    <div key={t.id ?? t.email ?? i} className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50/50">
                                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                            {(t.name ?? t.fullName ?? t.email ?? '?')[0].toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-gray-800 truncate">{t.name ?? t.fullName ?? 'Teacher'}</p>
                                            <p className="text-[12px] text-gray-400 truncate">{t.subject || t.email || ''}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                variant="first-use"
                                icon={Users}
                                compact
                                title="No teachers assigned yet"
                                description="Teachers appear here once this student's class and subjects have assigned teachers."
                                action={{ label: 'Go to Staff', to: ROUTES.staff }}
                            />
                        ),
                    },
                    {
                        id: 'attendance',
                        label: 'Attendance',
                        content: (
                            <EmptyState
                                variant="first-use"
                                icon={ClipboardCheck}
                                compact
                                title="Attendance history will live here"
                                description="Once the attendance module records registers, this tab shows the term calendar strip, totals, and excuse notes for this student."
                                prerequisite={{ label: 'Attendance module — in design', to: ROUTES.attendance }}
                            />
                        ),
                    },
                    {
                        id: 'results',
                        label: 'Results',
                        content: (
                            <EmptyState
                                variant="first-use"
                                icon={ClipboardList}
                                compact
                                title="Results will live here"
                                description="Published scores and report cards per term will appear on this tab once Grading & Results goes live."
                                prerequisite={{ label: 'Grading & Results — in design', to: ROUTES.grading }}
                            />
                        ),
                    },
                    {
                        id: 'fees',
                        label: 'Fees',
                        content: (
                            <EmptyState
                                variant="first-use"
                                icon={Wallet}
                                compact
                                title="Fee ledger will live here"
                                description="This student's invoices, payments, and running balance will appear here, linked to the Finance module."
                                action={{ label: 'Open Invoices', to: ROUTES.invoices }}
                            />
                        ),
                    },
                ]}
                rail={
                    <div className="space-y-5">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Record</p>
                            <div className="space-y-3">
                                <BioRow label="Created" value={student?.createdAt ? new Date(student.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                                <BioRow label="Last updated" value={student?.updatedAt ? new Date(student.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Timeline</p>
                            <Timeline items={timelineItems} emptyLabel="Lifecycle events (enrolled, promoted, transferred) will appear here." />
                        </div>
                    </div>
                }
            />

            {/* ── Edit drawer (≤5 fields → drawer, per FormKit rules) ───── */}
            <Drawer
                open={editOpen}
                onClose={() => setEditOpen(false)}
                title="Edit student"
                subtitle={student?.name}
                footer={
                    <>
                        <button onClick={() => setEditOpen(false)}
                            className="flex-1 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button onClick={saveEdit} disabled={saving}
                            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                            {saving && <Loader2 size={14} className="animate-spin" />}
                            Save changes
                        </button>
                    </>
                }
            >
                <ImageUploadField
                    name={`${form.firstName ?? ''} ${form.lastName ?? ''}`.trim() || student?.name}
                    value={form.profileImage}
                    onChange={(url) => setForm(f => ({ ...f, profileImage: url }))}
                    label="Student photo"
                />
                <Field label="First name" required error={formError && !form.firstName?.trim() ? 'Required' : null}>
                    <input className={inputClass(formError && !form.firstName?.trim())}
                        value={form.firstName ?? ''} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </Field>
                <Field label="Last name" required error={formError && !form.lastName?.trim() ? 'Required' : null}>
                    <input className={inputClass(formError && !form.lastName?.trim())}
                        value={form.lastName ?? ''} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </Field>
                <Field label="Phone">
                    <input className={inputClass(false)}
                        value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </Field>
                <Field label="Class">
                    <select className={inputClass(false)} value={form.classId ?? ''} onChange={e => onEditClassChange(e.target.value)}>
                        <option value="">No class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </Field>
                <Field label="Arm" hint="optional">
                    <select className={inputClass(false)} value={form.armId ?? ''} onChange={e => setForm(f => ({ ...f, armId: e.target.value }))}>
                        <option value="">No arm</option>
                        {arms.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </Field>
                {formError && (
                    <p className="text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
                )}
            </Drawer>

            {/* ── Status change (reason required, audited) ──────────────── */}
            <ConfirmDestructiveDialog
                open={statusOpen}
                onClose={() => setStatusOpen(false)}
                verb={student?.isActive ? 'Deactivate' : 'Activate'}
                noun="student"
                recordName={student?.name}
                consequence={student?.isActive
                    ? 'They will no longer appear on active rosters.'
                    : 'They will reappear on active rosters.'}
                onConfirm={handleStatusChange}
            />

            {/* ── Remove (type-the-name + reason, audited) ──────────────── */}
            <ConfirmDestructiveDialog
                open={removeOpen}
                onClose={() => setRemoveOpen(false)}
                verb="Remove"
                noun="student"
                recordName={student?.name}
                consequence="Their record is removed from rosters and lists."
                onConfirm={handleRemove}
            />
        </AdminLayout>
    );
}
