import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Trash2, Loader2, Check, X,
    BookOpen, Layers, Users, FlaskConical,
    Info, AlertCircle, Lock,
} from 'lucide-react';
import TeacherLayout from './components/layout/TeacherLayout.jsx';
import {
    WorkbenchTable, ConfirmDestructiveDialog, Drawer, pushToast, EmptyState,
} from '../../../components/patterns';
import {
    getMyPolicyPermission,
    listMyPolicies,
    createMyPolicy,
    updateMyPolicy,
    deleteMyPolicy,
    addMyPolicyAssignment,
    removeMyPolicyAssignment,
    getMyClassArms,
    getMySubjects,
} from './services/teacherPoliciesAPIs.js';

// ─── Scope config (simplified — no school/global-subject scope for teachers) ──

const TEACHER_SCOPES = [
    {
        value: 'class',
        label: 'All arms in my class (default)',
        icon: Users,
        color: 'blue',
        description: 'This policy applies to all your arms in your assigned class.',
        needsPrimary: false,
    },
    {
        value: 'arm',
        label: 'Specific arm',
        icon: Layers,
        color: 'blue',
        description: 'This policy applies to one specific arm only.',
        needsPrimary: 'arm',
    },
    {
        value: 'subject_class',
        label: 'Specific subject in my class',
        icon: FlaskConical,
        color: 'amber',
        description: 'This policy applies to one subject you teach, across all arms in your class.',
        needsPrimary: 'subject',
    },
];

const SCOPE_META = Object.fromEntries(TEACHER_SCOPES.map(s => [s.value, s]));

const SCOPE_CHIP_STYLE = {
    class:         'bg-blue-50 text-blue-700 border-blue-200',
    arm:           'bg-blue-50 text-blue-700 border-blue-200',
    subject_class: 'bg-amber-50 text-amber-700 border-amber-200',
};

function assignmentLabel(a) {
    if (a.scope === 'class') return `All arms — ${a.scopeName ?? 'class'}`;
    return a.scopeName ?? a.scopeId ?? '—';
}

// ─── CA Components builder (identical to admin) ────────────────────────────────

const EMPTY_COMP = () => ({
    _key: `c_${Date.now()}_${Math.random()}`,
    name: '',
    maxScore: '',
});

function ComponentsBuilder({ components, onChange }) {
    const caTotal = components.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);

    const update = (key, field, val) =>
        onChange(components.map(c => c._key === key ? { ...c, [field]: val } : c));

    const remove = (key) => {
        if (components.length === 1) return;
        onChange(components.filter(c => c._key !== key));
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    CA Components
                </label>
                <button type="button" onClick={() => onChange([...components, EMPTY_COMP()])}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                    <Plus size={12} /> Add Component
                </button>
            </div>

            <div className="grid grid-cols-[1fr_96px_32px] gap-2 px-1 mb-1">
                {['Component Name', 'Max Marks', ''].map(h => (
                    <span key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</span>
                ))}
            </div>

            <div className="space-y-1.5">
                {components.map(c => (
                    <div key={c._key} className="grid grid-cols-[1fr_96px_32px] gap-2 items-center">
                        <input value={c.name} onChange={e => update(c._key, 'name', e.target.value)}
                            placeholder="e.g. Test 1, Mid-term…"
                            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        <input type="number" value={c.maxScore} onChange={e => update(c._key, 'maxScore', e.target.value)}
                            placeholder="10" min={0} max={100}
                            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-right font-mono" />
                        <button type="button" onClick={() => remove(c._key)} disabled={components.length === 1}
                            className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-30 transition-colors">
                            <Trash2 size={13} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-3 flex items-center justify-between px-1 py-2 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-xs text-slate-500 font-medium">CA Total</span>
                <span className="text-sm font-bold font-mono text-slate-700">{caTotal} marks</span>
            </div>
        </div>
    );
}

// ─── Simplified Add Assignment form (class / arm / subject_class only) ─────────

function AddAssignmentForm({ permission, onAdd, onCancel }) {
    const [scope, setScope]       = useState('class');
    const [arms, setArms]         = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [selectedArmId, setSelectedArmId]         = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState(null);

    useEffect(() => {
        setLoadingData(true);
        Promise.all([
            getMyClassArms().catch(() => ({ data: { arms: [] } })),
            getMySubjects().catch(() => ({ data: { subjects: [] } })),
        ]).then(([aRes, sRes]) => {
            setArms(aRes.data?.arms ?? []);
            setSubjects(sRes.data?.subjects ?? []);
        }).finally(() => setLoadingData(false));
    }, []);

    useEffect(() => {
        setSelectedArmId(''); setSelectedSubjectId(''); setError(null);
    }, [scope]);

    const handleAdd = async () => {
        if (scope === 'arm'           && !selectedArmId)     { setError('Select an arm.'); return; }
        if (scope === 'subject_class' && !selectedSubjectId) { setError('Select a subject.'); return; }

        const arm     = arms.find(a => a.id === selectedArmId);
        const subject = subjects.find(s => s.id === selectedSubjectId);

        const payload = {
            scope,
            scopeId:   scope === 'arm'           ? selectedArmId
                     : scope === 'subject_class' ? selectedSubjectId
                     : null,
            scopeName: scope === 'arm'           ? arm?.name
                     : scope === 'subject_class' ? subject?.name
                     : permission?.className,
        };

        setSaving(true); setError(null);
        try { await onAdd(payload); }
        catch (e) { setError(e?.message || 'Failed to add assignment.'); setSaving(false); }
    };

    return (
        <div className="space-y-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Assign to</label>
                <div className="space-y-1.5">
                    {TEACHER_SCOPES.map(s => {
                        const Icon = s.icon;
                        const active = scope === s.value;
                        return (
                            <button key={s.value} type="button" onClick={() => setScope(s.value)}
                                className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${
                                    active ? 'bg-white border-blue-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-white hover:border-gray-200'
                                }`}>
                                <Icon size={14} className={`mt-0.5 shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                                <div>
                                    <p className={`text-xs font-semibold ${active ? 'text-gray-900' : 'text-gray-500'}`}>{s.label}</p>
                                    {active && <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{s.description}</p>}
                                </div>
                                {active && <Check size={13} className="ml-auto mt-0.5 text-blue-600 shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {loadingData ? (
                <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 size={12} className="animate-spin" /> Loading…</div>
            ) : (
                <>
                    {scope === 'arm' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Arm in {permission?.className} <span className="text-red-400">*</span>
                            </label>
                            <select value={selectedArmId} onChange={e => setSelectedArmId(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                                <option value="">— choose an arm —</option>
                                {arms.map(a => <option key={a.id} value={a.id}>Arm {a.name}</option>)}
                            </select>
                        </div>
                    )}
                    {scope === 'subject_class' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Subject <span className="text-red-400">*</span>
                            </label>
                            <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                                <option value="">— choose a subject —</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                </>
            )}

            {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}

            <div className="flex gap-2">
                <button type="button" onClick={handleAdd} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {saving && <Loader2 size={11} className="animate-spin" />}
                    Add Assignment
                </button>
                <button type="button" onClick={onCancel}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-semibold text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
}

// ─── Assignments section ────────────────────────────────────────────────────────

function AssignmentsSection({ assignments, permission, onAdd, onRemove }) {
    const [addOpen, setAddOpen]       = useState(false);
    const [removingId, setRemovingId] = useState(null);

    const handleAdd = async (payload) => { await onAdd(payload); setAddOpen(false); };
    const handleRemove = async (id) => {
        setRemovingId(id);
        try { await onRemove(id); } finally { setRemovingId(null); }
    };

    return (
        <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                Where This Policy Applies
            </h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Assign to all your arms or narrow to a specific arm or subject within {permission?.className ?? 'your class'}.
            </p>

            {assignments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No assignments yet — add one below.</p>
            ) : (
                <div className="space-y-1.5">
                    {assignments.map(a => {
                        const Icon = SCOPE_META[a.scope]?.icon ?? Users;
                        const isRemoving = removingId === a.id;
                        return (
                            <div key={a.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${SCOPE_CHIP_STYLE[a.scope] ?? 'bg-gray-50 border-gray-200'}`}>
                                <Icon size={13} className="shrink-0 opacity-70" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{assignmentLabel(a)}</p>
                                    <p className="text-[10px] opacity-60 capitalize">{SCOPE_META[a.scope]?.label ?? a.scope}</p>
                                </div>
                                <button type="button" onClick={() => handleRemove(a.id)} disabled={isRemoving}
                                    className="p-1 rounded-md opacity-50 hover:opacity-100 transition-opacity disabled:opacity-30">
                                    {isRemoving ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {addOpen ? (
                <AddAssignmentForm permission={permission} onAdd={handleAdd} onCancel={() => setAddOpen(false)} />
            ) : (
                <button type="button" onClick={() => setAddOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors py-1">
                    <Plus size={13} /> Add Assignment
                </button>
            )}
        </div>
    );
}

// ─── Policy drawer (create + manage/edit) ──────────────────────────────────────

function PolicyDrawer({ open, onClose, initial, permission, onCreated, onUpdated }) {
    const isEdit = Boolean(initial?.id);

    const [name, setName]             = useState('');
    const [desc, setDesc]             = useState('');
    const [components, setComponents] = useState([EMPTY_COMP()]);
    const [examMax, setExamMax]       = useState('');
    const [saving, setSaving]         = useState(false);
    const [error, setError]           = useState(null);
    const [assignments, setAssignments] = useState([]);

    useEffect(() => {
        if (open) {
            setName(initial?.name ?? '');
            setDesc(initial?.description ?? '');
            setExamMax(initial?.examMax !== undefined ? String(initial.examMax) : '');
            setComponents(
                initial?.caComponents?.length
                    ? initial.caComponents.map(c => ({ ...c, _key: c.id ?? `c_${Math.random()}` }))
                    : [EMPTY_COMP()],
            );
            setAssignments(initial?.assignments ?? []);
            setSaving(false); setError(null);
        }
    }, [open, initial]);

    const caTotal    = components.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);
    const grandTotal = caTotal + (Number(examMax) || 0);

    const validate = () => {
        if (!name.trim())                                           return 'Policy name is required.';
        if (components.some(c => !c.name.trim()))                  return 'Every CA component must have a name.';
        if (components.some(c => c.maxScore === '' || Number(c.maxScore) <= 0))
                                                                   return 'Every CA component must have a max score > 0.';
        if (examMax === '' || Number(examMax) < 0)                 return 'Exam max marks are required.';
        if (grandTotal !== 100)                                    return `CA + Exam must equal 100 (currently ${grandTotal}).`;
        return null;
    };

    const handleSave = async () => {
        const err = validate(); if (err) { setError(err); return; }

        const payload = {
            name: name.trim(),
            description: desc.trim() || undefined,
            caComponents: components.map((c, i) => ({ name: c.name.trim(), maxScore: Number(c.maxScore), sortOrder: i })),
            examMax: Number(examMax),
        };

        setSaving(true); setError(null);
        try {
            if (isEdit) {
                const res = await updateMyPolicy(initial.id, payload);
                onUpdated({ ...initial, ...res.data?.policy, ...payload, caMax: caTotal, total: grandTotal, assignments });
                pushToast({ message: 'Policy updated.', type: 'success' });
            } else {
                const res = await createMyPolicy(payload);
                onCreated(res.data?.policy);
                pushToast({ message: `"${payload.name}" policy created.`, type: 'success' });
            }
            onClose();
        } catch (e) {
            setError(e?.message || `Failed to ${isEdit ? 'update' : 'create'} policy.`);
        } finally {
            setSaving(false);
        }
    };

    const handleAddAssignment = async (payload) => {
        const res = await addMyPolicyAssignment(initial.id, payload);
        const newA = res.data?.assignment;
        if (newA) {
            setAssignments(prev => [...prev, newA]);
            onUpdated({ ...initial, assignments: [...assignments, newA] });
            pushToast({ message: 'Assignment added.', type: 'success' });
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
        await removeMyPolicyAssignment(initial.id, assignmentId);
        const updated = assignments.filter(a => a.id !== assignmentId);
        setAssignments(updated);
        onUpdated({ ...initial, assignments: updated });
        pushToast({ message: 'Assignment removed.', type: 'success' });
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={isEdit ? `Manage: ${initial?.name ?? ''}` : 'New Assessment Policy'}
            subtitle={isEdit
                ? 'Edit the policy definition and manage where it applies within your class.'
                : 'Define CA components and exam weight for your class.'}
            width="max-w-xl"
            footer={
                <>
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        {isEdit ? 'Close' : 'Cancel'}
                    </button>
                    <button type="button" onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {isEdit ? 'Save Changes' : 'Create Policy'}
                    </button>
                </>
            }
        >
            {/* Policy definition */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Policy Definition</h3>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Policy Name <span className="text-red-400">*</span></label>
                    <input value={name} onChange={e => setName(e.target.value)}
                        placeholder="e.g. My SS 2 Policy (40 CA / 60 Exam)"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                    <input value={desc} onChange={e => setDesc(e.target.value)}
                        placeholder="Optional — describe this policy"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
            </div>

            {/* CA Components */}
            <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Continuous Assessment Breakdown</h3>
                <ComponentsBuilder components={components} onChange={setComponents} />
            </div>

            {/* Exam max */}
            <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Final Exam</h3>
                <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Exam Max Marks <span className="text-red-400">*</span></label>
                        <input type="number" value={examMax} onChange={e => setExamMax(e.target.value)}
                            placeholder="70" min={0} max={100}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Grand Total</label>
                        <div className={`px-3 py-2 text-sm font-bold rounded-lg border font-mono flex items-center justify-between ${
                            grandTotal === 100 ? 'border-green-200 bg-green-50 text-green-700'
                            : (caTotal === 0 && examMax === '') ? 'border-gray-200 bg-gray-50 text-gray-400'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}>
                            {grandTotal} / 100
                            {grandTotal === 100 && <Check size={13} />}
                        </div>
                    </div>
                </div>
                {grandTotal !== 100 && (caTotal > 0 || examMax !== '') && (
                    <p className="text-[11px] text-amber-700 flex items-center gap-1.5">
                        <AlertCircle size={11} />
                        CA ({caTotal}) + Exam ({Number(examMax) || 0}) = {grandTotal}. Must equal 100.
                    </p>
                )}
            </div>

            {error && (
                <p className="text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Assignments (edit mode only) */}
            {isEdit && (
                <AssignmentsSection
                    assignments={assignments}
                    permission={permission}
                    onAdd={handleAddAssignment}
                    onRemove={handleRemoveAssignment}
                />
            )}

            {!isEdit && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                    <Info size={13} className="mt-0.5 shrink-0" />
                    After creating the policy, click <strong>Manage</strong> to assign it to your arms or a specific subject.
                </div>
            )}
        </Drawer>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Teacher Assessment Policies page
// ═════════════════════════════════════════════════════════════════════════════

function TeacherAssessmentPoliciesContent() {
    const [permission, setPermission]       = useState(null);
    const [permLoading, setPermLoading]     = useState(true);
    const [policies, setPolicies]           = useState([]);
    const [loading, setLoading]             = useState(false);
    const [error, setError]                 = useState(null);

    const [createOpen, setCreateOpen]       = useState(false);
    const [manageTarget, setManageTarget]   = useState(null);
    const [deleteTarget, setDeleteTarget]   = useState(null);

    // Check permission on mount
    useEffect(() => {
        getMyPolicyPermission()
            .then(res => setPermission(res.data))
            .catch(() => setPermission({ granted: false }))
            .finally(() => setPermLoading(false));
    }, []);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await listMyPolicies();
            setPolicies(res.data?.policies ?? []);
        } catch (e) {
            setError(e?.message || 'Failed to load policies.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (permission?.granted) load();
    }, [permission, load]);

    const handleCreated  = (p) => setPolicies(prev => [...prev, p]);
    const handleUpdated  = (u) => setPolicies(prev => prev.map(p => p.id === u.id ? { ...p, ...u } : p));
    const handleDelete   = async () => {
        if (!deleteTarget) return;
        await deleteMyPolicy(deleteTarget.id);
        setPolicies(prev => prev.filter(p => p.id !== deleteTarget.id));
        pushToast({ message: `"${deleteTarget.name}" deleted.`, type: 'success' });
    };

    if (permLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
        );
    }

    if (!permission?.granted) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="p-4 bg-gray-100 rounded-full">
                    <Lock size={32} className="text-gray-400" />
                </div>
                <div className="text-center max-w-sm">
                    <p className="text-base font-semibold text-gray-700 mb-1">Permission not granted</p>
                    <p className="text-sm text-gray-500">
                        Your school administrator has not enabled teacher-defined assessment policies for your class yet.
                        Contact your admin to get access.
                    </p>
                </div>
            </div>
        );
    }

    const columns = [
        {
            id: 'name',
            header: 'Policy Name',
            accessor: r => r.name,
            sortable: true,
        },
        {
            id: 'caBreakdown',
            header: 'CA Breakdown',
            accessor: r => r.caComponents?.length ?? 0,
            render: r => {
                const comps = r.caComponents ?? [];
                if (comps.length === 0) return <span className="text-xs text-gray-300 italic">No components</span>;
                return (
                    <div className="flex flex-wrap gap-1">
                        {comps.map((c, i) => (
                            <span key={c.id ?? i} className="text-[11px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded">
                                {c.name} <span className="font-semibold">{c.maxScore}</span>
                            </span>
                        ))}
                    </div>
                );
            },
            hideable: true,
        },
        {
            id: 'split',
            header: 'CA / Exam',
            accessor: r => r.caMax ?? 0,
            render: r => (
                <span className="text-sm font-mono text-gray-700">
                    <span className="font-bold">{r.caMax ?? 0}</span>
                    <span className="text-gray-400"> / </span>
                    <span className="font-bold">{r.examMax ?? 0}</span>
                </span>
            ),
            sortable: true,
            width: '110px',
        },
        {
            id: 'assignments',
            header: 'Assigned To',
            accessor: r => r.assignments?.length ?? 0,
            render: r => {
                const list = r.assignments ?? [];
                if (list.length === 0) return <span className="text-xs text-gray-300 italic">Unassigned</span>;
                const visible = list.slice(0, 2);
                return (
                    <div className="flex flex-wrap gap-1">
                        {visible.map(a => (
                            <span key={a.id} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${SCOPE_CHIP_STYLE[a.scope] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {assignmentLabel(a)}
                            </span>
                        ))}
                        {list.length > 2 && <span className="text-[11px] text-gray-400 font-semibold">+{list.length - 2}</span>}
                    </div>
                );
            },
            width: '220px',
        },
        {
            id: 'actions',
            header: '',
            hideable: false,
            render: r => (
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setManageTarget(r)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors">
                        Manage
                    </button>
                    <button onClick={() => setDeleteTarget(r)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
            width: '130px',
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            {/* Context banner */}
            <div className="flex items-center gap-2 px-4 py-3 bg-violet-50 border border-violet-200 rounded-2xl text-sm text-violet-700">
                <BookOpen size={16} className="shrink-0" />
                <span>You are managing assessment policies for <strong>{permission.className}</strong>. Your policies take priority over school-wide admin policies for your class.</span>
            </div>

            {/* Info cards */}
            <div className="grid sm:grid-cols-2 gap-4">
                {[
                    {
                        icon: BookOpen,
                        title: 'What is an assessment policy?',
                        body: 'A policy sets the CA components teachers use (e.g. Test 1 = 15 marks) and the final Exam weight. CA + Exam must always equal 100.',
                    },
                    {
                        icon: Layers,
                        title: 'How to assign a policy',
                        body: 'Create a policy, then click Manage to assign it — to all your arms, a specific arm, or a specific subject. The most specific assignment always wins.',
                    },
                ].map(({ icon: Icon, title, body }) => (
                    <div key={title} className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                        <div className="p-2 bg-white rounded-xl border border-blue-100 text-blue-600 shrink-0 h-fit"><Icon size={15} /></div>
                        <div>
                            <p className="text-xs font-bold text-blue-900 mb-1">{title}</p>
                            <p className="text-xs text-blue-700 leading-relaxed">{body}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <WorkbenchTable
                title="My Policies"
                storageKey="teacher-assessment-policies"
                columns={columns}
                rows={policies}
                loading={loading}
                error={error}
                onRetry={load}
                searchPlaceholder="Search policies…"
                searchKeys={['name', 'description']}
                primaryAction={{
                    label: 'New Policy',
                    icon: Plus,
                    onClick: () => setCreateOpen(true),
                }}
                emptyState={{
                    title: 'No policies yet',
                    description: `Create your first policy for ${permission.className}.`,
                    action: { label: 'New Policy', onClick: () => setCreateOpen(true) },
                }}
            />

            {/* Create drawer */}
            <PolicyDrawer open={createOpen} onClose={() => setCreateOpen(false)} initial={null}
                permission={permission} onCreated={handleCreated} onUpdated={() => {}} />

            {/* Manage drawer */}
            <PolicyDrawer open={Boolean(manageTarget)} onClose={() => setManageTarget(null)} initial={manageTarget}
                permission={permission} onCreated={() => {}} onUpdated={handleUpdated} />

            {/* Delete confirm */}
            <ConfirmDestructiveDialog
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                verb="Delete"
                noun="assessment policy"
                recordName={deleteTarget?.name ?? ''}
                consequence="Teachers in your class will lose their score-entry structure for the next assessment cycle."
                requireReason={false}
                onConfirm={handleDelete}
            />
        </div>
    );
}

export default function TeacherAssessmentPoliciesPage() {
    return (
        <TeacherLayout>
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Assessment Policies</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Define CA components and exam weights for your class. Your policies override school-level admin policies.
                    </p>
                </div>
                <TeacherAssessmentPoliciesContent />
            </div>
        </TeacherLayout>
    );
}
