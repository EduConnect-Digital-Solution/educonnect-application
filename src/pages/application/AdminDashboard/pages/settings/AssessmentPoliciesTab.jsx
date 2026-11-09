import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Trash2, Loader2, Check, X,
    BookOpen, GraduationCap, Users, Layers, FlaskConical, Globe,
    Info, AlertCircle, User,
} from 'lucide-react';
import {
    WorkbenchTable, ConfirmDestructiveDialog, Drawer, pushToast, HelpCards,
} from '../../../../../components/patterns';
import {
    listAssessmentPolicies,
    createAssessmentPolicy,
    updateAssessmentPolicy,
    deleteAssessmentPolicy,
    addPolicyAssignment,
    removePolicyAssignment,
} from '../../services/gradingAPIs.js';
import { getSchoolClasses } from '../../services/classAPIs.js';
import { getSchoolSubjects } from '../../services/subjectAPIs.js';

// ─── Scope config ──────────────────────────────────────────────────────────────

const SCOPES = [
    {
        value: 'school',
        label: 'Whole school (default)',
        icon: Globe,
        color: 'purple',
        description: 'Every class and subject follows this policy unless a more specific assignment overrides it.',
        needsPrimary: false,
        needsSecondary: false,
    },
    {
        value: 'class',
        label: 'Specific classes',
        icon: Users,
        color: 'blue',
        description: 'Selected class levels follow this policy. Subject-level assignments within those classes still take priority.',
        needsPrimary: 'class',
        needsSecondary: false,
    },
    {
        value: 'arm',
        label: 'Specific arm',
        icon: Layers,
        color: 'blue',
        description: 'A single class arm follows this policy.',
        needsPrimary: 'arm',
        needsSecondary: false,
    },
    {
        value: 'subject',
        label: 'A subject (all classes)',
        icon: BookOpen,
        color: 'green',
        description: 'This subject follows this policy across all classes in the school.',
        needsPrimary: 'subject',
        needsSecondary: false,
    },
    {
        value: 'subject_class',
        label: 'Subject within a class',
        icon: FlaskConical,
        color: 'amber',
        description: 'Most specific: this subject only within this class. Overrides any class or school assignment.',
        needsPrimary: 'subject',
        needsSecondary: 'class',
    },
];

const SCOPE_META = Object.fromEntries(SCOPES.map(s => [s.value, s]));

const SCOPE_CHIP_STYLE = {
    school:        'bg-purple-50 text-purple-700 border-purple-200',
    class:         'bg-blue-50 text-blue-700 border-blue-200',
    arm:           'bg-blue-50 text-blue-700 border-blue-200',
    subject:       'bg-green-50 text-green-700 border-green-200',
    subject_class: 'bg-amber-50 text-amber-700 border-amber-200',
};

function assignmentLabel(a) {
    if (a.scope === 'school')        return 'School default';
    if (a.scope === 'subject_class') return `${a.scopeName} — ${a.secondaryScopeName}`;
    return a.scopeName ?? a.scopeId ?? '—';
}

// ─── CA Components builder ──────────────────────────────────────────────────────

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
                <button
                    type="button"
                    onClick={() => onChange([...components, EMPTY_COMP()])}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                    <Plus size={12} /> Add Component
                </button>
            </div>

            <div className="grid grid-cols-[1fr_96px_32px] gap-2 px-1 mb-1">
                {['Component Name', 'Max Marks', ''].map(h => (
                    <span key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {h}
                    </span>
                ))}
            </div>

            <div className="space-y-1.5">
                {components.map(c => (
                    <div key={c._key} className="grid grid-cols-[1fr_96px_32px] gap-2 items-center">
                        <input
                            value={c.name}
                            onChange={e => update(c._key, 'name', e.target.value)}
                            placeholder="e.g. Test 1, Mid-term…"
                            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <input
                            type="number"
                            value={c.maxScore}
                            onChange={e => update(c._key, 'maxScore', e.target.value)}
                            placeholder="10"
                            min={0} max={100}
                            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-right font-mono"
                        />
                        <button
                            type="button"
                            onClick={() => remove(c._key)}
                            disabled={components.length === 1}
                            className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-30 transition-colors"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                ))}
            </div>

            {/* CA sub-total */}
            <div className="mt-3 flex items-center justify-between px-1 py-2 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-xs text-slate-500 font-medium">CA Total</span>
                <span className="text-sm font-bold font-mono text-slate-700">{caTotal} marks</span>
            </div>
        </div>
    );
}

// ─── Add Assignment inline form ─────────────────────────────────────────────────

function AddAssignmentForm({ onAdd, onCancel }) {
    const [scope, setScope]             = useState('class');
    const [classes, setClasses]         = useState([]);
    const [subjects, setSubjects]       = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    // Primary selector state (class/subject/arm)
    const [selectedClassId, setSelectedClassId]     = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    // Secondary selector state (for subject_class)
    const [secondaryClassId, setSecondaryClassId] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState(null);

    const scopeMeta = SCOPE_META[scope];

    // Load class + subject lists once
    useEffect(() => {
        setLoadingData(true);
        Promise.all([
            getSchoolClasses().catch(() => ({ data: { classes: [] } })),
            getSchoolSubjects().catch(() => ({ data: { subjects: [] } })),
        ]).then(([cRes, sRes]) => {
            setClasses(cRes.data?.classes ?? []);
            setSubjects(sRes.data?.subjects ?? []);
        }).finally(() => setLoadingData(false));
    }, []);

    // Reset selections when scope changes
    useEffect(() => {
        setSelectedClassId('');
        setSelectedSubjectId('');
        setSecondaryClassId('');
        setError(null);
    }, [scope]);

    const handleAdd = async () => {
        if (scopeMeta.needsPrimary === 'class'   && !selectedClassId)   { setError('Select a class.'); return; }
        if (scopeMeta.needsPrimary === 'subject' && !selectedSubjectId) { setError('Select a subject.'); return; }
        if (scopeMeta.needsSecondary === 'class' && !secondaryClassId)  { setError('Select a class.'); return; }

        const selectedClass   = classes.find(c => c.id === selectedClassId);
        const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
        const secondaryClass  = classes.find(c => c.id === secondaryClassId);

        const payload = {
            scope,
            scopeId:             scope === 'class'         ? selectedClassId
                               : scope === 'arm'           ? selectedClassId
                               : scope === 'subject'       ? selectedSubjectId
                               : scope === 'subject_class' ? selectedSubjectId
                               : null,
            scopeName:           scope === 'class'         ? selectedClass?.name
                               : scope === 'arm'           ? selectedClass?.name
                               : scope === 'subject'       ? selectedSubject?.name
                               : scope === 'subject_class' ? selectedSubject?.name
                               : null,
            secondaryScopeId:   scope === 'subject_class' ? secondaryClassId : null,
            secondaryScopeName: scope === 'subject_class' ? secondaryClass?.name : null,
        };

        setSaving(true); setError(null);
        try {
            await onAdd(payload);
        } catch (e) {
            setError(e?.message || 'Failed to add assignment.');
            setSaving(false);
        }
    };

    return (
        <div className="space-y-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            {/* Scope selector */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Assign to
                </label>
                <div className="space-y-1.5">
                    {SCOPES.map(s => {
                        const Icon = s.icon;
                        const active = scope === s.value;
                        return (
                            <button
                                key={s.value}
                                type="button"
                                onClick={() => setScope(s.value)}
                                className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${
                                    active
                                        ? 'bg-white border-blue-300 shadow-sm'
                                        : 'bg-transparent border-transparent hover:bg-white hover:border-gray-200'
                                }`}
                            >
                                <Icon size={14} className={`mt-0.5 shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                                <div>
                                    <p className={`text-xs font-semibold ${active ? 'text-gray-900' : 'text-gray-500'}`}>
                                        {s.label}
                                    </p>
                                    {active && (
                                        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                                            {s.description}
                                        </p>
                                    )}
                                </div>
                                {active && <Check size={13} className="ml-auto mt-0.5 text-blue-600 shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Dynamic secondary selectors */}
            {loadingData ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Loader2 size={12} className="animate-spin" /> Loading…
                </div>
            ) : (
                <>
                    {(scopeMeta.needsPrimary === 'class' || scopeMeta.needsSecondary === 'class') && scope !== 'subject_class' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Select class <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={selectedClassId}
                                onChange={e => setSelectedClassId(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                            >
                                <option value="">— choose a class —</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {scopeMeta.needsPrimary === 'subject' && scope !== 'subject_class' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Select subject <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={selectedSubjectId}
                                onChange={e => setSelectedSubjectId(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                            >
                                <option value="">— choose a subject —</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {scope === 'subject_class' && (
                        <>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Subject <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={selectedSubjectId}
                                    onChange={e => setSelectedSubjectId(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                                >
                                    <option value="">— choose a subject —</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Within class <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={secondaryClassId}
                                    onChange={e => setSecondaryClassId(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                                >
                                    <option value="">— choose a class —</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                </>
            )}

            {error && (
                <p className="text-[11px] font-medium text-red-600">{error}</p>
            )}

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {saving && <Loader2 size={11} className="animate-spin" />}
                    Add Assignment
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-semibold text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

// ─── Assignments section (inside Manage drawer) ─────────────────────────────────

function AssignmentsSection({ assignments, onAdd, onRemove }) {
    const [addOpen, setAddOpen]             = useState(false);
    const [removingId, setRemovingId]       = useState(null);

    const handleAdd = async (payload) => {
        await onAdd(payload);
        setAddOpen(false);
    };

    const handleRemove = async (assignmentId) => {
        setRemovingId(assignmentId);
        try {
            await onRemove(assignmentId);
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <div className="space-y-3">
            <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                    Where This Policy Applies
                </h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Add assignments below. A more specific scope always overrides a broader one —
                    a subject assignment takes priority over a class assignment, which takes priority over the school default.
                </p>
            </div>

            {/* Existing assignments */}
            {assignments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No assignments yet — add one below.</p>
            ) : (
                <div className="space-y-1.5">
                    {assignments.map(a => {
                        const Icon = SCOPE_META[a.scope]?.icon ?? Globe;
                        const isRemoving = removingId === a.id;
                        return (
                            <div
                                key={a.id}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${SCOPE_CHIP_STYLE[a.scope] ?? 'bg-gray-50 border-gray-200'}`}
                            >
                                <Icon size={13} className="shrink-0 opacity-70" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{assignmentLabel(a)}</p>
                                    <p className="text-[10px] opacity-60 capitalize">{SCOPE_META[a.scope]?.label ?? a.scope}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(a.id)}
                                    disabled={isRemoving}
                                    className="p-1 rounded-md opacity-50 hover:opacity-100 transition-opacity disabled:opacity-30"
                                >
                                    {isRemoving
                                        ? <Loader2 size={12} className="animate-spin" />
                                        : <X size={12} />}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add form */}
            {addOpen ? (
                <AddAssignmentForm
                    onAdd={handleAdd}
                    onCancel={() => setAddOpen(false)}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors py-1"
                >
                    <Plus size={13} /> Add Assignment
                </button>
            )}
        </div>
    );
}

// ─── Policy drawer (create + manage/edit) ──────────────────────────────────────

function PolicyDrawer({ open, onClose, initial, onCreated, onUpdated }) {
    const isEdit = Boolean(initial?.id);

    const [name, setName]           = useState('');
    const [desc, setDesc]           = useState('');
    const [components, setComponents] = useState([EMPTY_COMP()]);
    const [examMax, setExamMax]     = useState('');
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState(null);

    // Live assignment state (edit mode only)
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
            setSaving(false);
            setError(null);
        }
    }, [open, initial]);

    const caTotal  = components.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);
    const grandTotal = caTotal + (Number(examMax) || 0);

    const validate = () => {
        if (!name.trim())              return 'Policy name is required.';
        if (components.some(c => !c.name.trim())) return 'Every CA component must have a name.';
        if (components.some(c => c.maxScore === '' || Number(c.maxScore) <= 0))
            return 'Every CA component must have a max score greater than 0.';
        if (examMax === '' || Number(examMax) < 0) return 'Exam max marks are required.';
        if (grandTotal !== 100) return `CA total + Exam must equal 100 (currently ${grandTotal}).`;
        return null;
    };

    const handleSave = async () => {
        const err = validate();
        if (err) { setError(err); return; }

        const payload = {
            name: name.trim(),
            description: desc.trim() || undefined,
            caComponents: components.map((c, i) => ({
                name:      c.name.trim(),
                maxScore:  Number(c.maxScore),
                sortOrder: i,
            })),
            examMax: Number(examMax),
        };

        setSaving(true); setError(null);
        try {
            if (isEdit) {
                const res = await updateAssessmentPolicy(initial.id, payload);
                onUpdated({ ...initial, ...res.data?.policy, ...payload, caMax: caTotal, total: grandTotal, assignments });
                pushToast({ message: 'Policy updated.', type: 'success' });
            } else {
                const res = await createAssessmentPolicy(payload);
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
        const res = await addPolicyAssignment(initial.id, payload);
        const newAssignment = res.data?.assignment;
        if (newAssignment) {
            setAssignments(prev => [...prev, newAssignment]);
            onUpdated({ ...initial, assignments: [...assignments, newAssignment] });
            pushToast({ message: 'Assignment added.', type: 'success' });
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
        await removePolicyAssignment(initial.id, assignmentId);
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
                ? 'Edit the policy definition and manage where it applies.'
                : 'Define CA components and exam weight. You can assign it to classes and subjects after saving.'}
            width="max-w-xl"
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        {isEdit ? 'Close' : 'Cancel'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {isEdit ? 'Save Changes' : 'Create Policy'}
                    </button>
                </>
            }
        >
            {/* ── Policy definition ── */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                    Policy Definition
                </h3>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        Policy Name <span className="text-red-400">*</span>
                    </label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Standard Secondary (30 CA / 70 Exam)"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                    <input
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        placeholder="Optional — e.g. Used for JSS1–SS3 core subjects"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>

            {/* ── CA Components ── */}
            <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                    Continuous Assessment Breakdown
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                    List each CA component and its maximum marks. Teachers will see these exact
                    columns when entering scores.
                </p>
                <ComponentsBuilder components={components} onChange={setComponents} />
            </div>

            {/* ── Exam max + total indicator ── */}
            <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                    Final Exam
                </h3>
                <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Exam Max Marks <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="number"
                            value={examMax}
                            onChange={e => setExamMax(e.target.value)}
                            placeholder="70"
                            min={0} max={100}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Grand Total
                        </label>
                        <div
                            className={`px-3 py-2 text-sm font-bold rounded-lg border font-mono flex items-center justify-between ${
                                grandTotal === 100
                                    ? 'border-green-200 bg-green-50 text-green-700'
                                    : (caTotal === 0 && examMax === '')
                                        ? 'border-gray-200 bg-gray-50 text-gray-400'
                                        : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}
                        >
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

            {/* Form-level error */}
            {error && (
                <p className="text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}

            {/* ── Assignments (edit mode only) ── */}
            {isEdit && (
                <AssignmentsSection
                    assignments={assignments}
                    onAdd={handleAddAssignment}
                    onRemove={handleRemoveAssignment}
                />
            )}

            {/* Hint for new policies */}
            {!isEdit && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                    <Info size={13} className="mt-0.5 shrink-0" />
                    After creating the policy, click <strong>Manage</strong> to assign it to classes, subjects, or the whole school.
                </div>
            )}
        </Drawer>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Assessment Policies tab
// ═════════════════════════════════════════════════════════════════════════════

export default function AssessmentPoliciesTab() {
    const [policies, setPolicies]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);

    const [createOpen, setCreateOpen]     = useState(false);
    const [manageTarget, setManageTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await listAssessmentPolicies();
            setPolicies(res.data?.policies ?? []);
        } catch (e) {
            setError(e?.message || 'Failed to load assessment policies.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreated = (policy) => setPolicies(prev => [...prev, policy]);

    const handleUpdated = (updated) =>
        setPolicies(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await deleteAssessmentPolicy(deleteTarget.id);
        setPolicies(prev => prev.filter(p => p.id !== deleteTarget.id));
        pushToast({ message: `"${deleteTarget.name}" deleted.`, type: 'success' });
    };

    // ── Columns ────────────────────────────────────────────────────────────────

    const columns = [
        {
            id: 'name',
            header: 'Policy Name',
            accessor: r => r.name,
            sortable: true,
            render: r => (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-900">{r.name}</span>
                    {r.createdByRole === 'teacher' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700">
                            <User size={9} />
                            {r.createdByTeacherName ?? 'Teacher'} — {r.scopedClassName ?? ''}
                        </span>
                    )}
                </div>
            ),
        },
        {
            id: 'caBreakdown',
            header: 'CA Breakdown',
            accessor: r => r.caComponents?.length ?? 0,
            render: r => {
                const comps = r.caComponents ?? [];
                if (comps.length === 0) {
                    return <span className="text-xs text-gray-300 italic">No components</span>;
                }
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
                if (list.length === 0) {
                    return <span className="text-xs text-gray-300 italic">Unassigned</span>;
                }
                const visible = list.slice(0, 2);
                return (
                    <div className="flex flex-wrap gap-1">
                        {visible.map(a => (
                            <span
                                key={a.id}
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${SCOPE_CHIP_STYLE[a.scope] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                            >
                                {assignmentLabel(a)}
                            </span>
                        ))}
                        {list.length > 2 && (
                            <span className="text-[11px] text-gray-400 font-semibold">+{list.length - 2}</span>
                        )}
                    </div>
                );
            },
            width: '220px',
        },
        {
            id: 'actions',
            header: '',
            hideable: false,
            render: r => {
                const isTeacherOwned = r.createdByRole === 'teacher';
                return (
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        {isTeacherOwned ? (
                            <span className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-violet-50 border border-violet-200 text-violet-600 cursor-default">
                                Teacher-owned
                            </span>
                        ) : (
                            <>
                                <button
                                    onClick={() => setManageTarget(r)}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Manage
                                </button>
                                <button
                                    onClick={() => setDeleteTarget(r)}
                                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="Delete policy"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </>
                        )}
                    </div>
                );
            },
            width: '160px',
        },
    ];

    const HELP_CARDS = [
        {
            icon: BookOpen,
            title: 'What is an assessment policy?',
            body: 'A policy sets the CA components teachers use (e.g. Test 1 = 10 marks, Assignment = 10 marks) and the final Exam weight. CA + Exam must always equal 100.',
        },
        {
            icon: Layers,
            title: 'How are policies applied?',
            body: 'Assign a policy to the whole school, specific classes, a subject, or a subject within a class. The most specific assignment always wins — subject-within-class beats class, class beats school default.',
        },
        {
            icon: GraduationCap,
            title: 'Setup order',
            body: '① Create your policies here. ② Click Manage to assign each policy to where it applies. ③ Teachers automatically see the right CA columns when they enter scores.',
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            {/* Help strip */}
            <HelpCards cards={HELP_CARDS} label="Assessment Policies — Help" />

            {/* Table */}
            <WorkbenchTable
                title="Policies"
                storageKey="assessment-policies-settings"
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
                    title: 'No assessment policies yet',
                    description: 'Create your first policy to define how marks are split between CA components and the final Exam.',
                    action: { label: 'New Policy', onClick: () => setCreateOpen(true) },
                }}
            />

            {/* Create drawer */}
            <PolicyDrawer
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                initial={null}
                onCreated={handleCreated}
                onUpdated={() => {}}
            />

            {/* Manage / Edit drawer */}
            <PolicyDrawer
                open={Boolean(manageTarget)}
                onClose={() => setManageTarget(null)}
                initial={manageTarget}
                onCreated={() => {}}
                onUpdated={handleUpdated}
            />

            {/* Delete confirmation */}
            <ConfirmDestructiveDialog
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                verb="Delete"
                noun="assessment policy"
                recordName={deleteTarget?.name ?? ''}
                consequence="Any class or subject assignments for this policy will also be removed. Teachers will lose their score-entry structure for the next assessment cycle."
                requireReason={false}
                onConfirm={handleDelete}
            />
        </div>
    );
}
