import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, Users, BookOpen, Eye, ShieldCheck } from 'lucide-react';
import {
    WorkbenchTable, ConfirmDestructiveDialog, Drawer, pushToast, EmptyState, HelpCards,
} from '../../../../../components/patterns';
import {
    listPolicyPermissions,
    grantPolicyPermission,
    revokePolicyPermission,
    listTeacherCreatedPolicies,
    getTeacherClassAssignments,
} from '../../services/policyPermissionsAPIs.js';
import { getDashboardUsers } from '../../services/adminService.js';

// Helper: build a readable display name from API user objects.
// The staff API returns firstName + lastName separately, not as fullName.
function teacherDisplayName(t) {
    const full = `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim();
    return full || t.name || t.fullName || t.email || t.id;
}

// ─── Grant Permission Drawer ───────────────────────────────────────────────────

const ALL_CLASSES_SENTINEL = '__all__';

function GrantPermissionDrawer({ open, onClose, onGranted }) {
    const [teachers, setTeachers]             = useState([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);

    // Class list is populated only after a teacher is chosen
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(false);

    const [teacherId, setTeacherId]           = useState('');
    const [classSelection, setClassSelection] = useState(''); // class id or '__all__'
    const [saving, setSaving]                 = useState(false);
    const [error, setError]                   = useState(null);

    // Load teacher list once when drawer opens
    useEffect(() => {
        if (!open) return;
        setTeacherId(''); setClassSelection(''); setTeacherClasses([]); setError(null);
        setLoadingTeachers(true);
        getDashboardUsers('teacher', '')
            .then(res => setTeachers(res.data?.users ?? []))
            .catch(() => setTeachers([]))
            .finally(() => setLoadingTeachers(false));
    }, [open]);

    // Load THAT teacher's assigned classes when teacher selection changes
    useEffect(() => {
        setClassSelection('');
        setTeacherClasses([]);
        if (!teacherId) return;
        setLoadingClasses(true);
        getTeacherClassAssignments(teacherId)
            .then(res => setTeacherClasses(res.data?.classes ?? []))
            .catch(() => setTeacherClasses([]))
            .finally(() => setLoadingClasses(false));
    }, [teacherId]);

    const selectedTeacher = teachers.find(t => t.id === teacherId);
    const resolvedName    = selectedTeacher ? teacherDisplayName(selectedTeacher) : '';

    const handleGrant = async () => {
        if (!teacherId)       { setError('Select a teacher.'); return; }
        if (!classSelection)  { setError('Select a class option.'); return; }
        if (teacherClasses.length === 0) { setError('This teacher has no assigned classes.'); return; }

        setSaving(true); setError(null);
        try {
            const classesToGrant = classSelection === ALL_CLASSES_SENTINEL
                ? teacherClasses
                : [teacherClasses.find(c => c.id === classSelection)].filter(Boolean);

            const created = [];
            for (const cls of classesToGrant) {
                const res = await grantPolicyPermission({
                    teacherId,
                    teacherName: resolvedName,
                    classId: cls.id,
                    className: cls.name,
                });
                if (res.data?.permission) created.push(res.data.permission);
            }

            created.forEach(p => onGranted(p));
            const classLabel = classSelection === ALL_CLASSES_SENTINEL
                ? `all ${created.length} classes`
                : classesToGrant[0]?.name ?? 'class';
            pushToast({ message: `Permission granted to ${resolvedName} for ${classLabel}.`, type: 'success' });
            onClose();
        } catch (e) {
            setError(e?.message || 'Failed to grant permission.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title="Grant Policy Permission"
            subtitle="Allow a teacher to create and manage their own assessment policies for their assigned class(es)."
            width="max-w-md"
            footer={
                <>
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={handleGrant} disabled={saving || loadingTeachers}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        Grant Permission
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                {/* Teacher picker */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Teacher <span className="text-red-400">*</span>
                    </label>
                    {loadingTeachers ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                            <Loader2 size={12} className="animate-spin" /> Loading staff…
                        </div>
                    ) : (
                        <select
                            value={teacherId}
                            onChange={e => setTeacherId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                        >
                            <option value="">— select a teacher —</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>
                                    {teacherDisplayName(t)}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Class picker — only shown after teacher is selected */}
                {teacherId && (
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                            Class <span className="text-red-400">*</span>
                        </label>
                        {loadingClasses ? (
                            <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                                <Loader2 size={12} className="animate-spin" /> Loading {resolvedName}'s classes…
                            </div>
                        ) : teacherClasses.length === 0 ? (
                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                This teacher has no classes assigned yet. Assign them classes first.
                            </p>
                        ) : (
                            <select
                                value={classSelection}
                                onChange={e => setClassSelection(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                            >
                                <option value="">— choose a class —</option>
                                <option value={ALL_CLASSES_SENTINEL}>
                                    All classes ({teacherClasses.length}) — grant for every assigned class
                                </option>
                                {teacherClasses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                {error && (
                    <p className="text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                    <ShieldCheck size={13} className="mt-0.5 shrink-0" />
                    Teacher policies take priority over admin-assigned policies for their class. Revoking does not delete their existing policies.
                </div>
            </div>
        </Drawer>
    );
}

// ─── Teacher Policies Read-Only Drawer ────────────────────────────────────────

function TeacherPoliciesDrawer({ open, onClose, permission }) {
    const [policies, setPolicies]   = useState([]);
    const [loading, setLoading]     = useState(false);

    useEffect(() => {
        if (!open || !permission) return;
        setLoading(true);
        listTeacherCreatedPolicies({ classId: permission.classId })
            .then(res => setPolicies(res.data?.policies ?? []))
            .catch(() => setPolicies([]))
            .finally(() => setLoading(false));
    }, [open, permission]);

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={`${permission?.teacherName ?? 'Teacher'}'s Policies`}
            subtitle={`Assessment policies created by this teacher for ${permission?.className ?? 'their class'}. Read-only.`}
            width="max-w-lg"
        >
            {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                    <Loader2 size={14} className="animate-spin" /> Loading…
                </div>
            ) : policies.length === 0 ? (
                <EmptyState
                    title="No policies created yet"
                    description="This teacher hasn't created any assessment policies yet."
                />
            ) : (
                <div className="space-y-3">
                    {policies.map(p => (
                        <div key={p.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                            <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                            {p.description && <p className="text-xs text-gray-500">{p.description}</p>}
                            <div className="flex flex-wrap gap-1.5">
                                {(p.caComponents ?? []).map((c, i) => (
                                    <span key={c.id ?? i} className="text-[11px] bg-white border border-gray-200 text-gray-600 font-mono px-1.5 py-0.5 rounded">
                                        {c.name} <span className="font-semibold">{c.maxScore}</span>
                                    </span>
                                ))}
                                <span className="text-[11px] bg-blue-50 border border-blue-200 text-blue-700 font-mono px-1.5 py-0.5 rounded">
                                    Exam <span className="font-semibold">{p.examMax}</span>
                                </span>
                            </div>
                            {(p.assignments ?? []).length > 0 && (
                                <p className="text-[11px] text-gray-400">
                                    Assigned to: {p.assignments.map(a => a.scopeName).join(', ')}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Drawer>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Policy Permissions tab
// ═════════════════════════════════════════════════════════════════════════════

export default function PolicyPermissionsTab() {
    const [permissions, setPermissions]       = useState([]);
    const [loading, setLoading]               = useState(true);
    const [error, setError]                   = useState(null);

    const [grantOpen, setGrantOpen]           = useState(false);
    const [revokeTarget, setRevokeTarget]     = useState(null);
    const [viewTarget, setViewTarget]         = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await listPolicyPermissions();
            setPermissions(res.data?.permissions ?? []);
        } catch (e) {
            setError(e?.message || 'Failed to load permissions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleGranted = (perm) => setPermissions(prev => [...prev, perm]);

    const handleRevoke = async () => {
        if (!revokeTarget) return;
        await revokePolicyPermission(revokeTarget.id);
        setPermissions(prev => prev.filter(p => p.id !== revokeTarget.id));
        pushToast({ message: `Permission revoked for ${revokeTarget.teacherName}.`, type: 'success' });
    };

    const columns = [
        {
            id: 'teacher',
            header: 'Teacher',
            accessor: r => r.teacherName,
            sortable: true,
            render: r => (
                <div>
                    <p className="text-sm font-semibold text-gray-900">{r.teacherName}</p>
                </div>
            ),
        },
        {
            id: 'class',
            header: 'Class',
            accessor: r => r.className,
            sortable: true,
            render: r => (
                <span className="text-sm text-gray-700 font-medium">{r.className}</span>
            ),
            width: '120px',
        },
        {
            id: 'policyCount',
            header: 'Policies Created',
            accessor: r => r.policyCount ?? 0,
            sortable: true,
            render: r => (
                <span className={`text-sm font-semibold ${(r.policyCount ?? 0) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                    {r.policyCount ?? 0}
                </span>
            ),
            width: '140px',
        },
        {
            id: 'grantedAt',
            header: 'Granted',
            accessor: r => r.grantedAt,
            sortable: true,
            render: r => (
                <span className="text-xs text-gray-500">
                    {new Date(r.grantedAt).toLocaleDateString()}
                </span>
            ),
            width: '120px',
        },
        {
            id: 'actions',
            header: '',
            hideable: false,
            render: r => (
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => setViewTarget(r)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-1"
                        title="View policies"
                    >
                        <Eye size={12} /> View
                    </button>
                    <button
                        onClick={() => setRevokeTarget(r)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Revoke permission"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
            width: '120px',
        },
    ];

    const HELP_CARDS = [
        {
            icon: Users,
            title: 'What is policy delegation?',
            body: 'Grant specific teachers permission to create their own CA structure for their class. They get the same policy builder as admin, scoped only to their class.',
        },
        {
            icon: BookOpen,
            title: 'How priorities work',
            body: 'Teacher-created policies take priority over admin-defined policies for their class. Admin policies still apply where the teacher has not created one.',
        },
        {
            icon: ShieldCheck,
            title: 'Revoking permissions',
            body: 'Revoking stops the teacher from creating new policies. Their existing policies remain but no longer override admin policies until you re-grant.',
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            {/* Help strip */}
            <HelpCards cards={HELP_CARDS} label="Teacher Permissions — Help" />

            {/* Permissions table */}
            <WorkbenchTable
                title="Teacher Policy Permissions"
                storageKey="policy-permissions-settings"
                columns={columns}
                rows={permissions}
                loading={loading}
                error={error}
                onRetry={load}
                searchPlaceholder="Search by teacher or class…"
                searchKeys={['teacherName', 'className']}
                primaryAction={{
                    label: 'Grant Permission',
                    icon: Plus,
                    onClick: () => setGrantOpen(true),
                }}
                emptyState={{
                    title: 'No permissions granted yet',
                    description: 'Grant a teacher permission to create their own assessment policies for their class.',
                    action: { label: 'Grant Permission', onClick: () => setGrantOpen(true) },
                }}
            />

            {/* Grant drawer */}
            <GrantPermissionDrawer
                open={grantOpen}
                onClose={() => setGrantOpen(false)}
                onGranted={handleGranted}
            />

            {/* View teacher policies drawer */}
            <TeacherPoliciesDrawer
                open={Boolean(viewTarget)}
                onClose={() => setViewTarget(null)}
                permission={viewTarget}
            />

            {/* Revoke confirmation */}
            <ConfirmDestructiveDialog
                open={Boolean(revokeTarget)}
                onClose={() => setRevokeTarget(null)}
                verb="Revoke"
                noun="policy permission"
                recordName={revokeTarget ? `${revokeTarget.teacherName} — ${revokeTarget.className}` : ''}
                consequence="The teacher will no longer be able to create or edit policies. Their existing policies remain but will not override admin policies until you re-grant."
                requireReason={false}
                onConfirm={handleRevoke}
            />
        </div>
    );
}
